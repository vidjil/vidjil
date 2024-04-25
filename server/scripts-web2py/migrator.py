import json, argparse
import logging, sys, datetime, os
import shutil
from pydal.helpers.classes import RecordDeleter, RecordUpdater
from pydal.objects import LazySet
import defs
from applications.vidjil.models.VidjilAuth import PermissionEnum


class MigrateLogger:
    def __init__(self, level=logging.INFO):
        log = logging.getLogger("vidjil_migrate")
        log.setLevel(level)
        log.propagate = False
        # formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        formatter = logging.Formatter("%(levelname)s\t- %(message)s")
        ch = logging.StreamHandler(sys.stdout)
        ch.setFormatter(formatter)
        log.addHandler(ch)
        self._log = log

    def info(self, text):
        self._log.info(text)

    def debug(self, text):
        self._log.debug(text)

    def error(self, text):
        self._log.error(text)

    def getLogger(self):
        return self._log

    def infoConfig(self, tables):
        config_ids = get_config_list(tables)
        self.info("IDs of detected config %s" % str(config_ids))


def get_config_list(tables):
    config_ids = []
    for res in tables["results_file"]:
        config_ids.append(tables["results_file"][res]["config_id"])
    config_ids = list(dict.fromkeys(config_ids))
    return config_ids


def get_dict_from_row(row):
    """
    Create a dict element from a Row element
    while filtering out some key pydal helper fields
    """
    ex_fields = ["id", "uuid"]
    ex_types = [RecordDeleter, RecordUpdater, LazySet]

    my_dict = {}
    for key in row.keys():
        if (key not in ex_fields) and (type(row[key]) not in ex_types):
            tmp = row[key]
            if isinstance(tmp, datetime.datetime) or isinstance(tmp, datetime.date):
                tmp = tmp.__str__()
            my_dict[key] = tmp
    return my_dict

def reencode_dict(data):
    '''
    Recursively reencode the values and keys of a dict to utf-8.
    Takes a dict loaded from json, assumes all keys are strings.
    Values may be any type, only unicode values are reencoded
    '''
    if type(data) == dict:
        tmp = {}
        for key in data:
            val = data[key]
            tmp[key.encode('utf-8')] = reencode_dict(val)
        return tmp
    elif type(data) == unicode:
        return data.encode('utf-8')
    else:
        return data 

class IdMapper:
    def __init__(self, log):
        self._log = log
        self._mapping = {}

    def getMatchingId(self, oid):
        if oid is None:
            return oid
        if oid not in self._mapping:
            self._log.debug("id %d not in mapping, returning it" % oid)
            self._log.debug("mapping: " + str(self._mapping.keys()))
            return oid
        return self._mapping[oid]

    def setMatchingId(self, old_id, new_id):
        self._mapping[old_id] = new_id
        self._log.debug("mapped: %d to %d" % (old_id, new_id))


class ConfigMapper(IdMapper):
    def __init__(self, log, cfile=None):
        IdMapper.__init__(self, log)
        if cfile is not None:
            self.load(cfile)

    def load(self, cfile):
        self._mapping = {}
        with open(cfile, "r") as cfg:
            config_map = json.load(cfg, encoding='utf-8')
            for key in config_map:
                if config_map[key]["link_local"]:
                    self._mapping[int(key)] = config_map[key]["link_local"]

        self._log.info("mapping loaded for %s" % cfile)
        self._log.debug("mapping: " + str(self._mapping.keys()))


class Extractor:
    def __init__(self, db, log):
        self.log = log
        self.log.info("initializing extractor")
        self.db = db

    def populateSets(self, rows):
        self.log.debug("populate sets")
        sets = {}
        sample_set_ids = []
        for row in rows:
            row.creator = 1
            self.log.debug(
                "populating : %d, sample_set: %d" % (row.id, row.sample_set_id)
            )
            sets[row.id] = get_dict_from_row(row)
            sample_set_ids.append(row.sample_set_id)
        return sets, sample_set_ids

    def getSequenceFiles(self, sample_set_ids):
        db = self.db
        rows = db(
            (db.sample_set_membership.sample_set_id.belongs(sample_set_ids))
            & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
        ).select(db.sample_set_membership.ALL, db.sequence_file.ALL)
        return rows

    def populateSequenceFiles(self, rows):
        self.log.debug("populate sequence_files")
        memberships = {}
        sequence_files = {}
        for row in rows:
            row.sequence_file.provider = 1
            row.sequence_file.patient_id = None
            ssm_id = row.sample_set_membership.id
            sf_id = row.sequence_file.id
            self.log.debug(
                "populating sequence file: %d, membership: %d" % (sf_id, ssm_id)
            )
            memberships[ssm_id] = get_dict_from_row(row.sample_set_membership)
            sequence_files[sf_id] = get_dict_from_row(row.sequence_file)
        return sequence_files, memberships

    def getTableEntries(self, table, ref_field, values):
        db = self.db
        rows = db(db[table][ref_field].belongs(values)).select(db[table].ALL)
        return rows

    def populateEntries(self, rows, etype=""):
        self.log.debug("populate %ss" % etype)
        data = {}
        for row in rows:
            my_dict = get_dict_from_row(row)
            self.log.debug("populating entry: %s" % str(my_dict))
            data[row.id] = my_dict
        return data


class GroupExtractor(Extractor):
    def __init__(self, db, log):
        Extractor.__init__(self, db, log)

    def getAccessible(self, table, groupids):
        db = self.db

        rows = db(
            (db.sample_set.id == db.auth_permission.record_id)
            & (db.sample_set.id == db[table].sample_set_id)
            & (db.auth_permission.table_name == "sample_set")
            & (db.auth_permission.name == PermissionEnum.access.value)
            & (db.auth_permission.group_id.belongs(groupids))
        ).select(db[table].ALL)
        return rows


class SampleSetExtractor(Extractor):
    def __init__(self, db, log):
        Extractor.__init__(self, db, log)

    def getAccessible(self, table, ids):
        db = self.db
        rows = db(db[table].id.belongs(ids)).select(db[table].ALL)
        return rows


class Importer:
    def __init__(self, groupid, db, log, config_mapper, pprocess_mapper):
        self.log = log
        self.log.info("initializing importer")
        self.groupid = groupid
        self.db = db
        self.mappings = {"config": config_mapper, "pre_process": pprocess_mapper}
        self.mappings["sample_set"] = IdMapper(self.log)

    def importSampleSets(self, stype, sets):
        db = self.db
        self.log.debug("import sets")
        for sid in sorted(sets.keys(), key=int):
            self.log.debug("importing set: %s" % sid)
            sset = sets[sid]
            ssid = db.sample_set.insert(sample_type=stype)
            self.log.debug("new sample_set %d" % ssid)
            self.mappings["sample_set"].setMatchingId(sset["sample_set_id"], ssid)
            sset["sample_set_id"] = ssid
            nid = db[stype].insert(**sset)
            self.log.debug("new %s: %d" % (stype, nid))
            db.auth_permission.insert(
                group_id=self.groupid,
                name=PermissionEnum.access.value,
                table_name=stype,
                record_id=nid,
            )
            db.auth_permission.insert(
                group_id=self.groupid,
                name=PermissionEnum.access.value,
                table_name="sample_set",
                record_id=ssid,
            )
            self.log.debug("associated set %d to group %d" % (nid, self.groupid))

    def importTable(self, table, values, ref_fields={}, map_val=False):
        db = self.db
        self.log.debug("import %ss" % table)
        for vid in values:
            self.log.debug("importing %s: %s" % (table, vid))
            val = values[vid]
            for key in ref_fields:
                ref_key = ref_fields[key]
                matching_id = self.mappings[key].getMatchingId(val[ref_key])
                # self.log.debug("%s replacing %s: %d with %d" % (table, ref_key, val[ref_key], matching_id))
                val[ref_key] = matching_id
            oid = db[table].insert(**val)
            self.log.debug("new %s: %d" % (table, oid))
            if map_val:
                if table not in self.mappings:
                    self.mappings[table] = IdMapper(self.log)
                self.mappings[table].setMatchingId(int(vid), oid)
    
    def get_mapping_id(self, table, id):
        self.log.debug("Getting mapping for table %s and id %d" % (table, id))
        return self.mappings[table].getMatchingId(id)


def copy_results_files(data, src, dest, log):
    file_fields = {
        "results_file": "data_file",
        "analysis_file": "analysis_file",
        "fused_file": "fused_file",
        "sequence_file": "pre_process_file",
    }

    if not os.path.exists(dest):
        os.makedirs(dest)

    for t in file_fields:
        for entry in data[t]:
            if (data[t][entry][file_fields[t]] is not None):
                try: 
                    shutil.copy(src + '/' + data[t][entry][file_fields[t]], dest + '/' + data[t][entry][file_fields[t]])
                    log.debug("Copying %s" % data[t][entry][file_fields[t]])
                except:
                    log.error("failed to copy file %s" % data[t][entry][file_fields[t]])


DIR_PRE_VIDJIL_ID_EXPORT = "out-%06d"


def export_pre_process_log_files(tables, dest, log):
    pre_file_path = dest + "/pre"
    for sequence_file_id, sequence_file_entry in tables["sequence_file"].items():
        if sequence_file_entry["pre_process_id"] is not None:
            if not os.path.exists(pre_file_path):
                os.makedirs(pre_file_path)
            source_folder = defs.DIR_PRE_VIDJIL_ID % sequence_file_id
            target_folder = pre_file_path + "/" + DIR_PRE_VIDJIL_ID_EXPORT % sequence_file_id
            try:
                shutil.copytree(source_folder, target_folder)
                log.debug("Copying %s to %s" % (source_folder, target_folder))
            except Exception as exception:
                log.error(
                    "failed to copy file %s to %s: %s" % (source_folder, target_folder, exception)
                )


def import_pre_process_log_files(tables, src, importer, log):
    pre_file_path = src + "/pre"
    for sequence_file_id, sequence_file_entry in tables["sequence_file"].items():
        if sequence_file_entry["pre_process_id"] is not None:
            source_folder = pre_file_path + "/" + DIR_PRE_VIDJIL_ID_EXPORT % int(sequence_file_id)
            mapped_sequence_file_id = importer.get_mapping_id("sequence_file", int(sequence_file_id))
            target_folder = defs.DIR_PRE_VIDJIL_ID % int(mapped_sequence_file_id)
            try:
                shutil.copytree(source_folder, target_folder)
                log.debug("Copying %s to %s" % (source_folder, target_folder))
            except Exception as exception:
                log.error(
                    "failed to copy file %s to %s: %s" % (source_folder, target_folder, exception)
                )


def export_peripheral_data(extractor, data_dict, sample_set_ids, log):
    log.debug("Export peripheral data")

    sequence_rows = extractor.getSequenceFiles(sample_set_ids)
    data_dict["sequence_file"], data_dict["membership"] = (
        extractor.populateSequenceFiles(sequence_rows)
    )

    results_rows = extractor.getTableEntries(
        "results_file", "sequence_file_id", data_dict["sequence_file"].keys()
    )
    data_dict["results_file"] = extractor.populateEntries(results_rows, "results_file")

    task_ids = [r["scheduler_task_id"] for r in data_dict["results_file"].values()]
    task_rows = extractor.getTableEntries("scheduler_task", "id", task_ids)
    data_dict["scheduler_task"] = extractor.populateEntries(task_rows, "scheduler_task")

    run_rows = extractor.getTableEntries("scheduler_run", "task_id", task_ids)
    data_dict["scheduler_run"] = extractor.populateEntries(run_rows, "scheduler_run")

    analysis_rows = extractor.getTableEntries(
        "analysis_file", "sample_set_id", sample_set_ids
    )
    data_dict["analysis_file"] = extractor.populateEntries(
        analysis_rows, "analysis_file"
    )

    fused_rows = extractor.getTableEntries(
        "fused_file", "sample_set_id", sample_set_ids
    )
    data_dict["fused_file"] = extractor.populateEntries(fused_rows, "fused_file")

    return data_dict


def export_configs(extractor, tables, log):
    # Get configs
    config_ids = get_config_list(tables)
    config_rows = extractor.getTableEntries("config", "id", config_ids)
    configs = extractor.populateEntries(config_rows, "config")

    # Prepare mapping with default to the same value
    mapped_configs = {
        key: {"description": value, "link_local": key} for key, value in configs.items()
    }

    return mapped_configs


def export_pre_process_configs(extractor, tables, log):
    # Get pre process config ids
    pre_process_config_ids = []
    for res in tables["sequence_file"]:
        if tables["sequence_file"][res]["pre_process_id"] is not None:
            pre_process_config_ids.append(
                tables["sequence_file"][res]["pre_process_id"]
            )
    pre_process_config_ids = list(dict.fromkeys(pre_process_config_ids))

    # Get pre process configs
    pre_process_config_rows = extractor.getTableEntries(
        "pre_process", "id", pre_process_config_ids
    )
    pre_process_configs = extractor.populateEntries(
        pre_process_config_rows, "pre_process"
    )

    # Prepare mapping with default to the same value
    mapped_pre_process_configs = {
        key: {"description": value, "link_local": key}
        for key, value in pre_process_configs.items()
    }

    return mapped_pre_process_configs


def get_files_filepath(filepath):
    return filepath + "/files"


def export_group_data(filesrc, filepath, groupids, log):
    log.info("exporting group data")
    extractor = GroupExtractor(db, log)

    tables = {}

    patient_rows = extractor.getAccessible("patient", groupids)
    tables["patient"], patient_ssids = extractor.populateSets(patient_rows)

    run_rows = extractor.getAccessible("run", groupids)
    tables["run"], run_ssids = extractor.populateSets(run_rows)

    generic_rows = extractor.getAccessible("generic", groupids)
    tables["generic"], generic_ssids = extractor.populateSets(generic_rows)

    sample_set_ids = patient_ssids + run_ssids + generic_ssids

    tables = export_peripheral_data(extractor, tables, sample_set_ids, log)

    log.infoConfig(tables)
    mapped_configs = export_configs(extractor, tables, log)
    mapped_pre_process_configs = export_pre_process_configs(extractor, tables, log)

    if not os.path.exists(filepath):
        os.makedirs(filepath)

    with open(filepath + "/export.json", "w") as outfile:
        json.dump(tables, outfile, ensure_ascii=False, encoding='utf-8')
    with open(filepath + "/config.json", "w") as outfile:
        json.dump(mapped_configs, outfile, ensure_ascii=False, encoding='utf-8')
    with open(filepath + "/pprocess.json", "w") as outfile:
        json.dump(mapped_pre_process_configs, outfile, ensure_ascii=False, encoding='utf-8')

    files_filepath = get_files_filepath(filepath)
    log.info("copying files from %s to %s" % (filesrc, files_filepath))
    copy_results_files(tables, filesrc, files_filepath, log)
    export_pre_process_log_files(tables, files_filepath, log)
    log.info("done")


def export_sample_set_data(filesrc, filepath, sample_type, sample_ids, log):
    log.info("exporting sample set data")
    ext = SampleSetExtractor(db, log)

    tables = {}

    rows = ext.getAccessible(sample_type, sample_ids)
    tables[sample_type], sample_set_ids = ext.populateSets(rows)

    tables = export_peripheral_data(ext, tables, sample_set_ids, log=log)

    log.infoConfig(tables)

    if not os.path.exists(filepath):
        os.makedirs(filepath)

    with open(filepath + "/export.json", "w") as outfile:
        json.dump(tables, outfile, ensure_ascii=False, encoding='utf-8')

    files_filepath = get_files_filepath(filepath)
    log.info("copying files from %s to %s" % (filesrc, files_filepath))
    copy_results_files(tables, filesrc, files_filepath, log)
    export_pre_process_log_files(tables, files_filepath, log)
    log.info("done")


def import_data(
    log,
    filesrc,
    filedest,
    groupid,
    config=None,
    pprocess=None,
    dry_run=False,
):
    log.info("importing data")
    data = {}
    with open(filesrc + "/export.json", "r") as infile:
        tmp = json.load(infile, encoding='utf-8')
        data = reencode_dict(tmp)

    config_mapper = ConfigMapper(log)
    if config:
        config_mapper.load(config)

    pprocess_mapper = ConfigMapper(log)
    if pprocess:
        pprocess_mapper.load(pprocess)

    importer = Importer(groupid, db, log, config_mapper, pprocess_mapper)

    try:
        set_types = ["patient", "run", "generic"]
        for stype in set_types:
            if stype in data:
                importer.importSampleSets(stype, data[stype])

        for row in data["analysis_file"]:
            data["analysis_file"][row]["patient_id"] = None
            data["analysis_file"][row]["config_id"] = None

        for row in data["fused_file"]:
            data["fused_file"][row]["patient_id"] = None

        importer.importTable(
            "sequence_file",
            data["sequence_file"],
            {"pre_process": "pre_process_id"},
            map_val=True,
        )
        importer.importTable(
            "sample_set_membership",
            data["membership"],
            {"sample_set": "sample_set_id", "sequence_file": "sequence_file_id"},
        )
        importer.importTable("scheduler_task", data["scheduler_task"], map_val=True)
        importer.importTable(
            "scheduler_run", data["scheduler_run"], {"scheduler_task": "task_id"}
        )
        importer.importTable(
            "results_file",
            data["results_file"],
            {
                "sequence_file": "sequence_file_id",
                "scheduler_task": "scheduler_task_id",
                "config": "config_id",
            },
        )
        importer.importTable(
            "analysis_file", data["analysis_file"], {"sample_set": "sample_set_id"}
        )
        importer.importTable(
            "fused_file",
            data["fused_file"],
            {"sample_set": "sample_set_id", "config": "config_id"},
        )

        if dry_run:
            db.rollback()
            log.info("dry run successful, no data saved")
        else:
            log.info("copying files from %s to %s" % (filesrc, filedest))
            files_filepath = get_files_filepath(filesrc)
            copy_results_files(data, files_filepath, filedest, log)
            import_pre_process_log_files(data, files_filepath, importer, log)
            db.commit()
            log.info("done")
    except Exception as exception:
        log.error("something went wrong : %s" % exception)
        log.error("rolling back !")
        db.rollback()
        log.error("rollback was successful")
        raise


def main():
    parser = argparse.ArgumentParser(description="Export and import data")
    subparsers = parser.add_subparsers(help="Select operation mode", dest="command")

    exp_parser = subparsers.add_parser(
        "export", help="Export data from the DB into a JSON file"
    )
    exp_subparser = exp_parser.add_subparsers(
        dest="mode", help="Select data selection method"
    )

    ss_parser = exp_subparser.add_parser(
        "sample_set", help="Export data by sample-set ids"
    )
    ss_parser.add_argument(
        "sample_type",
        type=str,
        choices=["patient", "run", "generic"],
        help="Type of sample",
    )
    ss_parser.add_argument(
        "ssids",
        metavar="ID",
        type=int,
        nargs="+",
        help="Ids of sample sets to be extracted",
    )

    group_parser = exp_subparser.add_parser("group", help="Export data by groupid")
    group_parser.add_argument(
        "groupids",
        metavar="GID",
        type=int,
        nargs="+",
        help="The long IDs of the exported groups",
    )

    import_parser = subparsers.add_parser(
        "import", help="Import data from JSON into the DB"
    )
    import_parser.add_argument(
        "--dry-run",
        dest="dry",
        action="store_true",
        help="With a dry run, the data will not be saved to the database",
    )
    import_parser.add_argument(
        "--config", type=str, dest="config", help="Select the config mapping file"
    )
    import_parser.add_argument(
        "--pre-process",
        type=str,
        dest="pprocess",
        help="Select the pre-process mapping file",
    )
    import_parser.add_argument(
        "groupid", type=int, help="The long ID of the receiver group"
    )

    parser.add_argument(
        "-p",
        type=str,
        dest="filepath",
        default="./",
        help="Select the file destination",
    )
    parser.add_argument(
        "-s", type=str, dest="filesrc", default="./", help="Select the file source"
    )
    parser.add_argument(
        "--debug", dest="debug", action="store_true", help="Output debug information"
    )

    args = parser.parse_args()

    log = MigrateLogger()
    if args.debug:
        log.getLogger().setLevel(logging.DEBUG)

    if args.command == "export":
        if args.mode == "group":
            export_group_data(args.filesrc, args.filepath, args.groupids, log=log)
        elif args.mode == "sample_set":
            export_sample_set_data(
                args.filesrc, args.filepath, args.sample_type, args.ssids, log=log
            )
    elif args.command == "import":
        if args.dry:
            log.getLogger().setLevel(logging.DEBUG)
        import_data(
            log,
            args.filesrc,
            args.filepath,
            args.groupid,
            args.config,
            args.pprocess,
            args.dry,
        )


if __name__ == "__main__":
    main()
