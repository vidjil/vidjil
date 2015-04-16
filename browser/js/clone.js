/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
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

function Clone(data, model, index) {
    this.m = model
    this.index = index
    this.split = false
    this.seg = {};
    var key = Object.keys(data)
    
    for (var i=0; i<key.length; i++ ){
        this[key[i]]=data[key[i]]
    }
    
    if (typeof (this.getSequence()) != 'undefined' && typeof (this.name) != 'undefined') {
        this.shortName = this.name.replace(new RegExp('IGHV', 'g'), "VH");
        this.shortName = this.shortName.replace(new RegExp('IGHD', 'g'), "DH");
        this.shortName = this.shortName.replace(new RegExp('IGHJ', 'g'), "JH");
        this.shortName = this.shortName.replace(new RegExp('TRG', 'g'), "");
        this.shortName = this.shortName.replace(new RegExp('\\*..', 'g'), "");
    }
    
    this.m.clusters[index]=[index]
    this.m.clones[index]=this
    this.tag = this.getTag();
    this.computeGCContent()
}


Clone.prototype = {
    
    
    /* return clone name
     * or return name of the representative sequence of the clone
     *
     * */
    getName: function () {
        if (this.m.clusters[this.index].name){
            return this.m.clusters[this.index].name;
        }else if (this.c_name) {
            return this.c_name;
        } else if (this.name) {
            return this.name;
        } else {
            return this.getSequenceName();
        }
    }, 
    
    /* return custom name
     * or segmentation name
     *
     * */
    getSequenceName: function () {
        if (typeof (this.c_name) != 'undefined') {
            return this.c_name;
        } else {
            return this.getCode();
        }
    }, //end getName

    /* return segmentation name "geneV -x/y/-z geneJ",
     * return a short segmentation name if system == IGH,
     *
     * */
    getCode: function () {
        if (typeof (this.sequence) != 'undefined' && typeof (this.name) != 'undefined') {
            if (this.length > 100 && typeof (this.shortName) != 'undefined') {
                return this.shortName;
            } else {
                return this.name;
            }
        } else {
            return this.id;
        }
    }, //end getCode
    
    
    /* give a new custom name to a clone
     *
     * */
    changeName: function (newName) {
        console.log("changeName() (clone " + this.index + " <<" + newName + ")");
        this.c_name = newName;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true
    }, //fin changeName,

    
    
    
    


    /** compute the clone size ( sum of all clones clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getSize: function (time) {
        time = this.m.getTime(time);
        
        if (this.m.reads.segmented[time] == 0 ) return 0;
        var result = this.getReads(time) / this.m.reads.segmented[time];
        
        if (this.m.norm) result = this.m.normalize(result, time);

        return result;
    }, //end getSize
    
    
    getSizeZero: function (time) {
        time = this.m.getTime(time);
        
        result = this.getSize(time);
        if (result == 0) return undefined;
        return result;
    }, 
    
    //special getSize for scatterplot (ignore constant)
    getSize2: function (time) {
        time = this.m.getTime(time)
        
        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.getReads(time) / this.m.reads.segmented[time]
        
        if (this.m.norm && this.m.normalization.method!="constant") result = this.m.normalize(result, time)

        return result
    },
    
    
    /* return the clone size with a fixed number of character
     * use scientific notation if neccesary
     * */
    getStrSize: function (time) {
        var size = this.getSize(this.m.getTime(time));
        return this.m.formatSize(size, true)
    },
    
    getSystemSize: function (time) {
        time = this.m.getTime(time)
        
        var system_reads = this.m.reads.segmented[time]
        if (this.germline in this.m.reads.germline) system_reads = this.m.reads.germline[this.germline][time]
        
        if (system_reads == 0 ) return 0
        var result = this.getReads(time) / system_reads
        
        if (this.m.norm) result = this.m.normalize(result, time)

        return result
    },
    
    getStrSystemSize: function (time) {
        time = this.m.getTime(time)
        var size = this.getSystemSize(time);
        return this.m.formatSize(size, true)
    },


    /* Ratio relative to the system group */
    getSystemGroupSize: function (time) {
        var group_reads = this.m.systemGroupSize(this.germline, this.m.getTime(time))

        if (group_reads == 0 ) return 0 ;
        var result = this.getReads(time) / group_reads
        if (this.norm) result = this.normalize(result, time)
        return result

    },

    getStrSystemGroupSize: function (time) {
        time = this.m.getTime(time)
        var size = this.getSystemGroupSize(time)
        return this.m.formatSize(size, true)
    },

    /* return a printable size such as either '26.32%' or '26.32% (33.66% of IGH)' (when there are several systems) */
    getPrintableSize: function (time) {

        var size = this.getReads(time)
        s = size + ' read' + (size > 1 ? 's' : '') + ' '

        s += '('
        s += this.getStrSize(time)

        if (this.m.system_available.length>1) {

            systemGroup = this.m.systemGroup(this.germline)
            if (systemGroup.indexOf('/') > -1) // if the system group has more than one germline
            {
                s += ', '
                s += this.getStrSystemGroupSize(time) + ' of ' + systemGroup
            }

            s += ', '
            s += this.getStrSystemSize(time) + ' of ' + this.germline
        }

        s += ')'
        return s
    },

    getFasta: function() {
        fasta = ''
        fasta += '>' + this.getCode() + '    ' + this.getPrintableSize() + '\n'
        fasta += this.getPrintableSegSequence() + '\n'

        return fasta
    },
    
    /* 
     *
     * */
    getSequenceSize: function (time) {
        time = this.m.getTime(time)
        
        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.getSequenceReads(time) / this.m.reads.segmented[time]
        
        if (this.norm) {
            result = this.m.normalize(result, time)
        }

        return result

    }, //end getSequenceSize


    /* compute the clone reads number ( sum of all reads of clones clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getReads: function (time) {
        time = this.m.getTime(time)
        var result = 0;

        var cluster = this.m.clusters[this.index]
        for (var j = 0; j < cluster.length; j++) {
            result += this.m.clone(cluster[j]).reads[time];
        }

        return result

    }, //end getSize

    /* 
     *
     * */
    getSequenceReads: function (time) {
        time = this.m.getTime(time)
        return this.reads[time];

    }, //end getSequenceSize
    
    
    
    
    
    
    
    
    getSystem: function () {
        if (typeof (this.germline) != 'undefined') {
            return this.germline;
        }
    }, 
    
    getGene: function (type, withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (typeof (this.seg) != 'undefined' && typeof (this.seg[type]) != 'undefined') {
            if (withAllele) {
                return this.seg[type];
            }else{
                return this.seg[type].split('*')[0];
            }
        }
        switch (type) {
            case "5" :
                return "undefined V";
            case "4" :
                return "undefined D";
            case "3" :
                return "undefined J";
        }
    },
    
    getNlength: function () {
        if (typeof this.seg != 'undefined' && typeof this.seg['3start'] != 'undefined'){
            return this.seg['3start']-this.seg['5end']-1
        }else{
            return 0
        }
    },
    
    getSequence : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence != 0){
            return this.sequence
        }else{
            return "0";
        }
    },

    getPrintableSegSequence: function () {
        if (typeof this.seg == 'undefined' || typeof this.seg['5end'] == 'undefined' || typeof this.seg['3start'] == 'undefined') {
            return this.getSequence()
        }

        var s = ''
        s += this.sequence.substring(0,  this.seg['5end'])
        s += '\n'
        if (this.seg['5end'] < this.seg['3start'] - 1) {
            s += this.sequence.substring(this.seg['5end'], this.seg['3start'] - 1)
            s += '\n'
        }
        s += this.sequence.substring(this.seg['3start'] - 1)
        return s
    },

    computeGCContent: function () {
        if (typeof (this.sequence) == 'undefined') {
            this.GCContent = '?'
            return
        }

        var gc = 0
        for (var i in this.sequence) {
            if ("GgCc".indexOf(this.sequence[i]) > -1)
                gc++ }

        this.GCContent = 100 * gc / this.sequence.length
    },

    getGCContent : function () {
        if (typeof (this.GCContent) != 'undefined'){
            return this.GCContent
        }else{
            return 0;
        }
    },

    getSequenceLength : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence != 0){
            return this.sequence.length
        }else{
            return 0;
        }
    },    
    
    
    
    
    /* give a new custom tag to a clone
     *
     * */
    changeTag: function (newTag) {
        newTag = "" + newTag
        newTag = newTag.replace("tag", "");
        console.log("changeTag() (clone " + this.index + " <<" + newTag + ")");
        this.tag = newTag;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true;
    },
    
    getColor: function () {
        if (this.color) {
            return this.color;
        } else {
            "";
        }
    }, 
    
    getTag: function () {
        if (this.tag) {
            return this.tag;
        } else {
            return this.m.default_tag;
        }
    }, 
    
    getTagName: function () {
        return this.m.tag[this.getTag()].name
    }, 
    
    
    /* compute clone color
     *
     * */
    updateColor: function () {
        if (this.m.focus == this.index){
            this.color = "";
        }else if (this.m.colorMethod == "abundance") {
            var size = this.getSize()
            if (this.m.clusters[this.index].length==0){ size = this.getSequenceSize() }
            if (size == 0){
                this.color = "";
            }else{
                this.color = colorGenerator(this.m.scale_color(size * this.m.precision));
            }
        }else if (this.m.colorMethod == "Tag"){
            this.color =  this.m.tag[this.getTag()].color;
        }else if (this.m.colorMethod == "dbscan"){
            this.color =  this.colorDBSCAN;
        }else if (this.m.colorMethod == "V" && this.getGene("5") != "undefined V"){
            this.color = "";
            var allele = this.m.germlineV.allele[this.getGene("5")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "D" && this.getGene("4") != "undefined D"){
            this.color = "";
            var allele = this.m.germlineD.allele[this.getGene("4")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "J" && this.getGene("3") != "undefined J"){
            this.color = "";
            var allele = this.m.germlineJ.allele[this.getGene("3")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "N"){
            this.color =  this.colorN;
        }else if (this.m.colorMethod == "system") {
            this.color = this.m.germlineList.getColor(this.germline)
        }else{
            this.color = "";
        }
    },
    
    
    /* return info about a sequence/clone in html 
     *
     * */
    getHtmlInfo: function () {
        var isCluster = this.m.clusters[this.index].length
        var time_length = this.m.samples.order.length
        var html = ""

        if (isCluster) {
            html = "<h2>Cluster info : " + this.getName() + "</h2>"
        } else {
            html = "<h2>Sequence info : " + this.getSequenceName() + "</h2>"
        }
        
        //column
        html += "<div id='info_window'><table><tr><th></th>"

        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.m.getStrTime(this.m.samples.order[i], "name") + "</td>"
        }
        html += "</tr>"

        //cluster info
        if (isCluster) {
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> clone </td></tr>"
            html += "<tr><td> clone name </td><td colspan='" + time_length + "'>" + this.getName() + "</td></tr>"
            html += "<tr><td> clone size (n-reads (total reads) )</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getReads(this.m.samples.order[i]) + "  (" + this.m.reads.segmented[this.m.samples.order[i]] + ")</td>"
            }
            html += "</tr><tr><td> clone size (%)</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + (this.getSize(this.m.samples.order[i]) * 100).toFixed(3) + " % </td>"
            }
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> representative sequence</td></tr>"
        }else{
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> sequence</td></tr>"
        }

        
        //sequence info (or cluster main sequence info)
        html += "<tr><td> sequence name </td><td colspan='" + time_length + "'>" + this.getSequenceName() + "</td></tr>"
        html += "<tr><td> code </td><td colspan='" + time_length + "'>" + this.getCode() + "</td></tr>"
        html += "<tr><td> length </td><td colspan='" + time_length + "'>" + this.getSequenceLength() + "</td></tr>"
        html += "<tr><td> size (n-reads (total reads) )</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getSequenceReads(this.m.samples.order[i]) + 
                    "  (" + this.m.reads.segmented[this.m.samples.order[i]] + ")</td>"
        }
        html += "</tr>"
        html += "<tr><td> size (%)</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + (this.getSequenceSize(this.m.samples.order[i]) * 100)
                .toFixed(3) + " % </td>"
        }
        html += "</tr>"

        
        //segmentation info
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> segmentation</td></tr>"
        
        if (typeof this.stats != 'undefined'){
            var total_stat = [];
            for (var i=0; i<this.stats.length; i++) total_stat[i] = 0
            for (var i=0; i<this.stats.length; i++){
                for (var key in this.stats[i]) total_stat[i] +=  this.stats[i][key]
            }
            
            for (var key in this.stats[0]){
                html += "<tr><td> "+this.m.segmented_mesg[key]+"</td>"
                for (var i = 0; i < time_length; i++) {
                html += "<td>"+this.stats[i][key] 
                        + " (" + ((this.stats[i][key]/total_stat[i]) * 100).toFixed(1) + " %)</td>"
                }
            }
        }
        
        html += "<tr><td> sequence </td><td colspan='" + time_length + "'>" + this.sequence + "</td></tr>"
        html += "<tr><td> id </td><td colspan='" + time_length + "'>" + this.id + "</td></tr>"
        html += "<tr><td> 5 </td><td colspan='" + time_length + "'>" + this.getGene("5") + "</td></tr>"
        html += "<tr><td> 4 </td><td colspan='" + time_length + "'>" + this.getgene("4") + "</td></tr>"
        html += "<tr><td> 3 </td><td colspan='" + time_length + "'>" + this.getGene("3") + "</td></tr>"
        
        
        //other info (clntab)
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> &nbsp; </td></tr>"
        for (var key in this) {
            if (key[0] == "_") {
                html += "<tr><td>" + key + "</td>"
                if (this[key] instanceof Array) {
                    for (var i = 0; i < time_length; i++) {
                        html += "<td>" + this[key][this.m.samples.order[i]] + "</td>"
                    }
                } else {
                    html += "<td>" + this[key] + "</td>"
                }
                html += "</tr>"
            }
        }
        html += "</table></div>"
        return html
    },
    
    toCSV: function () {
        var csv = this.getName() + "," + this.id + "," + this.getSystem() + "," + this.getTagName() + "," 
                + this.getGene("5") + "," + this.getGene("4") + "," + this.getGene("3") + "," + this.getSequence()
        
        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getReads(this.m.samples.order[i])
        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getSize(this.m.samples.order[i])
        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getPrintableSize(this.m.samples.order[i]).replace(/,/g, ';')
        
        return csv
    },
    
    enable: function (top) {
        if (this.top <= top && this.m.tag[this.getTag()].display && this.id != "other") {
            this.active = true;
        }
    },
    
    disable: function () {
        this.active = false;
    },
    
    unselect: function () {
        console.log("unselect() (clone " + this.index + ")")
        if (this.select) {
            this.select = false;
        }
        this.m.updateElemStyle([this.index]);
    },
    
    isSelected: function () {
        return this.select
    },
    
    isActive: function () {
        return this.active
    },
    
    isFocus: function () {
        return this.index == this.m.focus
    },
    
    get: function (field_name, time) {
        if (typeof this[field_name] != 'undefined'){
            var field = this[field_name]
        }else if (typeof this.seg[field_name] != 'undefined'){
            var field = this.seg[field_name]
        }
        
        if (typeof field != 'object'){
            return field;
        }else{
            time = this.m.getTime(time)
            return field[time]
        }
    }
    
}












