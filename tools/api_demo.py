from api_vidjil import *
from collections import defaultdict


TAGS = []
TAGS_UNDEFINED = []
url  = "https://localhost/vidjil/"
certificat="localhost-chain.pem"


################################
### More functions for stats use
# Can be rewritten if need for your own usage
################################
def generateCatFromData(data, fileout, name_to_use="sequence_name"):
    '''
    Take extraction data to generate clean cateories file from tags
    Data save under file for stats usage
    '''
    formated = {}
    for sampleset in data:
        dico = {"birth" : sampleset["birth"] if not 'None' else ""}
        dico = addCatsFromTags(dico, sampleset["tags"])
        for sample in sampleset["samples"]:
            new_dico = {}
            for key in dico.keys():
                new_dico[key] = dico[key]
            new_dico = addCatsFromTags(new_dico, sample["tags"])
            name = sample[name_to_use]
            for pattern in [".fasta", ".fastq.gz", ".fastq"]:
                name = name.replace(pattern, "")
            formated[name] = new_dico
    print( formated )
    open(fileout, 'w').write(json.dumps(formated))
    return formated


def defineTag(tag):
    '''
    Give a categories for some already known tag value (disease, primerset, ...)
    '''
    if tag in ["diag", "follow-up", "followup", "relapse"]:
        return "analyse"
    elif tag in ["LAL", "LAL-T", "LAL-B", "Waldenstrom", "LAL", "health"]:
        return "disease"
    elif tag in ["illumina", "iontorrent", "pyro"]:
        return "sequencer"
    elif tag in ["biomed2", "ecngs", "inhouse"]:
        return "primers"
    else:
        return False

def addCatsFromTags(dico, tags):
    '''
    Add tags in dict; define cat and value before adding
    '''
    for tag in tags:
        if "=" in tag:
            cat, val = tag.split("=")
            print( "cat: %s, val: %s" % (cat, val))
            dico[cat] = val
        else:
            if defineTag(tag):
                dico[defineTag(tag)] = tag
            else:
                TAGS_UNDEFINED.append(tag)
    return dico




if  __name__ =='__main__':

    """A set of example to use vidjil API """


    # Define a vidjil object with at least an url and ssl certificat file
    vidjil = Vidjil(url, ssl=certificat)
    # Login to the server by giving a user email and password
    vidjil.login("plop@plop.com", "foobartest")

    ### Define a set if and config
    sample_set_id = 182
    config_id     = 2
    
    
    ### Get a set from server by is id and set type
    set182 = vidjil.getSamplesetById(sample_set_id, "patient")
    # [{
    #   'info': '', 'first_name': 'demo1_patient', 'last_name': 'demo1_patient', 'creator': 'demo', 'id': 34, 
    #   'file_count': 3, 'birth': '2022-01-20', 'sample_set_id': 182, 
    #   '_extra': {'`patient`.`first_name` AS first_name': 'demo1_patient', '`auth_user`.`last_name` AS creator': 'demo', 
    #               '`patient`.`last_name` AS last_name': 'demo1_patient', 
    #               "GROUP_CONCAT(DISTINCT (config.id || ';' || config.name || ';' || fused_file.fused_file))": '2;multi+inc+xxx;fused_file.fused_file.baba73f84c6d2d08.3030303232302d3138322e6675736564.fused', 
    #               '`patient`.`birth` AS birth': '2022-01-20', 
    #               'COUNT(DISTINCT `sequence_file`.`id`) AS file_count': 3, 
    #               'COUNT(DISTINCT sequence_file.id) * SUM(sequence_file.size_file) / COUNT(*)': 1032203049.0, '`patient`.`id` AS id': 34, 
    #               'GROUP_CONCAT(DISTINCT auth_group.role)': 'user_0007', 'GROUP_CONCAT(DISTINCT config.id)': '2', 
    #               '`patient`.`info` AS info': '', '`patient`.`sample_set_id` AS sample_set_id': 182, 
    #               'GROUP_CONCAT(DISTINCT config.name)': 'multi+inc+xxx'
    #             }
    # }]
    print( set182 )

    ### Get status of sample of this set
    status        = vidjil.launchAnalysisOnSet(sample_set_id, config_id)
    # {'set_182': {'sample_231': 'COMPLETED', 'sample_232': 'COMPLETED'}}
    print( status)
 
    ### Same as previous, but on a list of sets
    status        = vidjil.launchAnalysisBunchesSet(list_sets = [180, 182], config_id)
    # {'set_180': {'sample_224': 'COMPLETED', 'sample_225': 'COMPLETED'}, 'set_182': {'sample_231': 'COMPLETED', 'sample_232': 'COMPLETED'}}
    print( status)


    ### From API, you could create patient, run or generic set.
    # Some parameters are mandatory (WARNING: These sets will be created on the server. Don't spam your server)
    vidjil.createPatient("api", "api")
    vidjil.createRun("api")
    vidjil.createSet("api")


    ### Get a list of all samples sets, filter by set type (patient, run or generic), or a given filter value (see example under)
    # All set will be stored under query field
    samples = vidjil.getAllSampleset(set_type="patient")
    print( "Len without filter: %s" % len(samples["query"]) )
    # samples = vidjil.getAllSampleset(set_type="patient", filter_val="#API_PATIENT")


    # ################################
    # #### More complex examples
    # ################################
    
    ### Example 1; creating a set, upload data as describe in a CSV file and launch analysis
    # In this scenario, we have a csv file with column that can be seen as tag name, and cell as tag value. We will import them in format #tag=value
    # For each line, we got a column with filename without extension that we had in a second time.

    import csv
    # path of csv and sequences files
    path       = "/home/florian/vidjil_toolkit/publi_vaccination/"
    table_name = "SraRunTable.csv" # CSV file
    # store content of csv 
    list_row   = [] 
    with open(path+table_name, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        # print( reader.fieldnames )
        for row in reader:
            list_row.append(row)


    # Some columns to extract value that will be give as tags at sample creation
    list_tags = ['Age', 'Biomaterial_provider', 'BioProject', 'Cell_type']

    # create set to use
    set_data      = vidjil.createSet("set for upload by api")
    setid_set     = set_data["args"]["id"]

    # create samplessamples, upload data and launch an analysis
    for row in list_row:
        # For each row, will created a set of tags in #name=value format
        tags = ""
        for tagname in list_tags:
            tags += "#%s=%s+" % (tagname.replace(" ", "_"), row[tagname].replace(" ", "_")) 
        print( tags)

        # reconstruct path of file from sample name; control if this file exist before creating sample
        # In this case, don't raise error but just pass
        if not os.path.isfile(path+row["Run"]+".fastq.gz"):
            print( "file don't exist: %s/%s.fastq.gz" % (path, row["Run"]))
            continue

        ### Create sample in recently created patient, set and run
        # All fields can be setted
        sample = vidjil.createSample(source="computer",
                    pre_process="0",
                    set_ids=":s+set_api+(%s)"%setid_set ,
                    file_filename=path+row["Run"]+".fastq.gz",
                    file_filename2="",
                    file_id="",
                    file_sampling_date="2016-01-13",
                    file_info=tags,
                    file_set_ids="",
                    sample_set_id=setid_set,
                    sample_type="set")
        file_id  = sample["file_ids"][0]

        # Launch analysis on the created sample, with a given configuration id
        # TODO: how to get configuration id ?
        analysis = vidjil.launchAnalisysSample(setid_set, file_id, "2")




    ### Example 2: download results from a set for a configuration id.
    # Store information of tag for all sample and create a file with all tags for appstats usage

    listall  = []
    listtodo = [168] # a list of sets 
    path_out = "stats_publi_vaccine/"
    for setid in listtodo:
        config_id     = 2
        sampleset = vidjil.getSamplesetById(setid, "generic")[0]
        print( sampleset )
        # reformat data
        samplesetdata = { "id": sampleset["sample_set_id"], "setname": sampleset["name"], "info": sampleset["info"], "tags":extractTags(sampleset["info"]), "samples": []}
        print( samplesetdata )
        samples   = vidjil.getSampleOfSet(setid, config_id)
        print( samples.keys() )

        # For each sample, get informations, store it in dico and download result file
        for sample in samples["query"]:
            sequence_file_id = sample["sequence_file"]["id"]
            result = sample["results_file"]
            print( "setid: %s; config_id: %s; sequence_file_id: %s; results status: '%s'" % (setid, config_id, sequence_file_id, result["status"]))
            dico = {
                "sequence_id":   sample["sample_set_membership"]["sequence_file_id"], 
                "sequence_name": sample["sequence_file"]["data_file"], 
                "original_name": sample["sequence_file"]["filename"], 
                "sample_set_id": sample["sample_set_membership"]["sample_set_id"], 
                "result_status": sample["results_file"]["status"],
                "result_file":   sample["results_file"]["data_file"],
                "result_config": sample["results_file"]["config_id"],
                "sample_info":   sample["sequence_file"]["info"],
                "tags":          extractTags(sample["sequence_file"]["info"])
            }
            samplesetdata["samples"].append( dico)
            # download result file if completed
            # we create a name for the file to export.
            # We also rename the sample in file, under original_names field, to reflet real original name. If don't, the field we be fill with hashed filename as store in the server.
            if dico["result_status"] == "COMPLETED":
                filename = path_out+"set%s_sequence%s_config%s.vidjil" % (samplesetdata["id"], dico["sequence_id"], dico["result_config"])  
                vidjil.download(dico["result_file"], filename, dico["sequence_name"], dico["original_name"])
        
        listall.append( samplesetdata )
        # print( listall )

    # Use prewriten function to create a appstats file 
    generateCatFromData( listall, path_out+"stats_vaccine_cats.json", name_to_use="original_name" )

