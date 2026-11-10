"""
LostLink Database Layer (SQLite)
Handles database initialization, schema execution, seeding, and JSON API operations.
"""

import sqlite3
import hashlib
import os
import json
import sys
from datetime import datetime
import secrets

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

BUNDLED_DB_PATH = os.path.join(BASE_DIR, 'database', 'lostlink.db')
# Override with DATABASE_PATH to keep the SQLite file on a persistent disk (e.g. /data/lostlink.db).
DB_PATH = os.environ.get('DATABASE_PATH') or BUNDLED_DB_PATH
IS_PROD = os.environ.get('LOSTLINK_ENV', '').lower() == 'production'
SCHEMA_PATH = os.path.join(BASE_DIR, 'database', 'schema.sql')

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def hash_password(password: str, salt: str = None) -> str:
    """Secure password hashing using PBKDF2 HMAC SHA-256."""
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"pbkdf2:sha256:100000${salt}${dk.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies password against stored PBKDF2 hash."""
    try:
        parts = stored_hash.split('$')
        if len(parts) != 3:
            return False
        algo_iter, salt, hash_val = parts
        iterations = int(algo_iter.split(':')[-1])
        dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
        return secrets.compare_digest(dk.hex(), hash_val)
    except Exception:
        return False

def get_connection():
    """Returns a connection to the SQLite database with Row factory and foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def migrate_db(conn):
    """Safely adds Google OAuth columns to existing users table without losing records."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users);")
    existing_cols = {row['name'] for row in cur.fetchall()}

    if 'google_id' not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN google_id TEXT;")
    if 'profile_picture' not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT '';")
    if 'auth_provider' not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local';")
    if 'email_verified' not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;")

    # Unique index for google_id where not null
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;")
    conn.commit()

def set_admin(email, password, name='Admin User'):
    """Create the admin account, or reset its password and make sure it is an active admin."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()
        if row:
            conn.execute("UPDATE users SET password_hash = ?, is_admin = 1, is_suspended = 0, email_verified = 1 WHERE id = ?",
                         (hash_password(password), row['id']))
        else:
            conn.execute("""INSERT INTO users (name, email, phone, password_hash, is_admin, is_suspended, avatar_url,
                            google_id, profile_picture, auth_provider, email_verified)
                            VALUES (?, ?, '', ?, 1, 0, '', NULL, '', 'local', 1)""", (name, email, hash_password(password)))
        conn.commit()
    finally:
        conn.close()


def lock_sample_accounts(conn, keep_email=None):
    """Give every sample account an unguessable password (the seed password is public in the source)."""
    for r in conn.execute("SELECT id, email FROM users WHERE auth_provider IN ('local', 'google_linked')").fetchall():
        if keep_email and r['email'].lower() == keep_email.lower():
            continue
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(secrets.token_urlsafe(24)), r['id']))
    conn.commit()


def _init_db_unlocked():
    """Initializes tables, runs safe migrations, and seeds default data if tables are empty."""
    # First start on a fresh persistent disk: begin from the bundled database so existing records carry over.
    if DB_PATH != BUNDLED_DB_PATH and not os.path.exists(DB_PATH) and os.path.exists(BUNDLED_DB_PATH):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        import shutil
        shutil.copyfile(BUNDLED_DB_PATH, DB_PATH + '.tmp')
        os.replace(DB_PATH + '.tmp', DB_PATH)  # atomic: other processes never see a half-written file
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()

        # Run safe migration on users table
        migrate_db(conn)

        # Check if already seeded
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]

        if user_count == 0:
            seed_data(conn)
            if IS_PROD:
                lock_sample_accounts(conn)
            print("Database initialized and seeded successfully.")
        else:
            print(f"Database already initialized ({user_count} users).")
    finally:
        conn.close()

def seed_data(conn):
    """Seeds initial categories, realistic users, and initial lost & found items."""
    cur = conn.cursor()

    # 1. Categories
    categories = [
        ('Electronics', '📱', 'Phones, laptops, chargers, headphones, tablets'),
        ('Documents', '📄', 'IDs, passports, licenses, credit cards, certificates'),
        ('Bags', '🎒', 'Backpacks, handbags, luggage, laptop sleeves, wallets'),
        ('Clothing', '🧥', 'Jackets, sweaters, hats, scarves, shoes'),
        ('Accessories', '⌚', 'Watches, jewelry, sunglasses, rings, bracelets'),
        ('Books', '📚', 'Textbooks, notebooks, journals, novels'),
        ('Keys', '🔑', 'Car fobs, house keys, bike locks, keychains'),
        ('Other', '📦', 'Umbrellas, sports gear, musical instruments, miscellaneous')
    ]
    cur.executemany("INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)", categories)

    # 2. Users (Admin, Asha, Ravi, Meena, Priya, Karthik)
    default_pw = "Password123!" # Meets >= 8 chars requirement
    users = [
        ('Admin User', 'admin@lostlink.org', '+1 555-0100', hash_password(default_pw), 1, 0, '/src/assets/images/avatar_verified_user_1794297159863.jpg', None, '', 'local', 1),
        ('Asha Sharma', 'asha@example.com', '+1 555-0101', hash_password(default_pw), 0, 0, '/src/assets/images/avatar_verified_user_1794297159863.jpg', None, '', 'local', 1),
        ('Ravi Patel', 'ravi@example.com', '+1 555-0102', hash_password(default_pw), 0, 0, '', None, '', 'local', 1),
        ('Meena Kumari', 'meena@example.com', '+1 555-0103', hash_password(default_pw), 0, 0, '', None, '', 'local', 1),
        ('Priya Sundaram', 'priya@example.com', '+1 555-0104', hash_password(default_pw), 0, 0, '', None, '', 'local', 1),
        ('Karthik Raj', 'karthik@example.com', '+1 555-0105', hash_password(default_pw), 0, 0, '', None, '', 'local', 1)
    ]
    cur.executemany(
        """INSERT INTO users 
           (name, email, phone, password_hash, is_admin, is_suspended, avatar_url, google_id, profile_picture, auth_provider, email_verified) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        users
    )

    # 3. Items
    # Real generated product image paths
    backpack_img = '/src/assets/images/item_laptop_backpack_1794297157903.jpg'
    wallet_img = '/src/assets/images/item_leather_wallet_1794297159556.jpg'
    keys_img = '/src/assets/images/item_car_keys_1794297160842.jpg'
    desk_img = '/src/assets/images/hero_lost_belongings_1794297158099.jpg'

    items = [
        # (user_id, type, name, category, description, location, item_date, image_url, identifying_features, contact_info, status)
        (2, 'LOST', 'Black Dell laptop bag', 'Bags', 'Black canvas laptop bag with red zipper pulls and water-resistant fabric.', 'Metro Transit Hub, Platform 4', '2026-11-06', backpack_img, 'Has a sticker on interior pocket that says "Fix-It 2024" and Dell 65W charger inside', 'asha@example.com / +1 555-0101', 'OPEN'),
        (3, 'FOUND', 'Black laptop backpack with red trim', 'Bags', 'Dark charcoal backpack found on passenger seating bench near Platform 4.', 'Metro Transit Hub, Platform 4', '2026-11-07', backpack_img, 'Contains Dell charger and internal serial number sticker', 'ravi@example.com', 'OPEN'),
        (4, 'LOST', 'Car smart key with blue lanyard', 'Keys', 'Modern 3-button car key fob with a distinctive blue braided leather lanyard.', 'Civic Center West Entrance parking', '2026-11-08', keys_img, 'Small silver clasp and subtle scratch near lock button', 'meena@example.com', 'OPEN'),
        (6, 'FOUND', 'Car key fob with blue leather strap', 'Keys', 'Black 3-button electronic key fob found near parking ticket dispenser.', 'Civic Center West Entrance parking', '2026-11-08', keys_img, 'Key blade serial starts with VK-88', 'karthik@example.com', 'OPEN'),
        (2, 'LOST', 'Vintage brown leather bifold wallet', 'Bags', 'Distressed brown leather bifold wallet containing transit cards and driver license.', 'Downtown Cafe & Library', '2026-11-02', wallet_img, 'Initials "AS" faintly stamped inside billfold', 'asha@example.com', 'OPEN'),
        (3, 'FOUND', 'Brown leather cardholder and wallet', 'Bags', 'Leather bifold wallet found tucked between armchair cushions.', 'Downtown Cafe & Library', '2026-11-03', wallet_img, 'Contains student transit pass ending in 904', 'ravi@example.com', 'CLAIM_PENDING'),
        (4, 'LOST', 'Organic Chemistry 4th Edition textbook', 'Books', 'Hardcover university chemistry book with yellow sticky tabs on chapter 5.', 'University Science Quad', '2026-11-04', '', 'Name "Meena K." written in blue ink on title page', 'meena@example.com', 'OPEN'),
        (3, 'FOUND', 'Silver analog wrist watch', 'Accessories', 'Classic stainless steel wrist watch with brown leather strap.', 'Lakeside Marina Pier', '2026-11-04', '', 'Engraving on case back with year 2021', 'ravi@example.com', 'RETURNED'),
        (6, 'FOUND', 'Navy blue storm umbrella', 'Other', 'Large fiberglass windproof navy blue umbrella with curved wooden handle.', 'City Central Bus Stop 12', '2026-11-09', '', 'Brand tag "StormShield 60"', 'karthik@example.com', 'OPEN'),
        (2, 'LOST', 'Navy blue compact windproof umbrella', 'Other', 'Dark navy umbrella with wooden j-handle forgotten during rainstorm.', 'City Central Bus Stop 12', '2026-11-09', '', 'Has faint white paint scuff on handle', 'asha@example.com', 'OPEN')
    ]

    cur.executemany(
        """INSERT INTO items 
           (user_id, type, name, category, description, location, item_date, image_url, identifying_features, contact_info, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        items
    )

    # 4. Claims
    claims = [
        (6, 5, 'My transit card and student pass are inside, name begins with P.', '', 'PENDING', '')
    ]
    cur.executemany(
        """INSERT INTO claims 
           (item_id, claimant_id, proof_description, proof_attachment, status, reviewer_notes) 
           VALUES (?, ?, ?, ?, ?, ?)""",
        claims
    )

    # 5. Claim Messages
    messages = [
        (1, 5, 'Hi Ravi! I believe this is my wallet left at the Downtown cafe.'),
        (1, 3, 'Hello Priya! Could you tell me what specific initials or brand stamp is inside the billfold?')
    ]
    cur.executemany(
        "INSERT INTO claim_messages (claim_id, sender_id, message) VALUES (?, ?, ?)",
        messages
    )

    # 6. Admin Logs
    logs = [
        (1, 'SYSTEM_INIT', 'System database initialized with default categories and sample reports.', '127.0.0.1'),
        (1, 'USER_VERIFY', 'Verified user Asha Sharma and Meena Kumari.', '127.0.0.1')
    ]
    cur.executemany(
        "INSERT INTO admin_logs (admin_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
        logs
    )

    # 7. Notifications
    notifications = [
        (2, 'Potential Match Found!', 'We found a high-confidence match for your "Black Dell laptop bag" at Metro Transit Hub.', '/dashboard?tab=matches', 0),
        (3, 'New Claim Request', 'Priya Sundaram submitted an ownership claim for your found "Brown leather cardholder and wallet".', '/dashboard?tab=incoming', 0)
    ]
    cur.executemany(
        "INSERT INTO notifications (user_id, title, message, link, is_read) VALUES (?, ?, ?, ?, ?)",
        notifications
    )

    conn.commit()

    # Recompute matches using our matching engine
    from services.matching import calculate_match_score
    cur.execute("SELECT * FROM items WHERE type = 'LOST'")
    losts = [dict(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM items WHERE type = 'FOUND'")
    founds = [dict(r) for r in cur.fetchall()]

    for l in losts:
        for f in founds:
            res = calculate_match_score(l, f)
            if res['score'] >= 45:
                cur.execute(
                    """INSERT OR REPLACE INTO matches (lost_item_id, found_item_id, score, breakdown_json, status) 
                       VALUES (?, ?, ?, ?, 'SUGGESTED')""",
                    (l['id'], f['id'], res['score'], json.dumps(res['breakdown']))
                )
    conn.commit()
def init_db():
    """Run initialization once even when several gunicorn workers start together (file lock on POSIX)."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    try:
        import fcntl
    except ImportError:  # Windows: single-process dev use
        return _init_db_unlocked()
    with open(DB_PATH + '.init.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            return _init_db_unlocked()
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'init'
    if cmd == 'init':
        init_db()
    elif cmd == 'reseed':
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        init_db()

