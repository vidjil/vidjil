#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.tools import Auth
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class Results_fileController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/results_file.py", globals())
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
        request.vars["results_file_id"] = fake_result_id
        
        resp = info()
        self.assertTrue(resp.has_key('message'), "info() has returned an incomplete response")
        
        
    def testConfirm(self):
        request.vars["results_file_id"] = fake_result_id
        
        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() has returned an incomplete response")
        
        
    def testDelete(self):
        fake_result_id2 = db.results_file.insert(sequence_file_id = fake_file_id,
                                    config_id = fake_config_id,
                                    run_date = "2014-09-19 00:00:00")
        
        request.vars["results_file_id"] = fake_result_id2
    
        resp = delete()
        self.assertNotEqual(resp.find("process deleted"), -1, "delete result file failled")
        
        
    
    
    
    
    
    
    
        
        