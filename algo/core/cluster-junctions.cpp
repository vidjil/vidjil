/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011, 2012, 2013, 2014, 2015 by Bonsai bioinformatics 
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/

#include "cluster-junctions.h"
#include<cstdlib>

  bool MySort(const pair<int, string>& lh, const pair<int, string>& rh){
    return lh.second>rh.second;
  }

comp_matrix::comp_matrix(list<pair <junction, size_t> > sc)
{
  sort_clones = sc;
  matrix_size = sort_clones.size();
  if (matrix_size > JUNCTION_LIMIT) matrix_size = JUNCTION_LIMIT;
}

void comp_matrix::compare(ostream &out, Cost cluster_cost)
{
  // DEBUG // out << "  DEBUT COMPARE JUNCTION" << endl ;
  //     clock_t start = clock();
   
  typedef map<junction,list<Sequence> > mjs ;
  
  Cost compareCost = cluster_cost;
  out << "  Using cost " << compareCost << endl ;
  
  string j1, j2;
  m = alloc_matrix(sort_clones.size());
  
  int c=0;
  int c1=0;
  int c2=0;

  size_t i = 0;
  for (list <pair<junction,size_t> >::const_iterator it0 = sort_clones.begin();
    (it0 != sort_clones.end()) & (i<matrix_size); ++it0) 
    {
      i++;
      j1=it0->first;
      
      size_t k = 0;
      for (list <pair<junction,size_t> >::const_iterator it1 = it0;
        (it1 != sort_clones.end()) & (k<matrix_size); ++it1) 
        {
            k++;
            j2=it1->first;
            DynProg dp = DynProg(j1, j2, DynProg::Local, compareCost);
            int score=dp.compute();
            int distance = max(j1.size(), j2.size())-score;
            m[c2][c1]=distance;
            m[c1][c2]=distance;
            c1++;
            c++;
        }//fin it1
      c2++;
      c1=c2;
    }//fin it0

  // DEBUG // out << "  FIN COMPARE JUNCTION ("<<(clock()-start)/1000 <<"ms)" << endl ;
}

void comp_matrix::load(string file){

    
  m = alloc_matrix(sort_clones.size());

  char* tampon=(char*)malloc(sort_clones.size()*sizeof(char));
  ifstream in_comp(file.c_str());
  for(unsigned int i=0; i<sort_clones.size();i++){
    in_comp.read(tampon, sort_clones.size()*sizeof(char));
    for(unsigned int j=0;j<sort_clones.size(); j++){
	m[i][j]=tampon[j];
      }
  }
  free(tampon);

  in_comp.close();

}

void comp_matrix::save(string file){
  
  ofstream out_comp(file.c_str());
  
  for(unsigned int i=0; i<sort_clones.size();i++){
    out_comp.write((char *)m[i],sort_clones.size()*sizeof(char));
  }
  
  out_comp.close();
}
 

void comp_matrix::del(){
  for (unsigned int i=0;i<sort_clones.size();i++){
	free(m[i]);
  }
  free(m);
}

list<list<junction> >  comp_matrix::cluster(string forced_edges, int w, ostream &out, 
					      int epsilon, int minPts)
{
  // out << "  eps: " << epsilon << " / minPts: " << minPts << endl ;
    
    
  typedef map<junction,list<Sequence> > mjs ;

  map <string, map <string, bool> > graph ;
  
////////////////////////
//indexation des voisins
  map <string, list <string> > neighbor;
  string j1, j2;
  n_j=0;
  n_j2=0;
  int c=0;
  int c1=0;
  int c2=0;

  size_t i = 0;
  for (list <pair<junction,size_t> >::const_iterator ite = sort_clones.begin();
    (ite != sort_clones.end()) & (i<matrix_size); ++ite) 
    {
      i++;
      n_j++;
      list <string> voisins ;
      j1=ite->first;
      neighbor[j1]=voisins;
    }
  
  i = 0;
  for (list <pair<junction,size_t> >::const_iterator it0 = sort_clones.begin();
    (it0 != sort_clones.end()) & (i<matrix_size); ++it0) 
      {
      i++;
      j1=it0->first;
      int k=it0->second;
      count[j1]=k;
      n_j2+=k;
      
      size_t j = 0; 
      for (list <pair<junction,size_t> >::const_iterator it1 = sort_clones.begin();
        (it1 != sort_clones.end()) & (j<matrix_size); ++it1) 
      {
        j++;
        j2=it1->first;
        int distance = (int)m[c2][c1];
            
        if (distance <= epsilon){
            neighbor[j1].push_back(j2);
        }
        c1++;
        c++;
        }//fin it1
        c2++;
        c1=0;
      }//fin it0
    
/////////////////////////
//Forced - edges
    if (forced_edges.size())
    {
      ifstream fe(forced_edges.c_str());
  
      if (!fe.is_open())
	{
	  out << "! forced_edges failed: " << endl ;
	}
      else
	{
	  out << "  Using forced edges in '" << forced_edges << "'" << endl ;
	  int nb_forced = 0 ;
	  while (fe.good())
	    {
	      string line ;
	      getline (fe, line);

	      int i = line.find(" ");
	      if (i != (int) string::npos)
		{
		  string junc1 = line.substr(0, i);
		  string junc2 = line.substr(i+1, i);

		  if ((junc1.size() != (size_t)w) || (junc2.size() != (size_t)w))
		    {
		      out <<  "   ! wrong junction size for " ;
		      out << junc1 << " (" << junc1.size() << ") " ;
		      out << junc2 << " (" << junc2.size() << ")" << endl ; 
		      continue ;
		    }

		  nb_forced++ ;
		  graph[junc1][junc2] = true ;
		  neighbor[junc1].push_back(junc2);
		  neighbor[junc2].push_back(junc1);
		}
	    }
	  out << "  <== " << nb_forced << " forced edges" << endl ;
	}
    }
  
////////////////////////
//DEBUT DBSCAN
  list <list < string > > cluster ;
  
   map <string, bool> visit ;
   map <string, bool> clust ;
   int nVoisins;
   
   int noise = 0;
   int nb_comp = 0 ;
   i = 0;
   for (list <pair<junction,size_t> >::const_iterator it0 = sort_clones.begin();
    (it0 != sort_clones.end()) & (i<matrix_size); ++it0) 
    {
      i++;
      j1=it0->first;
      if(visit[j1]==false && clust[j1]==false){
	
	visit[j1]=true;
	
	list <string> voisins1 ;
	voisins1=neighbor[j1];
	voisins1.sort();
	
	nVoisins=0;
	
	for (list<string>::iterator it1 = voisins1.begin();
	it1 != voisins1.end(); ++it1 ) nVoisins+=count[*it1];
	
	if (nVoisins<minPts){
	  //noise
	  noise++;
	}else{
	  
	  nb_comp++;
	  list< pair<int,string> > c;
	  c.push_back(make_pair(count[j1], j1));
	  clust[j1]=true;
	  
	  int flag=0;
	  list<string>::iterator it2 = voisins1.begin();
	  while(flag!=1){

	    string j2=*it2;
	    if (visit[j2]==false){
	      visit[j2]=true;
	      list <string> voisins2 ;
	      voisins2=neighbor[j2];
	      voisins2.sort();
	      
	      nVoisins=0;
	      for (list<string>::iterator it1 = voisins2.begin();it1 != voisins2.end();
	      ++it1 )nVoisins+=count[*it1];
	      //si la junction possede assez de voisins
	      if (nVoisins>=minPts){
		//on ajoute ses voisins a la liste des voisins du cluster
		voisins1.merge(voisins2);
		voisins1.unique();
		
		//on replace l'iterateur au bon endroit sur la liste des voisins
		it2=voisins1.begin();
		while(j2.compare(*it2)!=0){
		  it2++;
		}
		
		//on ajoute la junction au cluster
		if (clust[j2]!=true){
		  clust[j2]=true;
		  c.push_back(make_pair(count[j2], j2));
		  j1=j2;
		}
	      }
	    }
	    it2++;
	    if ( it2 == voisins1.end() ) flag=1;
	    
	  }
	  
	  //on ajoute les voisins du cluster(qui ne sont pas deja clusterisé par d'autre cluster) dans le cluster
	  for (list<string>::iterator it1 = voisins1.begin();it1 != voisins1.end();++it1 ){
	    string j1=*it1;
	    if (clust[j1]==false){
	      clust[j1]=true;
	      c.push_back(make_pair(count[j1], j1));
	    }
	  }
	  
	  //avant d'ajouter le cluster a la liste on trie les junctions 
	  c.sort();
	  list< string > c2;
	  
	  for (list< pair<int,string> >::iterator c_it = c.begin(); c_it != c.end();
	      ++c_it ){
	    pair<int,string> pair=*c_it;
	  c2.push_back(pair.second);
	  }
	  c2.reverse();
	  cluster.push_back(c2);
	}
      }
    }//fin it0
    
    return cluster;
    
}

void comp_matrix::stat_cluster( list<list<junction> > cluster, ostream &out )
{
    int n_cluster=0;			//nombre de cluster
    int n_100cluster=0;			//nombre de cluster de taille superieur a 100
    int max_size=0;			//taille du plus gros cluster
    int n_jc=0;				//nombre de junction unique clusterisé
    float jc=0;				//nombre de junction unique clusterisé(%)
    int n_j2c=0;			//nombre de junction clusterisé
    float jc2=0;			//nombre de junction clusterisé(%)
    float moy=0;			//taille moyenne des clusters
    
    //recherche du plus gros cluster
   for (list <list <string> >::iterator it = cluster.begin();
    it != cluster.end(); ++it )
    {
      list<string> li=*it;
      n_cluster++;
      int size=0;
      
      for (list<string>::iterator it2 = li.begin();
      it2 != li.end(); ++it2 )
      {
	n_jc++;
	size +=count[*it2];
      }
      
      n_j2c+=size;
      
      if (size> max_size) max_size=size;
      
      if (size>=100) {
	n_100cluster++;
      }
      
    }

      if(n_j2c!=0)
	moy=n_j2c/n_cluster;
    
      return; 
      /* The following, if useful, should not be written to a hard-coded out/ directory */

      ofstream stat;
      stat.open("out/stat.txt");
      
      stat << n_cluster <<" ";		//nombre de cluster
      out << "    clusters 		: "<< n_cluster << endl ;
      
      stat << n_100cluster <<" ";	//nombre de cluster de taille > a 100
      out << "    clusters with size >= 100       : "<< n_100cluster << endl ;

      stat << max_size <<" ";		//taille du plus gros cluster		
      out << "    size of the biggest cluster 	: "<< max_size << endl ;
            
      stat << moy <<" ";			//taille moyenne des clusters		
      out << "    average size of clusters 	: "<< (int)moy << endl ;
                        
      stat << n_j <<" ";			//nombre de junction 
      out << "    junctions 		: "<< n_j << endl ;

      stat << n_jc <<" ";		//nombre de junction clusterisé
      if (n_j!=0) jc= ((n_jc*100)/n_j);
      stat << jc <<" ";
      out << "    clusterised junctions 	: "<< n_jc << " (" << jc << "%)" << endl ;

      stat << n_j2 <<" ";		//nombre d'occurrence
      out << "    occurrences 	        : "<< n_j2 << endl ;

      stat << n_j2c <<" ";		//nombre d'occurrence clusterisé
      if (n_j2!=0)  jc2= ((n_j2c*100)/n_j2);
      stat << jc2 <<" ";
      out << "    clusterised occurrences	: "<< n_j2c << " (" << jc2 << "%)" << endl ;
  
}

JsonArray comp_matrix::toJson(list<list<junction> > clusterList)
{
    JsonArray result;
    
    for (list <list <string> >::iterator it = clusterList.begin();
    it != clusterList.end(); ++it )
    {
      list<string> li=*it;
      
      if (li.size() > 1 ){ 
        JsonArray cluster;
        for (list<string>::iterator it2 = li.begin();
        it2 != li.end(); ++it2 )
        {
            cluster.add(*it2);
        }
        result.add(cluster);
      }
    }
    
    return result;
}

char **comp_matrix::alloc_matrix(size_t s) {
  char **matrix = (char**)malloc(s*sizeof(char*));
  for (size_t i=0;i<s;i++){
    matrix[i]=(char *)malloc(s*sizeof(char));
  }
  return matrix;
}
