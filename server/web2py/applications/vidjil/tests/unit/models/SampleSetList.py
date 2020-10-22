#!/usr/bin/python

import unittest

class SamplesetlistModel(unittest.TestCase):
        
    def __init__(self, p):
        global auth
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/models/sample_set_list.py", globals())
        global auth
        auth = VidjilAuth(globals(), db)
        auth.login_bare("test@vidjil.org", "123456")

    def testInit(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        self.assertTrue(len(slist.element_ids) > 0, "The sample set list was not expected to be empty")

    def testCreatorNames(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        slist.load_creator_names()
        values = slist.get_values() 
        first = values[0]
        name = first.creator
        self.assertFalse(name == "", "load_creator_names failed to retrieve a username")

    def testPermittedGroups(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        slist.load_permitted_groups()
        value = slist.get_values()[0]
        groups = value.groups
        group_list = value.group_list

        self.assertFalse(groups == "", "load_permitted_groups didn't load ay groups")
        self.assertFalse(group_list == [], "load_permitted_groups found groups although the group_list is empty")

    def testAnonPermissions(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        slist.load_anon_permissions()
        value = slist.get_values()[0]

        self.assertFalse(value.anon_allowed, "Anon was allowed, when it was not expected to be")


