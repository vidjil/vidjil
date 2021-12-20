from requests import Session
from bs4 import BeautifulSoup as bs
import json
import re
import requests

import os
import random, string
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
        new_url  = self.url_server+"/sample_set/all?&%s%sformat=json&" % (set_type, filter_val)
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
        new_url = self.url_server+"/sample_set/index?id=%s&format=json&config_id=%s" % (set_id, config_id)
        # print( new_url )
        response = self.session.get(new_url, verify=False)
        print( " ====  site  =====" )
        # print(response.url)
        # print( response.content )
        content = json.loads(response.content)
        if len(content) == 0:
            print( "Empty sample set %s" % set_id)
        if isinstance(content, dict): #len(content) == 1 and content[0] == "message":
            print( "Sample set %s out of your right" % set_id)
            print( content["message"])
        else:
            print( "sample set %s: %s samples" % (set_id, len(content)))
            for sample in content:
                print( sample )
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

if  __name__ =='__main__':

    vidjil = Vidjil(url, False)
    # vidjil.login("plop@plop.com", "foobartest")
    vidjil.login("distinct@user.org", "foobartest")
    vidjil.getAllSamples()
    print( "vidjil.getSampleOfSet(1)" )
    vidjil.getSampleOfSet(1)
    print( "vidjil.getSampleOfSet(2)" )
    vidjil.getSampleOfSet(2)
    print( "vidjil.getSampleOfSet(3)" )
    vidjil.getSampleOfSet(3)


    vidjil = Vidjil(url, False)
    vidjil.login("plop@plop.com", "foobartest")
    print( "vidjil.getSampleOfSet(3)" )
    vidjil.getSampleOfSet(3)

