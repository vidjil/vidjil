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
from ....modules.vidjil_utils import init_db_helper

PWD_TEST = 'pwdtestuser'
USER_TEST = 'user@test.com'

class TestMetricsController(unittest.TestCase):
    
    def get_metrics(self):
        with Omboddle(self.session, keep_session=True):
            result = metrics_controller.metrics()
        return result
    
    def setUp(self):
        # init env
        os.environ['METRICS_USER_PASSWORD'] = 'foobartest'
        os.environ['METRICS_USER_EMAIL'] = 'metrics@vidjil.org'
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        # init db
        init_db_helper(db, auth, "plop@plop.com", "foobartest", force=True)
        
    ##################################
    # Tests on default_controller.index()
    ##################################
    
    def test_var(self):
        pwd = os.getenv('METRICS_USER_PASSWORD')
        email = os.getenv('METRICS_USER_EMAIL')
        self.assertEqual(pwd, 'foobartest')
        self.assertEqual(email, 'metrics@vidjil.org')
        
    def test_metrics_message(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result['message'] == "status METRICS"
        
    def test_metrics_patients(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result is not None
        assert result["set_patients_count"] == 1
        
    def test_metrics_users(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_user(self.session, 'new', 'user', USER_TEST, PWD_TEST)
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result["users_count"] == 3
        
    def test_metrics_patients_by_user(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        db_manipulation_utils.add_patient(1,2)
        
        db_manipulation_utils.add_patient(1,1)
        
        
        #When
        result = self.get_metrics()
        print(result["set_patients_by_user"][0])
        print(result["set_patients_by_user"][1])
        #Then
        assert result["set_patients_by_user"][0]["user_id"] == 1 
        assert result["set_patients_by_user"][0]['count'] == 1 
        assert result["set_patients_by_user"][1]["user_id"] == 2 
        assert result["set_patients_by_user"][1]['count'] == 2 
        assert len(result["set_patients_by_user"]) == 2
        
    def test_metrics_not_metrics(self):
        #Given
        db_manipulation_utils.add_user(self.session, 'new', 'user', USER_TEST, PWD_TEST)
        db_manipulation_utils.log_in(self.session, USER_TEST, PWD_TEST)
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result is not None
        assert result["message"] == 'status NOT in metrics group'
        
    def test_metrics_groups(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_group('group_test')
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result["group_count"] == 5
        
    def test_metrics_config(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_config()
        db_manipulation_utils.add_patient(1,2)
        db_manipulation_utils.add_sequence_file(-1, -1, False, False, -1)
        db_manipulation_utils.add_scheduler_task('pre_process', 1, 'COMPLETED', [1, 1], "2024-01-01 10:00:00")
        db_manipulation_utils.add_results_file(-1, -1, -1, False)
        db_manipulation_utils.add_results_file(-1, -1, -1, False)
        
        #When
        result = self.get_metrics()
        print(result['config_analysis'][0])
        print(result['config_analysis'][0]["_extra"].keys())
        
        #Then
        assert result["config_analysis"][0]["results_file"]['config_id'] == 1
        assert result["config_analysis"][0]["config"]['name'] == "default + extract reads"
        assert result["config_analysis"][0]["config"]['program'] == 'vidjil'
        assert result["config_analysis"][0]["_extra"]['COUNT("results_file"."id")'] == 2
        
    def test_metrics_sequence_file(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        db_manipulation_utils.add_sequence_file(-1, -1, False, False, -1)
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result["group_count"] == 4
        assert result["sequence_count"] == 1
        
    def test_metrics_result(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        db_manipulation_utils.add_sequence_file(-1, -1, False, False, -1)
        db_manipulation_utils.add_scheduler_task('pre_process', 1, 'COMPLETED', [1, 1], "2024-01-01 10:00:00")
        db_manipulation_utils.add_results_file(-1, -1, -1, False)
        
        #When
        result = self.get_metrics()
        
        #Then
        assert result["group_count"] == 4
        assert result["results_count"] == 1
        
    def test_metrics_login(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        
        #When
        result = self.get_metrics()
        
        #Then
        
        assert result["login_count"][0]["_extra"]['COUNT("auth_event"."id")'] == 3
                
    def test_metrics_run(self):
        #Given
        db_manipulation_utils.log_in(self.session, 'metrics@vidjil.org', 'foobartest')
        db_manipulation_utils.add_patient(1,2)
        db_manipulation_utils.add_run(-1)
        
        #When
        result = self.get_metrics()
        print(result)
        
        #Then 
        assert result["set_runs_count"] == 1
        
        