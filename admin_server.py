#!/usr/bin/env python3
"""Local-only SK Films editor. Public pages remain deployable static files."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
from functools import partial
import argparse,json,secrets,time,threading,hashlib,hmac,os,sys,base64
from tools.content_engine import validate,build,atomic,Invalid
ROOT=Path(__file__).resolve().parent
PRIVATE=ROOT/'.admin-state'
LOCK=threading.Lock();SESSIONS={};ATTEMPTS=[]
PASSWORD='';ORIGIN=''

def state():return json.loads((PRIVATE/'content.json').read_text())

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,fmt,*args):pass # Never log login bodies or session cookies.
    def reply(self,status,data,cookie=None):
        body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        if cookie:self.send_header('Set-Cookie',cookie)
        self.send_header('Content-Length',str(len(body)));self.end_headers()
        if self.command!='HEAD':self.wfile.write(body)
    def authenticated(self):
        cookies=dict(x.strip().split('=',1) for x in self.headers.get('Cookie','').split(';') if '=' in x)
        key=cookies.get('sk_admin','');expiry=SESSIONS.get(key,0)
        if expiry>time.time():return True
        SESSIONS.pop(key,None);return False
    def body(self):
        try:n=int(self.headers.get('Content-Length','0'))
        except ValueError:raise Invalid('Invalid request length')
        if not 0<n<=8_000_000:raise Invalid('Request must be below 8MB')
        try:return json.loads(self.rfile.read(n))
        except (ValueError,UnicodeDecodeError):raise Invalid('Invalid JSON')
    def same_origin(self):
        return self.headers.get('X-SK-Admin')=='1' and self.headers.get('Origin')==ORIGIN and self.headers.get('Host')==urlsplit(ORIGIN).netloc
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path.startswith('/api/'):
            if not self.authenticated():return self.reply(401,{'error':'Sign in to the local editor'})
            if path=='/api/content':return self.reply(200,state())
            if path=='/api/images':return self.reply(200,sorted(str(p.relative_to(ROOT)) for p in (ROOT/'assets').rglob('*') if p.suffix.lower() in ['.jpg','.jpeg','.png','.webp'] and p.is_file()))
            return self.reply(404,{'error':'Unknown endpoint'})
        resolved=(ROOT/path.lstrip('/')).resolve()
        if not resolved.is_relative_to(ROOT) or any(x.startswith('.') for x in Path(path).parts) or path.startswith(('/archive/','/tools/','/output/')) or path.endswith('.py'):
            return self.send_error(404)
        return super().do_HEAD() if self.command=='HEAD' else super().do_GET()
    def do_HEAD(self):
        # Apply the same private-path restrictions to HEAD requests.
        self.do_GET()
    def end_headers(self):
        if urlsplit(self.path).path.endswith(('.html','.js','.json','.xml','.txt')) or urlsplit(self.path).path=='/':self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        if urlsplit(self.path).path=='/admin.html':
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
        super().end_headers()
    def list_directory(self,path):return self.send_error(404)
    def do_POST(self):
        if not self.same_origin():return self.reply(403,{'error':'This editor accepts same-origin local requests only'})
        path=unquote(urlsplit(self.path).path)
        try:
            data=self.body()
            if not isinstance(data,dict):raise Invalid('Request must be a JSON object')
            if path=='/api/login':
                now=time.time();ATTEMPTS[:]=[t for t in ATTEMPTS if now-t<300]
                if len(ATTEMPTS)>=8:return self.reply(429,{'error':'Too many attempts. Wait five minutes.'})
                password=data.get('password','') if isinstance(data,dict) else ''
                if not isinstance(password,str) or not hmac.compare_digest(hashlib.sha256(password.encode()).digest(),hashlib.sha256(PASSWORD.encode()).digest()):
                    ATTEMPTS.append(now);return self.reply(401,{'error':'Incorrect local editor password'})
                for key,expiry in list(SESSIONS.items()):
                    if expiry<now:SESSIONS.pop(key,None)
                token=secrets.token_urlsafe(32);SESSIONS[token]=now+1800;ATTEMPTS.clear()
                return self.reply(200,{'ok':True},f'sk_admin={token}; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=1800')
            if not self.authenticated():return self.reply(401,{'error':'Your editor session expired. Sign in again.'})
            if path=='/api/logout':
                for part in self.headers.get('Cookie','').split(';'):
                    if part.strip().startswith('sk_admin='):SESSIONS.pop(part.strip().split('=',1)[1],None)
                return self.reply(200,{'ok':True},'sk_admin=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0')
            if path=='/api/upload':
                try:blob=base64.b64decode(data.get('data',''),validate=True)
                except (ValueError,TypeError):raise Invalid('Invalid image data')
                if not 1<=len(blob)<=4_000_000:raise Invalid('Images must be below 4MB')
                ext='png' if blob.startswith(b'\x89PNG\r\n\x1a\n') else 'jpg' if blob.startswith(b'\xff\xd8\xff') else 'webp' if blob[:4]==b'RIFF' and blob[8:12]==b'WEBP' else None
                if not ext:raise Invalid('Use a PNG, JPEG or WebP image')
                folder=ROOT/'assets/uploads';folder.mkdir(exist_ok=True)
                image=folder/(secrets.token_hex(16)+'.'+ext);image.write_bytes(blob);image.chmod(0o644)
                return self.reply(201,{'src':str(image.relative_to(ROOT))})
            if path=='/api/content':
                with LOCK:
                    current=state()
                    if not isinstance(data,dict) or data.get('revision')!=current['revision']:return self.reply(409,{'error':'Content changed in another editor. Reload before saving.'})
                    clean=validate(data,ROOT);clean['revision']=current['revision']+1
                    # Keep one private recovery copy; render only validated input.
                    atomic(PRIVATE/'previous.json',json.dumps(current,indent=2)+'\n')
                    build(clean,ROOT)
                    atomic(PRIVATE/'content.json',json.dumps(clean,indent=2)+'\n');os.chmod(PRIVATE/'content.json',0o600)
                return self.reply(200,{'ok':True,'revision':clean['revision']})
            return self.reply(404,{'error':'Unknown endpoint'})
        except Invalid as e:return self.reply(422,{'error':str(e)})
        except Exception:return self.reply(500,{'error':'Saving failed. Check disk permissions and server logs; your previous content is retained.'})

def initialize_content(root):
    """Initialize a fresh clone from published content only; never overwrite private edits."""
    private=root/'.admin-state';target=private/'content.json'
    if target.exists():return False
    public=root/'content/public.json'
    if not public.exists():raise Invalid('Missing published content; restore content/public.json or a private backup')
    data=json.loads(public.read_text());settings=data.get('settings',{})
    defaults=dict(siteUrl='',homeTitle='SK Films Productions',homeDescription='Film, commercial and visual production.',offices=[])
    defaults.update({k:settings[k] for k in defaults if k in settings})
    clean=validate(dict(revision=1,projects=data.get('projects',[]),posts=[p for p in data.get('posts',[]) if p.get('published')],settings=defaults),root)
    private.mkdir(mode=0o700,exist_ok=True);atomic(target,json.dumps(clean,indent=2)+'\n');target.chmod(0o600)
    return True

def main():
    global PASSWORD,ORIGIN
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8083);args=parser.parse_args()
    PRIVATE.mkdir(mode=0o700,exist_ok=True)
    key=PRIVATE/'password'
    if not key.exists():key.write_text(secrets.token_urlsafe(24)+'\n');key.chmod(0o600)
    PASSWORD=os.environ.get('SK_ADMIN_PASSWORD',key.read_text().strip())
    if len(PASSWORD)<12:raise SystemExit('SK_ADMIN_PASSWORD must contain at least 12 characters')
    initialize_content(ROOT)
    initial=validate(state(),ROOT);build(initial,ROOT)
    ORIGIN=f'http://127.0.0.1:{args.port}'
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT)))
    print(f'Website: {ORIGIN}/\nAdmin: {ORIGIN}/admin.html\nPassword is stored in .admin-state/password (or set SK_ADMIN_PASSWORD). Local access only.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()

if __name__=='__main__':main()
