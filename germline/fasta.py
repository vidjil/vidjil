
import sys

COMPLEMENT_NUCLEOTIDE = {
    'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
    'Y': 'R', 'R': 'Y', # pyrimidine (CT) / purine (AG)
    'W': 'S', 'S': 'W', # weak (AT) / strong (GC)
    'K': 'M', 'M': 'K', #  keto (TG) / amino (AC)
    'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D',
    'N': 'N'
}

def revcomp(seq):
    '''Returns the reverse complement of a sequence

    >>> revcomp('ACGNTT')
    'AANCGT'
    '''
    rc = ''
    for nucl in seq[::-1]:
        try:
            rc += COMPLEMENT_NUCLEOTIDE[nucl.upper()]
        except KeyError:
            sys.stderr.write("! Unknown nucleotide : '%s' " % nucl + seq)
            rc += 'N'
    return rc

def parse(fasta, endline=''):
    '''Iterates over sequences in a fasta files, yielding (header, sequence) pairs'''

    header = ''
    sequence = ''
    
    for l in fasta:
        l = l.strip()

        if not l:
            continue

        if l[0] == '#':
            continue
    
        if l[0] == '>':
            if header or sequence:
                yield (header, sequence)
            header = l[1:]
            sequence = ''

        else:
            sequence += l + endline
            
    if header or sequence:
        yield (header, sequence)

def extract_field_if_exists(s, separator, field_number):
    fields = s.split(separator)
    if len(fields) > field_number:
        return fields[field_number]
    return str

def parse_as_Fasta(fasta):
    for (header, sequence) in parse(fasta):
        yield Fasta(header, sequence)

def verbose_open(name):
    print (" <== %s" % name)
    return open(name)

class Fasta():

    def __init__(self, header, sequence):
        self.header = header
        self.seq = sequence

    def revcomp(self):
        self.seq = revcomp(self.seq)

    @property
    def name(self):
        return extract_field_if_exists(self.header, '|', 1)

    @property
    def species(self):
        return extract_field_if_exists(self.header, '|', 2)

    def __len__(self):
        return len(self.seq)
    
    def __str__(self):
        return '>%s\n%s\n' % (self.header, self.seq)
    
