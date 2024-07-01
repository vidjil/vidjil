
import defs

for seq in db(db.sequence_file).select():
    print "===", "seq-%d" % seq.id, "\t", seq.sampling_date, "\t", seq.filename, seq.data_file
    files = []

    for res in db(db.results_file.sequence_file_id == seq.id).select():
       print "   ", "sched-%d" % res.scheduler_task_id, "\t", res.run_date, "\t", res.data_file
       if res.data_file:
              files += [res.data_file]


    if len(files) < 2:
       continue

    ### Compare .vidjil files across several launches
    old = files[-2]
    new = files[-1]
    
    com = 'python /home/vidjil/server/diff.py %s/%s %s/%s' % (defs.DIR_RESULTS, old, defs.DIR_RESULTS, new)
    # print com
    os.system(com)

log.debug("=== compare-last-results.py completed ===")
