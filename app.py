"""
LostLink Flask Application Entry Point
Supports running as a standalone Flask application or RESTful backend service.

Blueprints
  main_bp  (no prefix)  /, /browse, /dashboard, /profile, /uploads/*, SPA fallback
  auth_bp  /auth        login, register, Google OAuth (/auth/google, /auth/google/callback), logout, me
  api_bp   /api         REST API used by the React app (items, claims, matches, admin, ...)
"""

from flask import Flask, jsonify, request
from urllib.parse import urlparse
import os
from config import Config
from werkzeug.middleware.proxy_fix import ProxyFix
from database.db import init_db, set_admin
from routes.main import main_bp
from routes.auth import auth_bp
from routes.api import api_bp

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object(Config)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)  # correct scheme/host behind a hosting proxy

# Register blueprints (the SPA catch-all lives in main_bp and never shadows /api or /auth)
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)
app.register_blueprint(main_bp)

# Create tables / run safe migrations. Idempotent: existing records are never touched.
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
init_db()
if os.environ.get('ADMIN_EMAIL') and os.environ.get('ADMIN_PASSWORD'):
    set_admin(os.environ['ADMIN_EMAIL'], os.environ['ADMIN_PASSWORD'])  # optional: (re)set admin from env

_redirect = app.config['GOOGLE_REDIRECT_URI']
if urlparse(_redirect).path != '/auth/google/callback':
    print(f"WARNING: GOOGLE_REDIRECT_URI is {_redirect!r}; it must end with /auth/google/callback "
          f"(e.g. http://127.0.0.1:5000/auth/google/callback). Check your .env file.")
print(f"Google OAuth redirect URI: {_redirect}  (client id {'set' if app.config['GOOGLE_CLIENT_ID'] else 'NOT set'})")


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Not found'}), 404
    return "Not Found", 404


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', '1') == '1' and not os.environ.get('LOSTLINK_ENV'))
