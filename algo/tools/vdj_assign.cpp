
#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include <stdlib.h>   
#include <core/dynprog.h>
#include <core/segment.h>

using namespace std;

#define GENE_ALIGN 20

#define V_COLOR "\033[1;42m"
#define J_COLOR "\033[1;43m"
#define NO_COLOR "\033[0m"

void usage(int argc, const char **argv) {
  if (argc != 5) {
    cerr << "Usage: " << argv[0] << " <sequence> <germline> <V gene> <J gene>" << endl << endl;
    cerr << "If <sequence> is - the sequence is read on STDIN, until a blank line." << endl;
    cerr << "Example: "<< argv[0] << " CGCCTGGATGAGCTGGGTCCGCCAGGCTCCAGGGAAGGGGCTGGAGTGGGTTGGCCGTATTAAAAGCAAAACTGATGGTGGGACAACAGACTACGCTGCACCCGTGAAAGGCAGATTCACCATCTCAAGAGATGATTCAAAAAACACGCTGTATCTGCAAATGAACAGCCTGAAAACCGAGGACACAGCCGTGTATTTTTTCCCCTAGTGGTTGCCCCTTTGACTACTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGTAAGCCCTATAGTGAGTCGTATTA ../../germline/IGH IGHV3-15*01 IGHJ4*02" << endl;
    cerr << "Example: "<< argv[0] << " - ../../germline/IGH \"IGHV3-15*01\" \"IGHJ4*02\" <<< \"CGCCTGGATGAGCTGGGTCCGCCAGGCTCCAGGGAAGGGGCTGGAGTGGGTTGGCCGTATTA" << endl << "AAAGCAAAACTGATGGTGGGACAACAGACTACGCTGCACCCGTGAAAGGCAGATTCACCATCTCAAGAGATGATTCAAAAAACACGCTGTATCTGCAAATGAACAGCCTGAAAA" << endl << "CCGAGGACACAGCCGTGTATTTTTTCCCCTAGTGGTTGCCCCTTTGACTACTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGTAAGCCCTATAGTGAGTCGTATTA\"" << endl;
    exit(1);
  }
}

Fasta extractInterestingGenes(Fasta &repertoire, string name) {
  Fasta interesting;
  
  int size = repertoire.size();
  for (int i = 0; i < size; i++) {
    if (repertoire.label(i).find(name) != string::npos) {
      interesting.add(repertoire.read(i));
    }
  }

  return interesting;
}

string read_sequence(istream &in) {
  string current_line="";
  string read = "";
  getline(in, current_line);
  while (current_line != "") {
    read += current_line;
    getline(in, current_line);
  }
  return read;
}

int main(int argc, const char** argv)
{
  usage(argc, argv);

  string read = argv[1];
  string germline = argv[2];

  Fasta Vgenes(germline+"V.fa", 2, "|");
  Fasta Jgenes(germline+"J.fa", 2, "|");

  Fasta interestingV = extractInterestingGenes(Vgenes, argv[3]);
  Fasta interestingJ = extractInterestingGenes(Jgenes, argv[4]);

  if (interestingV.size() == 0) {
    cerr << "No interesting V found" << endl;
    exit(2);
  }
  if (interestingJ.size() == 0) {
    cerr << "No interesting J found" << endl;
    exit(2);
  }

  AlignBox box_V("5", V_COLOR);
  AlignBox box_J("3", J_COLOR);

  if (read == "-") {
    // Read on stdin
    read = read_sequence(cin);
  }
  
  align_against_collection(read, interestingV, -1, false, false, false, &box_V, VDJ);
  align_against_collection(read, interestingJ, -1, false, true, false, &box_J, VDJ);
  // This should be handled directly into align_against_collection
  box_J.start = box_J.end ;
  box_J.del_left = box_J.del_right;
  box_J.end = read.size() - 1;
  
  int align_V_length = min(GENE_ALIGN, box_V.end - box_V.start + 1);
  int align_J_length = min(GENE_ALIGN, (int)read.size() - box_J.start + 1);
  int start_V = box_V.end - align_V_length + 1;
  int end_J = box_J.start + align_J_length - 1;

  cout << "read        \t" << start_V << "\t" ;

  cout << V_COLOR << read.substr(start_V, align_V_length)
       << NO_COLOR
       << read.substr(box_V.end+1, (box_J.start - 1) - (box_V.end + 1) +1)
       << J_COLOR
       << read.substr(box_J.start, align_J_length)
       << NO_COLOR
       << "\t" << end_J << endl ;

  cout << box_V.refToString(start_V, end_J) << "\t" << box_V << endl ;
  cout << box_J.refToString(start_V, end_J) << "\t" << box_J << endl ;
      
  exit (0);
}
