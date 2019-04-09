#!/usr/bin/env python
# #-*- coding: utf-8 -*-

# ===============================
# Script by Florian Thonier
# florian.thonier@inria.fr
# ===============================
from __future__   import division
from __future__   import print_function
from optparse     import OptionParser
from collections  import defaultdict
import operator
import math
import json
import sys

# ===============================



#########################
######  VidjilRep   #####
#########################
class Morisita(object):
    # def __init__(self, fiName, path="./", germlineFilter=[], incomplete=1, topClones=100, filtreTag=0, filtreProd=0, autocat=0, verbose=1):
    def __init__(self, fiName, verbose=False):
        self.fiName = fiName
        self.foName = fiName.replace(".vidjil", "_morisita.vidjil")
        self.fi     = open(self.fiName, "r")
        self.fo     = open(self.foName, "w")

        try:
            self.data = json.load(self.fi)
            if verbose:  # pragma: no cover
                print("json loaded")
        except:  # pragma: no cover
            print("Error 10 : vidjil json file cannot be loaded")
            raise SystemError


        print("Il y a %s clones [%s]" % (len(self.data["clones"]), fiName))
        self.computeMorisita()
        self.export_result(self.fo)
        return


    # def __str__(self):
    #     return "Repertoire : %s\nVersion : %s; timestamp : %s\nProducer : %s\nContient %s clones." % (
    #     self.name, self.version, self.timestamp, self.producer, len(self.clones))

    # def __unicode__(self):
    #     return "Repertoire : %s\nVersion : %s; timestamp : %s\nProducer : %s\nContient %s clones." % (
    #     self.name, self.version, self.timestamp, self.producer, len(self.clones))

    # def __repr__(self):
    #     return "Repertoire : %s\nVersion : %s; timestamp : %s\nProducer : %s\nContient %s clones." % (
    #     self.name, self.version, self.timestamp, self.producer, len(self.clones))

    def computeMorisita(self):
        """ Permet de donner un filtre.
        Celui-ci doit être au format dico, ou chaque entrée correspond à un attribut des clones, et son contenu a une valeur (ou une liste de valeurs) de ce champs. """
        # compute number total of reads; before
        
        morisita  = defaultdict( lambda: defaultdict( lambda: False ) )
        jaccard   = defaultdict( lambda: defaultdict( lambda: False ) )
        nb_sample = self.data["samples"]["number"]
        

        for pos_0 in range(0, nb_sample):
            for pos_1 in range(0, nb_sample):
                morisita[pos_0][pos_1] = self.compute_one_morisita(pos_0, pos_1)
                jaccard[pos_0][pos_1]  = self.compute_one_Jaccard_index(pos_0, pos_1)
        self.data["morisita"] = morisita
        self.data["jaccard"]  = jaccard
        return


    def compute_one_morisita(self, pos_0, pos_1):
        index_div = "index_Ds_diversity"
        clones    = self.data["clones"]
        reads     = self.data["reads"]["segmented"]
        
        
        """
        #  Indice de similarité de Morisita-Horn (Morisita-Horn index)
        # Contrairement aux indices de similarité de Sørensen et de Jaccard qui s’appliquent sur les données 
        # de présence-absence, l’indice de similarité de Morisita-Horn s’applique aux données quantitatives. 
        # Il permet d’évaluer la similarité entre les différents groupes et n’est pas influencé par la richesse 
        # spécifique et l’effort d’échantillonnage. Sa formule est :
        #     CMH = 2 ∑▒((ai x bi))/((da+db)x(Na x Nb))                               
        # da = ∑ai2/Na2
        # db = ∑bi2/Nb2
        # Na = nombre total d’individus au site a
        # Nb = nombre total d’individus au site b 
        # ai = nombre d’individus de l’espèce i au site a
        # bi = nombre d’individus de l’espèce i au site b
        # Sa valeur est comprise entre 0 (communautés dissemblables) et 1 (similarité maximale). 
        # Deux groupes sont semblables (faible diversité) si la valeur de CMH est supérieure à 0,5 et 
        # dissemblables si cette valeur est inférieure à 0,5 (diversité élevée).
        """

        m  = 0
        da = 0
        db = 0
        Na = reads[pos_0] * reads[pos_0]
        Nb = reads[pos_1] * reads[pos_1]

        for clone in clones:
            ai = clone["reads"][pos_0]
            bi = clone["reads"][pos_1]
            m  += (ai * bi)
            da += ( (ai*ai)  / Na )
            db += ( (bi*bi)  / Nb )

        m *= 2
        d = ( (da/Na)+(db/Nb))*(Na*Nb)
        m = m/d

        return m


    def compute_one_Jaccard_index(self, pos_0, pos_1):
        """
        Indice de similarité de Jaccard (Jaccard index)
        Définit la similitude comme étant l’importance de remplacement des espèces 
        ou les changements biotiques à travers les gradients environnementaux. 
        Il permet une comparaison entre deux sites, car il évalue la ressemblance entre deux relevés
        en faisant le rapport entre les espèces communes aux deux relevés et celles propres à chaque relevé. 
        Il a pour formule :
            I = Nc / (N1 + N2 - Nc)
        Nc : nombre de taxons commun aux stations 1 et 2
        N1 et N2 : nombre de taxons présents respectivement aux stations 1 et 2
        Cet indice I varie de 0 à 1 et ne tient compte que des associations positives. 
        Si l’indice I augmente, un nombre important d’espèces se rencontre dans les deux habitats 
        evoquant ainsi que la biodiversité inter habitat est faible (conditions environnementales similaires
        entre les habitats). Dans le cas contraire, si l’indice diminue, seul un faible nombre d’espèces
        est présent sur les deux habitats. Ainsi, les espèces pour les deux habitats comparés sont 
        totalement différentes indiquant que les différentes conditions de l’habitat déterminent un 
        turn-over des espèces importantes.
        """
        clones    = self.data["clones"]
        reads     = self.data["reads"]["segmented"]
        N1 = self.get_nb_species_of_sample(pos_0)
        N2 = self.get_nb_species_of_sample(pos_1)

        Nc = 0
        for clone in clones:
            ai = clone["reads"][pos_0]
            bi = clone["reads"][pos_1]
            Nc  += bool(ai * bi)
        # print( "Nc: %s" % Nc)

        I = Nc / (N1 + N2 - Nc)
        return I

    def export_result(self, fo):
        # fo = open(foname, "w")
        json.dump(self.data, fo, sort_keys=True, indent=4, ensure_ascii=False)
        return

    def get_nb_species_of_sample(self, pos):
        X = 0 
        for clone in self.data["clones"]:
            if clone["reads"][pos]:
                X += 1
        return X
# ===============================
if __name__ == '__main__':  # pragma: no cover


    verbose = 1
    description  = "\nCalcul divers indice de similarité et d'overlap entre les sample d'un fichier vidjil."
    description += "\nPour l'instant sur la version 2016a des fichier vidjil."
    
    DEFAULT_verbose   = False
    DEFAULT_TOP_CLONE = 0  # nb max de clones a travailler

    usage = "Compilation d'analyses d'assignations effectuees par Vidjil pour differentes iterations.\n"
    usage += "usage: python %prog [options] -i $path"
    parser = OptionParser(usage=usage)

    ### Options ###
    parser.add_option("-v", "--verbose", action="store_true",
                      dest="verbose", default=DEFAULT_verbose,
                      help="make lots of noise  (%(DEFAULT_verbose)s)." % vars())
    parser.add_option("-t", "--topclone", default=DEFAULT_TOP_CLONE)
                      
    ## Obligations
    parser.add_option("-i", "--vidjil", default=False,
                      metavar="PATH", help="Vidjil file to use")
    


    ### Getter des options ###
    argv = sys.argv
    (options, argv) = parser.parse_args(argv)


    # GERMLINE_FILTER = []
    INPUT_REP       = options.vidjil

    # vprint(title="top clone",       variable=TOP_CLONE)

    vdjfi = Morisita(INPUT_REP)


