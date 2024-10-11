#!/usr/bin/python
import argparse

parser = argparse.ArgumentParser(description='Process results and scheduler tasks that are no longer in use.')
parser.add_argument('--assume-yes', action='store_true', help='assume yes on all choices')

args = parser.parse_args()

def prompt(question):
    affir = ['y', 'yes']
    negat = ['n', 'no']
    confirm = affir[0] if args.assume_yes else ""
    while (confirm.lower() not in affir + negat):
        if confirm != "":
            print "Invalid option."
        confirm = raw_input(question)
        if confirm == "":
            confirm = negat[0]
            
    if confirm in affir:
        return True
    elif confirm in negat:
        return False
    else:
        raise Exception('Illegal State')

results_files = db(
                db.sequence_file.id == db.results_file.sequence_file_id
            ).select(
                db.results_file.ALL,
                orderby=(db.results_file.sequence_file_id|db.results_file.config_id|~db.results_file.run_date)
            )

prev_sfid = -1
prev_cid = -1
for row in results_files:
    if row.sequence_file_id != prev_sfid or row.config_id != prev_cid:
        targets = (
            (db.results_file.sequence_file_id == row.sequence_file_id) &
            (db.results_file.config_id == row.config_id) &
            (db.results_file.id != row.id)
        )
        if db(targets).count() > 0:
            print "Conserving: %d" % row.id

            task_targets = (targets &
                (db.scheduler_task.id == db.results_file.scheduler_task_id)
            )
            task_ids = [r.id for r in db(task_targets).select(db.scheduler_task.id)]
            print "Removing scheduler tasks: %s" % str(task_ids)

            choice = prompt("confirm deleting these %d scheduler tasks ? [y/N]" % len(task_ids))
            if choice:
                for target in db(targets).select(db.results_file.scheduler_task_id):
                    db(db.scheduler_task.id == target.scheduler_task_id).delete()

            result_ids = [r.id for r in db(targets).select(db.results_file.id)]
            print "Removing results_files: %s" % str(result_ids)

            choice = prompt("confirm deleting these %d results files ? [y/N]" % len(result_ids))
            if choice:
                db(targets).delete()

        prev_sfid = row.sequence_file_id
        prev_cid = row.config_id
