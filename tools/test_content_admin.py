"""Isolated API/publishing tests. All edits live in a temporary copy, never real content."""
import unittest,tempfile,shutil,json,threading,http.client,sys,copy
from pathlib import Path
from functools import partial
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import admin_server as app
from tools.content_engine import validate,build,Invalid
from http.server import ThreadingHTTPServer

class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.root=Path(cls.temp.name);source=app.ROOT
        for name in ['index.html','script.js','services.html']:shutil.copy2(source/name,cls.root/name)
        shutil.copytree(source/'assets',cls.root/'assets');(cls.root/'.admin-state').mkdir()
        cls.initial=json.loads((source/'.admin-state/content.json').read_text());(cls.root/'.admin-state/content.json').write_text(json.dumps(cls.initial))
        app.ROOT=cls.root;app.PRIVATE=cls.root/'.admin-state';app.PASSWORD='local-test-password';app.SESSIONS.clear();app.ATTEMPTS.clear()
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),partial(app.Handler,directory=str(cls.root)));cls.port=cls.server.server_port;app.ORIGIN=f'http://127.0.0.1:{cls.port}';cls.origin=app.ORIGIN
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.cookie=''
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.temp.cleanup()
    def req(self,path,method='GET',body=None,auth=True,origin=True):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=5);headers={}
        if auth and self.cookie:headers['Cookie']=self.cookie
        if origin:headers.update({'Origin':self.origin,'X-SK-Admin':'1'})
        if body is not None:headers['Content-Type']='application/json';body=json.dumps(body)
        c.request(method,path,body=body,headers=headers);r=c.getresponse();data=r.read();cookie=r.getheader('Set-Cookie');status=r.status;c.close();return status,data,cookie
    def login(self):
        status,_,cookie=self.req('/api/login','POST',{'password':'local-test-password'});self.assertEqual(status,200);type(self).cookie=cookie.split(';')[0]
    def current(self):return json.loads(self.req('/api/content')[1])
    def save(self,data):
        status,body,_=self.req('/api/content','POST',data);self.assertEqual(status,200,body);data['revision']=json.loads(body)['revision'];return data
    def test_01_auth_csrf_private_paths(self):
        self.assertEqual(self.req('/api/content',auth=False)[0],401)
        self.assertEqual(self.req('/api/login','POST',{'password':'local-test-password'},origin=False)[0],403)
        self.assertEqual(self.req('/api/login','POST',{'password':'wrong'})[0],401);self.login()
        for path in ['/.admin-state/content.json','/%2eadmin-state/content.json','/tools/content_engine.py','/admin_server.py','/../.admin-state/content.json']:
            self.assertEqual(self.req(path)[0],404,path);self.assertEqual(self.req(path,'HEAD')[0],404,path)
    def test_02_project_persistence_and_rebuild(self):
        self.login();data=self.current();project=copy.deepcopy(data['projects'][0]);project.update(id=99,title='Added <script>test</script>');data['projects'].append(project);data=self.save(data)
        self.assertEqual(len(self.current()['projects']),5)
        self.assertIn('Added &lt;script&gt;test&lt;/script&gt;', (self.root/'index.html').read_text())
        self.assertIn('"99":', (self.root/'script.js').read_text())
        data['projects'][-1]['title']='Edited project';data=self.save(data)
        self.assertIn('Edited project',(self.root/'script.js').read_text()) # repeated builds replace current data
        data['projects'].pop();self.save(data);self.assertNotIn('"99":',(self.root/'script.js').read_text())
    def test_03_draft_publish_unpublish_and_escape(self):
        self.login();data=self.current();data['posts']=[dict(slug='test-article',title='Studio <script>test</script>',excerpt='Test summary',body='<script>alert(1)</script>\n\nSecond paragraph.',date='2026-11-27',published=False)];data=self.save(data)
        self.assertFalse((self.root/'insights/test-article.html').exists());self.assertNotIn('alert(1)',(self.root/'content/public.json').read_text())
        data['posts'][0]['published']=True;data=self.save(data);page=(self.root/'insights/test-article.html').read_text()
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;',page);self.assertIn('BlogPosting',page);self.assertIn('test-article.html',(self.root/'sitemap.xml').read_text())
        data['posts'][0]['published']=False;self.save(data);self.assertFalse((self.root/'insights/test-article.html').exists())
    def test_04_invalid_input_conflict_and_upload(self):
        self.login();data=self.current();before=(self.root/'index.html').read_bytes();bad=copy.deepcopy(data);bad['projects'][0]['src']='../outside.png'
        self.assertEqual(self.req('/api/content','POST',bad)[0],422);self.assertEqual(before,(self.root/'index.html').read_bytes())
        bad=copy.deepcopy(data);bad['revision']-=1;self.assertEqual(self.req('/api/content','POST',bad)[0],409)
        self.assertEqual(self.req('/api/upload','POST',{'data':'PHNjcmlwdD4='})[0],422)
        import base64
        status,body,_=self.req('/api/upload','POST',{'data':base64.b64encode((self.root/'assets/logo.png').read_bytes()).decode()})
        self.assertEqual(status,201);self.assertTrue((self.root/json.loads(body)['src']).is_file())
        bad=copy.deepcopy(data);bad['settings']['offices'][0]['embedUrl']='https://evil.example/maps/embed';self.assertEqual(self.req('/api/content','POST',bad)[0],422)
    def test_04b_public_preview_excludes_editor(self):
        from serve_site import PublicHandler
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(PublicHandler,directory=str(self.root)))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            for path in ['/admin.html','/admin.js','/api/content','/.admin-state/content.json','/%2eadmin-state/content.json','/admin_server.py','/serve_site.py']:
                c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5);c.request('GET',path);r=c.getresponse();r.read();self.assertEqual(r.status,404,path);c.close()
        finally:server.shutdown();server.server_close();thread.join()
    def test_04c_fresh_clone_and_unapproved_office_privacy(self):
        data=self.current();data['settings']['offices'][1].update(address='PRIVATE-UNAPPROVED-ADDRESS',approved=False)
        clean=validate(data,self.root);build(clean,self.root)
        public=json.loads((self.root/'content/public.json').read_text())
        self.assertNotIn('PRIVATE-UNAPPROVED-ADDRESS',json.dumps(public))
        with tempfile.TemporaryDirectory() as temp:
            clone=Path(temp);shutil.copytree(self.root/'assets',clone/'assets');(clone/'content').mkdir();shutil.copy2(self.root/'content/public.json',clone/'content/public.json')
            self.assertTrue(app.initialize_content(clone))
            restored=json.loads((clone/'.admin-state/content.json').read_text())
            self.assertEqual(len(restored['projects']),4);self.assertTrue(all(p['published'] for p in restored['posts']))
            self.assertFalse(app.initialize_content(clone))
    def test_05_approved_map_and_seo(self):
        self.login();data=self.current();office=data['settings']['offices'][0];office.update(address='Approved test address',mapUrl='https://www.google.com/maps?q=test',embedUrl='https://www.google.com/maps/embed?pb=test',approved=True);self.save(data)
        page=(self.root/'index.html').read_text();self.assertIn('Approved test address',page);self.assertIn('loading="lazy" referrerpolicy=',page)
        self.assertEqual(page.count('rel="canonical"'),1);self.assertIn('https://skfilmsproductions.com',page)
        import xml.etree.ElementTree as ET
        ET.parse(self.root/'sitemap.xml');self.assertIn('Sitemap: https://skfilmsproductions.com/sitemap.xml',(self.root/'robots.txt').read_text())
        self.assertEqual(self.req('/api/logout','POST',{})[0],200);self.assertEqual(self.req('/api/content')[0],401)
if __name__=='__main__':unittest.main(verbosity=2)
