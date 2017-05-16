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

function Axes (model) {
  this.m = model;
}

V_IDENTITY_THRESHOLD = 98.0

Axes.prototype = {

    available: function(){
        return {
            "gene_v": {
                doc: "V gene (or 5' segment), gathering all alleles",
                label:"V/5' gene",
                axis: new GermlineAxis(this.m, false, true)
            },
            "gene_j": {
                doc: "J gene (or 3' segment), gathering all alleles",
                label:"J/3' gene",
                axis: new GermlineAxis(this.m, false, true)
            },
            "allele_v": {
                doc: "V gene (or 5' segment), with allele",
                label:"V allele",
                axis: new GermlineAxis(this.m, false, true)
            },
            "allele_j": {
                doc: "J gene (or 3' segment), with allele",
                label:"J allele",
                axis: new GermlineAxis(this.m, false, true)
            },
            "sequenceLength" : {
                doc: "length of the consensus sequence",
                label: "clone consensus length",
                axis: new NumericalAxis(this.m, false, true),
                fct: function(clone) {return clone.getSequenceLength()},
                pretty: function(len) {return '<span class="threeDigits">'+len+'</span>'}
            },
            "readLength" : {
                doc: "average length of the reads belonging to each clone",
                label: "clone average read length",
                axis: new FloatAxis(this.m),
                fct: function(clone) {return clone.getAverageReadLength()},
                pretty: function(len) {return '<span class="widestBox">' + (len == 'undefined' ? '?' : len) + '</span>'}
            },
            "GCContent" : {
                doc: "%GC content of the consensus sequence of each clone",
                label: "GC content",
                axis: new PercentAxis(this.m),
                fct: "GCContent"
            },
            "n": {
                doc: "N length, from the end of the V/5' segment to the start of the J/3' segment (excluded)",
                label: "N length",
                axis: new NumericalAxis(this.m),
                fct: function(clone) {return clone.getNlength()},
                pretty: function(len) {return '<span class="threeDigits">'+len+'</span>'}
            },
            "lengthCDR3": {
                doc: "CDR3 length, in nucleotides, from Cys104 and Phe118/Trp118 (excluded)",
                label: "CDR3 length (nt)",
                axis: new NumericalAxis(this.m),
                fct: function(clone) {return clone.getSegLength('cdr3')},
                pretty: function(len) {return '<span class="threeDigits">' + (len == 'undefined' ? '?' : len) + '</span>'}
            },
            "productivity": {
                label: "productivity",
                axis: new GenericAxis(),
                fct: function(clone) {return clone.getProductivityName()},
                pretty: function(tag) { return icon_pm(tag, "productive", "not productive").outerHTML },
            },
            "productivity-IMGT": {
                label: "productivity (as computed by IMGT/V-QUEST)",
                axis: new GenericAxis(),
                fct: function(clone) { return clone.getProductivityIMGT() },
                pretty: function(tag) { return icon_pm(tag, "productive", "not productive").outerHTML },
            },
            "VIdentity-IMGT": {
                label: "V identity (as computed by IMGT/V-QUEST)",
                axis: new NumericalAxis(this.m),
                fct: function(clone) { return clone.getVIdentityIMGT() },
                pretty: function(val) {
                    var Videntity_info = document.createElement('span');
                    Videntity_info.className = "identityBox widestBox";

                    var identityRate = parseFloat(val)
                    if (!isNaN(identityRate)) {
                        var info = document.createElement('span');
                        if (V_IDENTITY_THRESHOLD)
                            info.className += identityRate < V_IDENTITY_THRESHOLD ? ' identityGood' : ' identityBad'
                        info.appendChild(document.createTextNode(identityRate.toFixed(2) + "%"))
                        info.setAttribute('title', 'V-REGION identity %, as computed by IMGT/V-QUEST')  // with indel or not ?
                        Videntity_info.appendChild(info)
                    } else Videntity_info.innerHTML = "&nbsp;";
                    return Videntity_info.outerHTML
                },
            },
            "tag": {
                doc: "tag, as defined by the user",
                label: "tag",
                axis: new GenericAxis(),
                fct: function(clone) {return clone.getTagName()},
                pretty: function(tag) {return '<span class="widestBox">'+tag+'</span>'}
            },
            "coverage": {
                doc: "ratio of the length of the clone consensus sequence to the median read length of the clone",
                // "Coverage between .85 and 1.0 (or more) are good values",
                label: "clone consensus coverage",
                axis: new FloatAxis(this.m),
                fct: function(clone){return clone.coverage},
                min: 0,
                max: 1,
                log: false
            },
            "locus" : {
                doc: "locus or recombination system",
                label: "locus",
                axis: new GenericAxis(),
                fct: function(clone){return clone.germline},
                pretty: function(system){
                    var ret = self.m.systemBox(system);
                    return (ret instanceof Element ? ret.outerHTML : ret);
                }
            },
            "Size" : {
                doc: "ratio of the number of reads of each clone to the total number of reads in the selected locus",
                label: "size",
                axis: new PercentAxis(this.m),
                fct : function(clone){return clone.getSizeZero()},
                pretty: function(size) {return '<span class="sizeBox sixChars">'+(self.m ? self.m : self).getStrAnySize(undefined, size)+'</span>'},
                min : function(){return self.m.min_size},
                max : 1,
                log : true
            },
            "otherSize" : {
                doc: "ratio of the number of reads of each clone to the total number of reads in the selected locus, on a second sample",
                label: "size (other sample)",
                axis: new PercentAxis(this.m),
                fct : function(clone){return clone.getSizeZero(m.tOther)},
                min : function(){return self.m.min_size},
                max : 1,
                log : true
            },
            "nbSamples" : {
                label: "number of samples sharing each clone",
                axis : new NumericalAxis(this.m),
                fct : function(clone){return clone.getNumberNonZeroSamples()},
                pretty: function(nb) {return '<span class="twoDigits">'+nb+'</span>'},
                min : 1,
                max : function(){ return self.m.samples.number }
            },
            "tsneX": {
                label: "distance (X)",
                axis: new FloatAxis(this.m),
                fct: function(clone){
                    var r = self.gridSizeH/self.gridSizeW;
                    var k=1;
                    var yMax = self.m.similarity_builder.yMax
                    if (yMax > r) k = r/yMax
                    return k*clone.tsne[0] + (1-k)/2
                },
                log: false,
                min: 0,
                max: 1,
                hide : true,
                display_label : false
            },
            "tsneY": {
                label: "distance (Y)",
                axis: new FloatAxis(this.m),
                fct: function(clone){
                    var r = self.gridSizeH/self.gridSizeW;
                    var k=1;
                    var yMax = self.m.similarity_builder.yMax
                    if (yMax > r) k = r/yMax
                    return k*clone.tsne[1]
                },
                log: false,
                min: 0,
                max: function(){return self.gridSizeH/self.gridSizeW},
                hide : true,
                display_label : false
            },
            "tsneX_system": {
                label: "distance (X), by locus",
                axis: new FloatAxis(this.m),
                fct: function(clone){
                    var r = self.gridSizeH/self.gridSizeW;
                    var k=1;
                    var yMax = self.m.similarity_builder.system_yMax[clone.get("germline")]
                    if (yMax > r) k = r/yMax
                    return k*clone.tsne_system[0] + (1-k)/2
                },
                log: false,
                min: 0,
                max: 1,
                hide : true,
                display_label : false
            },
            "tsneY_system": {
                label: "distance (Y), by locus",
                axis: new FloatAxis(this.m),
                fct: function(clone){
                    var r = self.gridSizeH/self.gridSizeW;
                    var k=1;
                    var yMax = self.m.similarity_builder.system_yMax[clone.get("germline")]
                    if (yMax > r) k = r/yMax
                    return k*clone.tsne_system[1]
                },
                log: false,
                min: 0,
                max: function(){return self.gridSizeH/self.gridSizeW},
                hide : true,
                display_label : false
            },
            "primers": {
                label: "interpolated length, between BIOMED2 primers (inclusive)",
                fct: function(cloneID) {return self.m.clone(cloneID).getSegLengthDoubleFeature('primer5', 'primer3')}
            },
        };
    }
}
