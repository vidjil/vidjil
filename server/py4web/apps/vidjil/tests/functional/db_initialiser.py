#!/usr/bin/env python

import sys
import time
from datetime import datetime

sys.path.append("../../../../")
from apps.vidjil import defs
from apps.vidjil import tasks
from apps.vidjil.modules import vidjil_utils
from apps.vidjil.common import auth
from apps.vidjil.modules.permission_enum import PermissionEnum


TEST_ADMIN_EMAIL = "plop@plop.com"
TEST_ADMIN_PASSWORD = "foobartest"

class DBInitialiser(object):

    def __init__(self, db):
        self.initialised = False
        self.initialised_sets = False
        self.db = db

    def run(self):
        self._init_users()
        self._init_pre_processes()
        self._init_groups()
        self._init_sample_sets()
        self._init_sequence_files()
        self._init_results_files()
        self._init_notifications()
        self._init_set_association_data()


    def _needs_init(func):
        def check_init(self):
            if not self.initialised:
                raise Exception("Uninitialised Database !")
            return func(self)
        return check_init

    def _needs_sets(func):
        def check_init(self):
            if not self.initialised_sets:
                raise Exception("Uninitialised Sample Sets !")
            return func(self)
        return check_init

    def _needs_files(func):
        def check_init(self):
            if not self.initialised_sets:
                raise Exception("Uninitialised Sequence Files !")
            return func(self)
        return check_init


    def get_set_dict(self, set_type, sample_set_id, i):
        if set_type == defs.SET_TYPE_PATIENT:
            return dict(id_label="", first_name="patient", last_name=i, birth="2010-10-10", info="test patient %d #test%d" % (i, i), sample_set_id=sample_set_id, creator=1)
        d = dict(name="%s %d" % (set_type, i), info="test %s %d #test%d" % (set_type, i, i), sample_set_id=sample_set_id, creator=1)
        if set_type == defs.SET_TYPE_RUN:
            d['id_label'] = ""
        return d

    def _init_users(self):
        vidjil_utils.init_db_helper(self.db, auth, force=True, admin_email=TEST_ADMIN_EMAIL, admin_password=TEST_ADMIN_PASSWORD)
        self.initialised = True

    @_needs_init
    def _init_sample_sets(self):
        types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
        public_group = self.db(self.db.auth_group.role == "public").select().first()
        for i in range(5):
            tag_id = self.db.tag.insert(name="test%d" % i)
            self.db.group_tag.insert(group_id=public_group.id, tag_id=tag_id)
            for t in types:
                ssid = self.db.sample_set.insert(sample_type=t)
                sid = self.db[t].insert(**self.get_set_dict(t, ssid, i))
                auth.add_permission(public_group.id, PermissionEnum.access.value, self.db.sample_set, ssid)
                self.db.tag_ref.insert(tag_id=tag_id, table_name=t, record_id=sid)
        self.db.commit()
        self.initialised_sets = True

    @_needs_init
    def _init_pre_processes(self):
        public_group = self.db(self.db.auth_group.role == "public").select().first()
        pid = self.db.pre_process.insert(name="public pre-process", command="cat &file1& &file2& > &result&", info="concatenate two files")
        auth.add_permission(public_group.id, PermissionEnum.access.value, self.db.pre_process, pid)
        for i in range(3):
            self.db.pre_process.insert(name="test pre-process %d" % i, command="dummy &file1& &file2& > &result&", info="test %d" % i)
        self.db.pre_process.insert(name="pre-process perm", command="dummy &file1& &file2& > &result&", info="dummy pre_process for permissions")
        self.db.commit()

    @_needs_sets
    def _init_sequence_files(self):
        sample_sets = self.db(self.db.sample_set.id > 0).select()
        for sample_set in sample_sets:
            for i in range(3):
                tag_id = self.db(self.db.tag.name == "test%d" % i).select().first().id
                sfid = self.db.sequence_file.insert(
                    sampling_date="2010-10-10",
                    info="test file %s %d #test%d" % (sample_set.sample_type, i, i),
                    filename="test_file.fasta",
                    size_file=1024,
                    network=False,
                    data_file="test_sequence_file",
                    producer="vidjil"
                )
                self.db.sample_set_membership.insert(sample_set_id=sample_set.id, sequence_file_id=sfid)
                self.db.tag_ref.insert(tag_id=tag_id, table_name=self.db.sequence_file, record_id=sfid)
        self.db.commit()

    @_needs_files
    def _init_results_files(self):
        sequence_files = self.db(self.db.sequence_file.id > 0).select()
        config = self.db(self.db.config.id > 0).select(limitby=(0,1)).first()
        timestamp = time.time()
        for sf in sequence_files:
            membership = self.db(self.db.sample_set_membership.sequence_file_id == sf.id).select(limitby=(0,1)).first()
            stid = self.db.scheduler_task.insert(
                application_name="vidjil",
                status=tasks.STATUS_COMPLETED,
                start_time=datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
            )
            self.db.results_file.insert(
                sequence_file_id=sf.id,
                config_id=config.id,
                run_date="2010-10-10 10:10:10",
                scheduler_task_id=stid,
                data_file="test_results_file"
            )
            self.db.fused_file.insert(
                config_id=config.id,
                sample_set_id=membership.sample_set_id,
                fuse_date="2010-10-10 10:10:10",
                status=tasks.STATUS_COMPLETED,
                sequence_file_list="%d_" % membership.sequence_file_id,
                fused_file="test_fused_file"
            )
        self.db.commit()

    @_needs_init
    def _init_notifications(self):
        for i in range(3):
            self.db.notification.insert(
                creator=1,
                title="test notification %d" % i,
                message_content="this is a test %d" % i,
                creation_datetime="2010-10-10 10:10:10"
            )
        self.db.commit()

    @_needs_init
    def _init_groups(self):
        parent = self.db.auth_group.insert(role="test parent")
        for i in range(3):
            c = self.db.auth_group.insert(role="test child %d" % i)
            self.db.group_assoc.insert(first_group_id=parent, second_group_id=c)
        self.db.commit()

    @_needs_init
    def _init_set_association_data(self):
        types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
        public_group = self.db(self.db.auth_group.role == "public").select().first()
        for i in range(3):
            tag_id = self.db.tag.insert(name="set_assoc_%d" % i)
            self.db.group_tag.insert(group_id=public_group.id, tag_id=tag_id)
            sfid = self.db.sequence_file.insert(
                sampling_date="2010-10-10",
                info="#set_assoc_%d" % i,
                filename="test_file.fasta",
                size_file=1024,
                network=False,
                data_file="test_sequence_file"
            )
            self.db.tag_ref.insert(tag_id=tag_id, table_name=self.db.sequence_file, record_id=sfid)

            for t in types:
                ssid = self.db.sample_set.insert(sample_type=t)
                d = self.get_set_dict(t, ssid, i)
                d['info'] = "set association test #set_assoc_%d" % i
                sid = self.db[t].insert(**d)
                auth.add_permission(public_group.id, PermissionEnum.access.value, self.db.sample_set, ssid)
                self.db.tag_ref.insert(tag_id=tag_id, table_name=t, record_id=sid)
                self.db.sample_set_membership.insert(sample_set_id=ssid, sequence_file_id=sfid)
        self.db.commit()
