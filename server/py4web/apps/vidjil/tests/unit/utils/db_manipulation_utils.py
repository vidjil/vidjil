""" Helper to manipulate db for tests"""
import json
from .omboddle import Omboddle
from ....controllers import auth as auth_controller
from ....common import db
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


def add_patient(patient_number: int, user_id: int) -> int:
    """Add a patient to a user

    Args:
        patient_id (int): patient number (for unique naming purpose)
        user_id (int): user id

    Returns:
        int: corresponding sample set id
    """
    sample_set_id = db.sample_set.insert(
        sample_type=defs.SET_TYPE_PATIENT)
    patient_id_in_db = db.patient.insert(id_label="", first_name="patient", last_name=patient_number, birth="2010-10-10",
                                         info=f"test patient {patient_number} for user {user_id}", sample_set_id=sample_set_id, creator=user_id)
    return patient_id_in_db


# Sequence file management

def add_sequence_file_to_patient(patient_id: int) -> int:
    """Add a fake sequence file to a patient

    Args:
        patient_id (int): patient id

    Returns:
        int: corresponding sequence file id
    """
    sequence_file_id = db.sequence_file.insert(sampling_date="2010-10-10",
                                               info="testf",
                                               filename="test_file.fasta",
                                               size_file=1024,
                                               network=False,
                                               data_file="test_sequence_file")
    db.sample_set_membership.insert(
        sample_set_id=patient_id, sequence_file_id=sequence_file_id)
    return sequence_file_id
