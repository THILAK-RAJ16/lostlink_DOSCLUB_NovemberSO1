"""Google OAuth 2.0 / OpenID Connect helpers (authorization-code flow)."""
from urllib.parse import urlencode
import requests
from flask import current_app

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"
TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"


class GoogleAuthError(Exception):
    pass


def is_configured():
    c = current_app.config
    return bool(c['GOOGLE_CLIENT_ID'] and c['GOOGLE_CLIENT_SECRET'])


def build_auth_url(state):
    c = current_app.config
    return AUTH_ENDPOINT + '?' + urlencode({
        'client_id': c['GOOGLE_CLIENT_ID'], 'redirect_uri': c['GOOGLE_REDIRECT_URI'],
        'response_type': 'code', 'scope': 'openid email profile', 'state': state,
        'access_type': 'online', 'prompt': 'select_account'})


def exchange_code(code):
    """Swap an authorization code for the verified Google profile."""
    c = current_app.config
    if not is_configured():
        raise GoogleAuthError('Google Sign-In is not configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).')
    try:
        tok = requests.post(TOKEN_ENDPOINT, data={
            'code': code, 'client_id': c['GOOGLE_CLIENT_ID'], 'client_secret': c['GOOGLE_CLIENT_SECRET'],
            'redirect_uri': c['GOOGLE_REDIRECT_URI'], 'grant_type': 'authorization_code'}, timeout=10)
        if tok.status_code != 200:
            raise GoogleAuthError('Google rejected the authorization code: ' + tok.json().get('error_description', tok.text[:120]))
        info = requests.get(USERINFO_ENDPOINT, headers={'Authorization': 'Bearer ' + tok.json()['access_token']}, timeout=10).json()
    except requests.RequestException as e:
        raise GoogleAuthError(f'Could not reach Google: {e}')
    return _profile(info)


def verify_id_token(id_token):
    """Validate a Google ID token (signature checked by Google's tokeninfo endpoint)."""
    try:
        r = requests.get(TOKENINFO_ENDPOINT, params={'id_token': id_token}, timeout=10)
    except requests.RequestException as e:
        raise GoogleAuthError(f'Could not reach Google: {e}')
    if r.status_code != 200:
        raise GoogleAuthError('Invalid or expired Google token.')
    info = r.json()
    if info.get('aud') != current_app.config['GOOGLE_CLIENT_ID']:
        raise GoogleAuthError('Token was issued for a different application.')
    return _profile(info)


def _profile(info):
    email = info.get('email')
    gid = info.get('sub')
    if not gid or not email:
        raise GoogleAuthError('Google did not return an email address.')
    verified = info.get('email_verified') in (True, 'true')
    if not verified:
        raise GoogleAuthError('Your Google email address is not verified by Google.')
    return {'google_id': gid, 'email': email, 'name': info.get('name') or email.split('@')[0],
            'profile_picture': info.get('picture', ''), 'email_verified': True}
