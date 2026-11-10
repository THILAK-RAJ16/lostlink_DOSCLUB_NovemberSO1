"""
User model representing authenticated members and administrators.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: int
    name: str
    email: str
    phone: str
    password_hash: str
    is_admin: bool = False
    is_suspended: bool = False
    avatar_url: str = ""
    google_id: Optional[str] = None
    profile_picture: Optional[str] = ""
    auth_provider: str = "local"
    email_verified: bool = False
    created_at: Optional[str] = None

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        d = dict(row)
        return cls(
            id=d['id'],
            name=d['name'],
            email=d['email'],
            phone=d.get('phone', ''),
            password_hash=d.get('password_hash', ''),
            is_admin=bool(d.get('is_admin', 0)),
            is_suspended=bool(d.get('is_suspended', 0)),
            avatar_url=d.get('avatar_url', ''),
            google_id=d.get('google_id'),
            profile_picture=d.get('profile_picture', ''),
            auth_provider=d.get('auth_provider', 'local'),
            email_verified=bool(d.get('email_verified', 0)),
            created_at=str(d.get('created_at', ''))
        )
