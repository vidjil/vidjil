#!/usr/bin/python

import unittest

class User_groupModel(unittest.TestCase):
        
    def __init__(self, p):
        global auth, count
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        execfile("applications/vidjil/models/user_group.py", globals())
        auth = VidjilAuth(globals(), db)

        global auth, user_id, user_group_id, group_id
        user_id = db.auth_user.insert(
            first_name='test',
            last_name='user',
            email='tester@vidjil.org',
            password= db.auth_user.password.validate('1234')[0],
        )
        auth.login_bare("tester@vidjil.org", "1234")

        user_group_id = db.auth_group.insert(
                role='user_%d' % user_id
                )

        group_id = db.auth_group.insert(
                role='test_group'
                )

        user_patient_id = db.patient.insert(
                first_name="patient",
                last_name="user",
                creator=user_id)

        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=user_group_id, record_id=user_patient_id)

        test_patient_id = db.patient.insert(
                first_name="patient",
                last_name="test",
                creator=user_id)

        db.auth_permission.insert(name=PermissionEnum.access.value, table_name='patient', group_id=group_id, record_id=test_patient_id)

        db.auth_membership.insert(user_id=user_id, group_id=user_group_id)
        db.auth_permission.insert(name=PermissionEnum.create.value, table_name='sample_set', group_id=group_id, record_id=0)
        db.auth_permission.insert(name=PermissionEnum.create.value, table_name='sample_set', group_id=user_group_id, record_id=0)
        db.commit()

    def testGetDefaultCreationGroup(self):
        res = get_default_creation_group(auth)
        groups = res[0]
        max_group = res[1]
        expected = [user_group_id]
        group_ids = sorted([group['id'] for group in groups])
        self.assertEqual(group_ids, expected, 'Group lists do not match. Expected %s but got %s' % (expected, str(group_ids)))
        self.assertEqual(max_group, user_group_id, 'Incorrect max_group. Exprected %d, but got %d' % (user_group_id, max_group))

        db.auth_membership.insert(user_id=user_id, group_id=group_id)
        db.commit()

        res = get_default_creation_group(auth)
        max_group = res[1]
        self.assertEqual(max_group, group_id, 'Incorrect max_group. Exprected %d, but got %d' % (group_id, max_group))


