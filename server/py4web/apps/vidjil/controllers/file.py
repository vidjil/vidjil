# -*- coding: utf-8 -*-
import base64
import datetime
import io
import json
import os
import pathlib
import shutil

from py4web import HTTP, action, request
from pydal.objects import Row

from .. import sampleSet, settings, tasks
from ..common import T, auth, db, log, scheduler
from ..modules import jstree, tag_utils, vidjil_utils
from ..modules.controller_utils import error_message
from ..modules.permission_enum import PermissionEnum
from ..modules.sampleSet import get_set_group
from ..modules.sequenceFile import check_space
from ..modules.zmodel_factory import ModelFactory
from ..user_groups import get_involved_groups, get_upload_group_ids


###########################
# HELPERS
###########################
def extract_set_type(target):
    mapping = {"p": "patient", "r": "run", "s": "generic"}
    return mapping[target.split(":")[1][0]]


def manage_filename(filename):
    filepath = ""
    name_list = []
    name_list = filename.split("/")
    myfilename = name_list[-1]
    data = dict(filename=myfilename, data_file=None)

    if len(name_list) > 1:
        filepath = settings.FILE_SOURCE + "/" + filename
        split_file = myfilename.split(".")
        uuid_key = db.uuid().replace("-", "")[-16:]
        encoded_filename = base64.b16encode(
            ".".join(split_file[0:-1]).encode("utf-8")
        ).lower()
        data_file = "sequence_file.data_file.%s.%s.%s" % (
            uuid_key,
            str(encoded_filename.decode("utf-8")),
            split_file[-1],
        )
        data["data_file"] = data_file

    return (data, filepath)


def link_to_sample_sets(seq_file_id, id_dict):
    """
    Create sample set memberships and return a dict of the sample set ids.
    The keys to the dict are thee same as the ones passed in id_dict
    """
    log.debug("linking file %d to sets:" % seq_file_id)
    for key in id_dict:
        log.debug("%s: %s" % (key, str(id_dict[key])))
        arr = [
            {"sample_set_id": oid, "sequence_file_id": seq_file_id}
            for oid in id_dict[key]
        ]
        db.sample_set_membership.bulk_insert(arr)
    db.commit()


def validate(myfile, id, pre_process):
    reupload = id != ""
    error = []

    db_preprocess = db.pre_process[pre_process] if pre_process is not None else None
    required_files = vidjil_utils.getPreprocessRequiredFiles(db_preprocess)

    # 0 or two filename must be provided to update a file with pre-process
    if reupload and pre_process is not None:
        if myfile["filename"] == "" and myfile["filename2"] != "":
            error.append("missing filename")
        if (
            required_files == 2
            and myfile["filename2"] == ""
            and myfile["filename"] != ""
        ):
            error.append("missing filename2")

    # both filename must be provided to add a file with pre-process
    if not reupload and pre_process is not None:
        if myfile["filename"] == "":
            error.append("missing filename")
        if required_files == 2 and myfile["filename2"] == "":
            error.append("missing filename2")

    # a single filename must be provided to add a file without pre_process
    if not reupload and required_files == 1:
        if myfile["filename"] == "":
            error.append("missing filename")

    if "sampling_date" in myfile and myfile["sampling_date"] != "":
        try:
            datetime.datetime.strptime("" + myfile["sampling_date"], "%Y-%m-%d")
        except ValueError:
            error.append("date (wrong format)")
    return error


def validate_sets(set_ids):
    id_dict = {}
    sets = []
    errors = []

    if len(set_ids) == 0:
        errors.append("missing set association")

    mf = ModelFactory()
    helpers = {}

    set_ids_arr = []
    if len(set_ids) > 0:
        set_ids_arr = [x.strip() for x in set_ids.split("|")]
    for sid in set_ids_arr:
        try:
            set_type = extract_set_type(sid)
            if set_type not in id_dict:
                helpers[set_type] = mf.get_instance(set_type)
                id_dict[set_type] = set()
            sets.append({"type": set_type, "id": sid})
            set_id = helpers[set_type].parse_id_string(sid)
            id_dict[set_type].add(set_id)
            if not auth.can_modify_sample_set(set_id):
                errors.append("missing permission for %s %d" % (set_type, set_id))
        except ValueError:
            errors.append("Invalid %s %s" % (set_type, sid))
    return sets, id_dict, errors


def get_pre_process_list():
    query_pre_process = db(
        (
            auth.vidjil_accessible_query(
                PermissionEnum.read_pre_process.value, db.pre_process
            )
            | auth.vidjil_accessible_query(
                PermissionEnum.admin_pre_process.value, db.pre_process
            )
        )
    ).select(orderby=~db.pre_process.id)

    pre_process_list = []
    for row in query_pre_process:
        file = 1
        if "&file2" in row.command:
            file = 2
        pre_process_list.append(
            dict(id=row.id, name=row.name, file=file, info=row.info)
        )
    return pre_process_list


def get_set_list(id_dict, helpers):
    sets = []
    for key in id_dict:
        sample_set_ids = db(db[key].id.belongs(id_dict[key])).select()
        for sample_set_id in sample_set_ids:
            sets.append({"type": key, "id": helpers[key].get_id_string(sample_set_id)})
    return sets


def get_set_helpers():
    factory = ModelFactory()
    sample_types = [
        sampleSet.SET_TYPE_GENERIC,
        sampleSet.SET_TYPE_PATIENT,
        sampleSet.SET_TYPE_RUN,
    ]
    helpers = {}
    for sample_type in sample_types:
        helpers[sample_type] = factory.get_instance(type=sample_type)
    return helpers


def form_response(data):
    source_module_active = settings.FILE_SOURCE and settings.FILE_TYPES
    network_source = source_module_active and (
        data["action"] != "edit" or len(data["file"]) == 0 or data["file"][0].network
    )
    # should be true only when we want to use the network view
    upload_group_ids = list(set([int(gid) for gid in get_upload_group_ids(auth)]))
    group_ids = get_involved_groups()
    pre_process_list = get_pre_process_list()
    return dict(
        message=T("Form response"),
        pre_process_list=pre_process_list,
        files=data["file"],
        sets=data["sets"],
        sample_type=data["sample_type"],
        errors=data["errors"],
        source_module_active=source_module_active,
        network_source=network_source,
        group_ids=group_ids,
        upload_group_ids=upload_group_ids,
        isEditing=data["action"] == "edit",
        auth=auth,
        db=db,
    )


############################
# CONTROLLERS
############################
@action("/vidjil/file/form", method=["POST", "GET"])
@action.uses("file/form.html", db, auth.user)
@vidjil_utils.jsontransformer
def form():
    relevant_ids = {}

    helpers = get_set_helpers()

    # new file
    if "sample_set_id" in request.query:
        sample_set = db.sample_set[request.query["sample_set_id"]]
        if not auth.can_upload_sample_set(sample_set.id):
            return error_message("you don't have right to upload files")

        sample_type = sample_set.sample_type
        error_space = check_space(settings.DIR_SEQUENCES, "Uploads")
        if error_space is not None:
            return error_space

        row = (
            db(
                db[sample_set.sample_type].sample_set_id
                == request.query["sample_set_id"]
            )
            .select()
            .first()
        )
        sample_type = sample_set.sample_type
        if sample_type not in relevant_ids:
            relevant_ids[sample_type] = []
        relevant_ids[sample_type].append(row.id)
        action = "add"
        log.debug(
            "load add form",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["sample_set_id"],
                "table_name": "sample_set",
            },
        )

    # edit file
    elif "file_id" in request.query and request.query["file_id"] is not None:
        if not auth.can_modify_file(int(request.query["file_id"])):
            return error_message("you need admin permission to edit files")

        sample_set_list = db(
            (db.sample_set_membership.sequence_file_id == request.query["file_id"])
            & (db.sample_set_membership.sample_set_id != None)  # noqa: E711
            & (db.sample_set.id == db.sample_set_membership.sample_set_id)
            & (db.sample_set.sample_type != "sequence_file")
        ).select(
            db.sample_set_membership.sample_set_id.with_alias("sample_set_id"),
            db.sample_set.sample_type.with_alias("sample_type"),
        )
        for row in sample_set_list:
            smp_type = row.sample_type
            if smp_type not in relevant_ids:
                relevant_ids[smp_type] = []
            relevant_ids[smp_type].append(
                db(db[smp_type].sample_set_id == row.sample_set_id).select()[0].id
            )
        action = "edit"

        sample_type = request.query["sample_type"]
        log.debug(
            "load edit form",
            extra={
                "user_id": auth.user_id,
                "record_id": request.query["file_id"],
                "table_name": "sequence_file",
            },
        )
    else:
        return error_message("missing sample_set or file id")

    myfile = {}
    if "file_id" in request.query:
        myfile = db.sequence_file[request.query["file_id"]]
    if myfile is None:
        myfile = {}
    myfile["sets"] = []
    sets = get_set_list(relevant_ids, helpers)

    data = {}
    data["file"] = [myfile]
    data["sets"] = sets
    data["sample_type"] = sample_type
    data["errors"] = []
    data["action"] = action

    return form_response(data)


# TODO check data
@action("/vidjil/file/submit", method=["POST", "GET"])
@action.uses(db, auth.user)
def submit():
    data = json.loads(request.params["data"])
    error = False

    pre_process = None
    pre_process_flag = tasks.STATUS_COMPLETED
    if (
        "pre_process" in data
        and data["pre_process"] is not None
        and int(data["pre_process"]) > 0
    ):
        pre_process = int(data["pre_process"])
        pre_process_flag = tasks.STATUS_WAITING

    sets, common_id_dict, errors = validate_sets(data["set_ids"])
    data["sets"] = sets

    data["errors"] = errors

    data["action"] = "add"
    if len(errors) > 0:
        error = True

    for f in data["file"]:
        f["errors"] = validate(f, f["id"], pre_process)

        f["sets"], f["id_dict"], err = validate_sets(f["set_ids"])

        if len(f["errors"]) > 0:
            error = True
            continue

        if "sampling_date" not in f:
            f["sampling_date"] = ""

        file_data = dict(
            sampling_date=f["sampling_date"],
            info=f["info"],
            pre_process_id=pre_process,
            pre_process_flag=pre_process_flag,
            provider=auth.user_id,
        )

        # edit
        if f["id"] != "":
            reupload = True
            fid = int(f["id"])
            if f["filename"] == "":
                # If we don't reupload a new file
                file_data.pop("pre_process_flag")

            # Remove previous membership
            db(db.sample_set_membership.sequence_file_id == fid).delete()
            db.commit()
            action = "edit"

        # add
        else:
            reupload = False
            f["id"] = fid = db.sequence_file.insert(**file_data)
            action = "add"

        data["action"] = action
        f["message"] = []
        mes = "file (%d) %s %sed" % (int(f["id"]), f["filename"], action)
        f["message"].append(mes)
        f["message"].append("You must reselect the file for it to be uploaded")

        id_dict = common_id_dict.copy()

        for key in f["id_dict"]:
            if key not in id_dict:
                id_dict[key] = set()
            id_dict[key].update(f["id_dict"][key])

        for key in id_dict:
            for sid in id_dict[key]:
                group_id = get_set_group(sid)
                tag_utils.register_tags(
                    db, "sequence_file", fid, f["info"], group_id, reset=True
                )

        if f["filename"] != "":
            if reupload:
                # file is being reuploaded, remove all existing results_files
                db(db.results_file.sequence_file_id == fid).delete()
                mes += " file was replaced"

            filename, filepath = manage_filename(f["filename"])
            file_data.update(filename)
            if "data_file" in file_data and file_data["data_file"] is not None:
                os.symlink(filepath, settings.DIR_SEQUENCES + file_data["data_file"])
                file_data["size_file"] = os.path.getsize(filepath)
                file_data["network"] = True
                file_data["data_file"] = str(file_data["data_file"])

            if data["source"] == "nfs":
                file_data2, filepath2 = manage_filename(f["filename2"])
                if "data_file" in file_data2 and file_data2["data_file"] is not None:
                    file_data["data_file2"] = str(file_data2["data_file"])
                    os.symlink(
                        filepath2, settings.DIR_SEQUENCES + file_data2["data_file"]
                    )

        link_to_sample_sets(fid, id_dict)

        row = db.sequence_file[fid]
        for key in file_data.keys():
            row.update(**{key: file_data[key]})
        row.update_record()

        # pre-process for nfs files can be started immediately
        data_file = db.sequence_file[fid].data_file
        data_file2 = db.sequence_file[fid].data_file2
        if data["source"] == "nfs":
            if data_file is not None and data_file2 is not None and pre_process != "0":
                tasks.schedule_pre_process(fid, pre_process)

        log.info(
            mes,
            extra={
                "user_id": auth.current_user.get("id"),
                "record_id": f["id"],
                "table_name": "sequence_file",
            },
        )

    if not error:
        # Redirect to first set
        set_type = data["sets"][0]["type"]
        set_id = next(iter(id_dict[set_type]))
        res = {
            "file_ids": [f["id"] for f in data["file"]],
            "redirect": "sample_set/index",
            "args": {"id": set_id, "config_id": -1},
            "message": "successfully added/edited file(s)",
        }
        return json.dumps(res, separators=(",", ":"))
    else:
        log.error(f"add_form() failed - {errors=}")
        return error_message("add_form() failed")


PARTS_FOLDER = "parts"
PART_SUFFIX = ".part"
MERGED_SUFFIX = ".merged"


@action("/vidjil/file/resumable_upload", method=["GET"])
@action.uses(db, auth.user)
def resumable_upload_get():
    """
    Handle GET requests for resumableJS uploads (see https://github.com/23/resumable.js).

    This method checks if a specific chunk of a file has already been uploaded.
    If the chunk exists, it returns "OK". If the chunk does not exist, it returns a 204 code.

    Request Parameters:
    resumableIdentifier (str): The unique identifier for the file being uploaded.
    resumableChunkNumber (int): The chunk number being checked.

    Raises:
    HTTP(204): If the chunk does not exist.

    Returns:
    str: "OK" if the chunk exists.
    """
    error = ""

    if "resumableIdentifier" not in request.params:
        error += "missing resumableIdentifier"
    elif "resumableChunkNumber" not in request.params:
        error += "missing resumableChunkNumber"

    if error:
        return error_message(", ".join(error))

    resumableIdentifier = request.params["resumableIdentifier"]
    resumableChunkNumber = int(request.params["resumableChunkNumber"])

    # chunk folder path based on the parameters
    chunk_dir = os.path.join(settings.UPLOAD_FOLDER, PARTS_FOLDER, resumableIdentifier)

    # chunk path based on the parameters
    chunk_name = f"{resumableChunkNumber}{PART_SUFFIX}"
    chunk_path = os.path.join(chunk_dir, chunk_name)
    log.debug(f"Try getting chunk: {chunk_path}")

    if os.path.isfile(chunk_path):
        # Let resumable.js know this chunk already exists
        log.debug(f"Found chunk: {chunk_path}")
        return "OK"
    else:
        # Let resumable.js know this chunk does not exists and needs to be uploaded
        log.debug(f"Not found chunk: {chunk_path}")
        raise HTTP(204)


@action("/vidjil/file/resumable_upload", method=["POST"])
@action.uses(db, auth.user)
def resumable_upload_post():
    """
    Handle POST requests for resumableJS uploads (see https://github.com/23/resumable.js).

    This method receives a chunk of a file being uploaded, saves it to disk, and checks if all chunks have been received.
    If all chunks are received, it merges them into a single file.

    Request Parameters:
    resumableIdentifier (str): The unique identifier for the file being uploaded.
    resumableChunkNumber (int): The chunk number being uploaded.
    resumableTotalChunks (int): The total number of chunks for the file.
    resumableFilename (str): The name of the file being uploaded.
    file (FileStorage): The file chunk being uploaded.

    Raises:
    HTTP(500): If any required parameters are missing.

    Returns:
    str: "OK" if the chunk is successfully received and processed.
    """
    mes = ""
    error = ""

    if "resumableIdentifier" not in request.params:
        error += "missing resumableIdentifier"
    elif "resumableChunkNumber" not in request.params:
        error += "missing resumableChunkNumber"
    elif "resumableTotalChunks" not in request.params:
        error += "missing resumableTotalChunks"
    elif "resumableFilename" not in request.params:
        error += "missing resumableFilename"
    elif "file" not in request.files:
        error += "missing file"

    if error:
        return error_message(", ".join(error))

    resumableIdentifier = request.params["resumableIdentifier"]
    resumableChunkNumber = int(request.params["resumableChunkNumber"])
    resumableTotalChunks = int(request.params["resumableTotalChunks"])
    resumableFilename = request.params["resumableFilename"]
    file = request.files["file"]

    chunk_dir = os.path.join(settings.UPLOAD_FOLDER, PARTS_FOLDER, resumableIdentifier)
    os.makedirs(chunk_dir, exist_ok=True)

    chunk_name = f"{resumableChunkNumber}{PART_SUFFIX}"
    chunk_path = os.path.join(chunk_dir, chunk_name)

    with open(chunk_path, "wb") as chunk_file:
        chunk_file.write(file.file.read())

    mes += f"Chunk {resumableChunkNumber} of {resumableFilename} received."
    log.debug(mes)

    # Check if all chunks are received
    received_chunks = len(os.listdir(chunk_dir))
    if received_chunks == resumableTotalChunks:
        mes += " All chunks received. Storing merged file."

        final_path = os.path.join(
            settings.UPLOAD_FOLDER, resumableIdentifier + MERGED_SUFFIX
        )
        with open(final_path, "wb") as final_file:
            for i in range(1, resumableTotalChunks + 1):
                chunk_path = os.path.join(chunk_dir, f"{i}.part")
                with open(chunk_path, "rb") as chunk_file:
                    final_file.write(chunk_file.read())
        mes += f" File {resumableIdentifier}{MERGED_SUFFIX} written successfully."
        # Clean up chunks
        for i in range(1, resumableTotalChunks + 1):
            os.remove(os.path.join(chunk_dir, f"{i}.part"))
        os.rmdir(chunk_dir)

    log.debug(mes)
    return "OK"


@action("/vidjil/file/resumable_upload_process", method=["POST"])
@action.uses(db, auth.user)
def resumable_upload_process():
    """
    Handle POST requests to process the uploaded file after all chunks have been received and merged
    for resumableJS uploads (see https://github.com/23/resumable.js)..

    This method processes the uploaded file by moving it to the correct location, updating the database,
    and starting the preprocessing task if needed.

    Request Parameters:
    resumableIdentifier (str): The unique identifier for the file being uploaded.
    sequence_id (str): The ID of the sequence file.
    filename (str): The name of the uploaded file.
    file_number (str): The file number (1 or 2) indicating whether it's the first or second file.
    pre_process (str, optional): The ID of the preprocessing task to be started, or "0" if no preprocessing is needed.
    status (str, optional): The status of the upload, should be "upload_error" if there was an error during upload.

    Raises:
    HTTP(500): If any required parameters are missing or if there was an upload error.

    Returns:
    str: A JSON string containing the result message.
    """
    # Check input parameters
    error = []
    if "resumableIdentifier" not in request.params:
        error.append("missing parameter resumableIdentifier")
    if "sequence_id" not in request.params:
        error.append("missing parameter sequence_id")
    if "filename" not in request.params:
        error.append("missing parameter filename")
    if "file_number" not in request.params:
        error.append("missing parameter file_number")
    if "status" in request.params and request.params["status"] == "upload_error":
        error.append("Upload error")

    if error:
        raise HTTP(500, ", ".join(error))

    expected_merged_file = os.path.join(
        settings.UPLOAD_FOLDER, request.params["resumableIdentifier"] + MERGED_SUFFIX
    )
    sequence_id = request.params["sequence_id"].removesuffix("_2")
    filename = request.params["filename"]
    file_number = request.params["file_number"]
    preprocess = (
        db.pre_process[request.params["pre_process"]]
        if "pre_process" in request.params and request.params["pre_process"] != "0"
        else None
    )
    return upload_process(
        expected_merged_file, sequence_id, filename, file_number, preprocess
    )


@action("/vidjil/file/upload", method=["POST"])
@action.uses(db, auth.user)
def upload():
    """
    Handle POST requests to upload a file.

    This method writes the uploaded file to disk and starts processing it by moving it to the correct location,
    updating the database, and starting the preprocessing task if needed.

    Request Parameters:
    id (str): The ID of the sequence file.
    file_number (str): The file number (1 or 2) indicating whether it's the first or second file.
    file (FileStorage): The file being uploaded.
    pre_process (str, optional): The ID of the preprocessing task to be started, or "0" if no preprocessing is needed.

    Raises:
    HTTP(500): If any required parameters are missing.

    Returns:
    str: A JSON string containing the result message.
    """

    # Check input parameters
    error = []
    if "id" not in request.params:
        error.append("missing parameter id")
    if "file_number" not in request.params:
        error.append("missing parameter file_number")
    if "file" not in request.files:
        error.append("missing file")

    if error:
        raise HTTP(500, ", ".join(error))

    # write uploaded file to disk
    sequence_id = request.params["id"]
    merged_file = os.path.join(settings.UPLOAD_FOLDER, f"{sequence_id}{MERGED_SUFFIX}")
    uploaded_file_upload = request.files["file"]
    filename = uploaded_file_upload.filename
    with open(merged_file, "wb") as f:
        f.write(uploaded_file_upload.file.read())

    # Start processing the uploaded file
    file_number = request.params["file_number"]
    preprocess = (
        db.pre_process[request.params["pre_process"]]
        if "pre_process" in request.params and request.params["pre_process"] != "0"
        else None
    )
    return upload_process(merged_file, sequence_id, filename, file_number, preprocess)


def upload_process(
    merged_file: str,
    sequence_id: int,
    filename: str,
    file_number: int,
    preprocess: Row | None,
) -> str:
    """
    Process the uploaded file by moving it to the correct location, updating the database,
    and starting the preprocessing task if needed.

    Parameters:
    merged_file (str): The path to the merged file.
    sequence_id (int): The ID of the sequence file.
    filename (str): The name of the uploaded file.
    file_number (int): The file number (1 or 2) indicating whether it's the first or second file.
    preprocess (Row | None): The preprocessing config to be used, or None if no preprocessing is needed.

    Raises:
    HTTP: If there are any errors during the processing of the uploaded file.

    Returns:
    str: A JSON string containing the result message.
    """
    error = []
    sequence_file = db.sequence_file[sequence_id]

    if sequence_file is None:
        error.append("no sequence file with this id")

    if not os.path.isfile(merged_file):
        error.append(f"Expected merged file {merged_file} not found")

    if error:
        sequence_file.update_record(pre_process_flag=tasks.STATUS_UPLOAD_FAILED)
        raise HTTP(500, ", ".join(error))

    mes = f"file {filename}({sequence_id}) "
    log.debug(mes + "processing uploaded file")

    # Store file in db by moving it to the correct location
    try:
        if file_number == "2":
            db_filename = ""
            with io.BytesIO() as empty_file:
                db_filename = db.sequence_file.data_file2.store(empty_file, filename)
            shutil.move(
                merged_file,
                os.path.join(db.sequence_file.data_file2.uploadfolder, db_filename),
            )
            sequence_file.update_record(data_file2=db_filename)
        else:
            db_filename = ""
            with io.BytesIO() as empty_file:
                db_filename = db.sequence_file.data_file.store(empty_file, filename)
            shutil.move(
                merged_file,
                os.path.join(db.sequence_file.data_file.uploadfolder, db_filename),
            )
            sequence_file.update_record(data_file=db_filename)
    except IOError as e:
        if str(e).find("File name too long") > -1:
            error += "Your filename is too long, please shorten it."
        else:
            error += "System error during processing of uploaded file."
            log.error(str(e))

    data_file = sequence_file.data_file
    data_file2 = sequence_file.data_file2

    if file_number == "1" and data_file is None:
        return error_message("no data file")
    if file_number == "2" and data_file2 is None:
        return error_message("no data file 2")

    # Start preprocess if needed
    number_of_required_files = vidjil_utils.getPreprocessRequiredFiles(preprocess)
    if preprocess is not None:
        if data_file is not None and (
            data_file2 is not None if number_of_required_files == 2 else True
        ):
            sequence_file.update_record(pre_process_flag=tasks.STATUS_WAITING)
            old_task_id = sequence_file.pre_process_scheduler_task_id
            if db.scheduler_task[old_task_id] is not None:
                scheduler.control.revoke(old_task_id, terminate=True)
                db(db.scheduler_task.id == old_task_id).delete()
                db.commit()
            tasks.schedule_pre_process(int(sequence_id), int(preprocess.id))
            mes += f" | p{preprocess.id} start pre_process for {sequence_id}: {preprocess.name} "

    # Compute and store file size
    if file_number == "1" and data_file is not None:
        seq_file = pathlib.Path(db.sequence_file.data_file.uploadfolder, data_file)
        size = seq_file.stat().st_size
        mes += f" ({vidjil_utils.format_size(size)})"
        sequence_file.update_record(size_file=size)
    if file_number == "2" and data_file2 is not None:
        seq_file2 = pathlib.Path(db.sequence_file.data_file2.uploadfolder, data_file2)
        size2 = seq_file2.stat().st_size
        mes += f" ({vidjil_utils.format_size(size2)})"
        sequence_file.update_record(size_file2=size2)

    res = {"message": mes + " upload finished"}
    log.info(res)
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/file/confirm", method=["POST", "GET"])
@action.uses("file/confirm.html", db, auth.user)
@vidjil_utils.jsontransformer
def confirm():
    """
    Request parameters:
    delete_results: (optional) boolean
    id: sequence file ID
    """
    delete_only_sequence = (
        "delete_only_sequence" in request.query
        and request.query["delete_only_sequence"] == "True"
    )
    delete_results = (
        "delete_results" in request.query and request.query["delete_results"] == "True"
    )
    sequence_file = db.sequence_file[request.query["id"]]
    if sequence_file is None:
        return error_message("The requested file doesn't exist")
    if sequence_file.data_file is None:
        delete_results = True
    if auth.can_modify_sample_set(int(request.query["redirect_sample_set_id"])):
        return dict(
            message=T("Choose what you would like to delete"),
            delete_only_sequence=delete_only_sequence,
            delete_results=delete_results,
            auth=auth,
            db=db,
        )
    else:
        return error_message("you need admin permission to delete this file")


def delete_sequence_file(seq_id):
    if not auth.can_modify_file(seq_id):
        return error_message("you need admin permission to delete this file")

    sequence = db.sequence_file[seq_id]
    seq_filename = sequence.data_file
    if seq_filename is not None:
        log.debug(
            f"Deleting {db.sequence_file.data_file.uploadfolder}{seq_filename} with ID {seq_id}"
        )
    db.sequence_file[seq_id].update_record(data_file=None)


@action("/vidjil/file/delete", method=["POST", "GET"])
@action.uses(db, auth.user)
def delete():
    """
    Called (via request) with:
    id: the sequence ID
    delete_results: (optional) boolean stating if we also want to delete the results.
    """
    delete_results = (
        "delete_results" in request.query and request.query["delete_results"] == "True"
    )
    sample_set = db.sample_set[request.query["redirect_sample_set_id"]]
    associated_id = None
    if sample_set.sample_type not in ["sequence_file", "sample_set"]:
        associated_elements = db(
            db[sample_set.sample_type].sample_set_id == sample_set.id
        ).select()
        if len(associated_elements) > 0:
            associated_id = associated_elements[0].id

    if auth.can_modify_file(int(request.query["id"])):
        if not (delete_results):
            delete_sequence_file(request.query["id"])
        else:
            db(db.results_file.sequence_file_id == request.query["id"]).delete()
            db(db.sequence_file.id == request.query["id"]).delete()
            #############################
            # TODO refresh fuse
            ##########################
            # sample_set_ids = get_sequence_file_sample_sets(request.query["id"])
            # set_memberships = db(
            #     db.sample_set_membership.sample_set_id.belongs(sample_set_ids)
            # ).select()
            # non_empty_set_ids = [r.sample_set_id for r in set_memberships]
            # schedule_fuse(non_empty_set_ids, config_ids)

        res = {
            "redirect": "sample_set/index",
            "args": {"id": request.query["redirect_sample_set_id"]},
            "message": "sequence file ({}) deleted".format(request.query["id"]),
        }
        if associated_id is not None:
            log.info(
                res,
                extra={
                    "user_id": auth.user_id,
                    "record_id": associated_id,
                    "table_name": sample_set.sample_type,
                },
            )
        else:
            log.info(res)
        return json.dumps(res, separators=(",", ":"))
    else:
        return error_message("you need admin permission to delete this file")


def sequencer_list():
    sequencer_list = []
    for row in db(db.sequence_file.sequencer != None).select(  # noqa: E711
        db.sequence_file.sequencer, distinct=True
    ):
        if row.sequencer != "null":
            sequencer_list.append(row.sequencer)

    res = {"sequencer": sequencer_list}
    return json.dumps(res, separators=(",", ":"))


def pcr_list():
    pcr_list = []
    for row in db(db.sequence_file.pcr != None).select(  # noqa: E711
        db.sequence_file.pcr, distinct=True
    ):
        if row.pcr != "null":
            pcr_list.append(row.pcr)

    res = {"pcr": pcr_list}
    return json.dumps(res, separators=(",", ":"))


def producer_list():
    producer_list = []
    for row in db(db.sequence_file.producer != None).select(  # noqa: E711
        db.sequence_file.producer, distinct=True
    ):
        if row.producer != "null":
            producer_list.append(row.producer)

    res = {"producer": producer_list}
    return json.dumps(res, separators=(",", ":"))


@action("/vidjil/file/restart_pre_process", method=["POST"])
@action.uses(db, auth.user)
def restart_pre_process():
    if (
        "sequence_file_id" not in request.params
        or request.params["sequence_file_id"] is None
    ):
        return error_message("missing parameter")
    sequence_file = db.sequence_file[request.params["sequence_file_id"]]

    if sequence_file is None or not auth.can_modify_file(sequence_file.id):
        return error_message("Permission denied")

    # Delete previous preprocess
    db.sequence_file[sequence_file.id].update_record(
        pre_process_flag=tasks.STATUS_WAITING
    )
    old_task_id = sequence_file.pre_process_scheduler_task_id
    if db.scheduler_task[old_task_id] is not None:
        scheduler.control.revoke(old_task_id, terminate=True)
        db(db.scheduler_task.id == old_task_id).delete()
        db.commit()

    # Launch new preprocess
    pre_process = db.pre_process[sequence_file.pre_process_id]
    res = tasks.schedule_pre_process(sequence_file.id, pre_process.id)

    log.debug(
        "restart pre process",
        extra={
            "user_id": auth.user_id,
            "record_id": sequence_file.id,
            "table_name": "sequence_file",
        },
    )
    return json.dumps(res, separators=(",", ":"))


def match_filetype(filename, extension):
    ext_len = len(extension)
    return ext_len == 0 or filename[-ext_len:] == extension


@action("/vidjil/file/filesystem", method=["GET"])
@action.uses(db, auth.user)
def filesystem():
    json = []
    id = (
        ""
        if ("node" not in request.query.keys() or request.query["node"] is None)
        else request.query["node"] + "/"
    )
    if id == "":
        json = [{"text": "/", "id": "/", "children": True}]
    else:
        root_folder = settings.FILE_SOURCE + id
        for idx, f in enumerate(os.listdir(root_folder)):
            correct_type = False
            for ext in settings.FILE_TYPES:
                correct_type = match_filetype(f, ext)
                if correct_type:
                    break
            is_dir = os.path.isdir(root_folder + f)
            if correct_type or is_dir:
                json_node = jstree.Node(f, id + f).jsonData()
                if is_dir:
                    json_node["children"] = True
                if correct_type:
                    json_node["icon"] = "jstree-file"
                json_node["li_attr"]["title"] = f
                json.append(json_node)
    return json
