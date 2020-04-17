/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
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

/** 
 * GermlineList - store a raw list of germline unsorted and unfiltered
 * @class GermlineList
 * @constructor 
 * */
function GermlineList () {
    this.list = {};
    this.load();
}


GermlineList.prototype = {
    
    /**
    * retrieve the default germline list from server <br>
    * germline.js contain a copy of the germline list used if the server is unavailable
    * */
    load : function () {
        this.list = germline_data.systems;
    },
    
    /**
    * add a list of germlines to the default germline list<br>
    * list {object[]} list 
    * */
    add : function (list) {
        for ( var key in list ) {
            this.list[key] = list[key];
        }
    },
    
    /**
     * return the color of a certain germline/system
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @return {string} color
     * */
    getColor: function (system) {
        if (typeof this.list[system] != 'undefined' && typeof this.list[system].color != 'undefined' ){
            return this.list[system].color;
        }else{
            return "";
        }
    },
    
    /**
     * return the shortcut of a certain germline/system
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @return {string} shortcut
     * */
    getShortcut: function (system) {
        if (typeof this.list[system] != 'undefined' && typeof this.list[system].shortcut != 'undefined' ){
            return this.list[system].shortcut;
        }else{
            return "x";
        }
    },
};


/** 
 * Germline object, contain the list of genes/alleles for a germline <br>
 * compute some information for each gene(rank/color) and order them <br>
 * use a model GermlineList object
 * @param {Model} model - 
 * @class Germline
 * @constructor 
 * */
function Germline (model) {
    this.m = model;
    this.allele = {};
    this.gene = {};
    this.labels = {};
    this.labelsWithAlleles = {};
    this.system = "";
}

Germline.prototype = {
    
    /**
     * load the list of gene <br>
     * reduce germline size (keep only detected genes in clones) <br>
     * and add undetected genes (missing from germline)
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @param {string} type - V,D or J
     * @param {function} callback
     * */
    load : function (system, type, callback) {
        var self = this;
        
        this.system = system;
        name = name.toUpperCase();
        
        this.allele = {};
        this.gene = {};
        this.labels = {};
        this.labelsWithAlleles = {};
        
        var type2;
        if (type=="V") type2="5";
        if (type=="D") type2="4";
        if (type=="J") type2="3";
        if (typeof this.m.germlineList.list[system] !== 'undefined' &&
            typeof this.m.germlineList.list[system].recombinations !== 'undefined' && // Old 'custom' germline format, see #3043
            typeof this.m.germlineList.list[system].recombinations[0] !== 'undefined'){
            if (typeof this.m.germlineList.list[system].recombinations[0][type2] !== 'undefined' ){
                for (var i=0; i<this.m.germlineList.list[system].recombinations[0][type2].length; i++){
                    var filename = this.m.germlineList.list[system].recombinations[0][type2][i];


                    filename = filename.split('.')[0]; //remove file extension 

                    if (typeof germline[filename] != 'undefined'){
                        for (var key in germline[filename]){
                            this.allele[key] = germline[filename][key].replace(/\./g,"");
                        }
                    }else{
                        console.log({"type": "flash", "msg": "warning : this browser version doesn't have the "+filename+" germline file", "priority": 2});
                    }
                }
            }
        }

        //reduce germline size (keep only detected genes)
        //and add undetected genes (missing from germline)
        var g = {};
        for (var j=0; j<this.m.clones.length; j++){
            if (this.m.clone(j).hasSeg(type2) &&
                typeof this.m.clone(j).seg[type2].name != "undefined"){
                var gene=this.m.clone(j).seg[type2].name;
                if (this.m.system != "multi" || this.m.clone(j).get('germline') == system){
                    if ( typeof this.allele[gene] != "undefined"){
                        g[gene] = this.allele[gene];
                    }else{
                        g[gene] = "unknow sequence";
                    }
                }
            }
        }
        this.allele = g;
        
        //On trie tous les élèment dans germline, via le nom des objets
        var tmp1 = [];
        tmp1 = Object.keys(this.allele).slice();
        mySortedArray(tmp1);
        var list1 = {};
        //Pour chaque objet, on fait un push sur this.allele
        for (var k = 0; k<tmp1.length; k++) {
            list1[tmp1[k]] = this.allele[tmp1[k]];
        }
        this.allele = list1;
        // console.log(system +"  "+ type)
        
        
        //color
        var keys = Object.keys(list1);
        if (keys.length !== 0){
            var n = 0,
                n2 = 0;  

            var elem2 = keys[0].split('*')[0];

            this.labels[elem2] = {"text" : elem2};
            this.labelsWithAlleles[elem2] = {"text" : elem2, sub: {}};

            for (var l = 0; l < keys.length; l++) {
                var tmp = this.allele[keys[l]];
                this.allele[keys[l]] = {};
                this.allele[keys[l]].seq = tmp;
                this.allele[keys[l]].color = colorGenerator((30 + (l / keys.length) * 290));
                
                var elem = keys[l].split('*')[0];
                if (elem != elem2) {
                    this.gene[elem2] = {};
                    this.gene[elem2].n = n2;
                    this.gene[elem2].color = colorGenerator((30 + ((l - 1) / keys.length) * 290));
                    this.gene[elem2].rank = n;
                    
                    this.labels[elem] = {"text" : elem};
                    this.labelsWithAlleles[elem] = {"text" : elem, sub: {}};

                    n++;
                    n2 = 0;
                }
                elem2 = elem;
                this.allele[keys[l]].gene = n;
                this.allele[keys[l]].rank = n2;
                this.labelsWithAlleles[elem].sub[keys[l]] =  {"text" : keys[l].split('*')[1]};
                n2++;
            }
            this.gene[elem2] = {};
            this.gene[elem2].n = n2;
            this.gene[elem2].rank = n;
            this.gene[elem2].color = colorGenerator((30 + ((l - 1) / keys.length) * 290));
        }

        var undefLabel = "undefined " + type
        this.labels[undefLabel] = {"text" : undefLabel}
        this.labelsWithAlleles[undefLabel] = {"text" : undefLabel}
        return callback;
    }

};
