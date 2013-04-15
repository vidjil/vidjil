#include "core/tools.h"
#include "core/kmerstore.h"
#include "core/fasta.h"
#include "core/segment.h"
#include "core/cluster-junctions.h"
#include "core/read_score.h"
#include "core/read_chooser.h"
#include "core/msa.h"
#include "core/compare-all.h"
#include "core/teestream.h"
#include "core/html.h"
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

   
  MapKmerStore<Kmer> *junctions = new MapKmerStore<Kmer>(w);


   junctions->insert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT", " ");
   junctions->insert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", " ");
   junctions->insert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG", " ");
   junctions->insert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC", " ");
   
   junctions->insert("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", " ");
   junctions->insert("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTAAA", " ");
   junctions->insert("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTGGG", " ");
   junctions->insert("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTCCC", " ");
   
   junctions->insert("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTT", " ");
   junctions->insert("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGAAAAAAAA", " ");
   junctions->insert("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", " ");
   junctions->insert("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCCCCCCC", " ");
   
   junctions->insert("CCCCCCCCCCCCCCCCCCCCCCCCCTTTTTTTTTTTTTTT", " ");
   junctions->insert("CCCCCCCCCCCCCCCCCCCCCCCCCAAAAAAGCTAAAAAA", " ");
   junctions->insert("CCCCCCCCCCCCCCCCCCCCCCCCCGGGGGGTCTAGGGGG", " ");
   junctions->insert("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCATGCCCCCC", " ");

   
   comp_matrix comp=comp_matrix();
   
   //create matrix using junctions 
   comp.compare(junctions, cout);
   
   //save matrix file 
   comp.save("comp_matrix.data");
   
   //reset matrix 
   comp.del();
   
   //create matrix using matrix file 
   comp.load(junctions,"comp_matrix.data");
 
   //save matrix file 
   comp.save("comp_matrix2.data");
  
   //test clustering

   list <list <junction> > cluster ;


   //0 différence admise / taille mini 10 / 0 cluster possible
   cluster = comp.cluster(junctions, forced_edges, w, cout, 0, 10) ;
   TAP_TEST(cluster.size()==0, TEST_CLUSTER, "no cluster here") ;

   //epsilon 0// taille mini 1 / 16 cluster possible
   cluster = comp.cluster(junctions, forced_edges, w, cout, 0, 1, 0) ;
   TAP_TEST(cluster.size()==16, TEST_CLUSTER, "expected 16 clusters") ;

   //epsilon 1// taille mini 3 / 1 cluster possible
   cluster = comp.cluster(junctions, forced_edges, w, cout, 1, 3, 0) ;
   TAP_TEST(cluster.size()==1, TEST_CLUSTER, "expected 1 cluster") ;   

   //epsilon 3// taille mini 3 / 2 cluster possible
   cluster = comp.cluster(junctions, forced_edges, w, cout, 3, 3, 0) ;
   TAP_TEST(cluster.size()==2, TEST_CLUSTER, "expected 2 clusters") ;   
   
   //epsilon 20 // taille mini 3 / 4 cluster possible
   cluster = comp.cluster(junctions, forced_edges, w, cout, 20, 3, 0) ;
   TAP_TEST(cluster.size()==4, TEST_CLUSTER, "expected 4 clusters") ;   

   //del matrix 
   comp.del();

   delete junctions;    
}

