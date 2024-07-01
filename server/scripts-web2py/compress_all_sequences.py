from __future__ import print_function
import defs
import os.path
import base64
import sys

def can_be_compressed(original_filename, server_filename):
    server_ext = os.path.splitext(server_filename)[1][1:].lower()
    return server_ext in ['fasta', 'fastq', 'fa', 'fq']\
        and original_filename is not None\
        and original_filename[-3:].lower() <> ".gz"\
        and os.path.exists(server_filename)\
        and not os.path.islink(server_filename)


def compress_all_sequences(simulate):
    sequences = db(db.sequence_file).select()
    compressed = []
    for seq in sequences:
        if seq.data_file is not None:
            data_file = defs.DIR_SEQUENCES+seq.data_file
            if can_be_compressed(seq.filename, data_file):
                if not simulate:
                    os.system('gzip -9 '+data_file)
                new_filename = seq.filename+".gz"
                new_data_filename = get_new_uploaded_filename(data_file, new_filename)
                if not simulate:
                    os.rename(data_file+".gz", new_data_filename)
                log.debug('Compressed {} {} -> {}'.format("(simulate) " if simulate else '', data_file, new_data_filename))
                if not simulate:
                    update_name_of_sequence_file(seq.id, new_filename, new_data_filename)
                compressed.append({'data_file': new_data_filename, 'original': new_filename, 'id': seq.id})
                db.commit()
    return compressed


if __name__ == "__main__":
    simulate = False
    if len(sys.argv) > 1:
        if sys.argv[1] == '-h':
            print("Usage: {} [-s]\n\n-s: just simulate".format(sys.argv[0]))
        elif sys.argv[1] == "-s":
            simulate = True
    if simulate:
        print("Simulating mode")
    compressed = compress_all_sequences(simulate)
    for elements in compressed:
        print ("Compressed %s %s %d" % (elements['data_file'], elements['original'], elements['id']))

