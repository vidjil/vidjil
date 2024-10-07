# -*- coding: utf-8 -*-
import os

def string_to_bool(string_to_convert: str) -> bool:
    return string_to_convert.lower() == 'true'

# db settings
APP_FOLDER = os.path.dirname(__file__)
APP_NAME = os.path.split(APP_FOLDER)[-1]

# DB_FOLDER:    Sets the place where migration files will be created
#               and is the store location for SQLite databases
DB_FOLDER = os.path.join(APP_FOLDER, "databases")

DB_URI = os.getenv("PYDAL_URI", default="mysql://vidjil:rootpass@mysql/vidjil")
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", default="1"))
DB_MIGRATE = string_to_bool(os.getenv("DB_MIGRATE", default="True"))
DB_FAKE_MIGRATE = string_to_bool(os.getenv("DB_MIGRATE", default="False"))  # maybe?

# location where to store uploaded files:
### Upload directory for .fasta/.fastq.
### Old sequences files could be thrown away.
### No regular backup.
DIR_SEQUENCES = os.getenv("DIR_SEQUENCES", default="/mnt/upload/uploads/")
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", default="/mnt/upload/uploads/")

# send email on registration
VERIFY_EMAIL = False

# account requires to be approved ?
REQUIRES_APPROVAL = False

# session settings
SESSION_TYPE = "cookies"
SESSION_SECRET_KEY = "<my secret key>"
MEMCACHE_CLIENTS = ["127.0.0.1:11211"]
REDIS_SERVER = "redis:6379"

# logger settings
LOGGERS = [
    "warning:stdout"
]  # syntax "severity:filename" filename can be stderr or stdout

# single sign on Google (will be used if provided)
OAUTH2GOOGLE_CLIENT_ID = None
OAUTH2GOOGLE_CLIENT_SECRET = None

# single sign on Okta (will be used if provided. Please also add your tenant
# name to py4web/utils/auth_plugins/oauth2okta.py. You can replace the XXX
# instances with your tenant name.)
OAUTH2OKTA_CLIENT_ID = None
OAUTH2OKTA_CLIENT_SECRET = None

# single sign on Google (will be used if provided)
OAUTH2FACEBOOK_CLIENT_ID = None
OAUTH2FACEBOOK_CLIENT_SECRET = None

# enable PAM
USE_PAM = False

# enable LDAP
USE_LDAP = False
LDAP_SETTINGS = {
    "mode": "ad",
    "server": "my.domain.controller",
    "base_dn": "ou=Users,dc=domain,dc=com",
}

# i18n settings
T_FOLDER = os.path.join(APP_FOLDER, "translations")

# Celery settings
USE_CELERY = string_to_bool(os.getenv("USE_CELERY", default="True"))
CELERY_BROKER = os.getenv("CELERY_BROKER", default="redis://redis:6379/0")
# From which size will the work be considered long ? Default is 100M
CELERY_SIZE_LIMIT_SHORT_LONG = int(os.getenv("CELERY_SIZE_LIMIT_SHORT_LONG", default="100000000"))
