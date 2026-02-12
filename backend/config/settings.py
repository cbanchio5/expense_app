import os
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _csv_env(name: str, default: str) -> list[str]:
    return [value.strip() for value in os.getenv(name, default).split(",") if value.strip()]


def _normalize_host(value: str) -> str:
    raw = value.strip()
    if not raw:
        return ""
    if "://" in raw:
        parsed = urlparse(raw)
        raw = parsed.netloc or parsed.path
    raw = raw.split("/")[0]
    return raw


def _normalize_origin(value: str) -> str:
    raw = value.strip()
    if not raw:
        return ""
    return raw.rstrip("/")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [_normalize_host(value) for value in _csv_env("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost") if _normalize_host(value)]

INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "receipts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "splithappens"),
            "USER": os.getenv("POSTGRES_USER", "splithappens"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "splithappens"),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    _normalize_origin(value)
    for value in _csv_env("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    if _normalize_origin(value)
]
CORS_ALLOWED_ORIGIN_REGEXES = _csv_env("CORS_ALLOWED_ORIGIN_REGEXES", "")
CSRF_TRUSTED_ORIGINS = [
    _normalize_origin(value)
    for value in _csv_env("CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    if _normalize_origin(value)
]
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax" if DEBUG else "None")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax" if DEBUG else "None")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
}
