last_results = ''
for res in db(db.scheduler_task.id == db.results_file.scheduler_task_id).select(orderby=~db.results_file.id,
                                                                                    limitby=(0,10)):
    last_results += res.scheduler_task.status[0]

print last_results
