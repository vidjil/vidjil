import defs

import os, sys


def create_clone_db_for_sequences(sequences, output_file):
    vidjil_to_fasta_path = os.path.dirname(os.path.realpath(sys.argv[0]))
    vidjil_to_fasta_path = os.path.join(vidjil_to_fasta_path, '..', '..', '..', '..', '..', 'tools')

    vtf_metadata = []
    vtf_result_files = []
    for sequence in sequences:
        sample_sets = db(db.sample_set_membership.sequence_file_id == sequence.id).select(db.sample_set_membership.sample_set_id)
        last_results = get_last_results(sequence.id)
        for result in last_results:
            if result.data_file is not None:
                vtf_metadata.append('-d "'+' '.join(['sample_set='+str(s.sample_set_id) for s in sample_sets])+' '+'config_id='+str(result.config_id)+'"')
                vtf_result_files.append(defs.DIR_RESULTS+result.data_file)

    command = 'python %s/vidjil-to-fasta.py %s -w -o %s %s ' % (vidjil_to_fasta_path, ' '.join(vtf_metadata), output_file, ' '.join(vtf_result_files))
    os.system(command)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print >> sys.stderr, "Usage: %s <output file> <id>+\n\n\
        Create a FASTA file to be used for a clonotype database.\n\
        The results are retrieved from the results for all the sequences of the provided users\n\n\
        \t<id>: user id for whom we want to get the sequence files" % sys.argv[0]
        exit(1)
    output_file = sys.argv[1]
    uploader_ids = [int(user_id) for user_id in sys.argv[2:]]

    create_clone_db_for_sequences(get_sequences_from_uploaders(uploader_ids), output_file)
