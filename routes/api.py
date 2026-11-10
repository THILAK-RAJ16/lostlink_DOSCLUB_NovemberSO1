"""
LostLink REST API (blueprint prefix: /api)
Flask port of the Express routes in server.ts, backed by database/api_bridge.py, so the React app
works unchanged on Flask. Authentication uses the same signed bearer tokens.
"""
import base64, os, secrets
from functools import wraps
from flask import Blueprint, request, jsonify, session, current_app, g
from database import api_bridge as B
from services import google_oauth
from services.google_oauth import GoogleAuthError
from services.tokens import sign_token, verify_token

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.before_request
def load_user():
    h = request.headers.get('Authorization') or request.headers.get('X-Auth-Token') or ''
    token = h[7:] if h.startswith('Bearer ') else h
    g.user = verify_token(token) if token else None


def login_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not g.user:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*a, **kw)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not g.user or not g.user['isAdmin']:
            return jsonify({'error': 'Administrator access required.'}), 403
        return f(*a, **kw)
    return wrapper


def _int(v, default):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _status(res, code=400):
    return (jsonify(res), code) if isinstance(res, dict) and res.get('error') else jsonify(res)


def _auth_ok(user, **extra):
    return jsonify({'success': True, 'user': user, 'token': sign_token(user['id'], user['email'], bool(user.get('is_admin'))), **extra})


# ---- health / public data ----
@api_bp.route('/health')
def health():
    return jsonify({'status': 'ok', 'app': 'LostLink'})


@api_bp.route('/stats')
def stats():
    return jsonify(B.get_stats())


@api_bp.route('/categories')
def categories():
    return jsonify(B.get_categories())


# ---- auth ----
@api_bp.route('/auth/register', methods=['POST'])
def register():
    d = request.get_json(silent=True) or {}
    if not d.get('name') or not d.get('email') or not d.get('password'):
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if len(d['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400
    return _finish(B.auth_register(d['name'], d['email'], d.get('phone', ''), d['password']), 400)


def _finish(res, err_code):
    if 'error' in res:
        return jsonify(res), err_code
    return _auth_ok(res['user'])


@api_bp.route('/auth/login', methods=['POST'])
def login():
    d = request.get_json(silent=True) or {}
    if not d.get('email') or not d.get('password'):
        return jsonify({'error': 'Email and password are required.'}), 400
    return _finish(B.auth_login(d['email'], d['password']), 401)


@api_bp.route('/auth/google/url')
def google_url():
    """Used by the React auth modal. Same redirect URI as /auth/google."""
    cfg = current_app.config
    state = secrets.token_urlsafe(24)
    session['oauth_state'] = state
    return jsonify({'url': google_oauth.build_auth_url(state) if cfg['GOOGLE_CLIENT_ID'] else '', 'state': state,
                    'redirectUri': cfg['GOOGLE_REDIRECT_URI'], 'clientId': cfg['GOOGLE_CLIENT_ID']})


@api_bp.route('/auth/google/verify', methods=['POST'])
def google_verify():
    """Accepts an authorization `code` (or the React modal's `idToken` holding that code, or a real
    Google ID token). Identity always comes from Google, never from client-supplied email/id fields."""
    d = request.get_json(silent=True) or {}
    cred = d.get('code') or d.get('idToken') or ''
    if not isinstance(cred, str) or not cred:
        return jsonify({'error': 'Google authentication failed: missing authorization code.'}), 400
    try:
        profile = google_oauth.verify_id_token(cred) if cred.count('.') == 2 else google_oauth.exchange_code(cred)
    except GoogleAuthError as e:
        return jsonify({'error': str(e)}), 401
    res = B.auth_google(**profile)
    if res.get('error'):
        return jsonify(res), 400
    _remember(res['user'])
    return _auth_ok(res['user'], is_new=res.get('is_new'), linked=res.get('linked'))


def _demo_allowed():
    flag = current_app.config['ALLOW_DEMO_GOOGLE']
    return current_app.debug if flag is None else flag.strip().lower() in ('1', 'true', 'yes', 'on')


@api_bp.route('/auth/google/demo', methods=['POST'])
def google_demo():
    """Dev-only fake Google accounts for the React test buttons. Disabled outside debug mode."""
    if not _demo_allowed():
        return jsonify({'error': 'Demo Google sign-in is disabled.'}), 403
    personas = {
        'new_user': dict(google_id='118273948572910384729', email='alex.mercer.google@gmail.com', name='Alex Mercer'),
        'existing_asha': dict(google_id='109283746519283746510', email='asha@example.com', name='Asha Sharma'),
        'existing_ravi': dict(google_id='104829104829104829102', email='ravi@example.com', name='Ravi Patel'),
    }
    p = personas.get((request.get_json(silent=True) or {}).get('persona'), personas['new_user'])
    res = B.auth_google(profile_picture='', email_verified=True, **p)
    if res.get('error'):
        return jsonify(res), 400
    _remember(res['user'])
    return _auth_ok(res['user'], is_new=res.get('is_new'), linked=res.get('linked'))


def _remember(user):
    session['user_id'], session['user_email'], session['is_admin'] = user['id'], user['email'], bool(user.get('is_admin'))
    session['user'] = {k: user.get(k) for k in ('id', 'name', 'email', 'profile_picture', 'auth_provider')}


@api_bp.route('/auth/me')
@login_required
def me():
    return jsonify(B.get_user_profile(g.user['userId']))


@api_bp.route('/auth/profile', methods=['PUT'])
@login_required
def update_profile():
    d = request.get_json(silent=True) or {}
    return jsonify(B.update_user_profile(g.user['userId'], d.get('name', ''), d.get('phone', ''), d.get('avatar_url') or ''))


# ---- uploads ----
_SIGNATURES = {'jpg': (b'\xff\xd8\xff',), 'png': (b'\x89PNG\r\n\x1a\n',), 'webp': (b'RIFF',)}


@api_bp.route('/upload', methods=['POST'])
@login_required
def upload():
    d = request.get_json(silent=True) or {}
    data = d.get('data') or ''
    if not data:
        return jsonify({'error': 'No image data provided'}), 400
    ext, b64 = 'jpg', data
    if ';base64,' in data:
        head, b64 = data.split(';base64,', 1)
        ext = 'png' if 'png' in head else 'webp' if 'webp' in head else 'jpg'
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception:
        return jsonify({'error': 'Invalid image data'}), 400
    if len(raw) > 10 * 1024 * 1024:
        return jsonify({'error': 'Image file size exceeds 10MB limit.'}), 400
    if not raw.startswith(_SIGNATURES[ext][0]) or (ext == 'webp' and raw[8:12] != b'WEBP'):
        return jsonify({'error': 'File is not a valid JPG, PNG or WebP image.'}), 400
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    name = f"upload_{secrets.token_hex(8)}.{ext}"
    with open(os.path.join(current_app.config['UPLOAD_FOLDER'], name), 'wb') as f:
        f.write(raw)
    return jsonify({'success': True, 'url': f'/uploads/{name}'})


# ---- items ----
@api_bp.route('/items')
def items():
    a = request.args
    return jsonify(B.get_items(q=a.get('q', ''), category=a.get('category', ''), location=a.get('location', ''),
                               item_date=a.get('item_date', ''), item_type=a.get('type', ''), status=a.get('status', ''),
                               sort=a.get('sort', 'new'), page=_int(a.get('page'), 1), limit=_int(a.get('limit'), 9),
                               current_user_id=g.user['userId'] if g.user else None))


@api_bp.route('/items/<int:item_id>')
def item(item_id):
    res = B.get_item_by_id(item_id, g.user['userId'] if g.user else None, g.user['isAdmin'] if g.user else False)
    return _status(res, 404)


@api_bp.route('/items', methods=['POST'])
@login_required
def create_item():
    d = request.get_json(silent=True) or {}
    if not all(d.get(k) for k in ('name', 'category', 'description', 'location', 'item_date', 'type')):
        return jsonify({'error': 'Please provide all required fields.'}), 400
    return jsonify(B.create_item(g.user['userId'], {
        'name': d['name'], 'category': d['category'], 'description': d['description'], 'location': d['location'],
        'item_date': d['item_date'], 'type': str(d['type']).upper(), 'image_url': d.get('image_url', ''),
        'identifying_features': d.get('identifying_features', ''), 'contact_info': d.get('contact_info') or g.user['email']}))


@api_bp.route('/items/<int:item_id>', methods=['PUT'])
@login_required
def update_item(item_id):
    return _status(B.update_item(item_id, g.user['userId'], request.get_json(silent=True) or {}, g.user['isAdmin']))


@api_bp.route('/items/<int:item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    return _status(B.delete_item(item_id, g.user['userId'], g.user['isAdmin']))


# ---- matches / claims ----
@api_bp.route('/matches')
@login_required
def matches():
    return jsonify(B.get_matches_for_user(g.user['userId']))


@api_bp.route('/matches/<int:match_id>/status', methods=['POST'])
@login_required
def match_status(match_id):
    return jsonify(B.update_match_status(match_id, g.user['userId'], (request.get_json(silent=True) or {}).get('status')))


@api_bp.route('/claims')
@login_required
def claims():
    return jsonify(B.get_claims_for_user(g.user['userId']))


@api_bp.route('/claims', methods=['POST'])
@login_required
def create_claim():
    d = request.get_json(silent=True) or {}
    if not d.get('item_id') or len((d.get('proof_description') or '').strip()) < 5:
        return jsonify({'error': 'Please describe specific proof of ownership.'}), 400
    return _status(B.create_claim(_int(d['item_id'], 0), g.user['userId'], d['proof_description'], d.get('proof_attachment', '')))


@api_bp.route('/claims/<int:claim_id>/decide', methods=['POST'])
@login_required
def decide_claim(claim_id):
    d = request.get_json(silent=True) or {}
    if d.get('action') not in ('APPROVE', 'REJECT'):
        return jsonify({'error': 'Action must be APPROVE or REJECT'}), 400
    return _status(B.decide_claim(claim_id, g.user['userId'], d['action'], d.get('reviewer_notes', '')))


@api_bp.route('/claims/<int:claim_id>/messages')
@login_required
def claim_messages(claim_id):
    return _status(B.get_claim_messages(claim_id, g.user['userId']), 403)


@api_bp.route('/claims/<int:claim_id>/messages', methods=['POST'])
@login_required
def send_claim_message(claim_id):
    msg = (request.get_json(silent=True) or {}).get('message') or ''
    if not msg.strip():
        return jsonify({'error': 'Message cannot be empty.'}), 400
    return _status(B.send_claim_message(claim_id, g.user['userId'], msg), 403)


# ---- notifications ----
@api_bp.route('/notifications')
def notifications():
    if not g.user:
        return jsonify({'notifications': [], 'unread_count': 0})
    return jsonify(B.get_notifications(g.user['userId']))


@api_bp.route('/notifications/read', methods=['POST'])
@login_required
def notifications_read():
    return jsonify(B.mark_notifications_read(g.user['userId']))


# ---- admin ----
@api_bp.route('/admin/data')
@admin_required
def admin_data():
    return jsonify(B.get_admin_data(g.user['userId']))


@api_bp.route('/admin/users/<int:user_id>/suspend', methods=['POST'])
@admin_required
def admin_suspend(user_id):
    return jsonify(B.admin_toggle_suspend(g.user['userId'], user_id))


@api_bp.route('/admin/categories', methods=['POST'])
@admin_required
def admin_add_category():
    d = request.get_json(silent=True) or {}
    return jsonify(B.admin_manage_category(g.user['userId'], 'ADD', d.get('name'), d.get('icon') or '📦'))


@api_bp.route('/admin/categories/<int:cat_id>', methods=['DELETE'])
@admin_required
def admin_delete_category(cat_id):
    return jsonify(B.admin_manage_category(g.user['userId'], 'DELETE', '', '📦', cat_id))


