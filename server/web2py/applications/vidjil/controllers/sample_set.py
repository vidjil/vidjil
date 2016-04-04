# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400

ACCESS_DENIED = "access denied"




#
#
def next_sample_set():
    '''
    Process request, possibly changing request.vars['id'] depending on request.vars['next']
    '''
    if 'next' in request.vars:
        try:
            sample_type = db.sample_set[request.vars["id"]].sample_type
            
            for row in db( db[sample_type].sample_set_id == request.vars["id"] ).select() :
                current_id = row.id
            
            go_next = int(request.vars['next'])
            if go_next > 0:
                res = db((db[sample_type].id > current_id) & (auth.accessible_query('read', db[sample_type]))).select(
                    db[sample_type].id, db[sample_type].sample_set_id, orderby=db[sample_type].id, limitby=(0,1))
            else:
                res = db((db[sample_type].id < current_id) & (auth.accessible_query('read', db[sample_type]))).select(
                    db[sample_type].id, db[sample_type].sample_set_id, orderby=~db[sample_type].id, limitby=(0,1))
            if (len(res) > 0):
                request.vars["id"] = str(res[0].sample_set_id)
        except:
            pass

# return name to associate with the sample_set
# patient name if it's a patient sample set
# run name if it's run sample_set
def info(sample_set_id):
    sample_type = db.sample_set[request.vars["id"]].sample_type
    
    
    if sample_type == "patient" : 
        patient = db((db.patient.sample_set_id == request.vars["id"])).select()[0]
        name = vidjil_utils.anon_names(patient.id, patient.first_name, patient.last_name)
        return dict(name = name,
                    filename = name,
                    label = patient.id_label + " (" + str(patient.birth) + ")",
                    info = patient.info
                    )
    
    
    if sample_type == "run" : 
        run = db((db.run.sample_set_id == request.vars["id"])).select()[0]
        return dict(name = "run : " + run.name + " (" + str(run.run_date) + ")",
                    filename = "run : " + run.name + "_" + str(run.run_date),
                    label = run.id_label + " (" + str(run.run_date) + ")",
                    info = run.info
                    )
    
    return dict(name = "sample_set : " +db.sample_set[request.vars["id"]].sample_type,
                filename = "sample_set_" + request.vars["id"],
                label = "",
                info = ""
                )

## return patient file list
##
def index():

    next_sample_set()
    sample_set_id = request.vars["id"]

    if request.vars["config_id"] and request.vars["config_id"] != "-1" and request.vars["config_id"] != "None":
        config_id = long(request.vars["config_id"])
        config_name = db.config[request.vars["config_id"]].name

        fused = db(
            (db.fused_file.sample_set_id == sample_set_id)
            & (db.fused_file.config_id == config_id)
        )

        analysis = db(
            db.analysis_file.sample_set_id == sample_set_id
        ).select(orderby=~db.analysis_file.analyze_date)
        
        
        config = True
        info_file = info(request.vars["id"])
        fused_count = fused.count()
        fused_file = fused.select()
        fused_filename = info_file["filename"] +"_"+ config_name + ".data"
        analysis_count = len(analysis)
        analysis_file = analysis
        analysis_filename = info_file["filename"]+"_"+ config_name + ".analysis"
        
    else:
        config_id = -1
        config = False
        info_file = info(request.vars["id"])
        fused_count = 0
        fused_file = ""
        fused_filename = ""
        analysis_count = 0
        analysis_file = ""
        analysis_filename = ""

    if config :
	query =[]
	
        query2 = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id) )
                ), 
                orderby = db.sequence_file.id|~db.results_file.run_date
            )
        
	previous=-1
	for row in query2 :
	    if row.sequence_file.id != previous : 
		query.append(row)
		previous=row.sequence_file.id

    else:

        query = db(
                (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.sample_set_membership.sample_set_id == sample_set_id)
            ).select(
                left=db.results_file.on(
                    (db.results_file.sequence_file_id==db.sequence_file.id)
                    & (db.results_file.config_id==str(config_id) )
                )
            )

    query_pre_process = db( db.pre_process.id >0 ).select()
    pre_process_list = {}
    for row in query_pre_process:
        pre_process_list[row.id] = row.name
    
    log.debug('sample_set (%s)' % request.vars["id"])
    #if (auth.can_view_patient(request.vars["id"]) ):
    return dict(query=query,
                pre_process_list=pre_process_list,
                config_id=config_id,
                info=info_file,
                can_modify=auth.can_modify_sample_set(sample_set_id),
                can_upload=auth.can_upload_file(),
                fused_count=fused_count,
                fused_file=fused_file,
                fused_filename=fused_filename,
                analysis_count=analysis_count,
                analysis_file = analysis_file,
                analysis_filename = analysis_filename,
                config=config)
    
    """
    else :
        res = {"message": ACCESS_DENIED}
        log.error(res)
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
    """

def edit():
    sample_type = db.sample_set[request.vars["id"]].sample_type
    
    if sample_type == "patient" : 
        patient = db((db.patient.sample_set_id == request.vars["id"])).select()[0]
        redirect(URL('patient', 'edit', vars=dict(id=patient.id)), headers=response.headers)
    
    if sample_type == "run" : 
        run = db((db.run.sample_set_id == request.vars["id"])).select()[0]
        redirect(URL('run', 'edit', vars=dict(id=run.id)), headers=response.headers)

        

def custom():
    start = time.time()

    if request.vars["config_id"] and request.vars["config_id"] != "-1" :
        config_id = long(request.vars["config_id"])
        config_name = db.config[request.vars["config_id"]].name
        config = True
        
    else:
        request.vars["config_id"] = -1
        config_id = -1
        config_name = None
        config = False
        
    if "custom_list" not in request.vars :
        request.vars["custom_list"] = []
    if type(request.vars["custom_list"]) is str :
        request.vars["custom_list"] = [request.vars["custom_list"]]
        
    myGroupBy = None
    if request.vars["id"] and auth.can_view_sample_set(request.vars["id"]):
        q = ((auth.accessible_query('read', db.config)) 
                & (db.sample_set.id == request.vars["id"])
                & (db.sample_set.id == db.patient.sample_set_id)
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.results_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.data_file != '')
                & (db.config.id==db.results_file.config_id)
            )
        
    else:
        q = ((auth.accessible_query('read', db.patient)) 
                & (auth.accessible_query('read', db.config)) 
                & (db.sample_set.id == db.patient.sample_set_id)
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sequence_file.id == db.sample_set_membership.sequence_file_id)
                & (db.results_file.sequence_file_id==db.sequence_file.id)
                & (db.results_file.data_file != '')
                & (db.config.id==db.results_file.config_id)
            )
        myGroupBy = db.sequence_file.id|db.results_file.config_id

    query = db(q).select(
                db.patient.id, db.patient.info, db.patient.first_name, db.patient.last_name, db.results_file.id, db.results_file.config_id, db.sequence_file.sampling_date,
                db.sequence_file.pcr, db.config.name, db.results_file.run_date, db.results_file.data_file, db.sequence_file.filename,
                db.sequence_file.data_file, db.sequence_file.id, db.sequence_file.info,
                db.sequence_file.size_file,
                orderby = ~db.patient.id|db.sequence_file.id|db.results_file.run_date,
                groupby = myGroupBy
            )

    ##filter
    if "filter" not in request.vars :
        request.vars["filter"] = ""
        
    for row in query :
        row.checked = False
        if (str(row.results_file.id) in request.vars["custom_list"]) :
            row.checked = True

        row.names = vidjil_utils.anon_names(row.patient.id, row.patient.first_name, row.patient.last_name)
        row.string = [row.names, row.sequence_file.filename, str(row.sequence_file.sampling_date), str(row.sequence_file.pcr), str(row.config.name), str(row.results_file.run_date), row.patient.info]
    query = query.find(lambda row : ( vidjil_utils.advanced_filter(row.string,request.vars["filter"]) or row.checked) )

    
    if config :
        query = query.find(lambda row : ( row.results_file.config_id==config_id or (str(row.results_file.id) in request.vars["custom_list"])) )
    
    log.debug("sample_set/custom (%.3fs) %s" % (time.time()-start, request.vars["filter"]))

    return dict(query=query,
                config_id=config_id,
                config=config)
