import json
import re

import requests
from py4web import action, request

from ..common import cors, log

##################################
# HELPERS
##################################

ASSIGN_SUBSET_WEBSITE = "https://bat.infspire.org"
ASSIGN_SUBSET_URL = ASSIGN_SUBSET_WEBSITE + "/arrest/assignsubsets/"
ASSIGN_SUBSET_CGI = ASSIGN_SUBSET_WEBSITE + "/cgi-bin/arrest/assignsubsets_html.pl"

IMGT_URL = "https://www.imgt.org/IMGT_vquest/analysis"

REQUEST_CONNECT_TIMEOUT = 30  # in seconds, see https://requests.readthedocs.io/en/latest/user/advanced/#timeouts
REQUEST_READ_TIMEOUT = 180  # in seconds, see https://requests.readthedocs.io/en/latest/user/advanced/#timeouts


def assign_subset_response_handler(response):
    #  (end of) Response example
    # progress below...</label><br>no input?<br><META HTTP-EQUIV=refresh CONTENT="0;URL=/arrest/assignsubsets_results/0000974579.html">
    url = re.search(r'URL=([^"]+)', str(response.content))
    if url:
        return (
            '<META HTTP-EQUIV=refresh CONTENT="0;URL='
            + ASSIGN_SUBSET_WEBSITE
            + url.group(1)
            + '">'
        )
    return response


def proxy_request(url, headers={}, handler=None):
    if request.method == "POST":
        forms = dict(request.forms)

        if "Session" in forms.keys():
            del forms["Session"]

        try:
            response = requests.post(
                url,
                headers=headers,
                data=forms,
                timeout=(REQUEST_CONNECT_TIMEOUT, REQUEST_READ_TIMEOUT),
            )
        except requests.exceptions.Timeout as timeout_error:
            log.error(f"Timeout when trying to contact the website: {timeout_error=}")
            return json.dumps("Timeout when trying to contact the website")
        except requests.exceptions.SSLError as ssl_error:
            log.error(f"SSL error when trying to contact the website: {ssl_error=}")
            return json.dumps("SSL error when trying to contact the website")
        except Exception as exception:
            log.error(
                f"Unexpected error when trying to contact the website: {exception=}"
            )
            return json.dumps("Unexpected error when trying to contact the website")
        if response.status_code == requests.codes.ok:
            if handler:
                return handler(response)
            return response
        else:
            return json.dumps("The website returned an invalid response")
    else:
        return json.dumps("Improper method, only POST can be used")


##################################
# CONTROLLERS
##################################


@action("/vidjil/proxy/imgt", method=["POST"])
@action.uses(cors)
def imgt():
    return proxy_request(IMGT_URL)


@action("/vidjil/proxy/assign_subsets", method=["POST"])
@action.uses(cors)
def assign_subsets():
    return proxy_request(
        ASSIGN_SUBSET_CGI,
        {"referer": ASSIGN_SUBSET_URL},
        assign_subset_response_handler,
    )
