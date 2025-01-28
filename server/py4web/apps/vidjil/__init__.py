# check compatibility
import py4web

assert py4web.check_compatible("0.1.20240428.1")

# by importing db you expose it to the _dashboard/dbadmin
from .models import db

# by importing controllers you expose the actions defined in it
from .modules import zmodel_factory, tag, vidjil_utils, sampleSet, sampleSetList, dictobj, jstree
from .controllers import  default, sample_set, file, results_file, group, metrics, my_account, pre_process, config, user, log, notification, admin, tag, proxy, segmenter, auth
