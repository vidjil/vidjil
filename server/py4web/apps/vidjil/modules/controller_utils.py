import json


def error_message(msg, log=None):
    res = {"success": "false", "message": msg}
    if log is not None:
        log.error(res)
    return json.dumps(res, separators=(',', ':'))
