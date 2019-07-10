'''
Parses output of various RepSeq programs.
Takes either:
  - a .fa file, a _Summary.txt file as produced by IMGT/V-QUEST
  - or a results file produced by MiXCR or IgReC
and creates a .vdj file to be checked by should-vdj-to-tap.py

python repseq_vdj.py data-curated/curated_IG.fa data-curated/curated_ig_Summary.txt > data-curated/imgt-IG.vdj
python repsep_vdj.py data-curated/curated_TR.fa data-curated/curated_tr_Summary.txt > data-curated/imgt-TR.vdj
python repseq_vdj.py data-curated/mixcr.results > data-curated/mixcr.vdj
python repseq_vdj.py bla.igrec.results
python repseq_vdj.py data-curated/curated_IG.fa data-curated/igblast/IG/*.aln > data-curated/igblast-IG.vdj > data-curated/igblast-IG.vdj
python repseq_vdj.py data-curated/curated_TR.fa data-curated/igblast/TR/*.aln > data-curated/igblast-TR.vdj > data-curated/igblast-TR.vdj
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

        if self.result:
            for i, data in enumerate(self.result.split('\t')):
                self.d[self.labels[i]] = data

            self.populate()

    def __getitem__(self, key):
        return self.d[key]

    def __str__(self):
        return str(self.d)


### IgReC

IGREC_LABELS = [
  'Read id', 'locus',
  'V id', 'V start', 'V end', 'V score',
  'J id', 'J start', 'J end', 'J score',
]

class IgReC_Result(Result):

    r'''
    >>> lig = '\t'.join(['blabli4577', 'TRB', 'TRBV13*02', '1', '164', '0.58156', 'TRBJ1-5*01', '319', '367', '0.94'])
    >>> r = IgReC_Result(lig)

    >>> r['Read id']
    'blabli4577'
    >>> r.vdj[V]
    ['TRBV13*02']
    >>> r.vdj[J]
    ['TRBJ1-5*01']
    '''

    def parse(self, l):
        self.labels = IGREC_LABELS
        if ('\t' in l.strip()):
            return l
        else:
            return None

    def populate(self):
        self.vdj[V] = [self['V id']]
        self.vdj[J] = [self['J id']]


def header_igrec_results(ff_igrec):

    f = open(ff_igrec).__iter__()

    while True:
        l = f.next()
        result = IgReC_Result(l)
        yield result['Read id'], result.to_vdj()


### MiXCR

class MiXCR_Result(Result):

    def parse(self, l):
        self.labels = mixcr_labels
        if ('\t' in l.strip()):
            return l
        else:
            return None

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
        if ('No result' not in l):
            return l
        else:
            return None

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


### igBlast

igblast_labels = [V, D, J, "Chain", None, None, None, None, None, None]
igblast_VJ_labels = [V, J, "Chain", None, None, None, None, None, None]

class igBlast_Result(Result):
    '''Stores a igBlast result (.aln)'''

    def parse(self, ll):
        self.labels = igblast_labels

        go = False
        for l in ll:
            if "V-(D)-J rearrangement summary" in l:
                if "Top V gene match, Top J gene match" in l:
                    self.labels = igblast_VJ_labels
                go = True
                continue
            if go:
                return l

        return None

    def parse_gene_and_allele(self, s):
        if s == 'N/A':
            return []
        return s.split(',')

    def populate(self):
        self.vdj[V] = self.parse_gene_and_allele(self[V])
        if D in self.d:
            self.vdj[D] = self.parse_gene_and_allele(self[D])
        self.vdj[J] = self.parse_gene_and_allele(self[J])



def header_igblast_results(ff_fasta, ff_igblast):

    f_fasta = open(ff_fasta).__iter__()

    for f in ff_igblast:
        fasta = ''
        # Advance until header line
        while not '>' in fasta:
            fasta = f_fasta.next().strip()

        igblast = open(f).readlines()

        r = igBlast_Result(igblast)
        yield (fasta.replace('>', ''), r.to_vdj())


### Vidjil


VIDJIL_FINE = '{directory}/vidjil-algo --header-sep "#" -c designations -2 -3 -d -g {directory}/germline/homo-sapiens.g %s >> %s'
VIDJIL_KMER = '{directory}/vidjil-algo -w 20 --header-sep "#" -b out -c windows -uuuU -2 -g {directory}/germline/homo-sapiens.g %s > /dev/null ; cat out/out.segmented.vdj.fa out/out.unsegmented.vdj.fa >> %s'

def should_results_from_vidjil_output(f_log):
    '''
    Yield (should, result) couples from a Vidjil-algo output including lines in the form of:
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
            if pos == -1:
                pos = l.find(' ! ')
            if pos == -1:
                raise ValueError("No [+-!] in the line: {}".format(l))
            should = l[1:pos].replace('_', ' ')

            pos = l.find('\t')
            if pos == -1:
                raise ValueError("I expected a tabulation to separate the sequence name from the remainder")
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




### VDJ File

class VDJ_File():
    '''
    Handle .vdj files
    These files contain (#, >) couples of V(D)J designations, such as in:
    #TRDD2*01 1/AGG/1 TRDD3*01  TRD+
    >TRDD2*01  TRDD3*01
    '''

    def __init__(self):
        self.hr = []

    def __iter__(self):
        return self.hr.__iter__()

    def __len__(self):
        return len(self.hr)

    def write(self, f):
        for (header, result) in self.hr:
            f.write("#%s\n" % header)
            f.write(">%s\n" % result)
            f.write("\n")

    def parse_from_gen(self, gen):
        self.hr = list(gen)

    def parse_from_file(self, f):
        should = ''
        for l in f:

            l = l.strip()
            if not l:
                continue

            if l[0] == '#':
                should = l[1:]

            elif l[0] == '>':
                self.hr += [ (should, l[1:]) ]


### Main

if __name__ == '__main__':

    vdj = VDJ_File()

    if 'mixcr' in sys.argv[1]:
        vdj.parse_from_gen(header_mixcr_results(sys.argv[1]))
    elif 'igrec' in sys.argv[1]:
        vdj.parse_from_gen(header_igrec_results(sys.argv[1]))
    elif 'igblast' in sys.argv[2]:
        vdj.parse_from_gen(header_igblast_results(sys.argv[1], sys.argv[2:]))
    else:
        vdj.parse_from_gen(header_vquest_results(sys.argv[1], sys.argv[2]))

    vdj.write(sys.stdout)
