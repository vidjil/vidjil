'''
Takes a .fa file, a _Summary.txt file as produced by IMGT/V-QUEST,
and creates a .vdj file to be checked by should-vdj-to-tap.py

python imgt-to-vdj.py data-curated/curated_IG.fa data-curated/curated_ig_Summary.txt > data-curated/curated_IG.vdj
python imgt-to-vdj.py data-curated/curated_TR.fa data-curated/curated_tr_Summary.txt > data-curated/curated_TR.vdj
'''

import sys


def parse_gene_and_allele_to_vdj(s):
    '''
    Parse lines such as:
    Homsap IGHV3-30*03 F, or Homsap IGHV3-30*18 F or Homsap IGHV3-30-5*01 F'
    and produce a .vdj line
    '''

    genes = []
    for term in s.replace(',', '').split():
        if term in ['Homsap', '[F]', '(F)', 'F', 'P', 'or', 'and', '(see', 'comment)', 'ORF']:
            continue
        genes += [term]

    if not genes:
        return ''

    if len(genes) == 1:
        return genes[0]

    return '(%s)' % ','.join(genes)


class IMGT_VQUEST_Result():

    '''Stores a IMGT/V-QUEST result'''

    def __init__(self, l):

        self.d = {}

        if 'No result' in l:
            self.result = False
            return

        self.result = True

        for i, data in enumerate(l.split('\t')):
            self.d[vquest_labels[i]] = data

    def __getitem__(self, key):
        return self.d[key]

    def to_vdj(self):

        if not self.result:
            return 'no result'

        s = ''
        s += parse_gene_and_allele_to_vdj(self['V-GENE and allele'])
        s += ' '
        s += parse_gene_and_allele_to_vdj(self['D-GENE and allele'])
        s += ' '
        s += parse_gene_and_allele_to_vdj(self['J-GENE and allele'])
        return s


    def __str__(self):
        return str(self.d)


def header_vquest_results(ff_fasta, ff_vquest):
    f_fasta = open(ff_fasta).__iter__()
    f_vquest = open(ff_vquest).__iter__()

    vquest_first_line = f_vquest.next()
    globals()['vquest_labels'] = vquest_first_line.split('\t')

    # print vquest_labels

    while True:

        fasta = ''
        # Advance until header line
        while not '>' in fasta:
            fasta = f_fasta.next().strip()

        vquest = ''
        # Advance until non-empty line
        while not vquest:
            vquest = f_vquest.next().strip()

        yield (fasta, vquest)


if __name__ == '__main__':

    for (header, result) in header_vquest_results(sys.argv[1], sys.argv[2]):
        # print "=========="
        print header.replace('>', '#')
        r = IMGT_VQUEST_Result(result)
        # print r
        print ">%s" % r.to_vdj()
        print
