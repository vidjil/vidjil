# -*- coding: utf-8 -*-
from sys import modules
from .. import defs
from ..modules import vidjil_utils
from ..modules import tag
from ..modules.stats_decorator import *
from ..modules.sampleSet import SampleSet, get_set_group
from ..modules.sampleSets import SampleSets
from ..modules.sampleSetList import SampleSetList, filter_by_tags
from ..modules.sequenceFile import get_associated_sample_sets, get_sequence_file_sample_sets
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.zmodel_factory import ModelFactory
from ..user_groups import get_default_creation_group, get_involved_groups
from ..VidjilAuth import VidjilAuth
from io import StringIO
import json
import requests
import time
import os
from py4web import action, request, abort, redirect, URL, Field, HTTP, response
from collections import defaultdict
import math

from ..common import db, session, T, flash, cache, authenticated, unauthenticated, auth, log


##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"

def proxy_request(url, headers={}):
    if request.env.request_method == "POST":
        payload = dict(request.post_vars)
        
        if 'Session' in payload.keys():
            del payload['Session']

        response = requests.post(url, headers = headers, data=payload)
        if response.status_code == requests.codes.ok:
            return response
        return json.dumps("the site returned an invalid response")
    return json.dumps("improper method")


##################################
# CONTROLLERS
##################################
@action("/vidjil/proxy/index", method=["POST", "GET"])
def index():
    return json.dumps("index()")

@action("/vidjil/proxy/imgt", method=["POST", "GET"])
def imgt():
    return proxy_request("https://www.imgt.org/IMGT_vquest/analysis")

@action("/vidjil/proxy/asign_subset", method=["POST", "GET"])
def assign_subsets():
    return proxy_request("http://tools.bat.infspire.org/cgi-bin/arrest/assignsubsets_html.pl",
                         {'referer': "http://tools.bat.infspire.org/arrest/assignsubsets/"})
