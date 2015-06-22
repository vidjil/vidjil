from __future__ import print_function
import defs
import os
import sys

def fastq_to_fasta(files, simulate = False):
    EXPECTED_EXT = ".fastq.gz"
    for file in files:
        seq = db(db.sequence_file.data_file == file).select().first()
        print (seq)
        if seq is not None and seq.filename is not None\
           and seq.filename[-len(EXPECTED_EXT):] == EXPECTED_EXT and os.path.isfile(defs.DIR_SEQUENCES+seq.data_file):
            new_filename = seq.filename[:-len(EXPECTED_EXT)] + ".fasta.gz"
            log.debug("fastq.gz > fasta.gz: Transform %s in %s" % (seq.filename, new_filename))

            new_data_filename = get_new_uploaded_filename(defs.DIR_SEQUENCES+seq.data_file, new_filename)
            cmd = "gunzip -c %s | sed -n '1~4s/^@/>/p;2~4p' | gzip -9 > %s" % (defs.DIR_SEQUENCES+seq.data_file,\
                                                                               new_data_filename)
            if simulate:
                print (cmd)
            else:
                os.system(cmd)
                update_name_of_sequence_file(seq.id, new_filename, new_data_filename)
                db.commit()
        else:
            if seq is not None:
                log.debug('fastq.gz > fasta.gz: Ignoring %s' % seq.data_file)

def get_users_sequence_files(users_list):
    '''
    Return the data filename of all the sequences possessed by those users (IDs must be given) 
    '''
    data_files = []
    for user in users_list:
        for result in db(db.sequence_file.provider == user).select(db.sequence_file.data_file):
            if result.data_file is not None and len(result.data_file) > 0 and result.data_file[0] <> '<':
                data_files.append(result.data_file)
    return data_files 

if __name__ == "__main__":
    if len(sys.argv) <= 2 or sys.argv[1] == "-h" or sys.argv[1] == "--help" or sys.argv[1][0] <> '-':
        print("Usage: %s [-n] (-s files+) | (-u users+)\n\nTransform .fastq.gz files in .fasta.gz files and update the DB accordingly.\nFiles that are not .fastq.gz are ignored.\n-n: not really (don't really do the stuff just simulate)\nWith -s option, sequence basenames must be directly provided. With -u all sequences files of the given user will be processed." % sys.argv[0], file=sys.stderr)
        exit(1)
    sys.argv.pop(0)
    option = sys.argv.pop(0)
    simulate = False
    if option == "-n":
        simulate = True
        option = sys.argv.pop(0)
    if option == "-s":
        fastq_to_fasta(sys.argv, simulate)
    elif option == "-u":
        fastq_to_fasta(get_users_sequence_files(sys.argv), simulate)
