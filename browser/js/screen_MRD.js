/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2020 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Joao Meidanis <joao.m@boldrini.org.br>
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
 * Adding functionality to the Clone object so that it can display MRD
 * estimates obtained from the .vidjil file as modified by
 * spike-normalization.py in the info box.
 * 
 * The Clone methods added here are new, with the exception of
 * getHtmlInfo, which is a modification of the original function in
 * clone.js.  Coding conventions and comment styles are borrowed from
 * clone.js.
 */

/**
 * @return {string} the family used for fiting at the given time
 */
Clone.prototype.getFittingFamily = function(time) {
    if (this.m.samples.prevalent[time] == 0) {
	// diagnostic sample
	return "";
    } else if ('family' in this) {
	return this.family[time];
    } else {
	// negative clone: report UNI
	return "UNI";
    }
};

/**
 * @return {string} the normalization coefficient at the given time
 */
Clone.prototype.getNormCoeff = function(time) {
    if (this.m.samples.prevalent[time] == 0) {
	// diagnostic sample
	return "";
    } else if ('norm_coeff' in this) {
	return this.norm_coeff[time];
    } else if ('UNI_COEFF' in this.m.samples) {
	// negative clone: report UNI
	return this.m.samples.UNI_COEFF[time];
    } else {
	return "";
    }
};

/**
 * @return {string} the Pearson R2 value for the spike-in fitting at the given time
 */
Clone.prototype.getR2 = function(time) {
    if (this.m.samples.prevalent[time] == 0) {
	// diagnostic sample
	return "";
    } else if ('R2' in this) {
	return this.R2[time].toString();
    } else if ('UNI_R2' in this.m.samples) {
	// negative clone: report UNI R2
	return this.m.samples.UNI_R2[time];
    } else {
	return "";
    }
};

/**
 * @return {string} the prevalent germline at the given time
 */
Clone.prototype.getPrevalent = function(time) {
    if (this.m.samples.prevalent[time] == 0) {
	// diagnostic sample
	return "";
    } else {
	return this.m.samples.prevalent[time];
    }
};

/**
 * @return {string} the amplification coefficient at the given time
 * (ampl. coeff. = total prevalent / total spike)
 */
Clone.prototype.getAmplCoeff = function(time) {
    if (this.m.samples.prevalent[time] == 0) {
	// diagnostic sample
	return "";
    } else if ('ampl_coeff' in this.m.samples) {
	return this.m.samples.ampl_coeff[time].toString();
    } else {
	return "Please use version 6 or later of spike-normalization";
    }
};

/* return info about a sequence/clone in html
 *
 * Modified from clone.js to add info on MRD calculation
 */
Clone.prototype.getHtmlInfo = function () {
    var isCluster = this.getCluster().length
    var time_length = this.m.samples.order.length
    var html = ""

    var header = function(content) { return "<tr><td class='header' colspan='" + (time_length + 1) + "'>" + content + "</td></tr>" ; }
    var row_1  = function(item, content) { return "<tr><td>" + item + "</td><td colspan='" + time_length + "'>" + content + "</td></tr>" ; }

    if (isCluster) {
        html = "<h2>Cluster info : " + this.getName() + "</h2>"
    } else {
        html = "<h2>Sequence info : " + this.getSequenceName() + "</h2>"
    }

    html += "<p>select <a class='button' onclick='m.selectCorrelated(" + this.index + ", 0.90); m.closeInfoBox();'>correlated</a> clones</p>"
    html += "<p>select <a class='button' onclick='m.selectCorrelated(" + this.index + ", 0.99); m.closeInfoBox();'>strongly correlated</a> clones</p>"
    
    //column
    html += "<div id='info_window'><table><tr><th></th>"

    for (var i = 0; i < time_length; i++) {
        html += "<td>" + this.m.getStrTime(this.m.samples.order[i], "name") + "</td>"
    }
    html += "</tr>"

    //warnings
    if (this.isWarned()) {
        html += header("warnings")

        for (i = 0; i < this.warn.length; i++) {
            html += row_1(this.warn[i].code, this.warn[i].msg);
        }
    }

    //cluster info
    if (isCluster) {
        html += header("clone")
        html += row_1("clone name", this.getName())
        html += row_1("clone short name", this.getShortName())

        html += "<tr><td>clone size (n-reads (total reads))"
        if (this.normalized_reads && this.m.normalization_mode == this.m.NORM_EXTERNAL) {
            html += "<br />[normalized]"
        }
        html += "</td>"
        for (var j = 0; j < time_length; j++) {
            html += "<td>"
            html += this.getRawReads(this.m.samples.order[j]) + "  (" + this.m.reads.segmented[this.m.samples.order[j]] + ")"
            if (this.normalized_reads && this.m.normalization_mode == this.m.NORM_EXTERNAL) {
                html += "<br />[" + this.getReads(this.m.samples.order[j]).toFixed(2) + "]"
            }
            if (typeof this.m.db_key.config != 'undefined' ) {
                html += "&emsp;"
                var sample_set_id = this.m.samples.sequence_file_id[this.m.samples.order[j]];
                call_reads = "db.get_read('" + this.id + "', "+ this.index +", " + sample_set_id + ')';
                html += '<i onclick="' + call_reads + '; m.closeInfoBox()" class="icon-down" title="Download reads from this clone"></i>';
            }
            html += "</td>"
        }
        html += "</tr><tr><td>clone size (%)</td>"
        for (var k = 0; k < time_length; k++) {
            html += "<td>" + this.getStrSize(this.m.samples.order[k]) + "</td>"
        }
	if ('prevalent' in this.m.samples) {
	    // this .vidjil file is not all-diagnostic:
	    // show R2, etc, fields for follow-up samples
	    html += "</tr><tr><td>prevalent germline</td>"
	    for (k = 0; k < time_length; k++) {
                html += "<td>" + this.getPrevalent(this.m.samples.order[k]) + "</td>"
	    }
	    html += "</tr><tr><td>family used for fitting</td>"
	    for (k = 0; k < time_length; k++) {
                html += "<td>" + this.getFittingFamily(this.m.samples.order[k]) + "</td>"
	    }
	    html += "</tr><tr><td>normalization coefficient</td>"
	    for (k = 0; k < time_length; k++) {
                html += "<td>" + this.getNormCoeff(this.m.samples.order[k]) + "</td>"
	    }
	    html += "</tr><tr><td>Pearson R2</td>"
	    for (k = 0; k < time_length; k++) {
                html += "<td>" + this.getR2(this.m.samples.order[k]) + "</td>"
	    }
	    html += "</tr><tr><td>total prevalent / total spikes</td>"
	    for (k = 0; k < time_length; k++) {
                html += "<td>" + this.getAmplCoeff(this.m.samples.order[k]) + "</td>"
	    }
	}
        html += header("representative sequence")
    }else{
        html += header("sequence")
    }

    
    //sequence info (or cluster main sequence info)
    if (this.hasSequence()){
        html += row_1("sequence name", this.getSequenceName())
        html += row_1("code", this.getCode())
        html += row_1("length", this.getSequenceLength())
    }

    //coverage info
    if (typeof this.coverage != 'undefined') {
        html += row_1("average coverage",
                      "<span " +
                      (this.coverage < this.COVERAGE_WARN ? "class='warning'" : "") +
                      ">" +
                      this.coverage.toFixed(3) + "</span>")
    }

    // e-value
    if (typeof this.eValue != 'undefined') {
        html += row_1("e-value",
                      "<span " +
                      (this.eValue > this.EVALUE_WARN ? "class='warning'" : "") +
                      ">" +
                      this.eValue + "</span>")
    }

    // abundance info
    html += "<tr><td>size (n-reads (total reads))</td>"
    for (var l = 0; l < time_length; l++) {
        html += "<td>" + this.get('reads',this.m.samples.order[l]) + 
            "  (" + this.m.reads.segmented[this.m.samples.order[l]] + ")</td>"
    }
    html += "</tr>"
    html += "<tr><td>size (%)</td>"
    for (var m = 0; m < time_length; m++) {
        html += "<td>" + this.getStrSequenceSize(this.m.samples.order[m]) + "</td>"
    }
    html += "</tr>"

    
    //segmentation info
    html += header("segmentation" +
                   " <button type='button' onclick='m.clones["+ this.index +"].toggle()'>edit</button>" + //Use to hide/display lists 
                   this.getHTMLModifState()) // icon if manual changement

    if (typeof this.stats != 'undefined'){
        var total_stat = [];
        for (var n=0; n<this.stats.length; n++) total_stat[n] = 0
        for (var o=0; o<this.stats.length; o++){
            for (var key in this.stats[o]) total_stat[o] +=  this.stats[o][key]
        }
        
        for (var idx in this.stats[0]){
            html += "<tr><td> "+this.m.segmented_mesg[idx]+"</td>"
            for (var p = 0; p < time_length; p++) {
                html += "<td>"+this.stats[p][idx] +
                    " (" + ((this.stats[p][idx]/total_stat[p]) * 100).toFixed(1) + " %)</td>"
            }
        }
    }
    
    if (this.hasSequence()){
        html += row_1("sequence", this.sequence)
    }
    if (this.id != undefined){
        html += row_1("id", this.id)
    }
    if (this.id != undefined){
        html += row_1("locus", this.m.systemBox(this.germline).outerHTML + this.germline +
                      "<div class='div-menu-selector' id='listLocus' style='display: none'>" + this.createLocusList() + "</div>")
    }
    if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("5") != "undefined V")){
        html += row_1("V gene (or 5')", this.getGene("5") +
                      "<div class='div-menu-selector' id='listVsegment' style='display: none'>" + this.createSegmentList("Vsegment") + "</div>")
    }
    if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("4") != "undefined D")){
        html += row_1("(D gene)", this.getGene("4") +
                      "<div class='div-menu-selector' id='listDsegment' style='display: none'>" + this.createSegmentList("Dsegment") + "</div>")
    }
    if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("3") != "undefined J")){
        html += row_1("J gene (or 3')", this.getGene("3") +
                      "<div class='div-menu-selector' id='listJsegment' style='display: none'>" + this.createSegmentList("Jsegment") + "</div>")
    }

    // Other seg info
    var exclude_seg_info = ['affectSigns', 'affectValues', '5', '4', '3']
    for (var s in this.seg) {
        if (exclude_seg_info.indexOf(s) == -1 && this.seg[s] instanceof Object) {
	    if ("info" in this.seg[s]) {
		// Textual field
		html += row_1(s, this.seg[s].info)
	    } else if ("val" in this.seg[s]) {
		// Numerical field
		html += row_1(s, this.seg[s].val)
	    } else {
		// Sequence field
		var nt_seq = this.getSegNtSequence(s);
		if (nt_seq !== '') {
		    html += row_1(s, this.getSegNtSequence(s))
		}
	    }
        }
    }
    if (typeof this.seg.junction != 'undefined' &&
        typeof this.seg.junction.aa != "undefined") {
        html += row_1("junction (AA seq)", this.getSegAASequence('junction'))
    }

    
    //other info (clntab)
    html += header("&nbsp")
    for (var t in this) {
        if (t[0] == "_") {
            html += "<tr><td>" + t + "</td>"
            if (this[t] instanceof Array) {
                for (var q = 0; q < time_length; q++) {
                    html += "<td>" + this[t][this.m.samples.order[q]] + "</td>"
                }
            } else {
                html += "<td>" + this[t] + "</td>"
            }
            html += "</tr>"
        }
    }
    
    //IMGT info
    var other_infos = {"imgt": "<a target='_blank' href='http://www.imgt.org/IMGT_vquest/share/textes/'>IMGT/V-QUEST</a>",
                       "clonedb": "<a target='_blank' href='http://ecngs.vidjil.org/clonedb'>CloneDB</a> "+ (this.numberSampleSetInCloneDB() > 0 ? "<br /> A similar clone exists in "+this.numberSampleSetInCloneDB()+" other patients/runs/sets" : "")};
    for (var external_tool in other_infos) {
        if (typeof this.seg[external_tool] != 'undefined' &&
            this.seg[external_tool] !== null) {
            html += header("Results of "+other_infos[external_tool])
            for (var item in this.seg[external_tool]) {
                if (! (this.seg[external_tool][item] instanceof Object) &&
                    ! (this.seg[external_tool][item] instanceof Array)) {
                    html += row_1(item, this.seg[external_tool][item])
                }
            }
        }
    }

    html += "</table></div>"
    return html
};
