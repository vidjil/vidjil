#!/usr/bin/env python3

import os
from py4web.core import wsgi

DOMAIN_NAME=os.environ.get('DOMAIN_NAME')
if (DOMAIN_NAME is None):
    DOMAIN_NAME = "127.0.0.1"

password_file = os.path.abspath(os.path.join(os.path.dirname(__file__),"password.txt"))
application = wsgi(password_file = password_file, dashboard_mode = "full")

application.run(host = DOMAIN_NAME, port = 80 ) 