"""
This file defines cache, session, and translator T object for the app
These are fixtures that every app needs so probably you will not be editing this file
"""
import os
import sys
import logging
from . import defs
from py4web import Session, Cache, Translator, Flash, DAL, Field, action
from py4web.utils.mailer import Mailer
from py4web.utils.auth import Auth
from py4web.utils.downloader import downloader
from pydal.tools.tags import Tags
from py4web.utils.factories import ActionFactory
from . import settings
from .VidjilAuth import VidjilAuth

from py4web.core import HTTP, Fixture, request, response


class CORS(Fixture):
    """
    Fixture helper for sharing web service avoiding cross origin resource sharing problems
    """

    def __init__(self, age=86400, origin="*", headers="*", methods="*"):
        Fixture.__init__(self)

        self.age = age
        self.origin = origin
        self.headers = headers
        self.methods = methods

    def on_request(self, context):
        response.headers["Access-Control-Allow-Origin"] = self.origin
        if 'HTTP_ORIGIN' in request.environ :
            response.headers["Access-Control-Allow-Origin"] = request.environ['HTTP_ORIGIN']
        response.headers["Access-Control-Max-Age"] = self.age
        response.headers["Access-Control-Allow-Headers"] = self.headers
        response.headers["Access-Control-Allow-Methods"] = self.methods
        response.headers["Access-Control-Allow-Credentials"] = "true"
        if request.method == "OPTIONS":
            raise HTTP(200)

    def on_success(self, status=200):
        response.set_cookie('auth_test_session', 'bar', samesite='Lax', secure=True);

# set the origin to where ever your frontend server is running,
# use host and port rather than "localhost" as the browser session
# cookies may not be set otherwise preventing auth usage.
# headers="Content-Type" is required to prevent a different CORs browser issue.
cors = CORS(origin='https://localhost:8000/vidjil', headers="Content-Type") 


# #######################################################
# implement custom loggers form settings.LOGGERS
# #######################################################
logger = logging.getLogger("py4web:" + settings.APP_NAME)
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s"
)
for item in settings.LOGGERS:
    level, filename = item.split(":", 1)
    if filename in ("stdout", "stderr"):
        handler = logging.StreamHandler(getattr(sys, filename))
    else:
        handler = logging.FileHandler(filename)
    handler.setFormatter(formatter)
    logger.setLevel(getattr(logging, level.upper(), "DEBUG"))
    logger.addHandler(handler)

# #######################################################
# create required folders
# #######################################################

for folder in [settings.DB_FOLDER,
               settings.T_FOLDER,
               settings.UPLOAD_FOLDER]:
    if not os.path.exists(folder):
        os.mkdir(folder)

# #######################################################
# connect to db
# #######################################################
db = DAL(
    settings.DB_URI,
    folder=settings.DB_FOLDER,
    pool_size=settings.DB_POOL_SIZE,
    migrate=settings.DB_MIGRATE,
    fake_migrate=settings.DB_FAKE_MIGRATE,
)

# #######################################################
# define global objects that may or may not be used by the actions
# #######################################################
cache = Cache(size=1000)
T = Translator(settings.T_FOLDER)
flash = Flash()

# #######################################################
# pick the session type that suits you best
# #######################################################
if settings.SESSION_TYPE == "cookies":
    session = Session(secret=settings.SESSION_SECRET_KEY, same_site="None")
elif settings.SESSION_TYPE == "redis":
    import redis

    host, port = settings.REDIS_SERVER.split(":")
    # for more options: https://github.com/andymccurdy/redis-py/blob/master/redis/client.py
    conn = redis.Redis(host=host, port=int(port))
    conn.set = (
        lambda k, v, e, cs=conn.set, ct=conn.ttl: cs(k, v, ct(k))
        if ct(k) >= 0
        else cs(k, v, e)
    )
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn, same_site="None")
elif settings.SESSION_TYPE == "memcache":
    import memcache, time

    conn = memcache.Client(settings.MEMCACHE_CLIENTS, debug=0)
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn, same_site="None")
elif settings.SESSION_TYPE == "database":
    from py4web.utils.dbstore import DBStore

    session = Session(secret=settings.SESSION_SECRET_KEY, storage=DBStore(db), same_site="None")

# #######################################################
# Instantiate the object and actions that handle auth
# #######################################################
auth = VidjilAuth(session, db, define_tables=False)
auth.use_username = True
auth.param.registration_requires_confirmation = settings.VERIFY_EMAIL
auth.param.registration_requires_approval = settings.REQUIRES_APPROVAL
auth.allowed_actions = ["all"]
auth.login_expiration_time = 3600
auth.password_complexity = {"entropy": 50}
auth.block_previous_password_num = 3
auth.__prerequisites__.insert(0, cors) 
auth.define_tables()

# #######################################################
# Configure email sender for auth
# #######################################################
if defs.SMTP_SERVER:
    auth.sender = Mailer(
        server=defs.SMTP_SERVER,
        sender=defs.FROM_EMAIL,
        login=defs.SMTP_CREDENTIALS,
        #tls=defs.SMTP_TLS,
        #ssl=defs.SMTP_SSL,
    )

# #######################################################
# Create a table to tag users as group members
# #######################################################
if auth.db:
    groups = Tags(db.auth_user, "groups")

# #######################################################
# Enable optional auth plugin
# #######################################################
if settings.USE_PAM:
    from py4web.utils.auth_plugins.pam_plugin import PamPlugin

    auth.register_plugin(PamPlugin())

if settings.USE_LDAP:
    from py4web.utils.auth_plugins.ldap_plugin import LDAPPlugin

    auth.register_plugin(LDAPPlugin(db=db, groups=groups, **settings.LDAP_SETTINGS))

if settings.OAUTH2GOOGLE_CLIENT_ID:
    from py4web.utils.auth_plugins.oauth2google import OAuth2Google  # TESTED

    auth.register_plugin(
        OAuth2Google(
            client_id=settings.OAUTH2GOOGLE_CLIENT_ID,
            client_secret=settings.OAUTH2GOOGLE_CLIENT_SECRET,
            callback_url="auth/plugin/oauth2google/callback",
        )
    )
if settings.OAUTH2FACEBOOK_CLIENT_ID:
    from py4web.utils.auth_plugins.oauth2facebook import OAuth2Facebook  # UNTESTED

    auth.register_plugin(
        OAuth2Facebook(
            client_id=settings.OAUTH2FACEBOOK_CLIENT_ID,
            client_secret=settings.OAUTH2FACEBOOK_CLIENT_SECRET,
            callback_url="auth/plugin/oauth2facebook/callback",
        )
    )

if settings.OAUTH2OKTA_CLIENT_ID:
    from py4web.utils.auth_plugins.oauth2okta import OAuth2Okta  # TESTED

    auth.register_plugin(
        OAuth2Okta(
            client_id=settings.OAUTH2OKTA_CLIENT_ID,
            client_secret=settings.OAUTH2OKTA_CLIENT_SECRET,
            callback_url="auth/plugin/oauth2okta/callback",
        )
    )

# #######################################################
# Define a convenience action to allow users to download
# files uploaded and reference by Field(type='upload')
# #######################################################
if settings.UPLOAD_FOLDER:
    @action('download/<filename>')                                                   
    @action.uses(db)                                                                                           
    def download(filename):
        return downloader(db, settings.UPLOAD_FOLDER, filename) 
    # To take advantage of this in Form(s)
    # for every field of type upload you MUST specify:
    #
    # field.upload_path = settings.UPLOAD_FOLDER
    # field.download_url = lambda filename: URL('download/%s' % filename)

# #######################################################
# Optionally configure celery
# #######################################################
if settings.USE_CELERY:
    from celery import Celery

    # to use "from .common import scheduler" and then use it according
    # to celery docs
    scheduler = Celery(
        "apps.%s.tasks" % settings.APP_NAME, broker=settings.CELERY_BROKER,
        backend='redis://localhost'
    )


# #######################################################
# Enable authentication
# #######################################################
auth.enable(uses=(cors,session, T, db, flash), env=dict(T=T))

# #######################################################
# Define convenience decorators
# #######################################################
unauthenticated = ActionFactory(cors, db, session, T, flash, auth)
authenticated = ActionFactory(cors, db, session, T, flash, auth.user)



# #######################################################
# Reverse IP
# #######################################################
ips = {}

try:
    for l in open(defs.REVERSE_IP):
        ip, kw = l.split()
        ips[ip] = kw
except:
    pass


# #######################################################
# Define custom log
# #######################################################
logging.ADMIN = logging.INFO + 1
logging.addLevelName(logging.ADMIN, 'ADMIN')

class MsgUserAdapter(logging.LoggerAdapter):

    def process(self, msg, kwargs):
        if type(msg) is dict:
            if 'message' in msg:
                msg = msg['message']
            else:
                msg = '?'
        ip = request.remote_addr
        if ip:
            for ip_prefix in ips:
                if ip.startswith(ip_prefix):
                    ip = "%s/%s" % (ip, ips[ip_prefix])

        usern = (str(auth.user_id)) if auth.user else ''
        usern = usern.replace(' ','-')
        if auth.is_impersonating():
            usern = 'team!' + usern
        new_msg =  u'%30s %12s %s' % (ip, (u'<%s>' % usern), msg)
        return new_msg, kwargs
    
    def admin(self, msg, extra=None):
        self.log(logging.ADMIN, msg, extra=extra)
#
class UserLogHandler(logging.Handler):

    def __init__(self):
        logging.Handler.__init__(self)
        self.table = 'user_log'

    def emit(self, record):
        '''
        When 'user_id' and 'record_id' are defined,
        further store the record in the db.
        '''
        if hasattr(record, 'user_id') and hasattr(record, 'record_id'):
            from datetime import datetime
            now = datetime.now()
            db[self.table].insert(
                user_id=record.user_id,
                table_name=record.table_name,
                created=now,
                msg=record.message,
                record_id=record.record_id
            )
            db.commit()

def _init_log():
    """
    adapted from http://article.gmane.org/gmane.comp.python.web2py/11091
    """

    import logging
    import sys

    def create_handler(filename, level):
        try:
            handler = logging.FileHandler(filename)
        except:
            handler = logging.StreamHandler(sys.stderr)
        else:
            handler.setLevel(level)
            handler.setFormatter(formatter)
        return handler

    logger = logging.getLogger('vidjil') # (request.application)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter('[%(process)d] %(asctime)s %(levelname)8s - %(filename)s:%(lineno)d\t%(message)s')

        logger.addHandler(create_handler(defs.LOG_DEBUG, logging.DEBUG))
        logger.addHandler(create_handler(defs.LOG_INFO, logging.INFO))
        logger.addHandler(UserLogHandler())

        logger.debug("Creating logger")
    return MsgUserAdapter(logger, {})

log = _init_log()

# #######################################################
# Configure mail
# #######################################################
mail = Mailer(
        server=defs.SMTP_SERVER,
        sender=defs.FROM_EMAIL,
        login=defs.SMTP_CREDENTIALS
        #tls=defs.SMTP_TLS,
        #ssl=defs.SMTP_SSL
    )