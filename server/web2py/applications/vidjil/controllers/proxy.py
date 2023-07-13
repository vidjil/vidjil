import requests
import re
import gluon.contrib.simplejson

ASSIGN_SUBSET_WEBSITE = "https://bat.infspire.org/"
ASSIGN_SUBSET_URL = ASSIGN_SUBSET_WEBSITE+"/arrest/assignsubsets/"

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def assign_subset_response(response):
    #  (end of) Response example
    # progress below...</label><br>no input?<br><META HTTP-EQUIV=refresh CONTENT="0;URL=/arrest/assignsubsets_results/0000974579.html">
    url = re.search(r'URL=([^"]+)', str(response.content))
    if url:
        return '<META HTTP-EQUIV=refresh CONTENT="0;URL='+ASSIGN_SUBSET_WEBSITE+url.group(1)+'">'
    return response
    
def index():
    return gluon.contrib.simplejson.dumps("index()")

def proxy_request(url, headers={}, handler = None):
    if request.env.request_method == "POST":
        payload = dict(request.post_vars)
        
        if 'Session' in payload.keys():
            del payload['Session']

        response = requests.post(url, headers = headers, data=payload)
        if response.status_code == requests.codes.ok:
            if handler:
                return handler(response)
            return response
        return gluon.contrib.simplejson.dumps("the site returned an invalid response")
    return gluon.contrib.simplejson.dumps("improper method")

def imgt():
    return proxy_request("https://www.imgt.org/IMGT_vquest/analysis")

def assign_subsets():
    return proxy_request("https://bat.infspire.org/cgi-bin/arrest/assignsubsets_html.pl",
                         {'referer': ASSIGN_SUBSET_URL},
                         assign_subset_response)
