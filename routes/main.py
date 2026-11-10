"""
LostLink page routes (no URL prefix).

  /                 -> the React landing page (built by `npm run build` into dist/)
  /browse, /report-lost, /report-found -> React views (hash routes)
  /dashboard        -> signs the Flask session into the React dashboard (login required)
  /profile          -> Jinja profile page        /profile/update -> save profile
  /uploads/<file>   -> uploaded item photos
  /<anything else>  -> files from dist/, otherwise the React app (API / auth paths still 404)
"""
import os
from flask import (Blueprint, Response, abort, current_app, flash, redirect, render_template,
                   request, send_from_directory, session)
from database.api_bridge import get_user_profile, update_user_profile
from routes.auth import finish_page
from services.tokens import sign_token

main_bp = Blueprint('main', __name__)

BUILD_HINT = """<!doctype html><meta charset="utf-8"><title>LostLink – build needed</title>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;color:#334155;line-height:1.6">
<h2 style="color:#0F172A">LostLink front-end is not built yet</h2>
<p>Flask is running correctly, but <code>dist/index.html</code> does not exist. Build the React app once:</p>
<pre style="background:#F1F5F9;padding:12px;border-radius:8px">npm install
npm run build</pre><p>Then refresh this page.</p></body>"""


def _dist():
    return current_app.config['DIST_FOLDER']


def spa_index():
    if os.path.isfile(os.path.join(_dist(), 'index.html')):
        resp = send_from_directory(_dist(), 'index.html')
        resp.headers['Cache-Control'] = 'no-cache'
        return resp
    return Response(BUILD_HINT, status=503, mimetype='text/html')


@main_bp.route('/')
def home():
    return spa_index()


@main_bp.route('/browse')
def browse():
    return redirect('/#browse')


@main_bp.route('/report-lost')
def report_lost():
    return redirect('/#report-lost')


@main_bp.route('/report-found')
def report_found():
    return redirect('/#report-found')


def _current_profile():
    uid = session.get('user_id')
    res = get_user_profile(uid) if uid else {'error': 'no session'}
    if res.get('error') or res['user'].get('is_suspended'):
        session.clear()
        return None
    return res['user']


@main_bp.route('/dashboard')
def dashboard():
    user = _current_profile()
    if not user:
        flash('Please sign in to open your dashboard.', 'info')
        return redirect('/auth/login')
    return finish_page(user, sign_token(user['id'], user['email'], bool(user.get('is_admin'))))


@main_bp.route('/profile')
def profile():
    user = _current_profile()
    if not user:
        return redirect('/auth/login')
    return render_template('profile.html', user=user)


@main_bp.route('/profile/update', methods=['POST'])
def profile_update():
    user = _current_profile()
    if not user:
        return redirect('/auth/login')
    res = update_user_profile(user['id'], request.form.get('name', '').strip(), request.form.get('phone', '').strip())
    flash(res.get('error') or 'Profile updated.', 'danger' if res.get('error') else 'success')
    if user:
        session['user'] = {**session.get('user', {}), 'name': request.form.get('name', user['name']).strip() or user['name']}
    return redirect('/profile')


@main_bp.route('/uploads/<path:filename>')
def uploads(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)


@main_bp.route('/<path:path>')
def spa_fallback(path):
    if path.startswith(('api/', 'auth/', 'static/')):
        abort(404)
    full = os.path.normpath(os.path.join(_dist(), path))
    if full.startswith(os.path.abspath(_dist()) + os.sep) and os.path.isfile(full):
        return send_from_directory(_dist(), path)
    return spa_index()
