/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
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
function GermlineAxis (model, reverse) {
    this.m = model
    this.labels = [];
    this.label_mapping = {};
    this.reverse = reverse;
    GenericAxis.call(this);
}

GermlineAxis.prototype = {
    
    /**
     * reset Axis
     * */
    reset: function() {
        this.labels = [];
        this.label_mapping = {};
    },
    
    /**
     * for a clone's index will return a value between 0 and 1 representing the clone's position on this axis. <br>
     * this function is empty and will be overided depending on what the axis must represent.
     * @param {integer} cloneid - clone index
     * @return {float} pos - clone's position
     * */
    pos : function(cloneid) {
        var clone = self.m.clone(cloneID) 
        if (clone.hasSeg(type2)
            && typeof clone.seg[type2]["name"] != 'undefined'
            && typeof gene_list[clone.seg[type2]["name"].split("*")[0]] != "undefined")
        {
            var allele = clone.seg[type2]["name"]
            var gene = clone.seg[type2]["name"].split("*")[0]
            var pos = ((gene_list[gene].rank+0.5)/(total_gene+1))
            
            if (displayAllele){
                var total_allele = gene_list[gene].n
                pos += (1/(total_gene+1)) * ((allele_list[allele].rank+0.5)/total_allele) - (0.5/(total_gene+1))
            }
            return pos
        }else{
            return ((total_gene+0.5)/(total_gene+1))
        }
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
        result = GenericAxis.prototype.label.call(this, type, pos, text)
        result.geneColor = color;

        return result;
    },

    addLabel: function(type, pos, text, color) {
        var label = this.label(type, pos, text, color);
        this.label_mapping[pos] = label;
        this.labels.push(label);
    },

    getPos: function(rank, total) {
        return ((rank+0.5)/(total+1));
    },

    /**
     * init axis with a germline object
     * @param {Germline} germline
     * @param {string} genetype - "V" "D" or "J"
     * @param {boolean} displayAllele - (show/hide allele)
     * */
    init: function (germline, geneType, displayAllele) {
        this.reset()
        this.germline = germline;
        var self = this;
        
        var gene_list = self.germline.gene
        var allele_list = self.germline.allele
        var total_gene = Object.keys(gene_list).length
        
        self.type2;
        if (geneType=="V") self.type2="5"
        if (geneType=="D") self.type2="4"
        if (geneType=="J") self.type2="3"
        
        //clone position
        this.pos = function(cloneID) {
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
    }
    
    
}
