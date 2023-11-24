import pathlib


def get_resources_path() -> str:
    resources_path = pathlib.Path(pathlib.Path(__file__).parent.absolute(),
                                  "..",
                                  "resources")
    return resources_path



def get_resources_log_path() -> str:
    resources_logs_path = pathlib.Path(get_resources_path(), "logs")
    return resources_logs_path
