"""
This file defines the database models
"""
import datetime
#import defs

from .common import db, Field, T, auth
from pydal.validators import *
from py4web.utils.populate import populate

# Used for examples of forms.
def get_user_email():
    return None if auth.current_user is None else auth.current_user.get('email')


def get_time():
    return datetime.datetime.utcnow()

## AUTH old tables for import

db.define_table('auth_user',
            Field('username', 'string'),
            Field('sso_id', 'string'),
            Field('action_token', 'string'),
            Field('last_password_change', 'string'),
            #Field('email__tmp', 'string'),
            Field('first_name', 'string'),
            Field('last_name', 'string'),
            Field('email', 'string'),
            Field('password', 'password'),
            Field('registration_key', 'string'),
            Field('reset_password_key', 'string'),
            Field('registration_id', 'string'), redefine=True)

db.define_table('auth_group',
            Field('role', 'string'),
            Field('description', 'text'))

db.define_table('auth_event',
            Field('time_stamp', 'datetime'),
            Field('client_ip', 'string'),
            Field('user_id', 'reference auth_user'),
            Field('origin', 'string'),
            Field('description', 'text'))

db.define_table('auth_cas',
            Field('user_id', 'reference auth_user'),
            Field('created_on', 'datetime'),
            Field('service', 'string'),
            Field('ticket', 'string'),
            Field('renew', 'boolean'))

db.define_table('auth_membership',
            Field('user_id', 'reference auth_user'),
            Field('group_id', 'reference auth_group'))

db.define_table('auth_permission',
            Field('group_id', 'reference auth_group'),
            Field('name', 'string'),
            Field('table_name', 'string'),
            Field('record_id', 'integer'))






AUTODELETE = False
LENGTH_UPLOAD = 400

db.define_table('sample_set',
                Field('creator','reference auth_user', ondelete='SET NULL'),
               Field('sample_type', 'string', ondelete='SET NULL'))


db.define_table("patient",
                Field('first_name','string'),
                Field('last_name','string'),
                Field('birth','date'),
                Field('info','text'),
                Field('id_label','string'),
                Field('creator','reference auth_user', ondelete='SET NULL',
                                    requires=IS_NULL_OR(IS_IN_DB(db, 'auth_user.id',
                                    '%(first_name)s',
                                    zero='..')),
                                    filter_out=lambda x: x.first_name if x else ''),
                Field('sample_set_id','reference sample_set', ondelete='CASCADE'))

db.define_table("run",
                Field('name','string'),
                Field('run_date','date'),
                Field('info','text'),
                Field('id_label','string'),
                Field('creator','reference auth_user', ondelete='SET NULL'),
				Field('sequencer','string'),
				Field('pcr','string'),
                Field('sample_set_id','reference sample_set', ondelete='CASCADE'))

db.define_table("generic",
                Field('name', 'string'),
                Field('info', 'text'),
                Field('creator', 'reference auth_user', ondelete='SET NULL'),
                Field('sample_set_id','reference sample_set', ondelete='CASCADE'))

db.define_table('pre_process',
                Field('name', 'string'),
                Field('command', 'string'),
                Field('info','text'))


db.define_table('sequence_file',
                Field('patient_id', 'reference patient'),
                Field('sampling_date','date'),
                Field('info','text'),
                Field('filename','text'),
                Field('pcr','text'),
                Field('sequencer','text'),
                Field('producer','text'),
                Field('size_file','bigint', default=0),
                Field('size_file2','bigint', default=0),
                Field('network', 'boolean', default=False),
                Field('provider','reference auth_user'),
                Field('pre_process_id', 'reference pre_process', ondelete='SET NULL'),
                Field('pre_process_result', 'text'),
                Field('pre_process_flag', 'text'),
                Field('pre_process_scheduler_task_id', 'integer'),
                Field('data_file', 'upload', 
                      uploadfolder="upload/uploads/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE),
                Field('data_file2', 'upload', 
                      uploadfolder="upload/uploads/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE),
                Field('pre_process_file', 'upload',
                      uploadfolder="result/results/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))




db.define_table('classification',
                Field('name', 'string'),
                Field('info','text'))


db.define_table('config',
                Field('name', 'string'),
                Field('program', 'string'),
                Field('command', 'string'),
                Field('fuse_command', 'string'),
                Field('info','text'),
                Field('classification', 'reference classification', ondelete='SET NULL'))


db.define_table('results_file',
                Field('sequence_file_id', 'reference sequence_file'),
                Field('config_id', 'reference config', ondelete='SET NULL'),
                Field('run_date','datetime'),
                Field('scheduler_task_id', 'integer'),
                Field('hidden', 'boolean', default = False, notnull = True),
                Field('data_file', 'upload', 
                      uploadfolder="result/results/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))


db.define_table('fused_file',
                Field('patient_id', 'reference patient', ondelete='SET NULL'),
                Field('config_id', 'reference config', ondelete='SET NULL'),
                Field('sample_set_id', 'reference sample_set', ondelete='SET NULL'),
                Field('fuse_date','datetime', default="1970-01-01 00:00:00"),
                Field('status', 'string'),
                Field('sequence_file_list', 'string'),
                Field('fused_file', 'upload', 
                      uploadfolder="result/results/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))

db.define_table('analysis_file',
                Field('patient_id', 'reference patient', ondelete='SET NULL'),
                Field('config_id', 'reference config', ondelete='SET NULL'),
                Field('sample_set_id', 'reference sample_set', ondelete='SET NULL'),
                Field('analyze_date','datetime'),
                Field('status', 'string'),
                Field('analysis_file', 'upload', 
                      uploadfolder="result/results/",
                      length=LENGTH_UPLOAD, autodelete=AUTODELETE))

db.define_table('notification',
				Field('creator', 'integer'),
				Field('title', 'string'),
				Field('message_content', 'text'),
				Field('message_type', 'string'),
				Field('priority', 'string'),
				Field('expiration', 'date'),
                                Field('creation_datetime', 'datetime'))

db.define_table('user_preference',
		Field('user_id', 'reference auth_user'),
		Field('preference', 'string'),
		Field('val', 'string'))


db.define_table('sample_set_membership',
               Field('sample_set_id','reference sample_set', ondelete='SET NULL'),
               Field('sequence_file_id', 'reference sequence_file', ondelete='CASCADE'))

db.define_table('group_assoc',
                Field('first_group_id', 'reference auth_group', ondelete='CASCADE'),
                Field('second_group_id', 'reference auth_group', ondelete='CASCADE'))

db.define_table('user_log',
                Field('user_id', 'reference auth_user'),
                Field('created', 'datetime'),
                Field('msg', 'text'),
                Field('table_name', 'string'),
                Field('record_id', 'integer'))

db.define_table('tag',
                Field('name', 'string', length=255, unique=True))

db.define_table('group_tag',
                Field('group_id', 'reference auth_group'),
                Field('tag_id', 'reference tag'))

db.define_table('tag_ref',
                Field('tag_id', 'reference tag'),
                Field('table_name', 'string'),
                Field('record_id', 'integer'))


db.commit()
