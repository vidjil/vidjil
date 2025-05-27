"""
This file defines cache, session, and translator T object for the app
These are fixtures that every app needs so probably you will not be editing this file
"""

import email
import logging
import os
import sys
from typing import List

from py4web import DAL, Cache, Flash, Session, Translator, action
from py4web.core import (
    HTTP,
    URL,
    ErrorLogger,
    Field,
    Fixture,
    error_logger,
    request,
    response,
)
from py4web.utils.downloader import downloader
from py4web.utils.factories import ActionFactory
from py4web.utils.mailer import Mailer
from pydal.tools.tags import Tags

from . import settings
from .modules import single_task_loader
from .VidjilAuth import VidjilAuth


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
        if "HTTP_ORIGIN" in request.environ:
            response.headers["Access-Control-Allow-Origin"] = request.environ[
                "HTTP_ORIGIN"
            ]
        response.headers["Access-Control-Max-Age"] = self.age
        response.headers["Access-Control-Allow-Headers"] = self.headers
        response.headers["Access-Control-Allow-Methods"] = self.methods
        response.headers["Access-Control-Allow-Credentials"] = "true"
        if request.method == "OPTIONS":
            raise HTTP(200)


# set the origin to where ever your frontend server is running,
# use host and port rather than "localhost" as the browser session
# cookies may not be set otherwise preventing auth usage.
# headers="Content-Type" is required to prevent a different CORs browser issue.
cors = CORS(origin="https://localhost:8000/vidjil", headers="Content-Type")

# #######################################################
# create required folders
# #######################################################

for folder in [settings.DB_FOLDER, settings.T_FOLDER, settings.UPLOAD_FOLDER]:
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
    session = Session(secret=settings.SESSION_SECRET_KEY)
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
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn)
elif settings.SESSION_TYPE == "memcache":
    import memcache  # type: ignore

    conn = memcache.Client(settings.MEMCACHE_CLIENTS, debug=0)
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn)
elif settings.SESSION_TYPE == "database":
    from py4web.utils.dbstore import DBStore

    session = Session(secret=settings.SESSION_SECRET_KEY, storage=DBStore(db))


# #######################################################
# Define custom log
# #######################################################
logging.ADMIN = logging.INFO + 1
logging.addLevelName(logging.ADMIN, "ADMIN")


class MsgUserAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        if type(msg) is dict:
            if "message" in msg:
                msg = msg["message"]
            else:
                msg = "?"

        ip = request.remote_addr
        if ip:
            for ip_prefix in ips:
                if ip.startswith(ip_prefix):
                    ip = "%s/%s" % (ip, ips[ip_prefix])
        else:
            ip = "N/A"

        user_id = "N/A"
        try:
            # Set level of default logger to ERROR to prevent messages from py4web
            previous_level = logging.getLogger().getEffectiveLevel()
            logging.getLogger().setLevel(logging.ERROR)
            user_id = (str(auth.user_id)) if auth.user else "N/A"
            logging.getLogger().setLevel(previous_level)
            user_id = user_id.replace(" ", "-")
            if auth.is_impersonating():
                user_id = "team!" + user_id
        except Exception:
            # Ignore exception, this may occur when logging from worker or client
            pass

        new_msg = "%30s %12s %s" % (ip, ("<%s>" % user_id), msg)
        return new_msg, kwargs

    def admin(self, msg, extra=None):
        self.log(logging.ADMIN, msg, extra=extra)


#
class UserLogHandler(logging.Handler):
    def __init__(self):
        logging.Handler.__init__(self)
        self.table = "user_log"

    def emit(self, record):
        """
        When 'user_id' and 'record_id' are defined,
        further store the record in the db.
        """
        if hasattr(record, "user_id") and hasattr(record, "record_id"):
            from datetime import datetime

            now = datetime.now()
            db[self.table].insert(
                user_id=record.user_id,
                table_name=record.table_name,
                created=now,
                msg=record.message,
                record_id=record.record_id,
            )
            db.commit()


def _init_log() -> logging.LoggerAdapter:
    """
    adapted from http://article.gmane.org/gmane.comp.python.web2py/11091
    """

    def create_handler(filename: str, level: int) -> logging.Handler:
        try:
            handler = logging.FileHandler(filename)
        except Exception as exception:
            print(f"Error when trying to create logger to {filename}: {exception=}")
            handler = logging.StreamHandler(sys.stderr)
        finally:
            handler.setLevel(level)
            handler.setFormatter(formatter)
        return handler

    def create_stdout_handler() -> logging.Handler:
        try:
            handler = logging.StreamHandler(sys.stdout)
        except Exception as exception:
            print(f"Error when trying to create logger to stdout: {exception=}")
            handler = logging.StreamHandler(sys.stderr)
        finally:
            log_level = logging.INFO
            if settings.LOG_LEVEL in logging.getLevelNamesMapping():
                log_level = logging.getLevelNamesMapping()[settings.LOG_LEVEL]
            handler.setLevel(log_level)
            handler.setFormatter(formatter)
        return handler

    logger = logging.getLogger("vidjil")
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "[%(process)d] %(asctime)s %(levelname)8s - %(filename)s:%(lineno)d\t%(message)s"
        )

        logger.addHandler(create_handler(settings.LOG_DEBUG, logging.DEBUG))
        logger.addHandler(create_handler(settings.LOG_INFO, logging.INFO))
        logger.addHandler(create_stdout_handler())
        logger.addHandler(UserLogHandler())
    return MsgUserAdapter(logger, {})


log = _init_log()


# #######################################################
# Instantiate the object and actions that handle auth
# #######################################################
def two_factor_required(user, request):
    if settings.TWO_FACTOR_REQUIRED:
        if settings.TWO_FACTOR_EMAIL_LIST:
            # 2 factor authentication not required for specific users
            if user.email not in settings.TWO_FACTOR_EMAIL_LIST:
                return True
            else:
                return False
        else:
            return True
    else:
        if settings.TWO_FACTOR_EMAIL_LIST:
            # required 2 factor authentication only for specific users
            if user.email in settings.TWO_FACTOR_EMAIL_LIST:
                return True
            else:
                return False
        else:
            return False


def send_two_factor_email(user, code):
    send_mail(
        to=[user.email],
        subject=f"{settings.SMTP_EMAIL_SUBJECT_START} Two factor login verification code",
        body=f"Your verification code is {code}",
    )
    return code


auth = VidjilAuth(log, session, db, define_tables=False)
auth.use_username = False
auth.param.registration_requires_confirmation = settings.VERIFY_EMAIL
auth.param.registration_requires_approval = settings.REQUIRES_APPROVAL
auth.param.two_factor_required = two_factor_required
auth.param.two_factor_send = send_two_factor_email
auth.param.allowed_actions = ["all"]
auth.param.login_expiration_time = settings.LOGIN_EXPIRATION_TIME
auth.param.password_complexity = {"entropy": 50}
auth.param.block_previous_password_num = 3
auth.__prerequisites__.insert(0, cors)
auth.extra_auth_user_fields.append(
    Field(
        "number_wrong_passwords",
        "integer",
    )
)
auth.define_tables()

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

    @action("download/<filename>")
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
        "apps.%s.tasks" % settings.APP_NAME,
        broker=settings.CELERY_BROKER,
        backend="redis://redis",
        loader=single_task_loader.SingleTaskLoader,
    )

    scheduler.conf.update(
        broker_connection_retry_on_startup=True, worker_send_task_event=False
    )

# #######################################################
# Enable authentication
# #######################################################
# auth.enable(uses=(cors,session, T, db, flash), env=dict(T=T))

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
    for line in open(settings.REVERSE_IP):
        ip, kw = line.split()
        ips[ip] = kw
except Exception:
    pass

# #######################################################
# Configure mail
# #######################################################
mail = None
if settings.SMTP_SERVER is not None:
    mail = Mailer(
        server=settings.SMTP_SERVER,
        sender=settings.SMTP_FROM_EMAIL,
        login=settings.SMTP_CREDENTIALS,
        tls=settings.SMTP_TLS,
        ssl=settings.SMTP_SSL,
    )

    # #######################################################
    # Configure email sender for auth
    # #######################################################
    auth.sender = mail

    # #######################################################
    # Mail on error
    # #######################################################
    class MyErrorLogger:
        def __init__(self, error_logger: ErrorLogger):
            self._error_logger = error_logger

        def log(self, app_name: str, error_snapshot):
            base_logger = (
                self._error_logger.database_logger or self._error_logger.fallback_logger
            )
            uuid = base_logger.log(app_name, error_snapshot)
            ticket_url = (
                f"{URL('_dashboard/ticket', uuid, scheme=True, use_appname=False)}"
            )
            _, _, domain = ticket_url.split("/", 3)[:3]

            send_mail(
                to=settings.SMTP_ADMIN_EMAILS,
                subject=f"{settings.SMTP_EMAIL_SUBJECT_START} Server {domain} error",
                body=(
                    f"""Path: {request.path}
                    Error: {error_snapshot["exception_value"]}
                    User: {f"({str(auth.user_id)}) {db.auth_user[auth.user_id].first_name} {db.auth_user[auth.user_id].last_name}" if auth.user_id else "N/A"}
                    Client IP: {request.environ.get("REMOTE_ADDR")}
                    Ticket: {ticket_url}""",
                    f"""<html>
                        Path: {request.path}<br>
                        Error: {error_snapshot["exception_value"]}<br>
                        User: {f"({str(auth.user_id)}) {db.auth_user[auth.user_id].first_name} {db.auth_user[auth.user_id].last_name}" if auth.user_id else "N/A"}<br>
                        Client IP: {request.environ.get("REMOTE_ADDR")}<br>
                        Ticket: <a href="{ticket_url}">{uuid}</a>
                    </html>""",
                ),
            )

    error_logger.plugins[settings.APP_NAME] = MyErrorLogger(error_logger)


def send_mail(to: str | List[str], subject: str, body: str) -> bool:
    try:
        if mail is not None:
            mail.send(
                to=to,
                subject=subject,
                body=body,
                headers={
                    "Message-ID": email.utils.make_msgid(domain=settings.SMTP_DOMAIN)
                },
            )
        else:
            log.info(f"Mail not defined, mail not sent - {to=} / {subject=} / {body=}")
            return False
    except Exception as exception:
        log.error(f"Error when sending mail: {exception=}")
        return False

    return True


auth.send_mail = send_mail


# #######################################################
# try to create an index on these un-indexed columns
# #######################################################
def try_create_index(index_sql: str):
    try:
        db.executesql(index_sql)
    except Exception:
        # If problem occurs, assume it is already created
        pass


try_create_index("CREATE INDEX table_name_index ON tag_ref (table_name);")
try_create_index("CREATE INDEX record_id_index ON tag_ref (record_id);")
try_create_index("CREATE INDEX name_index ON auth_permission (name);")
try_create_index("CREATE INDEX record_id_index ON auth_permission (record_id);")
try_create_index("CREATE INDEX scheduler_task_status_index ON scheduler_task (status);")
