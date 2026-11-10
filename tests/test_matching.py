"""
LostLink Unit and Integration Tests
Validates database schema, password hashing, and the smart matching algorithm.
"""

import sys
import os
import unittest
import sqlite3

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.matching import calculate_match_score, jaccard_similarity
from database.db import hash_password, verify_password, get_connection

class TestLostLinkMatching(unittest.TestCase):

    def test_text_similarity(self):
        s1 = "Black Dell Inspiron laptop bag"
        s2 = "Black laptop backpack Dell"
        sim = jaccard_similarity(s1, s2)
        self.assertGreater(sim, 0.4)

    def test_match_score_high_confidence(self):
        lost = {
            "category": "Bags",
            "name": "Black Dell laptop bag",
            "description": "Black canvas bag with red zippers",
            "identifying_features": "Dell 65W charger inside",
            "location": "Central Station Platform 4",
            "item_date": "2026-11-06"
        }
        found = {
            "category": "Bags",
            "name": "Black laptop backpack with red trim",
            "description": "Black bag found near platform 4 with red zip",
            "identifying_features": "Dell charger inside",
            "location": "Central Station Platform 4",
            "item_date": "2026-11-07"
        }
        res = calculate_match_score(lost, found)
        self.assertGreaterEqual(res['score'], 70)
        self.assertTrue(res['is_match'])
        self.assertEqual(res['breakdown']['category'], 25.0)

    def test_match_score_different_categories(self):
        lost = {
            "category": "Electronics",
            "name": "Silver Apple iPhone",
            "description": "Smartphone",
            "location": "Main St",
            "item_date": "2026-11-01"
        }
        found = {
            "category": "Keys",
            "name": "Silver Car Keys",
            "description": "Key fob",
            "location": "Beach Pier",
            "item_date": "2026-11-08"
        }
        res = calculate_match_score(lost, found)
        self.assertLess(res['score'], 45)
        self.assertFalse(res['is_match'])

    def test_password_hashing(self):
        pw = "SuperSecret2026!"
        h = hash_password(pw)
        self.assertTrue(verify_password(pw, h))
        self.assertFalse(verify_password("WrongPassword!", h))

    def test_database_foreign_keys(self):
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM items")
            item_count = cur.fetchone()[0]
            self.assertGreater(item_count, 0)

            cur.execute("SELECT COUNT(*) FROM users")
            user_count = cur.fetchone()[0]
            self.assertGreater(user_count, 0)
        finally:
            conn.close()

    def test_google_authentication_and_linking(self):
        from database.api_bridge import auth_google
        
        # Test 1: New user registration via Google
        new_email = "test.google.user@example.com"
        result_new = auth_google(
            google_id="gid_test_123456789",
            email=new_email,
            name="Google Test User",
            profile_picture="https://example.com/avatar.jpg",
            email_verified=True
        )
        self.assertTrue(result_new.get("success"))
        self.assertTrue(result_new.get("is_new"))
        user_new = result_new.get("user")
        self.assertEqual(user_new["email"], new_email)
        self.assertEqual(user_new["auth_provider"], "google")
        self.assertEqual(user_new["google_id"], "gid_test_123456789")
        self.assertEqual(user_new["email_verified"], 1)

        # Test 2: Existing Google user login (idempotent, does not duplicate)
        result_existing_google = auth_google(
            google_id="gid_test_123456789",
            email=new_email,
            name="Google Test User Updated",
            profile_picture="https://example.com/avatar_new.jpg",
            email_verified=True
        )
        self.assertTrue(result_existing_google.get("success"))
        self.assertFalse(result_existing_google.get("is_new"))
        self.assertEqual(result_existing_google["user"]["id"], user_new["id"])

        # Test 3: Account linking for existing password user (e.g. ravi@example.com)
        result_link = auth_google(
            google_id="gid_ravi_google_987",
            email="ravi@example.com",
            name="Ravi Kumar",
            profile_picture="https://example.com/ravi.jpg",
            email_verified=True
        )
        self.assertTrue(result_link.get("success"))
        self.assertTrue(result_link.get("linked"))
        self.assertEqual(result_link["user"]["auth_provider"], "google_linked")
        self.assertEqual(result_link["user"]["google_id"], "gid_ravi_google_987")

if __name__ == '__main__':
    unittest.main()

