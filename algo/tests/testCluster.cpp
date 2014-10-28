#include "core/tools.h"
#include "core/windows.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/cluster-junctions.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/compare-all.h"
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

   Sequence seq = {"", "", "", "", NULL};

   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT", seq, 0, 0);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", seq, 0, 0);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG", seq, 0, 0);
   windows.add("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC", seq, 0, 0);
   
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", seq, 0, 0);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTAAA", seq, 0, 0);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTGGG", seq, 0, 0);
   windows.add("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTCCC", seq, 0, 0);
   
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTT", seq, 0, 0);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAA", seq, 0, 0);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", seq, 0, 0);
   windows.add("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCCCCCCC", seq, 0, 0);
   
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCTTTTTTTTTTTTTTT", seq, 0, 0);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCAAAAAAGCTAAAAAA", seq, 0, 0);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCGGGGGGTCTAGGGGG", seq, 0, 0);
   windows.add("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCATGCCCCCC", seq, 0, 0);

   windows.sort();
   list<pair <junction, int> > sort_clones = windows.getSortedList();
   
   comp_matrix comp=comp_matrix(sort_clones);
   
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
   TAP_TEST(cluster.size()==0, TEST_CLUSTER, 
            "no cluster here (cluster.size()=" <<cluster.size() << ")" ) ;

   //epsilon 0// taille mini 1 / 16 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 0, 1) ;
   TAP_TEST(cluster.size()==16, TEST_CLUSTER, "expected 16 clusters (cluster.size()=" <<cluster.size() << ")") ;

   //epsilon 1// taille mini 3 / 1 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 1, 3) ;
   TAP_TEST(cluster.size()==1, TEST_CLUSTER, "expected 1 cluster (cluster.size()=" <<cluster.size() << ")") ;

   //epsilon 3// taille mini 3 / 2 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 3, 3) ;
   TAP_TEST(cluster.size()==2, TEST_CLUSTER, "expected 2 clusters (cluster.size()=" <<cluster.size() << ")") ;
   
   //epsilon 20 // taille mini 3 / 4 cluster possible
   cluster = comp.cluster(forced_edges, w, cout, 20, 3) ;
   TAP_TEST(cluster.size()==4, TEST_CLUSTER, "expected 4 clusters (cluster.size()=" <<cluster.size() << ")") ;

   //del matrix 
   comp.del();

}

