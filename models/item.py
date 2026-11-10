"""
Item model representing LOST and FOUND reports.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class Item:
    id: int
    user_id: int
    type: str # 'LOST' or 'FOUND'
    name: str
    category: str
    description: str
    location: str
    item_date: str
    image_url: str = ""
    identifying_features: str = ""
    contact_info: str = ""
    status: str = "OPEN" # 'OPEN', 'CLAIM_PENDING', 'MATCHED', 'RETURNED'
    view_count: int = 0
    created_at: Optional[str] = None

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        d = dict(row)
        return cls(
            id=d['id'],
            user_id=d['user_id'],
            type=d['type'],
            name=d['name'],
            category=d['category'],
            description=d['description'],
            location=d['location'],
            item_date=str(d['item_date']),
            image_url=d.get('image_url', ''),
            identifying_features=d.get('identifying_features', ''),
            contact_info=d.get('contact_info', ''),
            status=d.get('status', 'OPEN'),
            view_count=d.get('view_count', 0),
            created_at=str(d.get('created_at', ''))
        )
