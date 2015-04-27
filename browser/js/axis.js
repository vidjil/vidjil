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


/**
 * Axis object contain labels and their position on an axis (from 0 to 1) <br>
 * can provide the position of a clone on it
 * @constructor
 * @param {Model} model 
 * @reverse {boolean} reverse - by default axis go from low to high but can be revsersed
 * */
function Axis (model, reverse) {
    this.m = model
    this.labels = [];
    this.reverse = reverse;
}

Axis.prototype = {
    
    /**
     * init/reset Axis
     * */
    init: function() {
        this.labels = [];
    },
    
    /**
     * for a clone's index will return a value between 0 and 1 representing the clone's position on this axis. <br>
     * this function is empty and will be overided depending on what the axis must represent.
     * @param {integer} cloneID - clone index
     * @return {float} pos - clone's position
     * */
    pos : function(cloneID) {
        return 0;
    },
    
    /**
     * build a label descriptor
     * @param {string} type - 'line' or 'subline'
     * @param {float} pos - position on axis between 0 and 1
     * @param {string} text - text label
     * @param {string} color - label color
     * @return {object} label
     * */
    label: function (type, pos, text, color) {
        result = {};
        result.type = type;
        result.pos = pos;
        result.text = text;
        result.geneColor = color;

        return result;
    },

    /**
     * init axis with a germline object
     * @param {Germline} germline
     * @param {string} genetype - "V" "D" or "J"
     * @param {boolean} displayAllele - (show/hide allele)
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
    
    /**
     * compute axis using a given function <br>
     * find min/max value possible with the given function and use them as range <br>
     * TODO make it works with non numerical value
     * @param {function} fct - must take a clone index in arg and return a numerical value
     * @param {number|function} default_min - the minimal boundary can't be over default_min 
     * @param {number|function} default_min - the maximal boundary can't be under default_max
     * @param {boolean} percent - display label as percent ( value 1 => 100%)
     * @param {boolean} use_log - use a logarithmic scale instead of a linear
     * */
    custom: function(fct, default_min, default_max, output, use_log){
        output = typeof output !== 'undefined' ? output : 'float';
        use_log = typeof use_log !== 'undefined' ? use_log : false;
        var self = this;
        
        this.fct = fct;
        if (typeof fct == "string"){
            this.fct = function(id){ 
                return self.m.clone(id).get(fct)
            }
        }
        
        if ( output != "string" ){
            var min = default_min;
            var max = default_max;
            if (typeof min === 'function') min = min();
            if (typeof min === 'function') max = max();
        
            for (var i in this.m.clones){
                var tmp;
                try{
                    tmp = this.fct(i);
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
        }else{
            this.values = {};
            for (var i in this.m.clones){
                try{
                    var tmp = this.fct(i);
                    console.log(tmp)
                    if (typeof tmp != 'undefined') this.values[tmp] = 0;
                }catch(e){}
            }
            
            var key = Object.keys(this.values)
            var step = 1/(key.length+1);
            pos = step/2;
            for (var i in key){
                this.values[key[i]] = pos;
                pos += step;
            }
            
            this.values["?"] = pos;
            
            this.pos = function(cloneID) {
                result = this.values[this.fct(cloneID)]
                
                if (typeof result == 'undefined') return "?"
                return result
            }
        }
        
        this.computeCustomLabels(min, max, output, use_log)
    },
    
    /**
     * reset and build labels <br>
     * TODO make it works with non numerical value
     * @param {number} min - minimal label value
     * @param {number} max - maximal label value
     * @param {boolean} percent - display label as percent ( value 1 => 100%)
     * @param {boolean} use_log - use a logarithmic scale instead of a linear
     * */
    computeCustomLabels: function(min, max, output, use_log){
        this.labels = [];
        
        if (output == "string"){
            var key = Object.keys(this.values)
            for (var i in key){
                this.labels.push(this.label("line", this.values[key[i]], key[i]));
            }
        }else{
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
                    if (output=="percent"){
                        text = ((min+(h*i))*100).toFixed(1) + "%"
                    }
                    if (output=="float-2"){
                        text = (min+(h*i)).toFixed(2)
                    }
                    
                    if (this.reverse) pos = 1 - pos; 
                    
                    this.labels.push(this.label("line", pos, text));
                }
            }
        }
    },
    
    /**
     * add labels for barplot <br>
     * @param {Array} tab - barplot descriptor like the one made by Model.computeBarTab()
     * */
    computeCustomBarLabels : function (tab) {
        this.labels = [];
        var length = Object.keys(tab).length;
        
        var step = 1 + Math.floor(length / 30)
        
        var i=1
        for (var e in tab){
            if (i%step == 0 ){ 
                var pos = (i-0.5)/length ;
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
