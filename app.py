#!/usr/bin/env python3
"""
ChannelReact — WhatsApp Channel reaction sender (Flask API)
Menggunakan kode Python yang sudah berfungsi
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sys
import time
import re
import json
from curl_cffi import requests

app = Flask(__name__, static_folder='.')
CORS(app)

BASE = "https://satriareact.satriadeveloperz.workers.dev"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F]", re.UNICODE)
TEXT_OK = {
    "santuy", "sad", "nice", "siap", "ok", "good", "wow", "keren",
    "marempu", "mantap", "ganteng", "cantik", "anjay", "mantul", "limit",
    "by", "tenkyu", "dengerin", "sell", "gajelas", "kepo", "jelek",
}

def is_emoji(s):
    v = str(s or "").strip()
    if not v:
        return False
    return len(v) <= 8 and (bool(EMOJI_RE.search(v)) or v.lower() in TEXT_OK)

class ChannelReact:
    def __init__(self, session=None):
        self.session = session or self._new_session()

    @staticmethod
    def _new_session():
        s = requests.Session(impersonate="chrome")
        s.headers.update({
            "User-Agent": UA,
            "Origin": BASE,
            "Referer": BASE + "/",
        })
        return s

    def handshake(self, retries=8):
        last = None
        for i in range(retries + 1):
            if i > 0:
                time.sleep(3 * i)
                self.session = self._new_session()
            try:
                r = self.session.post(BASE + "/api/handshake", json={}, timeout=30)
                data = r.json() if r.headers.get("content-type", "").startswith("application/json") else None
                if r.status_code == 200 and data and data.get("success"):
                    return {
                        "token": data["token"],
                        "clientId": data.get("clientId"),
                        "username": (data.get("step1") or {}).get("username") or data.get("username"),
                        "expiresInMs": data.get("expiresInMs", 60000),
                    }
                last = "HTTP %s: %s" % (r.status_code, str(data)[:120])
            except Exception as e:
                last = str(e)
        raise RuntimeError("Handshake gagal (%s)" % last)

    def react(self, url, reactions, token=None, retries=3):
        tok = token
        if tok is None:
            tok = self.handshake()["token"]
        for attempt in range(1, retries + 1):
            try:
                r = self.session.post(
                    BASE + "/api/react",
                    json={"url": url, "reactions": reactions, "token": tok},
                    timeout=45,
                )
            except Exception:
                self.session = self._new_session()
                tok = self.handshake()["token"]
                continue
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else None
            if r.status_code == 200 and data and data.get("success"):
                return {
                    "success": True,
                    "count": data.get("count", len(reactions)),
                    "message": data.get("message"),
                    "task": (data.get("task") or {}).get("status"),
                    "vip": (data.get("vip") or {}).get("packageName"),
                }
            if r.status_code in (401, 403) and attempt < retries:
                time.sleep(2.0 * attempt)
                self.session = self._new_session()
                tok = self.handshake()["token"]
                continue
            if r.status_code == 502 and attempt < retries:
                time.sleep(2.5 * attempt)
                self.session = self._new_session()
                tok = self.handshake()["token"]
                continue
            raise RuntimeError("Reaksi gagal (HTTP %s): %s" % (r.status_code, str(data)[:140]))
        raise RuntimeError("Reaksi gagal setelah %d percobaan" % retries)

# ============ API Routes ============

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/handshake', methods=['POST'])
def api_handshake():
    try:
        client = ChannelReact()
        result = client.handshake()
        return jsonify({
            'success': True,
            'token': result['token'],
            'clientId': result.get('clientId'),
            'username': result.get('username'),
            'expiresInMs': result.get('expiresInMs', 60000)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/react', methods=['POST'])
def api_react():
    try:
        data = request.json
        url = data.get('url')
        reactions = data.get('reactions', [])
        token = data.get('token')
        
        if not url:
            return jsonify({'success': False, 'error': 'URL diperlukan'}), 400
        
        if not reactions:
            return jsonify({'success': False, 'error': 'Reaksi diperlukan'}), 400
        
        # Validasi emoji
        for r in reactions:
            if not is_emoji(r):
                return jsonify({'success': False, 'error': f'`{r}` bukan emoji valid'}), 400
        
        client = ChannelReact()
        result = client.react(url, reactions, token)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 ChannelReact API Server")
    print("📍 Running on http://localhost:5000")
    print("📌 Press Ctrl+C to stop")
    app.run(debug=True, host='0.0.0.0', port=5000)
