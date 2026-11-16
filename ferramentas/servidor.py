#!/usr/bin/env python3
"""Servidor local do app. Manda o navegador não guardar cópias, para sempre carregar a versão nova."""
import http.server
import os
import sys


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
    http.server.ThreadingHTTPServer(('127.0.0.1', porta), SemCache).serve_forever()
