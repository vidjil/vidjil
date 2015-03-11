#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.tools import Auth
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class UserController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/user.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = Auth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        # for defs
        current.db = db
        current.auth = auth
        
        
    def testIndex(self):
        resp = index()
        self.assertTrue(resp.has_key('query'), "index() has returned an incomplete response")
        
        
    def testInfo(self):
        request.vars["id"] = user_id
        
        resp = info()
        self.assertTrue(resp.has_key('message'), "info() has returned an incomplete response")
        
        
    def testRights(self):
        request.vars["id"] = user_id            #user_id
        request.vars["name"] = "patient"        #table name on which the right will aply
        request.vars["right"] = "plouf"         #right name
        
        request.vars["value"] = "true"          #add right
        resp = rights()
        self.assertNotEqual(resp.find("add 'plouf' permission on 'patient' for user Testers Inc"), -1, "add permission failled")
        
        request.vars["value"] = "false"         #remove right
        resp = rights()
        self.assertNotEqual(resp.find("remove 'plouf' permission on 'patient' for user Testers Inc"), -1, "remove permission failled")
        