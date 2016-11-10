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
import os

V = 'V'
D = 'D'
J = 'J'

N1 = 'N1'
N2 = 'N2'
N = 'N'

JUNCTION = 'JUNCTION'


class VDJ_Formatter():
    '''Stores fields and outputs a .vdj line'''

    def genes_to_vdj(self, genes):
        if not genes:
            return ''

        if len(genes) == 1:
            return genes[0]

        return '(%s)' % ','.join(genes)


    def N_to_vdj(self, s):
        return '/%s/' % s

    def CDR3_to_vdj(self, s):
        return '{%s}' % s if s else ''

    def to_vdj(self):
        if not self.result:
            return 'no result'

        s = ''
        s += self.genes_to_vdj(self.vdj[V])
        s += ' '

        if D in self.vdj:
            if N1 in self.vdj:
                s += self.N_to_vdj(self.vdj[N1])
                s += ' '
            s += self.genes_to_vdj(self.vdj[D])
            if N2 in self.vdj:
                s += ' '
                s += self.N_to_vdj(self.vdj[N2])
        else:
            if N in self.vdj:
                s += self.N_to_vdj(self.vdj[N])

        s += ' '
        s += self.genes_to_vdj(self.vdj[J])

        if JUNCTION in self.vdj:
            s += ' '
            s += self.CDR3_to_vdj(self.vdj[JUNCTION])

        return s


class Result(VDJ_Formatter):
    '''Stores a tabulated result'''

    def __init__(self, l):

        self.d = {}
        self.vdj = {}
        self.result = self.parse(l)

        for i, data in enumerate(l.split('\t')):
            self.d[self.labels[i]] = data

        if self.result:
            self.populate()

    def __getitem__(self, key):
        return self.d[key]

    def __str__(self):
        return str(self.d)



### MiXCR

class MiXCR_Result(Result):

    def parse(self, l):
        self.labels = mixcr_labels
        return ('\t' in l.strip())

    def populate(self):
        self.vdj[V] = [self['Best V hit']]
        if self['Best D hit']:
            self.vdj[D] = [self['Best D hit']]
        self.vdj[J] = [self['Best J hit']]

        self.vdj[N1] = self['N. Seq. VDJunction']
        self.vdj[N2] = self['N. Seq. DJJunction']
        self.vdj[N] = self['N. Seq. VJJunction']

        self.vdj[JUNCTION] = self['AA. Seq. CDR3']


def header_mixcr_results(ff_mixcr):

    f = open(ff_mixcr).__iter__()

    mixcr_first_line = f.next()
    globals()['mixcr_labels'] = mixcr_first_line.split('\t')

    while True:
        l = f.next()
        result = MiXCR_Result(l)
        yield result['Description R1'], result.to_vdj()



### IMGT/V-QUEST

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

    def populate(self):
        self.vdj[V] = self.parse_gene_and_allele(self['V-GENE and allele'])
        self.vdj[D] = self.parse_gene_and_allele(self['D-GENE and allele'])
        self.vdj[J] = self.parse_gene_and_allele(self['J-GENE and allele'])

        self.vdj[JUNCTION] = self['AA JUNCTION']


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



### Vidjil

VIDJIL_FINE = '{directory}/vidjil -X 100 -# "#" -c segment -i -3 -d -g {directory}/germline %s >> %s'
VIDJIL_KMER = '{directory}/vidjil -w 20 -# "#" -b out -c windows -uuuU -2 -i -g {directory}/germline %s > /dev/null ; cat out/out.segmented.vdj.fa out/out.unsegmented.vdj.fa >> %s'

def should_results_from_vidjil_output(f_log):
    '''
    Yield (should, result) couples from a Vidjil output including lines in the form of:
    >TRDD2*01_1/AGG/1_TRDD3*01__TRD+ + VJ 	0 84 88 187	TRDD2*01 1/AGG/1 TRDD3*01  TRD+
    or
    >TRDV3*01_0//0_TRDJ4*01 ! + VJ	0 49 50 97       TRD UNSEG noisy
    '''

    for l in open(f_log):
        if not l:
            continue
        if l[0] == '>':
            l = l.strip()
            pos = l.find(' + ') if ' + ' in l else l.find(' - ')
            should = l[1:pos].replace('_', ' ')

            pos = l.find('\t')
            result = l[pos+1:] + ' '

            yield (should, result)

def should_results_from_vidjil(program, f_should, f_log):
    '''
    Launch the program on f_should
    Yields (#, >) couples of V(D)J designations, such as in:
    #TRDD2*01 1/AGG/1 TRDD3*01  TRD+
    >TRDD2*01  TRDD3*01
    '''

    cmd = program % (f_should, f_log)

    with open(f_log, 'w') as f:
        f.write('# %s\n\n' % cmd)

    exit_code = os.system(cmd)
    if exit_code:
        print "Error. The program halted with exit code %s." % exit_code
        sys.exit(3)

    return should_results_from_vidjil_output(f_log)



### Main

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
