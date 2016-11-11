import defs
import base64

class SequenceFile():
    def __init__(self, data):
        self.id = data.id
        self.info = data.info
        self.sampling_date = data.date
        self.filename = data.filename
        self.pcr = data.pcr
        self.sequencer = data.sequencer
        self.producer = data.producer
        self.size_file = data.size_file
        self.size_file2 = data.size_file2
        self.provider = data.provider
        self.pre_process = data.pre_process
        self.pre_process_result = data.pre_process_result
        self.pre_process_flag = data.pre_process_flag
        self.pre_process_scheduler_task_id = data.pre_process_scheduler_task_id
        self.data_file = data.data_file
        self.data_file2 = data.data_file2
        self.original_filename = None
        self.original_filename2 = None

def get_sequence_file(id):
    data = db.sequence_file[id]
    return SequenceFile(data)

def get_original_filename(data_file):
    return db.sequence_file.data_file.retrieve_file_properties(data_file)['filename']

def get_new_uploaded_filename(data_file, new_filename):
    '''
    Rename the name given to a data_file uploaded by the user
    data_file: full path to the file stored by web2py on disk
    (new_filename is the real filename, not the one use by web2py to store files.)
    '''
    ext_pos = data_file.rfind('.')
    name_pos = data_file.rfind('.', 0, ext_pos)
    new_filename_ext = os.path.splitext(new_filename)[1]
    new_data_file_name = data_file[:name_pos+1] + base64.b16encode(new_filename).lower() + new_filename_ext
    return new_data_file_name

def update_name_of_sequence_file(id, filename, new_data_filename):
    '''
    Update a sequence_file table.
    filename: new (human readable) filename
    new_data_filename: new data_file full path to the file

    The size is updated with the new filename.
    '''
    db.sequence_file[id] = dict(filename = filename,\
                                data_file = os.path.basename(new_data_filename),\
                                size_file = os.path.getsize(new_data_filename))

def get_patient_id(file_id):
    ''' 
    return patient id of the selected file
    return -1 if no patient are associated with the sequence file
    '''
    query = db( ( db.sample_set.sample_type == "patient")
           & ( db.sample_set.id == db.sample_set_membership.sample_set_id )
           & ( db.sample_set_membership.sequence_file_id == file_id)
           & ( db.sample_set.id == db.patient.sample_set_id)
           ).select(db.patient.id)
    
    patient_id = -1
    for row in query:
        patient_id = row.id
        
    return patient_id

def get_sequences_from_uploaders(user_ids):
    '''
    user_ids is a list of user who have uploaded the sequence files we are interested in
    '''
    return db(db.sequence_file.provider.belongs(user_ids)).select(db.sequence_file.ALL)

def get_run_id(file_id):
    ''' 
    return run id of the selected file
    return -1 if no run are associated with the sequence file
    '''
    query = db( ( db.sample_set.sample_type == "run")
           & ( db.sample_set.id == db.sample_set_membership.sample_set_id )
           & ( db.sample_set_membership.sequence_file_id == file_id)
           & ( db.sample_set.id == db.run.sample_set_id)
           ).select(db.run.id)
    
    run_id = -1
    for row in query:
        run_id = row.id
        
    return run_id
