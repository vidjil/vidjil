'''
python revcomp-fasta.py < in.fa > out.fa
'''

import fasta
import sys

for f in fasta.parse_as_Fasta(sys.stdin):
    f.revcomp()
    sys.stdout.write(str(f))


