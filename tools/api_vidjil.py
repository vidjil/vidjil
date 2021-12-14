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
        response = self.session.get(self.url + '/default/user/login', verify=False)
        data = { "email":email, "password":password, 'remember_me':"on" }
        BS = BeautifulSoup(response.text, 'html.parser')
        for i, e in enumerate(BS.select('input[name]')):
            # print(i, e)
            if (e['name'][0] == '_'):
                data[e['name']] = e['value']
        m = MultipartEncoder(fields=data)
        headers = {'Content-Type': m.content_type }
        # print(headers)
        response = self.session.post(url + '/default/user/login', data = m, headers = headers, verify=False)

        if response.status_code != 200:
            self.logged = False
            print( "Error at loggin")
            return -1
        else:
            self.logged = True
            print( "Successfull login")
            self.whoami()

    def getAllSamples(self):
        if not self.logged:
            print( "Should be logged")
            return -1
        response = self.session.get(self.url+"/sample_set/all?page=0&type=patient&format=json&", verify=False)
        print( " ====  site  =====" )
        print(response.url)
        content = json.loads(response.content)
        print( content[0] )
        print( content[0]["sample_set_id"] )

    def whoami(self):
        new_url = "https://localhost/vidjil//default/whoami"
        response = self.session.get(new_url, verify=False)
        print( response.content )

    def getSampleOfSet(self, set_id):
        # new_url = "https://localhost/vidjil/sample_set/index?id="+str(content[0]["sample_set_id"])+"&format=json&"
        # print( new_url )
        # response = session.get(new_url, verify=False)
        # print( " ====  site  =====" )
        # print(response.url)
        # print( response.content )
        # content = json.loads(response.content)
        # print( content )
        return


if  __name__ =='__main__':

    vidjil = Vidjil(url, False)
    vidjil.login("plop@plop.com", "foobartest")
    vidjil.getAllSamples()
