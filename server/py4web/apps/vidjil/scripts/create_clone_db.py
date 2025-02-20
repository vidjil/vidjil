import os, sys
import importlib.util

sys.path.append("../../../")

from apps.vidjil import settings
from apps.vidjil.common import db
from apps.vidjil.modules import sampleSet
from apps.vidjil.modules.sequenceFile import get_accessible_sequence_files_in_set_type


def get_last_results(sequence_file, config_ids=None):
    '''
    Returns the last results files (one per config) for all
    the configs (or the configs passed in parameters (list).
    '''

    select_on_config = True     # Get all of them

    if config_ids is not None:
        select_on_config = db.results_file.config_id.belongs(config_ids)
    # First get the max run dates for the good result files
    select_max_run = db((db.results_file.sequence_file_id == sequence_file)\
                        & (db.results_file.hidden == False)\
                        & (select_on_config))._select(db.results_file.run_date.max().with_alias('max'),
                                                      groupby=db.results_file.config_id)

    return db((db.results_file.sequence_file_id == sequence_file) & (db.results_file.run_date.belongs(select_max_run))).select()

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
                vtf_result_files.append(settings.DIR_RESULTS+result.data_file)

    spec = importlib.util.spec_from_file_location("vidjil_to_fasta", vidjil_to_fasta_path)
    vidjil2fasta = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vidjil2fasta)

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

    create_clone_db_for_sequences(get_accessible_sequence_files_in_set_type(group_ids, sampleSet.SET_TYPE_PATIENT), output_file)
