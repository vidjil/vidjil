
import defs
import datetime
LAST_HOURS = 24

def tmp_dir(scheduler_args):
    '''Recompute the tmp directory from scheduler_args'''
    ll = scheduler_args.replace(']','').split(',')

    try:
        if len(ll) == 4:
            # ["8443", "26", 10501, null]
            return defs.DIR_OUT_VIDJIL_ID % int(ll[2])

        if len(ll) == 2:
            # [1, 8483]
            return defs.DIR_PRE_VIDJIL_ID % int(ll[1])

    except:
        pass
    return '?'

def ellipsis(what, max_size=30):
    ell = ' ...'
    if what:
        if len(what) > max_size:
            return what[:max_size-len(ell)] + ell
    return what

print()

yesterday = datetime.datetime.now() - datetime.timedelta(hours=LAST_HOURS)

RUN_CONFIG_SEQ_PATIENT = (db.results_file.sequence_file_id == db.sequence_file.id) & (db.sample_set_membership.sequence_file_id == db.sequence_file.id) & (db.sample_set_membership.sample_set_id == db.patient.sample_set_id) & (db.config.id == db.results_file.config_id) & (db.scheduler_task.id == db.results_file.scheduler_task_id)

print() 
print("=== Recent not completed tasks, last %d hours" % LAST_HOURS)

for res in db((db.scheduler_task.last_run_time >= yesterday) & (db.scheduler_task.status != 'COMPLETED')).select():
    print("   ", "sch-%04d" % res.id, "\t", res.status, "   ", "\t", res.start_time, "\t", res.args, end=' ')
    print("\t", tmp_dir(res.args))


print()
print("=== Recent analysis saved, last %d hours" % LAST_HOURS)

for res in db((db.analysis_file.analyze_date >= yesterday) & (db.patient.sample_set_id == db.analysis_file.sample_set_id)).select():
    print("   ", res.analysis_file.analyze_date, end=' ')
    print("\t", "pat-%04d (%s)" % (res.patient.id, res.patient.last_name[:3]), end=' ')
    print("\t", ellipsis(res.analysis_file.analysis_file, 50))

print() 
print("=== Recent auth events, last %d hours" % LAST_HOURS)

for res in db((db.auth_event.time_stamp >= yesterday) & (db.auth_user.id == db.auth_event.user_id)).select():
    print("   ", res.auth_event.time_stamp, res.auth_event.client_ip, end=' ')
    print("\t", "%3d" % res.auth_user.id, "%-24s" % (res.auth_user.first_name + ' ' + res.auth_user.last_name), end=' ')
    print("\t", res.auth_event.description)

print() 
print("=== Recent results files, last %d hours" % LAST_HOURS)

for res in db((db.results_file.run_date >= yesterday) & RUN_CONFIG_SEQ_PATIENT).select():
    print("   ", "sch-%04d" % res.results_file.scheduler_task_id, "\t", res.scheduler_task.status, "   ", end=' ')
    print("\t", res.results_file.run_date, "\t", res.config.name, end=' ') # "\t", res.data_file,
    print("\t", "seq-%04d" % res.sequence_file.id, "%-20s" % res.sequence_file.filename, end=' ')
    print("\t", "pat-%04d (%s)" % (res.patient.id, res.patient.last_name[:3]), end=' ')
    print("\t", tmp_dir(res.scheduler_task.args), ellipsis(res.results_file.data_file))


print()
print("=== Tables")

for table in db.tables:
    print("%10s %-20s" % (len(db(db[table]).select()), table))


print()

log.debug("=== db-stats.py completed ===")
