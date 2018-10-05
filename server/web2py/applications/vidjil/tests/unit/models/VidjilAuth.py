#!/usr/bin/python

import unittest
from collections import Counter

class VidjilauthModel(unittest.TestCase):
        
    def __init__(self, p):
        global auth, count
        unittest.TestCase.__init__(self, p)
        count = 0
        
    def setUp(self):
        '''
        SetUp data for testing purposes. This data is created before each test and deleted after in the tearDown method.

        here is the current relationship status:

                    ##############
                    # group #
                    ##############
                      /      \
                     /        \
                #########    #############
                # group #    # group_sec #
                #########    #############

        patient is associated to group (group defined in testRunner.py)
        patient_sec is associated to group
        '''
        # Load the to-be-tested file
        execfile("applications/vidjil/models/VidjilAuth.py", globals())
        # set up default session/request/auth/...
        global auth, parent_group, group, group_sec, group_ter, group_qua, group_qui, my_user_id, user_id_sec, count, patient_id, patient_id_sec, parent_user_id, admin_user_id, patient_id_ter, patient_id_qua, first_sample_set_id, sample_set_id, sample_set_id_sec, sample_set_id_ter, generic_sample_set_id, config_id, file_id, fused_file_id, run_id, generic_id, pre_process_id
        auth = VidjilAuth(globals(), db)

        my_user_id = db.auth_user.insert(
            first_name='First',
            last_name='Group Tester',
            email='group.tester%d@vidjil.org' % count,
            password= db.auth_user.password.validate('1234')[0],
        )

        user_id_sec = db.auth_user.insert(
                first_name='Second',
                last_name='Group Tester',
                email='group.testertoo.%d@vidjil.org' % count,
                password=db.auth_user.password.validate('1234')[0]
                )

        parent_user_id = db.auth_user.insert(
                first_name='Par',
                last_name='ent',
                email='par.end.%d@vidjil.org' % count,
                password=db.auth_user.password.validate('1234')[0]
                )

        admin_user_id = db.auth_user.insert(
                first_name='Adm',
                last_name='in',
                email='adm.in.%d@vidjil.org' % count,
                password=db.auth_user.password.validate('1234')[0]
                )

        auth.login_bare("group.tester%d@vidjil.org" % count, "1234")

        count = count + 1

        # setup data used for tests
        first_sample_set_id = db.sample_set.insert(sample_type = defs.SET_TYPE_RUN)
        sample_set_id = db.sample_set.insert(sample_type = defs.SET_TYPE_PATIENT)
        sample_set_id_sec = db.sample_set.insert(sample_type = defs.SET_TYPE_PATIENT)
        sample_set_id_ter = db.sample_set.insert(sample_type = defs.SET_TYPE_RUN)
        generic_sample_set_id = db.sample_set.insert(sample_type = defs.SET_TYPE_GENERIC)

        patient_id = db.patient.insert(
                first_name="foo",
                last_name="bar",
                birth="1902-02-02",
                info="foobar",
                id_label="foobar",
                creator=my_user_id,
                sample_set_id=sample_set_id)

        patient_id_sec = db.patient.insert(
                first_name="footoo",
                last_name="bartoo",
                birth="1902-02-02",
                info="footoobartoo",
                id_label="footoobartoo",
                creator=my_user_id,
                sample_set_id=sample_set_id_sec)

        patient_id_ter = db.patient.insert(
                first_name="foothree",
                last_name="barthree",
                birth="1902-02-02",
                info="foothree",
                id_label="barthree",
                creator=my_user_id,
                sample_set_id=sample_set_id_sec)

        patient_id_qua = db.patient.insert(
                first_name="foofour",
                last_name="barfour",
                birth="1902-02-02",
                info="foofour",
                id_label="barfour",
                creator=my_user_id,
                sample_set_id=first_sample_set_id)

        run_id = db.run.insert(name="run",
                run_date="2010-10-25",
                info="run",
                id_label="run",
                creator=user_id,
                sample_set_id=first_sample_set_id)

        generic_id = db.generic.insert(name="generic one",
                info="generic",
                creator=user_id,
                sample_set_id=generic_sample_set_id)

        config_id = db.config.insert(name="config_test_popipo",
                info="popapipapo",
                command="-plop",
                fuse_command="-plop",
                program="plop.cpp")

        file_id = db.sequence_file.insert(sampling_date="1903-02-02",
                info="plop",
                pcr="plop",
                sequencer="plop",
                producer="plop",
                filename="plop",
                provider=user_id)

        pre_process_id = db.pre_process.insert(name='pre_process',
                command='foobar',
                info='info')

        sample_set_membership = db.sample_set_membership.insert(sample_set_id = first_sample_set_id,
            sequence_file_id = file_id)

        result_id = db.results_file.insert(sequence_file_id = file_id,
                config_id = config_id,
                run_date = "2014-09-19 00:00:00")

        fused_id = db.fused_file.insert(sample_set_id = first_sample_set_id,
                config_id = config_id,
                fuse_date = "2014-09-19 00:00:00")

        parent_group = db.auth_group.insert(role="parent_group", description="parent group")
        db.auth_membership.insert(user_id=parent_user_id, group_id=parent_group)

        group = db.auth_group.insert(role="group1", description="first group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group)

        group_sec = db.auth_group.insert(role="group2", description="second_group")
        db.auth_membership.insert(user_id=user_id_sec, group_id=group_sec)

        group_ter = db.auth_group.insert(role="group3", description="third group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group_ter)

        group_qua = db.auth_group.insert(role="group4", description="fourth group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group_qua)

        group_qui = db.auth_group.insert(role="group5", description="fifth group")

        admin_group = 1
        db.auth_membership.insert(user_id=admin_user_id, group_id=admin_group)

        db.group_assoc.insert(first_group_id = parent_group, second_group_id = group_sec)
        db.group_assoc.insert(first_group_id = group_qui, second_group_id = group)

        db.auth_permission.insert(name=PermissionEnum.upload.value, table_name='sample_set', group_id=group_qua, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.run.value, table_name='sample_set', group_id=group_qua, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='sample_set', group_id=group_qua, record_id=sample_set_id_ter)

        db.auth_permission.insert(name=PermissionEnum.admin.value, table_name='sample_set', group_id=group_ter, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group_ter, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.save.value, table_name='run', group_id=group_ter, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=group_ter, record_id=patient_id_ter)

        db.auth_permission.insert(name=PermissionEnum.admin.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.run.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.save.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.upload.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value,
                table_name='auth_group',
                group_id=group_sec,
                record_id=parent_group)
        db.auth_permission.insert(name=PermissionEnum.admin.value,
                table_name='auth_group',
                group_id=group_sec,
                record_id=parent_group)

        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=parent_group, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=parent_group, record_id = patient_id)

        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=group, record_id = patient_id_sec)

        db.auth_permission.insert(group_id = parent_group,
                        name = PermissionEnum.access.value,
                        table_name = "config",
                        record_id = config_id
                        )

        db.auth_permission.insert(group_id = parent_group,
                        name = PermissionEnum.access.value,
                        table_name = 'run',
                        record_id = run_id)

        db.auth_permission.insert(group_id = parent_group,
                        name = PermissionEnum.access.value,
                        table_name = "generic",
                        record_id = generic_id)

        db.auth_permission.insert(group_id = parent_group,
                        name = PermissionEnum.access.value,
                        table_name = 'patient',
                        record_id = patient_id_qua)
        db.commit()

    def tearDown(self):
        db((db.auth_group.id == group) |
            (db.auth_group.id == group_sec)).delete()

        db((db.auth_membership.group_id == group) |
            (db.auth_membership.group_id == group_sec)).delete

        db((db.patient.id == patient_id) |
            (db.patient.id == patient_id_sec) |
            (db.patient.id == patient_id_ter)).delete()

        auth.logout(next=None, onlogout=None, log=None)
        db((db.auth_user.id == my_user_id) |
            (db.auth_user.id == user_id_sec) |
            (db.auth_user.id == parent_user_id)).delete()

    def testGetGroupNames(self):
        expected = ["group1", "group3", "group4"]
        result = auth.get_group_names()
        self.assertEqual(Counter(expected), Counter(result), msg="Expected: %s, but got: %s" % (str(expected), str(result)))

    def testGetPermission(self):
        result = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=user_id_sec)
        self.assertTrue(result,
            "The user %d does not have the expected permission: read on patient for %d" % (auth.user_id, patient_id))

        result = auth.get_permission(PermissionEnum.read.value, 'config', config_id, user=auth.user_id)
        self.assertFalse(result,
            "The user %d has some unexpected permissions: read on config for %d" % (auth.user_id, config_id))

        # ensure cache is appropriately set
        cached_value = auth.permissions['config'][config_id]['read']
        self.assertFalse(cached_value,
            "Expected read permission on config_id(%d) to be False" % config_id)

    def testIsAdmin(self):
        result = auth.is_admin(user=auth.user_id)
        self.assertFalse(result, "User %d should not have admin permissions" % auth.user_id)

        result = auth.is_admin(user=admin_user_id)
        self.assertTrue(result, "User %d should have admin permissions" % admin_user_id)

    def testIsInGroup(self):
        parent_group_name = db(db.auth_group.id == parent_group).select()[0].role
        group_name = db(db.auth_group.id == group).select()[0].role

        result = auth.is_in_group(parent_group_name)
        self.assertFalse(result, "User %d should not be in group %d" % (auth.user_id, parent_group))

        result = auth.is_in_group(group_name)
        self.assertTrue(result, "User %d should be in group %d" % (auth.user_id, group))

    def testCanCreatePatient(self):
        result = auth.can_create_patient()
        self.assertFalse(result, "User %d should not have patient creation permissions" % auth.user_id)

        result = auth.can_create_patient(user_id)
        self.assertTrue(result, "User %d is missing patient creation permissions" % user_id)

    def testCanModifyPatient(self):
        result = auth.can_modify_patient(patient_id_qua)
        self.assertFalse(result, "User %d should not be able to modify patient %d" % (auth.user_id, patient_id_qua))

        result = auth.can_modify_patient(patient_id_qua, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify patient %d" % (user_id_sec, patient_id_qua))

        result = auth.can_modify_patient(patient_id_qua, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify patient %d" % (admin_user_id, patient_id_qua))

    def testCanModifyRun(self):
        result = auth.can_modify_run(run_id)
        self.assertFalse(result, "User %d should not be able to modify run %d" % (auth.user_id, run_id))

        result = auth.can_modify_run(run_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify run %d" % (user_id_sec, run_id))

        result = auth.can_modify_run(run_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify run %d" % (admin_user_id, run_id))

    def testCanModifySampleSet(self):
        result = auth.can_modify_sample_set(first_sample_set_id)
        self.assertFalse(result, "User %d should not be able to modify sample_set %d" % (auth.user_id, first_sample_set_id))

        result = auth.can_modify_sample_set(first_sample_set_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify sample_set %d" % (user_id_sec, first_sample_set_id))

        result = auth.can_modify_sample_set(first_sample_set_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify sample_set %d" % (admin_user_id, first_sample_set_id))

    def testCanModifyGeneric(self):
        # patient data
        result = auth.can_modify('patient', patient_id_qua)
        self.assertFalse(result, "User %d should not be able to modify patient %d" % (auth.user_id, patient_id_qua))

        result = auth.can_modify('patient', patient_id_qua, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify patient %d" % (user_id_sec, patient_id_qua))

        result = auth.can_modify('patient', patient_id_qua, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify patient %d" % (admin_user_id, patient_id_qua))

        # run data
        result = auth.can_modify('run', run_id)
        self.assertFalse(result, "User %d should not be able to modify run %d" % (auth.user_id, run_id))

        result = auth.can_modify('run', run_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify run %d" % (user_id_sec, run_id))

        result = auth.can_modify('run', run_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify run %d" % (admin_user_id, run_id))

        # generic data
        result = auth.can_modify('generic', generic_id)
        self.assertFalse(result, "User %d should not be able to modify generic %d" % (auth.user_id, generic_id))

        result = auth.can_modify('generic', generic_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify generic %d" % (user_id_sec, generic_id))

        result = auth.can_modify('generic', generic_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify generic %d" % (admin_user_id, generic_id))

    def testCanModifyFile(self):
        result = auth.can_modify_file(file_id)
        self.assertFalse(result, "User %d should not be able to modify file %d" % (auth.user_id, file_id))

        result = auth.can_modify_file(file_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify file %d" % (user_id_sec, file_id))

        result = auth.can_modify_file(file_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify file %d" % (admin_user_id, file_id))

    def testCanModifyConfig(self):
        result = auth.can_modify_config(config_id)
        self.assertFalse(result, "User %d should not be able to modify config %d" % (auth.user_id, config_id))

        result = auth.can_modify_config(config_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify config %d" % (user_id_sec, config_id))

        result = auth.can_modify_config(config_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify config %d" % (admin_user_id, config_id))

    def testCanModifyGroup(self):
        result = auth.can_modify_group(parent_group)
        self.assertFalse(result, "User %d should not be able to modify group %d" % (auth.user_id, parent_group))

        result = auth.can_modify_group(parent_group, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify group %d" % (user_id_sec, parent_group))

        result = auth.can_modify_group(parent_group, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify group %d" % (admin_user_id, parent_group))

    def testCanModifyPreProcess(self):
        result = auth.can_modify_pre_process(pre_process_id, admin_user_id)
        self.assertTrue(result, "User %d should be able to modify pre process %d" % (admin_user_id, pre_process_id))

        result = auth.can_modify_pre_process(pre_process_id, user_id_sec)
        self.assertFalse(result, "User %d should be able to modify pre process %d" % (user_id_sec, pre_process_id))

    def testCanProcessFile(self):
        result = auth.can_process_file('patient', patient_id_sec)
        self.assertFalse(result,
                "User %d should not be able to process files for patient %d" % (auth.user_id, patient_id_sec))

        result = auth.can_process_file('patient', patient_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to process files for patient %d" % (user_id_sec, patient_id))

        result = auth.can_process_file('patient', patient_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to process files" % admin_user_id)

    def testCanProcessSampleSet(self):
        result = auth.can_process_sample_set(sample_set_id_sec)
        self.assertFalse(result,
                "User %d should not be able to process files for sample_set %d" % (auth.user_id, sample_set_id_sec))

        result = auth.can_process_sample_set(sample_set_id_ter)
        self.assertTrue(result,
                "User %d should be able to process files for sample_set %d" % (auth.user_id, sample_set_id_ter))

        result = auth.can_process_sample_set(sample_set_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to process files for sample_set %d" % (user_id_sec, sample_set_id))

        result = auth.can_process_sample_set(sample_set_id_ter, user_id_sec)
        self.assertFalse(result,
                "User %d should not be able to process files for sample_set %d" % (user_id_sec, sample_set_id_ter))

        result = auth.can_process_sample_set(sample_set_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to process files" % admin_user_id)

    def testCanUploadFile(self):
        result = auth.can_upload_file('patient', patient_id_sec)
        self.assertFalse(result,
                "User %d should not have permission to upload files for patient %d" % (auth.user_id, patient_id_sec))

        result = auth.can_upload_file('patient', patient_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to upload files for patient %d" % (user_id_sec, patient_id))

        result = auth.can_upload_file('patient', patient_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to upload files" % admin_user_id)

    def testCanUploadSampleSet(self):
        result = auth.can_upload_sample_set(sample_set_id_sec)
        self.assertFalse(result,
                "User %d should not have permission to upload files for sample_set %d" % (auth.user_id, sample_set_id_sec))

        result = auth.can_upload_sample_set(sample_set_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to upload files for sample_set %d" % (user_id_sec, sample_set_id))

        result = auth.can_upload_sample_set(sample_set_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to upload files" % admin_user_id)

    def testCanUseConfig(self):
        result = auth.can_use_config(config_id)
        self.assertFalse(result, "User %d should not have permission to use config %d" % (auth.user_id, config_id))

        result = auth.can_use_config(config_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to use config %d" % (user_id_sec, config_id))

        result = auth.can_use_config(config_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to use config %d" % (admin_user_id, config_id))

    def testCanView(self):
        result = auth.can_view('patient', patient_id_qua)
        self.assertFalse(result, "User %d should not have permission to view patient %d" % (auth.user_id, patient_id_qua))

        result = auth.can_view('patient', patient_id_qua, user_id_sec)
        self.assertTrue(result, "User %d should be able to view patient %d" % (user_id_sec, patient_id_qua))

        result = auth.can_view('patient', patient_id_qua, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to view patient %d" % (admin_user_id, patient_id_qua))

    def testCanViewSampleSet(self):
        result = auth.can_view_sample_set(first_sample_set_id)
        self.assertFalse(result, "User %d should not have permission to view sample_set %d" % (auth.user_id, first_sample_set_id))

        result = auth.can_view_sample_set(first_sample_set_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to view sample_set %d" % (user_id_sec, first_sample_set_id))

        result = auth.can_view_sample_set(first_sample_set_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to view sample_set %d" % (admin_user_id, first_sample_set_id))

    def testCanSavePatient(self):
        result = auth.can_save_patient(patient_id_qua)
        self.assertFalse(result, "User %d should not have permission to save patient %d" % (auth.user_id, patient_id_qua))

        result = auth.can_save_patient(patient_id_qua, user_id_sec)
        self.assertTrue(result, "User %d should be able to save patient %d" % (user_id_sec, patient_id_qua))

        result = auth.can_save_patient(patient_id_qua, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to save patient %d" % (admin_user_id, patient_id_qua))

    def testCanSaveRun(self):
        result = auth.can_save_run(run_id)
        self.assertFalse(result, "User %d should not have permission to save run %d" % (auth.user_id, run_id))

        result = auth.can_save_run(run_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to save run %d" % (user_id_sec, run_id))

        result = auth.can_save_run(run_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to save run %d" % (admin_user_id, run_id))

    def testCanSaveSampleSet(self):
        result = auth.can_save_sample_set(first_sample_set_id)
        self.assertFalse(result, "User %d should not have permission to save sample_set %d" % (auth.user_id, first_sample_set_id))

        result = auth.can_save_sample_set(first_sample_set_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to save sample_set %d" % (user_id_sec, first_sample_set_id))

        result = auth.can_save_sample_set(first_sample_set_id, admin_user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to save sample_set %d" % (admin_user_id, first_sample_set_id))

    def testCanViewInfo(self):
        result = auth.can_view_info('patient', patient_id_sec, auth.user_id)
        self.assertFalse(result, "User %d should not have permission anon for patient %d" % (auth.user_id, patient_id_sec))

        # give anon permission to user
        db.auth_permission.insert(group_id=group, name=PermissionEnum.anon.value, table_name='sample_set', record_id=0)
        db.commit()

        # clear the cache (or else the new permission will be ignored)
        auth.permissions = {}

        result = auth.can_view_info('patient', patient_id_sec, auth.user_id)
        self.assertTrue(result, "User %d is missing permission anon for patient: %d" % (auth.user_id, patient_id_sec))

    def testGetGroupParent(self):
        expected = [parent_group]
        result = auth.get_group_parent(group_sec)
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

    def testGetUserGroups(self):
        expected = [group, group_ter, group_qua]
        result = [g.id for g in auth.get_user_groups()]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

        expected = [group_sec]
        result = [g.id for g in auth.get_user_groups(user_id_sec)]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

    def testGetUserGroupParents(self):
        expected = [group_qui]
        result = [g.id for g in auth.get_user_group_parents()]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

        expected = [parent_group]
        result = [g.id for g in auth.get_user_group_parents(user_id_sec)]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

    def testVidjilAccessibleQuery(self):
        expected = [patient_id_sec, patient_id_ter]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', auth.user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), auth.user_id))

        expected = [patient_id, patient_id_qua]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', user_id_sec)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), user_id_sec))

        expected = [patient_id_sec, patient_id_ter]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', my_user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), user_id))

    def testChildParentShare(self):
        '''
        Tests that a child does not share permissions with a parent group
        '''
        child_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=auth.user_id)
        self.assertTrue(child_perm, "User %d is missing permissions on patient %d" % (auth.user_id, patient_id_sec))

        parent_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=parent_user_id)
        self.assertFalse(parent_perm, "Child group %d is conferring permissions to parent group %d" % (group, parent_group))

    def testParentChildShare(self):
        '''
        Tests that a parent group shares permissions with a child group
        '''
        parent_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=parent_user_id)
        self.assertTrue(parent_perm, "User %d is missing permissions on patient %d" % (parent_user_id, patient_id))

        child_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=user_id_sec)
        self.assertTrue(child_perm, "Parent group %d failed to pass permissions to child group %d" % (parent_group, group_sec))

    def testSiblingShare(self):
        '''
        Tests that two groups that share a parent do not share their own permissions between them
        '''
        owner_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=auth.user_id)
        self.assertTrue(owner_perm, "User %d is missing permissions on patient %d" % (auth.user_id, patient_id_sec))

        sibling_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=user_id_sec)
        self.assertFalse(sibling_perm, "A read permission had been passed from group %d to group %d" % (group, group_sec))

    def testAdminShare(self):
        '''
        Tests that being part of the group admin grants permissions on all patients
        '''
        expected = [p.id for p in db(db.patient).select()]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', admin_user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

        for patient_id in expected:
            res = auth.can_modify_patient(patient_id, admin_user_id)
            self.assertTrue(res, "User %d is missing permissions on patient %d" % (admin_user_id, patient_id))

    def testAccessibleCanConcordance(self):
        res_accessible = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', auth.user_id)).select()]
        full_patient_list = [p.id for p in db(db.patient).select()]

        res_can = []
        for p in full_patient_list:
            if auth.can_view('patient', p, auth.user_id):
                res_can.append(p)

        self.assertEqual(Counter(res_accessible), Counter(res_can),
                "The two methods returned different results. accessible: %s, can: %s" % (res_accessible, res_can))

    def testAdminCrossBleed(self):
        '''
        Tests that having admin permissions in one group will not share admin permissions to another
        '''
        res = auth.can_modify_patient(patient_id_qua, user_id_sec)
        self.assertTrue(res, "User %d is missing admin permissions on patient %d" % (user_id_sec, patient_id_qua))

        res = auth.can_view('patient', patient_id, user_id_sec)
        self.assertTrue(res, "User %d is missing read permissions on patient %d" % (user_id_sec, patient_id))

        res = auth.can_modify_patient(patient_id_sec, auth.user_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id_sec))

    def testGetPermissionCache(self):
        res = auth.can_modify_patient(patient_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id))

        db.auth_permission.insert(group_id=group, name=PermissionEnum.admin.value, table_name='sample_set', record_id=0)

        res = auth.can_modify_patient(patient_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id))

    def testGetPermissionGroups(self):
        res = auth.get_permission_groups(PermissionEnum.admin.value, user_id_sec)
        expected = [group_sec]
        self.assertEqual(Counter(expected), Counter(res),
                "Expected: %s, but got %s for user %d" % (str(expected), str(res), auth.user_id))

    def testGetAccessGroups(self):
        res = auth.get_access_groups('patient', patient_id, user_id_sec)
        expected = [group_sec]
        self.assertEqual(Counter(expected), Counter(res),
                "Expected: %s, but for %s for user %d" % (str(expected), str(res), user_id_sec))

    def testLoadPermissions(self):
        query = auth.load_permissions(PermissionEnum.admin.value, 'patient')
        res = [p.id for p in query]
        expected = [patient_id_ter]
        self.assertEqual(Counter(expected), Counter(res),
                "Expected %s, but got %s for user %d" % (str(expected), str(res), auth.user_id))

        cache_content = auth.permissions['patient'][patient_id_ter]['admin']
        self.assertTrue(cache_content, "The results from load_permissions were not loaded into cache")

    def testGetGroupPermission(self):
        res = auth.get_group_permission(PermissionEnum.admin.value, 'sample_set', 0, group_sec)
        self.assertTrue(res, "Group %d is missing admin permissions" % group_sec)

        res = auth.get_group_permission(PermissionEnum.read.value, 'patient', patient_id, parent_group)
        self.assertTrue(res, "Group %d is missing permission access on patient %d" % (parent_group, patient_id))

        res = auth.get_group_permission(PermissionEnum.admin.value, 'patient', patient_id, group)
        self.assertFalse(res, "Group %d should not have admin permission on patient %d" % (group, patient_id))

    def testGetGroupAccess(self):
        res = auth.get_group_access('patient', patient_id, parent_group)
        self.assertTrue(res, "Group %d is missing access to patient %d" % (parent_group, patient_id))

        res = auth.get_group_access('patient', patient_id, group_sec)
        self.assertFalse(res, "Group %d should not have direct access to patient %d" % (group_sec, patient_id))

    def testGetGroupPermissions(self):
        permissions = auth.get_group_permissions(table_name='sample_set', group_id=parent_group)
        expected = [PermissionEnum.read.value]
        self.assertEqual(Counter(expected), Counter(permissions), "Expected %s, but got %s for group %d" % (str(expected), str(permissions), parent_group))

        permissions = auth.get_group_permissions(table_name='sample_set', group_id=1)
        expected = [PermissionEnum.access.value, PermissionEnum.read.value, PermissionEnum.admin.value, PermissionEnum.create.value]
        self.assertEqual(Counter(expected), Counter(permissions), "Expected %s, but got %s for group %d" % (str(expected), str(permissions), 1))

        expected = [PermissionEnum.read.value, PermissionEnum.create.value]
        permissions = auth.get_group_permissions(table_name='sample_set', group_id=1, myfilter=expected)
        self.assertEqual(Counter(expected), Counter(permissions), "Expected %s, but got %s for group %d" % (str(expected), str(permissions), 1))
