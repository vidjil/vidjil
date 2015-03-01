


def parse(fasta, endline=''):
    '''Iterates over sequences in a fasta files, yielding (header, sequence) pairs'''

    header = ''
    sequence = ''
    
    for l in fasta:
        l = l.strip()

        if not l:
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
        
def parse_as_Fasta(fasta):
    for (header, sequence) in parse(fasta):
        yield Fasta(header, sequence)


class Fasta():

    def __init__(self, header, sequence):
        self.header = header
        self.seq = sequence

    @property
    def name(self):
        return self.header.split('|')[1]

    @property
    def species(self):
        return self.header.split('|')[2]

    def __len__(self):
        return len(self.seq)
    
    def __str__(self):
        return '>%s\n%s\n' % (self.header, self.seq)
    
