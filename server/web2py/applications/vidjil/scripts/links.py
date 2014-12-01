
import defs
import datetime

patient_id = 10


our_id = 0

for res in db(db.patient.id == db.sequence_file.patient_id).select():
    our_id += 1
    print "ln -s %s/%-20s %5s.fa" % (defs.DIR_SEQUENCES, res.sequence_file.data_file, our_id),
    print "\t", "# seq-%04d" % res.sequence_file.id, "%-20s" % res.sequence_file.filename,
    print "\t", "# pat-%04d (%s %s)" % (res.patient.id, res.patient.first_name, res.patient.last_name)
