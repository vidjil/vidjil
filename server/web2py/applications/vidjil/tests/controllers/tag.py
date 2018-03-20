#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class TagController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/tag.py", globals())
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

    def test_auto_complete(self):
        resp = auto_complete()
        self.assertNotEqual(resp.find("missing group ids"), -1, "auto_complete did not fail correctly")

        request.vars["keys"] = "[]"
        resp = auto_complete()
        self.assertEqual(resp.find("missing group ids"), -1, "auto_complete failed to detect group_ids param")
        self.assertEqual(resp, "{}", "auto_complete returned an unexpected response")

        request.vars["keys"] = "[%d,%d]" % (unique_group, fake_group_id)
        resp = auto_complete()
        json_resp = json.loads(resp)
        self.assertTrue(json_resp.has_key(str(unique_group)), "missing tag for unique_group: %s" % unique_group)
        tag = json_resp[str(int(unique_group))][0]
        self.assertEqual(tag["name"], 'first_fake_tag')
