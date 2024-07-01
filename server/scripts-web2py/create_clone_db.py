import defs

import os, sys
import imp

def create_clone_db_for_sequences(sequences, output_file):
    vidjil_to_fasta_path = os.path.dirname(os.path.realpath(sys.argv[0]))
    vidjil_to_fasta_path = os.path.join(vidjil_to_fasta_path, '..', '..', '..', '..', '..', 'tools')
    sys.path.insert(1, vidjil_to_fasta_path)

    vtf_metadata = []
    vtf_result_files = []
    for sequence in sequences:
        sample_sets = db(db.sample_set_membership.sequence_file_id == sequence.id).select(db.sample_set_membership.sample_set_id)
        last_results = get_last_results(sequence.id)
        for result in last_results:
            if result.data_file is not None:
                vtf_metadata += ['-d', ' '.join(['sample_set='+str(s.sample_set_id) for s in sample_sets])+' '+'config_id='+str(result.config_id)]
                vtf_result_files.append(defs.DIR_RESULTS+result.data_file)

    vidjil2fasta = imp.load_source('vidjil_to_fasta', vidjil_to_fasta_path+os.path.sep+'vidjil-to-fasta.py')
    args = vidjil2fasta.parser.parse_args(vtf_metadata + ['-w', '-o', output_file] + vtf_result_files)
    vidjil2fasta.process_files(args)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: %s <output file> <id>+\n\n\
        Create a FASTA file to be used for a clonotype database.\n\
        The results are retrieved from the results for all the sequences accessible to the provided groups\n\n\
        \t<id>: group id for whom we want to get the sequence files" % sys.argv[0])
        exit(1)
    output_file = sys.argv[1]
    group_ids = [int(group_id) for group_id in sys.argv[2:]]

    create_clone_db_for_sequences(get_accessible_sequence_files_in_set_type(group_ids, defs.SET_TYPE_PATIENT), output_file)
