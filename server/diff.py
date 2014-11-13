#!/usr/bin/env python
# -*- coding: utf-8 -*-


import fuse
import sys
#import ansi
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--nb', '-n', type=int, default=5, help='number of clones to display from the first file (%(default)d)')
parser.add_argument('--nb_others', '-o', type=int, default=3, help='number of clones to display from the other files (%(default)d)')
parser.add_argument('--verbose', '-v', action='store_true', help='verbose output')
parser.add_argument('file', nargs=2, help='''.vidjil files to be compared''')


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

def diff_two_clones(self, other):
    if not other or not self:
        who = "+-"[not other]
        print who,
        print "!!! Clone not present:", self, "/", other
        return

    if not self.d['reads'] == other.d['reads']:

        ### Computes 'who' character identification
        who_minus = False
        who_plus = False
        for reads_s, reads_o in zip(self.d['reads'], other.d['reads']):
            if reads_o > reads_s:
                who_plus = True
            if reads_o < reads_s:
                who_minus = True
        who = ["=+", "-?"][who_minus][who_plus]
        print who, 

        print "!!! Not the same number or reads:", self.d['id'], "-", self.d['reads'], "/", other.d['reads']


def compare(data1, data2, args):

    displayed_clones = []

    def print_clone_in_self_and_others(clone):
        if clone in displayed_clones:
            return

        if args.verbose:
            print clone,
        other_clones = []
        for o in [data1] + [data2]:
            if args.verbose:
                print "\t",
            try:
                w = o[clone]
                other_clones += [w]
            except:
                continue
            if not w:
                continue

            if args.verbose:
                print format_rank_nb_reads(w.d['top'], w.d['reads'], o.d['reads'].d['segmented']),

        displayed_clones.append(clone)        
        if args.verbose:
            print
        
        diff_two_clones(other_clones[0], other_clones[1] if len(other_clones) > 1 else None)

    ### 

    ids_1 = [clone.d['id'] for clone in data1]
    ids_2 = [clone.d['id'] for clone in data2]
 
    ### Display clones of this ListWindows
    if args.verbose:
        print "==== Diff from %s, %d first clones" % (data1, args.nb)

    for id in ids_1[:args.nb]:
        print_clone_in_self_and_others(id)

    ### Display clones of other ListWindows not present in this ListWindows
    if args.verbose:
        print
        print "==== Other clones in the top %d of other files" % args.nb_others

    for o in [ids_2]:
        for id in o[:args.nb_others]:
            if id in ids_1[:args.nb]:
                continue
            print_clone_in_self_and_others(id)



def main():

    args = parser.parse_args()
    datas = []

    for i in args.file:
        data = fuse.ListWindows()
        data.load(i, False, verbose = args.verbose)
        datas.append(data)
    
    data1 = datas[0]
    data2 = datas[1]

    compare(data1, data2, args)



if  __name__ =='__main__':
    main()




