# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time

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

## return patient list
def index():
    start = time.time()
    if not auth.user : 
        res = {"redirect" : URL('default', 'user', args='login', scheme=True, host=True,
                            vars=dict(_next=URL('patient', 'index', scheme=True, host=True)))
            }
        
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    
    isAdmin = auth.is_admin()
    
    ##retrieve patient list 
    query = db(
        auth.accessible_query('read', db.patient)
    ).select(
        db.patient.ALL,
        orderby = ~db.patient.id
    )
    result = {}
    
    for i, row in enumerate(query) :
        result[row.id] = {
            "id" :int(row.id),
            "sample_set_id" : int(row.sample_set_id),
            "last_name" : row.last_name,
            "first_name" : row.first_name,
            "has_permission" : False,
            "anon_allowed": False,
            "birth" : row.birth,
            "info" : row.info,
            "creator" : row.creator,
            "confs" : "",
            "conf_list" : [],
            "conf_id_list" : [-1],
            "most_used_conf" : "",
            "groups" : "",
            "group_list" : [],
            "file_count" : 0,
            "size" : 0
        }
        
    keys = result.keys() 
    
    query = db(
        (db.auth_permission.name == "admin") & 
        (db.auth_permission.table_name == "patient") &
        (db.patient.id == db.auth_permission.record_id ) &
        (auth.user_group() == db.auth_permission.group_id )
    ).select(
        db.patient.ALL, db.auth_permission.ALL
    )

    for i, row in enumerate(query) :
        if row.patient.id in keys :
            result[row.patient.id]['has_permission'] = True
            
    query1 = db(
        db.patient.creator == db.auth_user.id
    ).select(
        db.patient.id, db.auth_user.last_name
    )
    for i, row in enumerate(query1) :
        if row.patient.id in keys :
            result[row.patient.id]['creator'] = row.auth_user.last_name
       
    query2 = db(
        (db.patient.sample_set_id == db.sample_set.id)
        &(db.sample_set_membership.sample_set_id == db.sample_set.id)
        &(db.sequence_file.id == db.sample_set_membership.sequence_file_id)
    ).select(
        db.patient.id, db.sequence_file.size_file
    )
    for i, row in enumerate(query2) :
        if row.patient.id in keys :
            result[row.patient.id]['file_count'] += 1
            result[row.patient.id]['size'] += row.sequence_file.size_file
    
    query3 = db(
        (db.patient.sample_set_id == db.fused_file.sample_set_id) &
        (db.fused_file.config_id == db.config.id) &
        (auth.accessible_query('read', db.config) | auth.accessible_query('admin', db.config) )
    ).select(
        db.patient.id, db.config.name, db.config.id, db.fused_file.fused_file
    )
    for i, row in enumerate(query3) :
        if row.patient.id in keys :
            result[row.patient.id]['conf_list'].append({'id': row.config.id, 'name': row.config.name, 'fused_file': row.fused_file.fused_file})
            #result[row.patient.id]['conf_list'].append(row.config.name)
            result[row.patient.id]['conf_id_list'].append(row.config.id)
    
    query4 = db(
        ((db.patient.id == db.auth_permission.record_id) | (db.auth_permission.record_id == 0)) &
        (db.auth_permission.table_name == 'patient') &
        (db.auth_permission.name == 'read') &
        (db.auth_group.id == db.auth_permission.group_id)
    ).select(
        db.patient.id, db.auth_group.role
    )
    for i, row in enumerate(query4) :
        if row.patient.id in keys :
            result[row.patient.id]['group_list'].append(row.auth_group.role.replace('user_','u'))

    query5 = db(
        (db.auth_permission.name == "anon") &
        (db.auth_permission.table_name == "patient") &
        (db.patient.id == db.auth_permission.record_id ) &
        (db.auth_group.id == db.auth_permission.group_id ) &
        (db.auth_membership.user_id == auth.user_id) &
        (db.auth_membership.group_id == db.auth_group.id)
    ).select(
        db.patient.id
    )
    for i, row in enumerate(query5) :
        if row.id in keys :
            result[row.id]['anon_allowed'] = True
        
    for key, row in result.iteritems():
        row['most_used_conf'] = max(set(row['conf_id_list']), key=row['conf_id_list'].count)
        #row['confs'] = ", ".join(list(set(row['conf_list']))) 
        row['groups'] = ", ".join(filter(lambda g: g != 'admin', set(row['group_list'])))
        
    result = result.values()

    ##sort result
    reverse = False
    if request.vars["reverse"] == "true" :
        reverse = True
    if request.vars["sort"] == "configs" :
        result = sorted(result, key = lambda row : row['confs'], reverse=reverse)
    elif request.vars["sort"] == "groups" :
        result = sorted(result, key = lambda row : row['groups'], reverse=reverse)
    elif request.vars["sort"] == "files" :
        result = sorted(result, key = lambda row : row['file_count'], reverse=reverse)
    elif "sort" in request.vars:
        result = sorted(result, key = lambda row : row[request.vars["sort"]], reverse=reverse)
    else:
        result = sorted(result, key = lambda row : row['id'], reverse=not reverse)

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""

    for row in result :
        row['string'] = [row['last_name'], row['first_name'], row['confs'], row['groups'], str(row['birth']), str(row['info'])]
    result = filter(lambda row : vidjil_utils.advanced_filter(row['string'],request.vars["filter"]), result )
    log.debug("patient list (%.3fs) %s" % (time.time()-start, request.vars["filter"]))
    return dict(query = result,
                isAdmin = isAdmin,
                reverse = reverse)



## return form to create new patient
def add(): 
    if (auth.can_create_patient()):
        return dict(message=T('add patient'))
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
            id_sample_set = db.sample_set.insert(sample_type="patient")
            
            id = db.patient.insert(first_name=request.vars["first_name"],
                                   last_name=request.vars["last_name"],
                                   sample_set_id=id_sample_set,
                                   birth=request.vars["birth"],
                                   info=request.vars["info"],
                                   id_label=request.vars["id_label"],
                                   creator=auth.user_id)


            user_group = auth.user_group(auth.user.id)
            admin_group = db(db.auth_group.role=='admin').select().first().id
            
            #patient creator automaticaly has all rights 
            auth.add_permission(user_group, 'admin', db.patient, id)
            auth.add_permission(user_group, 'read', db.patient, id)
            auth.add_permission(user_group, 'anon', db.patient, id)
            
            patient_name = request.vars["first_name"] + ' ' + request.vars["last_name"]

            res = {"redirect": "sample_set/index",
                   "args" : { "id" : id_sample_set },
                   "message": patient_name + ": patient added"}
            log.info(res)

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
            db.patient[request.vars["id"]] = dict(first_name=request.vars["first_name"],
                                                   last_name=request.vars["last_name"],
                                                   birth=request.vars["birth"],
                                                   info=request.vars["info"],
                                                   id_label=request.vars["id_label"]
                                                   )

            res = {"redirect": "back",
                   "message": "%s %s (%s): patient edited" % (request.vars["first_name"], request.vars["last_name"], request.vars["id"])}
            log.info(res)
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
        log.info(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    
#
def permission(): 
    if (auth.can_modify_patient(request.vars["id"]) ):
        
        query = db( db.auth_group.role != 'admin' ).select()
        
        for row in query :
            row.owner = row.role
            if row.owner[:5] == "user_" :
                id = int(row.owner[5:])
                row.owner = db.auth_user[id].first_name + " " + db.auth_user[id].last_name 

            row.admin = False
            if db(   (db.auth_permission.name == "admin")
                  & (db.auth_permission.record_id == request.vars["id"])
                  & (db.auth_permission.group_id == row.id)
                  & (db.auth_permission.table_name == db.patient)
              ).count() > 0 :
                row.admin = True
                
            row.anon = False
            if db(   (db.auth_permission.name == "anon")
                  & (db.auth_permission.record_id == request.vars["id"])
                  & (db.auth_permission.group_id == row.id)
                  & (db.auth_permission.table_name == db.patient)
              ).count() > 0 :
                row.anon = True
                
            row.read = False
            if db(   (db.auth_permission.name == "read")
                  & (db.auth_permission.record_id == request.vars["id"])
                  & (db.auth_permission.group_id == row.id)
                  & (db.auth_permission.table_name == db.patient)
              ).count() > 0 :
                row.read = True
        
        return dict(query=query)
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#
def change_permission():
    if (auth.can_modify_patient(request.vars["patient_id"]) ):
        error = ""
        if request.vars["group_id"] == "" :
            error += "missing group_id, "
        if request.vars["patient_id"] == "" :
            error += "missing patient_id, "
        if request.vars["permission"] == "" :
            error += "missing permission, "

        if error=="":
            if db(   (db.auth_permission.name == request.vars["permission"])
                      & (db.auth_permission.record_id == request.vars["patient_id"])
                      & (db.auth_permission.group_id == request.vars["group_id"])
                      & (db.auth_permission.table_name == db.patient)
                  ).count() > 0 :
                auth.del_permission(request.vars["group_id"], request.vars["permission"], db.patient, request.vars["patient_id"])
                res = {"message" : "access '%s' deleted to '%s'" % (request.vars["permission"], db.auth_group[request.vars["group_id"]].role)}
            else :
                auth.add_permission(request.vars["group_id"], request.vars["permission"], db.patient, request.vars["patient_id"])
                res = {"message" : "access '%s' granted to '%s'" % (request.vars["permission"], db.auth_group[request.vars["group_id"]].role)}
            
            log.info(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        else :
            res = {"message": "incomplete request : "+error }
            log.error(res)
            return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
