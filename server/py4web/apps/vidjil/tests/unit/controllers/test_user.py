#!/usr/bin/python
import os
import unittest
from py4web import request, action
from py4web.core import _before_request, Session, HTTP
from pydal.validators import CRYPT
from ....common import db, auth, session
from ....controllers import user as user_controller
from ....controllers import auth as auth_controller
from ...functional.db_initialiser import DBInitialiser

import logging

LOGGER = logging.getLogger(__name__)
ADMIN_EMAIL = "plop@plop.com"
ADMIN_PASSWORD = "foobartest"

# GNU LESSER GENERAL PUBLIC LICENSE

import io
import json as lib_json
from base64 import b64encode
  

try:
  from urlparse import urlparse
  from urllib import urlencode
except ImportError:
  from urllib.parse import urlparse, urlencode


__version__ = '0.2.9'


class Omboddle(object):

  def __init__(self, params={}, path=None, method=None, headers=None, json=None, url=None, body=None, query={}, auth=None, **extras):

    environ = {}
    self.extras = extras
    self.extra_orig = {}
    self.orig_app_reader = "vidjil"

    if auth is not None:
      user, password = auth
      environ["HTTP_AUTHORIZATION"] = "Basic {}".format(b64encode(bytes(f"{user}:{password}", "utf-8")).decode("ascii"))
    
    if params is not None:
      self._set_payload(environ, urlencode(params).encode('utf8'))
      
    if path is not None:
      environ['PATH_INFO'] = path.lstrip('/')
      
    if method is not None:
      environ['REQUEST_METHOD'] = method
      
    for k, v in (headers or {}).items():
      k = k.replace('-', '_').upper()
      environ['HTTP_'+k] = v

    if json is not None:
      environ['CONTENT_TYPE'] = 'application/json'
      self._set_payload(environ, lib_json.dumps(json).encode('utf8'))

    if body is not None:
      if body.lower:
        body = io.BytesIO(bytes(body.encode('utf-8')))
      environ['CONTENT_LENGTH'] = str(len(body.read()))
      body.seek(0)
      environ['wsgi.input'] = body

    if url is not None:
      o = urlparse(url)
      environ['wsgi.url_scheme'] = o.scheme
      environ['HTTP_HOST'] = o.netloc
      environ['PATH_INFO'] = o.path.lstrip('/')

    if query is not None:
      environ['QUERY_STRING'] = urlencode(query)

    self.environ = environ
    
  def _set_payload(self, environ, payload):
    payload = bytes(payload)
    environ['CONTENT_LENGTH'] = str(len(payload))
    environ['wsgi.input'] = io.BytesIO(payload)

  def __enter__(self):
    self.orig = request.environ
    request.environ = self.environ
    for k,v in self.extras.items():
      if hasattr(request, k):
        self.extra_orig[k] = getattr(request, k)
      setattr(request, k, v)
    setattr(request, 'app', True)
    setattr(request, 'app_name', "vidjil")

  def __exit__(self,a,b,c):
    request.environ = self.orig
    for k,v in self.extras.items():
      if k in self.extra_orig:
        setattr(request, k, self.extra_orig[k])
      else:
        try:
          delattr(request, k)
        except AttributeError:
          pass
    setattr(request, 'app', self.orig_app_reader)





class TestUserController(unittest.TestCase):
    
    

    # @action("/vidjil/set_up")
    @action.uses(db)
    def setUp(self):
        # os.environ["PY4WEB_APPS_FOLDER"] = "apps"
        # _before_request()  # mimic before_request bottle-hook
        # self.db = DAL("sqlite:memory")
        # self.session = Session(secret="a", expiration=10)
        # self.session.initialize()
        # self.auth = common._init_auth(LOGGER, self.session, self.db)
        # self.auth.enable()
        # self.auth.action = self.action
        # user.action = self.action
        # models.init_db(self.db)
        
        # LOGGER.info("set_up_test_db")
        LOGGER.info(f"os.path.normpath(__file__) {os.path.normpath(__file__)}")
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(os.path.normpath(__file__).split(os.path.sep)[:-5])
        LOGGER.info(f"os.environ['PY4WEB_APPS_FOLDER'] {os.environ['PY4WEB_APPS_FOLDER']}")
        _before_request()
        # # LOGGER.info(f"first db {db}")
        # request.app_name = "vidjil"
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session
        # LOGGER.info(f"after db {db}")
        
        # auth.session = self.session
        # user_controller.log = LOGGER
        # user_controller.db = db
        # self.db = db
        
        # LOGGER.info(f"db = {db}")
        LOGGER.info(f"db {db(db.auth_user).count()}")   
        
        initialiser = DBInitialiser(db)
        initialiser.run()
        
        
        
        LOGGER.info(f"db {db(db.auth_user).count()}")
        LOGGER.info(f"db user {db(db.auth_user).select()[0]}")
        
        
        # # rewrite info / error functions 
        # # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        # def f(a, **kwargs):
        #     pass
        # common.log.info = f
        # common.log.error = f
        # common.log.debug = f
        
    
    # def action(self, name, method, query, data):
    #     request.environ["REQUEST_METHOD"] = method
    #     request.environ["ombott.request.query"] = query
    #     request.environ["ombott.request.json"] = data
    #     # we break a symmetry below. should fix in auth.py
    #     return getattr(self.user.form_source, name)()
        

    # def on_request(self, context={}, keep_session=False):
    #     storage = self.session._safe_local

    #     # mimic before_request bottle-hook
    #     _before_request()

    #     # mimic action.uses()
    #     self.session.initialize()
    #     user.flash.on_request(context)
    #     if keep_session:
    #         self.session._safe_local = storage
        
        
    # def test_index_not_logged(self):
    #     with self.assertRaises(HTTP) as context :
    #         user_controller.index()
        
    #     exception = context.exception
    #     LOGGER.info(f"exception.status {exception.status}, exception.body {exception.body}, exception.headers {exception.headers}")
    
    
    def on_request(self, context={}, keep_session=False):
        storage = self.session._safe_local

        # mimic before_request bottle-hook
        _before_request()

        # mimic action.uses()
        self.session.initialize()
        auth.flash.on_request(context)
        auth.on_request(context)
        if keep_session:
            self.session._safe_local = storage
        
    @action.uses(db)    
    def test_index(self):
        ## Log as admin
        self.on_request(keep_session=True)
        with Omboddle(params={"login":ADMIN_EMAIL, "password":ADMIN_PASSWORD}):
            LOGGER.info(f"os.path.join(os.environ['PY4WEB_APPS_FOLDER'], request.app_name) {os.path.join(os.environ['PY4WEB_APPS_FOLDER'], request.app_name)}")
            LOGGER.info(f"request.params['login'] {request.params['login']}, request.params['password'] {request.params['password']}")
            LOGGER.info(f"request.app_name {request.app_name}")
            auth_controller.submit()
        
        # self.on_request()
        # request.query["login"] = ADMIN_EMAIL
        # request.query["password"] = ADMIN_PASSWORD
        # LOGGER.info(f"CRYPT()({ADMIN_PASSWORD})[0] {CRYPT()(ADMIN_PASSWORD)[0]}")
        # LOGGER.info(f"db.auth_user.password.validate(ADMIN_PASSWORD)[0] {db.auth_user.password.validate(ADMIN_PASSWORD)[0]}")
        
        # logged_user, error = user_controller.auth.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        # LOGGER.info(f"logged_user {logged_user}")
        # self.assertIsNotNone(logged_user, error)
        # user_controller.auth.session["user"] = {"id": logged_user.get("id")}
        
        # self.on_request()
        self.on_request(keep_session=True)
        with Omboddle():
            LOGGER.info(f"request.app_name {request.app_name}")
            LOGGER.info(f"os.path.join(os.environ['PY4WEB_APPS_FOLDER'], request.app_name) {os.path.join(os.environ['PY4WEB_APPS_FOLDER'], request.app_name)}")
            LOGGER.info(f"os.path.abspath('apps/vidjil/templates/user/index.html') {os.path.abspath('apps/vidjil/templates/user/index.html')}")
            LOGGER.info(f"os.path.exists('apps/vidjil/templates/user/index.html') {os.path.exists('apps/vidjil/templates/user/index.html')}")
            LOGGER.info(f"os.path.exists(os.path.abspath('apps/vidjil/templates/user/index.html')) {os.path.exists(os.path.abspath('apps/vidjil/templates/user/index.html'))}")
            LOGGER.info(f"os.getcwd() {os.getcwd()}")
            user_list_to_display = user_controller.index()
        assert user_list_to_display is not None
        LOGGER.info(f"user_list_to_display['query'] {user_list_to_display}")
        