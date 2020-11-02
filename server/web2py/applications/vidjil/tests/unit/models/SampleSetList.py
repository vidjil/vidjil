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
        self.assertTrue(len(slist) > 0, "The sample set list was not expected to be empty")

    def testCreatorNames(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        values = slist.result
        first = values[0]
        name = helper.get_creator(first)
        self.assertFalse(name == "", "load_creator_names failed to retrieve a username")

    def testPermittedGroups(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        value = slist.result[0]
        groups = helper.get_groups(value)

        self.assertFalse(groups == "", "load_permitted_groups didn't load ay groups")

    def testAnonPermissions(self):
        factory = ModelFactory()
        helper = factory.get_instance(type='patient')
        slist = SampleSetList(helper)
        value = slist.result[0]

        set_ids = set([s.id for s in slist.result])
        anon_set_ids = set([s.id for s in db(auth.vidjil_accessible_query('anon', db.sample_set)).select(db.sample_set.id)])
        anon_permissions = list(anon_set_ids & set_ids)

        self.assertFalse(value.sample_set_id in anon_permissions, "Anon was allowed, when it was not expected to be")


