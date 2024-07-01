#!/usr/bin/python

import argparse
import sys
import json
from datetime import datetime


class LogParser:
    """
    Main class of type LogParser.
    Call 'export' function to make extraction of content of raw log file into structured data. 
    By default, will take every lines in "key: value" string format to return {key: value}
    Store data into a json file that will be used later at fuse step of analysis.
    """
    def __init__(self, log_file):
        if isinstance(log_file, str):
            log_file   = open(log_file, "r")
        self.log_file = log_file

    def export(self, preprocessArgs, output_file):
        parsed_log = self.parse() # Call parse function. This function can be redefined in child class.
        parsed_log['pre_process']['commandline'] = [preprocessArgs]
        parsed_log['number'] = 1
        #parsed_log['pre_process']['original_names'] = [path_file]
        timestamp = [datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        parsed_log['pre_process']['run_timestamp'] = timestamp
        parsed_log['vidjil_json_version'] = 'TODO'
        parsed_log['reads'] = {}
        # default for merging script
        if "stats" in parsed_log['pre_process']:
            if "combined_pairs" in parsed_log['pre_process']['stats']:
                parsed_log['reads']['merged'] = parsed_log['pre_process']['stats']['combined_pairs']
            if "total_pairs" in parsed_log['pre_process']['stats']:
                parsed_log['reads']['total'] = parsed_log['pre_process']['stats']['total_pairs']

        with open(output_file, 'w') as vidjil_file:
            vidjil_file.write(json.dumps(parsed_log))


    def parse(self):
        """
        main function to transform content of log into structured data
        Can be redefined in child classes
        """
        parsed_log = {}
        parsed_log['stats'] = {}
        parsed_log['parameters'] = {}
        log_line = self.readline(strip=True) # strip to remove trailling spaces
        while log_line:
            if log_line != "" and ":" in log_line:
                key, value = self.getkeyvalue(log_line)
                # print( f"KEY: {key}; VALUE {value}; LOGLINE: {log_line};")
                parsed_log["stats"][key] = [value]
            log_line = self.readline(True)

        result = {'pre_process': parsed_log}
        return result

    def readline(self, strip=False):
        """ Return next line of the log file; False if end line reach """
        log_line = self.log_file.readline()
        if(strip):
            return log_line.strip()
        return log_line

    def convert(self, value):
        """
        Try to convert value data into various format
        continue while no correct format found, return string format if no other available
        If don't succeed, also split and retry convertion on first element; ex: "4 reads"
        int => float => (recursive call on split)
        Can be redefined in child classes
        """
        try:
            tmp = int(value)
        except ValueError:
            try:
                tmp = float(value)
            except ValueError:
                try:
                    tmp = value.split()[0]
                    if tmp != value:
                        return self.convert(tmp)
                    tmp = value
                except:
                    tmp = value
        return tmp

    def getkeyvalue(self, line):
        """ 
        split a line on ':' character
        return first element as key and try an automatic conversion of the second
        """
        split_line = line.split(':')
        key = split_line[0].lower().strip().replace(' ', '_').replace('"', '').replace('__', '_')
        value = split_line[1].strip()
        value = self.convert(value)
        return (key,value)


class FlashLogParser(LogParser):
    """
    FlashLogParser; new class to convert specific log of Flash2 tools
    Replace default function 'parse' and 'readline'
    """
    def parse(self):
        parsed_log = {}
        log_line = self.readline()
        while log_line:
            log_line = log_line.strip()
            if(log_line.startswith('WARNING')):
                if not "warning" in parsed_log.keys():
                    parsed_log['warnings'] = [[]]
                key, value = self.getkeyvalue(log_line)
                parsed_log['warnings'][0].append(value)

                pass

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


parser_description="\
List of available parsers:\n\
\tgeneric: (default) A generic log parser. Will transform each line 'key: value'  and  'key: value unity' into entries inside generated file\n\
\tFlashLogParser: A specific parser for Flash2 log\n\
"

if  __name__ =='__main__':
    print("#", ' '.join(sys.argv))

    DESCRIPTION  = 'Vidjil utility to parse log of some preprocess'
    DESCRIPTION += 'By default, work on log with line in "key: value" string format.'
    DESCRIPTION += 'New class as FlashLogParser can be defined to exploit specific format of your preprocess'

    ### Argument parser (argparse)
    parser = argparse.ArgumentParser(description= DESCRIPTION,
                                     epilog='''Example: python %(prog)s -i out/flash2.log -o preprocess.vidjil --parser FlashLogParser''')

    group_options = parser.add_argument_group() # title='Options and parameters')
    group_options.add_argument('--input',  '-i', type=str, default='preprocess.log',    help='input file (%(default)s)')
    group_options.add_argument('--output', '-o', type=str, default='preprocess.vidjil', help='output file (%(default)s)')
    group_options.add_argument('--parser', '-p', type=str, default='generic',           help='Parser to use; by default use \'%(default)s\'')
    group_options.add_argument('--list', '-l',   action="store_true",                   help='List all available parsers')
    args = parser.parse_args()

    if args.list:
        print( parser_description)
        exit()

    logfile   = open(args.input, "r")
    if args.parser == "generic":
        logparser = LogParser(logfile)
    elif args.parser in globals():
        logparser = globals()[args.parser](logfile)
    else:
        print( "Warning; Parser to use not recognize; use default parser.")
        logparser = LogParser(logfile)


    logparser.export("args from preprocess", args.output)
