/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2022 by VidjilNet consortium and Bonsai bioinformatics
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

// list of Axis available for scatterplot
AXIS_SCATTERPLOT = ["V/5' gene", 
                    "V/5' allele",
                    "D gene",
                    "D allele",
                    "J/3' gene",
                    "J/3' allele",
                    "Size",
                    "Sequence length",
                    "Reads length",
                    "N length",
                    "CDR3 length",
                    "GC content",
                    "Productivity",
                    "Productivity+",
                    "Tag",
                    "Coverage",
                    "[IMGT] Productivity",
                    "[IMGT] VIdentity",    
                    "Locus",
                    "Size (other)",
                    "Number of samples",
                    "Primers gap",
                    "V/5' del'",
                    "J/3' del'",
                    "V/5' length",
                    "J/3' length",
                    "[cloneDB] Hits (sample)",
                    "[cloneDB] Hits (set)",
                    "Main sample"
                ]

// list of Axis available for aligner
AXIS_ALIGNER = [    
                    "Size",
                    "Sequence length",
                    "Reads length",
                    "GC content",
                    "Productivity",
                    "Number of samples",
                    "[IMGT] Productivity",
                    "[IMGT] VIdentity",
                    "[cloneDB] Hits (sample)",
                    "[cloneDB] Hits (set)"
                ]

// list of Axis available as color
AXIS_COLOR = [    
                    "Size",
                    "Tag",
                    "Clonotype",
                    "CDR3",
                    "Locus",
                    "N length",
                    "V/5' gene",
                    "D gene",
                    "J/3' gene",
                    "GC content",
                    "Productivity",
                    "[IMGT] Productivity",
                    "[IMGT] VIdentity",
                    "Number of samples",
                    "Main sample"
                ]


// Axis properties
AXIS_DEFAULT = {
    "Top": {
        doc:        "",
        fct:        function(clone) {return clone.top},
    },
    "Clonotype": {
        doc:        "",
        labels:     function(){
                        var l = {}
                        for (var i=0; i<m.clones.length; i++){
                            var index = m.clone(i).index
                            l[m.clone(i).index] =  { text:   index,   
                                                     color:  colorGeneratorIndex(index)}
                        }
                        return l
                    },
        fct:        function(clone) {return clone.index},
    },
    "CDR3": {
        doc:        "",
        labels:     function(){
                        var l = {}
                        for (var i=0; i<m.clones.length; i++){
                            var junction = m.clone(i).getSegAASequence('junction');
                            l[junction] =  { text:   junction,   
                                                     color:  colorGeneratorString(junction)}
                        }
                        return l
                    },
        color:      function(t,c) {return colorGeneratorString(c.getSegAASequence('junction'))},
        fct:        function(clone) {return clone.getSegAASequence('junction')},
        autofill:   false
    },
    "V/5' gene": {
        doc:        "V gene (or 5' segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineV.labels))},
        fct:        function(clone) {return clone.getGene("5", false)},
        germline:   function(){return m.germlineV.system},
        sort :      "alphanumerical"
    },
    "V/5' allele": {
        doc:        "V gene (or 5' segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineV.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("5", true)},
        germline:   function(){return m.germlineV.system},
        sort :      "alphanumerical",
        autofill:   false
    },
    "D gene": {
        doc:        "D gene (or middle segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineD.labels))},
        fct:        function(clone) {return clone.getGene("4", false)},
        germline:   function(){return m.germlineD.system},
        sort :      "alphanumerical",
    },
    "D allele": {
        doc:        "D gene (or middle segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineD.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("4", true)},
        germline:   function(){return m.germlineD.system},
        sort :      "alphanumerical",
        autofill:   false
    },
    "J/3' gene": {
        doc:        "J gene (or 3' segment), gathering all alleles",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineJ.labels))},
        fct:        function(clone) {return clone.getGene("3", false)},
        germline:   function(){return m.germlineJ.system},
        sort :      "alphanumerical",
    },
    "J/3' allele": {
        doc:        "J gene (or 3' segment), with allele",
        labels:     function(){return JSON.parse(JSON.stringify(m.germlineJ.labelsWithAlleles))},
        fct:        function(clone) {return clone.getGene("3", true)},
        germline:   function(){return m.germlineJ.system},
        sort :      "alphanumerical",
        autofill:   false
    },
    "Sequence length" : {
        doc:        "length of the consensus sequence of the clonotype",
        fct:        function(clone) {return clone.getSequenceLength()},
        autofill:   true,
        min_step:   1,
        color:      function(t,c){ return d3.piecewise(d3.interpolateRgb.gamma(2.2), ["#00AAFF", "#00EE00", "red"])(t) },
    },    
    "Reads length" : {
        doc:        "average length of the reads belonging to each clonotype",
        labels:     {   
                        "?":   {text:"?",   side: "right"}
                    },
        fct:        function(clone, t) {
                        var len = clone.getAverageReadLength(t)
                        if (len == "undefined" || len == 0) return "?"
                        return Math.round(len)
                    },
        autofill:   true,
        min_step:   1,
        color:      function(t,c){ return d3.piecewise(d3.interpolateRgb.gamma(2.2), ["#00AAFF", "#00EE00", "red"])(t) },
    },
    "GC content" : {
        doc:        "%GC content of the consensus sequence of each clonotype",
        fct:        function(clone) {return clone.getGCContent()},
        autofill:   true,
    },
    "N length": {
        doc:        "N length, from the end of the V/5' segment to the start of the J/3' segment (excluded)",
        fct:        function(clone) {return clone.getNlength()},
        color:      function(t,c){ return d3.piecewise(d3.interpolateRgb.gamma(2.2), ["#00AAFF", "#00EE00", "red"])(t) },
        autofill:   true,
        min_step:   1
    },
    "CDR3 length": {
        doc:        "CDR3 length, in nucleotides, from Cys104 and Phe118/Trp118 (excluded)",
        fct:        function(clone) {return clone.getSegLength('cdr3')},
        color:      function(t,c){ return d3.piecewise(d3.interpolateRgb.gamma(2.2), ["#00AAFF", "#00EE00", "red"])(t) },
        autofill:   true,
        min_step:   1
    },
    "Productivity": {
        doc:        "clone productivity",
        labels:     {
                        "not productive":   {text:"not productive", color: colorGeneratorBool('false'),side: "right"},
                        "no CDR3":          {text:"no CDR3", color: "", side: "right" },
                        "productive":       {text:"productive", color: colorGeneratorBool('true'),side: "left" },
                    },
        fct:        function(clone) {return clone.getProductivityName()},
        sort :      function(a,b){
            var order = ["productive","not-productive","no CDR3"]
            if (order.indexOf(a) == -1 || order.indexOf(b) == -1) return b.localeCompare(a)
            return order.indexOf(a) - order.indexOf(b);
        },
        pretty:     function(tag) { return icon_pm(tag, "productive", "not productive") },
    },
    "Productivity+": {
        doc:        "clone productivity and details when available for lack of productivity",
        labels:     {
                        "productive":       {text:"productive"},
                        "not-productive":   {text:"not productive"}
                    },
        fct:        function(clone) {return clone.getProductivityNameDetailed()},
        sort :      function(a,b){
                        var order = ["productive","not-productive","stop-codon","out-of-frame","no-WPGxG-pattern","no CDR3"]
                        if (order.indexOf(a) == -1 || order.indexOf(b) == -1) return b.localeCompare(a)
                        return order.indexOf(a) - order.indexOf(b);
                    },
        autofill :  true
    },
    "[IMGT] Productivity": {
        doc:        "productivity (as computed by IMGT/V-QUEST)",
        labels:     {
            "not productive":   {text:"not productive"},
            "no CDR3 detected": {text:"no CDR3 detected"},
            "productive":       {text:"productive"},
        },
        fct:        function(clone) { return clone.getProductivityIMGT() },
        pretty: function(tag) { return icon_pm(tag, "productive", "not productive"); },
    },
    "[IMGT] VIdentity": {
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
    },
    "Tag": {
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
    "Coverage": {
        doc:        "ratio of the length of the clonotype consensus sequence to the median read length of the clonotype",
        // "Coverage between .85 and 1.0 (or more) are good values",
        fct:        function(clone){return clone.coverage},
        scale:      {
                        mode:   "linear",
                        min:    0,
                        max:    1
                    },
        autofill:   true
    },
    "Locus" : {
        doc:        "locus or recombination system",
        fct:        function(clone){return clone.germline},
        color:      function(t,c) {return m.germlineList.list[c.germline].color},
        autofill:   true
    },
    "Size" : {
        doc:        "ratio of the number of reads of each clonotype to the total number of reads in the selected locus",
        fct :       function(clone,t){return clone.getSize(t)},
        scale:      {   mode: "log"},
        color:      function(t,c){ return d3.piecewise(d3.interpolateRgb.gamma(2.2), ["#00AAFF", "#00EE00", "red"])(t) },
        autofill:   true,
        pretty:     function(size) {return createClassedSpan("sizeBox sixChars", (self.m ? self.m : self).getStrAnySize(undefined, size)) },
        hover:      function(clone, t){ return ""+ clone.getPrintableSize(t) + " reads"}
    },
    "Size (other)" : {
        doc:        "ratio of the number of reads of each clonotype to the total number of reads in the selected locus, on the previously selected sample",
        fct :       function(clone){return clone.getSize(m.tOther)},
        scale:      {
                        mode: "log",
                        reverse: true
                    },
        autofill:   true,
    },
    "Number of samples" : {
        label:      "number of samples sharing each clonotype",
        fct :       function(clone){return clone.getNumberNonZeroSamples()},
        scale:      {   
                        mode: "linear",
                        min: 1,
                        //max : function(){ return self.m.samples.number }
                    },
        autofill:   true,
    },
    "Primers gap": {
        doc:        "interpolated length, between selected primer set (inclusive)",
        fct:        function(clone) {return clone.getSegLengthDoubleFeature('primer5', 'primer3')},
        autofill:   true
    }, 
    "V/5' del'": {
        doc:        "number of deleted nucleotides at the 3' side of the V/5' segment",
        fct:        function(clone) { return clone.getDeletion('5', 'delRight') },
        autofill:   true
    },
    "J/3' del'": {
        doc:        "number of deleted nucleotides at the 5' side of the J/3' segment",
        fct:        function(clone) {return clone.getDeletion('3', 'delLeft')},
        autofill:   true
    },
    "V/5' length": {
        doc:        "length of the V/5' gene in the consensus sequence",
        fct:        function(clone) {
                        var feature = clone.getSegFeature('5')
                        return feature.stop - (feature.start ? feature.start : 0)
                    },
        autofill:   true
    },
    "J/3' length": {
        doc:        "length of the J/3' gene in the consensus sequence",
        fct:        function(clone) {
                        var feature = clone.getSegFeature('3')
                        return (feature.stop ? feature.stop : clone.sequence.length) - feature.start
                    },
        autofill:   true
    },
    "[cloneDB] Hits (sample)": {
        doc:        "number of sample sharing clones in cloneDB",
        scale:      {
                        "mode": "linear",
                        "min": 0
                    },
        class:      "devel-mode",
        fct:        function(clone) {
                        var n = clone.numberInCloneDB()
                        if (typeof n == "undefined") return "-/-"
                        return n
                    },
        pretty:     function(n) {
                        var span = createClassedSpan("sizeBox sixChars", n)
                        if (n == "-/-") span.title = "missing data, use 'send to cloneDB' tool in aligner to update value"
                        return span
                    },
        autofill:   true,
        //hide : (typeof config === 'undefined' || ! config.clonedb),
    },
    "[cloneDB] Hits (set)": {   
        doc:        "number of patients/runs/sets sharing clonotypes in cloneDB",
        scale:      {
                        "mode": "linear",
                        "min": 0
                    },
        class:      "devel-mode",
        fct:        function(clone) {
                        var n = clone.numberSampleSetInCloneDB()
                        if (typeof n == "undefined") return "-/-"
                        return n
                    },
        pretty:     function(n) {
                        var span = createClassedSpan("sizeBox sixChars", n)
                        if (n == "-/-") span.title = "missing data, use 'send to cloneDB' tool in aligner to update value"
                        return span
                    },
        autofill:    true,
        //hide : (typeof config === 'undefined' || ! config.clonedb),
    },
    "TSNEX": {   
        doc:        "",
        fct:        function(clone) {
                        if (clone.tsne )return clone.tsne[0]
                        return undefined
                    },
        scale:      {
                        "mode": "linear",
                        "min": 0,
                        "max": 1
                    },
        min_step:   0.1,
        max_step:   0.1
    },
    "TSNEY": {   
        doc:        "",
        fct:        function(clone) {            
                        if (clone.tsne )return clone.tsne[1]
                        return undefined
                    },
        scale:      {
                        "mode": "linear",
                        "min": 0,
                        "max": 1
                    },
        min_step:   0.1,
        max_step:   0.1
    },
    "TSNEX_LOCUS": {   
        doc:        "",
        germline:   function(){return m.germlineV.system},
        fct:        function(clone) {
                        if (clone.tsne_system )return clone.tsne_system[0]
                        return undefined
                    },
        scale:      {
                        "mode": "linear",
                        "min": 0,
                        "max": 1
                    },
        min_step:   0.1,
        max_step:   0.1
    },
    "TSNEY_LOCUS": {   
        doc:        "",
        germline:   function(){return m.germlineV.system},
        fct:        function(clone) {            
                        if (clone.tsne_system )return clone.tsne_system[1]
                        return undefined
                    },
        scale:      {
                        "mode": "linear",
                        "min": 0,
                        "max": 1
                    },
        min_step:   0.1,
        max_step:   0.1
    },
    "Main sample":{
        doc:        "sample in which the clone reach its maximum size",
        fct:        function(c){ return c.getMaxSizeTimepoint() },
        //color:      function(t,c){ return colorGeneratorIndex(c.getMaxSizeTimepoint()) },
        labels:     function(){ 
                        var l = {}
                        if (typeof m.samples == 'undefined') return l
                        for (var i in m.samples.order){
                            var time = m.samples.order[i]
                            l[time] =  {
                                text:   "" + m.getStrTime(time),
                                color: colorGeneratorIndex(time)}
                        }
                        return l
                    }
        
    }
}


function createClassedSpan (className, innerText) {
    var span = document.createElement('span');
    span.className = className;
    span.textContent = innerText;
    return span;
}
