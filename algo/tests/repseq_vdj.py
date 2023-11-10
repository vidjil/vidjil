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
import json
import re

V = 'V'
D = 'D'
J = 'J'

N1 = 'N1'
N2 = 'N2'
N = 'N'

JUNCTION = 'JUNCTION'


class VDJ_Formatter():
    '''Stores fields and outputs a .vdj line'''

    def __init__(self):

        self.d = {}
        self.vdj = {}
        self.result = None

    def get_locus(self):
        '''
        >>> vdj = VDJ_Formatter()
        >>> vdj.vdj[V] = ['IGHV1-2*02']; vdj.vdj[D] = ['IGHD6-13*01']; vdj.vdj[J] = ['IGHJ5*02']
        >>> vdj.get_locus()
        'IGH'
        >>> vdj.vdj[J]=None
        >>> vdj.get_locus()
        'IGH+'
        >>> vdj.vdj[V]=None
        >>> vdj.get_locus()
        >>> vdj.vdj[V]=['TRAV1-1']; vdj.vdj[D]=None; vdj.vdj[J]=['TRAJ1*01']
        >>> vdj.get_locus()
        'TRA'
        >>> vdj.vdj[V]=['TRDV2*01']; vdj.vdj[D]=None; vdj.vdj[J]=['TRAJ29*01']
        >>> vdj.get_locus()
        'TRA+D'
        >>> vdj.vdj[V]=None; vdj.vdj[D]=['TRDD2*01']; vdj.vdj[J]=['TRAJ29*01']
        >>> vdj.get_locus()
        'TRA+D'
        >>> vdj.vdj[V]=['TRAV29/DV5*01']; vdj.vdj[D]=['TRDD3']; vdj.vdj[J]=['TRDJ1*01']
        >>> vdj.get_locus()
        'TRD'
        >>> vdj.vdj[V]=None; vdj.vdj[D]=['TRDD2']; vdj.vdj[J]=['TRDD3*01']
        >>> vdj.get_locus()
        'TRD+'
        >>> vdj.vdj[V]=None; vdj.vdj[D]=['TRDD2']; vdj.vdj[J]=['TRDJ3*01']
        >>> vdj.get_locus()
        'TRD+'
        >>> vdj.vdj[V]=['TRAV1']; vdj.vdj[D]=['TRDD2']; vdj.vdj[J]=['TRDJ3*01']
        >>> vdj.get_locus()
        'unexpected'
        '''
        genes = []
        if V in self.vdj and self.vdj[V]:
            if self.vdj[V][0] == 'Intron':
                genes.append('IGKV-Intron')
            else:
                genes.append(self.vdj[V][0])
        if D in self.vdj and self.vdj[D]:
            genes.append(self.vdj[D][0])
        if J in self.vdj and self.vdj[J]:
            if self.vdj[J][0] == 'KDE':
                genes.append('IGKJ-KDE')
            else:
                genes.append(self.vdj[J][0])
        if len(genes) <= 1:
            return None

        short_genes = [g[:4] for g in genes]
        locus_genes = set([g[:3] for g in genes])

        if len(locus_genes)==1:
            locus = locus_genes.pop()
            if locus+V in short_genes and locus+J in short_genes:
                return locus

            if len(set(short_genes))==1 and set(short_genes).pop() != 'TRDD':
                return 'unexpected'
            return locus+'+'
        else:
            if 'TRA' in locus_genes and 'TRD' in locus_genes:
                # We may have a mix of TRA or TRD but still being a real
                # TRD. We can also have TRA+D (TRDV and TRAJ)

                has_tradv = sum([ re.match('TRAV[0-9-]+/DV', g) != None for g in genes]) >0
                if 'TRAV' in short_genes and 'TRDJ' in short_genes and has_tradv:
                    return 'TRD'
                if ('TRDV' in short_genes or has_tradv or (len(genes) == 2 and 'TRDD' in short_genes)) \
                   and 'TRAJ' in short_genes:
                    return 'TRA+D'
                if 'TRDV' in short_genes and has_tradv and len(genes)==2 and 'TRDD' in short_genes:
                    # TRA/DV with TRDD
                    return 'TRD+'

        return 'unexpected'
    
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

    def locus_to_vdj(self, s):
        return ' [%s]' % s if s else ''
    

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

        s += self.locus_to_vdj(self.get_locus())

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

    def __contains__ (self, key):
        return key in self.d
    
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
        yield result['Read id'].replace('_', ' '), result.to_vdj()


### MiXCR

class MiXCR_Result(Result):

    def parse(self, l):
        self.labels = mixcr_labels
        if ('\t' in l.strip()):
            return l
        else:
            return None

    def populate(self):
        self.vdj[V] = [self['bestVHit']]
        if self['bestDHit']:
            self.vdj[D] = [self['bestDHit']]
        self.vdj[J] = [self['bestJHit']]

        if 'nSeqVDJunction' in self:
            self.vdj[N1] = self['nSeqVDJunction']
        if 'nSeqDJJunction' in self:
            self.vdj[N2] = self['nSeqDJJunction']
        if 'nSeqVJJunction' in self:
            self.vdj[N] = self['nSeqVJJunction']

        if 'aaSeqCDR3' in self:
            self.vdj[JUNCTION] = self['aaSeqCDR3']


def header_mixcr_results(ff_mixcr):

    f = open(ff_mixcr).__iter__()

    mixcr_first_line = f.next()
    globals()['mixcr_labels'] = mixcr_first_line.rstrip().split('\t')

    while True:
        l = f.next().rstrip()
        result = MiXCR_Result(l)
        yield result['descrsR1'], result.to_vdj()



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

### Vidjil (AIRR output)

class Vidjil_Result(Result):

    def __init__(self, l):
        self.d = l
        self.vdj = {}
        self.result = self.parse(l)
        if self.result:
            self.populate()
    
    def parse(self, l):
        self.labels = vidjil_labels
        return l

    def populate(self):
        if self['germline'] == 'not analyzed' or 'seg' not in self:
            self.result = None
            return
        self.vdj[V] = [self['seg']['5']['name']]
        seq = self['sequence']
        if '4' in self['seg']:
            self.vdj[D] = [self['seg']['4']['name']]
            if '5' in self['seg']:
                self.vdj[N1] = seq[self['seg']['5']['stop']+1:self['seg']['4']['start']]
            if 'j_sequence_start' in self:
                self.vdj[N2] = seq[self['seg']['4']['stop']+1:self['seg']['3']['start']]
        else:
            if '5' in self['seg'] and '3' in self['seg']:
                self.vdj[N] = seq[self['seg']['5']['stop']+1:self['seg']['3']['start']]
        self.vdj[J] = [self['seg']['3']['name']]

        if 'junction' in self['seg']:
            self.vdj[JUNCTION] = self['seg']['junction']['aa']


def header_vidjil_results(ff_fasta, ff_vidjil):

    f_fasta = open(ff_fasta).__iter__()
    vidjil = json.load(open(ff_vidjil))

    
    globals()['vidjil_labels'] = vidjil["clones"][0].keys()
    clone_nb = 0

    while True:

        fasta = ''
        # Advance until header line
        while not '>' in fasta:
            fasta = f_fasta.next().strip()

        result = Vidjil_Result(vidjil['clones'][clone_nb])
        yield (fasta.replace('>', ''), result.to_vdj())
        clone_nb += 1

def vidjil_reads_output(vidjil):
    v = open(vidjil)
    for line in v.readlines():
        line = line.rstrip()
        if line.startswith('>'):
            fields = re.split(' [+!-] ', line)
            should = fields[0][1:]
            matches = re.search('seed ([a-zA-Z+]+) SEG', fields[1])
            if matches and matches.groups():
                yield (should, '['+matches.group(1)+']')
            else:
                yield (should, '[xxx]')

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


VIDJIL_FINE = '{directory}/vidjil-algo -e {e_value} --header-sep "#" -c designations -2 -3 -d -g {directory}/germline/homo-sapiens.g %s >> %s'
VIDJIL_KMER = '{directory}/vidjil-algo -e {e_value} -w 20 --header-sep "#" -b out -c windows -uuuU -2 -g {directory}/germline/homo-sapiens.g %s > /dev/null ; cat out/out.detected.vdj.fa out/out.undetected.vdj.fa >> %s'

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

    if 'mixcr' in sys.argv[1].lower():
        vdj.parse_from_gen(header_mixcr_results(sys.argv[1]))
    elif 'igrec' in sys.argv[1].lower():
        vdj.parse_from_gen(header_igrec_results(sys.argv[1]))
    elif 'igblast' in sys.argv[-1].lower():
        vdj.parse_from_gen(header_igblast_results(sys.argv[1], sys.argv[2:]))
    elif 'vidjil' in sys.argv[-1].lower():
        if '_detect.fa' in sys.argv[-1].lower():
            # Output obtained from the segmented/unsegmented reads
            vdj.parse_from_gen(vidjil_reads_output(sys.argv[1]))
        else:
            vdj.parse_from_gen(header_vidjil_results(sys.argv[1], sys.argv[2]))
    else:
        vdj.parse_from_gen(header_vquest_results(sys.argv[1], sys.argv[2]))

    vdj.write(sys.stdout)
