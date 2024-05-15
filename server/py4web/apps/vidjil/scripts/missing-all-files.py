import os
import os.path
import sys

sys.path.append("../../../")

from apps.vidjil.common import db
from apps.vidjil import defs

def rbx_link(patient_id, config_id):
    return 'http://app.vidjil.org/browser/?patient=%s&config=%s' % (patient_id,config_id)

def print_patient_info(patient_id):
    patient = db.patient[patient_id]
    print("%3s" % patient_id, end=' ')
    if patient is not None:
        print("%-25s" % (patient.first_name + ' ' + patient.last_name), end=' ')

def print_config_info(config_id):
    config = db.config[config_id]
    if config is None:
        print("none_config")
    else:
        print("%s" % config.name, end=' ')

def print_sequence_file(res):
    fused_files = db((db.fused_file.sequence_file_list.startswith('%d_' % res.id)) | (db.fused_file.sequence_file_list.contains('_%d_' % res.id))).select()
    
    print("%5s" % res.id, "%2s" % res.provider, "%-20s" % res.producer, end=' ') 

    print_patient_info(res.patient_id)
    print("%s\t%s" % (res.filename, res.data_file), end=' ')
    for fused in fused_files:
        if fused is not None and fused != '<NULL>':
            print(rbx_link(res.patient_id, fused.config_id), end=' ')
    print()

def print_results_file(res):
    seq = db.sequence_file[res.sequence_file_id]
    print("%5s\t%s\t" % (res.id, res.data_file), end=' ')
    print_config_info(res.config_id)
    print("\t%s\t%s" % (seq.filename, seq.data_file), end=' ')
    print(rbx_link(seq.patient_id, res.config_id))

def print_fused_file(res):
    print("%5s\t%s\t%s\t" % (res.id, res.sequence_file_list, res.fused_file), end=' ')
    print_patient_info(res.patient_id)
    print_config_info(res.config_id)
    print(rbx_link(res.patient_id, res.config_id))

def print_analysis_file(res):
    print("%5s" % (res.id))
    print_patient_info(res.patient_id)
    print_config_info(res.config_id)
    print(rbx_link(res.patient_id, res.config_id))

def print_orphan_files(directory, prefix_filename, db_field):
    total_size = 0
    nb_files = 0
    for f in os.listdir(directory):
        if f.startswith(prefix_filename) and os.path.isfile(directory+f)\
           and db(db_field == f).count() == 0:
            print(f)
            total_size += os.path.getsize(directory+f)
            nb_files += 1
    print("%d bytes could be removed from %d files" % (total_size, nb_files))

print("** Missing sequences **")
for res in db(db.sequence_file).select():
    if res.data_file and not os.path.isfile(defs.DIR_SEQUENCES+res.data_file):
        print_sequence_file(res)

print("** Orphan sequence files **")
print_orphan_files(defs.DIR_SEQUENCES, "sequence_file.data_file", db.sequence_file.data_file)

print("** Orphan result files **")
print_orphan_files(defs.DIR_RESULTS, "results_file.data_file", db.results_file.data_file)

print("** Orphan fused files **")
print_orphan_files(defs.DIR_RESULTS, "fused_file.fused_file", db.fused_file.fused_file)

print("** Missing results **")
for res in db(db.results_file).select():
    if res.data_file is not None and not os.path.isfile(defs.DIR_RESULTS+res.data_file):
        print_results_file(res)

print("** Missing fused **")
for res in db(db.fused_file).select():
    if res.fused_file is not None  and not os.path.isfile(defs.DIR_RESULTS+res.fused_file):
        print_fused_file(res)

print("** Missing analysis **")
for res in db(db.analysis_file).select():
    if res.analysis_file is not None and not os.path.isfile(defs.DIR_RESULTS+res.analysis_file):
        print_analysis_file(res)
        
