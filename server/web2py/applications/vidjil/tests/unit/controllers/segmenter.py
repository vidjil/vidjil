#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class SegmenterController(unittest.TestCase):

    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)

    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/segmenter.py", globals())
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
        request.vars['sequences'] = ">plop \nATGTCGTCGTATGCGT"

        resp = index()
        # TODO enable 
        # self.assertTrue("ATGTCGTCGTATGCGT" in resp, "index() did not return the expected sequence analysis "+resp)