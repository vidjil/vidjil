#!/usr/bin/perl -w

use strict;
use Getopt::Long;
use Pod::Usage;
use POSIX qw/ceil/;


=head1 NAME
    
    imgt2vdj - IMGT High-VQuest output to a VDJ output

=head1 SYNOPSIS

    imgt2vdj [options] <file summary> <file nt-sequence> <file junction>


    The program reads the three files provided as parameters and produces an
    output that depicts for every read the VDJ recombination taking place.

    file summary: is an IMGT output file, whose name starts by default with
    1_Summary

    file nt-sequence: is an IMGT output file, whose name starts by default
    with 3_Nt-sequence

    file junction: is an IMGT output file, whose name starts by default with
    6_Junction

    A mandatory parameter must provide the type of recombination we are
    expecting: either vdj or vj.

    For the sake of simplicity and because of the way IMGT High-VQuest stores
    the results we need to store the results for all the reads in
    memory. Therefore, large datasets may quickly fill the
    memory. Fortunately, IMGT High-VQuest limits the user to a handful of
    sequences.

Output: 

    VDJ ``standard'' format on standard output.


=head1 OPTIONS

=over 8

=item B<-o|--output>

The output filename

=item B<--vj>

We are working with VJ recombinations

=item B<--vdj>

We are working with VDJ recombinations

=cut

use constant LINE_LENGTH => 60;

# @param: a string corresponding to IMGT output for specifying the V, D or J
#         segment the sequence aligns to
# @return: a cleaned string, containing only one name of a segment
sub clean_IMGT_VDJ_markup($) {
    my ($segment) = @_;
    if (length $segment > 0) {
        # IMGT output likes to make some jokes. Instead of simply putting the name
        # of the segment, you may have a comment such as " Less than x nucleotides
        # ...". In that case the name of the segment is unknown and we must
        # therefore ignore that message.
        if ($segment =~ /Less than/) {
            return "";
        }
        my @parts = split /\s+/, $segment;
        return $parts[1];
    }
    return "";
}

# @param: a string or anything
# @param: (optional) a flag, if defined we allow the first param to be empty
# return the first param if it is defined or not empty (unless last param is set)
#        or a question mark.
sub defOrQMark {
    my ($string, $emptyLength) = @_;
    if (defined $string && (defined ($emptyLength) || length $string > 0)) {
        return $string;
    }
    return "?";
}

# @param: the line to be split
# @param: the maximal length of the line
# @return a line with \n inserted so that a line doesn't exceed the provided 
#         number of characters
sub split_lines($$) {
    my ($line, $length) = @_;
    my $nb_pieces = ceil(length($line) / $length);
    my $result = '';
    for (my $i=0; $i < $nb_pieces; $i++) {
        $result .= substr($line, $length*$i, $length);
        if ($i < $nb_pieces-1) {
            $result .= "\n";
        }
    }
    return $result;
}

# @param: a reference to an array containing positions given by IMGT
# @param: a reference to an array containing the insertion postions 
sub correct_positions($$) {
    my ($positions, $insertions) = @_;
    my @positions = @$positions;
    my @insertions = @$insertions;
    my ($i, $j, $shift) = (0,0,0);
    while ($i <= $#positions && $j <= $#insertions
           && defined $positions->[$i] && defined $insertions[$j] 
           && length($positions->[$i]) > 0 && length($insertions[$j]) > 0) {
        if ($positions->[$i] < $insertions[$j] - $shift) {
            # The position is before the next insertion:
            # apply the previous shift, and go to the next position
            $positions->[$i] += $shift;
            $i++;
        } else {
            # The insertion is before the next position:
            # increment the shift and go to the next insertion
            $j++;
            $shift++;
        }
    }
    while ($i <= $#positions && defined $positions->[$i]
           && length($positions->[$i]) > 0) {
        $positions->[$i] += $shift;
        $i++;
    }
}

my ($output) = (\*STDOUT);
my ($vdj, $vj);
my $line_length = LINE_LENGTH;

GetOptions("h|help", sub {pod2usage(1)},
           "manual", sub {pod2usage(-verbose => 2)},
           "o|output=s", sub {open($output, ">".$_[1]) or die("Unable to write to file ".$_[1].": $!\n");},
           "vdj", \$vdj,
           "vj", \$vj);

if (@ARGV < 3) {
    pod2usage(-exitval => 1, -message => "Mandatory argument (two filenames) missing.");
}

for (my $i = 0; $i < 3; $i++) {
    if (! -f $ARGV[$i]) {
        print STDERR "File $ARGV[$i] doesn't exist. How could I read that file?\n";
}
}

my $nt_seq_filename = $ARGV[1];
my $junctions_filename = $ARGV[2];
my $summary_filename = $ARGV[0];



if (! defined $vdj && ! defined $vj) {
    pod2usage(-exitval => 1, -message => "Mandatory argument (--vdj or --vj) missing.");
}

# In that file we retrieve the Ns
# we also retrieve the respective positions of the V, the D and the J.
open(my $nt_seq_file, $nt_seq_filename) or die("Unable to open file $nt_seq_filename: $!\n");

my %nContent;
my %positions;
my %deletions;

while (<$nt_seq_file>) {
    next if $. == 1;
    chomp;
    my @field = split /\t/;
    
    if ($vdj) {
        push @{$nContent{$field[1]}}, $field[21]; # N1 
        push @{$nContent{$field[1]}}, $field[28]; # N2
    } else {
        push @{$nContent{$field[1]}}, $field[20]; # N
    }
    # Retrieving positions
    push @{$positions{$field[1]}}, $field[46];  # V start position
    push @{$positions{$field[1]}}, $field[47];  # V end position
    if ($vdj) {
        push @{$positions{$field[1]}}, $field[76]; # D start position
        push @{$positions{$field[1]}}, $field[77]; # D end position
    }
    push @{$positions{$field[1]}}, $field[110]; # J start position
    push @{$positions{$field[1]}}, $field[111]; # J end position
}
close($nt_seq_file);

# In that file we retrieve the number of nucleotides that have been deleted.
open(my $junction_file, $junctions_filename) or die("Unable to open $junctions_filename: $!\n");

while(<$junction_file>) {
    next if $. == 1;
    my @field = split /\t/;

    push @{$deletions{$field[1]}}, $field[52];  # V deletions
    if ($vdj) {
        push @{$deletions{$field[1]}}, $field[53]; # 5'D deletions
        push @{$deletions{$field[1]}}, $field[54]; # 3'D deletions
    }
    push @{$deletions{$field[1]}}, $field[61];  # J deletions
}
close($junction_file);

# Read the summary file get the remaining informations (strand and sequence)
open(my $summary_file, $summary_filename) or die("Unable open $summary_filename: $!\n");
while (<$summary_file>) {
    next if $. == 1;
    
    my @field = split /\t/;
    my $sequence = $field[28];

    my @insertion_pos;
    my @values;

    my ($fieldName) = ($field[1] =~ /^([\S]+)/);
    print $output ">".$fieldName."\t";

    # Do we have interesting results?
    if ($field[2] ne 'No results' && defined $positions{$field[1]}) {
        # Insertions are removed from the sequence by IMGT, hence the positions
        # given by IMGT must be corrected so that they correspond to the actual
        # sequence, and not to the insertion-free one
        push @insertion_pos, $-[0] while ($sequence =~ /[ACGT]/g);

        if (@insertion_pos) {
            # print STDERR "pos: ";
            # foreach my $pos (@{$positions{$field[1]}}) {
            #     print STDERR "$pos\t";
            # }
            # print STDERR "\n";
            # print STDERR "$field[1]\t";
            # foreach my $pos (@insertion_pos) {
            #     print STDERR "$pos\t";
            # }
            # if (@insertion_pos) {
            #     print STDERR "\n";
            # }
            correct_positions(\@{$positions{$field[1]}}, \@insertion_pos);
            # foreach my $pos (@{$positions{$field[1]}}) {
            #     print STDERR "$pos\t";
            # }
            # print STDERR "\n";
        }
            
        # Get the V, D and J
        my @segments;
        push @segments, clean_IMGT_VDJ_markup($field[3]); # V
        if ($vdj) {
            push @segments, clean_IMGT_VDJ_markup($field[13]); # D
        }
        push @segments, clean_IMGT_VDJ_markup($field[9]); # J

        print $output $field[22],"\t"; # strand

        if (length $segments[1] == 0) {
            print $output "V\t";
        } elsif ($vdj) {
            if (length $segments[2] == 1) {
                print $output "VD\t";
            } else {
                print $output "VDJ\t";
            }
        } else {
            print $output "VJ\t";
        }

        # Print the positions
        foreach my $pos (@{$positions{$field[1]}}) {
            if (! defined $pos || length $pos == 0) {
                print $output "?\t";
            } else {
                print $output ($pos-1)."\t";
            }
        }
        
        print $segments[0],"\t";
        
        for (my $i = 1; $i <= 2; $i++) {
            my $j = 0;
            print $output defOrQMark($deletions{$field[1]}[$j++]), "/", 
            defOrQMark($nContent{$field[1]}[$i-1], 0),"/", 
            defOrQMark($deletions{$field[1]}[$j++]),"\t";
            print $output $segments[$i],"\t";
            if ($vj) {
                $i++;
            }
        }
        print $output "\n",split_lines($sequence, $line_length);
    }
    print "\n";
}

close($output);

