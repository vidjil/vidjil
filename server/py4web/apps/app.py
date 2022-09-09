#!/usr/bin/env python3

import os
from py4web.core import wsgi

DOMAIN_NAME=os.environ.get('DOMAIN_NAME')
if (DOMAIN_NAME is None):
    DOMAIN_NAME = "0.0.0.0"

password_file = "/usr/share/vidjil/server/py4web/apps/password.txt"
application = wsgi(password_file = password_file, dashboard_mode = "full", apps_folder = "/usr/share/vidjil/server/py4web/apps")

#application.run(host = DOMAIN_NAME, port = 8000) 