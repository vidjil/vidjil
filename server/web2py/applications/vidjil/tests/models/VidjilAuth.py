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
                    # fake_group #
                    ##############
                      /      \
                     /        \
                #########    #############
                # group #    # group_sec #
                #########    #############

        patient is associated to fake_group (group defined in testRunner.py)
        patient_sec is associated to group
        '''
        # Load the to-be-tested file
        execfile("applications/vidjil/models/VidjilAuth.py", globals())
        # set up default session/request/auth/...
        global auth, group, group_sec, group_ter, my_user_id, user_id_sec, count, patient_id, patient_id_sec, parent_user_id, admin_patient_id, sample_set_id
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

        auth.login_bare("group.tester%d@vidjil.org" % count, "1234")

        count = count + 1

        # setup data used for tests
        sample_set_id = db.sample_set.insert(sample_type = 'patient')
        sample_set_id_sec = db.sample_set.insert(sample_type = 'patient')

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

        admin_patient_id = db.patient.insert(
                first_name="ad",
                last_name="min",
                birth="1902-02-02",
                info="admin",
                id_label="admin",
                creator=my_user_id,
                sample_set_id=sample_set_id_sec)

        db.auth_membership.insert(user_id=parent_user_id, group_id=fake_group_id)

        group = db.auth_group.insert(role="group1", description="first group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group)

        group_sec = db.auth_group.insert(role="group2", description="second_group")
        db.auth_membership.insert(user_id=user_id_sec, group_id=group_sec)

        group_ter = db.auth_group.insert(role="group3", description="third group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group_ter)

        group_qua = db.auth_group.insert(role="group4", description="fourth group")
        db.auth_membership.insert(user_id=my_user_id, group_id=group_qua)

        db.group_assoc.insert(first_group_id = fake_group_id, second_group_id = group_sec)

        db.auth_permission.insert(name=PermissionEnum.upload.value, table_name='sample_set', group_id=group_qua, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.run.value, table_name='sample_set', group_id=group_qua, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='sample_set', group_id=group_qua, record_id=sample_set_id_ter)

        db.auth_permission.insert(name=PermissionEnum.admin.value, table_name='sample_set', group_id=group_ter, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group_ter, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=group_ter, record_id=admin_patient_id)

        db.auth_permission.insert(name=PermissionEnum.admin.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.run.value, table_name='sample_set', group_id=group_sec, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.upload.value, table_name='sample_set', group_id=group_sec, record_id=0)

        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=fake_group_id, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=fake_group_id, record_id = patient_id)

        db.auth_permission.insert(name=PermissionEnum.read.value, table_name='sample_set', group_id=group, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=group, record_id = patient_id_sec)

        db.commit()

    def tearDown(self):
        db((db.auth_group.id == group) |
            (db.auth_group.id == group_sec)).delete()

        db((db.auth_membership.group_id == group) |
            (db.auth_membership.group_id == group_sec)).delete

        db((db.patient.id == patient_id) |
            (db.patient.id == patient_id_sec) |
            (db.patient.id == admin_patient_id)).delete()

        auth.logout(next=None, onlogout=None, log=None)
        db((db.auth_user.id == my_user_id) |
            (db.auth_user.id == user_id_sec) |
            (db.auth_user.id == parent_user_id)).delete()

    def testGetGroupNames(self):
        expected = ["group1", "group3"]
        result = auth.get_group_names()
        self.assertEqual(Counter(expected), Counter(result), msg="Expected: %s, but got: %s" % (str(expected), str(result)))

    def testGetPermission(self):
        result = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=user_id_sec)
        self.assertTrue(result,
            "The user %d does not have the expected permission: read on patient for %d" % (auth.user_id, patient_id))

        result = auth.get_permission(PermissionEnum.read.value, 'config', fake_config_id, user=auth.user_id)
        self.assertFalse(result,
            "The user %d has some unexpected permissions: read on config for %d" % (auth.user_id, fake_config_id))

    def testIsAdmin(self):
        result = auth.is_admin(user=auth.user_id)
        self.assertFalse(result, "User %d should not have admin permissions" % auth.user_id)

        result = auth.is_admin(user=user_id)
        self.assertTrue(result, "User %d should have admin permissions" % user_id)

    def testIsInGroup(self):
        fake_group_name = db(db.auth_group.id == fake_group_id).select()[0].role
        group_name = db(db.auth_group.id == group).select()[0].role

        result = auth.is_in_group(fake_group_name)
        self.assertFalse(result, "User %d should not be in group %d" % (auth.user_id, fake_group_id))

        result = auth.is_in_group(group_name)
        self.assertTrue(result, "User %d should be in group %d" % (auth.user_id, group))

    def testCanCreatePatient(self):
        result = auth.can_create_patient()
        self.assertFalse(result, "User %d should not have patient creation permissions" % auth.user_id)

        result = auth.can_create_patient(user_id)
        self.assertTrue(result, "User %d is missing patient creation permissions" % user_id)

    def testCanModifyPatient(self):
        result = auth.can_modify_patient(fake_patient_id)
        self.assertFalse(result, "User %d should not be able to modify patient %d" % (auth.user_id, fake_patient_id))

        result = auth.can_modify_patient(fake_patient_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify patient %d" % (user_id_sec, fake_patient_id))

        result = auth.can_modify_patient(fake_patient_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify patient %d" % (user_id, fake_patient_id))

    def testCanModifyRun(self):
        result = auth.can_modify_run(fake_run_id)
        self.assertFalse(result, "User %d should not be able to modify run %d" % (auth.user_id, fake_run_id))

        result = auth.can_modify_run(fake_run_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify run %d" % (user_id_sec, fake_run_id))

        result = auth.can_modify_run(fake_run_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify run %d" % (user_id, fake_run_id))

    def testCanModifySampleSet(self):
        result = auth.can_modify_sample_set(fake_sample_set_id)
        self.assertFalse(result, "User %d should not be able to modify sample_set %d" % (auth.user_id, fake_sample_set_id))

        result = auth.can_modify_sample_set(fake_sample_set_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify sample_set %d" % (user_id_sec, fake_sample_set_id))

        result = auth.can_modify_sample_set(fake_sample_set_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify sample_set %d" % (user_id, fake_sample_set_id))

    def testCanModifyFile(self):
        result = auth.can_modify_file(fake_file_id)
        self.assertFalse(result, "User %d should not be able to modify file %d" % (auth.user_id, fake_file_id))

        result = auth.can_modify_file(fake_file_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify file %d" % (user_id_sec, fake_file_id))

        result = auth.can_modify_file(fake_file_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify file %d" % (user_id, fake_file_id))

    def testCanModifyConfig(self):
        result = auth.can_modify_config(fake_config_id)
        self.assertFalse(result, "User %d should not be able to modify config %d" % (auth.user_id, fake_config_id))

        result = auth.can_modify_config(fake_config_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify config %d" % (user_id_sec, fake_config_id))

        result = auth.can_modify_config(fake_config_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify config %d" % (user_id, fake_config_id))

    def testCanModifyGroup(self):
        result = auth.can_modify_group(fake_group_id)
        self.assertFalse(result, "User %d should not be able to modify group %d" % (auth.user_id, fake_group_id))

        result = auth.can_modify_group(fake_group_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to modify group %d" % (user_id_sec, fake_group_id))

        result = auth.can_modify_group(fake_group_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to modify group %d" % (user_id, fake_group_id))

    def testCanProcessFile(self):
        result = auth.can_process_file()
        self.assertFalse(result, "User %d should not be able to process files" % (auth.user_id))

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

        result = auth.can_process_sample_set(sample_set_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to process files" % user_id)

    def testCanUploadFile(self):
        result = auth.can_upload_file('patient', patient_id_sec)
        self.assertFalse(result,
                "User %d should not have permission to upload files for patient %d" % (auth.user_id, patient_id_sec))

        result = auth.can_upload_file('patient', patient_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to upload files for patient %d" % (user_id_sec, patient_id))

        result = auth.can_upload_file('patient', patient_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to upload files" % user_id)

    def testCanUploadSampleSet(self):
        result = auth.can_upload_sample_set(sample_set_id_sec)
        self.assertFalse(result,
                "User %d should not have permission to upload files for sample_set %d" % (auth.user_id, sample_set_id_sec))

        result = auth.can_upload_sample_set(sample_set_id, user_id_sec)
        self.assertTrue(result,
                "User %d should be able to upload files for sample_set %d" % (user_id_sec, sample_set_id))

        result = auth.can_upload_sample_set(sample_set_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to upload files" % user_id)

    def testCanUseConfig(self):
        result = auth.can_use_config(fake_config_id)
        self.assertFalse(result, "User %d should not have permission to use config %d" % (auth.user_id, fake_config_id))

        result = auth.can_use_config(fake_config_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to use config %d" % (user_id_sec, fake_config_id))

        result = auth.can_use_config(fake_config_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to use config %d" % (user_id, fake_config_id))

    def testCanViewPatient(self):
        result = auth.can_view_patient(fake_patient_id)
        self.assertFalse(result, "User %d should not have permission to view patient %d" % (auth.user_id, fake_patient_id))

        result = auth.can_view_patient(fake_patient_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to view patient %d" % (user_id_sec, fake_patient_id))

        result = auth.can_view_patient(fake_patient_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to view patient %d" % (user_id, fake_patient_id))

    def testCanViewRun(self):
        result = auth.can_view_run(fake_run_id)
        self.assertFalse(result, "User %d should not have permission to view run %d" % (auth.user_id, fake_run_id))

        result = auth.can_view_run(fake_run_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to view run %d" % (user_id_sec, fake_run_id))

        result = auth.can_view_run(fake_run_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to view run %d" % (user_id, fake_run_id))

    def testCanViewSampleSet(self):
        result = auth.can_view_sample_set(fake_sample_set_id)
        self.assertFalse(result, "User %d should not have permission to view sample_set %d" % (auth.user_id, fake_sample_set_id))

        result = auth.can_view_sample_set(fake_sample_set_id, user_id_sec)
        self.assertTrue(result, "User %d should be able to view sample_set %d" % (user_id_sec, fake_sample_set_id))

        result = auth.can_view_sample_set(fake_sample_set_id, user_id)
        self.assertTrue(result,
                "User %d is a member of admin group and is missing permissions to view sample_set %d" % (user_id, fake_sample_set_id))

    def testCanViewPatientInfo(self):
        result = auth.can_view_patient_info(patient_id_sec, auth.user_id)
        self.assertFalse(result, "User %d should not have permission anon for patient %d" % (auth.user_id, patient_id_sec))

        db.auth_permission.insert(group_id=group, name=PermissionEnum.anon.value, table_name='sample_set', record_id=0)
        db.commit()
        result = auth.can_view_patient_info(patient_id_sec, auth.user_id)
        self.assertTrue(result, "User %d is missing permission anon for patient: %d" % (auth.user_id, patient_id_sec))

    def testGetGroupParent(self):
        expected = [fake_group_id]
        result = auth.get_group_parent(group_sec)
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

    def testGetUserGroups(self):
        expected = [group, group_ter]
        result = [g.id for g in auth.get_user_groups()]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

        expected = [group_sec, fake_group_id]
        result = [g.id for g in auth.get_user_groups(user_id_sec)]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

    def testVidjilAccessibleQuery(self):
        expected = [patient_id_sec, admin_patient_id]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', auth.user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), auth.user_id))

        expected = [patient_id, fake_patient_id]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', user_id_sec)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), user_id_sec))

        expected = [fake_patient_id, patient_id, patient_id_sec, admin_patient_id]
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result),
                "Expected: %s, but got: %s for user: %d" % (str(expected), str(result), user_id))

    def testChildParentShare(self):
        '''
        Tests that a child does not share permissions with a parent group
        '''
        child_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=auth.user_id)
        self.assertTrue(child_perm, "User %d is missing permissions on patient %d" % (auth.user_id, patient_id_sec))

        parent_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id_sec, user=parent_user_id)
        self.assertFalse(parent_perm, "Child group %d is conferring permissions to parent group %d" % (group, fake_group_id))

    def testParentChildShare(self):
        '''
        Tests that a parent group shares permissions with a child group
        '''
        parent_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=parent_user_id)
        self.assertTrue(parent_perm, "User %d is missing permissions on patient %d" % (parent_user_id, patient_id))

        child_perm = auth.get_permission(PermissionEnum.read.value, 'patient', patient_id, user=user_id_sec)
        self.assertTrue(child_perm, "Parent group %d failed to pass permissions to child group %d" % (fake_group_id, group_sec))

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
        result = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', user_id)).select()]
        self.assertEqual(Counter(expected), Counter(result), "Expected: %s, but got: %s" % (str(expected), str(result)))

        for patient_id in expected:
            res = auth.can_modify_patient(patient_id, user_id)
            self.assertTrue(res, "User %d is missing permissions on patient %d" % (user_id, patient_id))

    def testAccessibleCanConcordance(self):
        res_accessible = [p.id for p in db(auth.vidjil_accessible_query(PermissionEnum.read.value, 'patient', auth.user_id)).select()]
        full_patient_list = [p.id for p in db(db.patient).select()]

        res_can = []
        for p in full_patient_list:
            if auth.can_view_patient(p, auth.user_id):
                res_can.append(p)

        self.assertEqual(Counter(res_accessible), Counter(res_can),
                "The two methods returned different results. accessible: %s, can: %s" % (res_accessible, res_can))

    def testAdminCrossBleed(self):
        '''
        Tests that having admin permissions in one group will not share admin permissions to another
        '''
        res = auth.can_modify_patient(fake_patient_id, user_id_sec)
        self.assertTrue(res, "User %d is missing admin permissions on patient %d" % (user_id_sec, fake_patient_id))

        res = auth.can_view_patient(patient_id, user_id_sec)
        self.assertTrue(res, "User %d is missing read permissions on patient %d" % (user_id_sec, patient_id))

        res = auth.can_modify_patient(patient_id, auth.user_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id))

    def testGetPermissionCache(self):
        res = auth.can_modify_patient(patient_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id))

        db.auth_permission.insert(group_id=group, name=PermissionEnum.admin.value, table_name='sample_set', record_id=0)

        res = auth.can_modify_patient(patient_id)
        self.assertFalse(res, "User %d should not have admin permissions on patient %d" % (auth.user_id, patient_id))

    def testGetPermissionGroups(self):
        res = auth.get_permission_groups(PermissionEnum.admin.value, 'patient', user_id_sec)
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
        expected = [admin_patient_id]
        self.assertEqual(Counter(expected), Counter(res),
                "Expected %s, but got %s for user %d" % (str(expected), str(res), auth.user_id))

        key = auth.get_cache_key(PermissionEnum.admin.value, 'patient')
        cache_content = auth.permissions[key][admin_patient_id]
        self.assertTrue(cache_content, "The results from load_permissions were not loaded into cache")

    def testGetGroupPermission(self):
        res = auth.get_group_permission(PermissionEnum.admin.value, 'sample_set', 0, group_sec)
        self.assertTrue(res, "Group %d is missing admin permissions" % group_sec)

        res = auth.get_group_permission(PermissionEnum.read.value, 'patient', patient_id, fake_group_id)
        self.assertTrue(res, "Group %d is missing permission access on patient %d" % (fake_group_id, patient_id))

        res = auth.get_group_permission(PermissionEnum.admin.value, 'patient', patient_id, group)
        self.assertFalse(res, "Group %d should not have admin permission on patient %d" % (group, patient_id))

    def testGetGroupAccess(self):
        res = auth.get_group_access('patient', patient_id, fake_group_id)
        self.assertTrue(res, "Group %d is missing access to patient %d" % (fake_group_id, patient_id))

        res = auth.get_group_access('patient', patient_id, group_sec)
        self.assertFalse(res, "Group %d should not have direct access to patient %d" % (group_sec, patient_id))
