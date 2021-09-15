#!/usr/bin/python

import argparse
import sys
import json
from datetime import datetime


class LogParser:

    def __init__(self, log_file):
        self.log_file = log_file

    def export(self, preprocessArgs, path_output):
        parsed_log = self.parse()
        parsed_log['pre_process']['commandline'] = [preprocessArgs]
        parsed_log['number'] = 1
        #parsed_log['pre_process']['original_names'] = [path_file]
        timestamp = [datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        parsed_log['pre_process']['run_timestamp'] = timestamp
        parsed_log['vidjil_json_version'] = 'TODO'
        parsed_log['reads'] = {}
        parsed_log['reads']['merged'] = parsed_log['pre_process']['stats']['combined_pairs']
        parsed_log['reads']['total'] = parsed_log['pre_process']['stats']['total_pairs']

        with open(path_output, 'w') as vidjil_file:
            vidjil_file.write(json.dumps(parsed_log))


class FlashLogParser(LogParser):

    def parse(self):
        parsed_log = {}
        log_line = self.readline()
        while log_line:
            log_line = log_line.strip()
            if(log_line.startswith('WARNING')):
                continue

            if(log_line.startswith('Starting FLASH')):
                parsed_log['producer'] = [' '.join(log_line.split()[1:])]

            if(log_line in ['Input files:', 'Output files:']):
                key = log_line.lower().split()[0]
                parsed_log[key] = []
                arr = []
                log_line = self.readline(True)
                while(log_line != ""):
                    arr.append(log_line)
                    log_line = self.readline(True)
                parsed_log[key].append(arr)

            if(log_line == 'Read combination statistics:'):
                parsed_log['stats'] = {}
                log_line = self.readline(True)
                while(log_line != ""):
                    key, value = self.getkeyvalue(log_line)
                    parsed_log['stats'][key] = [value]
                    log_line = self.readline(True)

            if(log_line == 'Parameters:'):
                parsed_log['parameters'] = {}
                log_line = self.readline(True)
                while(log_line != ""):
                    key, value = self.getkeyvalue(log_line)
                    parsed_log['parameters'][key] = [value]
                    log_line = self.readline(True)

            log_line = self.readline()
        result = {'pre_process': parsed_log}
        return result

    def readline(self, strip=False):
        log_line = self.log_file.readline()
        log_line = log_line.replace('[FLASH]', '')
        if(strip):
            return log_line.strip()
        return log_line

    def convert(self, value):
        try:
            tmp = int(value)
        except ValueError:
            try:
                tmp = float(value)
            except ValueError:
                try:
                    tmp = value.split()[0]
                    try:
                        tmp = int(tmp)
                    except ValueError:
                        try:
                            tmp = float(tmp)
                        except ValueError:
                            tmp = value
                except:
                    tmp = value

        return tmp

    def getkeyvalue(self, line):
        split_line = line.split(':')
        key = split_line[0].lower().strip().replace(' ', '_').replace('"', '')
        value = split_line[1].strip()
        value = self.convert(value)
        return (key,value)



if  __name__ =='__main__':
    print("#", ' '.join(sys.argv))

    DESCRIPTION = 'Vidjil utility to parse log of some preprocess'

    ### Argument parser (argparse)
    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                     epilog='''Example: python2 %(prog)s  out/flash2.log''')

    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('--input',  '-i', type=str, default='preprocess.log',    help='input file (%(default)s)')
    group_options.add_argument('--output', '-o', type=str, default='preprocess.vidjil', help='output file (%(default)s)')
    args = parser.parse_args()


    logfile   = open(args.input, "r")
    logparser = FlashLogParser(logfile) # For the moment, only flash2 preprocsess is available
    logparser.export("args from preprocess", args.output)
