#!/usr/bin/python

class FlashLogParser:

    def __init__(self, log_file):
        self.log_file = log_file

    def parse(self):
        parsed_log = {}
        log_line = self.readline()
        while log_line:
            log_line = log_line.strip()
            if(log_line.startswith('WARNING')):
                continue

            if(log_line.startswith('Starting FLASH')):
                parsed_log['producer'] = ' '.join(log_line.split()[1:])

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
        return {'samples': {'pre_process': parsed_log}}

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
                tmp = value
        return tmp

    def getkeyvalue(self, line):
        split_line = line.split(':')
        key = split_line[0].lower().strip().replace(' ', '_').replace('"', '')
        value = split_line[1].strip()
        value = self.convert(value)
        return (key,value)

