import defs
import os
import os.path

def rbx_link(patient_id, config_id):
    return 'http://rbx.vidjil.org/browser/?patient=%d&config=%d' % (patient_id,config_id)

def print_patient_info(patient_id):
    patient = db.patient[patient_id]
    print "%3s" % patient_id,
    print "%-25s" % (patient.first_name + ' ' + patient.last_name),

def print_config_info(config_id):
    config = db.config[config_id]
    print "%s" % config.name,

def print_sequence_file(res):
    fused_files = db(db.fused_file.sequence_file_list.contains('%d_' % res.id)).select()
    
    print "%5s" % res.id, "%2s" % res.provider, "%-20s" % res.producer, 

    print_patient_info(res.patient_id)
    print "%s\t%s" % (res.filename, res.data_file),
    for fused in fused_files:
        if fused is not None and fused != '<NULL>':
            print rbx_link(res.patient_id, fused.config_id),
    print

def print_results_file(res):
    seq = db.sequence_file[res.sequence_file_id]
    print "%5s\t%s\t" % (res.id, res.data_file),
    print_config_info(res.config_id)
    print "\t%s\t%s" % (seq.filename, seq.data_file),
    print rbx_link(seq.patient_id, res.config_id)

def print_fused_file(res):
    print "%5s\t%s\t%s\t" % (res.id, res.sequence_file_list, res.fused_file),
    print_patient_info(res.patient_id)
    print_config_info(res.config_id)
    print rbx_link(res.patient_id, res.config_id)

def print_analysis_file(res):
    print "%5s" % (res.id)
    print_patient_info(res.patient_id)
    print_config_info(res.config_id)
    print rbx_link(res.patient_id, res.config_id)


print "** Missing sequences **"
for res in db(db.sequence_file).select():
    if res.data_file and not os.path.isfile(defs.DIR_SEQUENCES+res.data_file):
        print_sequence_file(res)

print "** Orphan sequence files **"
total_size = 0
nb_files = 0
for f in os.listdir(defs.DIR_SEQUENCES):
    if os.path.isfile(defs.DIR_SEQUENCES+f) and db(db.sequence_file.data_file == f).count() == 0:
        print f
        total_size += os.path.getsize(defs.DIR_SEQUENCES+f)
        nb_files += 1
print "%d bytes could be removed from %d files" % (total_size, nb_files)

print "** Missing results **"
for res in db(db.results_file).select():
    if res.data_file is not None and not os.path.isfile(defs.DIR_RESULTS+res.data_file):
        print_results_file(res)

print "** Missing fused **"
for res in db(db.fused_file).select():
    if res.fused_file is not None  and not os.path.isfile(defs.DIR_RESULTS+res.fused_file):
        print_fused_file(res)

print "** Missing analysis **"
for res in db(db.analysis_file).select():
    if res.analysis_file is not None and not os.path.isfile(defs.DIR_RESULTS+res.analysis_file):
        print_analysis_file(res)
        
