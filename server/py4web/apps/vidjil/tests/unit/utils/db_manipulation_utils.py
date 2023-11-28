""" Helper to manipulate db for tests"""
import json
import pathlib

from . import test_utils
from .omboddle import Omboddle
from ....controllers import auth as auth_controller
from ....common import db
from ....modules.permission_enum import PermissionEnum
from .... import defs
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
        user_group_id = test_utils.get_user_group_id(db, user_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'sample_set', sample_set_id)
        auth.add_permission(
            user_group_id, PermissionEnum.access.value, 'patient', patient_id)

    return patient_id, sample_set_id

# Sequence file management


def add_sequence_file(patient_id: int = -1, user_id: int = -1, use_real_file: bool = False) -> int:
    """Add a fake sequence file to a patient

    Args:
        patient_id (int, optional): patient id. Defaults to -1.
        user_id (int, optional): user id. Defaults to -1.

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
    else:
        filename = "test_file.fasta"
        data_file = "/test/sequence/test_file.fasta"

    sequence_file_id = db.sequence_file.insert(patient_id=patient_id,
                                               sampling_date="2010-10-10",
                                               info="testf",
                                               filename=filename,
                                               size_file=1024,
                                               network=False,
                                               provider=user_id,
                                               data_file=data_file)
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


def add_results_file(sequence_file_id: int = -1, config_id: int = -1, scheduler_task_id: int = -1) -> int:
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

    results_file_id = db.results_file.insert(sequence_file_id=sequence_file_id,
                                             config_id=config_id,
                                             run_date="2010-10-10 10:10:10",
                                             scheduler_task_id=scheduler_task_id,
                                             data_file="test_results_file")
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
