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
from collections import defaultdict
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
        if not "auth_user_email__row" in str(response.content):
            raise Exception( "Login; server don't return a correct login form.\nPlease verify your url and certificate parameters.")

        data = { "email":email, "password":password, 'remember_me':"on" }
        BS = BeautifulSoup(response.text, 'html.parser')
        for i, e in enumerate(BS.select('input[name]')):
            # print(i, e)
            if (e['name'][0] == '_'):
                data[e['name']] = e['value']
        m = MultipartEncoder(fields=data)
        headers = {'Content-Type': m.content_type }
        response = self.session.post(self.url_server + '/default/user/login', data = m, headers = headers, verify=self.ssl)

        if response.status_code != 200 or "auth_user_email__row" in str(response.content):
            self.logged = False
            raise Exception( "Login; error at login step.\nVerify your user name and password.")
        else:
            self.logged = True
            print( "Successfull login")
            self.whoami()
            # todo; print admin status; groups ?

    def request(self, url, method, error_msg=False, bypass_error=False):
        if method == "get":
            response = self.session.get(url, verify=self.ssl)
        elif method == "post":
            response = self.session.post(url, verify=self.ssl)
        else:
            raise("Error. request function don't get correct method argument")

        try:
            content  = json.loads(response.content)
        except Exception as e:
            print( url )
            print( response.con)
            print(e)
            exit()

        message  = False
        if response.status_code != 200:
            message = 'Server return an error code (%s) with message:\n%s' % (response.status_code, response.content if not error_msg else error_msg)

        elif content == {'message': 'access denied'}:
            message = 'Server return an access denied response.'

        if message:
            if bypass_error:
                print(message)
            else:
                raise ValueError(message)
        return content


    def getAllSampleset(self, set_type=None, filter_val=None):
        """ get all sample set """
        if not self.logged:
            print( "Should be logged")
            return -1
        set_type   = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        filter_val = "" if filter_val == None else "filter="+prettyUrl(filter_val)+"&"
        new_url  = self.url_server+"/sample_set/all.json?&%s%s&" % (set_type, filter_val)
        return self.requests(new_url, "get")

    def getSamplesetById(self, set_id=None, set_type=None):
        """ get a sample set by type and id """
        set_type = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        new_url  = self.url_server+"/sample_set/samplesetById?&id=%s&%s" % (set_id, set_type)
        # warning, don't present on prod server for the moment !!!
        return self.request(new_url, "get")

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
        new_url  = self.url_server + "/sample_set/submit?data=%s" % json.dumps(data).replace(" ", "")
        return self.request(new_url, "post")

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
        new_url  = self.url_server + "/sample_set/submit?data=%s" % json.dumps(data).replace(" ", "")
        return self.request(new_url, "post")

    def createSet(self, name='set_api', sample_set_id=None, id=None, info=None):
        data = {"group":"1","generic":[{
                    'id': id if id else "",
                    'sample_set_id': sample_set_id if sample_set_id else "",
                    'name': name, # mandatory
                    'info': prettyUrl(info if info else "")
                    }
                ]}
        new_url  = self.url_server + "/sample_set/submit?data=%s" % json.dumps(data).replace(" ", "")
        return self.request(new_url, "post")


    def whoami(self):
        new_url = self.url_server + "/default/whoami"
        error_msg = "Error of login; WHOAMI function present on server ?"
        self.request(new_url, "get", error_msg=error_msg, bypass_error=True)
        return

    def getSampleOfSet(self, set_id, config_id=-1):
        new_url  = self.url_server+"/sample_set/index.json?id=%s&config_id=%s" % (set_id, config_id)
        return self.request(new_url, "get")

    def launchAnalysisBunchesSet(self, list_sets, config_id, force=False, retry=False, verbose=False):
        """ This function allow to take a list of sets and to launch a specified configuration on each sequence file inside them.
        Sequence file with a previous result for this configuration will be bypass.
        retry: Allow to make a new launch of analysis if the current status is FAILED
        force: Allow to launch an analysis with no consideration of current result statut
        verbose: Allow to print some information on each seuqence file status and some stats on sets
        """
        status  = defaultdict(lambda: dict())
        stats   = defaultdict(lambda: 0 )
        for sample_set_id in list_sets:
            sub = self.launchAnalysisOnSet(sample_set_id, config_id, force=force, verbose=verbose)
            for key, value in sub.items():
                for subkey, subvalue in value.items():
                    status[key][subkey] = subvalue
                    stats["total"]    += 1
                    stats[subvalue] += 1
        if verbose:
            print(status)
            print( "Recap launchAnalysisBunchesSet:\nTotal: %s" % stats["total"] )
            for key, value in stats.items():
                if key != "total":
                    print("%s: %s/%s (%s %%)" %  (key, stats[key], stats["total"], round(100*(stats[key]/stats["total"]), 2)) )
        return status


    def launchAnalysisOnSet(self, sample_set_id, config_id, force=False, retry=False, verbose=False):
        """ This function allow to take a set and to launch a specified configuration on each sequence file inside it.
        Sequence file with a previous result for this configuration will be bypass.
        retry: Allow to make a new launch of analysis if the current status is FAILED
        force: Allow to launch an analysis with no consideration of current result statut
        verbose: Allow to print some information on each seuqence file status and some stats on sets
        """
        status  = defaultdict(lambda: dict())
        samples = self.getSampleOfSet(sample_set_id, config_id)
        for sample in samples["query"]:
            sequence_file_id = sample["sequence_file"]["id"]
            result  = sample["results_file"]
            pre_str = "sample_set_id: %s; config %s; sequence_file_id = %s" % (sample_set_id, config_id, sequence_file_id)
            if result["status"] == "" or (result["status"] == "FAILED" and retry==True) or force==True:
                string = "%s\n\tanalysis will be launch" % (pre_str)
                if sample["sequence_file"]["data_file"] != None:
                    self.launchAnalysisOnSample(sample_set_id, sequence_file_id, config_id, force=force)
                    if result["status"] == "FAILED":
                        result["status"] = "launched (after failed)"
                    else:
                        result["status"] = "launched"
                else:
                    result["status"] = "no file"

            string = "%s\n\tResult state: %s" % (pre_str, result["status"])
            status["set_%s" % sample_set_id]["sample_%s" % sequence_file_id] = result["status"]
            if verbose:
                print( string )

        return status

    def launchAnalysisOnSample(self, sample_id, sequence_file_id, config_id):
        """ Launch analysis on a sequence file, from a sample with specified config id
        Will force the analysis if a previous result if present or already running.
        Control on previous analysis should be done before calling
        """
        data     = { 'sequence_file_id' : sequence_file_id, 'sample_set_id' : sample_id, 'config_id' : config_id }
        new_url  = self.url_server + "default/run_request?" + self.convertDataAsUrl(data)
        return self.request(new_url, "get")


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
        reponse = self.session.get(url, verify=self.ssl)
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
        error_msg = "Error in creation of sample in set %s" % sample_set_id
        content   = self.request(new_url, "post", error_msg=error_msg, bypass_error=False)
        file_ids  = content["file_ids"][0]
        print("Samples created (%s): launch upload" % (file_ids))
        
        ## Upload files
        self.uploadSample(sample_id=file_ids, filepath=head_f1, filename=tail_f1,  pre_process=pre_process, file_number='1')
        if file_filename2 != None and file_filename2 != "":
            self.uploadSample(sample_id=file_ids, filepath=head_f2, filename=tail_f2, pre_process=pre_process, file_number='2')
        print("Samples created (%s): upload completed ('%s' and '%s')" % (file_ids, tail_f1, tail_f2))
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

    ### Create some other sets
    patient_data  = vidjil.createPatient()
    set_data      = vidjil.createSet()
    run_data      = vidjil.createRun()
    ### get IDs from content
    setid_patient = patient_data["args"]["id"]
    setid_set     = set_data["args"]["id"]
    setid_run     = run_data["args"]["id"]
    print( "IDs set (%s); patient (%s); run (%s)" % (setid_set, setid_patient, setid_run))

    ### Create a sample inside these sets
    if "successfully" in set_data["message"] and "successfully" in patient_data["message"] and "successfully" in run_data["message"]:
        ### Create sample in recently created patient, set and run
        sample = vidjil.createSample(source="computer",
                    pre_process="0",
                    set_ids=":s+set_api+(%s)"%setid_set ,
                    file_filename='../demo/Demo-X5.fa',
                    file_filename2="",
                    file_id="",
                    file_sampling_date="2000-01-01",
                    file_info="Some information and #TAG as #demo",
                    file_set_ids=":p+(%s)|:r+(%s)" % (setid_patient, setid_run),
                    sample_set_id=setid_set,
                    sample_type="set")
        file_id  = sample["file_ids"][0]
        analysis = vidjil.launchAnalysisOnSample(setid_patient, file_id, "2")
        print( "analysis launched on sequence file %s, processId: %s" % (file_id, analysis["processId"] ))

        ### Upload a second sample in patient and set only
        vidjil.createSample(source="computer",
                pre_process="0",
                set_ids=":p+(%s)"%setid_patient ,
                file_filename='../demo/Stanford_S22.fasta',
                file_filename2="",
                file_id="",
                file_sampling_date="2000-01-01",
                file_info="Some information and #TAG",
                file_set_ids=":s+(%s)" % (setid_set),
                sample_set_id=setid_patient,
                sample_type="patient")


    ### Look inside samples set

    # Some request return direct json data
    _set = vidjil.getSamplesetById(setid_patient,  "patient")
    print( "=== Set content information ===")
    print( _set )

    # some other return a batch of informations
    print( "=== Json data get by some mix html/json request ===")
    samples = vidjil.getSampleOfSet(setid_patient)
    print( "Keys of data getted: %s" % samples.keys() )
    print( "Length of samples (under query key): %s" % len(samples["query"]) )

    # Specific data usually are stored under 'query' key
    print( "=== Items of samples in the set ===")
    for sample in samples["query"]:
        print( sample )
