
import urllib
import sys
import re

API_EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?'


API_NUCCORE_ID =         API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s'
API_NUCCORE_ID_FROM_TO = API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s' + '&from=%s&to=%s'




def get_gene_sequence(gene, other_gene_name, start, end):
    '''
    Return the gene sequences between positions start and end (included).
    '''
    fasta_string = urllib.urlopen(API_NUCCORE_ID_FROM_TO % (gene, start, end)).read()
    return re.sub('(>\S*) ', r'\1|'+other_gene_name+'|', fasta_string)





def ncbi_and_write(ncbi, additional_header, outs):
    print ncbi, additional_header
    fasta = urllib.urlopen(API_NUCCORE_ID % ncbi).read()
    fasta_with_id = fasta.replace('>', '>' + additional_header)
    
    for out in outs:
        out.write(fasta_with_id)

