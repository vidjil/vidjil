#!/usr/bin/python

import unittest
import defs
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon.contrib.login_methods.ldap_auth import ldap_auth
from gluon import current

class LoginController(unittest.TestCase):

    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)

    def setUp(self):
        # Load the to-be-tested file
        execfile("gluon/tools.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = VidjilAuth(globals(), db)
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a, **kwargs):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        # for defs
        current.db = db
        current.auth = auth

        defs.LDAP_CONF = {
            "mode" :            'custom',
            "server":           'ldap.forumsys.com',    
            "base_dn":          'dc=example,dc=com',   
            "logging_level":    'debug',
            "username_attrib":  'mail',
            "custom_scope":     'subtree'
        }

    def testLogin(self):
        user = auth.login_bare("test@vidjil.org", "1234XXXX56")
        self.assertFalse(user, "login should have returned False because of invalid password")

        user = auth.login_bare("test@vidjil.org", "123456")
        self.assertNotEqual(user, False, "login should have succeeded with correct password")

    def testLDAPLogin(self):
        # before ldap enabled
        ldap_user = auth.login_bare("euler@ldap.forumsys.com", "password")
        self.assertFalse(ldap_user, "ldap user should not be available without enabling ldap_conf")

        # enable ldap config
        auth.settings.login_methods.append(ldap_auth(**defs.LDAP_CONF))
        ldap_user = auth.login_bare("euler@ldap.forumsys.com", "password")
        self.assertNotEqual(ldap_user, False, "ldap login should not have returned a false")




