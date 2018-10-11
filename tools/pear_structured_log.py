#!/usr/bin/env python
#-*- coding: utf-8 -*-

# ===============================
# Script by Florian Thonier
# florian@vidjil.org
# ===============================
from __future__ import division
import operator
import sys, os
import json
from operator     import itemgetter
from optparse     import OptionParser #@UnusedWildImport
from _collections import defaultdict
# ===============================
VERSION   = "0.02"
TIMESTAMP = "2018-04-27"
# ===============================


def get_value(line):
    ''' Return the value from a line '''
    return line.split(': ')[1]

def convert_value(line):
    ''' Return the values from reads result lines '''
    raw_value = get_value(line)
    numbers = raw_value.split("(")[0].replace(" ","").split("/")
    return numbers


def pear_converter(fileIn, fileOut):
    ''' Read line by line the log file, store data into a dict, and export it as json '''
    json_data = defaultdict(lambda: {})

    fi = open( fileIn,  "r")
    fo = open( fileOut, "w")

    for line in fi:
      line = line.replace("\n", "")
      ### version, setting and paramters
      if "PEAR v" in line : 
        json_data["settings"]["version"] = line
      elif "Forward reads file" in line : 
        json_data["settings"]["forward_file"] = get_value(line)
      elif "Reverse reads file" in line : 
        json_data["settings"]["reverse_file"] = get_value(line)
      elif "PHRED" in line : 
        json_data["settings"]["phred"] = get_value(line)
      elif "Scoring method" in line : 
        json_data["settings"]["scoring_methode"] = get_value(line)
      elif "Minimum overlap" in line : 
        json_data["settings"]["minimum_overlap"] = get_value(line)

      ### bases frequencies
      elif "A:" in line : 
        json_data["base_frequency"]["base_frequency_a"]   = get_value(line)
      elif "C:" in line : 
        json_data["base_frequency"]["base_frequency_c"]   = get_value(line)
      elif "G:" in line : 
        json_data["base_frequency"]["base_frequency_g"]   = get_value(line)
      elif "T:" in line : 
        json_data["base_frequency"]["base_frequency_t"]   = get_value(line)
      elif "uncalled bases" in line : 
        json_data["base_frequency"]["uncalled_base"] = line.replace(" uncalled bases", "").replace("  ", "")

      ### output file
      elif "Assembled reads file" in line : 
        json_data["output_file"]["assembled_reads"] = get_value(line)
      elif "Discarded reads file" in line : 
        json_data["output_file"]["discarded_reads"] = get_value(line)
      elif "Unassembled forward reads file" in line : 
        json_data["output_file"]["unassembled_forward"] = get_value(line)
      elif "Unassembled reverse reads file" in line : 
        json_data["output_file"]["unassembled_reverse"] = get_value(line)
      
      ### number of reads
      elif "Assembled reads" in line : 
        json_data["reads"]["reads_assembled_number"]     = int(convert_value(line)[0].replace(",",""))
        json_data["reads"]["reads_total_number"]         = int(convert_value(line)[1].replace(",",""))
      elif "Discarded reads" in line : 
        json_data["reads"]["reads_discarded_number"]     = int(convert_value(line)[0].replace(",",""))
      elif "Not assembled reads" in line : 
        json_data["reads"]["reads_not_assembled_number"] = int(convert_value(line)[0].replace(",",""))
      
    ### Warnings
    json_data["warning"] = []
    # assembled reads
    percentage_not_assembled = int(json_data["reads"]["reads_not_assembled_number"]) / json_data["reads"]["reads_total_number"]
    json_data["reads"]["percentage_not_assembled"] = percentage_not_assembled
    if percentage_not_assembled > 50.00 : 
      json_data["warning"].append("Very few reads assembled")
    elif percentage_not_assembled > 20.00 : 
      json_data["warning"].append("Few reads assembled")
    # discarded reads
    percentage_discarded     = json_data["reads"]["reads_discarded_number"]     / json_data["reads"]["reads_total_number"]
    json_data["reads"]["percentage_discarded"] = percentage_discarded
    if percentage_discarded > 10.00 : 
      json_data["warning"].append("High level of discarded reads")


    ### export as json
    try:
        json.dump(json_data, fo, sort_keys=True, indent=4, ensure_ascii=False)
        print("Dump : %s" % (fileOut))
        fo.close()
    except:  # pragma: no cover
        print("Dump : FAILED" )
        return -1

    return


if __name__ == '__main__':
    #print( description )

    ### Description ###
    usage  = "Convert the result of pear preprocess log into a json file.\n"
    usage += "usage: %prog -i input_pear_log -o output.json"
    parser = OptionParser(usage=usage)

    ### Options ###
    parser.add_option("-v", "--verbose",
                      action="store_true", dest="verbose", default=True,
                      help="make lots of noise [default]")
    parser.add_option("-i", "--input",
                      metavar="FILE", help="input log file from PEAR merging")
    parser.add_option("-o", "--output",
                      metavar="FILE", help="output file in json format.")

    ### Getter des options ###
    argv = sys.argv
    (options, argv) = parser.parse_args(argv)
    if not options.input:   # if filename is not given
        parser.error('input-log file not given')
    if not options.output:   # if filename is not given
        parser.error('output file not given')

    if not ".json" in options.output:   # if extension is not given
        options.output = options.output + ".json"


    pear_converter(options.input, options.output )
