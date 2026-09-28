"""Opt-in isolated copy of the actual catalog for browser admin QA.

Requires an explicit temporary database path. Never use this for production.
"""
from .settings import *  # noqa: F403
import os

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": os.environ["AUTO_ANATOMY_QA_DATABASE"]}}
CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:4174", "http://localhost:4174"]
