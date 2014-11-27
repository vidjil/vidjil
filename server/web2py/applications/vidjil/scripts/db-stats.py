
import defs
import datetime
LAST_HOURS = 24

def tmp_dir(scheduler_args):
    data_id = int(scheduler_args.split(',')[2])
    return defs.DIR_OUT_VIDJIL_ID % data_id

def ellipsis(what, max_size=30):
    ell = ' ...'
    if what:
        if len(what) > max_size:
            return what[:max_size-len(ell)] + ell
    return what

print

yesterday = datetime.datetime.now() - datetime.timedelta(hours=LAST_HOURS)

RUN_CONFIG_SEQ_PATIENT = (db.results_file.sequence_file_id == db.sequence_file.id) & (db.patient.id == db.sequence_file.patient_id) & (db.config.id == db.results_file.config_id) & (db.scheduler_task.id == db.results_file.scheduler_task_id)

print 
print "=== Recent not completed tasks, last %d hours" % LAST_HOURS

for res in db((db.scheduler_task.last_run_time >= yesterday) & (db.scheduler_task.status != 'COMPLETED')).select():
    print "   ", "sch-%04d" % res.id, "\t", res.status, "   ", "\t", res.start_time, "\t", res.args,
    print "\t", tmp_dir(res.args)


print
print "=== Recent analysis saved, last %d hours" % LAST_HOURS

for res in db((db.analysis_file.analyze_date >= yesterday) & (db.patient.id == db.analysis_file.patient_id)).select():
    print "   ", res.analysis_file.analyze_date,
    print "\t", "pat-%04d (%s %s)" % (res.patient.id, res.patient.first_name, res.patient.last_name),
    print "\t", ellipsis(res.analysis_file.analysis_file, 50)


print 
print "=== Recent results files, last %d hours" % LAST_HOURS

for res in db((db.results_file.run_date >= yesterday) & RUN_CONFIG_SEQ_PATIENT).select():
    print "   ", "sch-%04d" % res.results_file.scheduler_task_id, "\t", res.scheduler_task.status, "   ",
    print "\t", res.results_file.run_date, "\t", res.config.name, # "\t", res.data_file,
    print "\t", "seq-%04d" % res.sequence_file.id, "%-20s" % res.sequence_file.filename,
    print "\t", "pat-%04d (%s %s)" % (res.patient.id, res.patient.first_name, res.patient.last_name),
    print "\t", tmp_dir(res.scheduler_task.args), ellipsis(res.results_file.data_file)


print
print "=== Tables"

for table in db.tables:
    print "%10s %-20s" % (len(db(db[table]).select()), table)


print
