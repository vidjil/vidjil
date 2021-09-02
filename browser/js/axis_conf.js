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

V_IDENTITY_THRESHOLD = 98.0

AXIS_LABEL = {
    default:{
        margin_left : 1,
        margin_right: 1
    },
    slim:{
        margin_left : 0.2,
        margin_right: 0.2
    },
    bold :{
        margin_left : 2.5,
        margin_right: 2.5
    },
    subline:{
        margin_left : 1,
        margin_right: 1
    },
    linearScale :{
        margin_left : "auto",
        margin_right: "auto"
    },
    logScale :{
        margin_left : "auto",
        margin_right: "auto"
    }
}


AXIS_DEFAULT = {
    "V/5' gene": {
        name:       "V/5' gene",
        doc:        "V gene (or 5' segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineV.labels))},
        fct:        function(clone) {return clone.getGene("5", false)},
        germline:   function(){return m.germlineV.system},
    },
    "V/5 allele": {
        name:       "V/5 allele",
        doc:        "V gene (or 5' segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineV.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("5", true)},
        germline:   function(){return m.germlineV.system},
        autofill:   false
    },
    "D/4' gene": {
        name:       "D/4' gene",
        doc:        "D gene (or 4' segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineD.labels))},
        fct:        function(clone) {return clone.getGene("4", false)},
        germline:   function(){return m.germlineD.system},
    },
    "D/4 allele": {
        name:       "D/4 allele",
        doc:        "D gene (or 4' segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineD.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("4", true)},
        germline:   function(){return m.germlineD.system},
        autofill:   false
    },
    "J/3' gene": {
        name:       "J/3' gene",
        doc:        "J gene (or 3' segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineJ.labels))},
        fct:        function(clone) {return clone.getGene("3", false)},
        germline:   function(){return m.germlineJ.system},
    },
    "J/3 allele": {
        name:       "J/3 allele",
        doc:        "J gene (or 3' segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineJ.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("3", true)},
        germline:   function(){return m.germlineJ.system},
        autofill:   false
    },
    "clone consensus length" : {
        name:       "clone consensus length",
        doc:        "length of the consensus sequence",
        fct:        function(clone) {return clone.getSequenceLength()},
        autofill:   true,
        color:      {   fct: function(t){return d3.interpolatePlasma(t)}},
        isInAligner: true
    },    
    "clone average read length" : {
        name:       "clone average read length",
        doc:        "average length of the reads belonging to each clone",
        labels:     {   
                        "?":   {text:"?",   side: "right"}
                    },
        fct:        function(clone, t) {
                        var len = clone.getAverageReadLength(t)
                        if (len == "undefined" || len == 0) return "?"
                        return Math.round(len)
                    },
        autofill:   true,
        color:      {fct: function(t){return d3.interpolatePlasma(t)}},
        isInAligner: true
    },
    "GC content" : {
        name:       "GC content",
        doc:        "%GC content of the consensus sequence of each clone",
        fct:        function(clone) {return clone.getGCContent()},
        autofill:   true,
        isInAligner: true
    },
    "N length": {
        name:       "N length",
        doc:        "N length, from the end of the V/5' segment to the start of the J/3' segment (excluded)",
        fct:        function(clone) {return clone.getNlength()},
        autofill:   true,
        min_step:   1
    },
    "CDR3 length (nt)": {
        name:       "CDR3 length (nt)",
        doc:        "CDR3 length, in nucleotides, from Cys104 and Phe118/Trp118 (excluded)",
        fct: function(clone) {return clone.getSegLength('cdr3')},
        autofill:   true
    },
    "productivity": {
        name:       "productivity",
        labels:     {
                        "not productive":   {text:"not productive"},
                        "no CDR3 detected": {text:"no CDR3 detected"},
                        "productive":       {text:"productive"},
                    },
        fct:        function(clone) {return clone.getProductivityName()},
        pretty:     function(tag) { return icon_pm(tag, "productive", "not productive") },
        isInAligner: true
    },
    "productivity detailed": {
        name:       "productivity detailed",
        labels:     {
                        "productive":       {text:"productive"},
                        "not-productive":   {text:"not productive"}
                    },
        fct:        function(clone) {return clone.getProductivityNameDetailed()},
        sort :      function(a,b){
                        var order = ["productive","not-productive","stop-codon","out-of-frame","no-WPGxG-pattern","no CDR3 detected"]
                        if (order.indexOf(a) == -1 && order.indexOf(b) == -1) {return a > b}
                        else if (order.indexOf(a) == -1) {return 1}
                        else if (order.indexOf(b) == -1) {return 0}
                        return order.indexOf(a) - order.indexOf(b);
                    },
        isInAligner:true,
        autofill :  true
    },
    "productivity IMGT": {
        name :      "productivity [IMGT]",
        doc:        "productivity (as computed by IMGT/V-QUEST)",
        labels:     {
            "not productive":   {text:"not productive"},
            "no CDR3 detected": {text:"no CDR3 detected"},
            "productive":       {text:"productive"},
        },
        fct:        function(clone) { return clone.getProductivityIMGT() },
        pretty: function(tag) { return icon_pm(tag, "productive", "not productive"); },
        isInAligner: true
    },
    "VIdentity IMGT": {
        name:       "V identity [IMGT]",
        doc:        "V identity (as computed by IMGT/V-QUEST)",
        fct:        function(clone) { return clone.getVIdentityIMGT() },
        pretty: function(val) {
            var Videntity_info = document.createElement('span');
            Videntity_info.className = "identityBox widestBox";

            var identityRate = parseFloat(val)
            if (!isNaN(identityRate)) {
                var info = document.createElement('span');
                if (V_IDENTITY_THRESHOLD)
                    info.className += identityRate < V_IDENTITY_THRESHOLD ? ' identityGood' : ' identityBad'
                info.appendChild(document.createTextNode(floatToFixed(identityRate,5) + "%"))
                info.setAttribute('title', 'V-REGION identity %, as computed by IMGT/V-QUEST')  // with indel or not ?
                Videntity_info.appendChild(info)
            } else Videntity_info.innerHTML = "&nbsp;";
            return Videntity_info;

        },
        isInAligner: true
    },
    "tag": {
        name:       "tag",
        doc:        "tag, as defined by the user",   
        labels:     function(){
                        var l = {}
                        for (var i=0; i<m.tag.length; i++)
                            l[m.tag[i].name] =  {
                                                    text:   m.tag[i].name,   
                                                    color:  m.tag[i].color
                                                }
                        return l
                    },
        fct:        function(clone) {return clone.getTagName()},
        sort :      false,
        autofill :  false
    },
    "clone consensus coverage": {
        name:       "clone consensus coverage",
        doc:        "ratio of the length of the clone consensus sequence to the median read length of the clone",
        // "Coverage between .85 and 1.0 (or more) are good values",
        fct:        function(clone){return clone.coverage},
        scale:      {
                        mode:   "linear",
                        min:    0,
                        max:    1
                    },
        autofill:   true
    },
    "locus" : {
        doc:        "locus or recombination system",
        name:       "locus",
        fct:        function(clone){return clone.germline},
        autofill:   true
    },
    "size" : {
        doc:        "ratio of the number of reads of each clone to the total number of reads in the selected locus",
        name:       "size",
        fct :       function(clone,t){return clone.getSize(t)},
        scale:      {   mode: "log"},
        autofill:   true,
        pretty:     function(size) {return createClassedSpan("sizeBox sixChars", (self.m ? self.m : self).getStrAnySize(undefined, size)) },
        isInAligner:true
    },
    "size (other sample)" : {
        doc:        "ratio of the number of reads of each clone to the total number of reads in the selected locus, on a second sample",
        name:       "size (other sample)",
        fct :       function(clone){return clone.getSize(m.tOther)},
        scale:      {
                        mode: "log",
                        reverse: true
                    },
        autofill:   true,
        isInAligner:false
    },
    "number of samples" : {
        name:       "number of samples",
        label:      "number of samples sharing each clone",
        fct :       function(clone){return clone.getNumberNonZeroSamples()},
        scale:      {   
                        mode: "linear",
                        min: 1,
                        //max : function(){ return self.m.samples.number }
                    },
        autofill:   true,
        isInAligner:true
    },
    "primers": {
        name:       "interpolated length between primers",
        doc:        "interpolated length, between selected primer set (inclusive)",
        fct:        function(clone) {return clone.getSegLengthDoubleFeature('primer5', 'primer3')},
        autofill:   true
    }, 
    "V/5' deletions in 3'": {
        doc:        "number of deleted nucleotides at the 3' side of the V/5' segment",
        name:       "V/5' deletions in 3'",
        fct:        function(clone) { return clone.getDeletion('5', 'delRight') },
        autofill:   true
    },
    "J/3' deletions in 5'": {
        doc:        "number of deleted nucleotides at the 5' side of the J/3' segment",
        name:       "J/3' deletions in 5'",
        fct:        function(clone) {return clone.getDeletion('3', 'delLeft')},
        autofill:   true
    },
    "cloneDB occurrences": {
        doc:        "number of occurrences in cloneDB",
        name:       "cloneDB occurrences",
        scale:      {
                        "mode": "linear",
                        "min": 0
                    },
        fct: function(clone) {return clone.numberInCloneDB()},
        autofill: true,
        isInAligner: false
        //hide : (typeof config === 'undefined' || ! config.clonedb),
    },
    "cloneDB patients/runs/sets occurrences": {   
        doc:        "number of patients/runs/sets sharing clones in cloneDB",
        name:       "cloneDB occurrences",
        scale:      {
                        "mode": "linear",
                        "min": 0
                    },
        fct: function(clone) {return clone.numberSampleSetInCloneDB()},
        autofill: true,
        isInAligner: false
        //hide : (typeof config === 'undefined' || ! config.clonedb),
    },
/*  "tsneX": {
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
    "test1": {
        name:       "test1",
        labels:     {
                        "not productive":   {text:"not productive",   side: "left"},
                        "no CDR3 detected": {text:"no CDR3 detected", side: "left"},
                        "productive":       {text:"productive",       side: "right", type: "bold"},
                    },
        fct:        function(clone) {
                        if (clone.germline == m.germlineV.system) return clone.getGene("5", false)
                        return clone.getProductivityName();
                    },
        germline:   "multi",
        autofill:   true,
        color: {
            fct : function(t){return d3.interpolateRainbow(t)},
            offset: 0.5
        }
    },
    "test2": {
        name:       "test2",
        labels:     {
                        "a":  {text:"pok", side: "right", sub :{
                            "0":    {text:"pim"},
                            "1":    {text:"pam"},
                            "2":    {text:"poum"},
                        }},
                        "b":  {text:"pik", side: "left", sub :{
                            "3":    {text:"z"},
                            "4":    {text:"x"},
                        }},
                        "5":  {text:"pok!", side: "right"},
                    },
        fct:        function(clone) {
                        return Math.floor(Math.random() * 5); 
                    },
        germline:   "multi"
    },
    "test3": {
        name:       "test3",
        labels:     {
            "0":   {text:"0",   side: "left",  type:"slim"}
        },
        scale:      {
                        "mode":"log"
                    },
        fct:        function(clone) {
                        if (clone.getSizeZero()<0.0001) return 0
                        return Math.floor(Math.pow(10, 1+Math.random()*8)); 
                    },
        germline:   "multi",
        autofill:   true
    },    
    "clone consensus length2" : {
        name:       "clone consensus length",
        doc:        "length of the consensus sequence",
        labels:     {
                        "< 50":   {text:"< 50",  side: "left",  type: "bold"},
                        "> 250" : {text:"> 250", side: "right", type: "bold"},
                    },
        fct:        function(clone) {
                        var length = clone.getSequenceLength();
                        if (length < 50)  return "< 50"
                        if (length > 250) return "> 250" 
                        return length
                    },
        autofill:   true
    },*/
}


function createClassedSpan (className, innerText) {
    var span = document.createElement('span');
    span.className = className;
    span.textContent = innerText;
    return span;
}
