#!/usr/bin/python

import unittest
from mock import MagicMock, Mock

class Migrator(unittest.TestCase):
        
    def __init__(self, p):
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/scripts/migrator.py", globals())
        global log, exp
        log = Mock(return_value=None)
        exp = Extractor(db, log)

    def testReencodeDict(self):
        data = {}
        data[u'long'] = 4L
        data[u'str'] = "my string"
        data[u'unicode'] = u'my unicode string'
        data[u'dict'] = {u'foobar': u'foobar'}

        res = reencode_dict(data)

        for key in res:
            assertEqual(type(key), str, 'The dict key was incorrectly converted. Expected %s, but got %s' % (str(str), str(type(key))))
        self.assertEqual(type(res['long']), long, 'The long value now has an unexpected type: %s' % str(type(res['long'])))
        self.assertEqual(type(res['str']), str, 'The str value now has an unexpected type: %s' % str(type(res['str'])))
        self.assertEqual(type(res['unicode']), str, 'The unicode value now has an unexpected type: %s' % str(type(res['unicode'])))

        res_sub = res['dict']
        key = res_sub.keys()[0]
        self.assertEqual(type(key), str, 'The conversion was not applied recursively to the keys')
        self.assertEqual(type(res_sub[key]), str, 'The conversion was not applied recursively to the values')

    def testGetDictFromRow(self):
        pid = db.patient.insert(first_name='test_patient',
                          last_name='test_patient')
        db.commit()

        row = db.patient[pid]
        res = get_dict_from_row(row)

        self.assertEqual(res['first_name'], 'test_patient', 'The row was incorrectly translated to a dict')


    def testPopulateSets(self):


    def testPopulateSequenceFiles(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")

    def testPopulateEntries(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")

    def testImportSampleSets(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")

    def testImportTable(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")
