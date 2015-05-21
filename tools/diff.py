#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function
import fuse
import sys
import ansi
import argparse

parser = argparse.ArgumentParser(description = 'Show differences or similarities between clones in two .vidjil files')
parser.add_argument('--nb', '-n', type=int, default=5, help='number of clones to display from the first file (%(default)d), 0 for all')
parser.add_argument('--nb_others', '-o', type=int, default=3, help='number of clones to display from the other files (%(default)d)')
parser.add_argument('--common', '-c', action='store_true', help='display common clones instead of different clones')
parser.add_argument('--verbose', '-v', action='store_true', help='verbose output')
parser.add_argument('file', nargs=2, help='''.vidjil files to be compared''')


DIFF_COLORS = {
    '+': ansi.Fore.GREEN,
    '-': ansi.Fore.RED,
    '=': ansi.Fore.BLUE,
    '?': ansi.Fore.CYAN,
}



def format_rank(rank, colorize):
    s = ''
    if rank < 1000:
        s += '#%03d' % rank
    else:
        s += '#%02dk' % (rank / 1000)

    if rank <= 5 and colorize:
        s = ansi.Fore.BLUE + s + ansi.Style.RESET_ALL

    return s

def format_rank_nb_reads(rank, list_nb_reads, list_total_nb_reads):
    s = format_rank(rank, True) + ' '
    for (nb_reads, total_nb_reads) in zip(list_nb_reads, list_total_nb_reads):
        s += ' %6d %6.2f%%' % (nb_reads, 100*float(nb_reads)/float(total_nb_reads))
    return s


def common_two_clones(self, other, seg=None):

    if seg is None:
        seg = [1000000]
    
    if not other or not self:
        return
    
    print("%s\t%s%s" % (self.d['id'],
                        format_rank_nb_reads(self.d['top'], self.d['reads'], seg),
                        format_rank_nb_reads(other.d['top'], other.d['reads'], seg)))


def diff_two_clones(self, other):

    if not other or not self:
        who = "+-"[not other]
        print(DIFF_COLORS[who]+who, end=' ')
        print("!!! Clone not present:", self, "/", other, end=' ')
        print(ansi.Style.RESET_ALL)
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
        print(DIFF_COLORS[who]+who, end=' ')
        print("!!! Not the same number or reads:", self.d['id'], "-", self.d['reads'], "/", other.d['reads'], end=' ')
        print(ansi.Style.RESET_ALL)


def compare(data1, data2, args):

    displayed_clones = []

    def print_clone_in_self_and_others(clone):
        if clone in displayed_clones:
            return

        if args.verbose:
            print(clone, end=' ')
        other_clones = []
        for o in [data1] + [data2]:
            if args.verbose:
                print("\t", end='')
            try:
                w = o[clone]
                other_clones += [w]
            except:
                continue
            if not w:
                continue

            if args.verbose:
                print(format_rank_nb_reads(w.d['top'], w.d['reads'], o.d['reads'].d['segmented']), end=' ')

        displayed_clones.append(clone)        
        if args.verbose:
            print()

        if args.common:
            common_two_clones(other_clones[0], other_clones[1] if len(other_clones) > 1 else None)
        else:
            diff_two_clones(other_clones[0], other_clones[1] if len(other_clones) > 1 else None)



    ### 

    ids_1 = [clone.d['id'] for clone in data1]
    ids_2 = [clone.d['id'] for clone in data2]
 
    ### Display clones of this ListWindows
    if args.verbose:
        print("==== Diff from %s, %d first clones" % (data1, args.nb))

    ids_1_cut = ids_1[:args.nb] if args.nb else ids_1

    for id in ids_1_cut:
        print_clone_in_self_and_others(id)

    ### Display clones of other ListWindows not present in this ListWindows
    if args.verbose:
        print()
        print("==== Other clones in the top %d of other files" % args.nb_others)

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




