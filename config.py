"""
LostLink Configuration Settings
Includes secure session management and Google OAuth 2.0 configuration.
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

try:  # load .env if python-dotenv is installed (it is listed in requirements.txt)
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except ImportError:
    pass


def _flag(name, default=False):
    val = os.environ.get(name)
    return default if val is None else val.strip().lower() in ('1', 'true', 'yes', 'on')


# Only needed when the app is embedded in a cross-site iframe (e.g. AI Studio preview).
# Plain http://127.0.0.1:5000 needs Lax + non-Secure cookies, otherwise browsers drop the session.
_CROSS_SITE = _flag('COOKIE_CROSS_SITE', False)
IS_PROD = os.environ.get('LOSTLINK_ENV', '').lower() == 'production'

if IS_PROD and os.environ.get('SECRET_KEY', 'lostlink-secure-token-2026-key') in ('', 'lostlink-secure-token-2026-key'):
    raise RuntimeError('Set a long random SECRET_KEY environment variable when LOSTLINK_ENV=production.')


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'lostlink-secure-token-2026-key')
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or os.path.join(BASE_DIR, 'database', 'lostlink.db')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or os.path.join(BASE_DIR, 'static', 'uploads')
    DIST_FOLDER = os.path.join(BASE_DIR, 'dist')  # output of `npm run build`
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
    TOKEN_TTL_SECONDS = 7 * 24 * 3600

    # Session cookie security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None' if _CROSS_SITE else 'Lax'
    SESSION_COOKIE_SECURE = True if _CROSS_SITE else _flag('SESSION_COOKIE_SECURE', IS_PROD)

    # Google OAuth 2.0 Settings
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    # Must match the "Authorized redirect URI" in Google Cloud Console exactly.
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:5000/auth/google/callback')
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    # Dev-only "Continue with Google" personas used by the React auth modal when no client id is set.
    ALLOW_DEMO_GOOGLE = os.environ.get('ALLOW_DEMO_GOOGLE')  # None => follow app.debug
