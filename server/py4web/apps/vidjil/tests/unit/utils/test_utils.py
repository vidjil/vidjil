import pathlib
from py4web import DAL


class UploadHelper():
    def __init__(self, file, filename: str) -> None:
        self.file = file
        self.filename = filename


def get_resources_path() -> str:
    resources_path = pathlib.Path(pathlib.Path(__file__).parent.absolute(),
                                  "..",
                                  "resources")
    return resources_path


def get_resources_log_path() -> str:
    resources_logs_path = pathlib.Path(get_resources_path(), "logs")
    return resources_logs_path


def get_results_path() -> str:
    results_path = pathlib.Path(get_resources_path(), "results")
    results_path.mkdir(exist_ok=True)
    return results_path


def get_user_group_id(db: DAL, user_id: int) -> int:
    user_group_id = db(db.auth_group.role == f"user_{user_id}").select()[0].id
    return user_group_id
