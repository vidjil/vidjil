import importlib.util
import os
import sys

from py4web import action, request

from .. import settings
from ..common import auth, db, log
from ..modules import vidjil_utils
from ..modules.controller_utils import error_message
from ..modules.sampleSets import SampleSets
from ..user_groups import get_default_creation_group

##################################
# HELPERS
##################################

ACCESS_DENIED = "access denied"


##################################
# CONTROLLERS
##################################
@action("/vidjil/clonedb/index", method=["POST", "GET"])
@action.uses(db, auth.user)
@vidjil_utils.jsontransformer
def index():
    """
    The request should receive two parameters:
    - sequences: a list of comma-separated DNA sequences to be searched in the CloneDB
    - sample_set_id: the sample set we're coming from
    """
    if not auth.user:
        return {"error": "Access denied"}

    # request.query -> request.form (POST)
    if (
        request.forms.get("sequences") is None
        or request.forms.get("sequences") == ""
        or request.forms.get("sample_set_id") is None
    ):
        return error_message("Malformed request")

    return search_clonedb(
        request.forms.get("sequences").split(","),
        int(request.forms.get("sample_set_id")),
    )


def search_clonedb(sequences, sample_set_id):
    # /clonedb mounted on usr/share/clonedb
    clone_db_path = os.path.abspath(settings.DIR_CLONEDB)
    server_path = os.path.join(clone_db_path, "server")
    if not os.path.isdir(server_path):
        raise FileNotFoundError(f"The server directory {server_path} does not exist.")

    sys.path.insert(1, server_path)
    import grep_clones  # type: ignore  # noqa: I001

    spec = importlib.util.spec_from_file_location(
        "clonedb", os.path.join(server_path, "clonedb.py")
    )
    clonedb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(clonedb)

    results = []
    parent_group = get_default_creation_group(auth)[1]
    # Do not call load_permissions any longer as the cache is not active with py4web
    # If there are perf issues, check if we should re-create a cache or
    # in our case use load_permission to replace calls to get_info_of_viewable_sample_set later
    # auth.load_permissions(PermissionEnum.read.value, "sample_set")
    # auth.load_permissions(PermissionEnum.anon.value, "sample_set")
    options = clonedb.build_grep_clones_options(
        {
            "sequence": sequences[0] + " -sample_set:%d" % sample_set_id,
            "index": f"clonedb_{parent_group}",
        }
    )
    options += sequences[1:]
    args = grep_clones.parser.parse_args(options)
    log.debug(
        f"Searching {len(sequences)} sequences in CloneDB for group {parent_group}"
    )
    try:
        # Get occurrences for each sample with information on its corresponding sample sets
        occurrences = grep_clones.launch_search(args)
    except ValueError as e:
        log.error(f"Value error when running clonedb: {e}")
        return error_message("Are you sure your account has an enabled CloneDB?")
    except Exception as e:
        log.error(f"Error when running clonedb: {e}")
        return error_message(str(e))

    sample_set_ids = [
        sid
        for occurrences_one_seq in occurrences
        for occ in occurrences_one_seq
        if "tags" in occ and "sample_set" in occ["tags"]
        for sid in occ["tags"]["sample_set"]
    ]

    sample_sets = SampleSets(sample_set_ids)
    sample_names = sample_sets.get_names()
    sample_tags = sample_sets.get_tag_names()

    for occurrences_one_seq in occurrences:
        for occ in occurrences_one_seq:
            if "tags" in occ and "sample_set" in occ["tags"]:
                info = get_info_of_viewable_sample_set(
                    [int(sample_id) for sample_id in occ["tags"]["sample_set"]],
                    int(occ["tags"]["config_id"][0]),
                    sample_names,
                    sample_tags,
                )
                occ["tags"]["sample_set_viewable"] = info["viewable"]
                occ["tags"]["sample_set_name"] = info["name"]
                occ["tags"]["sample_tags"] = info["sample_tags"]
                config_db = db.config[occ["tags"]["config_id"][0]]
                occ["tags"]["config_name"] = [config_db.name if config_db else None]
        results.append(occurrences_one_seq)
    return results


def get_info_of_viewable_sample_set(sample_sets, config, sample_names, sample_tags):
    info = {"viewable": [], "name": [], "sample_tags": []}
    for sample_id in sample_sets:
        viewable = auth.can_view_sample_set(sample_id, auth.user_id)
        info["viewable"].append(viewable)
        if viewable:
            info["name"].append(sample_names.get(sample_id))
            tags = sample_tags.get(sample_id)
            if tags:
                info["sample_tags"].append(["#" + row for row in tags])
            else:
                info["sample_tags"].append([])
        else:
            info["name"].append(None)
    return info
