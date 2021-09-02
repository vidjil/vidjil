#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class My_accountController(unittest.TestCase):

    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)

    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/my_account.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = VidjilAuth(globals(), db)
        auth.login_bare("test@vidjil.org", "123456")
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a, **kwargs):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        # for defs
        current.db = db
        current.auth = auth

    def testIndex(self):
        resp = index()
        self.assertTrue(resp.has_key('result'), "index() has returned an incomplete response")

    def testJobs(self):
        resp = jobs()
        self.assertTrue(resp.has_key('result'), "jobs() has returned an incomplete response")
