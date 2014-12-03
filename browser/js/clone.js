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

function Clone(data, model, hash) {
    this.m = model
    this.hash = hash
    this.split = false
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
    
    this.m.clusters[hash]=[hash]
    this.m.clones[hash]=this
}


Clone.prototype = {
    
    
    /* return clone name
     * or return name of the representative sequence of the clone
     *
     * */
    getName: function () {
        if (this.m.clusters[this.hash].name){
            return this.m.clusters[this.hash].name;
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
        myConsole.log("changeName() (clone " + this.hash + " <<" + newName + ")");
        this.c_name = newName;
        this.m.updateElem([this.hash]);
    }, //fin changeName,

    
    
    
    


    /* compute the clone size ( sum of all clones clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getSize: function (time) {
        time = typeof time !== 'undefined' ? time : this.m.t;

        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.getReads(time) / this.m.reads.segmented[time]
        
        if (this.m.norm) result = this.m.normalize(result, time)

        return result
    }, //end getSize
    
    //special getSize for scatterplot (ignore rescale)
    getSize2: function (time) {
        time = typeof time !== 'undefined' ? time : this.m.t;
        
        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.getReads(time) / this.m.reads.segmented[time]
        
        if (this.m.norm && this.m.normalization.method!="rescale") result = this.m.normalize(result, time)

        return result
    },
    
    
    /* return the clone size with a fixed number of character
     * use scientific notation if neccesary
     * */
    getStrSize: function () {
        var size = this.getSize();
        return this.m.formatSize(size, true)
    },
    
    /* 
     *
     * */
    getSequenceSize: function (time) {
        time = typeof time !== 'undefined' ? time : this.m.t;
        
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
        time = typeof time !== 'undefined' ? time : this.m.t;
        var result = 0;

        var cluster = this.m.clusters[this.hash]
        for (var j = 0; j < cluster.length; j++) {
            result += this.m.clone(cluster[j]).reads[time];
        }

        return result

    }, //end getSize

    /* 
     *
     * */
    getSequenceReads: function (time) {
        time = typeof time !== 'undefined' ? time : this.m.t;
        return this.reads[time];

    }, //end getSequenceSize
    
    
    
    
    
    
    
    
    getSystem: function () {
        if (typeof (this.germline) != 'undefined') {
            return this.germline;
        }
    }, 
    
    
    getV: function (withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (typeof (this.seg) != 'undefined' && typeof (this.seg["5"]) != 'undefined') {
            if (withAllele) {
                return this.seg["5"]
            }else{
                return this.seg["5"].split('*')[0];
            }
        }
        return "undefined V";
    },
    
    getD: function (withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (typeof (this.seg) != 'undefined' && typeof (this.seg["4"]) != 'undefined') {
            if (withAllele) {
                return this.seg["4"]
            }else{
                return this.seg["4"].split('*')[0];
            }
        }
        return "undefined D";
    },

    getJ: function (withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (typeof (this.seg) != 'undefined' && typeof (this.seg["3"]) != 'undefined') {
            if (withAllele) {
                return this.seg["3"]
            }else{
                return this.seg["3"].split('*')[0];
            }
        }
        return "undefined J";
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
        return "undefined";
    },
    
    getNlength: function () {
        if (typeof this.seg != 'undefined'){
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
    
    
    
    
    
    /* give a new custom tag to a clone
     *
     * */
    changeTag: function (newTag) {
        newTag = "" + newTag
        newTag = newTag.replace("tag", "");
        myConsole.log("changeTag() (clone " + this.hash + " <<" + newTag + ")");
        this.tag = newTag;
        this.m.updateElem([this.hash]);
    },
    
    getColor: function () {
        if (this.color) {
            return this.color;
        } else {
            return color['@default'];
        }
    }, 
    
    getTag: function () {
        if (this.tag) {
            return this.tag;
        } else {
            return default_tag;
        }
    }, 
    
    
    /* compute clone color
     *
     * */
    updateColor: function () {
        if (this.m.focus == this.hash){
            this.color = color['@select'];
        }else if (this.m.colorMethod == "abundance") {
            var size = this.getSize()
            if (this.m.clusters[this.hash].length==0){ size = this.getSequenceSize() }
            if (size == 0){
                this.color = color['@default'];
            }else{
                this.color = colorGenerator(this.m.scale_color(size * this.m.precision), color_s, color_v);
            }
        }else if (this.m.colorMethod == "Tag"){
            this.color =  tagColor[this.tag];
        }else if (this.m.colorMethod == "dbscan"){
            this.color =  this.colorDBSCAN;
        }else if (this.m.colorMethod == "V" && this.getV() != "undefined V"){
            this.color = "";
            var allele = this.m.germlineV.allele[this.getV()]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "D" && this.getD() != "undefined D"){
            this.color = "";
            var allele = this.m.germlineD.allele[this.getD()]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "J" && this.getJ() != "undefined J"){
            this.color = "";
            var allele = this.m.germlineJ.allele[this.getJ()]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "N"){
            this.color =  this.colorN;
        }else if (this.m.colorMethod == "system") {
            this.color = this.m.germlineList.getColor(this.germline)
        }else{
            this.color = color['@default'];
        }
    },
    
    
    /* return info about a sequence/clone in html 
     *
     * */
    getHtmlInfo: function () {
        var isCluster = this.m.clusters[this.hash].length
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
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> clone information </td></tr>"
            html += "<tr><td> clone name </td><td colspan='" + time_length + "'>" + this.getName() + "</td></tr>"
            html += "<tr><td> clone size (n-reads (total reads) )</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getReads(this.m.samples.order[i]) + "  (" + this.m.reads.segmented[this.m.samples.order[i]] + ")</td>"
            }
            html += "</tr><tr><td> clone size (%)</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + (this.getSize(this.m.samples.order[i]) * 100).toFixed(3) + " % </td>"
            }
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> cluster's main sequence information</td></tr>"
        }else{
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> sequence information</td></tr>"
        }

        
        //sequence info (or cluster main sequence info)
        html += "<tr><td> sequence name </td><td colspan='" + time_length + "'>" + this.getSequenceName() + "</td></tr>"
        html += "<tr><td> code </td><td colspan='" + time_length + "'>" + this.getCode() + "</td></tr>"
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
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> segmentation information</td></tr>"
        
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
        html += "<tr><td> 5 </td><td colspan='" + time_length + "'>" + this.getV() + "</td></tr>"
        html += "<tr><td> 4 </td><td colspan='" + time_length + "'>" + this.getD() + "</td></tr>"
        html += "<tr><td> 3 </td><td colspan='" + time_length + "'>" + this.getJ() + "</td></tr>"
        
        
        //other info (clntab)
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> other information</td></tr>"
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
    
    enable: function (top) {
        if (this.top <= top && tagDisplay[this.tag] == 1 && this.id != "other") {
            this.active = true;
        }
    },
    
    disable: function () {
            this.active = false;
    },
    
    unselect: function () {
        myConsole.log("unselect() (clone " + this.hash + ")")
        if (this.select) {
            this.select = false;
        }
        this.m.updateElemStyle([this.hash]);
    },
    
    isSelected: function () {
        return this.select
    },
    
    isActive: function () {
        return this.active
    },
    
    isFocus: function () {
        return this.hash == this.m.focus
    },
    
}












