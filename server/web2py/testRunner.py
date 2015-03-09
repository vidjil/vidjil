#!/usr/bin/python
"""
Runs all tests that exist in the tests directories.

The class should have a name based on the file's path, like this:
FilenameDirectory -> DefaultTasksModel

for example:
applications/app/tests/controllers/default.py
is
class DefaultController(unittest.TestCase)

BEWARE that the name is NOT in plural (controllers->Controller)

Execute with:
>   python web2py.py -S appname -M -R testRunner.py



made using web2py slices (http://www.web2pyslices.com) 1392 and 1465 from 

Jon Vlachoyiannis
jon@emotionull.com

Nico de Groot
ndegroot0@gmail.com

"""



from gluon import current
import gluon
from gluon.tools import Auth
import unittest
import glob
import sys
import doctest
import os
import traceback
import shutil
from copy import copy




# create a test database by copying the original db
shutil.copy2('applications/vidjil/databases/storage.sqlite', 'applications/vidjil/databases/testing.sqlite')
test_db = DAL('sqlite://testing.sqlite')
for tablename in db.tables:  # Copy tables!
    table_copy = [copy(f) for f in db[tablename]]
    test_db.define_table(tablename, *table_copy)

db = test_db


# use a fake user
user_id = db.auth_user.insert(
    first_name='Testers',
    last_name='Inc',
    email='test@vidjil.org',
    password= db.auth_user.password.validate('1234')[0],
)
unique_group = db.auth_group.insert(role="user_"+str(user_id), description=" ")
db.auth_membership.insert(user_id=user_id, group_id=unique_group)

# with admin privilege
group_id = 1 #admin group
db.auth_membership.insert(user_id=user_id, group_id=group_id)



# add fake config
fake_config_id = db.config.insert(name="config_test_popipo",
                                    info="popapipapo",
                                    command="-plop",
                                    fuse_command="-plop",
                                    program="plop.cpp"
                                    )
# add fake patient
fake_patient_id = db.patient.insert(first_name="plop",
                                   last_name="plop",
                                   birth="1902-02-02",
                                   info="plop",
                                   id_label="plop",
                                   creator=user_id)

# and a fake file for this patient
fake_file_id = db.sequence_file.insert(sampling_date="1903-02-02",
                                    info="plop",
                                    pcr="plop",
                                    sequencer="plop",
                                    producer="plop",
                                    patient_id=fake_patient_id,
                                    filename="plop",
                                    provider=user_id)

# and a fake result for this file
stream = open("../../doc/analysis-example.vidjil", 'rb')
gluon.contrib.simplejson.loads(stream.read())
fake_result_id = db.results_file.insert(sequence_file_id = fake_file_id,
                                    config_id = fake_config_id,
                                    run_date = "2014-09-19 00:00:00",
                                    data_file = db.results_file.data_file.store(stream, "plop.data")
                                    )
                                    
stream = open("../../doc/analysis-example.vidjil", 'rb')
fake_fused_id = db.fused_file.insert(patient_id = fake_patient_id,
                                    config_id = fake_config_id,
                                    fuse_date = "2014-09-19 00:00:00",
                                    fused_file = db.fused_file.fused_file.store(stream, "plop.data")
                                    )
                                    
db.commit()


#fake log to avoid polluting log
#
'''
def _init_log2():
    import logging

    logger = logging.getLogger('vidjil') # (request.application)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter('[%(process)d] %(asctime)s %(levelname)8s - %(filename)s:%(lineno)d\t%(message)s')

        handler = logging.FileHandler('applications/vidjil/tests/vidjil-debug.log')
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(formatter)
        logger.addHandler(handler) 

        handler = logging.FileHandler('applications/vidjil/tests/vidjil.log')
        handler.setLevel(logging.INFO)
        handler.setFormatter(formatter)
        logger.addHandler(handler) 

        logger.info("Creating logger")
    return MsgUserAdapter(logger, {})

log = _init_log2()
'''




suite = unittest.TestSuite()

def showfeedback():
    exc_type, exc_value, exc_traceback = sys.exc_info()
    print '-'*60
    for line in traceback.format_exception(exc_type, exc_value,exc_traceback):
        print line[:-1]
    print '-'*60


def custom_execfile(test_file):
    try:
        sys.path.append(os.path.split(test_file)[0]) # to support imports form current folder in the testfiles
        g=copy(globals())
        execfile(test_file, g) 
    except (WindowsError,ValueError,SystemExit):
        pass # we know about the rotating logger error...
             # and SystemExit is not useful to detect
    except:
        showfeedback()
    return g

appname = 'vidjil'






# find doctests in controller
path=os.path.join('applications',appname,'controllers','*.py')
doc_test_files = glob.glob(path)
print len(doc_test_files)," controller files with possible doctests found."

# get all files with tests
test_files = glob.glob('applications/'+appname+'/tests/*/*.py')

if not len(test_files):
    raise Exception("No files found for app: " + sys.argv[2])

# Bring in all doc tests and submit them
print "Run doctests" if doc_test_files else "No doctests"
for f in  doc_test_files:
    g=custom_execfile(f)
    suite.addTest(doctest.DocFileSuite(f, globs=g,
            module_relative=False))
    
# Bring all unit tests in and their controllers/models/whatever
for test_file in test_files:
    execfile(test_file, globals())

    # Create the appropriate class name based on filename and path
    filename =  str.capitalize(test_file.split("/")[-1][:-3])
    directory =  str.capitalize(test_file.split("/")[-2][:-1])

    suite.addTest(unittest.makeSuite(globals()[filename+directory]))

unittest.TextTestRunner(verbosity=2).run(suite)