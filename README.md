# LostLink – Smart Lost and Found Web Application

**LostLink** is a full-stack web application designed to help people report lost items, list found items, discover high-confidence algorithmic matches, and securely recover personal belongings.

---

## Key Features

### 1. Dual Authentication: Email/Password & Google Sign-In
- **Official Google Sign-In**: Integrated using Google Identity Services and OAuth 2.0 / OpenID Connect.
- **Account Linking**: Existing email/password accounts automatically and securely link to Google upon sign-in with verified emails—no duplicate accounts.
- **New User Onboarding**: Automatic profile creation from Google verified email, name, and profile picture.
- **Password Security**: PBKDF2 HMAC-SHA256 password hashing for password-based logins, with nullable passwords supported for Google-only users.
- **Role-Based Access**: Distinguishes standard members and platform administrators.
- **Zero SendGrid/SMTP**: Clean architecture free of external third-party email delivery dependencies.

### 2. Modern Landing Page
- Dynamic hero section with instant search and prominent **Report Lost** / **Report Found** CTAs.
- Live database statistics displaying total lost reports, found reports, and successfully returned items.
- Recent lost and found showcase grids.
- 4-step interactive explanation of the verification and recovery lifecycle.

### 3. Report Lost & Found Items
- Full metadata capture: Item name, Category, Description, Location, Date, and Photo.
- **Privacy-First Found Listings**: In public listings for found belongings, sensitive identifying information (serial numbers, interior cards, lock screens) is automatically concealed to prevent fraudulent claims.
- Image upload supporting JPG, PNG, and WebP with preview and storage.

### 4. Smart Lost & Found Matching Engine
When an item is reported, LostLink's matching engine evaluates potential pairs across 5 factors:
1. **Category Match (25%)**: Exact category alignment.
2. **Name Similarity (30%)**: Jaccard token overlap + sequence similarity.
3. **Description Similarity (20%)**: Keyword and semantic token overlap.
4. **Location Proximity (15%)**: Landmark and district token matching.
5. **Date Proximity (10%)**: Temporal decay calculation based on days between loss and find dates.

Matches scoring $\ge 45\%$ generate potential match candidates with detailed score breakdowns.

### 5. Ownership Verification & Claims Recovery
- Claimants submit proof of ownership explaining concealed characteristics.
- Finders review claims in their incoming queue with the ability to **Approve** or **Reject**.
- Secure peer-to-peer claim messaging thread to coordinate safe handover in public spaces.
- Approved claims automatically transition the item to `RETURNED`.

### 6. Administration Console
- System-wide metric cards (total members, lost reports, found reports, return rate).
- User moderation with one-click suspension and reactivation.
- Content moderation with direct removal of inappropriate reports.
- Category taxonomy manager to add and remove item categories.
- Real-time audit logs tracking administrative actions.

---

## Google Cloud Configuration Guide

Follow these steps to configure Google OAuth 2.0 credentials for production or local development:

### 1. Open Google Cloud Console
Navigate to [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account.

### 2. Create a Google Cloud Project
1. Click the project dropdown at the top of the page.
2. Click **New Project**.
3. Enter `LostLink` as the Project Name.
4. Click **Create** and ensure the project is selected.

### 3. Configure OAuth Consent Screen
1. In the navigation menu, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the App Information:
   - **App name**: `LostLink`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Click **Save and Continue**, then add test users if in Testing status, and complete the wizard.

### 4. Create OAuth 2.0 Web Client ID
1. In the navigation menu, go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Select **Web application** as the Application Type.
4. Set Name to `LostLink Web Client`.

### 5. Configure Authorized JavaScript Origins
Add the following URLs to **Authorized JavaScript origins**:
- `https://ais-dev-xx27nding5jforom4r24fx-352293469183.asia-southeast1.run.app`
- `https://ais-pre-xx27nding5jforom4r24fx-352293469183.asia-southeast1.run.app`
- `http://localhost:3000`
- `http://127.0.0.1:5000`

### 6. Configure Authorized Redirect URIs
Add the following URLs to **Authorized redirect URIs**:
- `https://ais-dev-xx27nding5jforom4r24fx-352293469183.asia-southeast1.run.app/auth/callback`
- `https://ais-pre-xx27nding5jforom4r24fx-352293469183.asia-southeast1.run.app/auth/callback`
- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:5000/auth/google/callback`

### 7. Configure Environment Variables
Copy the generated Client ID and Client Secret into your `.env` file:

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/auth/google/callback

# Session Secret Key
SECRET_KEY=lostlink-super-secret-key-change-in-production
```

> **Security Note**: Never expose `GOOGLE_CLIENT_SECRET` in client-side code or public repositories. Authentication tokens are verified server-side.

---

## Relational Database Schema

```sql
users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT,             -- Nullable for Google-only authentication
    google_id TEXT UNIQUE,          -- Unique Google ID for OAuth
    profile_picture TEXT,           -- Google or custom avatar URL
    auth_provider TEXT DEFAULT 'local', -- 'local', 'google', or 'google_linked'
    email_verified INTEGER DEFAULT 0,  -- 1 for Google or verified emails
    is_admin INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

categories (id, name, icon, description, created_at);
items (id, user_id, type, name, category, description, location, item_date, image_url, identifying_features, contact_info, status, view_count, created_at, updated_at);
claims (id, item_id, claimant_id, proof_description, proof_attachment, status, reviewer_notes, created_at, resolved_at);
claim_messages (id, claim_id, sender_id, message, created_at);
matches (id, lost_item_id, found_item_id, score, breakdown_json, status, created_at);
notifications (id, user_id, title, message, link, is_read, created_at);
admin_logs (id, admin_id, action, details, ip_address, created_at);
```

---

## Quick Start & Verification

### Running the Application
```bash
# Start development server on port 3000
npm run dev
```

### Initializing / Migrating Database
```bash
# Safe migration retaining existing records
python3 database/db.py migrate

# Reseed database with fresh demo records
python3 database/db.py reseed
```

### Running the Test Suite
```bash
# Execute unit tests for matching algorithm, password hashing, and Google OAuth
python3 tests/test_matching.py
```


## Running with Flask (python app.py)

1. Build the React front-end once: `npm install --legacy-peer-deps && npm run build` (creates `dist/`).
2. `pip install -r requirements.txt`, copy `.env.example` to `.env` and fill in the Google credentials.
3. `python app.py`, then open **http://127.0.0.1:5000/** (use `127.0.0.1`, not `localhost`, so it matches the Google redirect URI).

Google Cloud Console redirect URI: `http://127.0.0.1:5000/auth/google/callback`.
Blueprints: `main_bp` (`/`, `/dashboard`, `/profile`, `/uploads/*`), `auth_bp` (`/auth/*`), `api_bp` (`/api/*`).

## Deploying to production

Required environment variables: `LOSTLINK_ENV=production`, `SECRET_KEY` (long random string), and for Google
sign-in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN/auth/google/callback`
(add the same URI in Google Cloud Console). Optional: `DATABASE_PATH` and `UPLOAD_FOLDER` (put both on a persistent
disk, e.g. `/data/...`; SQLite files on ephemeral disks are lost on redeploy), `ADMIN_EMAIL` + `ADMIN_PASSWORD`
(creates/resets the admin at startup).

- **Docker / any host:** `docker build -t lostlink . && docker run -p 5000:5000 --env-file .env -v lostlink-data:/data -e DATABASE_PATH=/data/lostlink.db -e UPLOAD_FOLDER=/data/uploads lostlink`
- **Render:** push to Git, create a Blueprint from `render.yaml`, then fill in the Google variables.
- **Procfile hosts (Railway, Heroku-style):** build the front-end first (`npm install --legacy-peer-deps && npm run build`), then `gunicorn wsgi:app`.
- **Change the admin password:** `python manage.py set-admin --email admin@lostlink.org`

Production mode turns off the fake "demo Google" accounts, requires Secure cookies (HTTPS), and gives sample accounts
random passwords. First start on a new disk copies the bundled database so existing records carry over.
