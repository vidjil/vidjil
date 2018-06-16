#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class Sample_setController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/sample_set.py", globals())
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
        

    def testAll(self):
        request.vars["type"] = defs.SET_TYPE_GENERIC
        request.vars["id"] = fake_patient_id

        resp = all()
        self.assertTrue(resp.has_key('query'), "all() has returned an incomplete response" )

    def testIndex(self):
        request.vars["id"] = fake_sample_set_id
        
        resp = index()
        self.assertTrue(resp.has_key('query'), "info() has returned an incomplete response")
        
        
    def testCustom(self):
        resp = custom()
        self.assertTrue(resp.has_key('query'), "custom() has returned an incomplete response")

    def test1Permission(self):
        sample_set_id = db.patient[permission_patient].sample_set_id
        request.vars["id"] = sample_set_id

        resp = permission()
        self.assertTrue(resp.has_key('query'), "permission() has returned an incomplete response")


    def test2ChangePermission(self):
        patient = db.patient[permission_patient]
        sample_set_id = patient.sample_set_id
        request.vars["sample_set_id"] = sample_set_id
        request.vars["group_id"] = fake_group_id

        resp = change_permission()
        self.assertFalse(auth.get_group_access('patient', patient.id, fake_group_id), "fail to remove permission")

        resp = change_permission()
        self.assertTrue(auth.get_group_access('patient', patient.id, fake_group_id), "fail to add permission")

    def testForm(self):
        request.vars["type"] = "patient"
        resp = form()
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")


    def test1Add(self):
        import json
        patient = {
            "first_name" : "bob",
            "last_name" : "bob",
            "birth" : "2011-11-11",
            "info" : "test patient kZtYnOipmAzZ",
            "id_label" : "bob",
            "sample_set_id": ""
        }
        data = {'patient':[patient], 'group': fake_group_id}

        request.vars['data'] = json.dumps(data)

        name = "%s %s" % (request.vars["first_name"], request.vars["last_name"])

        resp = submit()
        self.assertNotEqual(resp.find('successfully added/edited set(s)'), -1, "add patient failled")

    def testEdit(self):
        request.vars["id"] = fake_patient_id

        resp = form()
        self.assertTrue(resp.has_key('message'), "edit() has returned an incomplete response")

    def testEditForm(self):
        import json
        pat = db.patient[fake_patient_id]
        patient = {
            "id" : pat.id,
            "first_name" : "bab",
            "last_name" : "bab",
            "birth" : "2010-10-10",
            "info" : "bab",
            "id_label" : "bab",
            "sample_set_id": pat.sample_set_id
        }
        data = {'patient': [patient]}
        request.vars['data'] = json.dumps(data)

        resp = submit()
        self.assertNotEqual(resp.find('successfully added/edited set(s)"'), -1, "edit patient failed")

    def testConfirm(self):
        request.vars["id"] = fake_sample_set_id

        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() has returned an incomplete response")


    def test4Delete(self):
        patient = db( db.patient.info == "test patient kZtYnOipmAzZ").select()[0]
        request.vars["id"] = patient.sample_set_id

        resp = delete()
        self.assertNotEqual(resp.find('sample set ('+str(patient.sample_set_id)+') deleted'), -1, "delete sample_set failed")
