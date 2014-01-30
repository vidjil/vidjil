#include "core/tools.h"
#include "core/windows.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/cluster-junctions.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/msa.h"
#include "core/compare-all.h"
#include "core/teestream.h"
#include "core/mkdir.h"
#include "core/labels.h"
#include <iostream>
#include <fstream>
#include <cassert>
#include <string>
#include <cstdlib>
using namespace std;


void testCluster() {

  int w=40;
   string forced_edges = "" ;

   map<string, string> labels;
   WindowsStorage windows = WindowsStorage(labels);

   Sequence seq = {"", "", "", ""};

   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT", seq);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", seq);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG", seq);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC", seq);
   
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", seq);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTAAA", seq);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTGGG", seq);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTCCC", seq);
   
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTT", seq);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAA", seq);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", seq);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCCCCCCC", seq);
   
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCTTTTTTTTTTTTTTT", seq);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCAAAAAAGCTAAAAAA", seq);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCGGGGGGTCTAGGGGG", seq);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCATGCCCCCC", seq);

   
   comp_matrix comp=comp_matrix(windows);
   
   //create matrix using junctions 
   comp.compare( cout, Cluster);
   
   //save matrix file 
   comp.save("comp_matrix.data");
   
   //reset matrix 
   comp.del();
   
   //create matrix using matrix file 
   comp.load("comp_matrix.data");
 
   //save matrix file 
   comp.save("comp_matrix2.data");
  
   //test clustering

   list <list <junction> > cluster ;


   //0 différence admise / taille mini 10 / 0 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 0, 10) ;
   TAP_TEST(cluster.size()==0, TEST_CLUSTER, "no cluster here") ;

   //epsilon 0// taille mini 1 / 16 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 0, 1) ;
   TAP_TEST(cluster.size()==16, TEST_CLUSTER, "expected 16 clusters") ;

   //epsilon 1// taille mini 3 / 1 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 1, 3) ;
   TAP_TEST(cluster.size()==1, TEST_CLUSTER, "expected 1 cluster") ;   

   //epsilon 3// taille mini 3 / 2 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 3, 3) ;
   TAP_TEST(cluster.size()==2, TEST_CLUSTER, "expected 2 clusters") ;   
   
   //epsilon 20 // taille mini 3 / 4 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 20, 3) ;
   TAP_TEST(cluster.size()==4, TEST_CLUSTER, "expected 4 clusters") ;   

   //del matrix 
   comp.del();

}

