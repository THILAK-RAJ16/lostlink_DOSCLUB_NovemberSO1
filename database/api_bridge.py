"""
LostLink Database & Service API Bridge
Provides high-performance JSON-based interface to the SQLite database and matching service.
Used by both the REST API server and CLI management tools.
"""

import sys
import os
import json
import sqlite3
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.db import get_connection, hash_password, verify_password
from services.matching import calculate_match_score

def dict_from_row(row):
    return dict(row) if row else None

def rows_to_dicts(rows):
    return [dict(r) for r in rows]

# ----------------- AUTHENTICATION -----------------

def auth_register(name, email, phone, password):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = ? COLLATE NOCASE", (email.strip(),))
        if cur.fetchone():
            return {"error": "An account with this email already exists."}
        
        pw_hash = hash_password(password)
        is_admin = 1 if 'admin' in email.lower() else 0
        cur.execute(
            """INSERT INTO users (name, email, phone, password_hash, is_admin, is_suspended)
               VALUES (?, ?, ?, ?, ?, 0)""",
            (name.strip(), email.strip(), phone.strip(), pw_hash, is_admin)
        )
        user_id = cur.lastrowid
        conn.commit()

        cur.execute("SELECT id, name, email, phone, is_admin, is_suspended, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
        user = dict_from_row(cur.fetchone())
        return {"success": True, "user": user}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

def auth_login(email, password):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email.strip(),))
        user_row = cur.fetchone()
        if not user_row:
            return {"error": "Invalid email or password."}
        
        user = dict_from_row(user_row)
        if user.get('is_suspended'):
            return {"error": "Your account has been suspended. Please contact support."}
        
        if not verify_password(password, user['password_hash']):
            return {"error": "Invalid email or password."}
        
        # Omit password hash in returned user object
        user.pop('password_hash', None)
        return {"success": True, "user": user}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

def auth_google(google_id, email, name="", profile_picture="", email_verified=True):
    """
    Handles Google OAuth sign-in and registration:
    1. Logs in existing user by google_id.
    2. Links Google account to existing user by verified email (preventing duplicates).
    3. Creates a new user record for first-time Google sign-ins.
    """
    if not google_id or not str(google_id).strip():
        return {"error": "Invalid Google Subject ID"}
    if not email or not str(email).strip():
        return {"error": "Invalid email address returned from Google"}
    if not email_verified:
        return {"error": "Google email must be verified."}

    conn = get_connection()
    try:
        cur = conn.cursor()
        email_clean = email.strip()
        google_id_clean = str(google_id).strip()
        name_clean = name.strip() if name else email_clean.split('@')[0]
        avatar = profile_picture.strip() if profile_picture else ''

        # 1. Existing Google user by google_id
        cur.execute("SELECT * FROM users WHERE google_id = ?", (google_id_clean,))
        existing_google_user = dict_from_row(cur.fetchone())

        if existing_google_user:
            if existing_google_user.get('is_suspended'):
                return {"error": "Your account has been suspended. Please contact support."}
            
            cur.execute("""
                UPDATE users 
                SET name = CASE WHEN ? != '' THEN ? ELSE name END,
                    profile_picture = CASE WHEN ? != '' THEN ? ELSE profile_picture END,
                    avatar_url = CASE WHEN avatar_url = '' AND ? != '' THEN ? ELSE avatar_url END,
                    email_verified = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (name_clean, name_clean, avatar, avatar, avatar, avatar, existing_google_user['id']))
            conn.commit()

            cur.execute("""
                SELECT id, name, email, phone, is_admin, is_suspended, avatar_url,
                       google_id, profile_picture, auth_provider, email_verified, created_at 
                FROM users WHERE id = ?
            """, (existing_google_user['id'],))
            user = dict_from_row(cur.fetchone())
            return {"success": True, "user": user, "is_new": False, "linked": False}

        # 2. Existing user by email -> Account Linking
        cur.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email_clean,))
        existing_email_user = dict_from_row(cur.fetchone())

        if existing_email_user:
            if existing_email_user.get('is_suspended'):
                return {"error": "Your account has been suspended. Please contact support."}

            cur.execute("""
                UPDATE users 
                SET google_id = ?,
                    profile_picture = CASE WHEN profile_picture = '' AND ? != '' THEN ? ELSE profile_picture END,
                    avatar_url = CASE WHEN avatar_url = '' AND ? != '' THEN ? ELSE avatar_url END,
                    auth_provider = CASE WHEN auth_provider = 'local' THEN 'google_linked' ELSE auth_provider END,
                    email_verified = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (google_id_clean, avatar, avatar, avatar, avatar, existing_email_user['id']))
            conn.commit()

            cur.execute("""
                SELECT id, name, email, phone, is_admin, is_suspended, avatar_url,
                       google_id, profile_picture, auth_provider, email_verified, created_at 
                FROM users WHERE id = ?
            """, (existing_email_user['id'],))
            user = dict_from_row(cur.fetchone())
            return {"success": True, "user": user, "is_new": False, "linked": True}

        # 3. New User Registration
        is_admin = 1 if 'admin' in email_clean.lower() else 0
        cur.execute("""
            INSERT INTO users 
            (name, email, phone, password_hash, google_id, profile_picture, auth_provider, email_verified, is_admin, is_suspended, avatar_url)
            VALUES (?, ?, '', '', ?, ?, 'google', 1, ?, 0, ?)
        """, (name_clean, email_clean, google_id_clean, avatar, is_admin, avatar))
        new_id = cur.lastrowid
        conn.commit()

        cur.execute("""
            SELECT id, name, email, phone, is_admin, is_suspended, avatar_url,
                   google_id, profile_picture, auth_provider, email_verified, created_at 
            FROM users WHERE id = ?
        """, (new_id,))
        user = dict_from_row(cur.fetchone())
        return {"success": True, "user": user, "is_new": True, "linked": False}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

def get_user_profile(user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, email, phone, is_admin, is_suspended, avatar_url,
                   google_id, profile_picture, auth_provider, email_verified, created_at 
            FROM users WHERE id = ?
        """, (user_id,))
        user = dict_from_row(cur.fetchone())
        if not user:
            return {"error": "User not found"}
        return {"success": True, "user": user}
    finally:
        conn.close()

def update_user_profile(user_id, name, phone, avatar_url=None):
    conn = get_connection()
    try:
        cur = conn.cursor()
        if avatar_url:
            cur.execute("UPDATE users SET name = ?, phone = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (name.strip(), phone.strip(), avatar_url.strip(), user_id))
        else:
            cur.execute("UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (name.strip(), phone.strip(), user_id))
        conn.commit()
        return get_user_profile(user_id)
    finally:
        conn.close()

# ----------------- ITEMS (LOST & FOUND) -----------------

def get_items(q="", category="", location="", item_date="", item_type="", status="", sort="new", page=1, limit=9, current_user_id=None):
    conn = get_connection()
    try:
        cur = conn.cursor()
        conditions = []
        params = []

        if q:
            conditions.append("(i.name LIKE ? OR i.description LIKE ?)")
            params.extend([f"%{q}%", f"%{q}%"])
        if category:
            conditions.append("i.category = ?")
            params.append(category)
        if location:
            conditions.append("i.location LIKE ?")
            params.append(f"%{location}%")
        if item_date:
            conditions.append("i.item_date >= ?")
            params.append(item_date)
        if item_type:
            conditions.append("i.type = ?")
            params.append(item_type)
        if status:
            conditions.append("i.status = ?")
            params.append(status)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        order_clause = "ORDER BY i.item_date ASC, i.id ASC" if sort == "old" else "ORDER BY i.item_date DESC, i.id DESC"

        # Count total
        cur.execute(f"SELECT COUNT(*) FROM items i {where_clause}", params)
        total_count = cur.fetchone()[0]

        offset = (int(page) - 1) * int(limit)
        query = f"""
            SELECT i.id, i.user_id, i.type, i.name, i.category, i.description,
                   i.location, i.item_date, i.image_url, i.identifying_features,
                   i.contact_info, i.status, i.view_count, i.created_at,
                   u.name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
            FROM items i
            JOIN users u ON i.user_id = u.id
            {where_clause}
            {order_clause}
            LIMIT ? OFFSET ?
        """
        cur.execute(query, params + [int(limit), int(offset)])
        items = rows_to_dicts(cur.fetchall())

        # Privacy filter for FOUND items: identifying_features is hidden unless current user is owner or admin
        for item in items:
            is_owner = (current_user_id and str(item['user_id']) == str(current_user_id))
            if item['type'] == 'FOUND' and not is_owner:
                item['identifying_features_hidden'] = True
                item['identifying_features'] = "Identifying features are kept confidential by the finder. Describe them in your ownership claim to verify."

        return {
            "items": items,
            "total": total_count,
            "page": int(page),
            "pages": max(1, (total_count + int(limit) - 1) // int(limit)),
            "limit": int(limit)
        }
    finally:
        conn.close()

def get_item_by_id(item_id, current_user_id=None, is_admin=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.avatar_url as owner_avatar
            FROM items i
            JOIN users u ON i.user_id = u.id
            WHERE i.id = ?
        """, (item_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "Item not found"}
        
        item = dict_from_row(row)
        # Increment view count
        cur.execute("UPDATE items SET view_count = view_count + 1 WHERE id = ?", (item_id,))
        conn.commit()

        is_owner = (current_user_id and str(item['user_id']) == str(current_user_id))
        
        # Check if claimant with approved claim
        has_approved_claim = False
        if current_user_id:
            cur.execute("SELECT id FROM claims WHERE item_id = ? AND claimant_id = ? AND status = 'APPROVED'", (item_id, current_user_id))
            if cur.fetchone():
                has_approved_claim = True

        if item['type'] == 'FOUND' and not (is_owner or is_admin or has_approved_claim):
            item['identifying_features_hidden'] = True
            item['identifying_features'] = "Identifying details are withheld to prevent false claims. Please provide proof when submitting an ownership claim."
        else:
            item['identifying_features_hidden'] = False

        return {"item": item}
    finally:
        conn.close()

def create_item(user_id, data):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO items (user_id, type, name, category, description, location, item_date, image_url, identifying_features, contact_info, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
        """, (
            user_id,
            data.get('type', 'LOST').upper(),
            data.get('name', '').strip(),
            data.get('category', 'Other'),
            data.get('description', '').strip(),
            data.get('location', '').strip(),
            data.get('item_date', datetime.now().strftime('%Y-%m-%d')),
            data.get('image_url', ''),
            data.get('identifying_features', '').strip(),
            data.get('contact_info', '').strip()
        ))
        item_id = cur.lastrowid
        conn.commit()

        # Recompute matches for this newly submitted item
        recompute_matches_for_item(conn, item_id)
        conn.commit()

        return get_item_by_id(item_id, current_user_id=user_id)
    finally:
        conn.close()

def update_item(item_id, user_id, data, is_admin=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id, type FROM items WHERE id = ?", (item_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "Item not found"}
        if row['user_id'] != user_id and not is_admin:
            return {"error": "Unauthorized to edit this item"}
        
        cur.execute("""
            UPDATE items 
            SET name = ?, category = ?, description = ?, location = ?, item_date = ?, 
                image_url = CASE WHEN ? != '' THEN ? ELSE image_url END,
                identifying_features = ?, contact_info = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            data.get('name', '').strip(),
            data.get('category', 'Other'),
            data.get('description', '').strip(),
            data.get('location', '').strip(),
            data.get('item_date', ''),
            data.get('image_url', ''),
            data.get('image_url', ''),
            data.get('identifying_features', '').strip(),
            data.get('contact_info', '').strip(),
            data.get('status', 'OPEN'),
            item_id
        ))
        conn.commit()

        recompute_matches_for_item(conn, item_id)
        conn.commit()

        return get_item_by_id(item_id, current_user_id=user_id, is_admin=is_admin)
    finally:
        conn.close()

def delete_item(item_id, user_id, is_admin=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id, name FROM items WHERE id = ?", (item_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "Item not found"}
        if row['user_id'] != user_id and not is_admin:
            return {"error": "Unauthorized to delete this item"}
        
        cur.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
        return {"success": True, "message": "Item report removed successfully"}
    finally:
        conn.close()

# ----------------- MATCHING ENGINE -----------------

def recompute_matches_for_item(conn, item_id):
    cur = conn.cursor()
    cur.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    target = dict_from_row(cur.fetchone())
    if not target or target['status'] == 'RETURNED':
        return

    if target['type'] == 'LOST':
        cur.execute("SELECT * FROM items WHERE type = 'FOUND' AND status != 'RETURNED'")
        counterparts = rows_to_dicts(cur.fetchall())
        for f in counterparts:
            score_data = calculate_match_score(target, f)
            if score_data['score'] >= 45:
                cur.execute("""
                    INSERT INTO matches (lost_item_id, found_item_id, score, breakdown_json, status)
                    VALUES (?, ?, ?, ?, 'SUGGESTED')
                    ON CONFLICT(lost_item_id, found_item_id) DO UPDATE SET
                    score = excluded.score, breakdown_json = excluded.breakdown_json
                """, (target['id'], f['id'], score_data['score'], json.dumps(score_data['breakdown'])))
                # Notify lost item owner
                cur.execute("""
                    INSERT INTO notifications (user_id, title, message, link)
                    VALUES (?, ?, ?, ?)
                """, (
                    target['user_id'],
                    f"Smart Match ({score_data['score']}%) Found!",
                    f"A potential match for '{target['name']}' was reported at {f['location']}.",
                    f"/dashboard?tab=matches"
                ))
    else:
        cur.execute("SELECT * FROM items WHERE type = 'LOST' AND status != 'RETURNED'")
        counterparts = rows_to_dicts(cur.fetchall())
        for l in counterparts:
            score_data = calculate_match_score(l, target)
            if score_data['score'] >= 45:
                cur.execute("""
                    INSERT INTO matches (lost_item_id, found_item_id, score, breakdown_json, status)
                    VALUES (?, ?, ?, ?, 'SUGGESTED')
                    ON CONFLICT(lost_item_id, found_item_id) DO UPDATE SET
                    score = excluded.score, breakdown_json = excluded.breakdown_json
                """, (l['id'], target['id'], score_data['score'], json.dumps(score_data['breakdown'])))
                # Notify lost item owner
                cur.execute("""
                    INSERT INTO notifications (user_id, title, message, link)
                    VALUES (?, ?, ?, ?)
                """, (
                    l['user_id'],
                    f"Smart Match ({score_data['score']}%) Found!",
                    f"A found item potentially matching your lost '{l['name']}' was just reported.",
                    f"/dashboard?tab=matches"
                ))

def get_matches_for_user(user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        query = """
            SELECT m.id, m.score, m.breakdown_json, m.status as match_status, m.created_at,
                   l.id as lost_id, l.name as lost_name, l.category as lost_cat, l.location as lost_loc, l.item_date as lost_date, l.image_url as lost_img, l.status as lost_status,
                   f.id as found_id, f.name as found_name, f.category as found_cat, f.location as found_loc, f.item_date as found_date, f.image_url as found_img, f.status as found_status,
                   u_found.name as finder_name, u_found.email as finder_email,
                   u_lost.name as loser_name, u_lost.email as loser_email
            FROM matches m
            JOIN items l ON m.lost_item_id = l.id
            JOIN items f ON m.found_item_id = f.id
            JOIN users u_found ON f.user_id = u_found.id
            JOIN users u_lost ON l.user_id = u_lost.id
            WHERE (l.user_id = ? OR f.user_id = ?) AND m.status != 'DISMISSED'
            ORDER BY m.score DESC, m.created_at DESC
        """
        cur.execute(query, (user_id, user_id))
        rows = rows_to_dicts(cur.fetchall())
        for r in rows:
            try:
                r['breakdown'] = json.loads(r['breakdown_json'])
            except Exception:
                r['breakdown'] = {}
        return {"matches": rows}
    finally:
        conn.close()

def update_match_status(match_id, user_id, new_status):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE matches SET status = ? 
            WHERE id = ? AND (lost_item_id IN (SELECT id FROM items WHERE user_id = ?) 
                           OR found_item_id IN (SELECT id FROM items WHERE user_id = ?))
        """, (new_status, match_id, user_id, user_id))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

# ----------------- CLAIMS & RECOVERY SYSTEM -----------------

def create_claim(item_id, claimant_id, proof_description, proof_attachment=""):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        item = dict_from_row(cur.fetchone())
        if not item:
            return {"error": "Item not found"}
        if item['type'] != 'FOUND':
            return {"error": "Claims can only be filed against FOUND items."}
        if item['user_id'] == claimant_id:
            return {"error": "You cannot claim an item you reported as found."}
        
        # Check existing claim
        cur.execute("SELECT id FROM claims WHERE item_id = ? AND claimant_id = ? AND status = 'PENDING'", (item_id, claimant_id))
        if cur.fetchone():
            return {"error": "You already have a pending claim for this item."}

        cur.execute("""
            INSERT INTO claims (item_id, claimant_id, proof_description, proof_attachment, status)
            VALUES (?, ?, ?, ?, 'PENDING')
        """, (item_id, claimant_id, proof_description.strip(), proof_attachment))
        claim_id = cur.lastrowid

        # Update item status to CLAIM_PENDING
        cur.execute("UPDATE items SET status = 'CLAIM_PENDING' WHERE id = ? AND status = 'OPEN'", (item_id,))

        # Notify finder
        cur.execute("SELECT name FROM users WHERE id = ?", (claimant_id,))
        claimant_name = cur.fetchone()[0]
        cur.execute("""
            INSERT INTO notifications (user_id, title, message, link)
            VALUES (?, ?, ?, ?)
        """, (
            item['user_id'],
            "New Ownership Claim Received",
            f"{claimant_name} filed an ownership claim for '{item['name']}'. Review their proof.",
            f"/dashboard?tab=incoming"
        ))

        # Add initial conversation message
        cur.execute("""
            INSERT INTO claim_messages (claim_id, sender_id, message)
            VALUES (?, ?, ?)
        """, (claim_id, claimant_id, f"Ownership claim submitted. Proof: {proof_description}"))

        conn.commit()
        return {"success": True, "claim_id": claim_id}
    finally:
        conn.close()

def get_claims_for_user(user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        # Incoming claims (for items I reported found)
        cur.execute("""
            SELECT c.*, i.name as item_name, i.category as item_category, i.location as item_location, i.image_url as item_image,
                   u.name as claimant_name, u.email as claimant_email, u.phone as claimant_phone
            FROM claims c
            JOIN items i ON c.item_id = i.id
            JOIN users u ON c.claimant_id = u.id
            WHERE i.user_id = ?
            ORDER BY c.created_at DESC
        """, (user_id,))
        incoming = rows_to_dicts(cur.fetchall())

        # Outgoing claims (claims I filed)
        cur.execute("""
            SELECT c.*, i.name as item_name, i.category as item_category, i.location as item_location, i.image_url as item_image,
                   finder.name as finder_name, finder.email as finder_email, finder.phone as finder_phone
            FROM claims c
            JOIN items i ON c.item_id = i.id
            JOIN users finder ON i.user_id = finder.id
            WHERE c.claimant_id = ?
            ORDER BY c.created_at DESC
        """, (user_id,))
        outgoing = rows_to_dicts(cur.fetchall())

        return {"incoming": incoming, "outgoing": outgoing}
    finally:
        conn.close()

def decide_claim(claim_id, user_id, action, reviewer_notes=""):
    """Finder approves or rejects a claim."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.*, i.user_id as finder_id, i.name as item_name, i.id as item_id
            FROM claims c
            JOIN items i ON c.item_id = i.id
            WHERE c.id = ?
        """, (claim_id,))
        claim = dict_from_row(cur.fetchone())
        if not claim:
            return {"error": "Claim not found"}
        if claim['finder_id'] != user_id:
            return {"error": "Only the person who found this item can approve or reject claims."}

        new_status = 'APPROVED' if action == 'APPROVE' else 'REJECTED'
        cur.execute("""
            UPDATE claims 
            SET status = ?, reviewer_notes = ?, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, reviewer_notes.strip(), claim_id))

        if new_status == 'APPROVED':
            # Mark item as RETURNED
            cur.execute("UPDATE items SET status = 'RETURNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (claim['item_id'],))
            # Reject other pending claims for this item
            cur.execute("""
                UPDATE claims SET status = 'REJECTED', reviewer_notes = 'Another claim was verified and approved.', resolved_at = CURRENT_TIMESTAMP
                WHERE item_id = ? AND id != ? AND status = 'PENDING'
            """, (claim['item_id'], claim_id))
            # Notify claimant
            cur.execute("""
                INSERT INTO notifications (user_id, title, message, link)
                VALUES (?, ?, ?, ?)
            """, (
                claim['claimant_id'],
                "Ownership Claim Approved!",
                f"Your claim for '{claim['item_name']}' was approved! You can coordinate safe handover.",
                "/dashboard?tab=outgoing"
            ))
        else:
            # Check if any other pending claims remain; if not, revert item status to OPEN
            cur.execute("SELECT id FROM claims WHERE item_id = ? AND status = 'PENDING'", (claim['item_id'],))
            if not cur.fetchone():
                cur.execute("UPDATE items SET status = 'OPEN', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (claim['item_id'],))
            # Notify claimant
            cur.execute("""
                INSERT INTO notifications (user_id, title, message, link)
                VALUES (?, ?, ?, ?)
            """, (
                claim['claimant_id'],
                "Claim Status Update",
                f"Your claim for '{claim['item_name']}' was declined. Note: {reviewer_notes or 'Details did not match'}.",
                "/dashboard?tab=outgoing"
            ))

        conn.commit()
        return {"success": True, "status": new_status}
    finally:
        conn.close()

def get_claim_messages(claim_id, user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.*, i.user_id as finder_id
            FROM claims c
            JOIN items i ON c.item_id = i.id
            WHERE c.id = ?
        """, (claim_id,))
        claim = dict_from_row(cur.fetchone())
        if not claim or (claim['claimant_id'] != user_id and claim['finder_id'] != user_id):
            return {"error": "Unauthorized to view this conversation"}

        cur.execute("""
            SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
            FROM claim_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.claim_id = ?
            ORDER BY m.created_at ASC
        """, (claim_id,))
        return {"messages": rows_to_dicts(cur.fetchall())}
    finally:
        conn.close()

def send_claim_message(claim_id, user_id, message_text):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.*, i.user_id as finder_id
            FROM claims c
            JOIN items i ON c.item_id = i.id
            WHERE c.id = ?
        """, (claim_id,))
        claim = dict_from_row(cur.fetchone())
        if not claim or (claim['claimant_id'] != user_id and claim['finder_id'] != user_id):
            return {"error": "Unauthorized to message on this claim"}

        cur.execute("""
            INSERT INTO claim_messages (claim_id, sender_id, message)
            VALUES (?, ?, ?)
        """, (claim_id, user_id, message_text.strip()))
        conn.commit()

        recipient_id = claim['finder_id'] if user_id == claim['claimant_id'] else claim['claimant_id']
        cur.execute("""
            INSERT INTO notifications (user_id, title, message, link)
            VALUES (?, ?, ?, ?)
        """, (recipient_id, "New Message on Claim", f"New message regarding your claim conversation.", "/dashboard?tab=incoming"))
        conn.commit()

        return {"success": True}
    finally:
        conn.close()

# ----------------- ADMIN DASHBOARD & STATS -----------------

def get_stats():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM items WHERE type = 'LOST'")
        total_lost = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM items WHERE type = 'FOUND'")
        total_found = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM items WHERE status = 'RETURNED'")
        total_returned = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM matches")
        total_matches = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM claims WHERE status = 'APPROVED'")
        total_claims_approved = cur.fetchone()[0]

        return {
            "total_lost": total_lost,
            "total_found": total_found,
            "total_returned": total_returned,
            "total_users": total_users,
            "total_matches": total_matches,
            "total_claims_approved": total_claims_approved
        }
    finally:
        conn.close()

def get_admin_data(admin_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT is_admin FROM users WHERE id = ?", (admin_id,))
        row = cur.fetchone()
        if not row or not row['is_admin']:
            return {"error": "Admin access required"}

        # Users list
        cur.execute("""
            SELECT u.id, u.name, u.email, u.phone, u.is_admin, u.is_suspended, u.created_at,
                   (SELECT COUNT(*) FROM items WHERE user_id = u.id) as report_count
            FROM users u
            ORDER BY u.created_at DESC
        """)
        users = rows_to_dicts(cur.fetchall())

        # All items
        cur.execute("""
            SELECT i.id, i.name, i.type, i.category, i.location, i.status, i.item_date, i.created_at,
                   u.name as owner_name, u.email as owner_email
            FROM items i
            JOIN users u ON i.user_id = u.id
            ORDER BY i.created_at DESC
        """)
        items = rows_to_dicts(cur.fetchall())

        # Categories
        cur.execute("""
            SELECT c.*, (SELECT COUNT(*) FROM items WHERE category = c.name) as item_count
            FROM categories c
            ORDER BY c.name ASC
        """)
        categories = rows_to_dicts(cur.fetchall())

        # Admin Logs
        cur.execute("""
            SELECT l.*, u.name as admin_name
            FROM admin_logs l
            LEFT JOIN users u ON l.admin_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 50
        """)
        logs = rows_to_dicts(cur.fetchall())

        stats = get_stats()

        return {
            "users": users,
            "items": items,
            "categories": categories,
            "logs": logs,
            "stats": stats
        }
    finally:
        conn.close()

def admin_toggle_suspend(admin_id, target_user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT is_admin FROM users WHERE id = ?", (admin_id,))
        if not cur.fetchone()['is_admin']:
            return {"error": "Unauthorized"}
        if admin_id == target_user_id:
            return {"error": "Cannot suspend your own account"}

        cur.execute("SELECT is_suspended, name FROM users WHERE id = ?", (target_user_id,))
        target = cur.fetchone()
        new_state = 0 if target['is_suspended'] else 1
        cur.execute("UPDATE users SET is_suspended = ? WHERE id = ?", (new_state, target_user_id))
        
        action = "USER_SUSPEND" if new_state else "USER_UNSUSPEND"
        cur.execute("INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)",
                    (admin_id, action, f"{'Suspended' if new_state else 'Unsuspended'} user {target['name']} (ID {target_user_id})"))
        conn.commit()
        return {"success": True, "is_suspended": new_state}
    finally:
        conn.close()

def admin_manage_category(admin_id, action, name, icon='📦', cat_id=None):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT is_admin FROM users WHERE id = ?", (admin_id,))
        if not cur.fetchone()['is_admin']:
            return {"error": "Unauthorized"}

        if action == 'ADD':
            cur.execute("INSERT INTO categories (name, icon) VALUES (?, ?)", (name.strip(), icon.strip()))
            cur.execute("INSERT INTO admin_logs (admin_id, action, details) VALUES (?, 'CATEGORY_ADD', ?)",
                        (admin_id, f"Added category '{name}'"))
        elif action == 'DELETE' and cat_id:
            cur.execute("SELECT name FROM categories WHERE id = ?", (cat_id,))
            c = cur.fetchone()
            if c:
                cur.execute("DELETE FROM categories WHERE id = ?", (cat_id,))
                cur.execute("INSERT INTO admin_logs (admin_id, action, details) VALUES (?, 'CATEGORY_DELETE', ?)",
                            (admin_id, f"Removed category '{c['name']}'"))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

def get_categories():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM categories ORDER BY id ASC")
        return {"categories": rows_to_dicts(cur.fetchall())}
    finally:
        conn.close()

def get_notifications(user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", (user_id,))
        notifs = rows_to_dicts(cur.fetchall())
        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", (user_id,))
        unread_count = cur.fetchone()[0]
        return {"notifications": notifs, "unread_count": unread_count}
    finally:
        conn.close()

def mark_notifications_read(user_id):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

# ----------------- CLI DISPATCHER -----------------

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action provided"}))
        return

    action = sys.argv[1]
    payload = {}
    if len(sys.argv) > 2:
        try:
            payload = json.loads(sys.argv[2])
        except Exception:
            payload = {}

    handlers = {
        "auth_register": lambda: auth_register(payload.get('name', ''), payload.get('email', ''), payload.get('phone', ''), payload.get('password', '')),
        "auth_login": lambda: auth_login(payload.get('email', ''), payload.get('password', '')),
        "auth_google": lambda: auth_google(
            google_id=payload.get('google_id'),
            email=payload.get('email'),
            name=payload.get('name', ''),
            profile_picture=payload.get('profile_picture', ''),
            email_verified=payload.get('email_verified', True)
        ),
        "get_profile": lambda: get_user_profile(payload.get('user_id')),
        "update_profile": lambda: update_user_profile(payload.get('user_id'), payload.get('name', ''), payload.get('phone', ''), payload.get('avatar_url')),
        "get_items": lambda: get_items(
            q=payload.get('q', ''),
            category=payload.get('category', ''),
            location=payload.get('location', ''),
            item_date=payload.get('item_date', ''),
            item_type=payload.get('item_type', ''),
            status=payload.get('status', ''),
            sort=payload.get('sort', 'new'),
            page=payload.get('page', 1),
            limit=payload.get('limit', 9),
            current_user_id=payload.get('current_user_id')
        ),
        "get_item": lambda: get_item_by_id(payload.get('item_id'), payload.get('current_user_id'), payload.get('is_admin', False)),
        "create_item": lambda: create_item(payload.get('user_id'), payload.get('data', {})),
        "update_item": lambda: update_item(payload.get('item_id'), payload.get('user_id'), payload.get('data', {}), payload.get('is_admin', False)),
        "delete_item": lambda: delete_item(payload.get('item_id'), payload.get('user_id'), payload.get('is_admin', False)),
        "get_matches": lambda: get_matches_for_user(payload.get('user_id')),
        "update_match": lambda: update_match_status(payload.get('match_id'), payload.get('user_id'), payload.get('status')),
        "create_claim": lambda: create_claim(payload.get('item_id'), payload.get('claimant_id'), payload.get('proof_description'), payload.get('proof_attachment', '')),
        "get_claims": lambda: get_claims_for_user(payload.get('user_id')),
        "decide_claim": lambda: decide_claim(payload.get('claim_id'), payload.get('user_id'), payload.get('action'), payload.get('reviewer_notes', '')),
        "get_claim_messages": lambda: get_claim_messages(payload.get('claim_id'), payload.get('user_id')),
        "send_claim_message": lambda: send_claim_message(payload.get('claim_id'), payload.get('user_id'), payload.get('message')),
        "get_stats": lambda: get_stats(),
        "get_categories": lambda: get_categories(),
        "get_admin_data": lambda: get_admin_data(payload.get('admin_id')),
        "admin_toggle_suspend": lambda: admin_toggle_suspend(payload.get('admin_id'), payload.get('target_user_id')),
        "admin_manage_category": lambda: admin_manage_category(payload.get('admin_id'), payload.get('action'), payload.get('name'), payload.get('icon', '📦'), payload.get('cat_id')),
        "get_notifications": lambda: get_notifications(payload.get('user_id')),
        "mark_notifications_read": lambda: mark_notifications_read(payload.get('user_id'))
    }

    if action in handlers:
        result = handlers[action]()
        print(json.dumps(result))
    else:
        print(json.dumps({"error": f"Unknown action: {action}"}))

if __name__ == '__main__':
    main()
