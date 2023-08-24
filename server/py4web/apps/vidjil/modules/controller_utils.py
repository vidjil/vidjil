# -*- coding: utf-8 -*-

#from gluon import current
import json

def error_message(msg):
    res = {"success" : "false", "message" : msg}
    #current.log.error(res)
    return json.dumps(res, separators=(',',':'))
