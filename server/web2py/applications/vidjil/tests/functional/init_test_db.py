#!/usr/bin/env python

import vidjil_utils

class DBInitialiser(object):

    def __init__(self):
        self.initialised = False

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


    def get_set_dict(self, set_type, sample_set_id, i):
        if set_type == defs.SET_TYPE_PATIENT:
            return dict(first_name="patient", last_name=i, info="test patient %d #test%d" % (i, i), sample_set_id=sample_set_id)
        return dict(name="%s %d" % (set_type, i), info="test %s %d #test%d" % (set_type, i, i), sample_set_id=sample_set_id)

    def init_users(self):
        init_db_helpler(force=True, admin_email="plop@plop.com", admin_password="foobartest")
        self.initialised = True

    @_needs_init
    def init_sample_sets(self):
        types = [defs.SET_TYPE_PATIENT, defs.SET_TYPE_RUN, defs.SET_TYPE_GENERIC]
        public_group = db(db.auth_group.role == "public").select().first()
        for i in range(5):
            for t in types:
                ssid = db.sample_set.insert(sample_type=t)
                sid = db[t].insert(get_set_dict(t, ssid, i))
                auth.add_permission(public_group.id, PermissionEnum.access.value, db.sample_set, ssid)

    @_needs_init
    def _init_pre_processes(self):
        pid = db.pre_process.insert(name="public pre-process", command="cat &file1& &file2& > &result&", info="concatenate two files")
        auth.add_permission(public_group.id, PermissionEnum.access.value, db.pre_process, pid)

    @_needs_sets
    def init_sequence_files(self):
        sample_sets = db(db.sample_set.id > 0).select()
        for sample_set in sample_sets:
            for i in range(3):
                sfid = db.sequence_file.insert(
                    sampling_date="2010-10-10",
                    info="test file %s %d" % (sample_set.sample_type, i),
                    filename="test_file.fasta",
                    size_file=1024,
                    network=False
                )
                db.sample_set_membership.insert(sample_set_id=sample_set.id, sequence_file_id=sfid)

vidjil_utils.reset_db(db)
