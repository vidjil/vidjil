from api_vidjil import *
from collections import defaultdict


TAGS = []
TAGS_UNDEFINED = []

### Public database server behind app.vidjil.org
SERVER = "https://db.vidjil.org/vidjil"
CERTIFICATE = ""

### Local server (see doc/server.md)
# SERVER = "https://localhost/vidjil/"
# CERTIFICATE = "localhost-chain.pem"


if  __name__ =='__main__':

    """A set of example to use vidjil API """

    ### Login to a Vidjil server
    vidjil = Vidjil(SERVER, ssl=CERTIFICATE)
    vidjil.login("demo@vidjil.org", "demo")

    ### Define a set of id and config
    sample_set_id = 25736  # Demo lil L3
    config_id     = 2      # multi+inc+xxx
    
    
    ### Get a set from server by is id and set type
    set25736 = vidjil.getSamplesetById(sample_set_id, "patient")
    print( set25736 )

    ### Get status of sample of this set
    status        = vidjil.launchAnalysisOnSet(sample_set_id, config_id)
    print( status)
 
    ### Same as previous, but on a list of sets
    status        = vidjil.launchAnalysisBunchesSet(list_sets = [25736,  3296], config_id) # Lil-L3 et Lil-L4
    print( status)


    ### From API, you could create patient, run or generic set.
    # Some parameters are mandatory
    # WARNING: These sets will be created on the server. Don't spam your server
    vidjil.createPatient("Jane", "Austen", info="Patient from Winchester hospital, #LAL-B")
    vidjil.createRun("Run 2022-072", run_date="2022-04-01")
    vidjil.createSet("Set for API tests", info="Libraries with EuroClonality-NGS 2019 primers")


    ### Get a list of all samples sets, filter by set type (patient, run or generic), or a given filter value (see example under)
    # All sets information will be stored under query field

    samples = vidjil.getAllSampleset(set_type="patient")
    print( "Len without filter: %s" % len(samples["query"]) )

    # If needed, you can also set a filter value that will be searched into various field of sets (name, info, ...)
    samples = vidjil.getAllSampleset(set_type="patient", filter_val="#API_PATIENT")



    # ################################
    # #### More complex examples
    # ################################
    


    ###################################################################
    ### Example 1: download results from a set for a configuration id.
    path_out = "output_dir/" # be sure to create this directory first
    

    # Get information from server about set and samples (we reuse here the set id previously created)
    sampleset = vidjil.getSamplesetById(setid_set, "generic")[0]
    samples   = vidjil.getSampleOfSet(setid_set, config_id)
    # download result file from all samples if completed
    for sample in samples["query"]:
        if sample["results_file"]["status"] == "COMPLETED":
            # compose a name as you need, here by a combinaison of ids of sets, seuqence file and config id.
            filename = path_out+"set%s_sequence%s_config%s.vidjil" % (sample["sample_set_membership"]["sample_set_id"], sample["sample_set_membership"]["sequence_file_id"], config_id)  
            # We also rename the sample in file, under original_names field, to reflet real original name. If don't, the field we be fill with hashed filename as store in the server.
            vidjil.download(sample["results_file"]["data_file"], filename, sample["sequence_file"]["data_file"], sample["sequence_file"]["filename"])


    ###################################################################
    ### Example 2; creating a set, upload data and launch analysis
    
    # create set to use
    set_data  = vidjil.createSet("set for upload by api")
    setid_set = set_data["args"]["id"]
    ### Create sample in recently created patient, set and run
    # set_ids filed take value in a specific format: :$set+$name+($id)
    # With :
    #   $set can be ans 's', 'p' or 'r' respectivly for generic set, patient of run
    #   $name is a part or complete name of set 
    #   $id is the id of the set 
    sample = vidjil.createSample(source="computer",
                pre_process="0",
                set_ids=":s+set_api+(%s)"%setid_set ,
                file_filename="path_to_file/file.fastq.gz",
                file_filename2="",
                file_id="",
                file_sampling_date="2016-01-13",
                file_info="Some informations and #VERY #IMPORTANT #TAG" ,
                file_set_ids="",
                sample_set_id=setid_set, # can include multiple set_ids as a concatenation of string
                sample_type="set")
    file_id  = sample["file_ids"][0]

    # Launch analysis on the created sample, with a given configuration id
    analysis = vidjil.launchAnalisysSample(setid_set, file_id, config_id)
    # TODO: how to get configuration id ?

