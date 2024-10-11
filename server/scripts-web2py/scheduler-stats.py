


for row in db(db.scheduler_run).select():
    duration = int((row.stop_time - row.start_time).total_seconds()) if row.stop_time else None
    print duration, "\t%s" % row.status, "\t%s" % row.task_id


