
#include <fstream>
#include <iostream>
#include <stdio.h>
#include <string.h>
#include <cstdlib>
#include <core/dynprog.h>
#include <core/fasta.h>

using namespace std;


int main(int argc, char* argv[])
{
  //initilisation par defaut
  const char* fdata_default = "data/leukemia.fa" ; 
  DynProg::DynProgMode dpMode = DynProg::Local;
  Cost dpCost = VDJ;
  int maxIteration = 9999999;
  int optionbegin = 1;
  int s=0;
  int s2=0;
  

  
  const char* fdata1 = fdata_default;
  const char* fdata2 = fdata_default;
  
  //initialisation
  if ( argc > 1 && argv[1][0] != '-'){
    fdata1 = argv[1];
    fdata2 = argv[1];
    optionbegin++;
    if ( argc > 2 && argv[2][0] != '-'){
      fdata2 = argv[2];
      optionbegin++;
    }
  }
  
  for (int i = optionbegin ; i < argc ; i++ ){
    const char opt = strlen(argv[1])>1 ? argv[i][1] : 'e' ;
    
    switch(opt)
    {
      int mode,cost;
      case 'e': 
	cout << argv[i] << " << argument invalide" << endl ;
	break;
      case 'h':
	cout 	<< " usage :" << endl
		<< " inputFile ( 2 maximum, default: " << fdata_default <<  " : "<<endl
		<< " 	si un seul fichier :" << endl
		<< " 		compare une sequence du fichier a toutes les autres" << endl
		<< " 	si 2 fichiers :" << endl
		<< " 		compare une sequence du premier fichier a celles du second" << endl<<endl
		<< " option : " << endl
		<< "	-h 	help " << endl<<endl
		<< "	-s 	sequences 	( choix des séquences a comparer) " << endl
		<< "		par defaut la premiere sequence du premier fichier comparé a toute les sequences du second " << endl
		<< "		si un seul fichier passé en parametre fichier 1 = fichier 2" << endl
		<< "	     exemple : 		 	"<<endl
		<< "		./align f1 -s 5		compare la sequence 5 de f1 a toute les sequences de f1" << endl
		<< "		./align f1 -s 5 8	compare les sequences 5 et 8 de f1" << endl
		<< "		./align f1 f2 -s 5 	compare la sequence 5 de f1 a toute les sequences de f2" << endl
		<< "		./align f1 f2 -s 5 8	compare la sequence 5 de f1 a la sequence 8 de f2" << endl<< endl
		<< "	-i	Iteration 	( par defaut : effectue toutes les comparaisons ) " << endl
		<< "	     exemple :	 	"<<endl
		<< "		./align f1 f2 -i 5	compare la premiere sequence de f1 aux 5 premieres de f2" << endl
		<< "		./align f1 f2 -s 5 8 -i 5	compare la sequence 5 de f1 aux sequence 8,9,10,11,12 de f2" <<endl<< endl
		<< " 	-m	mode 		( Local par defaut )" << endl
		<< "		1  	Local " << endl
		<< "		2  	LocalEndWithSomeDeletions " << endl
		<< "		3  	SemiGlobalTrans " << endl
		<< "		4  	SemiGlobal " << endl
		<< "		5  	Global " << endl<<endl
		<< "	-c	cost 		( VDJ par defaut)" << endl
		<< "		1	DNA" << endl
		<< "		2	VDJ" << endl
		<< "		5	IdentityDirty" << endl
		<< "		6	Hamming" << endl
		<< "		7	Levenshtein" << endl
		<< "		8	Cluster" << endl
		<<endl;

	exit(1);
      case 's':
	s=atoi(argv[i+1]);
	if (argc > i+2){
	  if (argv[i+2][0] != '-'){
	    s2 = atoi(argv[i+2]);
	    maxIteration=1;
	    i++;
	  }
	}
	i++;
	break;
      case 'm':
	mode=atoi(argv[i+1]);
	if ( mode == 1) dpMode = DynProg::Local;
	if ( mode == 2) dpMode = DynProg::LocalEndWithSomeDeletions;
	if ( mode == 3) dpMode = DynProg::SemiGlobalTrans;
	if ( mode == 4) dpMode = DynProg::SemiGlobal;
	if ( mode == 5) dpMode = DynProg::Global;
	i++;
	break;
      case 'i':
	maxIteration=atoi(argv[i+1]);
	i++;
	break;
      case 'c':
	cost=atoi(argv[i+1]);
	if ( cost == 1) dpCost = DNA;
	if ( cost == 2) dpCost = VDJ;
	if ( cost == 5) dpCost = IdentityDirty;
	if ( cost == 6) dpCost = Hamming;
	if ( cost == 7) dpCost = Levenshtein;
	if ( cost == 8) dpCost = Cluster;	
	i++;
	break;
      default:
	cout << argv[i] << " << argument invalide" << endl ;
    }
    
  }

  Fasta f(fdata1, 1, " ");
  Fasta f2(fdata2, 1, " ");
  
  cout << "" << endl;
  
  if (f.size() <= s)
    {
      cout << " ERROR : la sequence "<< s << " n'existe pas dans " << fdata1 << endl ;
      exit(1);
    }
  string seq0 = f.sequence(s);
  
    if (f2.size() <= s2)
    {
      cout << " ERROR : la sequence "<< s2 << " n'existe pas dans " << fdata2 << endl ;
      exit(1);
    }
  string seq1 = f2.sequence(s2);

  int max = s2 + maxIteration;
  for (  ; (s2 < f2.size() && s2 < max); s2++ ){
    
    seq1 = f2.sequence(s2);
    DynProg dp = DynProg(seq0, seq1, dpMode, dpCost);

    dp.compute(); 
    dp.backtrack();
    
    cout <<"|-------------------------------------------------------------------------------|"<<endl;
    cout <<"| "<<s<<"/"<<s2 <<"	|	" << f.label(s)<< " V/S " << f2.label(s2) << " 	|"<< endl<<endl;
    cout << dp.str_back << endl;
    
  }
}
