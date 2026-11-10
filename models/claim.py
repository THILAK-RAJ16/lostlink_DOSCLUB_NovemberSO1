"""
Claim model representing ownership recovery requests.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class Claim:
    id: int
    item_id: int
    claimant_id: int
    proof_description: str
    proof_attachment: str = ""
    status: str = "PENDING" # 'PENDING', 'APPROVED', 'REJECTED'
    reviewer_notes: str = ""
    created_at: Optional[str] = None
    resolved_at: Optional[str] = None

    @classmethod
    def from_row(cls, row):
        if not row:
            return None
        d = dict(row)
        return cls(
            id=d['id'],
            item_id=d['item_id'],
            claimant_id=d['claimant_id'],
            proof_description=d['proof_description'],
            proof_attachment=d.get('proof_attachment', ''),
            status=d.get('status', 'PENDING'),
            reviewer_notes=d.get('reviewer_notes', ''),
            created_at=str(d.get('created_at', '')),
            resolved_at=str(d.get('resolved_at', '')) if d.get('resolved_at') else None
        )
