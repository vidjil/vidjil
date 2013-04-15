
#include <fstream>
#include <iostream>
#include <string>
#include <map>
#include <list>
#include <ctime>
#include "dynprog.h"
#include "kmerstore.h"


using namespace std ;

typedef string junction ;

#define SIMILAR_JUNCTIONS_THRESHOLD 1

#define GRAPH_FILE "./out/graph.dot" // TODO: use out_dir from main

class comp_matrix {
  public:
    char ** m;
    int size;
    
    /**
    * create new distance matrix
    */
    comp_matrix();
        
    /**
    * init matrix with a KmerStore and compute distance value between sequences
    * @param junctions: a MapKmerStore containing sequences to be compared
    * @param out: exit for log
    */
    void compare(MapKmerStore<Kmer> *junctions, ostream &out);
    
    /**
    * init matrix with a previous run stored 
    * @param junctions: a MapKmerStore containing sequences
    * @param file: a file containing the distance value between sequences
    */
    void load(MapKmerStore<Kmer> *junctions, string file);
    
    /**
    * store matrix in a file for future use
    * @param file: a filename to store the distance value between sequences
    */
    void save( string file);
    
    /**
    * @return cluster 
    * @param junctions: a MapKmerStore containing sequences to be clusterized
    * @param forced_edges: force some sequences to be in the same cluster
    * @param w: junctions size
    * @param out: exit for log
    * @param epsilon: maximum neighborhood distance 
    * @param minPts: minimum neighbors required 
    */
    list<list<junction> >  cluster(MapKmerStore<Kmer> *junctions, 
					string forced_edges="",
					int w=0,ostream &out=cout,
					int epsilon=1, int minPts=10,
					int verbose=0);
    
    /**
    * reset state 
    */
    void del();
};


int total_nb_reads (list<junction> clone, map <string, list<Sequence> > seqs_by_junction);

