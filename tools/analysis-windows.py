
import json
import argparse

parser = argparse.ArgumentParser(description = 'Change the window in "id" fields within .analysis files\nTo be used for maintenance purposes only')
parser.add_argument('--window', '-w', type=int, default=50, help='new window length (%default)')
parser.add_argument('--overwrite', '-o', action='store_true', help='overwrite existing .analysis files')
parser.add_argument('file', nargs='+', help='''.vidjil files''')

args = parser.parse_args()

used_windows = []

def change_window(clone, w):
    old_window = clone['id']
    pos = clone['sequence'].find(old_window)

    if pos < 0:
        print("! Clone without window in 'id' - clone '%s' unchanged" % old_window)
        return

    new_start = pos + (len(old_window) - w) / 2

    if new_start < 0 or new_start+w > len(clone['sequence']):
        print("! Sequence too short for new window - clone '%s' unchanged" % old_window)
        return

    new_window = clone['sequence'][new_start:new_start+w]

    if new_window in used_windows:
        print("! Window '%s' is already used - clone '%s' unchanged" % (new_window, old_window))
        return
    
    clone['id'] = new_window
    used_windows.append(new_window)


class Analysis():

    def __init__(self):
        self.d = {}

    def load(self, f):
        self.d = json.load(f)

    def save(self, f):
        json.dump(self.d, f, indent=2)

    def __iter__(self):
        '''Iter on clones'''
        return self.d["clones"].__iter__()
            


suffix = '' if args.overwrite else '.new'
    
for f in args.file:
    f_new = f + suffix
    print("  %s ==> %s" % (f, f_new))
    
    an = Analysis()
    
    with open(f) as ff:
        an.load(ff)
    
    for clone in an:
        change_window(clone, args.window)

    with open(f_new, 'w') as ff_new:
        an.save(ff_new)
