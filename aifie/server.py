"""Small local API and dashboard, intentionally dependency free."""

import json
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .core import AifieEngine
from .source_catalog import as_dicts

ENGINE = AifieEngine()

DASHBOARD = """<!doctype html><html><head><meta charset='utf-8'><title>Aifie AI Agent</title>
<style>body{font:16px system-ui;margin:0;background:#f5f7fa;color:#172033}main{max-width:880px;margin:48px auto;padding:0 24px}h1{margin-bottom:4px}section{background:#fff;border:1px solid #d9e0ea;border-radius:8px;padding:20px;margin-top:18px}button{background:#006d77;color:#fff;border:0;border-radius:4px;padding:9px 14px}input{padding:8px;margin-right:8px;border:1px solid #aeb8c6;border-radius:4px}code{background:#edf1f5;padding:2px 4px}</style>
</head><body><main><h1>Aifie AI Agent</h1><p>Research-to-paper-execution workspace</p><section><h2>Research</h2><input id='symbol' value='AAPL'><button onclick='research()'>Run research</button><pre id='result'>Ready.</pre></section><section><h2>Safety</h2><p>Execution is locked to <code>paper</code> mode. No broker connection is configured.</p></section><section><h2>Sources</h2><p id='sources'>Loading source catalog...</p></section></main><script>async function research(){let s=document.querySelector('#symbol').value;let r=await fetch('/api/research?symbol='+encodeURIComponent(s));document.querySelector('#result').textContent=JSON.stringify(await r.json(),null,2)}fetch('/api/sources').then(r=>r.json()).then(x=>document.querySelector('#sources').textContent=x.length+' repositories cataloged.');</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            body = DASHBOARD.encode()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif parsed.path == "/api/status":
            self._send_json(ENGINE.status())
        elif parsed.path == "/api/sources":
            self._send_json(as_dicts())
        elif parsed.path == "/api/research":
            try:
                symbol = parse_qs(parsed.query).get("symbol", [""])[0]
                self._send_json(asdict(ENGINE.research(symbol)))
            except ValueError as error:
                self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        else:
            self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self):
        if self.path != "/api/orders":
            self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(size))
            order = ENGINE.place_paper_order(payload.get("symbol", ""), payload.get("side"), payload.get("quantity"), payload.get("mode"))
            self._send_json(asdict(order), HTTPStatus.CREATED)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)

    def log_message(self, format, *args):
        return


def run(port=8787):
    print(f"Aifie running at http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
