#!/usr/bin/env python3
"""Local public preview with private/editor files blocked. No publishing endpoints."""
from admin_server import Handler,ROOT
from http.server import ThreadingHTTPServer
from functools import partial
from urllib.parse import urlsplit,unquote
import argparse

class PublicHandler(Handler):
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path.startswith('/api/') or path in ['/admin.html','/admin.js','/admin.css']:
            return self.send_error(404)
        return super().do_GET()
    def do_POST(self):self.send_error(405)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8081);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(PublicHandler,directory=str(ROOT)))
    print(f'Public preview: http://127.0.0.1:{args.port}/ — editor/private files excluded.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
