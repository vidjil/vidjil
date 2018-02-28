#!/usr/bin/python

from __future__ import print_function

import unittest
import tempfile
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
        def f(a, **kwargs):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        # for defs
        current.db = db
        current.auth = auth

    def _get_fake_analysis_file(self):
        file = tempfile.TemporaryFile()
        file.write('{"toto": 1, "bla": [], "clones": {"id": "AATA", "tag": 0}}')
        file.seek(0)
        return file
        
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
        patient = db((db.sequence_file.id == fake_file_id)
		& (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
	).select(db.patient.ALL).first()
	request.vars['sample_set_id'] = patient.sample_set_id

        resp = run_request()
        self.assertNotEqual(resp.find('process requested'), -1, "run_request doesn't return a valid message")
        self.assertEqual(db((db.fused_file.config_id == fake_config_id) & (db.fused_file.sample_set_id == patient.sample_set_id)).count(), 1)
        
        
    def testGetData(self):
        request.vars['config'] = fake_config_id
        request.vars['sample_set_id'] = fake_sample_set_id
        
        resp = get_data()
        self.assertNotEqual(resp.find('segmented":[742377'), -1, "get_data doesn't return a valid json " + resp)
        self.assertNotEqual(resp.find('(config_test_popipo)'), -1, "get_data doesn't return a valid json")
        
        
    def testCustomDataNoFile(self):
        resp = gluon.contrib.simplejson.loads(get_custom_data())
        print(resp['message'])
        self.assertTrue(resp.has_key('success'))
        self.assertEqual(resp['success'], 'false')
        self.assertNotEqual(resp['message'].find('get_custom_data'), -1)
        self.assertNotEqual(resp['message'].find('no file selected'), -1)

    def testCustomDataOneFile(self):
        request.vars['custom'] = str(fake_result_id)
        resp = gluon.contrib.simplejson.loads(get_custom_data())
        self.assertTrue(resp.has_key('success'))
        self.assertEqual(resp['success'], 'false')
        self.assertNotEqual(resp['message'].find('get_custom_data'), -1)
        self.assertNotEqual(resp['message'].find('select several files'), -1)

    def testCustomData(self):
        request.vars['custom'] = [str(fake_result_id2), str(fake_result_id2)]
        resp = gluon.contrib.simplejson.loads(get_custom_data())
        print(resp)
        if resp.has_key('success') and resp['success'] == 'false':
           self.assertTrue(defs.PORT_FUSE_SERVER is None, 'get_custom_data returns error without fuse server')
        else:
            self.assertEqual(resp['reads']['segmented'][0], resp['reads']['segmented'][2], "get_custom_data doesn't return a valid json")

    def testSaveAnalysis(self):
        class emptyClass( object ):
            pass
        
        plop = emptyClass()
        analysis = tempfile.NamedTemporaryFile()
        analysis.write('{"toto": 1, "bla": [], "clones": {"id": "AATA", "tag": 0}}')
        setattr(plop, 'file',  open(analysis.name, 'rb'))
        setattr(plop, 'filename', 'plopapou')
        
        request.vars['fileToUpload'] = plop
        request.vars['patient'] = fake_patient_id
        request.vars['info'] = "fake info"
        request.vars['samples_id'] = str(fake_file_id)
        request.vars['samples_info'] = "fake sample info"
        request.vars['sample_set_id'] = fake_sample_set_id
        
        resp = save_analysis()

        resp = get_analysis_from_sample_set(fake_sample_set_id)
        self.assertEqual(len(resp), 1, "should have one analysis for that patient %d"%len(resp))
        self.assertEqual(resp[0].sample_set_id, fake_sample_set_id, "get_analysis doesn't have the correct sample_set")

    def testGetCleanAnalysis(self):
        analysis = get_clean_analysis(self._get_fake_analysis_file())
        self.assertEqual(analysis['clones']['id'], 'AATA', 'Bad clone id')
        self.assertEqual(analysis['tags'], {}, 'Bad tags entry in analysis')
        self.assertEqual(analysis['vidjil_json_version'], '2014.09', 'Bad vidjil_json_version string')
