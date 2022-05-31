from api_vidjil import *
from collections import defaultdict


TAGS = []
TAGS_UNDEFINED = []

DOWNLOAD_PATH = "download/"

### Public database server behind app.vidjil.org
PUBLIC_SERVER = "https://db.vidjil.org/vidjil"
PUBLIC_SSL = ""
PUBLIC_USER = "demo@vidjil.org"
PUBLIC_PASSWORD = "demo"

### Local server (see doc/server.md)
LOCAL_SERVER = "https://localhost/vidjil/"
LOCAL_SSL = "localhost-chain.pem"
LOCAL_USER = "demo@vidjil.org"
LOCAL_PASSWORD = "demo"

def demoReadFromServer(server, ssl, user, password):
    """Demo on the public server (only read)"""

    ### Login to a Vidjil server
    vidjil = Vidjil(server, ssl=ssl)
    vidjil.login(user, password)

    ### Define a set of id and config
    sample_set_id = 25736  # Demo lil L3
 
    ### Get a set from server by is id and set type
    demo_set = vidjil.getSamplesetById(sample_set_id, vidjil.PATIENT)
    print(demo_set)

    ### Get a list of all samples sets by set type (vjdjil.PATIENT, vidjil.RUN or vidjil.SET)
    # or a given filter value (see example under)
    samples = vidjil.getAllSampleset(set_type=vidjil.PATIENT)
    
    # The data is under samples["query"]
    print("Patients: %s" % len(samples["query"]) )
    print(samples)

    # You can also set a filter value that will be searched into various field of sets (name, info, ...)
    samples = vidjil.getAllSampleset(set_type=vidjil.PATIENT, filter_val="#API_PATIENT")
    print("Result: %s" % len(samples["query"]) )

    ### Launch analyses
    # config_id = 2
    # status = vidjil.launchAnalysisBunchesSet(list_sets = [25736, 3296], config_id) # Lil-L3 et Lil-L4
    # print(status)

    ###################################################################
    ### Example 1: download results from a set for a configuration id.
    path_out = "output/" # be sure to create this directory first

    os.system('mkdir -p %s' % DOWNLOAD_PATH)
    
    # Get information from server about set and samples (we reuse here the set id previously created)
    sampleset = vidjil.getSamplesetById(setid_set, vidjil.SET)[0]
    samples   = vidjil.getSampleOfSet(setid_set, config_id)
    # download result file from all samples if completed
    for sample in samples["query"]:
        if sample["results_file"]["status"] == vidjil.COMPLETED:
            # compose a name as you need, here by a combinaison of ids of sets, seuqence file and config id.
            filename = DOWNLOAD_PATH + "set%s_sequence%s_config%s.vidjil" % (sample["sample_set_membership"]["sample_set_id"],
                                                                             sample["sample_set_membership"]["sequence_file_id"],
                                                                             config_id)
            # We also rename the sample in file, under original_names field, to reflet real original name.
            # If don't, the field we be fill with hashed filename as store in the server.
            vidjil.download(sample["results_file"]["data_file"],
                            filename,
                            sample["sequence_file"]["data_file"],
                            sample["sequence_file"]["filename"])




def demoWriteRunOnServer(server, ssl, user, password):
    """
    This demo requires a server/login with write access.
    It creates patients/set/runs, upload data, and run analysis.
    Do not spam a production server!
    """

    # Login
    vidjil = Vidjil(server, ssl)
    vidjil.login(user, password)

    # Create patient/run/set
    vidjil.createPatient("Jane", "Austen", info="Patient from Winchester hospital, #LAL-B")
    vidjil.createRun("Run 2022-072", run_date="2022-04-01")
    set_data = vidjil.createSet("Set for API tests", info="Libraries with EuroClonality-NGS 2019 primers")
    setid_set = set_data["args"]["id"]

    # set_ids filed take value in a specific format: :$set+$name+($id)
    # With :
    #   $set can be ans 's', 'p' or 'r' respectivly for generic set, patient of run
    #   $name is a part or complete name of set 
    #   $id is the id of the set 
    sample = vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":s+set_api+(%s)" % setid_set ,
                file_filename= "path_to_file/file.fastq.gz",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Diagnosis #ALL" ,
                file_set_ids= "",
                sample_set_id= setid_set, # can include multiple set_ids as a concatenation of string
                sample_type= "set")

    file_id  = sample["file_ids"][0]  ## Uploaded file
    config_id = 2 ## multi+inc+xxx

    ### Get status of sample of this set
    analysis = vidjil.launchAnalysisSample(setid_set, file_id, config_id)
    print(analysis)





if  __name__ =='__main__':

    """Examples using Vidjil API """
    demoReadFromServer(PUBLIC_SERVER, PUBLIC_SSL, PUBLIC_USER, PUBLIC_PASSWORD)
    demoWriteRunOnServer(LOCAL_SERVER, LOCAL_SSL, LOCAL_USER, LOCAL_PASSWORD)