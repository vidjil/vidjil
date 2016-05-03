import defs
import base64

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
