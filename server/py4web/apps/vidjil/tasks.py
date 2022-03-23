from .common import settings, scheduler, db, Field

@scheduler.task
def task_test():
    try:
        db._adapter.reconnect()
        db.patient[28826].update_record( info = db.patient[28826]['info']+"z")
        print('POUET')
        db.commit()
    except:
        db.rollback()


# run task_test every 10 seconds
scheduler.conf.beat_schedule = {
    "my_first_task": {
        "task": "apps.vidjil.tasks.task_test",
        "schedule": 10.0,
        "args": (),
    },
}
