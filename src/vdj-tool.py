
import glob
from collections import defaultdict

import sys

if len(sys.argv) > 1:
    FILES = sys.argv[1:]
else:
    FILES = glob.glob('../../../seq/chr/2012-*/*.vdj')


info = sys.stderr


data = defaultdict(lambda: '-')
raw_data = defaultdict(lambda: '-')
ids = []
ffs = []

TEST = 'kmer'

for f in FILES:
    ff = f.replace('.vdj', '').split('.')[-1]
    ffs += [ff]

    info.write("<== %s\t%s\n" % (ff, f))

    segmented = 0
    unsegmented = 0

    for l in open(f):
        if not l.startswith('>'):
            continue
        if 'VJ' in l:
            ll = l.split()
            
            try:
                (id, sens, vj, a, b, c, d) = ll[:7]
            except:
                info.write("! not parsed: %s\n" % l)
                continue

            if a != "?" and b != "?" and c != "?" and d != "?":
                segmented += 1
                id = id[1:]

                if id not in ids:
                    ids += [id]

            # ' '.join(ll[7:])

                mid = (float(b)+float(c))/2
                data[ff,id] = mid
                raw_data[ff,id] = l.strip()
        else:
            unsegmented += 1

    info.write("\t\t%d = %d segmented + %d unsegmented\n" % (segmented + unsegmented, segmented, unsegmented))

info.write("    total\t%d segmented\n\n" % len(ids))


deltas = []



for fff in ffs: # [TEST]:
    for ff in ffs:
        if ff <= fff:
            continue

        DELTA_LABEL = fff[:4] + '-' + ff[:4]
        deltas += [((fff, ff), DELTA_LABEL)]

# if "imgt" in ffs and "igblast" in ffs:
#     deltas += [(('imgt', 'igblast'), 'imgt-igbl')]

for ((fff, ff), DELTA_LABEL) in deltas:
  for id in ids:
    try:
        delta = data[fff, id] - data[ff, id]
        data[DELTA_LABEL,id] = delta
    except:
        pass

DISPLAY_ALL = False

if DISPLAY_ALL:
    disp_deltas = [d for (x,d) in deltas]
else:
    disp_deltas = ['igbl-km40', 'imgt-km40', 'igbl-imgt']


seq = "%15s" % "" + " "
for ff in ffs:
    seq += "%7s " % ff + " "
seq += "  |   " 
for (x, DELTA_LABEL) in deltas:
    seq += " %9s     " % DELTA_LABEL
seq += "\n"

print seq
info.write(seq)

bads = defaultdict(lambda: defaultdict(int))
RES = 5
VERY_BAD = 4

for id in ids:
    interesting = False

    seq = "%15s " % id
    for ff in ffs:
        seq += "%7s  " % data[ff, id]

    seq += "  |   " 

    for (x, DELTA_LABEL) in deltas:
        seq += "%7s " % data[DELTA_LABEL, id]
        try:
            bad = int(abs(data[DELTA_LABEL, id])) / RES
            bads[DELTA_LABEL][bad] += 1
            s = "!" * bad

            if bad >= VERY_BAD:
                interesting = True
        except TypeError:
            s = ''
            pass

        seq += "%-4s " % s

    print seq
    if interesting:
        info.write("%s *** \n" % seq)
        for ff in ffs:
            if (ff, id) in raw_data:
                info.write("%7s\t" % ff + raw_data[ff, id] + "\n")
        info.write("\n")



def write_value(info, val, total):
    info.write("& %6d %10s " % (val, "(%.1f\\%%)" % (float(100*val)/total)))

very_bad = defaultdict(int)
total = {}

info.write("%8s " % (" "))

for DELTA_LABEL in disp_deltas:
    info.write("& %17s " % DELTA_LABEL)
    total[DELTA_LABEL] = sum(bads[DELTA_LABEL].itervalues())

info.write("\\\\ \n")

for b in range(10):
    # info.write("%20s " % ("!"*b))
    info.write("%2d .. %2d " % (b*RES, (b+1)*RES-1))

    for DELTA_LABEL in disp_deltas:
        write_value(info, bads[DELTA_LABEL][b], total[DELTA_LABEL])
        if b >= VERY_BAD:
            very_bad[DELTA_LABEL] += bads[DELTA_LABEL][b]

    info.write("\\\\ \n")

info.write("   >= %2d " % (VERY_BAD*RES))
for DELTA_LABEL in disp_deltas:
    write_value(info, very_bad[DELTA_LABEL], total[DELTA_LABEL])

info.write("\\\\ \n")




