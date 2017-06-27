#!/usr/bin/python

import unittest
from mock import MagicMock, Mock
from applications.vidjil.scripts.migrator import *

class MigratorScript(unittest.TestCase):
        
    def __init__(self, p):
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        global log, exp, test_patient_ids, test_sample_set_ids, test_sequence_file_ids, test_sample_set_membership_ids, test_results_file_ids
        log = Mock(return_value=None)
        exp = Extractor(db, log)

        test_patient_ids = []
        test_sample_set_ids = []
        test_sequence_file_ids = []
        test_sample_set_membership_ids = []
        test_results_file_ids = []

        test_sample_set_ids.append(db.sample_set.insert(sample_type='patient'))
        test_sample_set_ids.append(db.sample_set.insert(sample_type='patient'))

        test_patient_ids.append(db.patient.insert(first_name='foo',
                                                  last_name='bar',
                                                  sample_set_id = test_sample_set_ids[0]))
        test_patient_ids.append(db.patient.insert(first_name='bar',
                                                  last_name='foo',
                                                  sample_set_id = test_sample_set_ids[1]))

        test_sequence_file_ids.append(db.sequence_file.insert(filename='foobar.fastq'))
        test_sequence_file_ids.append(db.sequence_file.insert(filename='barfoo.fastq'))

        test_sample_set_membership_ids.append(
                db.sample_set_membership.insert(sample_set_id=test_sample_set_ids[0],
                                                sequence_file_id=test_sequence_file_ids[0])
                )
        test_sample_set_membership_ids.append(
                db.sample_set_membership.insert(sample_set_id=test_sample_set_ids[1],
                                                sequence_file_id=test_sequence_file_ids[1])
                )

        test_results_file_ids.append(db.results_file.insert(sequence_file_id=test_sequence_file_ids[0]))
        test_results_file_ids.append(db.results_file.insert(sequence_file_id=test_sequence_file_ids[1]))

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
        rows = db(db.patient.id.belongs(test_patient_ids)).select()
        sets, sample_set_ids = exp.populateSets(rows)

        expected = test_sample_set_ids
        assertEqual(sample_set_ids, expected, 'Incorrect sample_set_ids returned. Expected %s, but got %s' % (str(expected), str(sample_set_ids)))

        for pid in test_patient_ids:
            assertTrue(pid in sets, 'Missing id %d in sets' % pid)


    def testPopulateSequenceFiles(self):
        rows = exp.getSequenceFiles(test_sample_set_ids)
        sequence_files, memberships = exp.populateSequenceFiles(rows)

        for sfid in test_sequence_file_ids:
            assertTrue(sfid in sequence_files, 'Missing id %d in sequence_files' % sfid)

        for smid in test_sample_set_membership_ids:
            assertTrue(smid in memberships, 'Missing id %d in memberships' % smid)

    def testPopulateEntries(self):
        rows = exp.getTableEntries('results_file', ['sequence_file'], test_sequence_file_ids)
        results = exp.populateEntries(rows)

        for rid in test_results_file_ids:
            assertTrue(rid in results, 'Missing id %d in results' % rid)

    def testImportSampleSets(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")

    def testImportTable(self):
        # TODO
        self.assertTrue(False, "Test isn't implemented yet")
