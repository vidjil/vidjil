# check compatibility
import py4web

assert py4web.check_compatible("0.1.20190709.1")

# by importing db you expose it to the _dashboard/dbadmin
from .models import db

# by importing controllers you expose the actions defined in it
from . import controllers_default
from . import controllers_components
from .controllers import  default, sample_set, file, results_file, group, my_account, pre_process, config, user, log, notification, admin, tag, proxy, segmenter, auth
#from .controllers import sampleset_generic, sampleset_patient, sampleset_run,sampleset,
from .modules import zmodel_factory, tag, vidjil_utils, sampleSet, sampleSetList

# optional parameters
__version__ = "0.0.0"
__author__ = "you <you@example.com>"
__license__ = "anything you want"


def test(x=10):
    """to call this funciton from shell: py4web call apps examples.test --args '{"x": 100}'"""
    print("x = %r" % x)
