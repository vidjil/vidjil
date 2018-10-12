#!/usr/bin/python

import unittest

class SamplesetsModel(unittest.TestCase):
        
    def __init__(self, p):
        global auth
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/models/SampleSets.py", globals())
        global auth
        auth = VidjilAuth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")

        # We have the following sample sets
        
        # fake_sample_set_id linked to fake_patient_id
        # whose first and last name are plop

        # permission_sample_set linked to permission_patient
        # whose name is foo bar

    def testGetNames(self):
        samples = SampleSets([fake_sample_set_id, permission_sample_set])

        names = samples.get_names()

        self.assertEquals(names[fake_sample_set_id], "plo")
        self.assertEquals(names[permission_sample_set], "bar")
        
