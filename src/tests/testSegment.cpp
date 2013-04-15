
#include <fstream>
#include <iostream>
#include <string>
#include "core/kmerstore.h"
#include "core/dynprog.h"
#include "core/fasta.h"
#include "core/segment.h"

using namespace std;

void testSegment()
{
  Fasta seqV("../../germline/IGHV.fa");
  Fasta seqD("../../germline/IGHD.fa");
  Fasta seqJ("../../germline/IGHJ.fa");
  
  Fasta data("../../data/Stanford_S22.fasta", 1, " ");
      
	//segmentation VJ
        FineSegmenter s(data.read(2), seqV, seqJ, 0, 40);
	
	TAP_TEST(s.isSegmented(), TEST_CLUSTER, "is segmented") ;
	if (s.isSegmented()){
	  cout << s.info << endl << endl ;
	}
	TAP_TEST(s.getRight()==202, TEST_CLUSTER, "J position") ;
	
	TAP_TEST((s.getRight()-s.getLeft())==32, TEST_CLUSTER, "size n") ;
	
	//segmentation D
	s.FineSegmentD(seqV, seqD, seqJ);
	
	if (s.isSegmented()){
	  cout << s.info << endl << endl ;
	}
	TAP_TEST(s.getRight()==204, TEST_CLUSTER, "overlap resizing") ;
	
	TAP_TEST((s.getRight()-s.getLeft())==34, TEST_CLUSTER, "n resizing") ;
}

