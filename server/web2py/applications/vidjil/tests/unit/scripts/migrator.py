#!/usr/bin/python

import unittest
from mock import MagicMock, Mock
from applications.vidjil.scripts.migrator import *

class MigratorScript(unittest.TestCase):
        
    def __init__(self, p):
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        global log, exp, imp, test_patient_ids, test_sample_set_ids, test_sequence_file_ids, test_sample_set_membership_ids, test_results_file_ids, test_group
        log = Mock(return_value=None)

        test_group = db.auth_group.insert(role='testy')
        exp = Extractor(db, log)
        config_mapper = ConfigMapper(log)
        pprocess_mapper = ConfigMapper(log)
        imp = Importer(test_group, db, log, config_mapper, pprocess_mapper)

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
            self.assertEqual(type(key), str, 'The dict key was incorrectly converted. Expected %s, but got %s' % (str(str), str(type(key))))
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
        self.assertEqual(sample_set_ids, expected, 'Incorrect sample_set_ids returned. Expected %s, but got %s' % (str(expected), str(sample_set_ids)))

        for pid in test_patient_ids:
            self.assertTrue(pid in sets, 'Missing id %d in sets' % pid)


    def testPopulateSequenceFiles(self):
        rows = exp.getSequenceFiles(test_sample_set_ids)
        sequence_files, memberships = exp.populateSequenceFiles(rows)

        self.assertTrue(len(rows) > 0, 'No data retrieved')
        for sfid in test_sequence_file_ids:
            self.assertTrue(sfid in sequence_files, 'Missing id %d in sequence_files' % sfid)

        for smid in test_sample_set_membership_ids:
            self.assertTrue(smid in memberships, 'Missing id %d in memberships' % smid)

    def testPopulateEntries(self):
        rows = exp.getTableEntries('results_file', 'sequence_file_id', test_sequence_file_ids)
        results = exp.populateEntries(rows)

        for rid in test_results_file_ids:
            self.assertTrue(rid in results, 'Missing id %d in results' % rid)

    def testImportSampleSets(self):
        patient = {}
        patient['first_name'] = 'impo'
        patient['last_name'] = 'rted'
        patient['sample_set_id'] = 4
        sets = {}
        sets[4] = patient

        imp.importSampleSets('patient', sets)

        res = db((db.patient.first_name == 'impo')
                &(db.patient.last_name == 'rted')
             ).select()
        self.assertEqual(len(res), 1, 'Incorrect number of patients. expected 1, but got %d' % len(res))

        p = res.first()
        sample_set = db.sample_set[p.sample_set_id]

        self.assertTrue(sample_set is not None, 'Missing sample set after import')

        perm = db((db.auth_permission.name == 'access')
                &(db.auth_permission.table_name == 'patient')
                &(db.auth_permission.record_id == p.id)
            ).select()
        self.assertEqual(len(res), 1, 'Incorrect number of permissions. expected 1, but got %d' % len(res))

    def testImportTable(self):
        sequence_file = db.sequence_file.insert(filename='test_file')
        config = db.config.insert(command='foobar test')
        old_seq_id = 45
        imp.mappings['sequence_file'] = IdMapper(log)
        imp.mappings['sequence_file'].setMatchingId(old_seq_id, sequence_file)
        results_file = {'sequence_file_id': old_seq_id,
                        'config_id': config,
                        'data_file': 'foobar.txt',
                        'run_date': '1970-01-01 00:00:00'}
        results = {10: results_file}

        imp.importTable('results_file', results, {'sequence_file': 'sequence_file_id'}, True)
        res = db((db.results_file.data_file == 'foobar.txt')
                &(db.results_file.run_date == '1970-01-01 00:00:00')
            ).select()
        self.assertEqual(len(res), 1, 'Incorrect number of permissions. expected 1, but got %d' % len(res))

        result = res.first()
        self.assertEqual(result.sequence_file_id, sequence_file, 'sequence_file_id field was not remapped')
