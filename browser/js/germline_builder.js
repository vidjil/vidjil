/*
 * This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
 * Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr> and the Vidjil Team
 * Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */

function Germline (model) {
    this.m = model
}

Germline.prototype = {
    
    init : function(){
        this.allele = {};
        this.gene = {};
        this.system = ""
    },
    
    /*
     * system (igh/trg) / type (V,D,J)
     * */
    load : function (system, type) {
        var self = this;
        this.init()
        
        this.system = system
        var name = system+type
        name = name.toUpperCase()
        
        if (typeof germline[name] != 'undefined'){
            this.allele = germline[name]
        }else{
            return
        }
        this.gene = {}

        //reduce germline size (keep only detected genes)
        //and add undetected genes 
        var g = {}
        for (var i=0; i<this.m.windows.length; i++){
            if (typeof this.m.windows[i][type] != "undefined" 
                && typeof this.m.windows[i][type][0] != "undefined"){
                var gene=this.m.windows[i][type][0];
                if (this.m.system != "multi" || this.m.windows[i].system == system){
                    if ( typeof this.allele[gene] !="undefined"){
                        g[gene] = this.allele[gene]
                    }else{
                        g[gene] = "unknow sequence"
                    }
                }
            }
        }
        this.allele = g
        
        //On trie tous les élèment dans germline, via le nom des objets
        var tmp1 = [];
        tmp1 = Object.keys(this.allele).slice();
        mySortedArray(tmp1);
        var list1 = {};
        //Pour chaque objet, on fait un push sur this.allele
        for (var i = 0; i<tmp1.length; i++) {
            list1[tmp1[i]] = this.allele[tmp1[i]];
        }
        this.allele = list1;
        console.log(system +"  "+ type)
        
        
        //color
        var key = Object.keys(list1);
        if (key.length != 0){
            var n = 0,
                n2 = 0;
            var elem2 = key[0].split('*')[0];
            for (var i = 0; i < key.length; i++) {
                var tmp = this.allele[key[i]];
                this.allele[key[i]] = {};
                this.allele[key[i]].seq = tmp;
                this.allele[key[i]].color = colorGenerator((30 + (i / key.length) * 290),
                    color_s, color_v);

                var elem = key[i].split('*')[0];
                if (elem != elem2) {
                    this.gene[elem2] = {};
                    this.gene[elem2].n = n2;
                    this.gene[elem2].color = colorGenerator((30 + ((i - 1) / key.length) * 290),
                        color_s, color_v);
                    this.gene[elem2].rank = n;
                    n++;
                    n2 = 0;
                }
                elem2 = elem;
                this.allele[key[i]].gene = n
                this.allele[key[i]].rank = n2
                n2++;
            }
            this.gene[elem2] = {};
            this.gene[elem2].n = n2;
            this.gene[elem2].rank = n
            this.gene[elem2].color = colorGenerator((30 + ((i - 1) / key.length) * 290),
                color_s, color_v);
        }
    }
}