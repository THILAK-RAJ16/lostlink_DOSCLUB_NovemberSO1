"""Admin tasks.   python manage.py set-admin [--email E] [--password P]   (password is prompted/generated if omitted)"""
import argparse, getpass, secrets
from database.db import init_db, set_admin

ap = argparse.ArgumentParser()
ap.add_argument('cmd', choices=['set-admin'])
ap.add_argument('--email', default='admin@lostlink.org')
ap.add_argument('--password')
a = ap.parse_args()
init_db()
pw = a.password or getpass.getpass('New admin password (blank = generate): ') or secrets.token_urlsafe(12)
if len(pw) < 8:
    raise SystemExit('Password must be at least 8 characters.')
set_admin(a.email, pw)
print(f'Admin ready.\n  login: {a.email}\n  password: {pw}')
