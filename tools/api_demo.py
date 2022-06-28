
from api_vidjil import Vidjil
import argparse
import os

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

parser = argparse.ArgumentParser(description= 'Vidjil API Demo')
parser.add_argument('--stress', '-s', action='store_true', help='Demo on public server, stress test (do not abuse)')
parser.add_argument('--public', '-p', action='store_true', help='Demo on public server')
parser.add_argument('--local',  '-l', action='store_true', help='Demo on local server (require a server)')



def demoReadFromServer(server, ssl, user, password, only_fast_tests=False):
    """Demo on the public server (only read)"""

    ### Login to a Vidjil server
    vidjil = Vidjil(server, ssl=ssl)
    vidjil.login(user, password)

    ### Define a set of id and config
    sample_set_id = 25736  # Demo lil L3
    config_id     = 25     # multi+inc+xxx

    ### Get a set from server by is id and set type
    sets_demo = vidjil.getSetById(sample_set_id, vidjil.PATIENT)
    vidjil.infoSets("Set %s" % sample_set_id, sets_demo, set_type=vidjil.PATIENT, verbose=True)
    ### Get a list of all samples sets by set type (vjdjil.PATIENT, vidjil.RUN or vidjil.SET)
    # or a given filter value (see example under)
    sets_all = vidjil.getSets(set_type=vidjil.PATIENT)
    
    # The data is under samples["query"]
    vidjil.infoSets("getSets(vidjil.PATIENT)", sets_all["query"], set_type=vidjil.PATIENT)

    # You can also set a filter value that will be searched into various field of sets (name, info, ...)
    filter = "LIL-L3"
    sets_filtered = vidjil.getSets(set_type=vidjil.PATIENT, filter_val=filter)
    vidjil.infoSets('getSets(vidjil.PATIENT, "%s")' % filter, sets_filtered["query"], set_type=vidjil.PATIENT)

    ###################################################################
    ### Example 1: download results from a set for a configuration id.

    os.system('mkdir -p %s' % DOWNLOAD_PATH)
    
    # Get information from server about set and samples (we reuse here the set id of Demo Lil L3)
    # sampleset = vidjil.getSetById(sample_set_id, vidjil.PATIENT)
    # vidjil.# infoSets("Set %s" % sample_set_id, sampleset["query"])

    samples   = vidjil.getSamplesOfSet(sample_set_id, config_id)
    vidjil.infoSamples("getSamplesOfSet(%s, %d)" % (sample_set_id, config_id), samples)

    if only_fast_tests:
        return

    # download result file from the first two samples if completed
    for sample in samples["query"][:2]:
        if sample["results_file"]["status"] == vidjil.COMPLETED:
            # compose a name as you need
            filename = DOWNLOAD_PATH + "set%s_sequence%s_config%s.vidjil" % (sample["sample_set_membership"]["sample_set_id"],
                                                                             sample["sample_set_membership"]["sequence_file_id"],
                                                                             config_id)
            # download the file to 'filename', while properly handling 'original_names' field in the .vidjil
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
    vidjil = Vidjil(server, ssl=ssl)
    vidjil.login(user, password)

    # Create patient/run/set
    patient_data = vidjil.createPatient("Jane", "Austen",
                         info="Patient from Winchester hospital, #LAL-B")
    run_data = vidjil.createRun("Run 2022-072",
                     run_date="2022-04-01")

    set_data = vidjil.createSet("Set for API tests",
                                info="Libraries with EuroClonality-NGS 2019 primers")


    setid_patient = patient_data["args"]["id"]
    setid_run = run_data["args"]["id"]
    setid_generic = set_data["args"]["id"]

    print( "==> new set patient: %s" % setid_patient)
    print( "==> new set run: %s" % setid_run)
    print( "==> new set generic: %s" % setid_generic)

    # Show newly created set
    set_new = vidjil.getSetById(setid_generic, vidjil.SET)
    vidjil.infoSets("Set %s" % setid_generic, set_new, vidjil.SET, verbose=True)
    samples   = vidjil.getSamplesOfSet(setid_generic)
    vidjil.infoSamples("getSamplesOfSet(%s)" % setid_generic, samples)

    # set_ids filed take value in a specific format: ':$set+($id)'
    # Multiple field should be separated with a '|' as above
    # With :
    #   $set can be 's' (generic set), 'p' (patient), or 'r' (run)
    #   $id is the id of the set 
    sample = vidjil.createSample(source="computer",
                pre_process= "0",
                set_ids= ":s+(%s)|:r+(%s)|:p+(%s)" % (setid_patient, setid_run, setid_generic),
                file_filename= "../demo/Demo-X5.fa",
                file_filename2= "",
                file_id= "",
                file_sampling_date= "2016-01-13",
                file_info= "Uploaded by API" ,
                file_set_ids= "",
                sample_set_id= setid_generic,
                sample_type= "set")

    file_id  = sample["file_ids"][0]  ## Uploaded file
    print( "==> new file %s" % file_id)

    # Show again the set, now with one sample
    samples  = vidjil.getSamplesOfSet(setid_generic)
    vidjil.infoSamples("getSamplesOfSet(%s)" % setid_generic, samples)

    ### Get status of sample of this set
    config_id = 2 ## multi+inc+xxx
    analysis  = vidjil.launchAnalysisOnSample(setid_generic, file_id, config_id)
    print("Launch analysis: %s" % analysis)


if  __name__ =='__main__':
    """Examples using Vidjil API"""

    args = parser.parse_args()

    if not args.public and not args.local:
        parser.print_help()

    if args.stress:
        failures = 0
        total = 20
        for i in range(total):
            try:
                demoReadFromServer(PUBLIC_SERVER, PUBLIC_SSL, PUBLIC_USER, PUBLIC_PASSWORD,
                                   only_fast_tests = True)
            except Exception:
                failures += 1
        print('==> %s/%s failures' % (failures, total))

    if args.public:
        demoReadFromServer(PUBLIC_SERVER, PUBLIC_SSL, PUBLIC_USER, PUBLIC_PASSWORD)

    if args.local:
        demoWriteRunOnServer(LOCAL_SERVER, LOCAL_SSL, LOCAL_USER, LOCAL_PASSWORD)