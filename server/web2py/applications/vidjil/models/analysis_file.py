import defs
import vidjil_utils

def get_analysis_from_sample_set(sample_set_id, *fields, **kwargs):
    '''
    Returns the data from the DB corresponding to the analysis of this sample_set.

    fields: (optional) arguments given to the select (what fields must be 
            retrieved, by default: all)
    kwargs: parameterize the select (with orderby, groupby, etc.) in the fashion of web2py
    '''
    if 'orderby' not in kwargs:
        kwargs['orderby'] = ~db.analysis_file.analyze_date
        
    return db(db.analysis_file.sample_set_id == sample_set_id).select(*fields, **kwargs)
    
def get_analysis_data(sample_set_id):
    '''
    Return an analysis file (if any, or a default file) for the given patient.
    '''
    result = get_default_analysis()
    analysis_query = get_analysis_from_sample_set(sample_set_id)
    if len(analysis_query) > 0:
        row = analysis_query.first()
        f = open(defs.DIR_RESULTS+'/'+row.analysis_file, "r")
        return get_clean_analysis(f)
    return result
        
def get_clean_analysis(filehandle):
    '''
    Take a filehandle in parameter and return a dictionary made of 
    the analysis in the correct format.
    '''
    result = get_default_analysis()
    analysis = gluon.contrib.simplejson.loads(filehandle.read())
    result = vidjil_utils.put_properties_in_dict(analysis, result, {'cluster': 'clusters', 
                                                                    'clusters': 'clusters',
                                                                    'clones': 'clones', 
                                                                    'tags': 'tags', 
                                                                    'samples': 'samples'})
    return result
    
    
def get_analysis_info(json_paths, sample_set_id):
    '''Return the information in the analysis files for the given patient
    under the provided json paths.
    '''
    analysis_file = get_analysis_from_sample_set(sample_set_id)
    results = []

    for analysis in analysis_file:
        filename=defs.DIR_RESULTS + analysis.analysis_file
        results.append(vidjil_utils.extract_fields_from_json(json_paths, None, filename))
    return results

def get_default_analysis():
    '''
    return an empty analysis file
    '''
    return {"samples": {"number": 0,
                      "original_names": [],
                      "order": [],
                      "info_sequence_file" : []
                       },
           "custom": [],
           "clusters": [],
           "clones" : [],
           "tags": {},
           "vidjil_json_version" : "2014.09"
           }
