from requests import Session
from bs4 import BeautifulSoup as bs
import json
import re
import requests

import os
import random, string
import argparse
import getpass
import sys
from bs4 import BeautifulSoup
from requests_toolbelt import MultipartEncoder
# REmove warning if no SSL vérification
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TAGS = []
TAGS_UNDEFINED = []
url  = "https://localhost/vidjil/"
def prettyUrl(string):

    specChars = {
        ' ': '%20',    '!': '%21',    '"': '%22',
        '#': '%23',    '$': '%24',    '%': '%25',
        '&': '%26',    '\'': '%27',   '(': '%28',
        ')': '%29',    '*': '%2A',    '+': '%2B',
        ',': '%2C',    '-': '%2D',    '.': '%2E',
        '/': '%2F',    ':': '%3A',    ';': '%3B',
        '<': '%3C',    '=': '%3D',    '>': '%3E',
        '?': '%3F',    '@': '%40',    '[': '%5B',
        '\\': '%5C',   ']': '%5D',    '^': '%5E',
        '_': '%5F',    '`': '%60',    '{': '%7B',
        '|': '%7C',    '}': '%7D',    '~': '%7E'
    }
    new_string = ""
    for cara in string:
        if cara in specChars.keys():
            new_string += specChars[cara]
        else:
            new_string += cara
    return new_string



class Vidjil:

    def __init__(self, url_server, url_client=None, ssl=True):
        self.url_server = url_server
        self.url_client = url_client if url_client != None else url_server
        self.ssl = ssl
        print( "Vidjil(url_server:%s, url_client=%s, ssl=%s)" % (self.url_server, self.url_client, self.ssl) )
        self.session = requests.Session()
        cookie = requests.cookies.RequestsCookieJar()
        if os.path.exists('cookies'):
            cookie.load(ignore_discard=True, ignore_expires=True)
        self.session.cookies = cookie

    def login(self, email, password):
        response = self.session.get(self.url_server + '/default/user/login', verify=self.ssl)
        data = { "email":email, "password":password, 'remember_me':"on" }
        BS = BeautifulSoup(response.text, 'html.parser')
        for i, e in enumerate(BS.select('input[name]')):
            # print(i, e)
            if (e['name'][0] == '_'):
                data[e['name']] = e['value']
        m = MultipartEncoder(fields=data)
        headers = {'Content-Type': m.content_type }
        response = self.session.post(self.url_server + '/default/user/login', data = m, headers = headers, verify=self.ssl)

        if response.status_code != 200:
            self.logged = False
            print( "Error at loggin")
            return -1
        else:
            self.logged = True
            print( "Successfull login")
            self.whoami()
            # todo; print admin status; groups ?

    def getAllSampleset(self, set_type=None, filter_val=None):
        """ get all sample set """
        if not self.logged:
            print( "Should be logged")
            return -1
        set_type   = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        filter_val = "" if filter_val == None else "filter="+prettyUrl(filter_val)+"&"
        new_url  = self.url_server+"/sample_set/all.json?&%s%s&" % (set_type, filter_val)
        response = self.session.get(new_url, verify=self.ssl)
        content  = json.loads(response.content)
        return content

    def getSamplesetById(self, set_id=None, set_type=None):
        """ get a sample set by type and id """
        set_type = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        new_url  = self.url_server+"/sample_set/samplesetById?&id=%s&%s" % (set_id, set_type)
        response = self.session.get(new_url, verify=self.ssl)
        content  = json.loads(response.content)
        return content

    def createPatient(self, first_name='patient_api', last_name='API', sample_set_id=None, id=None, id_label=None, birth_date=None, info=None):
        data = {"group":"1","patient":[{
                    'id': id if id else "",
                    'sample_set_id': sample_set_id if sample_set_id else "",
                    'id_label': id_label if id_label else "",
                    'first_name': first_name, # mandatory
                    'last_name':last_name,
                    'birth': birth_date if birth_date else "",
                    'info': prettyUrl(info if info else "") # to modifiy specials caracters
                    }
                ]}
        url_data = json.dumps(data).replace(" ", "")
        new_url  = self.url_server + "/sample_set/submit?data=%s" % url_data
        response = self.session.post(new_url, verify=self.ssl)
        print( response.content )
        return

    def createRun(self, name='run_api', sample_set_id=None, id=None, id_label=None, run_date=None, info=None, sequencer=None, pcr=None):
        data = {"group":"1","run":[{
                    'id': id if id else "",
                    'sample_set_id': sample_set_id if sample_set_id else "",
                    'id_label': id_label if id_label else "",
                    'name': name, # mandatory
                    'run_date': run_date if run_date else "",
                    'info': prettyUrl(info if info else ""), # to modifiy specials caracters
                    'sequencer': sequencer if sequencer else "",
                    'pcr': pcr if pcr else ""
                    }
                ]}
        url_data = json.dumps(data).replace(" ", "")
        new_url  = self.url_server + "/sample_set/submit?data=%s" % url_data
        response = self.session.post(new_url, verify=self.ssl)
        print( response.content )
        return

    def createSet(self, name='set_api', sample_set_id=None, id=None, info=None):
        data = {"group":"1","generic":[{
                    'id': id if id else "",
                    'sample_set_id': sample_set_id if sample_set_id else "",
                    'name': name, # mandatory
                    'info': prettyUrl(info if info else "")
                    }
                ]}
        url_data = json.dumps(data).replace(" ", "")
        new_url  = self.url_server + "/sample_set/submit?data=%s" % url_data
        response = self.session.post(new_url, verify=self.ssl)
        print( response.content )
        return

    def whoami(self):
        new_url = self.url_server + "/default/whoami"
        response = self.session.get(new_url, verify=self.ssl)
        print( response.content )

    def getSampleOfSet(self, set_id, config_id=-1):
        new_url  = self.url_server+"/sample_set/index.json?id=%s&format=json&config_id=%s" % (set_id, config_id)
        response = self.session.get(new_url, verify=False)
        content  = json.loads(response.content)
        return content

    def launchAnalisysSample(self, sample_id, sequence_file_id, config_id, force=False):
        # get sample status
        data     = { 'sequence_file_id' : sequence_file_id, 'sample_set_id' : sample_id, 'config_id' : config_id }
        url_data = self.convertDataAsUrl(data)
        new_url  = self.url_server + "default/run_request?" + url_data
        response = self.session.get(new_url, verify=False)
        return

    def convertDataAsUrl(self, data):
        string = ""
        for key in data.keys():
            string+= "%s=%s&" % (key, data[key])
        return string

    def download(self, filepath, filename, server_name=None, original_names=None):
        """
        filepath is the name of the file as present in the server storage
        filename is the output filename to set to locally store
        """
        url = "%s/default/download/%s?filename=%s" % (self.url_server, filepath, filename)
        reponse = self.session.get(url, verify=False)
        # TODO: add verification step if same filename is already present
        open(filename, 'wb').write(reponse.content)

        # Clean file names
        if server_name and original_names:
            cmd = "sed -i 's/%s/%s/g' %s" % (server_name, original_names, filename)
            os.system( cmd )
        os.system( "sed -i 's/\\/mnt\\/upload\\/uploads\\///g' %s" % (filename) )
        for pattern in ["\\.fastq.gz", "\\.fq.gz", "\\.fasta", "\\.fastq", "\\.fa"]:
            os.system( "sed -i 's/%s//g' %s" % (pattern, filename) )

        print( "File created: %s" % filename)
        return

    def createSample(self, set_ids, sample_set_id, sample_type, file_filename, file_filename2, file_id, file_sampling_date, file_info, file_set_ids, source="computer", pre_process="0"):
        head_f1, tail_f1 = os.path.split(file_filename)
        head_f2, tail_f2 = os.path.split(file_filename2)

        data = {
            "source":source,
            "pre_process":pre_process,
            "set_ids":prettyUrl(set_ids if set_ids else ""),                   # ex: ":r+run_api+(67)",
            "file":[
                {
                    "filename":tail_f1,
                    "filename2":tail_f2,
                    "id":file_id,
                    "sampling_date":file_sampling_date,
                    "info": prettyUrl(file_info if file_info else ""),         # ex: "test+#age=25+#cat=val",
                    "set_ids": prettyUrl(file_set_ids if file_set_ids else "") # ex: ":p+tes+(2)"
                }
            ],
            "sample_set_id":sample_set_id,
            "sample_type":sample_type
        }
        url_data = json.dumps(data).replace(" ", "")
        new_url  = self.url_server + "/file/submit.json?data=%s" % url_data
        response = self.session.post(new_url, verify=self.ssl)

        if response.status_code != 200:
            raise Exception('createSample', "Error in creation of sample in set %s" % sample_set_id)
        content  = json.loads(response.content)
        file_ids = content["file_ids"][0]

        ## Upload files
        self.uploadSample(sample_id=file_ids, filepath=head_f1, filename=tail_f1,  pre_process=pre_process, file_number='1')
        if file_filename2 != None and file_filename2 != "":
            self.uploadSample(sample_id=file_ids, filepath=head_f2, filename=tail_f2, pre_process=pre_process, file_number='2')
        print("Upload completed: '%s' and '%s'" % (tail_f1, tail_f2))
        return content

    def uploadSample(self, sample_id, filepath, filename, pre_process, file_number):
        data     = {'pre_process': pre_process, 'id': sample_id, 'file_number': file_number}
        new_url  = self.url_server + "/file/upload.json"
        response = self.session.post(new_url, data = data, files={'file':(filename, open(filepath+"/"+filename,'rb'))}, verify=self.ssl)
        if response.status_code != 200:
            raise Exception('uploadSample', "Error in upload of sample")
        return



#########################
### Some utils functions
#########################
def extractTags(string):
    '''
    Extract tags from information field of set/sample
    Data if also added to a global tags list
    '''
    tags = []
    for sub in string.split(" "):
        if sub != "" and sub.startswith("#"):
            tags.append( sub[1:])
    global TAGS
    TAGS += tags
    return tags

################################
### More functions for stats use
################################
def generateCatFromData(data, fileout, name_to_use="sequence_name"):
    '''
    Take extraction data to generate clean cateories file from tags
    Data save under file for stats usage
    '''
    formated = {}
    for sampleset in data:
        dico = {"birth" : sampleset["birth"] if not 'None' else ""}
        dico = addCatsFromTags(dico, sampleset["tags"])
        for sample in sampleset["samples"]:
            new_dico = {}
            for key in dico.keys():
                new_dico[key] = dico[key]
            new_dico = addCatsFromTags(new_dico, sample["tags"])
            name = sample[name_to_use]
            for pattern in [".fasta", ".fastq.gz", ".fastq"]:
                name = name.replace(pattern, "")
            formated[name] = new_dico
    print( formated )
    open(fileout, 'w').write(json.dumps(formated))
    return formated


def defineTag(tag):
    '''
    Give a categories for some already known tag value (disease, primerset, ...)
    '''
    if tag in ["diag", "follow-up", "followup", "relapse"]:
        return "analyse"
    elif tag in ["LAL", "LAL-T", "LAL-B", "Waldenstrom", "LAL", "health"]:
        return "disease"
    elif tag in ["illumina", "iontorrent", "pyro"]:
        return "sequencer"
    elif tag in ["biomed2", "ecngs", "inhouse"]:
        return "primers"
    else:
        return False

def addCatsFromTags(dico, tags):
    '''
    Add tags in dict; define cat and value before adding
    '''
    for tag in tags:
        if "=" in tag:
            cat, val = tag.split("=")
            print( "cat: %s, val: %s" % (cat, val))
            dico[cat] = val
        else:
            if defineTag(tag):
                dico[defineTag(tag)] = tag
            else:
                TAGS_UNDEFINED.append(tag)
    return dico

if  __name__ =='__main__':

    print("#", ' '.join(sys.argv))

    DESCRIPTION = 'Vidjil utility to access server by API script'
    
    #### Argument parser (argparse)

    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                    epilog='''Example:
  python3 %(prog)s --user USER --url-server URL_SERVER --certificat CERTIFICAT.CHAIN.PEM''',
                                    formatter_class=argparse.RawTextHelpFormatter)

    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('--user',       '-u', type=str, default=None, help='User to log in')
    group_options.add_argument('--url-server', '-s', type=str, default="https://localhost/vidjil/", help='URL of the server to access (%(default)s)')
    group_options.add_argument('--url-client',       type=str, default=None, help='URL of the client (optional)')
    group_options.add_argument('--certificat', '-c', type=str, default=None, help='path to certificat to use. Mandatory to access to a server and crypt sended/received data (password, patient name, ...)')
    group_options.add_argument('--test', action='store_true', help='run self-tests')
    args = parser.parse_args()

    if args.test:
        import doctest
        doctest.testmod(verbose = True)
        sys.exit(0)
    if args.user == None or args.certificat == None:
        print( "User and certificat file should be specified")
        sys.exit(0)

    user = args.user
    url_server = args.url_server
    url_client = args.url_client if (args.url_client != None) else args.url_server
    certificat = args.certificat


    try:
        password = getpass.getpass()
    except Exception as error:
        print('ERROR', error)
    else:
        print('Password entered:', password)

    vidjil = Vidjil(url_server, url_client=url_client, ssl=certificat)
    vidjil.login(user, password)

    # Some request return direct json data
    _set = vidjil.getSamplesetById(1,  "patient")
    print( _set )

    # some other return a batch of informations
    print( "=== Json data get by some mix html/json request ===")
    samples = vidjil.getSampleOfSet(1)
    print( "\n\nLength of samples: %s" % len(samples["query"]) )
    print( "Keys of samples: %s\n\n" % samples.keys() )

    # Specific data usually are stored under 'query' key
    print( "=== Items of samples in the set ===")
    for sample in samples["query"]:
        print( sample )
