from collections import defaultdict
import vidjil_utils

class SampleSets:
    '''
    The SampleSets class represent many sample sets, possibly with different types.
    This class allows to recover information on sample sets more efficiently than
    by retrieving information for each sample set separately.
    '''

    ids = []
    sample_types = set()        # All the sample typs we have in our IDs
    sample_sets = []

    def __init__(self, ids):
        '''
        Build a class for the given sample set IDs
        '''
        
        self.ids = ids
        self.sample_sets = db(db.sample_set.id.belongs(ids)).select(db.sample_set.sample_type, db.sample_set.id)
        self.sample_types = set([s.sample_type for s in self.sample_sets])

    def get_names(self):
        '''Returns the names of all the sample sets.

        The function returns a dictionary whose keys are sample set
        IDs and value is the name.

        The number of queries is constant (which is true only if
        permissions have been cached: anon_ids checks for permission)
        '''

        results = {}

        for stype in self.sample_types:
            stype_ids = self.get_sample_type_ids(stype)
            if stype == defs.SET_TYPE_PATIENT:
                patient_ids = db(db[stype].sample_set_id.belongs(stype_ids)).select(db[stype].id, db[stype].sample_set_id)
                names = vidjil_utils.anon_ids([p.id for p in patient_ids])
                for i, p_id in enumerate(patient_ids):
                    results[p_id.sample_set_id] = names[i]
            else:
                set_names = db(db[stype].sample_set_id.belongs(stype_ids)).select(db[stype].sample_set_id, db[stype].name)
                for s in set_names:
                    results[s.sample_set_id] = s.name

        return results

    def get_sample_type_ids(self, sample_type):
        '''
        Return a list of all the sample set IDs corresponding to this sample type.

        Performs no query on the database
        '''
        return [s.id for s in self.sample_sets if s.sample_type == sample_type]


    def get_tag_names(self):
        '''Returns the name of the tags associated with all the sample sets.

        The function returns a dictionary whose keys are sample set
        IDs and values are a list of tag names.

        The number of queries is constant.
        '''
        # Getting tags
        results = defaultdict(list)

        for stype in self.sample_types:
            stype_ids = self.get_sample_type_ids(stype)
            tags = db((db[stype].sample_set_id.belongs(stype_ids))
                  & (db.tag_ref.record_id == db[stype].id) 
                  & (db.tag_ref.table_name == stype) 
                  & (db.tag_ref.tag_id == db.tag.id))\
            .select(db.tag.name, db[stype].sample_set_id)
        
            for t in tags:
                results[t[stype].sample_set_id].append(t.tag.name)

        return results
        
        
