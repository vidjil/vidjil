#!/usr/bin/env python

import vidjil_utils

class DBInitialiser(object):

    def __init__(self):
        self.initialised = False
        self.initialised_sets = False

    def run(self):
        self._init_users()
        self._init_pre_processes()
        self._init_groups()
        self._init_sample_sets()
        self._init_sequence_files()
        self._init_results_files()
        self._init_notifications()


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
            return dict(id_label="", first_name="patient", last_name=i, birth="2010-10-10", info="test patient %d #test%d" % (i, i), sample_set_id=sample_set_id)
        d = dict(name="%s %d" % (set_type, i), info="test %s %d #test%d" % (set_type, i, i), sample_set_id=sample_set_id)
        if set_type == defs.SET_TYPE_RUN:
            d['id_label'] = ""
        return d

    def _init_users(self):
        vidjil_utils.init_db_helper(db, auth, force=True, admin_email="plop@plop.com", admin_password="foobartest")
        self.initialised = True

    @_needs_init
    def _init_sample_sets(self):
        types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
        public_group = db(db.auth_group.role == "public").select().first()
        for i in range(5):
            for t in types:
                ssid = db.sample_set.insert(sample_type=t)
                sid = db[t].insert(**self.get_set_dict(t, ssid, i))
                auth.add_permission(public_group.id, PermissionEnum.access.value, db.sample_set, ssid)
        self.initialised_sets = True

    @_needs_init
    def _init_pre_processes(self):
        public_group = db(db.auth_group.role == "public").select().first()
        pid = db.pre_process.insert(name="public pre-process", command="cat &file1& &file2& > &result&", info="concatenate two files")
        auth.add_permission(public_group.id, PermissionEnum.access.value, db.pre_process, pid)
        for i in range(3):
            db.pre_process.insert(name="test pre-process %d" % i, command="dummy &file1& &file2& > &result&", info="test %d" % i)

    @_needs_sets
    def _init_sequence_files(self):
        sample_sets = db(db.sample_set.id > 0).select()
        for sample_set in sample_sets:
            for i in range(3):
                sfid = db.sequence_file.insert(
                    sampling_date="2010-10-10",
                    info="test file %s %d" % (sample_set.sample_type, i),
                    filename="test_file.fasta",
                    size_file=1024,
                    network=False,
                    data_file="test_sequence_file"
                )
                db.sample_set_membership.insert(sample_set_id=sample_set.id, sequence_file_id=sfid)

    @_needs_files
    def _init_results_files(self):
        sequence_files = db(db.sequence_file.id > 0).select()
        config = db(db.config.id > 0).select(limitby=(0,1)).first()
        for sf in sequence_files:
            membership = db(db.sample_set_membership.sequence_file_id == sf.id).select(limitby=(0,1)).first()
            stid = db.scheduler_task.insert(
                application_name="vidjil",
                status="COMPLETED"
            )
            db.results_file.insert(
                sequence_file_id=sf.id,
                config_id=config.id,
                run_date="2010-10-10 10:10:10:10",
                scheduler_task_id=stid
            )
            db.fused_file.insert(
                config_id=config.id,
                sample_set_id=membership.sample_set_id,
                fuse_date="2010-10-10 10:10:10:10",
                status="COMPLETED",
                sequence_file_list="%d_" % membership.sequence_file_id
            )

    @_needs_init
    def _init_notifications(self):
        for i in range(3):
            db.notification.insert(
                creator=1,
                title="test notification %d" % i,
                message_content="this is a test %d" % i,
                creation_datetime="2010-10-10 10:10:10"
            )

    @_needs_init
    def _init_groups(self):
        parent = db.auth_group.insert(role="test parent")
        for i in range(3):
            c = db.auth_group.insert(role="test child %d" % i)
            db.group_assoc.insert(first_group_id=parent, second_group_id=c)

initialiser = DBInitialiser()
initialiser.run()
