

import requests
import glob
import sys
from urllib.parse import *
import re

DEFAULT_FILES = glob.glob('../site/*/*.html')

REGEX_HREF = re.compile('href="(.*?)"')
REGEX_ID = re.compile('id="(.*?)"')

STATUS = {
    None: '? ',
    False: 'KO',
    True: 'ok'
}

def check_url(url, ids=[]):

    # Internal links
    if url.startswith('#'):
        return (not url[1:]) or (url[1:] in ids)

    # Relative links: TODO
    if not url.startswith('http'):
        return None

    # External http(s) links
    try:
        req = requests.get(url)
        return (req.status_code < 400)
    except:
        return False
    

def check_file(f):
    print('<-- ', f)
    content = ''.join(open(f).readlines())

    ids = REGEX_ID.findall(content)

    for url in REGEX_HREF.findall(content):
        ok = check_url(url, ids)
        print(STATUS[ok] + '    ' + url)
    print()
    
if __name__ == '__main__':

    files = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_FILES

    for f in files:
        check_file(f)
        
