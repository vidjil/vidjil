from __future__ import print_function
import defs
import os.path
import base64

def can_be_compressed(original_filename, server_filename):
    server_ext = os.path.splitext(server_filename)[1][1:].lower()
    return server_ext in ['fasta', 'fastq', 'fa', 'fq']\
        and original_filename is not None\
        and original_filename[-3:].lower() <> ".gz"\
        and os.path.exists(server_filename)\
        and not os.path.islink(server_filename)

def get_new_uploaded_filename(data_file, new_filename):
    '''
    Rename the name given to a file uploaded by the user
    (it is the real filename, not the one use by web2py to store files.
    '''
    ext_pos = data_file.rfind('.')
    name_pos = data_file.rfind('.', 0, ext_pos)
    new_filename_ext = os.path.splitext(new_filename)[1]
    new_data_file_name = data_file[:name_pos+1] + base64.b16encode(new_filename).lower() + new_filename_ext
    return new_data_file_name

def compress_all_sequences():
    sequences = db(db.sequence_file).select()
    compressed = []
    for seq in sequences:
        if seq.data_file is not None:
            data_file = defs.DIR_SEQUENCES+seq.data_file
            if can_be_compressed(seq.filename, data_file):
                os.system('gzip -9 '+data_file)
                new_filename = seq.filename+".gz"
                new_data_filename = get_new_uploaded_filename(data_file, new_filename)
                os.rename(data_file+".gz", new_data_filename)
                log.debug('Compressed '+new_data_filename)
                db.sequence_file[seq.id] = dict(filename = new_filename,\
                                                data_file = os.path.basename(new_data_filename),\
                                                size_file = os.path.getsize(new_data_filename))
                compressed.append({'data_file': new_data_filename, 'original': new_filename, 'id': seq.id})
    return compressed


if __name__ == "__main__":
    compressed = compress_all_sequences()
    for elements in compressed:
        print ("Compressed %s %s %d" % (elements['data_file'], elements['original'], elements['id']))

