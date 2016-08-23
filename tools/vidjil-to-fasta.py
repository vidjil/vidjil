import fuse
import argparse
import os
import base64

MAX_TOP=99999999999

def print_fasta_header(header, outfile, options):
    '''
    Print the fasta header in the outfile.
    '''
    header = '>'+header

    if options.no_header_whitespace:
        header = header.replace(' ', '_')
    outfile.write(header+"\n")

def write_fuse_to_fasta(data, outfile, used_names, current_filename, options):
    '''
    Write the top clones (if specified in options.top)
    in the fasta file opened in the outfile.
    used_names is a dictionary that lists the sequence names
    used so far as well as their number of occurrences (prevents
    having sequences with the same name)
    '''

    if options.top < MAX_TOP:
        data.filter(data.getTop(options.top))

    for clone in data:
        if clone.d.has_key('sequence') and isinstance(clone.d['sequence'], basestring)\
        and len(clone.d['sequence']) > 0:
            if not clone.d.has_key('name'):
                name = "Anonymous"
            else:
                name = clone.d['name']
            additional_header_info = []
            if name in used_names:
                used_names[name] += 1
                additional_header_info.append(str(used_names[name]))
            else:
                used_names[name] = 1

            if options.germline:
                additional_header_info.append('germline=%s'%clone.d['germline'])
            if len(options.sample_name) > 0:
                sample_name = eval(options.sample_name)
                additional_header_info.append('sample_name=%s' % sample_name)

            if len(additional_header_info) > 0:
                additional_header_info = ' # '+' '.join(additional_header_info)
            else:
                additional_header_info = ''
            print_fasta_header('%s%s' % (name, additional_header_info),\
                               outfile, options)
            outfile.write(clone.d['sequence']+"\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description = 'Converts one or several .vidjil file to a .fasta file. The resulting .fasta file can notably be indexed',
                                     epilog = 'Example: python %(prog)s -o output.fasta in1.vidjil in2.vidjil in3.vidjil')

    parser.add_argument('--top', '-t', type=int, default=MAX_TOP, help = 'Keep only the top most clones. By default keep all the clones for which we have enough information.')
    parser.add_argument('--no-header-whitespace', '-w', action='store_true', help='Replace all whitespaces in the fasta header with _')
    parser.add_argument('--output', '-o', help='Name of the output FASTA file [REQUIRED]', required=True)
    parser.add_argument('--sample-name', '-n', default='', help = 'Provide the sample name in the fasta header. Some Python code can be provided as soon as it returns a string')
    parser.add_argument('--germline', '-g', action='store_true', help = 'When set, provide the germline of the sequence in the additional header informations')
    parser.add_argument('file', nargs='+', help='Input (.vidjil/.clntab) files')
    args = parser.parse_args()

    outfile = open(args.output, 'w')

    used_names = {}
    for vidjil in args.file:
        try:
            data = fuse.ListWindows()
            data.load(vidjil, "")
        except Exception:
            print "** Warning ** file %s could not be loaded" % vidjil
        else:
            write_fuse_to_fasta(data, outfile, used_names, vidjil, args)

    outfile.close()
