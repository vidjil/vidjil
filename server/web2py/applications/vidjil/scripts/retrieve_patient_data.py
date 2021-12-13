from __future__ import print_function
from datetime import datetime
import sys
import tarfile
import json

if len(sys.argv) < 5 or sys.argv[1] == "-h" or sys.argv[1] == "--help" or sys.argv[1] is None:
    print("Usage: %s <user id> <filter> <config_id> <outfile>\n\nGet a JSON output of all the patients accessible by the user with the specified config." % sys.argv[0])
    exit(1)

def get_json_patient(patient, config_id):
    '''
    Takes a row from the db.patient table and outputs a JSON on the patient.
    '''
    p = {}
    p['id'] = patient.sample_set_id
    p['last_name'] = patient.last_name
    p['first_name'] = patient.first_name
    p['birth'] = str(patient.birth)
    p['info'] = patient.info

    results = db(
        (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
        & (db.sample_set_membership.sample_set_id == patient.sample_set_id)
    ).select(
        left=db.results_file.on(
            (db.results_file.sequence_file_id==db.sequence_file.id)
            & (db.results_file.config_id==str(config_id))
            & (db.results_file.hidden == False)
        ),
        orderby = db.sequence_file.id
    )

    patient_results = []
    for r in results:
        info = {
            'info': r.sequence_file.info,
            'data': r.sequence_file.data_file,
            'filename': r.sequence_file.filename,
            'date': str(r.sequence_file.sampling_date),
            'id': r.sequence_file.id,
            'results': r.results_file.data_file,
            'results_date': str(r.results_file.run_date),
            'results_id': r.results_file.id
        }
        patient_results.append(info)

    p['sequence_files'] = patient_results

    return p
    
def get_patient_filtered_data(filter, config_id):
    request.vars["type"] = defs.SET_TYPE_PATIENT
    request.vars["filter"] = filter
    execfile("applications/vidjil/controllers/sample_set.py", globals())
    results = all()

    patient_list = []

    for patient in results['query']:
        patient_list.append(get_json_patient(patient, config_id))

    return json.dumps(patient_list)
    
if __name__ == '__main__':
    auth.user = db.auth_user[int(sys.argv[1])]

    # Override the function to prevent errors
    auth.is_impersonating = lambda: False

    f = open(sys.argv[4], 'w')
    f.write(get_patient_filtered_data(sys.argv[2], int(sys.argv[3])))
    f.close()
