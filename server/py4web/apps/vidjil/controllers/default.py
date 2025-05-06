# This file is released under public domain and you can use without limitations

#########################################################################
# This is a sample controller
# - index is the default action of any application
# - user is required for authentication and authorization
# - download is for downloading files uploaded in the db (does streaming)
# - call exposes all registered services (none by default)
#########################################################################

import datetime
import json
import logging
import os
import re
import time
from ast import literal_eval

from ombott import static_file
from py4web import URL, action, request, response

from .. import settings, tasks
from ..common import T, auth, cors, db, log, scheduler, session
from ..controllers.group import add_default_group_permissions
from ..modules import sampleSet, vidjil_utils, zmodel_factory
from ..modules.analysis_file import get_analysis_data
from ..modules.controller_utils import error_message
from ..modules.sampleSet import get_sample_set_id_from_results_file, get_set_group
from ..modules.sequenceFile import check_space, get_patient_id

# if request.environ.get("HTTP_ORIGIN") :
#    response.headers['Access-Control-Allow-Origin'] = request.environ.get("HTTP_ORIGIN")
#    response.headers['Access-Control-Allow-Credentials'] = 'true'
#    response.headers['Access-Control-Max-Age'] = 86400


#########################################################################
# return the default index page for vidjil (redirect to the browser)
@vidjil_utils.jsontransformer
def index():
    return dict(message=T("hello world"))


#########################################################################
# return the view default/help.html
@vidjil_utils.jsontransformer
def help():
    return dict(message=T("help i'm lost"))


#########################################################################
# default home page
@action("/vidjil/default/home.html", method=["POST", "GET"])
@action.uses("default/index.html", db, auth.user, cors)
@vidjil_utils.jsontransformer
def home():
    if auth.is_admin():
        redirect = URL("admin/index")
    else:
        redirect = vidjil_utils.get_patient_redirect_url()
    res = {"redirect": redirect}
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/whoami", method=["POST", "GET"])
@action.uses(db, auth.user, session)
@vidjil_utils.jsontransformer
def whoami():
    """
    Return some informations about logged in user (id, names, groups, admin status)
    Use for API
    """

    if auth.user:
        user_data = {
            "id": auth.user_id,
            "email": auth.current_user.get("email"),
            "uuid": session["uuid"],
            "admin": auth.is_admin(),
        }

        membership = auth.table_membership()
        permission = auth.table_permission()
        action = "create"
        groups = db(
            (db.auth_user.id == user_data["id"])
            & (membership.user_id == user_data["id"])
            & (membership.group_id == permission.group_id)
            & (permission.record_id == 0)
            & (permission.table_name == "sample_set")
            & (db.auth_membership.group_id == db.auth_group.id)
            & (permission.name == action)
        ).select()
        transform_groups = []
        for elt in groups:
            transform_groups.append(
                {
                    "role": elt["auth_group"].role,
                    "id": str(elt["auth_group"].id),
                    "description": elt["auth_group"].description,
                }
            )

        user_data["groups"] = transform_groups
        return user_data
    return {}


@action("/vidjil/default/logger", method=["POST", "GET"])
@action.uses(cors)
@vidjil_utils.jsontransformer
def logger():
    """Log to the server"""
    res = {"success": "false", "message": "/client/: %s" % request.query["msg"]}

    try:
        lvl = int(request.query["lvl"])
    except Exception:
        lvl = logging.INFO
    log.log(lvl, res)
    return res


@action("/vidjil/default/init_db", method=["POST", "GET"])
@action.uses("default/init_db.html", db, auth, cors)
@vidjil_utils.jsontransformer
def init_db():
    if db(db.auth_user.id > 0).count() == 0:
        return dict(
            message=T("create admin user and initialize database"), auth=auth, db=db
        )
    res = {"redirect": "vidjil/auth/login"}
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/init_db_form", method=["POST", "GET"])
@action.uses(db, auth, cors)
def init_db_form():
    if db(db.auth_user.id > 0).count() == 0:
        error = ""
        force = False
        if request.params["email"] == "":
            error += "You must specify an admin email address, "
        if len(request.params["password"]) < 8:
            error += "Password must be at least 8 characters long, "
        if request.params["confirm_password"] != request.params["password"]:
            error += "Passwords didn't match"
        if "force" in request.params and request.params["force"].lower() == "true":
            force = True
        if error == "":
            vidjil_utils.init_db_helper(
                db,
                auth,
                force=force,
                admin_email=request.params["email"],
                admin_password=request.params["password"],
            )
        else:
            res = {"success": "false", "message": error}
            log.error(res)
            return json.dumps(res, separators=(",", ":"))

    res = {"redirect": "vidjil/auth/login"}
    return json.dumps(res, separators=(",", ":"))


def init_from_csv():
    if db(db.auth_user.id > 0).count() == 0:
        res = {"success": "true", "message": "Importing " + settings.DB_BACKUP_FILE}
        log.info(res)

        try:
            db.import_from_csv_file(open(settings.DB_BACKUP_FILE, "rb"))
            # db.scheduler_task.truncate()
            # db.scheduler_run.truncate()
        except Exception as e:
            res = {"success": "false", "message": "!" + str(e)}
            log.error(res)
            raise

        res = {"success": "true", "message": "coucou"}
        log.info(res)


#########################################################################
# add a scheduller task to run vidjil on a specific sequence file
# need sequence_file_id, config_id
# need patient admin permission
@action("/vidjil/default/run_request", method=["POST", "GET"])
@action.uses(db, auth.user)
def run_request():
    error_space = check_space(settings.DIR_RESULTS, "Runs")
    if error_space is not None:
        return error_space

    error = []
    if "sequence_file_id" not in request.query:
        error.append("id sequence file needed")
    elif "sample_set_id" not in request.query:
        error.append("sample set ID needed")
    if "config_id" not in request.query:
        error.append("id config needed")
        id_config = None
    else:
        id_config = int(request.query["config_id"])
    if not auth.can_process_sample_set(int(request.query["sample_set_id"])):
        error.append("permission needed")

    id_sample_set = int(request.query["sample_set_id"])

    extra_info = ""

    if "grep_reads" in request.query:
        grep_reads = request.query["grep_reads"]
        extra_info += "to get reads "
    else:
        grep_reads = None

    if not auth.can_modify_sample_set(id_sample_set):
        error.append(
            "you do not have permission to launch process for this sample_set ("
            + str(id_sample_set)
            + ")"
        )

    if id_config:
        if not auth.can_use_config(id_config):
            error.append(
                "you do not have permission to launch process for this config ("
                + str(id_config)
                + ")"
            )
        else:
            extra_info += "with config " + db.config[id_config].name

    if error:
        res = {
            "success": "false",
            "message": "default/run_request " + extra_info + " : " + ", ".join(error),
        }
        log.error(res)
        return json.dumps(res, separators=(",", ":"))

    res = tasks.schedule_run(request.query["sequence_file_id"], id_config, grep_reads)
    log.info(
        "run requested " + extra_info,
        extra={
            "user_id": auth.user_id,
            "record_id": request.query["sequence_file_id"],
            "table_name": "sequence_file",
        },
    )
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/run_all_request", method=["POST", "GET"])
@action.uses(db, auth.user)
def run_all_request():
    error = ""
    extra_info = ""
    error_space = check_space(settings.DIR_RESULTS, "Runs")
    if error_space is not None:
        return error_space

    id_sample_set = int(request.query["sample_set_id"])

    if "sequence_file_ids" not in request.query:
        error += "sequence file ids required "
    if "sample_set_id" not in request.query:
        error += "sample set ID required "
    elif not auth.can_process_sample_set(request.query["sample_set_id"]):
        error += (
            "you do not have permission to launch process for this sample_set ("
            + str(id_sample_set)
            + "), "
        )

    if "config_id" not in request.query:
        error += "id config needed, "
    else:
        extra_info += "with config " + db.config[request.query["config_id"]].name
        if not auth.can_use_config(request.query["config_id"]):
            error += (
                "you do not have permission to launch process for this config ("
                + str(request.query["config_id"])
                + "), "
            )

    if error != "":
        res = {
            "success": "false",
            "message": "default/run_all_request " + extra_info + " : " + error,
        }
        log.error(res)
        return json.dumps(res, separators=(",", ":"))

    id_sample_set = request.query["sample_set_id"]
    ids_sequence_file = request.query["sequence_file_ids"]
    # if only one element, see as simple string without array (even if request was a list)
    if type(ids_sequence_file) is int or type(ids_sequence_file) is str:
        ids_sequence_file = [ids_sequence_file]
    ids_sequence_file = [int(i) for i in ids_sequence_file]
    id_config = request.query["config_id"]

    # Filter the sequence_file IDS: we only keep sequence file IDs that do belong to the sample set (as we only checked the permission for this sample set)
    sequence_file_ids = [
        i.id
        for i in db(
            (db.sample_set.id == id_sample_set)
            & (db.sequence_file.id.belongs(ids_sequence_file))
        ).select(
            db.sequence_file.id,
            join=[
                db.sample_set_membership.on(
                    db.sample_set_membership.sample_set_id == db.sample_set.id
                ),
                db.sequence_file.on(
                    db.sequence_file.id == db.sample_set_membership.sequence_file_id
                ),
            ],
        )
    ]

    log.info(
        "run_all requested for {} files ".format(len(sequence_file_ids)) + extra_info,
        extra={"user_id": auth.user_id, "sample_set_id": id_sample_set},
    )
    for s_id in sequence_file_ids:
        tasks.schedule_run(s_id, id_config)
    return json.dumps({"success": "true", "redirect": "reload"}, separators=(",", ":"))


def run_extra():
    task = scheduler.queue_task(
        "compute_extra",
        pvars=dict(
            id_file=request.query["sequence_file_id"],
            id_config=request.query["config_id"],
            min_threshold=5,
        ),
    )
    res = {"success": "true", "processId": task.id}
    log.debug(str(res))
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/checkProcess", method=["POST", "GET"])
@action.uses(db, auth.user)
def checkProcess():
    results_file = db(db.results_file.id == request.query["processId"]).select().first()
    task = db.scheduler_task[results_file["scheduler_task_id"]]

    args = literal_eval(task.args)
    if args[3] is not None and re.match(r"^[acgtnACGTN]+$", args[3]):
        # We check a grep_reads process
        seq_file = db(db.sequence_file.id == int(args[0])).select().first()["filename"]
        is_fasta = (
            True if (seq_file.endswith(".fasta") or seq_file.endswith(".fa")) else False
        )  # TODO: and BAM ?
        results_file_format = "fa" if is_fasta else "fastq"
    else:
        results_file_format = "vidjil"

    msg = ""
    sample_set_id = -1
    if results_file:
        sample_set_id = get_sample_set_id_from_results_file(results_file.id)
    if not results_file or not auth.can_view_sample_set(sample_set_id):
        msg = "You don't have access to this sample"
    if sample_set_id > -1 and task.status == tasks.STATUS_COMPLETED:
        if results_file.data_file is None:
            res = {"status": tasks.STATUS_RUNNING}
        else:
            res = {
                "success": "true",
                "status": task.status,
                "data": {
                    "data_file": results_file.data_file,
                    "result_id": task.id,
                    "format": results_file_format,
                },
                "processId": task.id,
            }
    else:
        if len(msg) > 0:
            res = {
                "success": "false",
                "status": tasks.STATUS_FAILED,
                "message": msg,
                "processId": task.id,
            }
        else:
            res = {"success": "true", "status": task.status, "processId": task.id}

    log.debug(str(res))
    return json.dumps(res, separators=(",", ":"))


#########################################################################
# return .data file
# need sample_set/patient, config
# need sample_set admin or read permission
@action("/vidjil/default/get_data", method=["POST", "GET"])
@action.uses(db, auth.user)
def get_data():
    if not auth.user:
        res = {
            "redirect": URL(
                "auth",
                "login",
                args="login",
                scheme=True,
                vars=dict(
                    _next=URL(
                        "default",
                        "get_data",
                        scheme=True,
                        vars=dict(
                            sample_set_id=request.query["sample_set_id"],
                            config=request.query["config"],
                        ),
                    )
                ),
            )
        }
        return json.dumps(res, separators=(",", ":"))

    error = ""

    if "patient" in request.query:
        request.query["sample_set_id"] = db.patient[
            request.query["patient"]
        ].sample_set_id

    download = False
    if "filename" in request.query:
        download = True

    if "run" in request.query:
        request.query["sample_set_id"] = db.run[request.query["run"]].sample_set_id

    if "sample_set_id" not in request.query or request.query["sample_set_id"] is None:
        error += "id sampleset file needed, "
    else:
        if not auth.can_view_sample_set(int(request.query["sample_set_id"])):
            error += (
                "you do not have permission to consult this sample_set ("
                + str(request.query["sample_set_id"])
                + ")"
            )
    if "config" not in request.query:
        error += "id config needed, "

    sample_set = db.sample_set[request.query["sample_set_id"]]

    query = (
        db(
            (db.fused_file.sample_set_id == request.query["sample_set_id"])
            & (db.fused_file.config_id == request.query["config"])
        )
        .select(db.fused_file.ALL, orderby=db.fused_file.fuse_date)
        .last()
    )
    if query is not None:
        fused_file = settings.DIR_RESULTS + "/" + query.fused_file
    else:
        error += "file not found"

    if error == "":
        f = open(fused_file, "r")
        data = json.loads(f.read())
        f.close()

        config_name = db.config[request.query["config"]].name
        command = db.config[request.query["config"]].command

        # Create helpers to get specialized sample set data
        model_factory = zmodel_factory.ModelFactory()
        set_types = [
            sampleSet.SET_TYPE_PATIENT,
            sampleSet.SET_TYPE_RUN,
            sampleSet.SET_TYPE_GENERIC,
        ]
        helpers = {}
        for set_type in set_types:
            helpers[set_type] = model_factory.get_instance(set_type)

        # Get info from specialized sample set
        model_factory = zmodel_factory.ModelFactory()
        sample_set_specific_data = helpers[sample_set.sample_type].get_data(
            request.query["sample_set_id"]
        )
        log_reference_id = sample_set_specific_data.id
        name = helpers[sample_set.sample_type].get_name(sample_set_specific_data)
        data["dataFileName"] = name + " (" + config_name + ")"
        data["info"] = sample_set_specific_data.info
        data["sample_name"] = name
        data["group_id"] = get_set_group(request.query["sample_set_id"])
        specific_id = "patient_id"
        if sample_set.sample_type == sampleSet.SET_TYPE_GENERIC:
            specific_id = "generic_id"
        elif sample_set.sample_type == sampleSet.SET_TYPE_RUN:
            specific_id = "run_id"
        data[specific_id] = sample_set_specific_data.id

        log_query = db(
            (db.user_log.record_id == log_reference_id)
            & (db.user_log.table_name == sample_set.sample_type)
        ).select(db.user_log.ALL, orderby=db.user_log.created)

        data["logs"] = []
        for row in log_query:
            data["logs"].append({"message": row.msg, "created": str(row.created)})

        # Get info from db
        query = db(
            (db.sample_set.id == request.query["sample_set_id"])
            & (db.sample_set.id == db.sample_set_membership.sample_set_id)
            & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.results_file.sequence_file_id == db.sequence_file.id)
            & (db.results_file.hidden == False)  # noqa: E712
            & (db.results_file.config_id == request.query["config"])
        ).select(
            db.sequence_file.ALL,
            db.results_file.ALL,
            db.sample_set.id,
            orderby=db.sequence_file.id | ~db.results_file.run_date,
        )

        query2 = {}
        # convert query results as a dict with file name as key
        for row in query:
            query2[row.sequence_file.data_file] = row

        data["sample_set_id"] = sample_set.id

        data["config_name"] = config_name
        data["samples"]["info"] = []
        data["samples"]["timestamp"] = []
        data["samples"]["sequence_file_id"] = []
        data["samples"]["results_file_id"] = []
        data["samples"]["config_id"] = []
        data["samples"]["names"] = []
        data["samples"]["db_key"] = []
        data["samples"]["id"] = []
        data["samples"]["patient_id"] = []
        data["samples"]["sample_name"] = []
        data["samples"]["run_id"] = []
        data["samples"]["commandline"] = []
        data["samples"]["associated_sets_names"] = []

        for i in range(len(data["samples"]["original_names"])):
            original_name = data["samples"]["original_names"][i].split("/")[-1]

            if "distributions" in data and "repertoires" in data["distributions"]:
                data["distributions"]["repertoires"][original_name] = data[
                    "distributions"
                ]["repertoires"][data["samples"]["original_names"][i]]
                del data["distributions"]["repertoires"][
                    data["samples"]["original_names"][i]
                ]
            data["samples"]["original_names"][i] = original_name
            data["samples"]["config_id"].append(request.query["config"])
            data["samples"]["db_key"].append("")
            data["samples"]["commandline"].append(command)

            found_sequence_file = False
            found_result_file = False  # For AIRR files
            found_filename = False  # for Vidjil files
            if original_name in query2:
                found_sequence_file = True
            else:
                # Sometimes, result_file is the key to use, and not sequence_file (AIRR/clntab import)
                for sequence_file in query2:
                    # AIRR case
                    if original_name == query2[sequence_file].results_file.data_file:
                        found_result_file = sequence_file
                        break
                    # Vidjil file case
                    elif (
                        os.path.splitext(original_name)[0]
                        == os.path.splitext(
                            query2[sequence_file].sequence_file.filename
                        )[0]
                    ):  # ne marche pas a cause de l'extension
                        found_filename = sequence_file
                        break

            if found_sequence_file or found_result_file or found_filename:
                if found_sequence_file:  # standard case
                    row = query2[original_name]
                elif found_filename:  # case import vidjil file
                    row = query2[found_filename]
                else:  # case AIRR/clntab data
                    row = query2[found_result_file]

                # Use row to fill fields
                data["samples"]["names"].append(
                    row.sequence_file.filename.split(".")[0]
                )
                data["samples"]["sample_name"].append(row.sequence_file.id)
                data["samples"]["results_file_id"].append(row.results_file.id)
                data["samples"]["info"].append(row.sequence_file.info)
                data["samples"]["timestamp"].append(
                    str(row.sequence_file.sampling_date)
                )
                data["samples"]["sequence_file_id"].append(row.sequence_file.id)
                data["samples"]["id"].append(row.sequence_file.id)
                data["samples"]["patient_id"].append(
                    get_patient_id(row.sequence_file.id)
                )
                data["samples"]["run_id"].append(row.sequence_file.id)

                # Get other samples names
                associated_sets_names = []
                other_sets = db(
                    (db.sample_set_membership.sequence_file_id == row.sequence_file.id)
                    & (
                        db.sample_set_membership.sample_set_id
                        != request.query["sample_set_id"]
                    )
                    & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                ).select(
                    db.sample_set_membership.sample_set_id.with_alias("sample_set_id"),
                    db.sample_set.sample_type.with_alias("sample_type"),
                )
                for other_set in other_sets:
                    sample_set_specific_data = helpers[other_set.sample_type].get_data(
                        other_set.sample_set_id
                    )
                    name = helpers[other_set.sample_type].get_name(
                        sample_set_specific_data
                    )
                    associated_sets_names.append(name)
                data["samples"]["associated_sets_names"].append(associated_sets_names)

            else:
                data["samples"]["names"].append("deleted")
                data["samples"]["sample_name"].append("deleted")
                data["samples"]["results_file_id"].append("")
                data["samples"]["info"].append(
                    "this file has been deleted from the database, info relative to this sample are no longer available"
                )
                data["samples"]["timestamp"].append("None")
                data["samples"]["sequence_file_id"].append("")
                data["samples"]["id"].append("")
                data["samples"]["patient_id"].append("")
                data["samples"]["run_id"].append("")
                data["samples"]["associated_sets_names"].append([])

        log.debug(
            "get_data (%s) c%s -> %s (%s)"
            % (
                request.query["sample_set_id"],
                request.query["config"],
                fused_file,
                "downloaded" if download else "streamed",
            )
        )
        log.info(
            "load sample",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["sample_set_id"],
                "table_name": "sample_set",
            },
        )

        dumped_json = json.dumps(data, separators=(",", ":"))

        if download:
            response.headers["Content-Type"] = (
                "application/json"  # Removed to force file download
            )
            response.headers["Content-Disposition"] = (
                f'attachment; filename="{str(request.query["filename"])}"'
            )
            return dumped_json

        return dumped_json
    else:
        res = {
            "success": "false",
            "message": "get_data (%s) c%s : %s "
            % (request.query["sample_set_id"], request.query["config"], error),
        }
        log.error(res)
        return json.dumps(res, separators=(",", ":"))


#########################################################################
@action("/vidjil/default/get_custom_data", method=["POST", "GET"])
@action.uses(db, auth.user)
def get_custom_data():
    if not auth.user:
        res = {
            "redirect": URL("default", "user", args="login", scheme=True)
        }  # TODO _next
        return json.dumps(res, separators=(",", ":"))

    error = ""

    samples = []

    if "custom" not in request.query:
        error += "no file selected, "
    else:
        samples = (
            request.query["custom"]
            if type(request.query["custom"]) is not str
            else [request.query["custom"]]
        )
        if not samples:
            error += "incorrect query, need at least one sample"
        else:
            for id in samples:
                log.debug("id = '%s'" % str(id))
                sequence_file_id = db.results_file[id].sequence_file_id
                sample_set_id = (
                    db((db.sample_set_membership.sequence_file_id == sequence_file_id))
                    .select(db.sample_set_membership.sample_set_id)
                    .first()
                    .sample_set_id
                )
                if not auth.can_view_sample_set(sample_set_id):
                    error += (
                        "you do not have permission to consult this element ("
                        + str(sample_set_id)
                        + ")"
                    )

    if error == "":
        try:
            data = tasks.custom_fuse(samples)
        except IOError as io_error:
            return error_message(str(io_error))

        generic_info = (
            "Compare samples" if len(samples) > 1 else "Sample %s" % samples[0]
        )
        data["sample_name"] = generic_info
        data["dataFileName"] = generic_info
        data["info"] = generic_info
        data["samples"]["original_names"] = []
        data["samples"]["timestamp"] = []
        data["samples"]["info"] = []
        data["samples"]["commandline"] = []
        data["samples"]["sequence_file_id"] = []

        for id in samples:
            sequence_file_id = db.results_file[id].sequence_file_id
            sample_set = (
                db(
                    (db.sequence_file.id == sequence_file_id)
                    & (db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                    & (db.sample_set.id == db.sample_set_membership.sample_set_id)
                    & (
                        db.sample_set.sample_type.belongs(
                            [
                                sampleSet.SET_TYPE_PATIENT,
                                sampleSet.SET_TYPE_RUN,
                                sampleSet.SET_TYPE_GENERIC,
                            ]
                        )
                    )
                )
                .select(db.sample_set.id, db.sample_set.sample_type)
                .first()
            )

            patient_run = (
                db(db[sample_set.sample_type].sample_set_id == sample_set.id)
                .select()
                .first()
            )
            config_id = db.results_file[id].config_id
            name = (
                vidjil_utils.anon_ids([patient_run.id])[0]
                if sample_set.sample_type == sampleSet.SET_TYPE_PATIENT
                else patient_run.name
            )
            filename = db.sequence_file[sequence_file_id].filename
            data["samples"]["original_names"].append(
                name + "_" + filename + " (" + id + ")"
            )
            data["samples"]["timestamp"].append(
                str(db.sequence_file[sequence_file_id].sampling_date)
            )
            data["samples"]["info"].append(db.sequence_file[sequence_file_id].info)
            data["samples"]["commandline"].append(db.config[config_id].command)
            data["samples"]["sequence_file_id"].append(sequence_file_id)

        log.info("load custom data #TODO log db")

        return json.dumps(data, separators=(",", ":"))

    else:
        res = {"success": "false", "message": "default/get_custom_data : " + error}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))


#########################################################################
# return .analysis file
# need sample_set_id or patient_id or run_id
# need patient admin or read permission
@action("/vidjil/default/get_analysis", method=["POST", "GET"])
@action.uses(db, auth.user)
def get_analysis():
    error = ""

    if "custom" in request.query and "sample_set_id" not in request.query:
        res = {"success": "true"}
        return json.dumps(res, separators=(",", ":"))

    if "patient" in request.query:
        request.query["sample_set_id"] = db.patient[
            request.query["patient"]
        ].sample_set_id

    download = False
    if "filename" in request.query:
        download = True

    if "run" in request.query:
        request.query["sample_set_id"] = db.run[request.query["run"]].sample_set_id

    if "sample_set_id" not in request.query or request.query["sample_set_id"] is None:
        error += "id sample_set file needed, "
    if not auth.can_view_sample_set(int(request.query["sample_set_id"])):
        error += (
            "you do not have permission to consult this sample_set ("
            + str(request.query["sample_set_id"])
            + ")"
        )

    if error == "":
        # récupération des infos se trouvant dans le fichier .analysis
        analysis_data = get_analysis_data(request.query["sample_set_id"])
        dumped_json = json.dumps(analysis_data, separators=(",", ":"))

        log.info(
            "load analysis",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["sample_set_id"],
                "table_name": "sample_set",
            },
        )

        if download:
            response.headers["Content-Type"] = "application/json"
            response.headers["Content-Disposition"] = (
                f'attachment; filename="{str(request.query["filename"])}"'
            )
            return dumped_json

        return dumped_json

    else:
        res = {"success": "false", "message": "default/get_analysis : " + error}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))


#########################################################################
# upload .analysis file and store it on the database
# need patient_id, fileToUpload
# need patient admin permission
@action("/vidjil/default/save_analysis", method=["POST", "GET"])
@action.uses(db, auth.user)
def save_analysis():
    error = ""

    if "patient" in request.params:
        request.params["sample_set_id"] = db.patient[
            request.params["patient"]
        ].sample_set_id

    if "run" in request.params:
        request.params["sample_set_id"] = db.run[request.params["run"]].sample_set_id

    if not auth.can_save_sample_set(request.params["sample_set_id"]):
        error += "you do not have permission to save changes on this sample set"

    if error == "":
        f = request.files["fileToUpload"]
        ts = time.time()

        sample_set_id = request.params["sample_set_id"]
        db.analysis_file.insert(
            analysis_file=db.analysis_file.analysis_file.store(f.file, f.filename),
            sample_set_id=sample_set_id,
            analyze_date=datetime.datetime.fromtimestamp(ts).strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
        )

        sample_type = db.sample_set[sample_set_id].sample_type
        if "info" in request.params and request.params["info"] is not None:
            if sample_type == sampleSet.SET_TYPE_PATIENT:
                db(db.patient.sample_set_id == sample_set_id).update(
                    info=request.params["info"]
                )

            if sample_type == sampleSet.SET_TYPE_RUN:
                db(db.run.sample_set_id == sample_set_id).update(
                    info=request.params["info"]
                )

        if (
            "samples_id" in request.params
            and request.params["samples_id"] is not None
            and "samples_info" in request.params
            and request.params["samples_info"] is not None
        ):
            ids = request.params["samples_id"].split(",")
            infos = request.params["samples_info"].split(",")

            # TODO find way to remove loop ?
            for i in range(0, len(ids)):
                if len(ids[i]) > 0:
                    db(db.sequence_file.id == int(ids[i])).update(info=infos[i])

        # patient_name = db.patient[request.params['patient']].first_name + " " + db.patient[request.params['patient']].last_name

        res = {"success": "true", "message": "(%s): analysis saved" % (sample_set_id)}
        log.info(res, extra={"user_id": auth.user_id})

        log.info(
            "save analysis",
            extra={
                "user_id": auth.user_id,
                "record_id": sample_set_id,
                "table_name": "sample_set",
            },
        )
        return json.dumps(res, separators=(",", ":"))
    else:
        res = {"success": "false", "message": error}
        log.error(res)
        return json.dumps(res, separators=(",", ":"))


# @action("/vidjil/default/user/<path>", method=["POST", "GET"])
@action.uses(db, session, "db_layout.html")
@vidjil_utils.jsontransformer
def user(path=None):
    """
    exposes:
    http://..../[app]/default/user/login
    http://..../[app]/default/user/logout
    http://..../[app]/default/user/register
    http://..../[app]/default/user/profile
    http://..../[app]/default/user/retrieve_password
    http://..../[app]/default/user/change_password
    http://..../[app]/default/user/manage_users (requires membership in
    use @auth.requires_login()
        @auth.requires_membership('group name')
        @auth.requires_permission('read','table name',record_id)
    to decorate functions that need access control
    """

    # redirect already logged user
    if auth.user and path == "login":
        res = {"redirect": URL("default", "home", scheme=True)}
        return json.dumps(res, separators=(",", ":"))

    # only authenticated admin user can access register view
    if auth.user and path == "register":
        # save admin session (the registering will automatically login the new user in order to initialize its default values)
        admin_auth = auth
        auth.is_logged_in = lambda: False

        def post_register(form):
            # Set up a new user, after register

            # Default permissions
            add_default_group_permissions(auth, auth.user_group(), anon=True)  # noqa: F823

            # Belong to the public group
            group_id = db(db.auth_group.role == "public").select()[0].id
            db.auth_membership.insert(user_id=auth.user_id, group_id=group_id)

            log.admin(
                "User %s <%s> registered, group %s"
                % (auth.user_id, auth.user.email, auth.user_group())
            )

            # restore admin session after register
            auth = admin_auth
            auth.user = session.auth.user

        auth.settings.register_onaccept = post_register

        # redirect to the last added user view
        auth.settings.logged_url = URL("user", "info")
        auth.settings.login_next = URL("user", "info")

        return dict(form=auth.register())

    # reject others
    if path == "register":
        res = {"message": "you need to be admin and logged to add new users"}
        return json.dumps(res, separators=(",", ":"))

    if auth.user and path == "logout":
        auth.user = None
        auth.session.clear()

        return home()

    return dict(form=auth())


@action("/vidjil/default/impersonate", method=["POST", "GET"])
@action.uses(db, auth, session)
def impersonate():
    if auth.is_impersonating():
        log.debug("impersonate << stop")
        auth.stop_impersonating(request.url)
    if request.query["id"] != 0:
        log.debug(f"impersonate >> {request.query['id']}")
        if "next" in request.query:
            redirect_url = request.query["next"]
        else:
            redirect_url = URL("default", "home.html", scheme=True)
        log.debug(f"redirect_url {redirect_url}")
        auth.start_impersonating(request.query["id"], redirect_url)
        log.debug(
            {
                "success": "true",
                "message": f"impersonated user_id {request.query['id']}",
            }
        )
    res = {"redirect": "reload"}
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/stop_impersonate", method=["POST", "GET"])
@action.uses(db, auth, session)
def stop_impersonate():
    if auth.is_impersonating():
        log.debug({"success": "true", "message": "impersonate << stop"})
        if "next" in request.query:
            redirect_url = request.query["next"]
        else:
            redirect_url = URL("default", "home.html", scheme=True)
        log.debug(f"redirect_url {redirect_url}")
        auth.stop_impersonating(redirect_url)
    res = {"redirect": "reload"}
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/default/download/<filename>", method=["POST", "GET"])
@action.uses(db, session, auth.user)
def download(filename=None):
    download = request.query["filename"] if "filename" in request.query else True
    return static_file(filename, root=settings.DIR_RESULTS, download=download)
