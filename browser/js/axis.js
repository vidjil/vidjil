/*
* This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
* Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr>, Antonin Carette <antonin.carette@etudiant.univ-lille1.fr> and the Vidjil Team
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


/* Axis object contain labels and their position on an axis (from 0 to 1)
 * and have a function pos() who return the position of a given Clone on this axis 
 * */
function Axis (model) {
    this.m = model
    this.pos = function() {return 0};
    this.labels = [];
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
    useSize: function () {
        this.init()
        var self = this;
        this.sizeScale = d3.scale.log()
            .domain([this.m.min_size, 1])
            .range([1, 0]);
            
        //clone position
        this.pos = function(cloneID) {
            return self.sizeScale(self.m.clone(cloneID).getSize())
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
    
    /* 
     * 
     * */
    useNlength: function () {
        this.init()
        var self = this;
        
        var n_min = 0;
        var n_max = 1;
        for (var i=0; i<this.m.clones.length; i++){
            var n = this.m.clone(i).getNlength();
            if (n > n_max) n_max = n;
        }
        
        this.sizeScale = d3.scale.linear()
            .domain([0, n_max+1])
            .range([0, 1]);
     
        //clone position
        this.pos = function(cloneID) {
            return 1 - self.sizeScale(self.m.clone(cloneID).getNlength())
        }
        
        //labels
        var h = Math.ceil(n_max/5)
        for (var i = 0; i < 5; i++) {
            var pos = 1-this.sizeScale(h*i);
            var text = h*i
            this.labels.push(this.label("line", pos, text));
        }
    },
    
    /*
     * TODO linear/log percent/value parameter
     * */
    custom: function(min, max, reverse, percent, linear){
        this.labels = [];
        
        var h = (max-min)/5
        var delta = (max-min)
        for (var i = 0; i <= 5; i++) {
            var pos = 0;
            if (reverse){
                pos = 1 - (h*i)*(1/delta);
            }else{
                pos = (h*i)*(1/delta);
            }
            
            var text = Math.round(min+(h*i))
            this.labels.push(this.label("line", pos, text));
        }
    },

}
