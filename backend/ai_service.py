"""Compatibility wrapper: Harbor now runs on the built-in counseling engine.

No external AI provider or API key is used. See ``counselor_engine.py``.
"""
from counselor_engine import generate_post_insight, generate_reply  # noqa: F401
