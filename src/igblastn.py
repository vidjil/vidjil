

import sys
import os

DEBUG = False

IGBLAST = "./igblastn "

FIRST_POS = 0  # .vdj: First base pair is numbered 0
# FIRST_POS = 1  


IGNORE_PATTERN = 'BL_ORD_ID'

DATABASE = ''

# DATABASE += "-germline_db_V database/human_gl_V "
# DATABASE += "-germline_db_D database/human_gl_D "
# DATABASE += "-germline_db_J database/human_gl_J "

DATABASE += "-germline_db_V ../../../seq/Repertoire/TRGV.fa "
DATABASE += "-germline_db_D ../../../seq/Repertoire/---D.fa "
DATABASE += "-germline_db_J ../../../seq/Repertoire/TRGJ-lcl.fa "

OPTIONS = " -domain_system imgt  -outfmt 7 "

OUT = "igblast.out"

### Au maximum 1 alignement V/D/J (sinon, 3 par defaut)
OPTIONS += "-num_alignments_V 1  -num_alignments_D 1  -num_alignments_J 1  "


CMD = IGBLAST + DATABASE + OPTIONS + "-query %s > " + OUT


### Fichier d'entree

# DEFAULT = "tests/data/leukemia.fa"
DEFAULT = "../../../seq/chr/2012-09-10-Lec/Lec_10-5.cut_100.fa"

f_in = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT
cmd = CMD % f_in


### Lance igBlast

sys.stderr.write("%s\n\n" % cmd)
os.system(cmd)



phase = 0
info = ""
seq = "?"
data = {}
type = ""
junctions = {}

OUPS = "?/?/?"

def get_data(d, k):
    if k in d:
        return d[k]
    else:
        return ('x', 'x')

out_vdj = 0
ignored = 0

for l in open(OUT):
    
    l = l.strip()
    if not l:
        continue

    if "#" in l:

        if phase == 2:
            if DEBUG:
                print "#", data, junctions

            out_vdj += 1
            # 1-line .vdj main output here
            print ">%s" % seq, "\t+", type, "\t", 

            for c in type:
                print get_data(data, c)[0], get_data(data, c)[1], 


            ### Info string
            info = ['']
                        
            if 'V' in type:  info += [data['V'][2]]

            if 'VD' in type:
                if 'VD' in junctions:  info += [junctions['VD']]
                else: info += [ OUPS ]

            if 'VJ' in type:
                if 'VJ' in junctions:  info += [junctions['VJ']]
                else: info += [ OUPS ]

            if 'D' in type:  info += [data['D'][2]]

            if 'DJ' in type:
                if 'DJ' in junctions:  info += [junctions['DJ']]
                else: info += [ OUPS ]

            if 'J' in type:  info += [data['J'][2]]

            print "\t".join(info)

            ## New sequence
            type = ""
            data = {}
            junctions = {}

        phase = 0
        

    if "Query" in l:
        seq = l.split()[2]

        if DEBUG:
            print "\n\n\n#", l
        continue

    if "V(D)J rearrangement summary" in l:        
        phase = 1
        continue

    if "hits found" in l:
        if DEBUG:
            print "#", l
        phase = 2
        continue


    if "junction details" in l:
        if "V-J junction" in l:
            phase = 3
        else:
            phase = 4
        continue

    if phase == 1:
        if DEBUG:
            print "#", l

    if phase == 2:
        # Fields: query id, subject id, % identity, alignment length, mismatches, gap opens,
        #         q. start, q. end, s. start, s. end, evalue, bit score 
        # V	I7WCL:63:275-1	IGHV1-18*03	88.46	26	3	0	24	49	265	290	0.002	33.0

        ll = l.split()

        try:
            VDJ, q_id, s_id, pcent, al_length, mism, gap_op, q_start, q_end, s_start, s_tend, evalue, bit_score = ll
            try:
                s_id = s_id.split('|')[1]
            except:
                pass

            if IGNORE_PATTERN in s_id:
                ignored += 1
                continue

            type += VDJ
            data[VDJ] = (int(q_start) - 1 + FIRST_POS, int(q_end) - 1 + FIRST_POS, s_id)


        except:
            sys.stderr.write("! not parsed: %s\n" % l)


    if phase in [3, 4]:
        # V(D)J junction details (V end, V-D junction, D region, D-J junction, J start).  
        # GTGCA	C	CTGGA	N/A	N/A	
        # ====== OU BIEN =========
        # V(D)J junction details (V end, V-J junction, J start). 
        # AGGAA	N/A	N/A	

        # Note that possible overlapping nucleotides at VDJ junction
        # (i.e, nucleotides that could be assigned to either joining
        # gene segment) are indicated in parentheses (i.e., (TACT))
        # but are not included under V, D, or J gene itself

        l = l.replace('N/A', '#')
        junc = l.split()

        if phase == 3:
            junctions['VJ'] = "%s/%s/%s" % (junc[0], junc[1], junc[2])
        else:
            junctions['VD'] = "%s/%s/%s" % (junc[0], junc[1], junc[2][:5])
            junctions['DJ'] = "%s/%s/%s" % (junc[2][:5], junc[3], junc[4])



sys.stderr.write("\n==> %d .vdj lines\n" % out_vdj)
sys.stderr.write("==> %d ignored components (%s)\n" % (ignored, IGNORE_PATTERN))





# V(D)J rearrangement summary 

