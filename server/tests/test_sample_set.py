import os
import unittest
import pytest
from webtest import TestApp
from py4web.core import wsgi

class TestSampleSet(unittest.TestCase):
        
    def setUp(self):
        application = wsgi(apps_folder="server/py4web/apps")

        self.app = TestApp(application)


    def testLogin(self):

        resp = self.app.get('/vidjil/auth/login')
        print(resp.status)
        assert resp.status == '200 OK'

    @pytest.mark.skip(reason="Does not work for now, to investigate...")
    def testPatient(self):

        resp = self.app.get('/vidjil/patient')
        print(resp.status)
        assert resp.status == '303 See Other'
        assert resp.location == '/vidjil/auth/login?next=/vidjil/patient'

if __name__ == "__main__":
    unittest.main()