
import urllib
import sys
import re
import os
import fasta

API_EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?'

API_EUTILS += 'api_key='+os.environ['NCBI_KEY']+'&' if 'NCBI_KEY' in os.environ else ''

API_NUCCORE_ID =         API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s'
API_NUCCORE_ID_FROM_TO = API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s' + '&from=%s&to=%s&strand=%d'

API_GENE_ID_XML = API_EUTILS + 'db=gene&retmode=xml&rettype=docsum' + '&id=%s'


from xml.dom import minidom, Node



# The two following functions should be refactored as one (used in split-germlines and get-CD)

def get_gene_sequence(gene, other_gene_name, start, end, additional_length):
    '''
    Return the gene sequences between positions start and end (included).
    '''
    reversed = False
    if end < start:
        tmp = end
        end = start
        start = tmp
        reversed = True

    if additional_length > 0:
        end += additional_length
    elif additional_length < 0:
        start = max(1, start + additional_length)

    fasta_string = urllib.urlopen(API_NUCCORE_ID_FROM_TO % (gene, start, end, 2 if reversed else 1)).read()
    return re.sub('(>\S*) ', r'\1|'+other_gene_name+'|', fasta_string)

def ncbi_and_write(ncbi, additional_header, outs):
    print ncbi, additional_header
    fasta = urllib.urlopen(API_NUCCORE_ID % ncbi).read()
    fasta_with_id = fasta.replace('>', '>' + additional_header)
    
    for out in outs:
        out.write(fasta_with_id)

def get_updownstream_sequences(gene, start, end, additional_length):
    '''
     Only returns upstream or downstream raw sequences

    :param gene: accession number where the sequence of interest is
    :param start, end: start and end positions in the sequence of
                       interest of our gene of interest. These are not
                       the positions we want to recover. We want to recover
                       positions that are either upstream or downstream.
                       Note that when the gene of interest is on the reverse
                       strand, we have start > end.
    :param additional_length: length of the upstream of downstream region to
                       recover. When additional_length > 0 we get the downstream
                       region, and conversely when additional_length < 0.
    :return: A tuple whose first element is the upstream region (or empty)
             and where the second element is the downstream region (or empty
    '''

    if additional_length == 0:
        return ('', '')
    reversed = -1 if (end < start) else 1
    if additional_length > 0:
        start = end + 1 * reversed
        end = end + additional_length * reversed
    elif additional_length < 0:
        end = start - 1 * reversed
        start = max(1, start + additional_length * reversed)

    updown_fasta = get_gene_sequence(gene, '', start, end, 0)

    updown_raw = '\n'.join(updown_fasta.split('\n')[1:]).strip()

    if additional_length > 0:
        return ('', updown_raw)
    else:
        return (updown_raw, '')


# Parse output from API_GENE_ID_XML to get genomic positions of a gene

def xml_bang_one(parent):
    return {node.nodeName: node.firstChild.nodeValue for node in parent.childNodes if node.nodeType == Node.ELEMENT_NODE}

def get_last_LocationHistType(gene):
    '''
    >>> get_last_LocationHistType(6969)
    {u'AssemblyAccVer': u'GCF_000001405.38', u'ChrAccVer': u'NC_000007.14', u'AnnotationRelease': u'109', u'ChrStop': u'38253379', u'ChrStart': u'38253428'}
    '''

    sys.stderr.write('%% eutils -> gene %s' % gene + '\n')
    xml = minidom.parseString(urllib.urlopen(API_GENE_ID_XML % gene).read())

    locations = xml.getElementsByTagName('LocationHistType')

    if locations:
        return xml_bang_one(locations[0])
    else:
        raise KeyError, gene

def get_gene_positions(gene):
    '''
    >>> get_gene_positions(6969)
    (u'NC_000007.14', 38253428, 38253379)

    >>> get_gene_positions('zoycooxz')
    Traceback (most recent call last):
      ...
    KeyError: 'zoycooxz'
    '''

    loc = get_last_LocationHistType(gene)

    chr = loc['ChrAccVer']
    start, stop = int(loc['ChrStart'])+1, int(loc['ChrStop'])+1

    return chr, start, stop
