/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     Antonin Carette <antonin.carette@etudiant.univ-lille1.fr>
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


/* Axis object contain labels and their position on an axis (from 0 to 1)
 * and have a function pos() who return the position of a given Clone on this axis 
 * */
function Axis (model, reverse) {
    this.m = model
    this.pos = function() {return 0};
    this.labels = [];
    this.reverse = reverse;
}

Axis.prototype = {
    
    /*
     * 
     * */
    init: function() {
        this.labels = [];
    },
    
    /*
     * 
     * */
    label: function (type, pos, text, color) {
        result = {};
        result.type = type;
        result.pos = pos;
        result.text = text;
        result.geneColor = color;

        return result;
    },

    /* init axis with a germline object
     * genetype > "V" "D" or "J"
     * displayAllele > boolean ( show/hide allele)
     * */
    useGermline: function (germline, geneType, displayAllele) {
        this.init()
        this.germline = germline;
        var self = this;
        
        var gene_list = self.germline.gene
        var allele_list = self.germline.allele
        var total_gene = Object.keys(gene_list).length
        
        var type2
        if (geneType=="V") type2="5"
        if (geneType=="D") type2="4"
        if (geneType=="J") type2="3"
        
        //clone position
        this.pos = function(cloneID) {
            var clone = self.m.clone(cloneID) 
            if (typeof clone.seg != "undefined" 
                && typeof clone.seg[type2] != "undefined" 
                && typeof gene_list[clone.seg[type2].split("*")[0]] != "undefined")
            {
                var allele = clone.seg[type2]
                var gene = clone.seg[type2].split("*")[0]
                var pos = ((gene_list[gene].rank+0.5)/(total_gene+1))
                
                if (displayAllele){
                    var total_allele = gene_list[gene].n
                    pos += (1/(total_gene+1)) * ((allele_list[allele].rank+0.5)/total_allele) - (0.5/(total_gene+1))
                }
                return pos
            }else{
                return ((total_gene+0.5)/(total_gene+1))
            }
        }
        
        //labels
        for (var key in gene_list){
            self.labels.push(self.label("line", ((gene_list[key].rank+0.5)/(total_gene+1)), key, this.germline.gene[key].color));
        }
        
        if (displayAllele){
            for (var key in allele_list){
                var gene = key.split("*")[0]
                var allele = key.split("*")[1]
                var total_allele = gene_list[gene].n
                var pos = ((gene_list[gene].rank+0.5)/(total_gene+1))
                pos += (1/(total_gene+1)) * ((allele_list[key].rank+0.5)/total_allele) - (0.5/(total_gene+1))
                self.labels.push(self.label("subline", pos, "*"+allele, this.germline.allele[key].color));
            }
        }
        
        self.labels.push(self.label("line", ((total_gene+0.5)/(total_gene+1)), "?", ""));
    },
    
    
    /* use clone size
     * 
     * */
    useSize: function (other) {
        this.init()
        var self = this;
        this.sizeScale = d3.scale.log()
            .domain([this.m.min_size, 1])
            .range([1, 0]);
            
        //clone position
        this.pos = function(cloneID) {
            var time = other ? self.m.tOther : self.m.t
            var size = self.m.clone(cloneID).getSize(time)
            if (size !=0 ) {
                return self.sizeScale(size);
            }else{
                return 1;
            }
        }
        
        //labels
        var h=1
        for (var i = 0; i < 10; i++) {
            var pos = this.sizeScale(h);
            var text = this.m.formatSize(h, false)
            if (pos >= 0 && pos <= 1)
            this.labels.push(this.label("line", pos, text));
            h = h / 10;
        }
     
    },
    
    
    custom: function(fct, default_min, default_max, percent, use_log){
        percent = typeof percent !== 'undefined' ? percent : false;
        use_log= typeof percent !== 'undefined' ? use_log : false;
        var self = this;
        this.fct = fct;
        
        var min = default_min;
        var max = default_max;
        if (typeof min === 'function') min = min();
        if (typeof min === 'function') max = max();
            
        for (var i in this.m.clones){
            var tmp;
            try{
                tmp = fct(i);
            }catch(e){}
            
            if ( typeof tmp != "undefined"){
                if ( tmp > max || typeof max == "undefined") max = tmp;
                if ( tmp < min || typeof min == "undefined") min = tmp;
            }
        }
        
        if (typeof min == "undefined"){ 
            min = 0;
            max = 1;
        }
        
        var range = [0,1]
        if (self.reverse) range = [1,0]
        if (use_log){
            this.sizeScale = d3.scale.log()
            .domain([min, max])
            .range(range);
        }else{
            this.sizeScale = d3.scale.linear()
                .domain([min, max])
                .range(range);
        }
            
        this.min = min;
        this.max = max;
        
        this.pos = function(cloneID) {
            var value, pos;
            try{
                value = self.fct(cloneID);
            }catch(e){}
            
            if (typeof value != "undefined"){
                pos = self.sizeScale(value);
            }else{
                pos = self.sizeScale(self.min);
            }
            
            return pos;
        }
        
        this.computeCustomLabels(min, max, percent, use_log)
    },
    
    /*
     * TODO linear/log percent/value parameter
     * */
    computeCustomLabels: function(min, max, percent, use_log){
        this.labels = [];
        
        if (use_log){
            var h=1
            for (var i = 0; i < 10; i++) {
                var pos = this.sizeScale(h); // pos is possibly already reversed
                var text = this.m.formatSize(h, false)
                if (pos >= 0 && pos <= 1)
                this.labels.push(this.label("line", pos, text));
                h = h / 10;
            }
        }else{
            var h = (max-min)/5
            var delta = (max-min)
            for (var i = 0; i <= 5; i++) {
                pos = (h*i)*(1/delta);
                
                var text = Math.round(min+(h*i))
                if (percent){
                    text = ((min+(h*i))*100).toFixed(1) + "%"
                }
                
                if (this.reverse) pos = 1 - pos; 
                
                this.labels.push(this.label("line", pos, text));
            }
        }
    },
    
    computeCustomBarLabels : function (tab) {
        this.labels = [];
        var length = Object.keys(tab).length;
        
        var step = 1 + Math.floor(length / 30)
        
        var i=1
        for (var e in tab){
            if (i%step == 0 ){ 
                var pos = this.posBarLabel(i, length)
                if (this.reverse) pos = 1 - pos; 
                this.labels.push(this.label("line", pos, e));
            }
            i++;
        }

    },

    posBarLabel : function (i, length) {
        return (i-0.5)/length ;
    }
}
