import os
import sys
import json
import datetime
import argparse
from typing import Union
from collections import OrderedDict

class SingleLineList:
    def __init__(self, value):
        self.value = value

    def to_json(self) -> str:
        # Convert string as one line content
        return "[" + ",".join([str(val) for val in self.value]) + "]"

    def __repr__(self) -> str:
        return self.to_json()

    def __str__(self) -> str:
        return self.to_json()
    def __add__(self, other):
        return str(self) + other
    def __radd__(self, other):
        return other + str(self)

class Samples():
    def __init__(self, data):
        self.data = data
        if self.data["number"] == 1:
            self.oneline = True
        else:
            False

        if not self.oneline:
            return

        for key in self.data.keys():
            if isinstance(self.data[key], list):
                self.data[key] = SingleLineList(self.data[key])

        return
    
    def __repr__(self):
        return self.to_json()

    def to_json(self):
        return self.data


class Clone():
    def __init__(self, data):
        key_order = [
            "top", 
            "germline", 
            "name", 
            "id", 
            "sequence", 
            "fusion", # for translocation script
            "reads", 
            "_average_read_length",
            "_coverage_info",
            "_coverage",
            "seg"
        ]

        key_one_line_list = [
            "fusion", 
            "reads", 
            "_average_read_length", 
            "_coverage_info", 
            "_coverage"
        ]
            
        self.raw = data
        self.data = OrderedDict((key, data[key]) for key in key_order if key in self.raw)
        for key in key_one_line_list:
            if key in self.data.keys():
                self.data[key] = SingleLineList(self.data[key])
        
        if "seg" in self.data:
            self.data["seg"] = Seg(self.data["seg"])

        return
    
    def __repr__(self):
        return self.to_json()

    def to_json(self):
        return self.data



class Seg():
    def __init__(self, data):
        # For each key, a tuple is given, with first value is the key, and second is a oneline state
        key_order = [ 
                ["junction", False],
                ["cdr3", False],
                ["5", True],
                ["N", False],
                ["3", True],
                ["affectSigns", False],
                ["affectValues", False],
                ["evalue", True],
                ["evalue_right", True],
                ["evalue_left", True],
                ["quality", False]
        ]

        # possible keys can be reorder as well if present
        sub_key_order = [
            "name",
            "start",
            "stop",
            "delRight",
            "delLeft",
            "productive",
            "val",
            "seq",
            "aa",
        ]

        od_data = []
        for key in key_order:
            name = key[0]
            oneline = key[1]
            if name in data:
                if isinstance(data[name], dict):
                    od_data.append( (name, OrderedDictSet(data[name], sub_key_order, oneline=oneline))  )
                else:
                    od_data.append( (name, data[name]) )

        # Add missing key present in raw file
        for key in data.keys():
            if key not in key_order:
                if isinstance(data[key], dict):
                    od_data.append( (key, OrderedDictSet(data[key], sub_key_order, oneline=oneline))  )
                else:
                    od_data.append( (key, data[key]) )

        self.data = OrderedDict(od_data)

    def __repr__(self):
        return self.to_json()

    def to_json(self):
        return self.data


class OrderedDictSet():
    def __init__(self, data, ordered_keys, oneline=False):
        self.oneline = oneline
        if len(list(data.keys())) > 4:
            self.oneline = False # specific case with a lot of values, unreadable on one line

        keys = [key for key in ordered_keys if key in data] + [key for key in data if key not in ordered_keys]
        self.raw = data
        self.data = OrderedDict((key, data[key]) for key in keys if key in data)

    def to_json(self):
        return json.dumps(self.data, separators=(',', ':'), indent=0)
    def __repr__(self):
        return self.to_json()


class CompactJSONEncoderFork(json.JSONEncoder):
    """A JSON Encoder that puts small containers on single lines."""

    SINGLE_LINE_TYPES = (int, float, bool)
    """Acceptable types to put onto a single list line."""

    MAX_WIDTH = 70
    """Maximum width of a container that might be put on a single line."""

    MAX_ITEMS = 10
    """Maximum number of items in container that might be put on single line."""

    INDENTATION_CHAR = " "
    """Indentation character."""

    INDENTATION_WIDTH = 4
    """Number of indentation characters per level."""

    def __init__(self, *args, **kwargs):
        # using this class without indentation is pointless
        if kwargs.get("indent") is None:
            kwargs["indent"] = self.INDENTATION_WIDTH
            
        super().__init__(*args, **kwargs)
        self.indentation_level = 0

    def encode(self, o):
        """Encode JSON object *o* with respect to single line lists."""
        if isinstance(o, (OrderedDictSet)) and o.oneline:
            output = [f"{json.dumps(k)}: {self.encode(v)}" for k, v in o.data.items()]
            return "{" + ", ".join(output) + "}"
        if isinstance(o, (Clone, OrderedDict, OrderedDictSet, Seg, Samples)):
            self.indentation_level += 1
            output = [self.indent_str + f"{json.dumps(k)}: {self.encode(v)}" for k, v in o.data.items()]
            self.indentation_level -= 1
            return "{\n" + ",\n".join(output) + "\n" + self.indent_str + "}"
        if isinstance(o, SingleLineList):
            return "[" + ", ".join(self.encode(el) for el in o.value) + "]"
        if isinstance(o, (list, tuple)):
            if self._put_on_single_line(o):
                return "[" + ", ".join(self.encode(el) for el in o) + "]"
            else:
                self.indentation_level += 1
                output = [self.indent_str + self.encode(el) for el in o]
                self.indentation_level -= 1
                return "[\n" + ",\n".join(output) + "\n" + self.indent_str + "]"
        elif isinstance(o, (dict)):
            if len(o) == 0:
                return "{}"
            
            if self._put_on_single_line(o):
                return "{ " + ", ".join(f"{self.encode(k)}: {self.encode(el)}" for k, el in o.items()) + " }"
            else:
                self.indentation_level += 1
                output = [self.indent_str + f"{json.dumps(k)}: {self.encode(v)}" for k, v in o.items()]
                self.indentation_level -= 1
                return "{\n" + ",\n".join(output) + "\n" + self.indent_str + "}"
        elif isinstance(o, float):  # Use scientific notation for floats, where appropriate
            return format(o, "g")
        elif isinstance(o, str):  # escape newlines
            o = o.replace("\n", "\\n")
            return f'"{o}"'
        else:
            return json.dumps(o)

    def iterencode(self, o, **kwargs):
        """Required to also work with `json.dump`."""
        return self.encode(o)

    def _put_on_single_line(self, o):
        if isinstance(o, (list, tuple)) and all(isinstance(i, self.SINGLE_LINE_TYPES) for i in o):
            return len(o) <= self.MAX_ITEMS and len(str(o)) - 2 <= self.MAX_WIDTH

        return False

    @property
    def indent_str(self) -> str:
        return self.INDENTATION_CHAR * (self.indentation_level * self.indent)

def importData(data):
    """Import data and convert some content to object with specific json format output

    Args:
        data (dict): Raw Vidjil data imported from a file

    Returns:
        dict: Return mutated vidjil file, with some specific objects
    """
    if 'samples' in data:
        data["samples"] = Samples(data["samples"])


    if 'diversity' in data and isinstance(data['diversity'], dict):
        for key in data["diversity"]:
            if isinstance(data["diversity"][key], list):
                data["diversity"][key] = SingleLineList(data["diversity"][key])


    if 'clones' in data and isinstance(data['clones'], list):
        for i in range(len(data["clones"])):
            data["clones"][i] = Clone(data["clones"][i])

    return data

if __name__ == '__main__':
    
    description  = ''
    description += 'Description : \n\tThis script allow to reorder and make a pretty export of a vidjil data file (reorder keys, indent).'

    parser = argparse.ArgumentParser(description= description)


    parser.add_argument('--input',   '-i', help='input vidjil file')
    parser.add_argument('--output',  '-o', help='output vidjil file',       default=False)
    parser.add_argument('--compact', '-c', help='Compact vidjil file on one line, else make reorder', action="store_true",   default=False)
    parser.add_argument('--verbose', '-v', help='verbose mode', action="store_true",   default=False)
    args = parser.parse_args()


    inputfile      = args.input
    outputfile     = args.output
    if not outputfile:
        outputfile = inputfile.replace(".vidjil", "_formated.vidjil")
    verbose  = args.verbose
    compact  = args.compact

    if not args.input:
        print( "Missing args: input file")
        print( parser.help)
        exit()
    
    # Load json content
    with open(inputfile, 'r') as file:
        data = json.load(file)

    vidjil = importData(data)


    # Use CustomJSONEncoder to convert and reorder exported json
    if compact:
         with open(inputfile, 'r') as file:
            data = json.load(file)
            json_str = json.dumps(data, indent=0)
    else:
        json_str = json.dumps(data, cls=CompactJSONEncoderFork, indent=4)
    
    if args.verbose:
        print( json_str )


    # Write json string to output file
    with open(outputfile, 'w') as file:
        file.write(json_str)


