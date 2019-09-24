import requests
import gluon.contrib.simplejson

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def index():
    return gluon.contrib.simplejson.dumps("index()")

def proxy_request(url, headers):
    if request.env.request_method == "POST":
        payload = dict(request.post_vars)
        
        if 'Session' in payload.keys():
            del payload['Session']

        response = requests.post(url, headers = headers, data=payload)
        if response.status_code == requests.codes.ok:
            return response
        return gluon.contrib.simplejson.dumps("the site returned an invalid response")
    return gluon.contrib.simplejson.dumps("improper method")
   

def imgt():
    return proxy_request("http://www.imgt.org/IMGT_vquest/analysis")

