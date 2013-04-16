
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
  Fasta seqV("../../germline/IGHV.fa", 2);
  Fasta seqD("../../germline/IGHD.fa", 2);
  Fasta seqJ("../../germline/IGHJ.fa", 2);
  
  Fasta data("../../data/Stanford_S22.fasta", 1, " ");
      
	//segmentation VJ
        FineSegmenter s(data.read(2), seqV, seqJ, 0, 40);
	
	TAP_TEST(s.isSegmented(), TEST_SEGMENT_POSITION, "is segmented") ;
	if (s.isSegmented()){
	  cout << s.info << endl << endl ;
	}
	TAP_TEST(s.getRight()==202, TEST_SEGMENT_POSITION, "J position") ;
	
	TAP_TEST((s.getRight()-s.getLeft())==32, TEST_SEGMENT_POSITION, "size n") ;
	
	//segmentation D
	s.FineSegmentD(seqV, seqD, seqJ);
	
	if (s.isSegmented()){
	  cout << s.info << endl << endl ;
	}
	TAP_TEST(s.getRight()==207, TEST_SEGMENT_POSITION, "overlap resizing") ;
	
	TAP_TEST((s.getRight()-s.getLeft())==37, TEST_SEGMENT_POSITION, "n resizing") ;
}

