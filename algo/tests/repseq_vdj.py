'''
Parses output of various RepSeq programs.
Takes either:
  - a .fa file, a _Summary.txt file as produced by IMGT/V-QUEST
  - or a results file produced by MiXCR
and creates a .vdj file to be checked by should-vdj-to-tap.py

python repseq_vdj.py data-curated/curated_IG.fa data-curated/curated_ig_Summary.txt > data-curated/imgt-IG.vdj
python repsep_vdj.py data-curated/curated_TR.fa data-curated/curated_tr_Summary.txt > data-curated/imgt-TR.vdj
python repseq_vdj.py data-curated/mixcr.results > data-curated/mixcr.vdj
'''

import sys

def genes_to_vdj(genes):
    if not genes:
        return ''

    if len(genes) == 1:
        return genes[0]

    return '(%s)' % ','.join(genes)


def N_to_vdj(s):
    return '/%s/' % s

def CDR3_to_vdj(s):
    return '{%s}' % s if s else ''

class Result():
    '''Stores a tabulated result'''

    def __init__(self, l):

        self.d = {}
        self.result = self.parse(l)

        for i, data in enumerate(l.split('\t')):
            self.d[self.labels[i]] = data

    def __getitem__(self, key):
        return self.d[key]

    def __str__(self):
        return str(self.d)


class MiXCR_Result(Result):

    def parse(self, l):
        self.labels = mixcr_labels
        return ('\t' in l.strip())

    def to_vdj(self):

        if not self.result:
            return 'no result'

        s = ''
        s += genes_to_vdj([self['Best V hit']])
        s += ' '

        if self['Best D hit']:
            s += N_to_vdj(self['N. Seq. VDJunction'])
            s += ' '
            s += genes_to_vdj([self['Best D hit']])
            s += ' '
            s += N_to_vdj(self['N. Seq. DJJunction'])
        else:
            s += N_to_vdj(self['N. Seq. VJJunction'])

        s += ' '
        s += genes_to_vdj([self['Best J hit']])

        s += ' '
        s += CDR3_to_vdj(self['AA. Seq. CDR3'])

        return s


class IMGT_VQUEST_Result(Result):
    '''Stores a IMGT/V-QUEST result'''

    def parse(self, l):
        self.labels = vquest_labels
        return ('No result' not in l)

    def parse_gene_and_allele(self, s):
        '''
        Parse IMGT/V-QUEST fields such as:
        Homsap IGHV3-30*03 F, or Homsap IGHV3-30*18 F or Homsap IGHV3-30-5*01 F'
        '''

        genes = []
        for term in s.replace(',', '').split():
            if term in ['Homsap', '[F]', '(F)', 'F', 'P', 'or', 'and', '(see', 'comment)', 'ORF', '[ORF]']:
                continue
            genes += [term]
        return genes

    def to_vdj(self):

        if not self.result:
            return 'no result'

        s = ''
        s += genes_to_vdj(self.parse_gene_and_allele(self['V-GENE and allele']))
        s += ' '
        s += genes_to_vdj(self.parse_gene_and_allele(self['D-GENE and allele']))
        s += ' '
        s += genes_to_vdj(self.parse_gene_and_allele(self['J-GENE and allele']))

        s += ' '
        s += CDR3_to_vdj(self['AA JUNCTION'])

        return s



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

        r = IMGT_VQUEST_Result(vquest)
        yield (fasta.replace('>', ''), r.to_vdj())


def header_mixcr_results(ff_mixcr):

    f = open(ff_mixcr).__iter__()

    mixcr_first_line = f.next()
    globals()['mixcr_labels'] = mixcr_first_line.split('\t')

    while True:
        l = f.next()
        result = MiXCR_Result(l)
        yield result['Description R1'], result.to_vdj()


if __name__ == '__main__':

    if 'mixcr' in sys.argv[1]:
        gen = header_mixcr_results(sys.argv[1])
    else:
        gen = header_vquest_results(sys.argv[1], sys.argv[2])

    # output .vdj data
    for (header, result) in gen:
        print "#%s" % header
        print ">%s" % result
        print
