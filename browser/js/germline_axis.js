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
 * @param {string} geneType - "5" or "3"
 * @param {boolean} displayAllele - (show/hide allele)
 * */
function GermlineAxis (model, reverse, can_undefined,
                       geneType, displayAllele) {
    this.m = model
    this.labels = [];
    this.label_mapping = {};
    this.values = [];
    this.value_mapping = {};
    GenericAxis.call(this, reverse, can_undefined);
    this.geneType = geneType
    this.displayAllele = displayAllele
}

GermlineAxis.prototype = Object.create(GenericAxis.prototype);
    
    /**
     * init axis with a germline object
     * */
GermlineAxis.prototype.init = function (values, fct) {
        this.reset()

    this.converter = fct
    this.values = values
    this.germline = this.geneType == "5" ? this.m.germlineV : this.m.germlineJ

        var gene_list = this.germline.gene
        var allele_list = this.germline.allele
        var total_gene = Object.keys(gene_list).length

        var pos;
        //labels
        for (var key in gene_list){
            pos = this.getPos(gene_list[key].rank, total_gene)
            this.addLabel("line", key, pos, key, this.germline.gene[key].color);
        }

    if (this.displayAllele){
            for (var al in allele_list){
                var gene = al.split("*")[0]
                var allele = al.split("*")[1]
                var total_allele = gene_list[gene].n
                pos = this.getPos(gene_list[gene].rank, total_gene);
                pos += (1/(total_gene+1)) * ((allele_list[al].rank+0.5)/total_allele) - (0.5/(total_gene+1))
                this.addLabel("subline", al, pos, "*"+allele, this.germline.allele[al].color);
            }
        }
        pos = this.getPos(total_gene, total_gene);

        if (this.can_undefined)
            this.addLabel("line", "?", pos, "?", "");

        this.populateValueMapping();

        this.gene_list = gene_list;
        this.allele_list = allele_list;
        this.total_gene = total_gene;
    }

    /**
     * reset Axis
     * */
    GermlineAxis.prototype.reset = function() {
        this.labels = [];
        this.label_mapping = {};
        this.values = [];
        this.value_mapping = {};
    }
    
    /**
     * for a clone's index will return a value between 0 and 1 representing the clone's position on this axis. <br>
     * this function is empty and will be overided depending on what the axis must represent.
     * @param {integer} cloneid - clone index
     * @return {float} pos - clone's position
     * */
    GermlineAxis.prototype.pos = function(clone) {
        var pos = this.applyConverter(clone);
        var p = this.label_mapping[pos];
        if (typeof p == 'undefined') {
           p = this.label_mapping["?"];
        }
        return (typeof p != 'undefined') ? p : { 'pos': 1 }
    }
    
    /**
     * build a label descriptor
     * @param {string} type - 'line' or 'subline'
     * @param {float} pos - position on axis between 0 and 1
     * @param {string} text - text label
     * @param {string} color - label color
     * @return {object} label
     * */
    GermlineAxis.prototype.label = function (type, pos, text, color) {
        result = GenericAxis.prototype.label.call(this, type, pos, text)
        result.geneColor = color;

        return result;
    }

    GermlineAxis.prototype.addLabel = function(type, value, pos, text, color) {
        var label = this.label(type, pos, text, color);
        this.label_mapping[value] = label;
        this.labels.push(label);
    }

    GermlineAxis.prototype.getPos = function(rank, total) {
        return ((rank+0.5)/(total+1));
    }

    GermlineAxis.prototype.computeBarLabels = function () {
    }

    GermlineAxis.prototype.posBarLabel = function(i) {
        Object.assign({}, {})
        var key = Object.keys(this.value_mapping)[i-1];
        var map = this.value_mapping[key];
        if (map.length > 0) {
            var clone = map[0];
            return this.pos(clone).pos;
        }
        return 0;
    }
