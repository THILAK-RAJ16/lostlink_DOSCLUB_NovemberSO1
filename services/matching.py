"""
LostLink Smart Lost and Found Matching Engine
Calculates multi-factor similarity between LOST and FOUND item reports.
Factors:
  1. Category Match (25%): Exact match required for highest baseline.
  2. Name Similarity (30%): Token Jaccard + sequence matcher ratio.
  3. Description Similarity (20%): Keyword overlap and semantic token analysis.
  4. Location Similarity (15%): Geographic token and landmark overlap.
  5. Date Proximity (10%): Decay function based on days between loss and find dates.
"""

from datetime import datetime
import re
import difflib

def tokenize(text: str) -> set[str]:
    """Extract alphanumeric tokens, lowercased, filtering short noise words."""
    if not text:
        return set()
    stopwords = {"the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "and", "or", "is", "it", "my", "this", "that"}
    tokens = re.findall(r'[a-z0-9]+', str(text).lower())
    return {t for t in tokens if t not in stopwords and len(t) > 1}

def jaccard_similarity(text_a: str, text_b: str) -> float:
    """Computes Jaccard index between two texts."""
    toks_a = tokenize(text_a)
    toks_b = tokenize(text_b)
    if not toks_a or not toks_b:
        return 0.0
    intersection = len(toks_a.intersection(toks_b))
    union = len(toks_a.union(toks_b))
    return intersection / union if union > 0 else 0.0

def string_ratio(text_a: str, text_b: str) -> float:
    """Computes Levenshtein-like sequence matcher ratio."""
    s_a = str(text_a or '').strip().lower()
    s_b = str(text_b or '').strip().lower()
    if not s_a or not s_b:
        return 0.0
    return difflib.SequenceMatcher(None, s_a, s_b).ratio()

def compute_text_similarity(text_a: str, text_b: str) -> float:
    """Combines Jaccard token overlap with sequence matcher ratio."""
    jac = jaccard_similarity(text_a, text_b)
    ratio = string_ratio(text_a, text_b)
    return max(jac, ratio * 0.8 + jac * 0.2)

def calculate_match_score(lost_item: dict, found_item: dict) -> dict:
    """
    Computes a match score between a LOST item and a FOUND item.
    Returns:
      {
        "score": int (0-100),
        "breakdown": {
          "category": float,
          "name": float,
          "description": float,
          "location": float,
          "date": float
        },
        "is_match": bool (score >= 45)
      }
    """
    # 1. Category Similarity (max 25 pts)
    cat_lost = str(lost_item.get('category') or '').strip().lower()
    cat_found = str(found_item.get('category') or '').strip().lower()
    category_score = 25.0 if cat_lost == cat_found and cat_lost else 0.0

    # 2. Name Similarity (max 30 pts)
    name_sim = compute_text_similarity(lost_item.get('name', ''), found_item.get('name', ''))
    name_score = round(name_sim * 30.0, 1)

    # 3. Description Similarity (max 20 pts)
    # Also incorporate lost identifying features vs found description
    desc_lost = f"{lost_item.get('description', '')} {lost_item.get('identifying_features', '')}"
    desc_found = f"{found_item.get('description', '')} {found_item.get('identifying_features', '')}"
    desc_sim = compute_text_similarity(desc_lost, desc_found)
    desc_score = round(desc_sim * 20.0, 1)

    # 4. Location Similarity (max 15 pts)
    loc_lost = lost_item.get('location', '')
    loc_found = found_item.get('location', '')
    loc_sim = compute_text_similarity(loc_lost, loc_found)
    loc_score = round(loc_sim * 15.0, 1)

    # 5. Date Proximity (max 10 pts)
    # Lost date should ideally be on or before found date, or close within days
    date_score = 0.0
    try:
        d_lost = datetime.strptime(str(lost_item.get('item_date', '')).split('T')[0], '%Y-%m-%d')
        d_found = datetime.strptime(str(found_item.get('item_date', '')).split('T')[0], '%Y-%m-%d')
        delta_days = (d_found - d_lost).days
        # If found after or on the day of loss within 14 days:
        if delta_days >= 0:
            if delta_days <= 14:
                date_score = round(10.0 * (1.0 - (delta_days / 15.0)), 1)
            else:
                date_score = 1.0
        else:
            # Report timing discrepancy (within 3 days tolerated)
            if abs(delta_days) <= 3:
                date_score = 4.0
    except Exception:
        date_score = 3.0

    total_score = min(100, int(round(category_score + name_score + desc_score + loc_score + date_score)))

    return {
        "score": total_score,
        "breakdown": {
            "category": category_score,
            "name": name_score,
            "description": desc_score,
            "location": loc_score,
            "date": date_score
        },
        "is_match": total_score >= 45
    }

def find_potential_matches(items: list[dict], min_threshold: int = 45) -> list[dict]:
    """Finds all candidate matches across all open lost and found items."""
    lost_items = [i for i in items if i.get('type') == 'LOST' and i.get('status') in ('OPEN', 'CLAIM_PENDING')]
    found_items = [i for i in items if i.get('type') == 'FOUND' and i.get('status') in ('OPEN', 'CLAIM_PENDING')]
    
    matches = []
    for l in lost_items:
        for f in found_items:
            res = calculate_match_score(l, f)
            if res['score'] >= min_threshold:
                matches.append({
                    "lost_item": l,
                    "found_item": f,
                    "score": res['score'],
                    "breakdown": res['breakdown']
                })
    
    matches.sort(key=lambda m: m['score'], reverse=True)
    return matches
