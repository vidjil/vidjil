"""
This script is made to be call by a gitlab-ci job.
It can also be launched locally if a server is up and ssl file generated
In this case, need to adapt LOCAL_{server;ssl;user;password}
"""
import sys
import argparse
import os
import getpass
import unittest
 
# Append api_vidjil script from parent directory
current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(current)
sys.path.append(parent)
from api_vidjil import Vidjil


# ========================

DOWNLOAD_PATH = "download/"
### Local server (see doc/server.md)
LOCAL_USER = "plop@plop.com"
LOCAL_PASSWORD = "foobartest"

LOCAL_SERVER = "http://localhost/vidjil/"
LOCAL_SSL = False
## If launch locally
# LOCAL_SERVER = "https://localhost/vidjil/"
# LOCAL_SSL = current+"/cert_localhost-chain.pem"

# ========================


class TestStringMethods(unittest.TestCase):

    def setUp(self) -> None:
        self.vidjil = Vidjil(LOCAL_SERVER, ssl=LOCAL_SSL)
        self.vidjil.login(LOCAL_USER, LOCAL_PASSWORD)
        return
    
    def test_01_create_Vidjil(self):
        # test login
        return


    def test_login(self):
        self.assertEqual(self.vidjil.user_id, 1)
        self.assertEqual(self.vidjil.user_email, "plop@plop.com")
        self.assertEqual(self.vidjil.is_admin, True)
        return


    def test_02_get_content_request(self):
        """
        Get last request content 
        """
        content = self.vidjil.last_request["content"]
        self.assertEqual(content["admin"], True)
        self.assertEqual(content["email"], "plop@plop.com")
        self.assertEqual(content["groups"], [{'description': None, 'id': '1', 'role': 'admin'}]) # only admin as only group with write right on fresh install
        self.assertEqual(content["id"], 1)
        return


    def test_03_getSetById(self):
        """
        Get a sample by ID
        """
        
        ### Define a set of id and config
        sample_set_id = 13

        ### Get a set from server by is id and set type
        self.vidjil.getSetById(sample_set_id, self.vidjil.PATIENT)
        content = self.vidjil.last_request["content"]
        # [{'id': 5, 'sample_set_id': 13, 'info': 'test patient 4 #test4', 'creator': 'Administrator', 'file_count': 3, 'first_name': 'patient', 'last_name': '4', 'birth': '2010-10-10', '_extra': {'`patient`.`id` AS id': 5, '`patient`.`sample_set_id` AS sample_set_id': 13, '`patient`.`info` AS info': 'test patient 4 #test4', '`auth_user`.`last_name` AS creator': 'Administrator', 'COUNT(DISTINCT `sequence_file`.`id`) AS file_count': 3, 'COUNT(DISTINCT sequence_file.id) * SUM(sequence_file.size_file) / COUNT(*)': 3072.0, "GROUP_CONCAT(DISTINCT config.id, ';', config.name, ';', fused_file.fused_file)": '1;default + extract reads;test_fused_file', 'GROUP_CONCAT(DISTINCT config.id)': '1', 'GROUP_CONCAT(DISTINCT config.name)': 'default + extract reads', 'GROUP_CONCAT(DISTINCT auth_group.role)': 'public', '`patient`.`first_name` AS first_name': 'patient', '`patient`.`last_name` AS last_name': '4', '`patient`.`birth` AS birth': '2010-10-10'}}]
        self.assertEqual(len(content), 1)

        self.assertEqual(content[0]["id"], 5)
        self.assertEqual(content[0]["sample_set_id"], 13)
        self.assertEqual(content[0]["info"], 'test patient 4 #test4')
        self.assertEqual(content[0]["creator"], 'Administrator')
        self.assertEqual(content[0]["file_count"], 3)
        self.assertEqual(content[0]["first_name"], "patient")
        self.assertEqual(content[0]["last_name"], "4")
        self.assertEqual(content[0]["birth"], '2010-10-10')
        return
    

    def test_04_getSets(self):
        """
        Check samples in a asked set
        """
        ### Get a set from server by is id and set type
        self.vidjil.getSets(set_type=self.vidjil.PATIENT)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 8)
        
        last_set = content["query"][0]
        self.assertEqual(last_set["id"], 8)
        self.assertEqual(last_set["sample_set_id"], 22)

        set_patient_4 = content["query"][3]
        self.assertEqual(set_patient_4["id"], 5)
        self.assertEqual(set_patient_4["sample_set_id"], 13)
        self.assertEqual(set_patient_4["info"], 'test patient 4 #test4')
        self.assertEqual(set_patient_4["creator"], 'Administrator')
        self.assertEqual(set_patient_4["file_count"], 3)
        self.assertEqual(set_patient_4["first_name"], "patient")
        self.assertEqual(set_patient_4["last_name"], "4")
        self.assertEqual(set_patient_4["birth"], '2010-10-10')
        return
    


    def test_05_getSamplesOfSet(self):
        """
        Patient 13 have 3 samples analyzed with config 1, patient 19 have one sample but none analyzed
        """
        ### Define a set of id and config
        config_id_extract_read     = 1   # multi+inc+xxx
        config_id_multi     = 2   # multi+inc+xxx
        sample_set_id_present = 13  # Patient with 3 samples, analyzed with "extract read" but none with multi
        sample_set_id_absent  = 19  # Patient with one sample, but never analyzed
        
        self.vidjil.getSamplesOfSet(sample_set_id_present, config_id_extract_read)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 3)
        self.assertEqual(content["query"][0]["results_file"]["id"], 37, "sample/config have a result file in db")
        
        self.vidjil.getSamplesOfSet(sample_set_id_present, config_id_multi)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 3, "same number of sample as previous")
        self.assertEqual(content["query"][0]["results_file"]["id"], None, "sample/config have no result file for this config; so value id None")
        

        self.vidjil.getSamplesOfSet(sample_set_id_absent, config_id_extract_read)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "only one sample present in this set")
        self.assertEqual(content["query"][0]["results_file"]["id"], None, "No result file for this sample, return an entrie, but value is None")
        return


    def test_06_createPatient(self):
        """create a patient set, check initial content, add one sample
        
        """
        patient_data = self.vidjil.createPatient("Jane", "Austen", info="Patient from Winchester hospital, #LAL-B")
        setid_patient = patient_data["args"]["id"]

        content = self.vidjil.last_request["content"]
        # {'redirect': 'sample_set/index', 'args': {'id': 26}, 'message': 'successfully added/edited set(s)'}
        self.assertEqual(patient_data["redirect"], 'sample_set/index')
        self.assertEqual(patient_data["args"], {'id': 25}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(patient_data["message"], 'successfully added/edited set(s)')

        self.vidjil.getSamplesOfSet(25, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 0, "New set, no sample present")

        sample = self.vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":p+(%s)" % (setid_patient),
                file_filename= f"{current}/../../demo/Demo-X5.fa",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Uploaded by API" ,
                file_set_ids= "",
                sample_set_id= setid_patient,
                sample_type= "set")

        file_id  = sample["file_ids"][0]  ## Uploaded file
        print( "==> new file %s" % file_id)
        self.assertEqual(file_id, 49)

        self.vidjil.getSamplesOfSet(25, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "Add one sample, so should be present")
        return

    def test_07_createRun(self):
        """create a patient set, check initial content, add one sample
        
        """
        run_data = self.vidjil.createRun("Run 2022-072", run_date="2022-04-01")
        setid_run = run_data["args"]["id"]

        content = self.vidjil.last_request["content"]
        # {'redirect': 'sample_set/index', 'args': {'id': 26}, 'message': 'successfully added/edited set(s)'}
        self.assertEqual(run_data["redirect"], 'sample_set/index')
        self.assertEqual(run_data["args"], {'id': 26}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(run_data["message"], 'successfully added/edited set(s)')

        self.vidjil.getSamplesOfSet(26, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 0, "New set, no sample present")

        sample = self.vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":r+(%s)" % (setid_run),
                file_filename= f"{current}/../../demo/Demo-X5.fa",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Uploaded by API" ,
                file_set_ids= "",
                sample_set_id= setid_run,
                sample_type= "set")

        file_id  = sample["file_ids"][0]  ## Uploaded file
        print( "==> new file %s" % file_id)
        self.assertEqual(file_id, 50)

        self.vidjil.getSamplesOfSet(26, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "Add one sample, so should be present")
        return

    def test_08_createPatient(self):
        """create a sample, check content- returned; upload a file; launch an analysis; download result file (none present a db fake init)
        
        """
        set_data = self.vidjil.createSet("Set for API tests", info="Libraries with EuroClonality-NGS 2019 primers")
        setid_generic = set_data["args"]["id"]

        content = self.vidjil.last_request["content"]
        # {'redirect': 'sample_set/index', 'args': {'id': 26}, 'message': 'successfully added/edited set(s)'}
        self.assertEqual(set_data["redirect"], 'sample_set/index')
        self.assertEqual(set_data["args"], {'id': 27}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(set_data["message"], 'successfully added/edited set(s)')

        self.vidjil.getSamplesOfSet(27, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 0, "New set, no sample present")

        sample = self.vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":s+(%s)" % (setid_generic),
                file_filename= f"{current}/../../demo/Demo-X5.fa",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Uploaded by API" ,
                file_set_ids= "",
                sample_set_id= setid_generic,
                sample_type= "set")

        file_id  = sample["file_ids"][0]  ## Uploaded file
        print( "==> new file %s" % file_id)
        self.assertEqual(file_id, 51)

        self.vidjil.getSamplesOfSet(27, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "Add one sample, so should be present")
        return

    def test_09_createMultiSets(self):
        """create a sample, check content- returned; upload a file; launch an analysis; download result file (none present a db fake init)
        
        """
        patient_data  = self.vidjil.createPatient("Jane", "Austen", group=1, info="Patient from Winchester hospital, #LAL-B")
        setid_patient = patient_data["args"]["id"]
        self.assertEqual(patient_data["redirect"], 'sample_set/index')
        self.assertEqual(patient_data["args"], {'id': 28}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(patient_data["message"], 'successfully added/edited set(s)')
        run_data  = self.vidjil.createRun("Run 2022-072", run_date="2022-04-01")
        setid_run = run_data["args"]["id"]
        self.assertEqual(run_data["redirect"], 'sample_set/index')
        self.assertEqual(run_data["args"], {'id': 29}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(run_data["message"], 'successfully added/edited set(s)')
        generic_data  = self.vidjil.createSet("Set for API tests", info="Libraries with EuroClonality-NGS 2019 primers")
        setid_generic = generic_data["args"]["id"]
        self.assertEqual(generic_data["redirect"], 'sample_set/index')
        self.assertEqual(generic_data["args"], {'id': 30}) # !!! Each launch will change returned id; local tests will failed
        self.assertEqual(generic_data["message"], 'successfully added/edited set(s)')

        self.vidjil.getSamplesOfSet(30, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 0, "New set, no sample present")

        sample = self.vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":s+(%s)|:r+(%s)|:p+(%s)" % (setid_patient, setid_run, setid_generic),
                file_filename= f"{current}/../../demo/Demo-X5.fa",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Uploaded by API" ,
                file_set_ids= "",
                sample_set_id= setid_patient,
                sample_type= "set")

        file_id  = sample["file_ids"][0]  ## Uploaded file
        print( "==> new file %s" % file_id)
        self.assertEqual(file_id, 52)

        self.vidjil.getSamplesOfSet(30, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "Add one sample, so should be present")
        return
    
    def test_10_launchAnalysis(self):
        setid_generic = 30
        file_id = 52

        self.vidjil.getSamplesOfSet(30, -1)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 1, "Add one sample, so should be present")

        config_id = 2 ## multi+inc+xxx
        analysis  = self.vidjil.launchAnalysisOnSample(setid_generic, file_id, config_id)
        print("Launch analysis: %s" % analysis)
        return

    def test_11_FilterSetSelection(self):
        sets_all = self.vidjil.getSets(set_type=self.vidjil.PATIENT)
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 10)

        sets_filtered_infofield = self.vidjil.getSets(set_type=self.vidjil.PATIENT, filter_val="Winchester")
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 2)

        sets_filtered_names = self.vidjil.getSets(set_type=self.vidjil.PATIENT, filter_val="Austen")
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 2)

        sets_filtered_unknow = self.vidjil.getSets(set_type=self.vidjil.PATIENT, filter_val="blablablap") # none
        content = self.vidjil.last_request["content"]
        self.assertEqual(len(content["query"]), 0)
        return

    def test_12_Groups(self):
        groups = self.vidjil.groups
        self.assertEqual(len(groups), 1, "groups; only one group available")
        self.assertEqual(self.vidjil.group, '1', "as only one group available, automatic set of it")
        with self.assertRaises(Exception):
            self.vidjil.setGroup(5)
        return

    def test_13_createPatientWithWrongGroup(self):
        patient_data  = self.vidjil.createPatient("Jane", "Austen", group=5, info="Patient from Winchester hospital, #LAL-B")
        print( patient_data)
        self.assertEqual(patient_data["redirect"], 'sample_set/index')
        self.assertNotEqual(patient_data["args"], {'id': 28}) # !!! Each launch will change returned id; local tests will failed
        self.assertNotEqual(patient_data["message"], 'successfully added/edited set(s)')
        return

    def test_20_printInfoSet(self):
        sets_filtered = self.vidjil.getSets(set_type=self.vidjil.PATIENT)
        self.vidjil.infoSets('getSets(vidjil.PATIENT, "%s")' % filter, sets_filtered["query"], set_type=self.vidjil.PATIENT)

        return


    def test_21_printInfoSamples(self):
        setid_generic = 13
        config_id = 1
        samples   = self.vidjil.getSamplesOfSet(setid_generic, config_id)
        self.vidjil.infoSamples("getSamplesOfSet(%s, %d)" % (setid_generic, config_id), samples)
        return

if __name__ == '__main__':
    
    unittest.main()

