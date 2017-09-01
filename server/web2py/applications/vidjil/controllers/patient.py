# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
from tag import *
import time
import datetime

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"
STATS_READLINES = 1000 # approx. size in which the stats are searched
STATS_MAXBYTES = 500000 # approx. size in which the stats are searched
def stats():
    start = time.time()

    d = custom()

    stats_regex = [
        # found 771265 40-windows in 2620561 segments (85.4%) inside 3068713 sequences # before 1f501e13 (-> 2015.05)
        'in (?P<seg>\d+) segments \((?P<seg_ratio>.*?)\) inside (?P<reads>\d+) sequences',

        # found 10750 50-windows in 13139 reads (99.9% of 13153 reads)
        'windows in (?P<seg>\d+) reads \((?P<seg_ratio>.*?) of (?P<reads>\d+) reads\)',

        # segmentation causes
        'log.* SEG_[+].*?-> (?P<SEG_plus>.*?).n',
        'log.* SEG_[-].*?-> (?P<SEG_minus>.*?).n',
    ]

    # stats by locus
    for locus in defs.LOCUS:
        locus_regex = locus.replace('+', '[+]')
        locus_group = locus.replace('+', 'p')
        stats_regex += [ 'log.* %(locus)s.*?->\s*?(?P<%(locus_g)s_reads>\d+)\s+(?P<%(locus_g)s_av_len>[0-9.]+)\s+(?P<%(locus_g)s_clones>\d+)\s+(?P<%(locus_g)s_av_reads>[0-9.]+)\s*.n'
                         % { 'locus': locus_regex, 'locus_g': locus_group } ]

    json_paths = {
        'result_file': {
            'main_clone': '/clones[0]/name',
            'main_clone_reads': '/clones[0]/reads[0]'
        },
        'fused_file': {
                  'reads distribution [>= 10%]': 'reads/distribution/0.1',
                  'reads distribution [>= 1% < 10%]': 'reads/distribution/0.01',
                  'reads distribution [>= .01% < 1%]': 'reads/distribution/0.001',
                  'reads distribution [>= .001% < .01%]': 'reads/distribution/0.0001',
                  'reads distribution [>= .0001% < .001%]': 'reads/distribution/0.00001',
                  'producer': 'samples/producer'
        }
    }

    keys_patient = [ 'info' ]
    keys_file = [ 'sampling_date', 'size_file' ]

    keys = []
    keys += keys_file
    keys += keys_patient

    regex = []
    for sr in stats_regex:
        r = re.compile(sr)
        regex += [r]
        keys += r.groupindex.keys()

    keys += sorted(json_paths['result_file'].keys() + json_paths['fused_file'].keys())

    for row in d['query']:
        found = {}
        results_f = row.results_file.data_file
        row_result = vidjil_utils.search_first_regex_in_file(regex, defs.DIR_RESULTS + results_f, STATS_READLINES)
        try:
            row_result_json = vidjil_utils.extract_fields_from_json(json_paths['result_file'], None, defs.DIR_RESULTS + results_f, STATS_MAXBYTES)
        except:
            row_result_json = []

        fused_file = db((db.fused_file.sample_set_id == row.sample_set.id) & (db.fused_file.config_id == row.results_file.config_id)).select(orderby = ~db.fused_file.id, limitby=(0,1))
        if len(fused_file) > 0 and fused_file[0].sequence_file_list is not None:
            sequence_file_list = fused_file[0].sequence_file_list.split('_')
            try:
                pos_in_list = sequence_file_list.index(str(row.sequence_file.id))
                row_fused = vidjil_utils.extract_fields_from_json(json_paths['fused_file'], pos_in_list, defs.DIR_RESULTS + fused_file[0].fused_file, STATS_MAXBYTES)
            except ValueError:
                row_fused = []
        else:
            row_fused = {}
        results_list = [row_result, row_result_json, row_fused]
        for key in keys:
            for map_result in results_list:
                if key in map_result:
                    row[key] = map_result[key]
                    found[key] = True
            if key not in found:
                if key in keys_patient:
                    row[key] = row.patient[key]
                    found[key] = True
                elif key in keys_file:
                    row[key] = row.sequence_file[key]
                    found[key] = True
                else:
                    row[key] = ''

    # Re-process some data
    keys += ['IGH_av_clones']
    for row in d['query']:
        row['IGH_av_clones'] = ''
        if 'IGH_av_reads' in row:
            try:
                row['IGH_av_clones'] = '%.4f' % (1.0 / float(row['IGH_av_reads']))
                found['IGH_av_clones'] = True
            except:
                pass

    # Keep only non-empty columns
    d['stats'] = []
    for key in keys:
        if key in found:
            d['stats'] += [key]

    log.debug("patient/stats (%.3fs) %s" % (time.time()-start, request.vars["filter"]))
    return d

## return form to create new patient
def add(): 
    if (auth.can_create_patient()):
        creation_group_tuple =  get_default_creation_group(auth)
        groups = creation_group_tuple[0]
        max_group = creation_group_tuple[1]
        return dict(message=T('add patient'), groups=groups, master_group=max_group)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## create a patient if the html form is complete
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def add_form(): 
    if (auth.can_create_patient()):
        
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        if request.vars["birth"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"

        if error=="" :
            id_sample_set = db.sample_set.insert(sample_type=defs.SET_TYPE_PATIENT)
            
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   sample_set_id=id_sample_set,
                                   birth=request.vars["birth"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"],
                                   creator=auth.user_id)

            user_group = int(request.vars["patient_group"])
            admin_group = db(db.auth_group.role=='admin').select().first().id

            register_tags(db, defs.SET_TYPE_PATIENT, id, request.vars["info"], user_group)
            
            #patient creator automaticaly has all rights 
            auth.add_permission(user_group, PermissionEnum.access.value, db.patient, id)
            
            patient_name = request.vars["first_name"] + ' ' + request.vars["last_name"]

            res = {"redirect": "sample_set/index",
                   "args" : { "id" : id_sample_set },
                   "message": "(%s) patient %s added" % (id_sample_set, patient_name) }
            log.info(res, extra={'user_id': auth.user.id, 'record_id': id, 'table_name': 'patient'})

            if (id % 100) == 0:
                mail.send(to=defs.ADMIN_EMAILS,
                subject="[Vidjil] %d" % id,
                message="The %dth patient has just been created." % id)

            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false",
                   "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## return edit form 
def edit(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        return dict(message=T('edit patient'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))



## check edit form
## need ["first_name", "last_name", "birth_date", "info"]
## redirect to patient list if success
## return a flash error message if fail
def edit_form(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        error = ""
        if request.vars["first_name"] == "" :
            error += "first name needed, "
        if request.vars["last_name"] == "" :
            error += "last name needed, "
        if request.vars["birth"] != "" :
            try:
                datetime.datetime.strptime(""+request.vars['birth'], '%Y-%m-%d')
            except ValueError:
                error += "date (wrong format)"
        if request.vars["id"] == "" :
            error += "patient id needed, "

        if error=="" :
            patient = db.patient[request.vars["id"]]
            db.patient[request.vars["id"]] = dict(first_name=request.vars["first_name"],
                                                   last_name=request.vars["last_name"],
                                                   birth=request.vars["birth"],
                                                   info=request.vars["info"],
                                                   id_label=request.vars["id_label"]
                                                   )

            group_id = get_set_group(defs.SET_TYPE_PATIENT, request.vars["id"])
            if (patient.info != request.vars["info"]):
                register_tags(db, defs.SET_TYPE_PATIENT, request.vars["id"], request.vars["info"], group_id, reset=True)

            res = {"redirect": "back",
                   "message": "%s %s (%s): patient edited" % (request.vars["first_name"], request.vars["last_name"], request.vars["id"])}
            log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars['id'], 'table_name': 'patient'})
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        else :
            res = {"success" : "false", "message" : error}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def download():
    return response.download(request, db)


#
def confirm():
    if (auth.can_modify_patient(request.vars["id"]) ):
        log.debug('request patient deletion')
        return dict(message=T('confirm patient deletion'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#
def delete():
    if (auth.can_modify_patient(request.vars["id"]) ):
        patient = db.patient[request.vars["id"]]
        if patient is None:
            res = {"message": 'An error occured. This patient may have already been deleted'}
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

        sample_set_id = patient.sample_set_id

        #delete data file 
        query = db( (db.sample_set_membership.sample_set_id == sample_set_id)
                    & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                ).select(db.sequence_file.id) 
        for row in query :
            db(db.results_file.sequence_file_id == row.id).delete()
        
        #delete sequence file
        query = db((db.sequence_file.id == db.sample_set_membership.sequence_file_id)
            & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(db.sequence_file.id)
        for row in query :
            db(db.sequence_file.id == row.id).delete()

        #delete patient
        db(db.patient.id == request.vars["id"]).delete()
        
        #delete patient sample_set
        db(db.sample_set.id == sample_set_id).delete()

        res = {"redirect": "patient/index",
               "success": "true",
               "message": "patient ("+str(request.vars["id"])+") deleted"}
        log.info(res, extra={'user_id': auth.user.id, 'record_id': request.vars["id"], 'table_name': 'patient'})
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    


