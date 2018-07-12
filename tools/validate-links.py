

import requests
import glob
import sys
from urllib.parse import *
import re

DEFAULT_FILES = glob.glob('../site/*/*.html')
REGEX_HREF = re.compile('href="(.*?)"')

STATUS = {
    None: '? ',
    False: 'KO',
    True: 'ok'
}

def check_url(url):
    if not url.startswith('http'):
        return None
    
    try:
        req = requests.get(url)
        return (req.status_code < 400)
    except:
        return False
    

def check_file(f):
    print('<-- ', f)
    content = ''.join(open(f).readlines())
    for url in REGEX_HREF.findall(content):
        ok = check_url(url)
        print(STATUS[ok] + '    ' + url)
    print()
    
if __name__ == '__main__':

    files = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_FILES

    for f in files:
        check_file(f)
        
