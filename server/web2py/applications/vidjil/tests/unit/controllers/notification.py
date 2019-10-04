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
        unittest.TestCase.__init__(self, p)

    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/notification.py", globals())
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
        
        auth.add_permission(group_id, 'admin', db.patient, 0)
        auth.add_permission(group_id, 'read', db.patient, 0)
        auth.add_permission(group_id, 'create', db.patient, 0)

    def testIndex(self):
        res = index()
        self.assertTrue(res.has_key('message'), "index has returned an incomplete response")

    def testAdd(self):
        res = add()
        self.assertNotEqual(res.has_key('message'), "add has returned an incomplete response")

    def test1AddForm(self):
        request.vars['title'] = "test title"
        request.vars['message_content'] = "test content"
        request.vars['message_type'] = "type"
        request.vars['priority'] = 'header'
        request.vars['expiration'] = '2100-10-30'

        res = add_form()
        self.assertNotEqual(res.find('notification added'), -1, "add notification failed")
        query = db(db.notification.id > 0).select()
        self.assertTrue(query, "add_form was unable to create a notification")
        
    def testEdit(self):
        request.vars['id'] = fake_notification_id
        res = edit()
        self.assertTrue(res.has_key('message'), "edit returned an incomplete response")

    def test2EditForm(self):
        curdate = date.today()
        curdate.replace(year = curdate.year+1)
        request.vars['id'] = fake_notification_id
        request.vars['title'] = "test title"
        request.vars['message_content'] = "test content"
        request.vars['message_type'] = "type"
        request.vars['priority'] = "header"
        request.vars['expiration'] = str(curdate)
        res = edit_form()
        note = db.notification[fake_notification_id]
        preferences = db((db.user_preference.preference=='mail')
                        &(db.user_preference.val==fake_notification_id)).select()
        self.assertNotEquals(res.find('notification updated'), -1, "edit_form returned an incomplete response")
        self.assertTrue(note.title == "test title", "edit_form was unable to update the title")
        self.assertTrue(note.message_content == "test content", "edit_form was unable to update the message content")
        self.assertEqual(len(preferences), 0, "edit_form was unable to clear the associated preferences")

    def test4Delete(self):
        notification_id = db(db.notification.title=="test title").select()[0].id
        request.vars['id'] = str(notification_id)
        res = delete()
        self.assertNotEqual(res.find("notification " + str(notification_id) + " deleted"), -1, "delete returned an incomplete response")
        

    def test3GetActiveNotifications(self):
        #TODO Improve this test
        res = get_active_notifications()
        self.assertNotEqual(res, "[]", "get active notifications returned no notifications")
