#!/usr/bin/python3
# -*- coding: utf-8 -*-

import sys
import json
import re
import os
import random, string
import argparse
import getpass
import errno
from collections import defaultdict

### Particular module to load
import subprocess
import pkg_resources

required  = {'requests', 'bs4', 'tabulate', 'requests-toolbelt', 'urllib3'}
installed = {pkg.key for pkg in pkg_resources.working_set}
missing   = required - installed

if missing:
    python = sys.executable
    print( f"Missing modules: {missing}")
    cmd = [python, '-m', 'pip', 'install', *missing]
    install = input("Do you want to install these modules? (y)es or no? ")
    if install.lower() in ["y", "yes"]:
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL)
    else:
        print(f"You choose to not install missing modules. \nYou can install them yourself by typing:  `{' '.join(cmd)}`")
        print(f"Script will end now.")
        exit()


import requests
from tabulate import tabulate
from bs4 import BeautifulSoup
from requests_toolbelt import MultipartEncoder
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

    PATIENT = "patient"
    RUN = "run"
    SET = "generic"

    COMPLETED = "COMPLETED"

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
        self.auth_deletion = False
        cookie = requests.cookies.RequestsCookieJar()
        try:
            response = self.session.get(self.url_server, verify=self.ssl)
        except requests.exceptions.SSLError:
            print( "%s has INVALID SSL certificate!" % self.url_server)
            print("Please upgrade your system, and/or see api_certificate.bash, but this could lead to insecure calls.")
            exit()

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
        print()
        print('### %s (%s)' % (self.url_server, email))
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
            print( "Successful login as %s" % email)
            print()
            whoami = self.whoami()
            self.user_id    = whoami["id"]
            self.user_email = whoami["email"]
            # todo; print admin status; groups ?

    def impersonate( self, impersonate_id:int):
        """Lauch impersonating action. If not allowed to imperosnate, server will raise an error 'Forbidden' and the script will end.
        
        Args:
            impersonate_id (int): Id of the user to impersonate
        Raises:
            Exception: Error when impersonate don't be succesful; multiple possible reasons: you are not admin, user don't exist
        Returns:
            dict: Json response of the server that contain the set if available
        """
        new_url = self.url_server + f"/default/impersonate?id={impersonate_id}&next=/vidjil/user/index&="
        result  = self.request(new_url, "post")
        whoami  = self.whoami()
        if whoami["id"] != impersonate_id:
            raise(f"Error. Impersonate haven't work (id: {impersonate_id})")
        if "redirect" in result.keys():
            print( f"Successful impersonate of user {impersonate_id} ({whoami['email']})")
        return

    def stop_impersonate( self):
        """Stop impersonating action.
        Returns:
            dict: Json response of the server that contain the set if available
        """
        new_url = self.url_server + f"/default/stop_impersonate"
        result  = self.request(new_url, "post")
        whoami  = self.whoami()
        if whoami["id"] != self.user_id:
            raise(f"Error. Stop Impersonate haven't work ( still id: {whoami['id']})")
        if "redirect" in result.keys():
            print( f"Successful desimpersonating")
        return

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

        if response.content in [b"Forbidden", b"Not Authorized"] :
            print(f"This call is '{response.content}'. \nVerify that you try to access to a data that EXIST, of your OWN or that you use an ADMIN account.", file=sys.stderr)
            exit()

        try:
            content  = json.loads(response.content)
        except Exception as e:
            print( url )
            print( response.content)
            print(e)
            raise e

        message  = False
        if response.status_code not in [200, 404]:
            message  = 'Server return an error code (%s) with message: %s\n' % (response.status_code, str(response.content if not error_msg else error_msg))
            message += "\nUrl: %s" % url
        elif response.status_code == 404:
            message  = 'Server return an error code (%s). Does server is updated ?' % response.status_code
            message += "\nUrl: %s" % url
        elif content == {'message': 'access denied'}:
            message = 'Server return an access denied response.'
        elif "success" in content and content["success"] == "false":
            message = 'Server return a failed message : %s' % content["message"]

        if message:
            if bypass_error:
                print(message)
            else:
                raise ValueError(message)
        return content

    def allowDeletion(self):
        """ Enable the ability of the API to make deletion"""
        self.auth_deletion = True
        return


    def getSets(self, set_type:str=None, filter_val:str=None):
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

    def getSetById(self, set_id:int, set_type:str=None):
        """Get sample set by is id.

        Args:
            set_id (int): id to sample set to get. Defaults to None.
            set_type (str, optional): type of sample set to get (accepting "patient", "run" or "generic"). Defaults to None.

        Returns:
            dict: Json response of the server that contain the set if available
        """
        pretty_set_type = "" if set_type   == None else "type="+prettyUrl(set_type)+"&"
        new_url  = self.url_server+"/sample_set/samplesetById?&id=%s&%s" % (set_id, pretty_set_type)
        # warning, don't present on prod server for the moment !!!
        content = self.request(new_url, "get")
        if not len(content):
            raise Exception( "getSetById error. \nNo sample found with this id '%s' and type '%s'" % (set_id, set_type))
        return content

    def createPatient(self, first_name:str, last_name:str, group:int=None, sample_set_id:int=None, id:int=None, id_label:int=None, birth_date:str=None, info:str=None):
        """Take information to create a patient under the default group of the user

        Args:
            first_name (str): First name of the patient
            last_name (str): Last name of the patient
            group (int, optional): Group owner of the patient. If not setted, use the default group of user. Defaults to None.
            sample_set_id (int, optional): Sample set id to use. Defaults to None.
            id (int, optional): Id given by laboratory. Defaults to None.
            id_label (int, optional): _description_. Defaults to None.
            birth_date (str, optional): Birth date of the patient. Use a string in "yyyy-mm-dd" format. Defaults to None.
            info (str, optional): Some other information to fill information field of patient. Defaults to None.

        Returns:
            dict: ???
        """
        data = {"group":group if group else self.group,
                "patient":[{
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

    def createRun(self, name:str, group:int=None, sample_set_id:int=None, id:int=None, id_label:int=None, run_date:string=None, info:str=None, sequencer:str=None, pcr:str=None):
        """Create a new run set on the server filled with given informations

        Args:
            name (str): Name of the run
            group (int, optional): Group owner of the run. If not setted, use the default group of user. Defaults to None.
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
        data = {"group":group if group else self.group,
                "run":[{
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

    def createSet(self, name:str, group:int=None, sample_set_id:int=None, id:int=None, info:str=None):
        """Create a new generic set on the server filled with given informations

        Args:
            name (str): Name of the run
            group (int, optional): Group owner of the set. If not setted, use the default group of user. Defaults to None.
            sample_set_id (int, optional): Sample set id to use. Defaults to None.
            id (int, optional): Id given by laboratory. Defaults to None.
            info (str, optional): Some information  to fill information field of run, can include tags. Defaults to None.

        Returns:
            dict: ???
        """
        data = {"group":group if group else self.group,
                "generic":[{
                    'id': id if id else "",
                    'sample_set_id': sample_set_id if sample_set_id else "",
                    'name': name, # mandatory
                    'info': prettyUrl(info if info else "")
                    }
                ]}
        new_url  = self.url_server + "/sample_set/submit?data=%s" % json.dumps(data).replace(" ", "")
        return self.request(new_url, "post")


    def whoami(self, verbose=False):
        """Return a json with user informations on the server for logged user"""
        new_url = self.url_server + "/default/whoami.json"
        error_msg = "Error of login; WHOAMI function present on server ?"
        user = self.request(new_url, "get", error_msg=error_msg, bypass_error=True)
        for key_to_del in ["ignored_fields", "registration_id", "reset_password_key", "password", "registration_key"]:
            user.pop(key_to_del, None)

        if verbose:
            print( "whoami: %s" % user)
        return user

    def getSamplesOfSet(self, set_id, config_id=-1):
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
        samples = self.getSamplesOfSet(sample_set_id, config_id)
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


    def removeSet(self, set_id:int):
        """Remove set with the given id.
        For security reason, a call at allowDeletion() is needed before doing this action.

        Args:
            set_id (int): Set id to delete
        Returns:
            dict: ???
        """
        if self.auth_deletion != True:
            print("This action (delete set) is not available.\nCall function allowDeletion before doing such actions to switch off the security.", file=sys.stderr)
            exit()
        data     = { 'id' : set_id }
        new_url  = self.url_server + "sample_set/delete?" + self.convertDataAsUrl(data)
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

    def download(self, server_path:str, filename:str, replace_from:str=None, replace_to:str=None, overwrite=True):
        """Download a result file from the server.
        When replace_from and replace_to are both defined, 
        replace that inside the downloaded file.

        Args:
            server_path (str): path/name of the file on the server
            filename (str): name for the file 
            replace_from (str, optional): Original filename (before upload to the server and hashing). Give for replacing purpose. Defaults to None.
            replace_to (str, optional): Filename present in the analysis under original_names (so as hashed by server) for replacing purpose. Defaults to None.
        """
        url = "%s/default/download/%s?filename=%s" % (self.url_server, server_path, filename)
        print( "==> %s " % filename, end='')
        sys.stdout.flush()

        reponse = self.session.get(url, verify=self.ssl)
        # TODO: add verification step if same filename is already present
        if os.path.isfile(filename) and not overwrite:
            raise Exception('download', "A file with same name already exist")
        open(filename, 'wb').write(reponse.content)

        # Clean file names
        if replace_from and replace_to:
            cmd = "sed -i 's/%s/%s/g' %s" % (replace_from, replace_to, filename)
            os.system( cmd )
        os.system( "sed -i 's/\\/mnt\\/upload\\/uploads\\///g' %s" % (filename) )
        for pattern in ["\\.fastq.gz", "\\.fq.gz", "\\.fasta", "\\.fastq", "\\.fa"]:
            os.system( "sed -i 's/%s//g' %s" % (pattern, filename) )

        print()
        return

    def downloadAnalysis(self, config_id:int, filename:str, sample_set_id:int, overwrite=True):
        """Download an analysis file from the server.
        default/get_analysis?config=2&filename=lil3+long+demo_multi%2Binc%2Bxxx.analysis&sample_set_id=1
        Args:
            filename (str): name of the output file
            config_id (str): Configuration of the analysis to download (for the moment, will be the same for all configutation, but needed)
            sample_set_id (str): Number of the sample set to use
            overwrite (bool): Overwrite the file if a previous version already present
        """
        url = "%s/default/get_analysis?config=%s&filename=%s&sample_set_id=%s" % (self.url_server, config_id, filename, sample_set_id)
        print( "==> %s " % filename, end='')
        sys.stdout.flush()

        reponse = self.session.get(url, verify=self.ssl)
        # TODO: add verification step if same filename is already present
        if os.path.isfile(filename) and not overwrite:
            raise Exception('download', "A file with same name already exist")
        open(filename, 'wb').write(reponse.content)

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
        self.uploadSample(sample_id=file_ids, filepath=head_f1, filename=tail_f1,  pre_process=pre_process, file_number='1', source=source)
        if file_filename2 != None and file_filename2 != "":
            self.uploadSample(sample_id=file_ids, filepath=head_f2, filename=tail_f2, pre_process=pre_process, file_number='2', source=source)
        print("Samples created (%s): upload completed ('%s' and '%s')" % (file_ids, tail_f1, tail_f2))
        return content

    def uploadSample(self, sample_id:int, filepath:str, filename:str, pre_process:str, file_number:str, source:str="computer"):
        """Upload a sample file to a sample

        Args:
            sample_id (int): Id of the set
            filepath (str): Directory where the file is located
            filename (str): Name of the file
            pre_process (str): Number of the preprocess in string format
            file_number (str): Position of the file in string format ("1" or "2")
            source (str, optional): Source of files. Two avalaible options: "computer" and "nfs" (for local storage). Defaults to "computer".

        Raises:
            FileNotFoundError: Raise an eception if the file don't exist locally
            Exception: Raise an exception if the server return an error after upload of file
        """
        if source == "computer" and not os.path.isfile(filepath+"/"+filename):
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), filepath+"/"+filename)

        data     = {'pre_process': pre_process, 'id': sample_id, 'file_number': file_number}
        new_url  = self.url_server + "/file/upload.json"
        response = self.session.post(new_url, data = data, files={'file':(filename, open(filepath+"/"+filename,'rb'))}, verify=self.ssl)
        if response.status_code != 200:
            raise Exception('uploadSample', "Error in upload of sample")
        return


    def infoSets(self, info: str, sets: dict, set_type: str, verbose=False):
        print("# Sets %s; %s ==> %s sets" % (info, set_type, len(sets)))
        if not len(sets):
            return
        d = []
        for s in sets:
            if verbose:
                printKeys(s)
            sub_d = [s['sample_set_id']]
            if set_type==self.PATIENT:
                sub_d.append("%s, %s" % (s['first_name'], s['last_name']))
                sub_d.append(s['birth'])
                sub_d.append(s['file_count'])
                sub_d.append(s['creator'])
                sub_d.append(s['info'].replace("\r\n\r\n", "\n")) #.replace("\r", "; "))
                headers=["id", "names", "birth", "files", "creator", "informations"]
            elif set_type==self.SET:
                sub_d.append(s['name'])
                sub_d.append(s['file_count'])
                sub_d.append(s['creator'])
                sub_d.append(s['info'].replace("\r\n\r\n", "\n")) #.replace("\r", "; "))
                headers=["id", "name", "files", "creator", "informations"]
            elif set_type==self.RUN:
                sub_d.append(s['name'])
                sub_d.append(s['run_date'])
                sub_d.append(s['file_count'])
                sub_d.append(s['creator'])
                sub_d.append(s['info'].replace("\r\n\r\n", "\n")) #.replace("\r", "; "))
                headers=["id", "name", "date", "files", "creator", "informations"]
            d.append(sub_d)
        print(tabulate(d, showindex=False, headers=headers))
        print()

    def infoSamples(self, info: str, samples, verbose=False):
        print("\n# %s ==> %s samples\n" % (info, len(samples['query'])) )
        if not len(samples["query"]):
            return
        d = []
        for s in samples["query"]:
            if verbose:
                printKeys(s)
            sub_d = []
            sub_d.append(s['sequence_file']['filename'])
            sub_d.append(s['sequence_file']['info'])
            ### preprocess
            if s["sequence_file"]["pre_process_id"] != None:
                sub_d.append(samples["pre_process_list"][str(s['sequence_file']['pre_process_id'])])
                sub_d.append(s['sequence_file']['pre_process_flag'])
            else:
                sub_d.append("")
                sub_d.append("")

            ### Shared set
            shared = ", ".join(map(lambda x : "%s (%s %s)"% (x['title'], x['sample_type'], x['id']), s["list_share_set"]))
            sub_d.append(shared)
            d.append(sub_d)

        headers=["filename", "informations", "pre process", "pre process status", "shared sets"]
        print(tabulate(d, showindex=False, headers=headers))
        print()
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

def printKeys(d):
    print("  ", "keys:", " ". join(d.keys()))


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

