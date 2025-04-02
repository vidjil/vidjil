# check compatibility
import py4web

assert py4web.check_compatible("0.1.20240428.1")

# ruff: noqa: E402 F401 I001


# Import modules first to resolve dependencies issues
from .modules import (
    dictobj,
    jstree,
    sampleSet,
    sampleSetList,
    tag_utils,
    vidjil_utils,
    zmodel_factory,
)

# by importing controllers you expose the actions defined in it
from .controllers import (
    admin,
    auth,
    config,
    default,
    file,
    group,
    log,
    metrics,
    my_account,
    notification,
    pre_process,
    proxy,
    results_file,
    sample_set,
    segmenter,
    tag,
    user,
)

# by importing db you expose it to the _dashboard/dbadmin
from .models import db
