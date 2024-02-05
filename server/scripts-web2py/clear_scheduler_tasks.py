#!/usr/bin/python

from gluon import current
import gluon


runs_query = db(db.scheduler_run.run_output.like('Pre-process is still pending, re-schedule%'))
tasks_query = db(db.scheduler_task.id.belongs(runs_query._select(db.scheduler_run.task_id)))

tasks = tasks_query.select()

print 'Tasks resulting in Pre-process still pending: %s' % len(tasks)
print 'Would you like to delete them ? y/[n]'

answer = raw_input()

if answer.lower() in ('y', 'yes'):
    print 'Deleting tasks'
    tasks_query.delete()

    runs = runs_query.select()
    print 'There are %d runs left after deleting tasks' % len(runs)
    print 'Would you like to delete the, ? y/[n]'
    answer = raw_input()
    if answer.lower() in ('y', 'yes'):
        print 'Deleting runs'
        runs_query.delete()

    print 'Commit to these changes ? y/[n]'
    answer = raw_input()
    if answer.lower() in ('y', 'yes'):
        print 'Committing'
        db.commit()
    else:
        print ' Rollback'
        db.rollback()
else:
    print 'preserving tasks and runs'
