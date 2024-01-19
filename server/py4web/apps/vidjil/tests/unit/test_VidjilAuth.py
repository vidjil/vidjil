import collections
import os
import json
import unittest
import pathlib

from .utils.omboddle import Omboddle
from .utils import db_manipulation_utils, test_utils
from ..functional.db_initialiser import DBInitialiser, TEST_ADMIN_EMAIL
from py4web import request
from py4web.core import _before_request, Session, HTTP
from ... import defs
from ...common import db, auth, T
from ...controllers import file as file_controller

import logging
LOGGER = logging.getLogger(__name__)


class TestVidjilAuth(unittest.TestCase):

    def setUp(self):
        # init env
        os.environ["PY4WEB_APPS_FOLDER"] = os.path.sep.join(
            os.path.normpath(__file__).split(os.path.sep)[:-5])
        _before_request()
        self.session = Session(secret="a", expiration=10)
        self.session.initialize()
        auth.session = self.session

        initialiser = DBInitialiser(db)
        initialiser.run()

        self.user1_id = db_manipulation_utils.add_indexed_user(self.session, 1)
        # Group position is 8, as db have 3 groups (admin, public, user_1) and 4 more by dbinitializer (parent, and 3 related childs)
        self.group_id_user1 = 8 
        return


    ##################################
    # Tests on VidjilAuth
    ##################################

    def test_vidjilauth_setup(self):
        assert auth != None
        return

        
    def test_vidjilauth_isAdmin(self):
        ### Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.is_admin() == True # default log in ad admin

        ### Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(1),
                                     db_manipulation_utils.get_indexed_user_password(1))
        
        assert auth.is_admin(self.user1_id) == False
        return


    def test_vidjilauth_can_create_sample_set(self):
        ### Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set() == True

        ### Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(1),
                                     db_manipulation_utils.get_indexed_user_password(1))
        
        assert auth.can_create_sample_set() == True
        return


    def test_vidjilauth_can_create_sample_set_in_group(self):
        ### Test as admin
        db_manipulation_utils.log_in_as_default_admin(self.session)
        assert auth.can_create_sample_set_in_group(1) == True

        ### Test as other user
        db_manipulation_utils.log_in(self.session,
                                     db_manipulation_utils.get_indexed_user_email(1),
                                     db_manipulation_utils.get_indexed_user_password(1))
        
        assert auth.can_create_sample_set_in_group(group_id=1, user=self.user1_id) == False
        assert auth.can_create_sample_set(self.user1_id) == True
        assert (self.group_id_user1 in auth.get_permission_groups("create")) == True
        assert (auth.is_admin(self.user1_id) or auth.can_create_sample_set(self.user1_id) and self.group_id_user1 in auth.get_permission_groups("create")) == True

        assert auth.can_create_sample_set_in_group(group_id=1, user=self.user1_id) == False # public
        assert auth.can_create_sample_set_in_group(group_id=2, user=self.user1_id) == False # admin
        assert auth.can_create_sample_set_in_group(group_id=3, user=self.user1_id) == False # user_1
        assert auth.can_create_sample_set_in_group(group_id=4, user=self.user1_id) == False # other group by initializer
        assert auth.can_create_sample_set_in_group(group_id=self.group_id_user1, user=self.user1_id) == True # group of current user
        return

