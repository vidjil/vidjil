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


url = "https://localhost/vidjil/"
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

    def __init__(self, url, ssl=True):
        self.url = url
        self.ssl = ssl
        self.session = requests.Session()
        cookie = requests.cookies.RequestsCookieJar()
        if os.path.exists('cookies'):
            cookie.load(ignore_discard=True, ignore_expires=True)
        self.session.cookies = cookie

    def login(self, email, password):
        response = self.session.get(self.url + '/default/user/login', verify=self.ssl)
        data = { "email":email, "password":password, 'remember_me':"on" }
        BS = BeautifulSoup(response.text, 'html.parser')
        for i, e in enumerate(BS.select('input[name]')):
            # print(i, e)
            if (e['name'][0] == '_'):
                data[e['name']] = e['value']
        m = MultipartEncoder(fields=data)
        headers = {'Content-Type': m.content_type }
        # print(headers)
        response = self.session.post(url + '/default/user/login', data = m, headers = headers, verify=self.ssl)

        if response.status_code != 200:
            self.logged = False
            print( "Error at loggin")
            return -1
        else:
            self.logged = True
            print( "Successfull login")
            self.whoami()
            # todo; print admin status; groups ?

    def getAllSamples(self, filter_val=None):
        if not self.logged:
            print( "Should be logged")
            return -1
        if filter_val == None:
            filter_val == ""
        else:
            filter_val = "filter=" + prettyUrl(filter_val)
        new_url = self.url+"/sample_set/all?&type=patient&format=json&%s" % filter_val
        response = self.session.get(new_url, verify=self.ssl)
        print( " ====  site  =====" )
        print(response.url)
        content = json.loads(response.content)
        return content


    def whoami(self):
        new_url = "https://localhost/vidjil//default/whoami"
        response = self.session.get(new_url, verify=self.ssl)
        print( response.content )

    def getSampleOfSet(self, set_id, config_id=-1):
        new_url = self.url+"/sample_set/index?id=%s&format=json&config_id=%s" % (set_id, config_id)
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
        new_url  = self.url + "default/run_request?" + url_data
        response = self.session.get(new_url, verify=False)
        return

    def convertDataAsUrl(self, data):
        string = ""
        for key in data.keys():
            string+= "%s=%s&" % (key, data[key])
        return string

    def download(self, filepath, filename):
        url = "%s/default/download/%s?filename=%s" % (self.url, filepath, filename)
        reponse = self.session.get(url, verify=False)
        open(filename, 'wb').write(reponse.content)
        # TODO: add verification step if same filename is already present
        print( "File created: %s" % filename)
        return


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

