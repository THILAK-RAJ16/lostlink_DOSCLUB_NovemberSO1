"""HMAC-signed bearer tokens, format-compatible with the Express server (server.ts)."""
import base64, hashlib, hmac, json, time
from flask import current_app


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _sig(payload_b64: str) -> str:
    key = current_app.config['SECRET_KEY'].encode()
    return _b64(hmac.new(key, payload_b64.encode(), hashlib.sha256).digest())


def sign_token(user_id, email, is_admin=False):
    ttl = current_app.config['TOKEN_TTL_SECONDS']
    payload = _b64(json.dumps({'userId': user_id, 'email': email, 'isAdmin': bool(is_admin),
                               'exp': int((time.time() + ttl) * 1000)}, separators=(',', ':')).encode())
    return f"{payload}.{_sig(payload)}"


def verify_token(token):
    try:
        payload_b64, signature = token.split('.')
        if not hmac.compare_digest(signature, _sig(payload_b64)):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * (-len(payload_b64) % 4)))
        if time.time() * 1000 > data['exp']:
            return None
        return {'userId': data['userId'], 'email': data['email'], 'isAdmin': bool(data.get('isAdmin'))}
    except Exception:
        return None
