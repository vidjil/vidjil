#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.tools import Auth
from gluon.contrib.test_helpers import form_postvars
from gluon import current


test_config_name = "test_config_plapipou"
#tmplog = log

class ConfigController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/config.py", globals())
        execfile("applications/vidjil/modules/defs.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = Auth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")
        
        auth.add_permission(group_id, 'admin', db.patient, 0)
        auth.add_permission(group_id, 'admin', db.config, 0)
        auth.add_permission(group_id, 'read', db.config, 0)
        
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        
    def testIndex(self):      
        resp = index()
        self.assertTrue(resp.has_key('query'), "index() has returned an incomplete response")
        
        
    def testAdd(self):
        resp = add()
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")
        
        
    def test1AddForm1(self):
        #test incomplete request
        request.vars['config_command'] = ""
        resp = add_form()
        self.assertNotEqual(resp.find('config_command needed,'), -1, "addForm doesn't return a valid error message")
    
    
    def test2AddForm1(self):
        #test valid request
        request.vars['config_name'] = test_config_name
        request.vars['config_info'] = " plop"
        request.vars['config_command'] = " -plop"
        request.vars['config_fuse_command'] = " -plop"
        request.vars['config_program'] = " plop.cpp"
        
        resp = add_form()
        self.assertTrue( len(db( db.config.name == test_config_name ).select()) == 1 , "fail to insert a new config") 
        
        
    def test3Edit(self):
        resp = edit()
        self.assertTrue(resp.has_key('message'), "edit() has returned an incomplete response")
        
        
    def test4EditForm(self):
        id_config = db( db.config.name == test_config_name).select()[0].id
        
        request.vars["id"] = id_config
        request.vars['config_name'] = test_config_name
        request.vars['config_info'] = "plup"
        
        resp = edit_form()
        self.assertTrue( db.config[id_config].info == "plup" , "fail to edit config info")
        
        
    def testConfirm(self):
        resp = confirm()
        self.assertTrue(resp.has_key('message'), "confirm() has returned an incomplete response")
        
        
    def test7Delete(self):
        id_config = db( db.config.name == test_config_name).select()[0].id
        
        request.vars["id"] = id_config
        
        resp = delete()
        print resp
        self.assertEqual(resp.find('config deleted'), -1, "delete doesn't return a valid message")
        
        
    def test5Permission(self):
        id_config = db( db.config.name == test_config_name).select()[0].id
        
        request.vars["id"] = id_config
        
        resp = permission()
        self.assertTrue(resp.has_key('query'), "permission() has returned an incomplete response")
        
        
    def test6change_permission(self):
        id_config = db( db.config.name == test_config_name).select()[0].id
        id_group = auth.user_group()
        
        request.vars["group_id"] = id_group
        request.vars["config_id"] = id_config
        request.vars["permission"] = "popipo"
        
        #add permission to "popipo" a config
        resp = change_permission()
        self.assertTrue( auth.has_permission('popipo', 'config', id_config), "fail to add a permission")
        
        
        #remove it
        resp = change_permission()
        self.assertFalse( auth.has_permission('popipo', 'config', id_config), "fail to remove a permission")
        
        
        
        
        
        
        
        