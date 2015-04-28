#!/usr/bin/python

import unittest
import gluon.contrib.simplejson
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current


class DefaultController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/default.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = VidjilAuth(globals(), db)
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
        self.assertTrue(resp.has_key('message'), "index() has returned an incomplete response")
        
        
    def testHelp(self):      
        resp = index()
        self.assertTrue(resp.has_key('message'), "help() has returned an incomplete response")
        
        
    def testRunRequest(self):
        #this will test only the scheduller not the worker
        request.vars['config_id'] = fake_config_id
        request.vars['sequence_file_id'] = fake_file_id
        
        resp = run_request()
        self.assertNotEqual(resp.find('process requested'), -1, "run_request doesn't return a valid message")
        
        
    def testGetData(self):
        request.vars['config'] = fake_config_id
        request.vars['patient'] = fake_patient_id
        
        resp = get_data()
        self.assertNotEqual(resp.find('segmented":[742377]'), -1, "get_data doesn't return a valid json")
        self.assertNotEqual(resp.find('(config_test_popipo)'), -1, "get_data doesn't return a valid json")
        
        
    def testCustomData(self):
        request.vars['custom'] = [str(fake_result_id), str(fake_result_id)]
        
        resp = gluon.contrib.simplejson.loads(get_custom_data())
        print resp
        if resp.has_key('success') and resp['success'] == 'false':
           self.assertTrue(defs.PORT_FUSE_SERVER is None, 'get_custom_data returns error without fuse server')
        else:
            self.assertEqual(resp['reads']['segmented'][0], resp['reads']['segmented'][1], "get_custom_data doesn't return a valid json")
        
        
    def testGetAnalysis(self):
        request.vars['config'] = fake_config_id
        request.vars['patient'] = fake_patient_id
        
        resp = get_analysis()
        self.assertNotEqual(resp.find('"info_patient":"plop"'), -1, "get_analysis doesn't return a valid json")

    def testSaveAnalysis(self):
        class emptyClass( object ):
            pass
        
        plop = emptyClass()
        setattr(plop, 'file',  open("../../doc/analysis-example.vidjil", 'rb'))
        setattr(plop, 'filename', 'plopapou')
        
        request.vars['fileToUpload'] = plop
        request.vars['config'] = fake_config_id
        request.vars['patient'] = fake_patient_id
        
        resp = save_analysis()
        self.assertNotEqual(resp.find('analysis saved","success":"true"'), -1, "save_analysis failed")
        
