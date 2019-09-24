import defs

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
