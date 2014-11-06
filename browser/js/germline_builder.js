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

function GermlineList () {
    this.init()
}

GermlineList.prototype = {
    
    init : function () {
        this.load();
    },
    
    //load germlines.data file from server
    load : function () {
        var self=this;
        
        $.ajax({
            url: window.location.origin + "/germline/germlines.data",
            success: function (result) {
                try {
                    //remove comment (json don't have comment)
                    var json = result.replace(/ *\/\/[^\n]*\n */g , "")
                    //convert from js to json (json begin with { or [, never with a var name)
                    json = json.replace("germlines = " , "")
                    self.list = jQuery.parseJSON(json);
                }
                catch(err){
                    myConsole.flash("server : germlines.data malformed", 2);
                }
            },
            error: function (request, status, error) {
                myConsole.flash("server : error impossible to retrieve germlines.data", 2);
            },
            dataType: "text"
        });
        
    },
    
    //add a list of custom germlines
    add : function (list) {
        for ( var key in list ) {
            this.list[key] = list[key];
        }
    }
}

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
    load : function (system, type, callback) {
        var self = this;
        this.init()
        
        this.system = system
        name = name.toUpperCase()
        
        if (typeof this.m.germlineList.list[system] == 'undefined'){
            return callback
        }
        
        this.allele = {}
        this.gene = {}
        
        var type2
        if (type=="V") type2="5"
        if (type=="D") type2="4"
        if (type=="J") type2="3"
            
        for (var i=0; i<this.m.germlineList.list[system][type2].length; i++){
            var filename = this.m.germlineList.list[system][type2][i] 
            filename = filename.split('/')[filename.split('/').length-1] //remove path
            filename = filename.split('.')[0] //remove file extension 
            
            if (typeof germline[filename] != 'undefined'){
                for (var key in germline[filename]){
                    this.allele[key] = germline[filename][key]
                }
            }else{
                myConsole.flash("warning : this browser version doesn't have the "+filename+" germline file", 2);
            }
        }

        //reduce germline size (keep only detected genes)
        //and add undetected genes (missing from germline)
        var g = {}
        for (var i=0; i<this.m.n_clones; i++){
            if (typeof this.m.clone(i).seg != "undefined" &&
                typeof this.m.clone(i).seg[type2] != "undefined"
            ){
                var gene=this.m.clone(i).seg[type2];
                if (this.m.system != "multi" || this.m.clone(i).getSystem() == system){
                    if ( typeof this.allele[gene] != "undefined"){
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
        
        return callback
    }
}