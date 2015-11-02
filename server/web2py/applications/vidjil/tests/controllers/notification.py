#!/usr/bin/python

import unittest
import tempfile
import gluon.contrib.simplejson
from datetime import date
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class NotificationController(unittest.TestCase):
    
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase(self, p)

    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/notification.py", globals())
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
        
        auth.add_permission(group_id, 'admin', db.patient, 0)
        auth.add_permission(group_id, 'read', db.patient, 0)
        auth.add_permission(group_id, 'create', db.patient, 0)

    def testIndex(self):
        res = index()
        self.assertTrue(res.hasKey('message'), "index has returned an incomplete response")

    def testAdd(self):
        res = add()
        self.assertTrue(res.hasKey('message'), "add has returned an incomplete response")

    def test1AddForm(self):
        request.vars['title'] = "test title"
        request.vars['message_content'] = "test content"
        request.vars['message_type'] = "type"
        request.vars['priority'] = 'header'
        request.vars['expiration'] = '2100-10-30'

        res = add_form()

        self.assertTrue(res.hasKey('message'), "add_form has returned an incomplete response")
        query = db(db.notification.id > 0).select()
        self.assertTrue(query, "add_form was unable to create a notification")
        
    def testEdit(self):
        request.vars['id'] = fake_notification_id
        res = edit()
        assertTrue(res.hasKey('message'), "edit returned an incomplete response")

    def test1EditForm(self):
        date = date.today()
        today.replace(year = today.year+1)
        request.vars['id'] = fake_notification_id
        request.vars['title'] = "test title"
        request.vars['message_content'] = "test content"
        request.vars['message_type'] = "type"
        request.vars['priority'] = "header"
        request.vars['expiration'] = date.__str__()

        res = edit_form()
        note = db.notification[fake_notification_id]
        self.assertTrue(res.hasKey('message'), "edit_form returned an incomplete response")
        self.assertTrue(note.title == "test title", "edit_form was unable to update the title")
        self.assertTrue(note.message_content == "test content", "edit_form was unable to update the message content")

    def test3Delete(self):
        notification_id = db(db.notification.title=="test title").select()[0].id
        
        res = delete()
        self.assertTrue(res.hasKey('message'), "edit returned an incomplete response")
        

    def test2GetActiveNotifications(self):
        #TODO Improve this test
        res = get_active_notifications()
        assertTrue(res != "[]", "get active notifications returned no notifications")
