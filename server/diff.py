#!/usr/bin/env python
# -*- coding: utf-8 -*-


import fuse
import sys
#import ansi

def format_rank(rank, colorize):
    s = ''
    if rank < 1000:
        s += '#%03d' % rank
    else:
        s += '#%02dk' % (rank / 1000)

    if rank <= 5 and colorize:
        s = ansi.Fore.RED + s + ansi.Style.RESET_ALL

    return s

def format_rank_nb_reads(rank, list_nb_reads, list_total_nb_reads):
    s = format_rank(rank, False) + ' '
    for (nb_reads, total_nb_reads) in zip(list_nb_reads, list_total_nb_reads):
        s += ' %6d %6.2f%%' % (nb_reads, 100*float(nb_reads)/float(total_nb_reads))
    return s

class Args:
    pass

args = Args()
args.nb = 5
args.nb_others = 3

def diff_two_clones(self, other):
    if not other or not self:
        print "!!! Clone not present:", self, "/", other
        return

    if not self.d['reads'] == other.d['reads']:
        print "!!! Not the same number or reads:", self.d['id'], "-", self.d['reads'], "/", other.d['reads']


def compare(data1, data2, verbose_diff=True):

    displayed_clones = []

    def print_clone_in_self_and_others(clone):
        if clone in displayed_clones:
            return

        if verbose_diff:
            print clone,
        other_clones = []
        for o in [data1] + [data2]:
            if verbose_diff:
                print "\t",
            try:
                w = o[clone]
                other_clones += [w]
            except:
                continue
            if not w:
                continue

            if verbose_diff:
                print format_rank_nb_reads(w.d['top'], w.d['reads'], o.d['reads'].d['segmented']),

        displayed_clones.append(clone)        
        if verbose_diff:
            print
        
        diff_two_clones(other_clones[0], other_clones[1] if len(other_clones) > 1 else None)

    ### 

    ids_1 = [clone.d['id'] for clone in data1]
    ids_2 = [clone.d['id'] for clone in data2]
 
    ### Display clones of this ListWindows
    if verbose_diff:
        print "==== Diff from %s, %d first clones" % (data1, args.nb)

    for id in ids_1[:args.nb]:
        print_clone_in_self_and_others(id)

    ### Display clones of other ListWindows not present in this ListWindows
    if verbose_diff:
        print
        print "==== Other clones in the top %d of other files" % args.nb_others

    for o in [ids_2]:
        for id in o[:args.nb_others]:
            if id in ids_1[:args.nb]:
                continue
            print_clone_in_self_and_others(id)



datas = []
for i in sys.argv[1:]:
    data = fuse.ListWindows()
    data.load(i, False)
    datas.append(data)
    
data1 = datas[0]
data2 = datas[1]


compare(data1, data2, False)




