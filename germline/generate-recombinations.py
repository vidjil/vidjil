'''Generates artificial VJ recombinations'''

from __future__ import print_function
import json
import fasta
import random
import argparse
import os.path

random.seed(33328778554)

class vdj_repertoire:
    '''
    The class generates recombinations among a set of sequences
    '''

    labels = []
    sequences = []

    def __init__(self, labels = None, repertoire = None):
        '''
        repertoire should be a list of dictionary of a list of Fasta sequences
        '''
        if repertoire is not None:
            self.sequences = repertoire
            self.labels = labels

    @classmethod
    def files(self, labels, repertoire):
        '''
        Provide a list of list of sequences
        '''
        sequences = []
        for filenames in repertoire:
            current_sequences = []
            for filename in filenames:
                current_sequences += list(fasta.parse_as_Fasta(open(filename)))
            sequences.append(current_sequences)
        return self(labels, sequences)

    def germlines(self):
        return self.labels

    def nb_sequences(self, label):
        '''
        >>> rep = vdj_repertoire(['a', 'b'], [['aat', 'taa'], ['gcc']])
        >>> rep.nb_sequences('a')
        2
        >>> rep.nb_sequences('b')
        1
        >>> rep.nb_sequences('c')
        Traceback (most recent call last):
        ...
        ValueError: 'c' is not in list
        '''
        index = self.labels.index(label)
        return len(self.sequences[index])

    def recombinations(self, at_most = None):
        '''
        Returns a list of recombinations.
        The recombinations are given under the form of a list.

        >>> [v for v in vdj_repertoire(['a', 'b'], [['aat', 'taa'],\
                                        ['gcc']]).recombinations()]
        [['aat', 'gcc'], ['taa', 'gcc']]
        >>> len([v for v in vdj_repertoire(['a', 'b'], [['aat', 'taa'],\
                                        ['gcc']]).recombinations(1)])
        1
        '''
        if at_most is not None:
            return self._at_most_recombinations_(at_most)
        else:
            return self._all_recombinations_()

    def _at_most_recombinations_(self, at_most):
        nb = 0
        while nb < at_most:
            recombination = []
            for current_rep in self.sequences:
                recombination.append(random.choice(current_rep))
            yield recombination
            nb += 1

    def _all_recombinations_(self):
        return list_recombinations(self.sequences)

def list_recombinations(l):
    '''
    >>> [i for i in list_recombinations([[1], [10, 11], [100, 102]])]
    [[1, 10, 100], [1, 11, 100], [1, 10, 102], [1, 11, 102]]
    >>> [i for i in list_recombinations([[1, 2], [3]])]
    [[1, 3], [2, 3]]
    '''
    if len(l) <= 0:
        yield []
    else:
        for item in l[len(l)-1]:
            for recomb in list_recombinations(l[:-1]):
                recomb.append(item)
                yield recomb

class vdj_recombination:

    deletions = None
    insertions = None
    processing = []

    def __init__(self, insertions = None, deletions = None, processing = None):
        '''insertions and deletions are lists of length 1 or whose length are the
        number of locations where insertions and deletions take place. They
        contain a function with no parameter returning a natural integer
        corresponding to the number of expected insertions/deletions.

        processing is a list of the same size which contains a function which
        is applied to a string and which returns a string. It is used to alter
        the input sequence.

        '''
        if insertions is not None:
            self.insertions = insertions
        else:
            self.insertions = [(lambda: 0)]
        if deletions is not None:
            self.deletions = deletions
        else:
            self.deletions = [(lambda: 0)]
        if processing is not None:
            self.processing = processing
        else:
            self.processing = [(lambda s: s)]


    def recombine(self, sequences):
        '''
        Recombine the sequences with the provided recombinations
        >>> str(vdj_recombination().recombine([fasta.Fasta('a', 'AATTAT'),\
                                           fasta.Fasta('b', 'GGGACACAT'),\
                                           fasta.Fasta('c', 'ATAGATATGA')]))
        '>a 0//0 b 0//0 c\\nAATTAT\\nGGGACACAT\\nATAGATATGA\\n\\n'
        >>> str(vdj_recombination(deletions=[(lambda: 2)]).recombine([fasta.Fasta('a', 'AATTAT'),\
                                           fasta.Fasta('b', 'GGGACACAT'),\
                                           fasta.Fasta('c', 'ATAGATATGA')]))
        '>a 2//2 b 2//2 c\\nAATT\\nGACAC\\nAGATATGA\\n\\n'
        '''
        name = ''
        seq = ''
        insertions = self.insertions * (len(sequences)-1)
        deletions = self.deletions * (len(sequences)*2-2)
        process = self.processing * (len(sequences))
        for i, sequence in enumerate(sequences):
            nb_deletions_start = 0
            nb_deletions_end = 0
            N_insertions = ''
            sequence.seq = sequence.seq.translate(None, '.')

            if i > 0:
                # Start deletion
                nb_deletions_start = deletions[2*i-1]()
                name += '/%d ' % nb_deletions_start
            name += sequence.name
            if i < len(sequences) - 1:
                # End deletion
                nb_deletions_end = deletions[2*i]()
                N_insertions = random_sequence(['A', 'C', 'G', 'T'],\
                                               insertions[i]())
                name += ' %d/%s' % (nb_deletions_end, N_insertions)
            nb_deletions_end = -nb_deletions_end if nb_deletions_end > 0 else None
            seq += process[i](sequence.seq[nb_deletions_start:nb_deletions_end])+"\n"+N_insertions+"\n"
        return fasta.Fasta(name, seq)

def random_sequence(characters, length):
    return ''.join([random.choice(characters) for x in range(length)])

def mutate_sequence(sequence, probability):
    '''
    Mutate the original DNA sequence given in parameter.
    The probability is a per nucleotide probability.

    This solution is inspired from Blckknght's: http://stackoverflow.com/a/24063748/1192742
    '''
    mutated = []
    nucleotides = ['A', 'C', 'G', 'T']
    for nt in sequence:
        if random.random() < probability:
            if nt.upper() in nucleotides:
                nt = nucleotides[nucleotides.index(nt.upper()) - random.randint(1, 3)]
            else:
                nt = random.choice(nucleotides)
        mutated.append(nt)
    return ''.join(mutated)

def random_pos_int(mean, stddev):
    '''
    Returns a random number whose distribution
    has the mean provided has a parameter and the standard deviation
    is stddev
    '''
    result = random.gauss(mean, stddev)
    if result < 0:
        return 0
    return int(result)

def get_gene_name(allele):
    '''
    From fasta sequence to Ig/TR gene name
    '''
    return allele.name[:allele.name.find('*')]


def write_seq_to_file(seq, code, f):
    seq.header = seq.header.replace(' ', '_')+"__"+code
    f.write(str(seq))

def generate_to_file(repertoire, recombination, code, f, nb_recomb):
    print("  ==>", f)
    output = open(f, 'w')
    nb = 0
    for recomb in repertoire.recombinations():
        for i in range(nb_recomb):
            write_seq_to_file(recombination.recombine(recomb), code, output)
            nb += 1
    print("  ==> %d recombinations" % nb)


def list_random_tuple(s):
    try:
        list_r = s.split(':')
        result_list = []
        for item in list_r:
            one, two = map(float, item.split(','))
            result_list.append((lambda: random_pos_int(one, two)))
        return result_list
    except Exception, e:
        raise argparse.ArgumentTypeError('A list separated by colons, of couples separated by commas must be provided (ex: 1,2:2,1) '+str(e))

def list_int(s):
    try:
        result_list = []
        for item in s.split(':'):
            result_list.append((lambda: int(item)))
        return result_list
    except Exception, e:
        raise argparse.ArgumentTypeError('A list of integers separated by colons must be provided (ex: 1:2) '+str(e))

if __name__ == '__main__':
    DESCRIPTION='Script generating fake V(D)J recombinations'
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument('-g', '--germlines', type=file, default='homo-sapiens.g', help='path to the germlines.data file')
    parser.add_argument('--deletions', '-d', type=list_int, default = [(lambda: 5)], help='List -- separated by colons -- of the number of deletions at junctions (or single value, if the number is the same everywhere).')
    parser.add_argument('--insertions', '-i', type=list_int, default = [(lambda: 3)], help='List -- separated by colons -- of the number of insertions at junctions (or single value, if the number is the same everywhere')
    parser.add_argument('--random-deletions', '-D', type=list_random_tuple, help='List of random deletions at junctions under the format mean,standard_deviation (or single value, if the number is the same everywhere')
    parser.add_argument('--random-insertions', '-I', type=list_random_tuple, help='List of the number of insertions at junctions under the format mean,standard_deviation (or single value, if the number is the same everywhere')
    parser.add_argument('-n', '--nb-recombinations', type=int, default=5, help='Number of times each recombination (with insertions/deletions) is generated')
    parser.add_argument('-e', '--error', type=float, default = 0., help='Probability of error at the nucleotide level')

    args = parser.parse_args()

    germlines_json = args.germlines.read().replace('germline_data = ', '')
    germlines = json.loads(germlines_json)

    for code in germlines["systems"]:
        g = germlines["systems"][code]
        print("--- %s - %-4s - %s"  % (g['shortcut'], code, g['description']))
        basepath = germlines["path"] + os.path.sep
        # Read germlines

        nb_recomb = 0
        for recomb in g['recombinations']:
            labels = ['V']
            files = [[basepath + f for f in recomb['5']]]

            if '4' in recomb:
                labels.append('D')
                files.append([basepath + f for f in recomb['4']])

            labels.append('J')
            files.append([basepath + f for f in recomb['3']])
            repertoire = vdj_repertoire.files(labels, files)

            print("      5: %3d sequences\n" % repertoire.nb_sequences('V'),
                  "      4: %3d sequences\n" % (repertoire.nb_sequences('D') if 'D' in labels else 0),
                  "      3: %3d sequences\n" % repertoire.nb_sequences('J'))

            code_in_filename = code
            if nb_recomb > 0:
                code_in_filename = code_in_filename + '-%d' % (nb_recomb+1)

            # Generate recombinations
            # recombination0 = vdj_recombination()
            # generate_to_file(repertoire, recombination0, code, '../data/gen/0-removes-%s.should-vdj.fa' % code_in_filename, 1)

            deletions = args.deletions if args.random_deletions is None else args.random_deletions
            insertions = args.insertions if args.random_insertions is None else args.random_insertions

            recombination5 = vdj_recombination(deletions=deletions, insertions=insertions, processing = [(lambda s: mutate_sequence(s, args.error))])

            generate_to_file(repertoire, recombination5, code, '../data/gen/generated-%s.should-vdj.fa' % code_in_filename, args.nb_recombinations)

            print()
