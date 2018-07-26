import fuse
import argparse
import base64

MAX_TOP=99999999999
REPLACEMENT_WHITESPACE='~'

def print_fasta_header(header, outfile, options):
    '''
    Print the fasta header in the outfile.
    '''
    header = '>'+header

    if options.no_header_whitespace:
        header = header.replace(' ', '_')
    outfile.write(header+"\n")

def get_recombination_type(clone):
    '''
    >>> class tmp: d = {};
    >>> clone = tmp()
    >>> clone.d = {'seg': {'4': "D1", '4b': "D2"}}
    >>> get_recombination_type(clone)
    'VDDJ'

    >>> clone.d = {'seg': {'4': "D1"}}
    >>> get_recombination_type(clone)
    'VDJ'

    >>> clone.d = {'seg': {'5': "V", "3": "J"}}
    >>> get_recombination_type(clone)
    'VJ'

    >>> clone.d = {'seg': {'4a': "D1", '4b': "D2", '4c': "D3"}}
    >>> get_recombination_type(clone)
    'VDDDJ'
    '''
    number_of_Ds = ['4c', '4b', '4']
    i = 0
    D_seq = ""
    for d in number_of_Ds:
        if clone.d['seg'].has_key(d):
            D_seq = "D" * (len(number_of_Ds) - i)
            break
        i += 1
    return "V"+D_seq+"J"

def get_gene_positions(clone, end, gene_name):
    '''
    >>> class tmp: d = {};
    >>> clone = tmp()
    >>> clone.d = {'seg': {'5end': 10, '3start': 15}}
    >>> get_gene_positions(clone, 'stop', '5')
    10
    >>> get_gene_positions(clone, 'start', '3')
    15

    >>> clone.d = {'seg': {'5': {'stop': 10}, '3': {'start': 15}}}
    >>> get_gene_positions(clone, 'stop', '5')
    10
    >>> get_gene_positions(clone, 'start', '3')
    15

    >>> clone.d = {'seg': {'5': {'stop': 10}, '4': {'start': 11, 'stop': 12}, '3': {'start': 15}}}
    >>> get_gene_positions(clone, 'stop', '5')
    10
    >>> get_gene_positions(clone, 'start', '3')
    15
    >>> get_gene_positions(clone, 'stop', '4')
    12
    >>> get_gene_positions(clone, 'start', '4')
    11

    >>> clone.d = {'seg': {'5': {'stop': 10}, '4': {'start': 11, 'stop': 12}, '4b': {'start': 13, 'stop': 14}, '3': {'start': 15}}}
    >>> get_gene_positions(clone, 'stop', '5')
    10
    >>> get_gene_positions(clone, 'start', '3')
    15
    >>> get_gene_positions(clone, 'stop', '4')
    12
    >>> get_gene_positions(clone, 'start', '4')
    11
    >>> get_gene_positions(clone, 'stop', '4b')
    14
    >>> get_gene_positions(clone, 'start', '4b')
    13
    '''
    if not clone.d.has_key('seg'):
        return None
    seg = clone.d['seg']
    if seg.has_key(gene_name+end):
        return seg[gene_name+end]
    if end == 'stop' and seg.has_key(gene_name+'end'):
        return seg[gene_name+'end']
    elif seg.has_key(gene_name) \
         and isinstance(seg[gene_name], dict) \
         and seg[gene_name].has_key(end):
        return seg[gene_name][end]
    else:
        return None

def get_vdj_positions(recombination_type, clone):
    '''
    Return the start and end positions of all the genes in order.
    Or None if the clone doesn't have information on gene positions.

    >>> class tmp: d = {};
    >>> clone = tmp()
    >>> clone.d = {'seg': {'5end': 10, '3start': 15}, 'sequence': 'ATTAAAAAAAAAAAAAAAAA'}
    >>> get_vdj_positions('VJ', clone)
    [1, 11, 16, 20]

    >>> clone.d = {'seg': {'5': {'stop': 10}, '3': {'start': 15}}, 'sequence': 'ATTAAAAAAAAAAAAAAAAA'}
    >>> get_vdj_positions('VJ', clone)
    [1, 11, 16, 20]
    >>> get_vdj_positions('VDJ', clone)
    [1, 11, 16, 20]
    >>> get_vdj_positions('VDDJ', clone)
    [1, 11, 16, 20]

    >>> clone.d = {'seg': {'5': {'stop': 10}, '4': {'start': 11, 'stop': 12}, '3': {'start': 15}}, 'sequence': 'ATTAAAAAAAAAAAAAAAAA'}
    >>> get_vdj_positions('VDJ', clone)
    [1, 11, 12, 13, 16, 20]

    >>> clone.d = {'seg': {'5': {'stop': 10}, '4': {'start': 11, 'stop': 12}, '4b': {'start': 13, 'stop': 14}, '3': {'start': 15}}, 'sequence': 'ATTAAAAAAAAAAAAAAAAA'}
    >>> get_vdj_positions('VDDJ', clone)
    [1, 11, 12, 13, 14, 15, 16, 20]
    >>> get_vdj_positions('VDJ', clone)
    [1, 11, 12, 13, 16, 20]
    >>> get_vdj_positions('VJ', clone)
    [1, 11, 16, 20]

    >>> clone.d = {'seg': {'foo': 'bar'}}
    >>> get_vdj_positions('VDJ', clone)

    >>> clone.d = {'seg': {'5': 'IGHV', '3': 'IGHJ', '5end': 20}}
    >>> get_vdj_positions('VJ', clone)

    >>> clone.d = {'seg': {'5': 'IGHV', '3': 'IGHJ', '3start': 20}}
    >>> get_vdj_positions('VJ', clone)

    >>> clone.d = {'seg': {'5': 'IGHV', '3': 'IGHJ'}}
    >>> get_vdj_positions('VJ', clone)

    '''
    positions = [1]
    if not clone.d.has_key('seg'):
        return None
    seg = clone.d['seg']
    gene_pos_stop_5 = get_gene_positions(clone, 'stop', '5')
    gene_pos_start_3 = get_gene_positions(clone, 'start', '3')
    if gene_pos_stop_5 is None or gene_pos_start_3 is None:
        return None
    positions.append(gene_pos_stop_5+1)
    recombination_type = recombination_type[1:-1]
    i = 0
    for d in recombination_type:
        if len(recombination_type) == 1:
            d_name = '4'
        else:
            d_name = '4'+chr(ord('a')+i)
        if not seg.has_key(d_name) and d_name == '4a':
            d_name = '4'
        gene_pos_start_4 = get_gene_positions(clone, 'start', d_name)
        gene_pos_stop_4 = get_gene_positions(clone, 'stop', d_name)
        if gene_pos_start_4 is not None and gene_pos_stop_4 is not None:
            positions.append(gene_pos_start_4+1)
            positions.append(gene_pos_stop_4+1)
            i+=1
    positions.append(gene_pos_start_3+1)
    if (clone.d.has_key('sequence')):
        positions.append(len(clone.d['sequence']))
    else:
        # Arbitrary end
        positions.append(positions[-1] + 50)
    return positions


def write_fuse_to_fasta(data, outfile, used_names, current_filename, options, metadata=''):
    '''
    Write the top clones (if specified in options.top)
    in the fasta file opened in the outfile.
    used_names is a dictionary that lists the sequence names
    used so far as well as their number of occurrences (prevents
    having sequences with the same name)
    '''
    clones_percentage = {}

    if options.top < MAX_TOP:
        data.filter(data.getTop(options.top))

    if options.no_header_whitespace:
        spacer = REPLACEMENT_WHITESPACE
    else:
        spacer = ' '

    for clone in data:
        if clone.d.has_key('sequence') and isinstance(clone.d['sequence'], basestring)\
        and len(clone.d['sequence']) > 0 and clone.d.has_key('seg'):
            recombination = get_recombination_type(clone)
            name = recombination+spacer
            positions = get_vdj_positions(recombination, clone)
            if positions is None:
                continue
            name += spacer.join(map(str, positions))+spacer
            if not clone.d.has_key('name'):
                name += "Anonymous"
            else:
                name += clone.d['name'].replace(' ', spacer)
            additional_header_info = []

            #Percentage
            #take the max reads number of the samples (in case of multiple
            #samples)
            max_sample = max(clone.d['reads'])
            #take the index corresponding to the max_sample
            index_max_sample = clone.d['reads'].index(max_sample)
            germline = clone.d['germline']
            reads_total_nb = data.d['reads'].d['germline'][germline][index_max_sample]
            percentage = float(max_sample)/reads_total_nb

            if name in used_names:
                used_names[name] += 1
                additional_header_info.append(str(used_names[name]))
            else:
                used_names[name] = 1

            if options.germline:
                additional_header_info.append('germline=%s'%clone.d['germline'])
            if len(options.sample_name) > 0:
                sample_name = eval(options.sample_name)
            else:
                sample_name = current_filename
            additional_header_info.append('sample_name=%s' % sample_name)

            additional_header_info.append('percentage=%s'%percentage)

            if len(metadata) > 0:
                additional_header_info.append(metadata.replace(' ', spacer))

            if len(additional_header_info) > 0:
                additional_header_info = spacer+'#'+spacer+spacer.join(additional_header_info)
            else:
                additional_header_info = ''
            print_fasta_header('%s%s' % (name, additional_header_info),\
                               outfile, options)
            outfile.write(clone.d['sequence']+"\n")


def process_files(args):
    outfile = open(args.output, 'w')

    used_names = {}
    current_file = 0

    if len(args.metadata) != len(args.file):
        # Not of the same length: ignore metadata
        args.metadata = ['' for i in range(len(args.file))]

    for vidjil in args.file:
        try:
            data = fuse.ListWindows()
            data.load(vidjil, "")
        except Exception:
            print "** Warning ** file %s could not be loaded" % vidjil
        else:
            write_fuse_to_fasta(data, outfile, used_names, vidjil, args, args.metadata[current_file])
        current_file += 1

    outfile.close()

parser = argparse.ArgumentParser(description = 'Converts one or several .vidjil file to a .fasta file. The resulting .fasta file can notably be indexed',
                                     epilog = 'Example: python %(prog)s -o output.fasta in1.vidjil in2.vidjil in3.vidjil')

parser.add_argument('--top', '-t', type=int, default=MAX_TOP, help = 'Keep only the top most clones. By default keep all the clones for which we have enough information.')
parser.add_argument('--no-header-whitespace', '-w', action='store_true', help='Replace all whitespaces in the fasta header with '+REPLACEMENT_WHITESPACE)
parser.add_argument('--output', '-o', help='Name of the output FASTA file [REQUIRED]', required=True)
parser.add_argument('--sample-name', '-n', default='', help = 'Provide the sample name in the fasta header. Some Python code can be provided as soon as it returns a string')
parser.add_argument('--metadata', '-d', default = [], action='append', help = 'Provide metadata for each file. The option must be called each time for each file, in the same order as the files are given')
parser.add_argument('--germline', '-g', action='store_true', help = 'When set, provide the germline of the sequence in the additional header informations')
parser.add_argument('file', nargs='+', help='Input (.vidjil/.clntab) files')

if __name__ == '__main__':
    args = parser.parse_args()

    process_files(args)
