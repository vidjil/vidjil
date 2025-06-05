import os
import unittest

from py4web.core import Session, _before_request

from ....common import auth, db
from ....controllers import metrics as metrics_controller
from ....modules.vidjil_utils import init_db_helper
from ..utils import db_manipulation_utils
from ..utils.omboddle import Omboddle

PWD_TEST = "pwdtestuser"
USER_TEST = "user@test.com"


class TestMetricsController(unittest.TestCase):
    def get_metrics(self, metrics_set: str) -> dict:
        if metrics_set not in ["fast", "long", "all"]:
            raise Exception("not correct metrics set")

        with Omboddle(self.session, keep_session=True):
            if metrics_set == "fast":
                result = metrics_controller.metricsFast()
            if metrics_set == "long":
                result = metrics_controller.metricsLong()
            if metrics_set == "all":
                result = metrics_controller.metricsAll()
        return result

    def getMetricsByName(self, metric: str) -> dict:
        with Omboddle(self.session, keep_session=True, params={"metric": metric}):
            result = metrics_controller.metricsByName()
        return result

    def setUp(self):
        # init env
        os.environ["METRICS_USER_PASSWORD"] = "foobartest"
        os.environ["METRICS_USER_EMAIL"] = "metrics@vidjil.org"
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5]
        )
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
        pwd = os.getenv("METRICS_USER_PASSWORD")
        email = os.getenv("METRICS_USER_EMAIL")
        self.assertEqual(pwd, "foobartest")
        self.assertEqual(email, "metrics@vidjil.org")

    def test_metrics_message(self):
        # Given : logged in as metrics user
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")

        # When : getting fast results
        result_fast = self.get_metrics("fast")
        # Then : message is "status METRICS"
        assert result_fast["message"] == "status METRICS"

        # When : getting long results
        result_long = self.get_metrics("long")
        # Then : message is "status METRICS"
        assert result_long["message"] == "status METRICS"

        # When : getting all results
        result_all = self.get_metrics("all")
        # Then : message is "status METRICS"
        assert result_all["message"] == "status METRICS"

        # When : getting metrics by name
        result_by_name = self.getMetricsByName("config_analysis")
        # Then : message is "status METRICS"
        assert result_by_name["message"] == "status METRICS"

    def test_metrics_patients(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_patient(1, 2)

        # When
        result = self.getMetricsByName("set_patients_count")

        # Then
        assert result is not None
        assert result["set_patients_count"] == 1

    def test_metrics_users(self):
        # Given
        db_manipulation_utils.add_user(self.session, "new", "user", USER_TEST, PWD_TEST)
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")

        # When
        result = self.getMetricsByName("users_count")

        # Then
        assert result["users_count"] == 3

    def test_metrics_patients_by_user(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_patient(1, 1)

        # When
        result = self.getMetricsByName("set_patients_by_user")

        # Then
        assert result["set_patients_by_user"][0]["user_id"] == 1
        assert result["set_patients_by_user"][0]["count"] == 1
        assert result["set_patients_by_user"][1]["user_id"] == 2
        assert result["set_patients_by_user"][1]["count"] == 2
        assert len(result["set_patients_by_user"]) == 2

    def test_metrics_not_metrics(self):
        # Given
        db_manipulation_utils.add_user(self.session, "new", "user", USER_TEST, PWD_TEST)
        db_manipulation_utils.log_in(self.session, USER_TEST, PWD_TEST)

        # When
        result = self.getMetricsByName("config_analysis")

        # Then
        assert result is not None
        assert result["message"] == "status NOT in metrics group"

    def test_metrics_groups(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_group("group_test")

        # When
        result = self.getMetricsByName("group_count")

        # Then
        assert result["group_count"] == 5

    def test_metrics_config(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_config()
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "COMPLETED", [1, 1], "2024-01-01 10:00:00"
        )
        db_manipulation_utils.add_results_file(sequence_file_id)
        db_manipulation_utils.add_results_file(sequence_file_id)

        # When
        result = self.getMetricsByName("config_analysis")

        # Then
        assert result["config_analysis"][0]["results_file"]["config_id"] == 1
        assert (
            result["config_analysis"][0]["config"]["name"] == "default + extract reads"
        )
        assert result["config_analysis"][0]["config"]["program"] == "vidjil"
        assert result["config_analysis"][0]["_extra"]['COUNT("results_file"."id")'] == 2

    def test_metrics_config_by_groups(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "COMPLETED", [1, 1], "2024-01-01 10:00:00"
        )
        db_manipulation_utils.add_results_file(sequence_file_id, 1)
        db_manipulation_utils.add_results_file(sequence_file_id, 2)
        db_manipulation_utils.add_results_file(sequence_file_id, 2)

        # When
        result = self.getMetricsByName("config_analysis")

        # Then
        assert result["config_analysis"][0]["results_file"]["config_id"] == 1
        assert (
            result["config_analysis"][0]["config"]["name"] == "default + extract reads"
        )
        assert result["config_analysis"][0]["config"]["program"] == "vidjil"
        assert result["config_analysis"][0]["_extra"]['COUNT("results_file"."id")'] == 1
        assert result["config_analysis"][1]["_extra"]['COUNT("results_file"."id")'] == 2

    def test_metrics_sequence_file(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id)

        # When
        result_group = self.getMetricsByName("group_count")
        result_sequence = self.getMetricsByName("sequence_count")

        # Then
        assert result_group["group_count"] == 4
        assert result_sequence["sequence_count"] == 1

    def test_metrics_result(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "COMPLETED", [1, 1], "2024-01-01 10:00:00"
        )
        db_manipulation_utils.add_results_file(sequence_file_id)

        # When
        result_group = self.getMetricsByName("group_count")
        result_results = self.getMetricsByName("results_count")

        # Then
        assert result_group["group_count"] == 4
        assert result_results["results_count"] == 1

    def test_metrics_login(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")

        # When
        result = self.getMetricsByName("login_count")

        # Then
        assert result["login_count"][0]["_extra"]['COUNT("auth_event"."id")'] == 3

    def test_metrics_run_count(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_run(-1)
        # When
        result = self.getMetricsByName("set_runs_count")
        # Then
        assert result["set_runs_count"] == 1

        # Given
        db_manipulation_utils.add_run(-1)
        db_manipulation_utils.add_run(-1)
        # When
        result = self.getMetricsByName("set_runs_count")
        # Then
        assert result["set_runs_count"] == 3

    def test_metrics_generic_count(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_run(-1)
        db_manipulation_utils.add_generic(-1)
        # When
        result = self.getMetricsByName("set_generics_count")
        # Then
        assert result["set_generics_count"] == 1

        # Given
        db_manipulation_utils.add_generic(-1)
        db_manipulation_utils.add_generic(-1)
        # When
        result = self.getMetricsByName("set_generics_count")
        # Then
        assert result["set_generics_count"] == 3

    def test_metrics_run_by_user(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_run(-1, 2)
        db_manipulation_utils.add_generic(-1, 2)
        # When
        result = self.getMetricsByName("set_runs_by_user")
        # Then
        set_runs_by_user = dict(result["set_runs_by_user"][0])
        assert len(result["set_runs_by_user"]) == 1
        assert set_runs_by_user["user_id"] == 2
        assert set_runs_by_user["count"] == 1

        # Given: Add 2 more runs
        db_manipulation_utils.add_run(-1, 2)
        db_manipulation_utils.add_run(-1, 2)
        # When
        result2 = self.getMetricsByName("set_runs_by_user")
        # Then
        set_runs_by_user2 = dict(result2["set_runs_by_user"][0])
        assert len(result2["set_runs_by_user"]) == 1
        assert set_runs_by_user2["user_id"] == 2
        assert set_runs_by_user2["count"] == 3

    def test_status_analysis(self):
        # Given
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        sequence_file_id = db_manipulation_utils.add_sequence_file(sample_set_id)
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "COMPLETED", [1, 1], "2024-01-01 10:00:00"
        )
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "PENDING", [1, 1], "2024-01-01 10:00:00"
        )
        db_manipulation_utils.add_scheduler_task(
            "pre_process", sequence_file_id, "PENDING", [1, 1], "2024-01-01 10:00:00"
        )

        # When
        result = self.getMetricsByName("status_analysis")

        # Then
        assert (
            result["status_analysis"][0]["_extra"]['COUNT("scheduler_task"."id")'] == 1
        )
        assert result["status_analysis"][0]["scheduler_task"]["status"] == "COMPLETED"

        assert (
            result["status_analysis"][1]["_extra"]['COUNT("scheduler_task"."id")'] == 2
        )
        assert result["status_analysis"][1]["scheduler_task"]["status"] == "PENDING"

    def test_config_analysis_by_users(self):
        # Given
        config_id_1 = db_manipulation_utils.add_config(name="test_config_1")
        config_id_2 = db_manipulation_utils.add_config(name="test_config_2")
        config_id_3 = db_manipulation_utils.add_config(name="test_config_3")

        # Fill user 1
        sample_set_id = db_manipulation_utils.add_patient(1, 2)[1]
        sequence_file_id_1 = db_manipulation_utils.add_sequence_file(sample_set_id)
        sequence_file_id_2 = db_manipulation_utils.add_sequence_file(sample_set_id)
        sequence_file_id_3 = db_manipulation_utils.add_sequence_file(sample_set_id)
        db_manipulation_utils.add_results_file(sequence_file_id_1, config_id_1)
        db_manipulation_utils.add_results_file(sequence_file_id_1, config_id_3)
        db_manipulation_utils.add_results_file(sequence_file_id_2, config_id_1)
        db_manipulation_utils.add_results_file(sequence_file_id_3, config_id_1)
        db_manipulation_utils.add_results_file(sequence_file_id_3, config_id_2)
        db_manipulation_utils.add_results_file(sequence_file_id_3, config_id_3)

        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")

        # When
        result = self.getMetricsByName("config_analysis_by_users_patients")

        # Then
        assert len(result["config_analysis_by_users_patients"]) == 3

        first = dict(result["config_analysis_by_users_patients"][0])
        assert first["user_id"] == 2
        assert first["config_id"] == config_id_1
        assert first["count"] == 3

        second = dict(result["config_analysis_by_users_patients"][1])
        assert second["user_id"] == 2
        assert second["config_id"] == config_id_2
        assert second["count"] == 1

        third = dict(result["config_analysis_by_users_patients"][2])
        assert third["user_id"] == 2
        assert third["config_id"] == config_id_3
        assert third["count"] == 2

        # Given
        # Fill user 3
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 2)
        u1_sample_set_id_1 = db_manipulation_utils.add_patient(2, user_1_id)[1]
        u1_sample_set_id_2 = db_manipulation_utils.add_patient(3, user_1_id)[1]
        u1_sequence_file_id_1 = db_manipulation_utils.add_sequence_file(
            u1_sample_set_id_1, user_1_id
        )
        u1_sequence_file_id_2 = db_manipulation_utils.add_sequence_file(
            u1_sample_set_id_2, user_1_id
        )
        db_manipulation_utils.add_results_file(u1_sequence_file_id_1, config_id_1)
        db_manipulation_utils.add_results_file(u1_sequence_file_id_1, config_id_2)
        db_manipulation_utils.add_results_file(u1_sequence_file_id_2, config_id_2)

        # Fill user 4
        user_2_id = db_manipulation_utils.add_indexed_user(self.session, 3)
        u2_sample_set_id_1 = db_manipulation_utils.add_patient(4, user_2_id)[1]
        u2_sample_set_id_2 = db_manipulation_utils.add_patient(5, user_2_id)[1]
        u2_sample_set_id_3 = db_manipulation_utils.add_patient(6, user_2_id)[1]
        u2_sequence_file_id_1 = db_manipulation_utils.add_sequence_file(
            u2_sample_set_id_1, user_2_id
        )
        u2_sequence_file_id_2 = db_manipulation_utils.add_sequence_file(
            u2_sample_set_id_1, user_2_id
        )
        u2_sequence_file_id_3 = db_manipulation_utils.add_sequence_file(
            u2_sample_set_id_2, user_2_id
        )
        u2_sequence_file_id_4 = db_manipulation_utils.add_sequence_file(
            u2_sample_set_id_3, user_2_id
        )
        db_manipulation_utils.add_results_file(u2_sequence_file_id_1, config_id_1)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_1, config_id_2)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_1, config_id_3)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_2, config_id_1)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_2, config_id_2)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_3, config_id_3)
        db_manipulation_utils.add_results_file(u2_sequence_file_id_4, config_id_3)

        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")

        # When
        result_full = self.getMetricsByName("config_analysis_by_users_patients")

        # Then
        assert len(result_full["config_analysis_by_users_patients"]) == 8

        r1 = dict(result_full["config_analysis_by_users_patients"][0])
        r2 = dict(result_full["config_analysis_by_users_patients"][1])
        r3 = dict(result_full["config_analysis_by_users_patients"][2])
        r4 = dict(result_full["config_analysis_by_users_patients"][3])
        r5 = dict(result_full["config_analysis_by_users_patients"][4])
        r6 = dict(result_full["config_analysis_by_users_patients"][5])
        r7 = dict(result_full["config_analysis_by_users_patients"][6])
        r8 = dict(result_full["config_analysis_by_users_patients"][7])

        assert r1["config_id"] == config_id_1
        assert r1["user_id"] == 2
        assert r1["count"] == 3

        assert r2["config_id"] == config_id_1
        assert r2["user_id"] == user_1_id
        assert r2["count"] == 1

        assert r3["config_id"] == config_id_1
        assert r3["user_id"] == user_2_id
        assert r3["count"] == 2

        assert r4["config_id"] == config_id_2
        assert r4["user_id"] == 2
        assert r4["count"] == 1

        assert r5["config_id"] == config_id_2
        assert r5["user_id"] == user_1_id
        assert r5["count"] == 2

        assert r6["config_id"] == config_id_2
        assert r6["user_id"] == user_2_id
        assert r6["count"] == 2

        assert r7["config_id"] == config_id_3
        assert r7["user_id"] == 2
        assert r7["count"] == 2

        assert r8["config_id"] == config_id_3
        assert r8["user_id"] == user_2_id
        assert r8["count"] == 3

    def test_config_analysis_by_groups(self):
        # Given
        db_manipulation_utils.add_config(name="test_config_1")
        db_manipulation_utils.add_config(name="test_config_2")
        db_manipulation_utils.add_config(name="test_config_3")
        # Fill user 1
        db_manipulation_utils.add_patient(1, 2)
        db_manipulation_utils.add_patient(2, 2)
        db_manipulation_utils.add_patient(3, 2)
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        # When
        result = self.getMetricsByName("set_patients_by_group")
        # Then
        sets_group_4 = dict(result["set_patients_by_group"][0])
        assert len(result["set_patients_by_group"]) == 1
        assert sets_group_4["group_id"] == 4
        assert sets_group_4["count"] == 3

        # Given
        # Add 2 new users
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 2)
        user_2_id = db_manipulation_utils.add_indexed_user(self.session, 3)
        db_manipulation_utils.add_user_to_group(5, user_2_id)
        db_manipulation_utils.remove_user_from_group(6, user_2_id)
        db_manipulation_utils.add_patient(1, user_1_id)
        db_manipulation_utils.add_patient(2, user_1_id)
        db_manipulation_utils.add_patient(3, user_2_id)
        db_manipulation_utils.add_patient(4, user_2_id)
        db_manipulation_utils.add_patient(5, user_2_id)
        db_manipulation_utils.add_patient(6, user_2_id)
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        # When
        result = self.getMetricsByName("set_patients_by_group")
        # Then
        sets_group_4 = dict(result["set_patients_by_group"][0])
        assert len(result["set_patients_by_group"]) == 2
        assert sets_group_4["group_id"] == 4
        assert sets_group_4["count"] == 3
        sets_group_5 = dict(result["set_patients_by_group"][1])
        assert sets_group_5["group_id"] == 5
        assert sets_group_5["count"] == 6

    def test_sequence_by_user(self):
        # Given
        user_1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        user_2_id = db_manipulation_utils.add_indexed_user(self.session, 2)
        db_manipulation_utils.log_in(self.session, "metrics@vidjil.org", "foobartest")
        sample_set_id_1 = db_manipulation_utils.add_patient(1, 2)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id_1, 2)
        db_manipulation_utils.add_sequence_file(sample_set_id_1, 2)
        db_manipulation_utils.add_sequence_file(sample_set_id_1, 2)
        sample_set_id_2 = db_manipulation_utils.add_patient(2, user_1_id)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id_2, user_1_id)
        db_manipulation_utils.add_sequence_file(sample_set_id_2, user_1_id)
        sample_set_id_3 = db_manipulation_utils.add_patient(3, user_2_id)[1]
        db_manipulation_utils.add_sequence_file(sample_set_id_3, user_2_id)
        db_manipulation_utils.add_sequence_file(sample_set_id_3, user_2_id)
        db_manipulation_utils.add_sequence_file(sample_set_id_3, user_2_id)
        db_manipulation_utils.add_sequence_file(sample_set_id_3, user_2_id)

        # When
        result = self.getMetricsByName("sequence_by_user")

        # Then
        assert (
            len(result["sequence_by_user"]) == 3
        )  # 3 users account with sequences files

        data_user_metrics = next(
            res for res in result["sequence_by_user"] if res["user_id"] == 2
        )
        assert data_user_metrics["count_sequence"] == 3

        data_user_1 = next(
            res for res in result["sequence_by_user"] if res["user_id"] == user_1_id
        )
        assert data_user_1["count_sequence"] == 2

        data_user_2 = next(
            res for res in result["sequence_by_user"] if res["user_id"] == user_2_id
        )
        assert data_user_2["count_sequence"] == 4
