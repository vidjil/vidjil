#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.tools import Auth
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class GroupController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/group.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = Auth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")
        
        
        auth.add_permission(group_id, 'admin', db.auth_group, 0)
        auth.add_permission(group_id, 'read', db.auth_group, 0)
        auth.add_permission(group_id, 'create', db.auth_group, 0)
        
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
        
        
    def testAdd(self):      
        resp = add()
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")
        
        
    def test1AddForm(self):
        request.vars["group_name"] = "test_group_1"
        request.vars["info"] = "test_group_1"
        
        resp = add_form()
        self.assertTrue(auth.has_membership("test_group_1"), "group creation failed")
            
            
    def testConfirm(self):      
        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() has returned an incomplete response")
        
        
    def test9Delete(self):
        group_id = db( db.auth_group.role == "test_group_1").select()[0].id
        request.vars["id"] = group_id
        
        resp = delete()
        self.assertEqual(resp.find('"message":"group deleted"'), -1, "group have been deleted")
        
        
    def testInfo(self):      
        resp = info()
        self.assertTrue(resp.has_key('message'), "info() has returned an incomplete response")
        
        
    def testPermission(self):      
        resp = permission()
        self.assertTrue(resp.has_key('message'), "permission() has returned an incomplete response")
        
        
    def test2RemovePermission(self):
        group_id = db( db.auth_group.role == "test_group_1").select()[0].id
        request.vars["user_id"] = user_id
        request.vars["group_id"] = group_id
        
        resp = remove_permission()
        auth.has_permission('admin', 'auth_group', group_id)
        
        
    def test3ChangePermission(self):
        group_id = db( db.auth_group.role == "test_group_1").select()[0].id
        request.vars["user_id"] = user_id
        request.vars["group_id"] = group_id
        
        resp = change_permission()
        auth.has_permission('admin', 'auth_group', group_id)
        
        
        
        
        
        
        