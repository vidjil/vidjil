#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class FileController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/file.py", globals())
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
        
        
        
    def testAdd(self):      
        request.vars['id'] = fake_patient_id
        
        resp = add()
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")
        
        
    def testAddForm(self):      
        class emptyClass( object ):
            pass
        
        plop = emptyClass()
        setattr(plop, 'file',  open("../../doc/analysis-example.vidjil", 'rb'))
        setattr(plop, 'filename', 'plopapou')

        request.vars['sampling_date'] = "1992-02-02"
        request.vars['file_info'] = "plop"
        request.vars['pcr'] = "plop"
        request.vars['sequencer'] = "plop"
        request.vars['producer'] = "plop"
        request.vars['patient_id'] = fake_patient_id
        request.vars['filename'] = "plopapi"
        
        resp = add_form()
        self.assertNotEqual(resp.find('"redirect":"patient/info","message"'), -1, "add_form() failed")
    
    
    def testEdit(self):
        request.vars['patient_id'] = fake_patient_id
        
        resp = edit()
        self.assertTrue(resp.has_key('message'), "edit() has returned an incomplete response")
        
        
    def testEditForm(self):
        request.vars['id'] = fake_file_id
        request.vars['filename'] = "plopapi"
        
        request.vars['sampling_date'] = "1992-02-02"
        request.vars['file_info'] = "plop"
        request.vars['pcr'] = "plop"
        request.vars['sequencer'] = "plop"
        request.vars['producer']="plop"
        
        
        resp = edit_form()
        self.assertEqual(resp.find('"message":"plopapi: metadata saved"'), -1, "edit_form() failed")
       
       
    def testUpload(self):
        class emptyClass( object ):
            pass
        
        plop = emptyClass()
        setattr(plop, 'file',  open("../../doc/analysis-example.vidjil", 'rb'))
        setattr(plop, 'filename', 'plopapi')
    
        request.vars['file'] = plop
        request.vars['id'] = fake_file_id
    
        resp = upload()
        self.assertEqual(resp.find('"message":"upload finished: plopapi"'), -1, "edit_form() failed")
        
    def testConfirmFail(self):
        resp = confirm()
        self.assertTrue(resp.find('requested file doesn\'t exist') > -1, "confirm() should fail because file is not in DB")

    def testConfirmSuccess(self):
        test_file_id = db.sequence_file.insert(sampling_date="1903-02-02",
                                    info="plop",
                                    pcr="plop",
                                    sequencer="plop",
                                    producer="plop",
                                    patient_id=fake_patient_id,
                                    filename="babibou",
                                    provider=user_id,
                                    data_file =  db.sequence_file.data_file.store(open("../../doc/analysis-example.vidjil", 'rb'), "babibou"))
        request.vars['id'] = test_file_id

        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() fails to confirm deletion of a file")
    
    
    def testDelete(self):
        test_file_id = db.sequence_file.insert(sampling_date="1903-02-02",
                                    info="plop",
                                    pcr="plop",
                                    sequencer="plop",
                                    producer="plop",
                                    patient_id=fake_patient_id,
                                    filename="babibou",
                                    provider=user_id,
                                    data_file =  open("../../doc/analysis-example.vidjil", 'rb'))

        result_id = db.results_file.insert(sequence_file_id = test_file_id,
                                           config_id = fake_config_id,
                                           run_date = '2015-04-23 00:00:00')
        
        self.assertTrue(db.sequence_file[test_file_id].filename == "babibou" , "file have been added")
        
        request.vars['id'] = test_file_id
        
        resp = delete()
        self.assertTrue(db.sequence_file[test_file_id].data_file == None , "file only should have been deleted")
        self.assertTrue(db.results_file[result_id] <> None, "result file should not have been deleted")
        

        request.vars['delete_results'] = 'True'
        resp = delete()
        self.assertTrue(db.sequence_file[test_file_id] == None, "sequence entry in DB should have been deleted")
        self.assertTrue(db.results_file[result_id] == None, "result file should have been deleted")

    def testSequencerList(self):
        
        resp = sequencer_list()
        self.assertNotEqual(resp.find('"sequencer":['), -1, "sequencer_list() doesn't return a valid json")
        
            
    def testPcrList(self):
        
        resp = pcr_list()
        self.assertNotEqual(resp.find('"pcr":['), -1, "pcr_list() doesn't return a valid json")
        
            
    def testProducerList(self):
        
        resp = producer_list()
        self.assertNotEqual(resp.find('"producer":['), -1, "producer_list() doesn't return a valid json")
            
            
            
            
            
            
            