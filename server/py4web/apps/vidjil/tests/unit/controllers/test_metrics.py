import os
import json
from pathlib import Path
import unittest
from ..utils.omboddle import Omboddle
from py4web.core import _before_request, Session, HTTP
from ...functional.db_initialiser import DBInitialiser
from ..utils import db_manipulation_utils, test_utils
from ....common import db, auth
from .... import defs
from ....controllers import metrics as metrics_controller

class TestMetricsController(unittest.TestCase):
    
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
    # Tests on default_controller.index()
    ##################################
    
    def test_metrics(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        
        #When
        result = metrics_controller.metrics()
        
        #Then
        assert {result['message']} == "status METRICS"
        
    def test_metrics_patients(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        
        
        #When
        result = metrics_controller.metrics
        
        #Then
        assert result is not None
        assert result["set_patients_count"] == 1
        
    def test_metrics_users(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        
        #When
        result = metrics_controller.metrics
        
        #Then
        assert result is not None
        assert result["message"] == "status METRICS"
        
    # def test_metrics(self):
    #     #Given
    #     db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        
    #     #When
    #     result = metrics_controller.metrics
        
    #     #Then
    #     assert result is not None
    #     assert result["message"] == "status METRICS"