# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import datetime
import json

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"

def download():
    return response.download(request, db)
