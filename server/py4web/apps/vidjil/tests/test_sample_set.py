import os
import unittest
from boddle import boddle
from py4web.core import Session, DAL, request, response, HTTP, Field, bottle, _before_request
from py4web.utils.auth import Auth, AuthAPI
from ..VidjilAuth import VidjilAuth
from ..models import *
from ..controllers.patient import *


class Sample_setController(unittest.TestCase):
        
    def setUp(self):
        os.environ["PY4WEB_APPS_FOLDER"] = "apps"
        _before_request()  # mimic before_request bottle-hook
        self.db = DAL("sqlite:memory")
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        self.auth = Auth(
            self.session, self.db, define_tables=True, password_complexity=None
        )
        self.auth.action = self.action
        request.app_name = "vidjil"

        
    def tearDown(self):
        bottle.app.router.remove("/*")

    def action(self, name, method, query, data):
        request.environ["REQUEST_METHOD"] = method
        request.environ["ombott.request.query"] = query
        request.environ["ombott.request.json"] = data

        return getattr(AuthAPI, name[4:])(self.auth)


    def on_request(self, context={}, keep_session=False):
        storage = self.session._safe_local

        # mimic before_request bottle-hook
        _before_request()

        # mimic action.uses()
        self.session.initialize()
        self.auth.flash.on_request(context)
        self.auth.on_request(context)
        if keep_session:
            self.session._safe_local = storage

    def testWoot(self):
        with boddle(params={'name':'plop'}):
            self.assertEqual(pop(), {'id':'1'})



if __name__ == "__main__":
    unittest.main()