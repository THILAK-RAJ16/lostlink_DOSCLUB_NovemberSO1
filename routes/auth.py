"""
LostLink Authentication Routes (blueprint prefix: /auth)
Local email/password (JSON for the API, HTML forms for the Jinja pages) and Google OAuth 2.0.

  GET  /auth/login            -> login page          POST /auth/login     -> JSON or form login
  GET  /auth/register         -> register page       POST /auth/register  -> JSON or form sign-up
  GET  /auth/google           -> redirects to Google (add ?format=json to get the URL as JSON)
  GET  /auth/google/callback  -> Google redirect URI (must match Google Cloud Console)
"""
import secrets
from flask import (Blueprint, request, jsonify, session, redirect, render_template, flash, current_app)
from database.api_bridge import auth_login, auth_register, get_user_profile
from services import google_oauth
from services.tokens import sign_token

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


def start_session(user):
    """Store the signed-in user in the Flask session (used by the Jinja pages) and return an API token."""
    session.pop('oauth_state', None)
    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['is_admin'] = bool(user.get('is_admin'))
    session['user'] = {k: user.get(k) for k in ('id', 'name', 'email', 'profile_picture', 'auth_provider')}
    return sign_token(user['id'], user['email'], bool(user.get('is_admin')))


def finish_page(user, token):
    """Hand the session to the React app (it reads its token from localStorage), then open the dashboard."""
    return render_template('auth_complete.html', token=token, user=user, target='/#dashboard')


def _wants_json():
    return request.is_json or request.args.get('format') == 'json' or \
        request.accept_mimetypes.best == 'application/json'


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return redirect('/dashboard') if session.get('user_id') else render_template('login.html')
    data = request.get_json(silent=True) if request.is_json else request.form
    res = auth_login((data or {}).get('email', ''), (data or {}).get('password', ''))
    if 'error' in res:
        if request.is_json:
            return jsonify(res), 401
        flash(res['error'], 'danger')
        return render_template('login.html'), 401
    token = start_session(res['user'])
    if request.is_json:
        return jsonify({**res, 'token': token})
    return finish_page(res['user'], token)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return redirect('/dashboard') if session.get('user_id') else render_template('register.html')
    data = (request.get_json(silent=True) if request.is_json else request.form) or {}
    res = auth_register(data.get('name', ''), data.get('email', ''), data.get('phone', ''), data.get('password', ''))
    if 'error' in res:
        if request.is_json:
            return jsonify(res), 400
        flash(res['error'], 'danger')
        return render_template('register.html'), 400
    token = start_session(res['user'])
    if request.is_json:
        return jsonify({**res, 'token': token})
    return finish_page(res['user'], token)


@auth_bp.route('/google')
def google_authorize():
    """Start Google sign-in: redirect the browser to Google's consent screen."""
    if not current_app.config['GOOGLE_CLIENT_ID']:
        msg = 'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.'
        if _wants_json():
            return jsonify({'error': msg}), 503
        flash(msg, 'warning')
        return redirect('/auth/login')
    state = secrets.token_urlsafe(24)
    session['oauth_state'] = state
    url = google_oauth.build_auth_url(state)
    if _wants_json():
        return jsonify({'auth_url': url, 'state': state, 'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI']})
    return redirect(url)


@auth_bp.route('/google/callback')
def google_callback():
    """Google redirects here with ?code=...&state=... The code is exchanged once, by
    POST /api/auth/google/verify, so the popup flow (React) and the full-page flow share one code path."""
    error = request.args.get('error', '')
    code = request.args.get('code', '')
    state = request.args.get('state', '')
    if not error:
        expected = session.pop('oauth_state', None)
        if not expected or not secrets.compare_digest(expected, state):
            error = 'invalid_state'
        elif not code:
            error = 'missing_code'
    return render_template('auth_callback.html', payload={'code': '' if error else code, 'state': state, 'error': error})


@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    session.clear()
    if request.method == 'GET' and not _wants_json():
        return render_template('auth_complete.html', token=None, user=None, target='/')
    return jsonify({"success": True, "message": "Logged out successfully"})


@auth_bp.route('/me')
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(get_user_profile(user_id))
