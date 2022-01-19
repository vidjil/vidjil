from gluon import current
import gluon.contrib.simplejson

def error_message(msg):
    res = {"success" : "false", "message" : msg}
    current.log.error(res)
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
