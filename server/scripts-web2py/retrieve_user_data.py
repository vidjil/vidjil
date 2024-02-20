from __future__ import print_function
from datetime import datetime
import sys
import tarfile

if sys.argv[1] == "-h" or sys.argv[1] == "--help" or sys.argv[1] is None:
    print("Usage: %s <user id>\n\nRetrieve user's files (tar.gz format)." % sys.argv[0])
    exit(1)


user_id = sys.argv[1]
base_query = ((db.auth_user.id == user_id)
    &(db.auth_membership.user_id == db.auth_user.id)
    &(db.auth_group.id == db.auth_membership.group_id)
    &(db.auth_permission.group_id == db.auth_group.id)
    &(db.auth_permission.table_name == "patient")
    &(db.patient.id == db.auth_permission.record_id))

query = db( base_query &(db.fused_file.sample_set_id == db.patient.sample_set_id) & (db.fused_file.fused_file != ""))

fused_files = query.select(db.fused_file.fused_file.with_alias('filename'), distinct=True)

query = db(base_query & (db.analysis_file.sample_set_id == db.patient.sample_set_id) & (db.analysis_file.analysis_file != ""))
analysis_files = query.select(db.analysis_file.analysis_file.with_alias('filename'), distinct=True)

sequence_base_query = (base_query
                    & (db.patient.sample_set_id == db.sample_set_membership.sample_set_id)
                    & (db.sample_set_membership.sequence_file_id == db.sequence_file.id)
                    )

sequence_files = db(sequence_base_query & (db.results_file.data_file != "")).select(db.sequence_file.data_file.with_alias('filename'), distinct=True)

query = db(sequence_base_query & (db.results_file.sequence_file_id == db.sequence_file.id) & (db.results_file.data_file != ""))
results_files = query.select(db.results_file.data_file.with_alias('filename'), distinct=True)

log.info("Fused files: ")
log.info(fused_files)
log.info("Analysis files: ")
log.info(analysis_files)
log.info("Sequence_files: ")
log.info(sequence_files)
log.info("Result files: ")
log.info(results_files)

with tarfile.open("/mnt/result/user_files_" + user_id + "_" + str(datetime.now()) + ".tar.gz", "w:gz") as tar:
    for file_list in [(fused_files, defs.DIR_RESULTS),  (analysis_files, defs.DIR_RESULTS), (sequence_files, defs.DIR_SEQUENCES), (results_files, defs.DIR_RESULTS)]:
        for my_file in file_list[0]:
            log.info("loading: " + file_list[1] + my_file.filename)
            tar.add(file_list[1] + my_file.filename)

