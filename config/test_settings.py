"""Isolated test database; never used for the live catalog or screenshots."""
import os
os.environ.setdefault("DJANGO_SECRET_KEY", "isolated-auto-anatomy-test-key")
from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
