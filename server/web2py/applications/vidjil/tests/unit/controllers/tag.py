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

        expected ={"3": [{"id": 1, "name": "ALL"}, {"id": 2, "name": "T-ALL"}, {"id": 3, "name": "B-ALL"}, {"id": 4, "name": "pre-B-ALL"}, {"id": 5, "name": "pro-B-ALL"}, {"id": 6, "name": "mature-B-ALL"}, {"id": 7, "name": "CML"}, {"id": 8, "name": "HCL"}, {"id": 9, "name": "MZL"}, {"id": 10, "name": "T-PLL"}, {"id": 11, "name": "CLL"}, {"id": 12, "name": "LGL"}, {"id": 13, "name": "lymphoma"}, {"id": 14, "name": "MCL"}, {"id": 15, "name": "NHL"}, {"id": 16, "name": "HL"}, {"id": 17, "name": "FL"}, {"id": 18, "name": "DLBCL"}, {"id": 19, "name": "WM"}, {"id": 20, "name": "MAG"}, {"id": 21, "name": "MM"}, {"id": 22, "name": "diagnosis"}, {"id": 23, "name": "MRD"}, {"id": 24, "name": "relapse"}, {"id": 25, "name": "CR"}, {"id": 26, "name": "deceased"}, {"id": 27, "name": "pre-BMT"}, {"id": 28, "name": "post-BMT"}, {"id": 29, "name": "pre-SCT"}, {"id": 30, "name": "post-SCT"}, {"id": 31, "name": "dilution"}, {"id": 32, "name": "standard"}, {"id": 33, "name": "QC"}, {"id": 34, "name": "EuroMRD"}, {"id": 35, "name": "marrow"}, {"id": 36, "name": "blood"}, {"id": 37, "name": "repertoire"}, {"id": 38, "name": "TIL"}, {"id": 39, "name": "CAR-T"}, {"id": 40, "name": "scFv"}, {"id": 41, "name": "FR1"}, {"id": 42, "name": "FR2"}, {"id": 43, "name": "FR3"}, {"id": 44, "name": "TRA"}, {"id": 45, "name": "TRB"}, {"id": 46, "name": "TRG"}, {"id": 47, "name": "TRD"}, {"id": 48, "name": "IGH"}, {"id": 49, "name": "IGK"}, {"id": 50,"name": "KDE"}, {"id": 51, "name": "IGL"}, {"id": 52, "name": "IKAROS"}, {"id": 53, "name": "BCR-ABL"}, {"id": 54, "name": "TEL-AML1"}, {"id": 55, "name": "E2A-PBX"}, {"id": 56, "name": "BCL2"}, {"id": 57, "name": "PAX5"}]}

        request.vars["keys"] = "[]"
        resp = auto_complete()
        self.assertEqual(resp.find("missing group ids"), -1, "auto_complete failed to detect group_ids param")
        self.assertEqual(json.loads(resp), expected, "auto_complete returned an unexpected response")

        request.vars["keys"] = "[%d,%d]" % (unique_group, fake_group_id)
        resp = auto_complete()
        json_resp = json.loads(resp)
        self.assertTrue(json_resp.has_key(str(unique_group)), "missing tag for unique_group: %s" % unique_group)
        tag = json_resp[str(int(unique_group))][0]
        self.assertEqual(tag["name"], 'first_fake_tag')
