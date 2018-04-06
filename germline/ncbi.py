
import urllib
import sys
import re

API_EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?'


API_NUCCORE_ID =         API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s'
API_NUCCORE_ID_FROM_TO = API_EUTILS + 'db=nuccore&rettype=fasta&retmode=text' + '&id=%s' + '&from=%s&to=%s'

API_GENE_ID_XML = API_EUTILS + 'db=gene&retmode=xml&rettype=docsum' + '&id=%s'


from xml.dom import minidom, Node



# The two following functions should be refactored as one (used in split-from-imgt and get-CD)

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
    return xml_bang_one(locations[0])

def get_gene_positions(gene):
    '''
    >>> get_gene_positions(6969)
    (u'NC_000007.14', 38253428, 38253379)
    '''

    loc = get_last_LocationHistType(gene)

    chr = loc['ChrAccVer']
    start, stop = int(loc['ChrStart']), int(loc['ChrStop'])

    return chr, start, stop
