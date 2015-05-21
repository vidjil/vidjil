from __future__ import print_function
import os.path
import sys
import defs


def print_fuse_from_sequence_filename(substring):
    seq_ids = db(db.sequence_file.filename.contains(substring)).select(db.sequence_file.id)
    
    for id in seq_ids:
        fused_files=db(db.fused_file.sequence_file_list.contains('%d_' % id.id)).select()
        for fused in fused_files:
            sequence_file_ids = fused.sequence_file_list.split('_')
            sequence_file_ids.pop() # Remove last (empty)
            result_filenames = []
            sequence_filenames = []
            for seq_id in sequence_file_ids:
                results = db((db.results_file.config_id == fused.config_id)\
                             & (db.results_file.sequence_file_id == seq_id)).select(orderby=~db.results_file.id, limitby=(0,1))
                result_filenames.append(results[0].data_file)
                sequence_filenames.append(db.sequence_file[seq_id].filename)
            results = ' '.join([defs.DIR_RESULTS+'{0}'.format(f) for f in result_filenames])
            patient_id = str(db.sequence_file[id.id].patient_id)
            comments = ' '.join(sequence_filenames)+' (patientID: ' + patient_id +')'\
                       +' http://rbx.vidjil.org/browser/?patient=%s&config=%s' % (patient_id, fused.config_id)
            print ("python %s/fuse.py -o %s/%s -t 100 %s # %s" % (os.path.abspath(defs.DIR_FUSE),\
                                                           defs.DIR_RESULTS, fused.fused_file, results, comments))



if len(sys.argv) == 1 or sys.argv[0] == "-h" or sys.argv[0] == "--help":
    print("Usage: %s <substring>\n\nThe script just print fuse command to be launched. It doesn't launch any command.\n\nWarning the provided commands are designed to overwrite fused files" % sys.argv[0])
    exit(1)

print_fuse_from_sequence_filename(sys.argv[1])
