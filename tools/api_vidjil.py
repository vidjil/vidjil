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
import errno
from bs4 import BeautifulSoup
from requests_toolbelt import MultipartEncoder
from collections import defaultdict
# REmove warning if no SSL vérification
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TAGS = []
TAGS_UNDEFINED = []
url  = "https://localhost/vidjil/"

def prettyUrl(string: str):
    """Transform a string to use url compatible character

    Args:
        string (str): url string to reformat

    Returns:
        str: url compatible string reformated
    """
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


    def __init__(self, url_server:str, url_client:str=None, ssl:str=True):
        """_summary_

        Args:
            url_server (str): Url of server to use
            url_client (str, optional): Url of client to use. Sometimes, backend and frontend server are different (as for app.vidjil.org). If not setted, wille use the server url. (Defaults to None).
            ssl (str, optional): Path to the Pem file to use for ssl connection for self hosted server.
        """
        self.url_server = url_server
        self.url_client = url_client if url_client != None else url_server
        self.ssl = ssl
        print( "Vidjil(url_server:%s, url_client=%s, ssl=%s)" % (self.url_server, self.url_client, self.ssl) )
        self.session = requests.Session()
        cookie = requests.cookies.RequestsCookieJar()
        if os.path.exists('cookies'):
            cookie.load(ignore_discard=True, ignore_expires=True)
        self.session.cookies = cookie

    def login(self, email:str, password: str):
        """Function to use to login to a vidjil server

        Args:
            email (string): email to use for login
            password (string): password to use for login

        Raises:
            Exception: Error when access to login form
            Exception: Server don't log in user. Probably an error in given email or password
            Exception: Error of server that return an incorect exit code

        """
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
            if "auth_user_email__row" in str(response.content):
                raise Exception( "Login; error at login step.\nVerify your user name and password.")
            raise Exception( "Login; error at login step.\nStatus code is %s and content is '%s'."  % (response.status_code, response.content))
        else:
            self.logged = True
            print( "Successfull login")
            self.whoami()
            # todo; print admin status; groups ?

    def request(self, url:str, method:str, error_msg:bool=False, bypass_error:bool=False):
        """Send a request to server by a designed url and return a json content response

        Args:
            url (str): formated url to request specific information to server
            method (str): Use 'post' or 'get' method for request
            error_msg (bool, optional): Give a specific error message to use if request failed. Defaults to False.
            bypass_error (bool, optional): Bypass error if needed. Defaults to False.

        Raises:
            ValueError: Raise an error if not disable by bypass_error parameter

        Returns:
            dict: A json conversion of server response
        """
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
            print( response.content)
            print(e)
            exit()

        message  = False
        if response.status_code != 200:
            message = 'Server return an error code (%s) with message:\n%s' % (response.status_code, response.content if not error_msg else error_msg)
            message += "Url: %s" % url
        elif content == {'message': 'access denied'}:
            message = 'Server return an access denied response.'

        if message:
            if bypass_error:
                print(message)
            else:
                raise ValueError(message)
        return content


    def getAllSampleset(self, set_type:str=None, filter_val:str=None):
        """_summary_

        Args:
            set_type (str, optional): A set type to filter request if needed. Accepted values are "patient", "run" and "generic". Defaults to None.
            filter_val (str, optional): A value to use for limited search. A string variable that can be use to be more specific on set name, set id, ... Defaults to None.

        Returns:
            dict: Json response of the server that contain a set of samples sets
        """
        if not self.logged:
            print( "Should be logged")
            return -1
        set_type   = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        filter_val = "" if filter_val == None else "filter="+prettyUrl(filter_val)+"&"
        new_url  = self.url_server+"/sample_set/all.json?&%s%s&" % (set_type, filter_val)
        return self.request(new_url, "get")

    def getSamplesetById(self, set_id:int, set_type:str=None):
        """Get sample set by is id.

        Args:
            set_id (int): id to sample set to get. Defaults to None.
            set_type (str, optional): type of sample set to get (accepting "patient", "run" or "generic"). Defaults to None.

        Returns:
            dict: Json response of the server that contain the set if available
        """
        set_type = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        new_url  = self.url_server+"/sample_set/samplesetById?&id=%s&%s" % (set_id, set_type)
        # warning, don't present on prod server for the moment !!!
        return self.request(new_url, "get")

    def createPatient(self, first_name:str, last_name:str, sample_set_id:int=None, id:int=None, id_label:int=None, birth_date:str=None, info:str=None):
        """Take information to create a patient under the default group of the user

        Args:
            first_name (str): First name of the patient
            last_name (str): Last name of the patient
            sample_set_id (int, optional): Sample set id to use. Defaults to None.
            id (int, optional): Id given by laboratory. Defaults to None.
            id_label (int, optional): _description_. Defaults to None.
            birth_date (str, optional): Birth date of the patient. Use a string in "yyyy-mm-dd" format. Defaults to None.
            info (str, optional): Some other information to fill information field of patient. Defaults to None.

        Returns:
            dict: ???
        """
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

    def createRun(self, name:str, sample_set_id:int=None, id:int=None, id_label:int=None, run_date:string=None, info:str=None, sequencer:str=None, pcr:str=None):
        """Create a new run set on the server filled with given informations

        Args:
            name (str): Name of the run
            sample_set_id (int, optional): Sample set id to use. Defaults to None.
            id (int, optional): Id given by laboratory. Defaults to None.
            id_label (int, optional): ???. Defaults to None.
            run_date (string, optional): Date of the run, in "yyyy-mm-dd" format. Defaults to None.
            info (str, optional): Some information  to fill information field of run, can include tags. Defaults to None.
            sequencer (str, optional):Type of the sequencer. Defaults to None.
            pcr (str, optional): Type of PCRr used. Defaults to None.

        Returns:
            dict: ???
        """
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

    def createSet(self, name:str, sample_set_id:int=None, id:int=None, info:str=None):
        """Create a new generic set on the server filled with given informations

        Args:
            name (str): Name of the run
            sample_set_id (int, optional): Sample set id to use. Defaults to None.
            id (int, optional): Id given by laboratory. Defaults to None.
            info (str, optional): Some information  to fill information field of run, can include tags. Defaults to None.

        Returns:
            dict: ???
        """
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
        """Return a json with user informations on the server for logged user"""
        new_url = self.url_server + "/default/whoami.json"
        error_msg = "Error of login; WHOAMI function present on server ?"
        user = self.request(new_url, "get", error_msg=error_msg, bypass_error=True)
        print( "whoami: %s" % user)
        return

    def getSampleOfSet(self, set_id, config_id=-1):
        new_url  = self.url_server+"/sample_set/index.json?id=%s&config_id=%s" % (set_id, config_id)
        return self.request(new_url, "get")

    def launchAnalysisBunchesSet(self, list_sets:list, config_id:int, force:bool=False, retry:bool=False, verbose:bool=False):
        """Launch an analysis on each sequence file inside the given list of sets.
        Sequence file with a previous result for this configuration will be bypass.

        Args:
            list_sets (int list): List of sets to analyze
            config_id (int): Configuration id of the analysis
            force (bool, optional): Relaunch the analysis when the current status is FAILED. Defaults to False.
            retry (bool, optional): Launch an analysis with no consideration of current result status (XXXXX). Defaults to False.
            verbose (bool, optional)

        Returns:
            dict: Return a dict of format {set_id:{sample_id:status}}
        """
        status  = defaultdict(lambda: dict())
        stats   = defaultdict(lambda: 0 )
        for sample_set_id in list_sets:
            sub = self.launchAnalysisOnSet(sample_set_id, str(config_id), force=force, retry=retry, verbose=verbose)
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
        return dict(status)


    def launchAnalysisOnSet(self, sample_set_id:int, config_id:int, force:bool=False, retry:bool=False, verbose:bool=False):
        """Launch an analysis on each sample associated to the given sample set.

        Args:
            sample_set_id (int): Sample set to analyze
            config_id (int): Configuration id of the analysis
            force (bool, optional): Relaunch analysis if the current status is FAILED. Defaults to False.
            retry (bool, optional): Launch an analysis with no consideration of current result statut. (XXX) Defaults to False.
            verbose (bool, optional)

        Returns:
            dict: Return a dict of format {set_id:{sample_id:status}}
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
                    self.launchAnalysisOnSample(sample_set_id, sequence_file_id, config_id)
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

        return dict(status)

    def launchAnalysisOnSample(self, sample_id:int, sequence_file_id:int, config_id:int):
        """Launch analysis on a sequence file, from a sample with specified config id
        Will force the analysis if a previous result if present or already running.
        Control on previous analysis should be done before calling

        Args:
            sample_id (int): Sample set id from where analysis should be launched
            sequence_file_id (int): Sequence file id to analyse
            config_id (int): Configuration id of the analysis

        Returns:
            dict: ???
        """
        data     = { 'sequence_file_id' : sequence_file_id, 'sample_set_id' : sample_id, 'config_id' : config_id }
        new_url  = self.url_server + "default/run_request?" + self.convertDataAsUrl(data)
        return self.request(new_url, "get")


    def convertDataAsUrl(self, data:dict):
        """Allow to get an url compatible string to add to an url to launch request from a dict

        Args:
            data (dict): A dict with pair of key/value.

        Returns:
            str: A string ready to use in url in format "key=value&" for each keys in given dictionary
        """
        string = ""
        for key in data.keys():
            string+= "%s=%s&" % (key, data[key])
        return string

    def download(self, filepath:str, filename:str, server_name:str=None, original_names:str=None):
        """Download a result file by is name given on the server storage
        A speficic name can be given to the downloaded file
        if server_name and original_names are both setted, replace inside the file the name of the file under original_names filed

        Args:
            filepath (str): filepath is the name of the file as present in the server storage
            filename (str): filename is the output filename to set to locally store
            server_name (str, optional): Original filename uploaded on the server before hashing for storage. Give for replacing purpose. Defaults to None.
            original_names (str, optional): Filename present in the analysis under original_names (so as hashed by server) for replacing purpose. Defaults to None.
        """
        url = "%s/default/download/%s?filename=%s" % (self.url_server, filepath, filename)
        reponse = self.session.get(url, verify=self.ssl)
        # TODO: add verification step if same filename is already present
        if os.path.isfile(filepath+"/"+filename):
            raise Exception('download', "A file with same name already exist")
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

    def createSample(self, set_ids:list, sample_set_id:str, sample_type:str, file_filename:str, file_filename2:str, file_info:str, file_sampling_date:str, file_id:int="", file_set_ids:list="", source:str="computer", pre_process="0"):
        """Create a sample on the server, link it to various sets, and upload dat aas last part

        Args:
            set_ids (list): List of set id in a specific format (":r+run_api+(67)")
            sample_set_id (str): id of the main set to use in specific format (ex: ":s+set_api+(25)")
            sample_type (str): A set type. Accepted values are "patient", "run" and "generic".
            file_filename (str): Local path of the file to upload on server.
            file_filename2 (str): Local path of the file to upload on server for second file.
            file_id (int): An id for sample. Keep it empty.
            file_sampling_date (str): A date of sampling in str format ("yyyy-mm-dd")
            file_info (str): Sample informations as text and tag, space should be replaced by "+" (ex: "test+#age=25+#cat=val")
            file_set_ids (list): Can be an empty string.
            source (str, optional): Source of files. Two avalaible options: "computer" and "nfs" (for local storage). Defaults to "computer".
            pre_process (str, optional): Id if the preprocess to use, in str format. Defaults to "0", for no preprocess.

        Returns:
            dict: content return by request
        """
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

    def uploadSample(self, sample_id:int, filepath:str, filename:str, pre_process:str, file_number:str):
        """Upload a sample file to a sample

        Args:
            sample_id (int): Id of the set
            filepath (str): Directory where the file is located
            filename (str): Name of the file
            pre_process (str): Number of the preprocess in string format
            file_number (str): Position of the file in string format ("1" or "2")

        Raises:
            FileNotFoundError: Raise an eception if the file don't exist locally
            Exception: Raise an exception if the server return an error after upload of file
        """
        if not os.path.isfile(filepath+"/"+filename):
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), filepath+"/"+filename)

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

    vidjil = Vidjil(url_server, url_client=url_client, ssl=certificat)
    vidjil.login(user, password)

