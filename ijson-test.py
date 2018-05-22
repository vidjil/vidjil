#!/usr/bin/python
import ijson

fusedfile = open('/home/ryan/fused_file.fused', 'r')

'''
objects = ijson.items(fusedfile, 'clones.item')
affectSigns = (c['seg']['affectSigns'] for c in objects)
count = 1
for afs in affectSigns:
    print('affect: {}, {}'.format(count, afs))
    count = count + 1
'''

parser = ijson.parse(fusedfile)

def pretty_print(prefix, event, value, previous_event):
    end = None
    if event == 'start_map':
        mstr = '{{'
    elif event == 'end_map':
        mstr = '}},'
    elif event == 'start_array':
        mstr = '['
    elif event == 'end_array':
        mstr = '],'
    elif event == 'map_key':
        mstr = '\'{}\':'
        end = ''
    elif event == 'string':
        mstr = '\'{}\','
    else:
        mstr = '{},'
    padding = ''
    if previous_event != 'map_key':
        if len(prefix) > 0:
            padding = ''.join(['\t' for i in range(len(prefix.split('.')))])
    mstr = '{}' + mstr
    print(mstr.format(padding, value), end=end)

previous = ''
for prefix, event, value in parser:
    prefixes = ['clones.item.seg.affectSigns', 'clones.item.seg.affectValues', 'similarity.item']

    #There must be a better way !!!
    cond = any(prefix.startswith(item) for item in prefixes) \
            or (any(item.startswith(prefix) for item in prefixes) \
                and (value is None or any(item.startswith(prefix + '.' + str(value)) for item in prefixes) \
                    or any(item.startswith(str(value)) for item in prefixes)))
    if cond:
        pretty_print(prefix, event, value, previous)
    previous = event
