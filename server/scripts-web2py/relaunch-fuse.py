from __future__ import print_function
import os.path
import sys
import defs
import argparse



def get_fused_files_from_sequence_filename(substring):
    seq_ids = db(db.sequence_file.filename.contains(substring)).select(db.sequence_file.id)
    
    for id in seq_ids:
        fused_files=db(db.fused_file.sequence_file_list.contains('%d_' % id.id)).select()

def get_fused_files_from_fused_filename(filename):
    fused_file = db(db.fused_file.fused_file == filename).select()
    if len(fused_file) == 0:
        print("Warning no corresponding file found for %s" % filename, file=sys.stderr)
    return fused_file

def print_fuse_files(fused_files):
    for fused in fused_files:
        sequence_file_ids = fused.sequence_file_list.split('_')
        sequence_file_ids.pop() # Remove last (empty)
        result_filenames = []
        sequence_filenames = []
        for seq_id in sequence_file_ids:
            results = db((db.results_file.config_id == fused.config_id)\
                         & (db.results_file.sequence_file_id == seq_id)).select(orderby=~db.results_file.id, limitby=(0,1))
            if len(results) > 0:
                result_filenames.append(results[0].data_file)
                sequence_filenames.append(db.sequence_file[seq_id].filename)
        if len(result_filenames) == 0:
            print("# No result for fused file: %s)" % (fused))
        else:
            results = ' '.join([defs.DIR_RESULTS+'{0}'.format(f) for f in result_filenames])
            comments = ' '.join(sequence_filenames)
            print ("python %s/fuse.py -o %s/%s -t 100 %s # %s http://app.vidjil.org/browser/index.html?sample_set_id=%d&config=%d"
                   % (os.path.abspath(defs.DIR_FUSE), defs.DIR_RESULTS,
                      fused.fused_file, results, comments,
                      fused.sample_set_id, fused.config_id))

parser = argparse.ArgumentParser(description='Display commands to be launched so that fuse files can be regenerated (they will be overwritten by the displayed commands). The script does not launch any command. It just displays the commands to be launched.')
parser.add_argument('-s', '--sequence', action='store_true', help='The [names] will be part of sequence original filename(s)')
parser.add_argument('-f', '--fuse', action='store_true', help='The [names] will be exact fused filenames to relaunch')
parser.add_argument('names', nargs='+', help='The [names] described above')
args = parser.parse_args()

if args.sequence:
    if args.fuse:
        print ("You cannot launch both -f and -s")
        exit(1)
    for sequence_filename in args.names:
        print_fuse_files(get_fused_files_from_fused_filename(sequence_filename))
elif args.fuse:
    print("%d fused files" % len(args.names), file=sys.stderr)
    for fused_filename in args.names:
        print(fused_filename, file=sys.stderr)
        print_fuse_files(get_fused_files_from_fused_filename(fused_filename))
else:
    print("You must specify -f or -s")
    exit(1)
