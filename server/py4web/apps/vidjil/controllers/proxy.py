# -*- coding: utf-8 -*-
import json
import requests
import re
from py4web import action, request

##################################
# HELPERS
##################################

ASSIGN_SUBSET_WEBSITE = "https://bat.infspire.org"
ASSIGN_SUBSET_URL = ASSIGN_SUBSET_WEBSITE + "/arrest/assignsubsets/"
ASSIGN_SUBSET_CGI = ASSIGN_SUBSET_WEBSITE + \
    "/cgi-bin/arrest/assignsubsets_html.pl"

IMGT_URL = "https://www.imgt.org/IMGT_vquest/analysis"


def assign_subset_response_handler(response):
    #  (end of) Response example
    # progress below...</label><br>no input?<br><META HTTP-EQUIV=refresh CONTENT="0;URL=/arrest/assignsubsets_results/0000974579.html">
    url = re.search(r'URL=([^"]+)', str(response.content))
    if url:
        return '<META HTTP-EQUIV=refresh CONTENT="0;URL=' + ASSIGN_SUBSET_WEBSITE + url.group(1) + '">'
    return response


def proxy_request(url, headers={}, handler=None):
    if request.method == "POST":
        forms = dict(request.forms)

        if 'Session' in forms.keys():
            del forms['Session']

        response = requests.post(url, headers=headers, data=forms)
        if response.status_code == requests.codes.ok:
            if handler:
                return handler(response)
            return response
        else:
            return json.dumps("the site returned an invalid response")
    else:
        return json.dumps("improper method")


##################################
# CONTROLLERS
##################################
@action("/vidjil/proxy/index", method=["POST", "GET"])
def index():
    return json.dumps("index()")


@action("/vidjil/proxy/imgt", method=["POST"])
def imgt():
    return proxy_request(IMGT_URL)


@action("/vidjil/proxy/assign_subsets", method=["POST"])
def assign_subsets():
    return proxy_request(ASSIGN_SUBSET_CGI, {'referer': ASSIGN_SUBSET_URL}, assign_subset_response_handler)
