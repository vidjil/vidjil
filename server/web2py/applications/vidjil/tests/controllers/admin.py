#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.tools import Auth
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class AdminController(unittest.TestCase):
        
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/admin.py", globals())
        
        # Set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request([])
        auth = Auth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        
    def testIndex(self):      
        resp = index()
        self.assertTrue(resp.has_key('uptime'), "index() has returned an incomplete response")
        
        
    def testMonitor(self):
        resp = monitor()
        self.assertTrue(resp.has_key('worker'), "monitor() has returned an incomplete response")
        
        
    def testLog(self):
        request.vars.file = '../log/nginx/access.log'
        resp = log()
        self.assertTrue(resp.has_key('lines'), "log() has returned an incomplete response")
        
        
    def testRepair_missing_files(self):
        test_file_name = "test_file_zXtRe"
        
        sequence_file_id = db.sequence_file.insert(sampling_date="1978-12-12",
                            info="",
                            pcr="",
                            sequencer="",
                            producer="",
                            patient_id=1,
                            filename=test_file_name,
                            provider=auth.user_id,
                            data_file = "plopapi") #incorect data file 
                            
        resp = repair_missing_files()
        
        self.assertNotEqual(resp.find(test_file_name,0), -1, "repair_missing_file() was not able to repair an incorect entry")
        
        self.assertEqual(db.sequence_file[sequence_file_id].data_file, None, "repair_missing_file() didn't removed an incorect data_file")
        