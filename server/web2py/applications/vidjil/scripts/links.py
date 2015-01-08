
import defs
import datetime

patient_id = 10


our_id = 0

print "### Sequences"

for res in db(db.patient.id == db.sequence_file.patient_id).select():
    our_id += 1
    print "ln -s %s/%-20s %5s.fa" % (defs.DIR_SEQUENCES, res.sequence_file.data_file, our_id),
    print "\t", "# seq-%04d" % res.sequence_file.id, "%-20s" % res.sequence_file.filename,
    print "\t", "# pat-%04d (%s %s)" % (res.patient.id, res.patient.first_name, res.patient.last_name)

print "### Results"



for seq in db(db.sequence_file).select():
    print "===", "seq-%d" % seq.id, "\t", seq.sampling_date, "\t", seq.filename, seq.data_file
    res_with_file = []

    for res in db((db.results_file.sequence_file_id == seq.id) & (db.patient.id == seq.patient_id)).select(orderby=db.results_file.run_date):
       print "   ", "sched-%d" % res.results_file.scheduler_task_id, "\t", res.results_file.run_date, "\t", res.results_file.data_file
       if res.results_file.data_file:
              res_with_file += [res]

    if not res_with_file:
        continue

    # Takes the last result
    res = res_with_file[-1]
    our_id = "pat-%04d--%s--sched-%04d--seq-%04d--%s" % (res.patient.id, res.patient.last_name[:3],
                                                         res.results_file.scheduler_task_id,
                                                         seq.id, seq.sampling_date)

    print "ln -s %s/%-20s %5s.vidjil" % (defs.DIR_RESULTS, res.results_file.data_file, our_id),
    print "\t", "# seq-%04d" % seq.id, "%-20s" % seq.filename, "%-10s" % seq.sampling_date
    print "\t", "# pat-%04d (%s %s)" % (res.patient.id, res.patient.first_name, res.patient.last_name)


