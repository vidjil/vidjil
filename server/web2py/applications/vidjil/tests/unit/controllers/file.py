#!/usr/bin/python

from __future__ import print_function

import unittest
from mock import MagicMock, Mock, patch
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current
import base64

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
        

    def createDumbSequenceFile(self):
        return db.sequence_file.insert(sampling_date="1903-02-02",
                                       info="plop",
                                       pcr="plop",
                                       sequencer="plop",
                                       producer="plop",
                                       patient_id=fake_patient_id,
                                       pre_process_id=fake_pre_process_id,
                                       filename="babibou",
                                       provider=user_id,
                                       data_file =  db.sequence_file.data_file.store(open("../../doc/analysis-example.vidjil", 'rb'), "babibou"))

    def testForm(self):
        request.vars['id'] = fake_patient_id
        
        resp = json.loads(form())
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")
        
        
    def testSubmit(self):
        class emptyClass( object ):
            pass
        
        plop = emptyClass()
        setattr(plop, 'file',  open("../../doc/analysis-example.vidjil", 'rb'))
        setattr(plop, 'filename', 'plopapou')

        data = {}
        data['set_ids'] = ":p plapipou ("+str(fake_patient_id)+")"

        myfile= {
            "id": "",
            "sampling_date": "1992-02-02",
            "info": "plop",
            "pcr": "plop",
            "sequencer": "plop",
            "producer": "plop",
            "filename": "plopapi",
            "set_ids": ""
        }
        data['file'] = [myfile]

        request.vars['data'] = json.dumps(data)

        resp = submit()
        self.assertNotEqual(resp.find('"redirect":"sample_set/index"'), -1, "add_form() failed")
    
    
    def testEdit(self):
        request.vars['sample_set_id'] = fake_sample_set_id
        request.vars['id'] = fake_file_id
        
        resp = form()
        self.assertTrue(resp.has_key('message'), "edit() has returned an incomplete response")
        
        
    def testEditForm(self):
        data = {}
        data['set_ids']=":p plapipou ("+str(fake_patient_id)+")"
        data["sample_type"] = defs.SET_TYPE_PATIENT

        myfile = {
            "id" : fake_file_id,
            "filename" : "plopapi",
            "sampling_date" : "1992-02-02",
            "info" : "plop",
            "pcr" : "plop",
            "sequencer" : "plop",
            "producer":"plop",
            "set_ids" : ""
        }
        data['file'] = [myfile]

        request.vars['data'] = json.dumps(data)
        
        
        resp = submit()
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
        self.assertNotEqual(resp.find('upload finished'), -1, "testUpload() failed")
        
    def testConfirmFail(self):
        resp = confirm()
        self.assertTrue(resp.find('requested file doesn\'t exist') > -1, "confirm() should fail because file is not in DB")

    def testConfirmSuccess(self):
        test_file_id = self.createDumbSequenceFile()
        request.vars['id'] = test_file_id

        request.vars['redirect_sample_set_id'] = fake_sample_set_id

        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() fails to confirm deletion of a file")
    
    
    def testDelete(self):
        test_file_id = self.createDumbSequenceFile()

        result_id = db.results_file.insert(sequence_file_id = test_file_id,
                                           config_id = fake_config_id,
                                           run_date = '2015-04-23 00:00:00')
        
        db.sample_set_membership.insert(sample_set_id = fake_sample_set_id, sequence_file_id = test_file_id)
        self.assertTrue(db.sequence_file[test_file_id].filename == "babibou" , "file have been added")
        
        request.vars['id'] = test_file_id
        request.vars['redirect_sample_set_id'] = fake_sample_set_id
        
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
            
    def testUpdateNameOfSequenceFile(self):
        sequence_id = self.createDumbSequenceFile()
        data_file = db.sequence_file[sequence_id].data_file

        update_name_of_sequence_file(sequence_id, 'toto.txt', 'LICENSE')

        current_sequence = db.sequence_file[sequence_id]
        self.assertEquals(current_sequence.size_file, os.path.getsize('LICENSE'))
        self.assertEquals(current_sequence.data_file, 'LICENSE')
        self.assertEquals(current_sequence.filename, 'toto.txt')

    def testGetNewUploaddedFilename(self):
        sequence_id = self.createDumbSequenceFile()
        data_file = db.sequence_file[sequence_id].data_file

        filename = get_new_uploaded_filename(data_file, "truc.def")

        self.assertEquals(filename[-4:], ".def")
        self.assertTrue(filename.find(base64.b16encode('truc.def').lower() + ".def") > -1)

    def testRestartPreProcess(self):
        fake_task = db.scheduler_task[fake_task_id]
        res = dict()
        with patch.object(Scheduler, 'queue_task', return_value=fake_task) as mock_queue_task:
            sequence_id = self.createDumbSequenceFile()
            request.vars['sequence_file_id'] = sequence_id
            res = restart_pre_process()
            print(res)
        self.assertNotEqual(res.find('message'), -1, 'missing message in response')

    def testRestartPreProcessInexistantFile(self):
        fake_task = db.scheduler_task[fake_task_id]
        res = dict()
        with patch.object(Scheduler, 'queue_task', return_value=fake_task) as mock_queue_task:
            request.vars['sequence_file_id'] = 666
            res = restart_pre_process()
            print(res)
        self.assertNotEqual(res.find('"success":"false"'), -1, 'missing message in response')
