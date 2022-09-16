
import os

# db settings
APP_FOLDER = os.path.dirname(__file__)
APP_NAME = os.path.split(APP_FOLDER)[-1]
# DB_FOLDER:    Sets the place where migration files will be created
#               and is the store location for SQLite databases
DB_FOLDER = os.path.join(APP_FOLDER, "databases")

DB_URI=os.environ.get('PYDAL_URI')
if (DB_URI is None):
    #DB_URI = "sqlite://storage.db"
    DB_URI = "mysql://vidjil:rootpass@mysql/vidjil"

#DB_URI = "mysql://vidjil_user:password@localhost/vidjil"
DB_POOL_SIZE = 1
DB_MIGRATE = True
DB_FAKE_MIGRATE = False  # maybe?

# location where to store uploaded files:
UPLOAD_FOLDER = os.path.join(APP_FOLDER, "uploads")

# send email on regstration
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
USE_CELERY = True
CELERY_BROKER = "redis://redis:6379/0"

# try import private settings
try:
    from .settings_private import *
except:
    pass
