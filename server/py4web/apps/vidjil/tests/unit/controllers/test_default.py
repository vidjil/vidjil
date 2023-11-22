import os
import json
import unittest
from pathlib import Path
from ..utils.omboddle import Omboddle
from py4web import URL
from py4web.core import _before_request, Session, HTTP
from ...functional.db_initialiser import DBInitialiser
from ..utils.db_manipulation_utils import *
from ....common import db, auth
from ....controllers import default as default_controller


class TestDefaultController(unittest.TestCase):

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

    def test_index(self):
        # Given : not logged

        # When : Calling index
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.index()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["message"] == "hello world"

    ##################################
    # Tests on default_controller.help()
    ##################################

    def test_help(self):
        # Given : not logged

        # When : Calling help
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.help()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["message"] == "help i'm lost"

    ##################################
    # Tests on default_controller.home()
    ##################################

    def test_home_not_logged(self):
        # Given : not logged

        # When : Calling home
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.home()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_home_admin(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling home
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.home()
            expected_result_admin = URL("admin/index")

        # Then : We get a result
        result = json.loads(json_result)
        assert result["redirect"] == expected_result_admin

    def test_home_user(self):
        # Given : Logged as other user
        add_indexed_user(self.session, 1)
        log_in(self.session,
               get_indexed_user_email(1),
               get_indexed_user_password(1))

        # When : Calling home
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.home()
            expected_result_admin = URL("admin/index")

        # Then : We get a result
        result = json.loads(json_result)
        assert result["redirect"] != expected_result_admin
        assert "sample_set" in result["redirect"]

    ##################################
    # Tests on default_controller.whoami()
    ##################################

    def test_whoami_not_logged(self):
        # Given : not logged

        # When : Calling whoami
        with self.assertRaises(AttributeError) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.whoami()

        # Then : We get a redirect
        exception = context.exception
        assert exception.args[0] == "'AuthEnforcer' object has no attribute 'id'"

    def test_whoami_admin(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["email"] == "plop@plop.com"
        assert result["admin"] == True
        assert result["groups"] is not None

    def test_whoami_user(self):
        # Given : Logged as other user
        user_id = add_indexed_user(self.session, 1)
        log_in(self.session,
               get_indexed_user_email(1),
               get_indexed_user_password(1))

        # When : Calling whoami
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.whoami()

        # Then : We get a result
        result = json.loads(json_result)
        assert result["id"] == user_id
        assert result["email"] == get_indexed_user_email(1)
        assert result["admin"] == False
        assert result["groups"] is not None

    ##################################
    # Tests on default_controller.init_db()
    ##################################

    # TODO : tests on default_controller.init_db()

    ##################################
    # Tests on default_controller.init_db_form()
    ##################################

    # TODO : tests on default_controller.init_db_form()

    ##################################
    # Tests on default_controller.run_request()
    ##################################

    def test_run_request_not_logged(self):
        # Given : not logged

        # When : Calling run_request
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.run_request()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    # TODO : try and manage to get this working: currently it looks like it goes away in celery...
    # def test_run_request(self):
    #     # Given : Logged as other user, and add corresponding config, ...
    #     user_id = add_indexed_user(self.session, 1)
    #     log_in(self.session,
    #            get_indexed_user_email(1),
    #            get_indexed_user_password(1))
    #     patient_id = add_patient(1, user_id)
    #     sequence_file_id = add_sequence_file(patient_id, user_id)
    #     config_id = add_config()
    #     saved_dir_results = defs.DIR_RESULTS
    #     defs.DIR_RESULTS = str(Path(Path(__file__).parent.absolute(),
    #                                 "..",
    #                                 "resources"))

    #     # When : Calling run_request
    #     try:
    #         with Omboddle(self.session, keep_session=True,
    #                       params={"format": "json"},
    #                       query={"sequence_file_id": sequence_file_id, "sample_set_id": patient_id, "config_id": config_id}):
    #             json_result = default_controller.run_request()

    #         # Then : Check result
    #         result = json.loads(json_result)
    #         print(result)
    #     except:
    #         raise
    #     finally:
    #         defs.DIR_RESULTS = saved_dir_results

    # def testRunRequest(self):
    #     #this will test only the scheduller not the worker
    #     request.vars['config_id'] = fake_config_id
    #     request.vars['sequence_file_id'] = fake_file_id
    #     patient = db((db.sequence_file.id == fake_file_id)
        # 	& (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
    #             & (db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
        # ).select(db.patient.ALL).first()
        # request.vars['sample_set_id'] = patient.sample_set_id

    #     resp = run_request()
    #     self.assertNotEqual(resp.find('process requested'), -1, "run_request doesn't return a valid message")
    #     self.assertEqual(db((db.fused_file.config_id == fake_config_id) & (db.fused_file.sample_set_id == patient.sample_set_id)).count(), 1)
    
    # TODO: add other tests !

    ##################################
    # Tests on default_controller.run_all_request()
    ##################################
    
    # TODO : Tests on default_controller.run_all_request()

    ##################################
    # Tests on default_controller.get_data()
    ##################################

    def test_get_data_not_logged(self):
        # Given : not logged

        # When : Calling get_data
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.get_data()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    # TODO : try and manage to get this working: should we use a real fused file ? where to get one ?
    # def test_get_data(self):
    #     # Given : Logged as other user
    #     user_id = add_indexed_user(self.session, 1)
    #     log_in(self.session,
    #            get_indexed_user_email(1),
    #            get_indexed_user_password(1))
    #     patient_id = add_patient(1, user_id)

    #     # When : Calling whoami
    #     with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"patient": patient_id}):
    #         json_result = default_controller.get_data()

    #     # Then : We get a result
    #     result = json.loads(json_result)
    #     assert result["email"] == "plop@plop.com"
    #     assert result["admin"] == True
    #     assert result["groups"] is not None

    # def testGetData(self):
    #     request.vars['config'] = fake_config_id
    #     request.vars['sample_set_id'] = fake_sample_set_id

    #     resp = get_data()
    #     self.assertNotEqual(resp.find('segmented":[742377'), -1, "get_data doesn't return a valid json " + resp)
    #     self.assertNotEqual(resp.find('(config_test_popipo)'), -1, "get_data doesn't return a valid json")
    #     self.assertNotEqual(resp.find('this is a fake log msg'), -1, "get_data file doesn't contain expected log data")
    
    # TODO: add other tests !

    ##################################
    # Tests on default_controller.get_custom_data()
    ##################################

    def test_get_custom_data_not_logged(self):
        # Given : not logged

        # When : Calling get_custom_data
        with self.assertRaises(HTTP) as context:
            with Omboddle(self.session, keep_session=True, params={"format": "json"}):
                default_controller.get_custom_data()

        # Then : We get a redirect
        exception = context.exception
        assert exception.status == 303

    def test_get_custom_data_missing_arguments(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)

        # When : Calling get_custom_data
        with Omboddle(self.session, keep_session=True, params={"format": "json"}):
            json_result = default_controller.get_custom_data()

        # Then : We get a redirect
        result = json.loads(json_result)
        assert result["success"] == "false"
        assert result["message"] == "default/get_custom_data : no file selected, "

    def test_get_custom_data_one_file(self):
        # Given : Logged as admin
        log_in_as_default_admin(self.session)
        results_file_id = add_results_file()

        # When : Calling get_custom_data
        with Omboddle(self.session, keep_session=True, params={"format": "json"}, query={"custom": results_file_id}):
            json_result = default_controller.get_custom_data()

        # Then : We get a redirect
        result = json.loads(json_result)
        assert result["success"] == "false"
        # assert result["message"] == "[Errno 13] Permission denied: '/mnt/result'"

    # def testCustomDataOneFile(self):
    #     request.vars['custom'] = str(fake_result_id)
    #     resp = gluon.contrib.simplejson.loads(get_custom_data())
    #     self.assertEqual(resp['sample_name'], 'Sample %s' % fake_result_id)

    # def testCustomData(self):
    #     request.vars['custom'] = [str(fake_result_id2), str(fake_result_id2)]
    #     resp = gluon.contrib.simplejson.loads(get_custom_data())
    #     print(resp)
    #     if resp.has_key('success') and resp['success'] == 'false':
    #        self.assertTrue(defs.PORT_FUSE_SERVER is None, 'get_custom_data returns error without fuse server')
    #     else:
    #         self.assertEqual(resp['reads']['segmented'][0], resp['reads']['segmented'][2], "get_custom_data doesn't return a valid json")
    #         self.assertEqual(resp['sample_name'], 'Compare samples')

    # def testSaveAnalysis(self):
    #     class emptyClass( object ):
    #         pass

    #     plop = emptyClass()
    #     analysis = tempfile.NamedTemporaryFile()
    #     analysis.write('{"toto": 1, "bla": [], "clones": {"id": "AATA", "tag": 0}}')
    #     setattr(plop, 'file',  open(analysis.name, 'rb'))
    #     setattr(plop, 'filename', 'plopapou')

    #     request.vars['fileToUpload'] = plop
    #     request.vars['patient'] = fake_patient_id
    #     request.vars['info'] = "fake info"
    #     request.vars['samples_id'] = str(fake_file_id)
    #     request.vars['samples_info'] = "fake sample info"
    #     request.vars['sample_set_id'] = fake_sample_set_id

    #     resp = save_analysis()

    #     resp = get_analysis_from_sample_set(fake_sample_set_id)
    #     self.assertEqual(len(resp), 1, "should have one analysis for that patient %d"%len(resp))
    #     self.assertEqual(resp[0].sample_set_id, fake_sample_set_id, "get_analysis doesn't have the correct sample_set")

    # def _get_fake_analysis_file(self):
    #     file = tempfile.TemporaryFile()
    #     file.write('{"toto": 1, "bla": [], "clones": {"id": "AATA", "tag": 0}}')
    #     file.seek(0)
    #     return file

    # def testGetCleanAnalysis(self):
    #     analysis = get_clean_analysis(self._get_fake_analysis_file())
    #     self.assertEqual(analysis['clones']['id'], 'AATA', 'Bad clone id')
    #     self.assertEqual(analysis['tags'], {}, 'Bad tags entry in analysis')
    #     self.assertEqual(analysis['vidjil_json_version'], '2014.09', 'Bad vidjil_json_version string')
