# -*- coding: utf-8 -*-
import json
import os


def string_to_bool(string_to_convert: str) -> bool:
    return string_to_convert.lower() == "true"


# db settings
APP_FOLDER = os.path.dirname(__file__)
APP_NAME = os.path.split(APP_FOLDER)[-1]

# Database configuration
# DB_FOLDER:    Sets the place where migration files will be created
#               and is the store location for SQLite databases
DB_FOLDER = os.path.join(APP_FOLDER, "databases")
PYDAL_URI = os.getenv("PYDAL_URI")
if PYDAL_URI:
    DB_URI = PYDAL_URI
else:
    MYSQL_USER = os.getenv("MYSQL_USER", default="vidjil")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", default="mysql_vidjil_password")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", default="vidjil")
    DB_URI = f"mysql://{MYSQL_USER}:{MYSQL_PASSWORD}@mysql/{MYSQL_DATABASE}"
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", default="1"))
DB_MIGRATE = string_to_bool(os.getenv("DB_MIGRATE", default="True"))
DB_FAKE_MIGRATE = string_to_bool(os.getenv("DB_MIGRATE", default="False"))  # maybe?
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", default="4"))
DB_BACKUP_FILE = os.getenv("DB_BACKUP_FILE", default="backup.csv")

# location where to store uploaded files:
### Upload directory for .fasta/.fastq.
### Old sequences files could be thrown away.
### No regular backup.
DIR_SEQUENCES = os.getenv("DIR_SEQUENCES", default="/mnt/upload/uploads/")
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", default="/mnt/upload/uploads/")
### Directory to search for files
FILE_SOURCE = os.getenv("FILE_SOURCE", default="")
FILE_TYPES = json.loads(
    os.getenv(
        "FILE_TYPES",
        default='["fasta", "fastq", "fastq.gz", "fa", "tsv", "airr", "AIRR"]',
    )
)

### Upload directory for .vidjil/.fused/.analysis
### Regularly backed-up
DIR_RESULTS = os.getenv("DIR_RESULTS", default="/mnt/result/results/")

### Temporary directory to store vidjil results, and basename of files in this directory
### Formatted with 'data_id' in models/task.py
DIR_OUT_VIDJIL_ID = os.getenv("DIR_OUT_VIDJIL_ID", default="/mnt/result/tmp/out-%06d/")
DIR_PRE_VIDJIL_ID = os.getenv(
    "DIR_PRE_VIDJIL_ID", default="/mnt/result/tmp/pre/out-%06d"
)
BASENAME_OUT_VIDJIL_ID = os.getenv("BASENAME_OUT_VIDJIL_ID", default="%06d")

# Prevent upload and run when 1% space is left in target disk
FS_LOCK_THRESHOLD = int(os.getenv("FS_LOCK_THRESHOLD", default="1"))

### Directory for program used in task.py
### relative path start from server/web2py
DIR_VIDJIL = os.getenv("DIR_VIDJIL", default="/usr/share/vidjil/")
DIR_VIDJIL_NEXT = os.getenv("DIR_VIDJIL_NEXT", default="/usr/share/vidjil/")
DIR_FUSE = os.getenv("DIR_FUSE", default="/usr/share/vidjil/tools/")
DIR_PREPROCESS = os.getenv(
    "DIR_PREPROCESS", default="/usr/share/vidjil/tools/scripts/preprocess/"
)
DIR_MIXCR = os.getenv("DIR_MIXCR", default="/usr/share/mixcr/")
DIR_IGREC = os.getenv("DIR_IGREC", default="/usr/local/bin/")
DIR_GERMLINE = os.getenv("DIR_GERMLINE", default="/usr/share/vidjil/germline")
DIR_GERMLINE_NEXT = os.getenv("DIR_GERMLINE_NEXT", default="/usr/share/vidjil/germline")
DIR_PEAR = os.getenv("DIR_PEAR", default="/usr/share/tools/")
DIR_FLASH2 = os.getenv("DIR_FLASH2", default="/usr/share/tools/")
DIR_CLONEDB = os.getenv("DIR_CLONEDB", default="/usr/share/clonedb/")
DIR_BINARIES = os.getenv("DIR_BINARIES", default="/binaries/")

### Log files
DIR_LOG = os.getenv("DIR_LOG", default="/var/vidjil/")
LOG_INFO = os.getenv("LOG_INFO", default=f"{DIR_LOG}vidjil.log")
LOG_DEBUG = os.getenv("LOG_DEBUG", default=f"{DIR_LOG}vidjil-debug.log")
LOG_LEVEL = os.getenv("LOG_LEVEL", default="INFO")

### Port on which to run the fuse server
### Used in models/task.py and in /server/fuse_server.py
FUSE_SERVER = os.getenv("FUSE_SERVER", default="fuse")
PORT_FUSE_SERVER = int(os.getenv("PORT_FUSE_SERVER", default="12789"))

### Reverse IP file
REVERSE_IP = os.getenv("REVERSE_IP", default="/home/vidjil/ips.txt")

### Locus (should be parsed from germlines.data)
LOCUS = [
    "TRA",
    "TRA+D",
    "TRB",
    "TRG",
    "TRD",
    "TRD+",
    "IGH",
    "IGH+",
    "IGK",
    "IGK+",
    "IGL",
]

### Auth configuration
# send email on registration
VERIFY_EMAIL = string_to_bool(os.getenv("VERIFY_EMAIL", default="False"))
# account requires to be approved ?
REQUIRES_APPROVAL = string_to_bool(os.getenv("REQUIRES_APPROVAL", default="False"))
# Max wrong passwords to prevent brute-force
MAX_WRONG_PASSWORDS = int(os.getenv("MAX_WRONG_PASSWORDS", default="3"))
# 2 factor authentication required ?
TWO_FACTOR_REQUIRED = string_to_bool(os.getenv("TWO_FACTOR_REQUIRED", default="False"))
# login expiration time
LOGIN_EXPIRATION_TIME = int(os.getenv("LOGIN_EXPIRATION_TIME", default="7200"))

# session settings
SESSION_TYPE = "cookies"
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", default="<my secret key>")
MEMCACHE_CLIENTS = ["127.0.0.1:11211"]
REDIS_SERVER = "redis:6379"
# single sign on Google (will be used if provided)
OAUTH2GOOGLE_CLIENT_ID = os.getenv("OAUTH2GOOGLE_CLIENT_ID", default=None)
OAUTH2GOOGLE_CLIENT_SECRET = os.getenv("OAUTH2GOOGLE_CLIENT_SECRET", default=None)
# single sign on Okta (will be used if provided. Please also add your tenant
# name to py4web/utils/auth_plugins/oauth2okta.py. You can replace the XXX
# instances with your tenant name.)
OAUTH2OKTA_CLIENT_ID = os.getenv("OAUTH2OKTA_CLIENT_ID", default=None)
OAUTH2OKTA_CLIENT_SECRET = os.getenv("OAUTH2OKTA_CLIENT_SECRET", default=None)
# single sign on Google (will be used if provided)
OAUTH2FACEBOOK_CLIENT_ID = os.getenv("OAUTH2FACEBOOK_CLIENT_ID", default=None)
OAUTH2FACEBOOK_CLIENT_SECRET = os.getenv("OAUTH2FACEBOOK_CLIENT_SECRET", default=None)
# enable PAM
USE_PAM = string_to_bool(os.getenv("USE_PAM", default="False"))
# enable LDAP
USE_LDAP = string_to_bool(os.getenv("USE_LDAP", default="False"))
# online test server available for test purposes
# account:  euler@ldap.forumsys.com
# password: password
LDAP_SETTINGS = json.loads(
    '{"mode": "ad","server": "my.domain.controller","base_dn": "ou=Users,dc=domain,dc=com"}'
)

# i18n settings
T_FOLDER = os.path.join(APP_FOLDER, "translations")

# Celery settings
USE_CELERY = string_to_bool(os.getenv("USE_CELERY", default="True"))
CELERY_BROKER = os.getenv("CELERY_BROKER", default="redis://redis:6379/0")
# From which size will the work be considered long ? Default is 100M
CELERY_SIZE_LIMIT_FOR_LONG_JOB = int(
    os.getenv("CELERY_SIZE_LIMIT_FOR_LONG_JOB", default="100000000")
)

### Email notifications for server errors
SMTP_SERVER = os.getenv("SMTP_SERVER", default=None)
SMTP_CREDENTIALS = os.getenv(
    "SMTP_CREDENTIALS", default="vidjil:smtp_pass"
)  # set to None if no auth required
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", default="notifications@vidjil.org")
SMTP_DOMAIN = os.getenv("SMTP_DOMAIN", default="vidjil.org")
SMTP_ADMIN_EMAILS = json.loads(
    os.getenv("SMTP_ADMIN_EMAILS", default='["support@vidjil.org"]')
)
SMTP_EMAIL_SUBJECT_START = os.getenv("SMTP_EMAIL_SUBJECT_START", default="[Vidjil]")
SMTP_TLS = string_to_bool(os.getenv("SMTP_TLS", default="true"))
SMTP_SSL = string_to_bool(os.getenv("SMTP_SSL", default="false"))

### Server healthcare compliance
### Please see <http://www.vidjil.org/doc/server#healthcare>
HEALTHCARE_COMPLIANCE = string_to_bool(
    os.getenv("HEALTHCARE_COMPLIANCE", default="false")
)

### Limited accounts
LIMITED_ACCOUNTS = json.loads(os.getenv("LIMITED_ACCOUNTS", default="[]"))

### Limited accounts
PUBLIC_GROUP_NAME = os.getenv("PUBLIC_GROUP_NAME", default="public")

### Tag prefix
TAG_PREFIX = os.getenv("TAG_PREFIX", default="#")


### Personalization
WELCOME_LOGINPAGE_MESSAGE = os.getenv(
    "WELCOME_LOGINPAGE_MESSAGE", default="Welcome to Vidjil server!"
)

SERVER_URL = os.getenv("SERVER_URL", default="app.vidjil.org")
