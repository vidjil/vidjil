import logging

class UserLogHandler(logging.Handler):


    def __init__(self):
        logging.Handler.__init__(self)
        self.table = 'user_log'

    def emit(self, record):
        if hasattr(record, 'user_id') and hasattr(record, 'record_id'):
            db[self.table].insert(
                user_id=record.user_id,
                table_name=record.table_name,
                created=datetime.datetime.now(),
                msg=record.message,
                record_id=record.record_id
            )
            db.commit()
