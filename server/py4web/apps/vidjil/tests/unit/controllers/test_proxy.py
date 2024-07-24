import os
import json
import unittest

import requests

from bs4 import BeautifulSoup
from ..utils.omboddle import Omboddle
from ..utils import db_manipulation_utils
from ...functional.db_initialiser import DBInitialiser
from py4web.core import _before_request, Session
from ....common import db, auth
from ....controllers import proxy as proxy_controller

class TestProxyController(unittest.TestCase):

    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        initialiser = DBInitialiser(db)
        initialiser.run()

    ##################################
    # Tests on proxy_controller.index()
    ##################################

    def test_index(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = proxy_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result == "index()"

    ##################################
    # Tests on proxy_controller.imgt()
    ##################################

    def test_imgt_no_content(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, method="POST"):
            result = proxy_controller.imgt()

        # Then : We get a result
        assert result.status_code == 200
        assert result.url == "https://www.imgt.org/IMGT_vquest/analysis"
        bs = BeautifulSoup(result.text, "lxml")
        assert bs is not None
        
    # TODO : add a test with real content

    ##################################
    # Tests on proxy_controller.assign_subsets()
    ##################################

    def test_assign_subsets_no_content(self):
        # Given : Logged as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, method="POST"):
            try:
                result = proxy_controller.assign_subsets()
            except requests.exceptions.SSLError:
                # Deal with not valid certificates
                return

        # Then : Check result is containing a valid URL
        str_result = str(result)
        assert "https://bat.infspire.org/arrest/assignsubsets_results/" in str_result
        
        
    # TODO : add a test with real content
    
    