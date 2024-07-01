#!/usr/bin/python

from __future__ import print_function
from gluon.scheduler import RUNNING, QUEUED, ASSIGNED
import sys
import os
import datetime


TIMEOUT=3600

def is_queued_since(timeout):
    item = db(db.scheduler_task.status == QUEUED).select(orderby=db.scheduler_task.start_time).first()
    if item:
        since = datetime.datetime.now() - item.start_time
        print("Queued since {} ".format(since))
    return item and since > datetime.timedelta(seconds=timeout)

def restart_workers_when_stuck(timeout):
    if is_queued_since(timeout):
        dir=os.path.dirname(os.path.abspath(__file__))+"/../scripts"
        os.system("bash {}/launch_python_script.sh admin.py reset_workers".format(dir))

if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == "-h" :
        print("Usage: {} [timeout]\n\ntimeout: Number of seconds that a task can be queued before restarting workers (default {}s)".format(sys.argv[0], TIMEOUT))
    timeout = TIMEOUT
    if len(sys.argv) > 1:
        timeout = int(sys.argv[1])
    restart_workers_when_stuck(timeout)
