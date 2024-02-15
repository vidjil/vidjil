""" Helper to manipulate db for tests"""
import json
import pathlib

from . import test_utils
from .omboddle import Omboddle
from ....controllers import auth as auth_controller
from ....common import db
from ....modules.permission_enum import PermissionEnum
from .... import defs
from .... import tasks
from ...functional.db_initialiser import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
from py4web.core import Session


# User management

def log_in_as_default_admin(session: Session) -> None:
    """Log in with the default admin email and password

    Args:
        session (Session): session to use (user will be registered in session)
    """
    log_in(session, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)


def log_in(session: Session, email: str, password: str) -> None:
    """Log in

    Args:
        session (Session): session to use (user will be registered in session)
        email (str): user email
        password (str): user password
    """
    with Omboddle(session, keep_session=True, params={"login": email, "password": password}):
        auth_controller.submit()


def logout(session: Session) -> None:
    """Log out of a given session

    Args:
        session (Session): Session to log out
    """
    with Omboddle(session, keep_session=True, params={"login": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}):
        auth_controller.logout()


def add_user(session: Session, first_name: str, last_name: str, email: str, password: str) -> int:
    """Add a user

    Args:
        session (Session): session to user
        first_name (str): first name
        last_name (str): last name
        email (str): email
        password (str): password

    Returns:
        int: user id in db
    """
    user_id = -1
    log_in_as_default_admin(session)
    with Omboddle(session,
                  keep_session=True,
                  params={"first_name": first_name,
                          "last_name": last_name,
                          "email": email,
                          "password": password,
                          "confirm_password": password}):
        response = auth_controller.register_form()
        user_id = json.loads(response)["user_id"]
    logout(session)
    return user_id


def get_indexed_user_first_name(user_index: int) -> str:
    """Get first name used for indexed user

    Args:
        user_index (int): user index

    Returns:
        str: corresponding first name
    """
    return f"First name {user_index}"


def get_indexed_user_last_name(user_index: int) -> str:
    """Get last name used for indexed user

    Args:
        user_index (int): user index

    Returns:
        str: corresponding first name
    """
    return f"Last name {user_index}"


def get_indexed_user_email(user_index: int) -> str:
    """Get email used for indexed user

    Args:
        user_index (int): user index

    Returns:
        str: corresponding email
    """
    return f"user{user_index}@email.com"


def get_indexed_user_password(user_index: int) -> str:
    """Get password used for indexed user

    Args:
        user_index (int): user index

    Returns:
        str: corresponding password
    """
    return f"AVeryComplexPassword!{user_index}"


def add_indexed_user(session: Session, user_index: int) -> int:
    """Add a user in the database with the given index

    Args:
        session (Session): Session to user
        user_index (int): user index

    Returns:
        int: user id in db
    """
    return add_user(session,
                    get_indexed_user_first_name(user_index),
                    get_indexed_user_last_name(user_index),
                    get_indexed_user_email(user_index),
                    get_indexed_user_password(user_index))

# Patient management


def add_patient(patient_number: int, user_id: int = -1, auth=None):
    """Add a patient to a user

    Args:
        patient_id (int): patient number (for unique naming purpose)
        user_id (int, optional): user id - if -1, takes the first user. Defaults to -1.
        auth (VidjilAuth, optional): auth to add rights, if None, do not set rights. Defaults to None.

    Returns:
        tuple[int, int]: corresponding patient id and sample set id
    """
    if user_id == -1:
        user_id = db(db.auth_user).select().first().id

    sample_set_id = db.sample_set.insert(
        creator=user_id, sample_type=defs.SET_TYPE_PATIENT)
    patient_id = db.patient.insert(id_label="", first_name="patient", last_name=patient_number, birth="2010-10-10",
                                   info=f"test patient {patient_number} for user {user_id}", sample_set_id=sample_set_id, creator=user_id)
    if (auth != None):
        user_group_id = auth.user_group(user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'patient', patient_id)

    return patient_id, sample_set_id

# Sequence file management


def add_sequence_file(patient_id: int = -1, user_id: int = -1, use_real_file: bool = False, preprocess: bool = False, preprocess_conf_id: int=-1) -> int:
    """Add a fake sequence file to a patient

    Args:
        patient_id (int, optional): patient id. Defaults to -1.
        user_id (int, optional): user id. Defaults to -1.
        use_real_file (bool, optional): If set to false, use a simple string value. If set to True, really load a file in db. Default to False
        preprocess (bool, optional): Swtich preprocess status. If set to False, don't fill preprocess fields of db. If set to True, fill them with values given (preprocess conf and task id; load 2 file instead of one. Default to False
        preprocess_conf_id (int, optional): Preprocess conf id. if not set, don't used

    Returns:
        int: corresponding sequence file id
    """

    if patient_id == -1:
        patient_id = db(db.patient).select().first().id
    sample_set_id = db.patient[patient_id].sample_set_id

    if user_id == -1:
        user_id = db(db.auth_user).select().first().id

    if use_real_file:
        filename = "analysis-example.vidjil"
        file = pathlib.Path(test_utils.get_resources_path(),
                            "analysis-example.vidjil")
        with file.open("rb") as stream:
            data_file = db.sequence_file.data_file.store(stream, filename)
            data_file2 = db.sequence_file.data_file2.store(stream, filename) if preprocess else None
            preprocess_file = db.sequence_file.preprocess_file.store(stream, filename) if preprocess else None
    else:
        filename = "test_file.fasta"
        data_file = "/test/sequence/test_file.fasta"
        data_file2 = "/test/sequence/test_file2.fasta" if preprocess else None
        preprocess_file = "/test/sequence/preprocess_test_file.fasta" if preprocess else None

    sequence_file_id = db.sequence_file.insert(patient_id=patient_id,
                                               sampling_date="2010-10-10",
                                               info="testf",
                                               filename=filename,
                                               size_file=1024,
                                               network=False,
                                               provider=user_id,
                                               data_file=data_file,
                                               data_file2=data_file2,
                                               pre_process_id=preprocess_conf_id if preprocess else None,
                                               pre_process_file=preprocess_file if preprocess else None,
                                               )
    db.sample_set_membership.insert(
        sample_set_id=sample_set_id, sequence_file_id=sequence_file_id)

    return sequence_file_id

# config management


TEST_CONFIG_NAME = "test_config_plapipou"


def add_config():
    config_id = db.config.insert(name=TEST_CONFIG_NAME,
                                 info="plop_info",
                                 command="plop_command",
                                 fuse_command="plop_fuse_command",
                                 program="none",
                                 classification=None)
    return config_id

# Results file management


def add_results_file(sequence_file_id: int = -1, config_id: int = -1, scheduler_task_id: int = -1, use_real_file: bool = False) -> int:
    """Add a fake result file

    Args:
        sequence_file_id (int, optional): sequence file id to use. If -1, use the first sequence file id in DB. Defaults to -1.
        config_id (int, optional): config id to use. If -1, use the first config id in DB. Defaults to -1.
        scheduler_task_id (int, optional): scheduler task id to use. If -1, use the first scheduler task id in DB. Defaults to -1.

    Returns:
        int: id of the added results file
    """
    if sequence_file_id == -1:
        sequence_file_id = db(db.sequence_file).select().first().id

    if config_id == -1:
        config_id = db(db.config).select().first().id

    if scheduler_task_id == -1:
        scheduler_task_id = db(db.scheduler_task).select().first().id

    if use_real_file:
        filename = "analysis-example.vidjil"
        file = pathlib.Path(test_utils.get_resources_path(),
                            "analysis-example.vidjil")
        with file.open("rb") as stream:
            data_file = db.results_file.data_file.store(stream, filename)
    else:
        data_file = "/test/sequence/test_file.fasta"

    results_file_id = db.results_file.insert(sequence_file_id=sequence_file_id,
                                             config_id=config_id,
                                             run_date="2010-10-10 10:10:10",
                                             scheduler_task_id=scheduler_task_id,
                                             data_file=data_file)
    return results_file_id

# pre-process management


def add_pre_process() -> int:
    """Add a fake pre-process

    Returns:
        int: corresponding pre_process_id
    """
    pre_process_id = db.pre_process.insert(name="foobar",
                                           command="cat &file1& &file2& > &result&",
                                           info="barfoo")
    return pre_process_id

# Fused file management


def add_fused_file(sample_set_id: int = -1, sequence_file_id: int = -1, config_id: int = -1, scheduler_task_id: int = -1, use_real_file: bool = False) -> int:
    """Add a fake fused file

    Args:
        sequence_file_id (int, optional): sequence file id to use. If -1, use the first sequence file id in DB. Defaults to -1.
        config_id (int, optional): config id to use. If -1, use the first config id in DB. Defaults to -1.
        scheduler_task_id (int, optional): scheduler task id to use. If -1, use the first scheduler task id in DB. Defaults to -1.

    Returns:
        int: id of the added fused file
    """
    if sample_set_id == -1:
        sample_set_id = db(db.sample_set).select().first().id

    if sequence_file_id == -1:
        sequence_file_id = db(db.sequence_file).select().first().id

    if config_id == -1:
        config_id = db(db.config).select().first().id

    if scheduler_task_id == -1:
        scheduler_task_id = db(db.scheduler_task).select().first().id

    if use_real_file:
        filename = "analysis-example.vidjil"
        file = pathlib.Path(test_utils.get_resources_path(),
                            "analysis-example.vidjil")
        with file.open("rb") as stream:
            fused_file = db.fused_file.fused_file.store(stream, filename)
    else:
        fused_file = "/test/fuse/test_file.fasta"

    fused_file_id = db.fused_file.insert(
        config_id=config_id,
        sample_set_id=sample_set_id,
        fuse_date="2010-10-10 10:10:10",
        status=tasks.STATUS_COMPLETED,
        sequence_file_list="%d_" % sequence_file_id,
        fused_file=fused_file)
    return fused_file_id


def add_scheduler_task(task_name: str, sequence_file_id: int, status: str, args: list, start_time: str="2024-01-01 10:00:00") -> int:
    """Add a fake scheduler task in db

    Args:
        task_name (str): String to pick between pre_process and process
        sequence_file_id (int): Sequence file id of the task
        status (str): String to pick between COMPLETED and PENDING
        args (list): Aray depending of task name value:
            * For process: [sequence_file_id, configuration_id, result_id, None]
            * For preprocess: [preprocess_conf_id, sequence_file_id]
        start_time (str, optional): A date string value for order; default to "2024-01-01 10:00:00"

    Returns:
        int: id of the added task
    """
    task_id = db.scheduler_task.insert(
        # application_name
        task_name=task_name,
        # group_name
        status=status,
        # enabled
        args=args,
        start_time=start_time
    )

    if task_name == "pre_process":
        # insert in sequence_file table values for preprocess
        db.sequence_file[sequence_file_id].update(dict(preprocess_task_id=task_id))

    return task_id