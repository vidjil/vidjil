import os
import json
from pathlib import Path
import unittest
# from ..utils.omboddle import Omboddle
from .... import defs
from ....controllers import admin as admin_controller
from ....modules import sampleSet as sampleSet


class TestAdminController(unittest.TestCase):

    def setUp(self):
        return

    ##################################
    # Tests on admin_controller.index()
    ##################################

    def test_create_sampleset_for_each_type(self):
        sample_set_patient = sampleSet.SampleSet(type="patient")
        sample_set_run     = sampleSet.SampleSet(type="run")
        sample_set_generic = sampleSet.SampleSet(type="generic")
        return

    def test_show_results_fields(self):
        sample_set_patient = sampleSet.SampleSet(type="patient")

        data_results = {
            ## Fictive data
            "sample_set_id": "404",
            "name": "A patient first and last name",
            ## Data from a faked real db
            'id': 2, 
            'sample_set_id': 2, 
            'info': '', 
            'creator': 'Administrator', 
            'file_count': 2, 
            'first_name': 'test number', 
            'last_name': 'demo', 
            'birth': None, 
            '_extra': {
                '`patient`.`id` AS id': 2, 
                '`patient`.`sample_set_id` AS sample_set_id': 2, 
                '`patient`.`info` AS info': '', 
                '`auth_user`.`last_name` AS creator': 'Administrator', 
                'COUNT(DISTINCT `sequence_file`.`id`) AS file_count': 2, 
                'COUNT(DISTINCT sequence_file.id) * SUM(sequence_file.size_file) / COUNT(*)': 406485.0, 
                "GROUP_CONCAT(DISTINCT config.id, ';', config.name, ';', fused_file.fused_file)": 
                    '2;multi+inc+xxx;fused_file.fused_file.bc7f86d336e8c296.MDAwMDA3LTIuZnVzZWQ=.fused,3;multi+inc;fused_file.fused_file.b8e8ae213c894f15.MDAwMDExLTIuZnVzZWQ=.fused', 
                'GROUP_CONCAT(DISTINCT config.id)': '2,3', 
                'GROUP_CONCAT(DISTINCT config.name)': 'multi+inc,multi+inc+xxx', 
                'GROUP_CONCAT(DISTINCT auth_group.role)': 'admin', 
                '`patient`.`first_name` AS first_name': 'test number',
                '`patient`.`last_name` AS last_name': 'demo', 
                '`patient`.`birth` AS birth': None
            }
        }
        config_url = sample_set_patient.get_config_urls(data_results)
        string_config = str(config_url)

        list_assertion = [
            # config 2 results
            "myUrl.loadUrl(db, { &#x27;sample_set_id&#x27; : &#x27;2&#x27;, &#x27;config&#x27; :  2 }, &#x27;(A patient first and last name 2)&#x27; );",
            
            # config 2 QC stats
            "db.call(&#x27;sample_set/multi_sample_stats&#x27;, {&#x27;sample_set_id&#x27;: 2, &#x27;config_id&#x27; : 2 })",
            
            # config 3 results
            "myUrl.loadUrl(db, { &#x27;sample_set_id&#x27; : &#x27;2&#x27;, &#x27;config&#x27; :  3 }, &#x27;(A patient first and last name 3)&#x27; ); }",
            
            # config 3 QC stats
            "db.call(&#x27;sample_set/multi_sample_stats&#x27;, {&#x27;sample_set_id&#x27;: 2, &#x27;config_id&#x27; : 3 })",
            ]
        for test in list_assertion:
            assert test in string_config
        
        ## Not tested
        # 'onclick="event.preventDefault();event.stopPropagation();if( event.which == 2 '\n ') { window.open(this.href); } else { myUrl.loadUrl(db, { '\n '&#x27;sample_set_id&#x27; : &#x27;2&#x27;, &#x27;config&#x27; :  2 }, '\n '&#x27;(
        
        return
