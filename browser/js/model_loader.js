/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
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


/** Model_loader constructor <br>
 * model functions to load and save .vidjil/.analysis files
 * @class Model_loader
 * @constructor 
 * */
function Model_loader() {

}
    
Model_loader.prototype = {
    /**
     * check vidjil config file and url to determine what to do onstart.
     * */
    start: function(params) {
        var self = this;

        /** Process arguments in conf.js */
        if (typeof config != 'undefined' && typeof config.autoload != 'undefined')
            params.data = config.autoload

        if (typeof config != 'undefined' && typeof config.autoload_analysis != 'undefined')
            params.analysis = config.autoload_analysis

        /** load the default vidjil file, open the database or display the welcome popup depending on the case*/
        if (typeof params.data !== "undefined") {
            if (typeof params.analysis !== "undefined"){
                var callback = function() {self.loadAnalysisUrl(params.analysis)}
                this.loadDataUrl(params.data, params, callback);
            }else{
                this.loadDataUrl(params.data, params);
            }
        }
            
        else if (typeof params.sample_set_id !== "undefined" && typeof params.config !== "undefined"){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_data( {"sample_set_id" : params.sample_set_id , "config" : params.config } , "") }, 1000);
        }
        
        else if (typeof params.patient_id !== "undefined" && typeof params.config !== "undefined"){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_data( {"patient" : params.patient_id , "config" : params.config } , "")  }, 1000);
        }
        
        else if (typeof params.run_id !== "undefined" && typeof params.config !== "undefined"){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_data( {"run" : params.run_id , "config" : params.config } , "")  }, 1000);
        }
            
        else if (typeof params.custom !== "undefined" && params.custom.length>0){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_custom_data( {"custom" : params.custom })  }, 1000);
        }
                
        else if (typeof config != 'undefined' && config.use_database){
            //wait 1sec to check ssl
            setTimeout(function () { db.call("default/home.html")}, 1000);
        }else{
            console.log({"type":"popup", "default":"welcome" })
        }

    },

    /** 
     * load the selected vidjil/analysis file from an html input file
     * @param {string} id - id of the form (html element) linking to the vidjil file
     * @param {string} analysis - id of the form (html element) linking to the analysis file
     * @param {int} limit - minimum top value to keep a clone
     * */
    load: function (id, analysis, limit) {
        var self = this;

        console.log("load()");

        if (document.getElementById(id)
            .files.length === 0) {
            return;
        }

        var oFReader = new FileReader();
        var oFile = document.getElementById(id)
            .files[0];
            
        oFReader.readAsText(oFile);
        oFReader.onload = function (oFREvent) {
            self.reset();
            self.parseJsonData(oFREvent.target.result, limit);
            self.loadGermline()
                .initClones()
            self.loadAnalysis(analysis)
                .update_selected_system()
            self.dataFileName = document.getElementById(id)
                .files[0].name;
        }

    }, 
    
    
    /** 
     * load the selected analysis file in the model
     * @param {string} analysis - id of the form (html element) linking to the analysis file
     * */
    loadAnalysis: function (analysis) {
        var self = this
        
        var input = document.getElementById(analysis)
        
        console.log("loadAnalysis()");
        if (input.files.length !== 0) {
            var oFReader = new FileReader();
            var oFile = input
                .files[0];

            self.analysisFileName = input
                .files[0].name;

            oFReader.readAsText(oFile);

            oFReader.onload = function (oFREvent) {
                var text = oFREvent.target.result;
                self.parseJsonAnalysis(text)
            }
        } else {
            self.initClones();
        }

        if (typeof(this.tabRandomColor) == "undefined") this.loadRandomTab();
        
        input = $("#"+analysis)
        input.replaceWith(input.val('').clone(true));
        
        return this;
    },
    
    
    /**
     * load the selected vidjil file from an url
     * @param {string} url - url of the vidjil file
     * @param {function} [callback=loadAnalysisUrl()] - function called onsuccess
     * */
    loadDataUrl: function (url,paramsDict, callback) {
        var self = this;
        callback = typeof callback !== 'undefined' ? callback : function(){self.loadAnalysisUrl(url)}
        
        console.log({"type": "flash", "msg": "loadDataUrl: " + url , "priority": 1});

        var url_split = url.split('/')
        
        $.ajax({
            type: "GET",
            timeout: 5000,
            crossDomain: true,
            url: url,
            success: function (result) {
                self.reset();
                self.parseJsonData(result, 100)
                    .loadGermline()
                    .initClones()
                self.update_selected_system()
                self.dataFileName = url_split[url_split.length-1]
                // self.applyUrlParams(paramsDict);
                callback()
            },                
            error: function (request, status, error) {
                console.log({"type": "flash", "msg": "error : can't reach " + url + " file", "priority": 2 });
            }
        });

    }, 
    
    /**
     * load the selected analysis file from an url
     * @param {string} url - url of the analysis file
     * */
    loadAnalysisUrl: function (url) {
        var self = this;
        
        var url2 = url.replace(new RegExp(".vidjil" + '$'), ".analysis")
        console.log({"type": "flash", "msg": "loadAnalysisUrl: " + url2 , "priority": 1});
        
        var url_split = url2.split('/')
        
        $.ajax({
            type: "GET",
            timeout: 5000,
            crossDomain: true,
            url: url2,
            success: function (result) {
                self.parseJsonAnalysis(result)
                self.initClones()
                self.analysisFileName = url_split[url_split.length-1]
            },
            error: function () {
                self.update()
            }
        });

    }, //end load

    
    /**
     * parse a json or a json_text and init the model with it 
     * @param {string} data - json_text / content of .vidjil file
     * @param {int} limit - minimum top value to keep a clone
     * */
    parseJsonData: function (data, limit) {
        self = this;
        
        //convert data to json if necessary
        if (typeof data == "string") {
            var json_text = data
            try {
                data = jQuery.parseJSON(json_text)
            } catch (e) {
                console.log({"type": "popup", "default": "file_error"});
                return 0
            }
        }
        
    try {
        
        //check version
        if ((typeof (data.vidjil_json_version) == 'undefined') || (data.vidjil_json_version < VIDJIL_JSON_VERSION)) {
            console.log({"type": "popup", "default": "version_error"});
            return 0;
        }
        self.reset();
        
        //copy .vidjil file in model
        for (var key in data){
            if (key != "clusters") self[key] = jQuery.parseJSON(JSON.stringify(data[key]))
        }
        this.data_clusters = data.clusters;
        
        //filter clones (remove clone beyond the limit)
        self.clones = [];
        var index = 0
        for (var i = 0; i < data.clones.length; i++) {
            if (data.clones[i].top <= limit) {
                var clone = new Clone(data.clones[i], self, index)
                self.mapID[data.clones[i].id] = index;
                index++
            }
        }
        
        //init clusters
        this.loadCluster(this.data_clusters)
        
        // default samples (complete fields if missing)
        if (typeof self.samples.number == 'string'){
            self.samples.number = parseInt(self.samples.number)
        }
        if (typeof self.samples.order == 'undefined'){
            self.samples.order = []
            for (var j = 0; j < self.samples.number; j++) self.samples.order.push(j);
        }
        if (self.samples.order.length >= 2) {
            self.tOther = 1
        }

        if (typeof self.samples.names =='undefined'){
            self.samples.names = []
            for (var l = 0; l < self.samples.number; l++) self.samples.names.push("");
        }
        
        //search for min_size (used to compute the
        var min_sizes = [];
        for (var k = 0; k < self.samples.number; k++) min_sizes[k] = 0.01;
        
        for (var m = 0; m < this.clones.length; m++) {
            for (var n = 0; n < self.samples.number; n++) {
                var size = (self.clone(m).reads[n] / data.reads.segmented[n])
                if (min_sizes[n] > size && data.clones[m].reads[n] !== 0)min_sizes[n] = size;
            }
        }
        self.min_sizes = min_sizes;

        // save reads.segmented     
        this.reads.segmented_all = []                                                                                                                                                                                     
        for (var o=0 ; o<this.reads.segmented.length; o++){
            this.reads.segmented_all[o] = this.reads.segmented[o]
        }
        
        this.compute_average_quality();

        
        //extract germline

        self.species = "Homo sapiens"
        if (typeof self.germlines != 'undefined'){
            self.germlineList.add(self.germlines)
            if (typeof self.germlines.species != 'undefined'){
                self.species = self.germlines.species
            }
        }
        self.system_selected = [];
        self.system_available = [];
        var system;
        for (var p = 0; p < this.clones.length; p++) {
            system = this.clone(p).get('germline')
            if (typeof system != "undefined" && self.system_available.indexOf(system) ==-1){
                self.system_available.push(system)
            }
        }
        for (var sa in self.system_available){
            system = this.system_available[sa]
            self.system_selected.push(system)
        }
        
        var germline_list = Object.keys(this.reads.germline)
        if (germline_list.length >1) {
            self.system = "multi"
        } else {
            self.system = germline_list[0];
        }

        // add virtuals clones (ex-others)
        for (var q = 0; q < this.system_available.length; q++) {
            var other = {
                "sequence": 0,
                "id": "other"+this.system_available[q],
                "top": 0,
                "reads": [],
                "germline" : this.system_available[q],
            };
            new Clone(other, self, index, true);
            index++ ;
        }
        
        //remove incomplete similarity matrix (TODO: fix fuse.py)
        this.similarity = undefined;

        return this

    }
    catch (e) {
            console.log({"type": "popup", "default": "parse_error"});
            throw e; 
        }
    
    },

    getFilteredFields: function(src) {
        // Hacky way of managing fields we do not want to copy without restructuring the whole JSON
        var exceptions = ['id', 'log', 'producer'];
        var fields = [];
        for (var key in src)
            if (exceptions.indexOf(key) == -1){
                fields.push(key);
            }
        return fields;
    },

    calculateOrder: function(arr) {
        tmp = arr.slice();
        res = arr.slice();
        previous = -1;
        while(tmp.length > 0) {
            min = tmp[0];
            min_idx = 0;
            for(var i = 0; i < tmp.length; i++) {
                if (tmp[i] < min) {
                    min = tmp[i];
                    min_idx = i;
                }
            }
            idx = arr.indexOf(min);
            tmp.splice(min_idx, 1);
            res[idx] = ++previous;
        }
        return res;
    },

    buildDict: function(first, second) {
        dict = {};
        for (var i = 0; i < first.length; i++){
            dict[first[i]] = {};
        }
        for(var j = 0; j < second.length; j++) {
            dict[second[j]] = {};
        }
        return dict;
    },

    copyField: function(dest, src, key) {
        for (var i = 0; i < src[key].length; i++) {
            if (typeof dest[src.id[i]] != 'undefined') {
                if (typeof dest[src.id[i]][key] == 'undefined')
                    dest[src.id[i]][key] = [];
                dest[src.id[i]][key] = src[key][i];
            }
        }
        return dest;
    },

    copySampleFields: function(samples, analysis) {
        var clone = $.extend({}, samples);
        if ('id' in analysis) {
            //replace names, timestamps, order...
            dict = this.buildDict(analysis.id, clone.original_names);
            var keys = this.getFilteredFields(analysis);
            for (var tmp = 0; tmp < keys.length; tmp++)
                dict = this.copyField(dict, analysis, keys[tmp]);

            for (var id in dict) {
                idx = clone.original_names.indexOf(id);
                if (idx > -1)
                    for (var key in dict[id]) {
                        clone[key][idx] = dict[id][key];
                    }

            }
        }
        if ('order' in analysis) {
            clone.order = this.calculateOrder(clone.order);
        }
        return clone;
    },

    /**
     * parse a json or a json_text and complete the model with it's content
     * @param {string} analysis - json_text / content of .analysis file
     * */ 
    parseJsonAnalysis: function (analysis) {
        var self = this
        
        
        if (typeof analysis == "string") {
            try {
                this.analysis = jQuery.parseJSON(analysis)
            } catch (e) {
                    console.log({"type": "popup", "default": "file_error"});
                return 0
            }
        }else{
            this.analysis=analysis
        }
        
        //check version
        if (typeof self.analysis.vidjil_json_version != 'undefined' && self.analysis.vidjil_json_version >= "2014.09"){

            var s;
            //samples
            if (this.analysis.samples) {
                s = this.analysis.samples
                this.samples = this.copySampleFields(this.samples, s);
            }
            
            //tags
            if (this.analysis.tags && this.analysis.tags.names) {
                s = this.analysis.tags
                
                var keys = Object.keys(s.names);
                for (var i=0; i<keys.length; i++){
                    this.tag[parseInt(keys[i])].name = s.names[keys[i]]
                }
               
                for (var j=0; j<s.hide.length; j++){
                    this.tag[s.hide[j]].display = false;
                }
            }

            if (this.analysis.info) {
               m.info = this.analysis.info
            }
            
            if (this.analysis.data) {
                for (var key in this.analysis.data)
                    this.data[key] = this.analysis.data[key]
            }
            this.initClones();
            this.initData();
            
            //clones
            if (this.analysis.clones) {
                var clones = this.analysis.clones;
                for (var k = 0; k < clones.length; k++){
                    var clone = clones[k];
                    if (clone.segEdited) {
                    for (var n=0; n < this.clones.length; n++){
                        if (clone.id == this.clones[n].id){
                            this.clones[n].segEdited = true;
                            // Apply this.reads.germline changment 
                            for (var time =0; time< this.reads.segmented.length; time ++) {
                                var oldGermline = this.clones[n].germline;
                                var newGermline = clone.germline; 
                                if(oldGermline != "custom") {this.reads.germline[oldGermline][time] -= this.clones[n].reads[time];}
                                if(newGermline != "custom") {this.reads.germline[newGermline][time] += this.clones[n].reads[time];}
                                if (newGermline == "custom" && newGermline != oldGermline) {
                                    this.reads.segmented_all[time] -= this.clones[n].reads[time];
                                } else if (oldGermline == "custom" && newGermline != "custom"){
                                    this.reads.segmented_all[time] += this.clones[n].reads[time];
                                }
                            }
                            this.clones[n].germline = clone.germline;
                            this.clones[n].eValue   = clone.eValue;
                            this.clones[n].seg = clone.seg;
                            
                        }
                    }
                    // load germline in system_available
                    if (jQuery.inArray( clone.germline, this.system_available ) == -1) {
                        this.system_available.push(clone.germline);
                    }
                }
                }
            }
            this.toggle_all_systems(true);
            
        }else{
            console.log({"type": "flash", "msg": "invalid version for this .analysis file" , "priority": 1});
        }
    },
    
    /**
     * generate à json file from user analysis currently applied and save it on the disk
     * */
    saveAnalysis: function () {
        console.log("save Analysis (local)")

        var textToWrite = this.strAnalysis()
        var textFileAsBlob = new Blob([textToWrite], {
            type: 'json'
        });

        var filename = this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')

        saveAs(textFileAsBlob, filename + ".analysis");
        self.m.analysisHasChanged = false
    }, //end saveAnalysis

    
    /** 
     * erase all changes made by user or from the .analysis file
     * */
    resetAnalysis: function () {
        console.log("resetAnalysis()");
        this.analysis = {
            clones: [],
            cluster: [],
            date: []
        };
        this.initClones();
    },
    
    
    /**
     * create a json string with analysis currently applied 
     * @return {string} analysis - analysis string in json format
     * */
    strAnalysis: function() {
        var date = new Date();
        var timestamp = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() +
            " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
        
        var analysisData = {
            producer : "browser",
            info : this.info,
            timestamp : timestamp,
            vidjil_json_version : VIDJIL_JSON_VERSION,
            samples : {
                id: this.samples.original_names,
                info: this.samples.info,
                order: this.samples.order,
                names: this.samples.names},
            clones : this.analysis_clones,
            clusters : this.analysis_clusters,
            tags : {}
        }

        var elem;
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)

            //tag, custom name, expected_value
            if ((typeof clone.tag != "undefined" && clone.tag != 8) || 
                 typeof clone.c_name != "undefined" ||
                 typeof clone.expected != "undefined" || 
                (typeof clone.segEdited != "undefined"  && clone.segEdited)) {

                elem = {};
                elem.id = clone.id;
                elem.sequence = clone.sequence;

                if (typeof clone.tag != "undefined" && clone.tag != 8)
                    elem.tag = clone.tag;
                if (typeof clone.c_name != "undefined")
                    elem.name = clone.c_name;
                if (typeof clone.expected != "undefined")
                    elem.expected = clone.expected;
                if (typeof clone.segEdited != "undefined" && clone.segEdited){
                    elem.segEdited = true
                    elem.germline = clone.germline;
                    elem.eValue   = clone.eValue;
                    elem.seg      = clone.seg
                    //remove unneeded elements sometimes left after IMGT interrogation
                    if (typeof clone.seg.imgt != 'undefined' && clone.seg.imgt["Sequence number"]!==null){
                        delete clone.seg.imgt["Sequence number"];} //m.clones[i].seg.imgt["Sequence number"]
                }
                 
                analysisData.clones.push(elem);
            }
            //clones / cluster
            if (this.clusters[i].length > 1) {
                elem = [];
                for (var j = 0; j < this.clusters[i].length; j++) {
                    elem.push(this.clone(this.clusters[i][j]).id);
                }
                analysisData.clusters.push(elem);
            }
        }
        
        //tags
        analysisData.tags.names = {}
        analysisData.tags.hide = []
        for (var k=0; k<this.tag.length; k++){
            analysisData.tags.names[""+k] = this.tag[k].name
            if (!this.tag[k].display) analysisData.tags.hide.push(k)
        }
        
        
        analysisData.normalization = this.normalization

        return JSON.stringify(analysisData, undefined, 2);
    },

    /**
     * Convert 2014.03->2016a to 2016b json format
     * Convert 1-based positions (json, except old files for 5/4/3) to 0-based positions (js)
     */
    convertSeg: function(seg) {

        // Detects whether we have an old file (before 3e340e1/32aaa23)
        var segMappingZeroBased =
            ((typeof seg['5'] != 'undefined' && typeof seg['5'].end != 'undefined')) ||
            (typeof seg['5end'] != 'undefined')

        var segMapping = ['5', '4', '3'];
        var newSeg = {};
        for (var key in seg) {
            var firstChar = key.substring(0, 1);
            if (segMapping.indexOf(firstChar) != -1 && typeof seg[firstChar] != 'object') {
                if (typeof newSeg[firstChar] == 'undefined') {
                    newSeg[firstChar] = this.getConvertedSeg(seg, firstChar);
                }
                key = firstChar
            } else {
                newSeg[key] = seg[key];
            }
            if (typeof newSeg[key] == 'object') {
                newSeg[key] = this.getCopyConvertedSegNames(newSeg[key])
            } else {
                // We must have an object
                var wkey = (key == '_evalue') ? 'evalue' : key
                newSeg[wkey] = {'val': newSeg[key]}
            }
        }

        // We must do another loop because some keys may have been merged (3 and 3start)
        for (key in newSeg) {
            // Convert to 0-based positions
            this.shiftBoundary(newSeg, key, 'start', -1);
            this.shiftBoundary(newSeg, key, 'stop', -1);
        }

        // Old files (5/4/3 positions were already 0-based)
        if (segMappingZeroBased) {
            for (key in segMapping) {
                this.shiftBoundary(newSeg, segMapping[key], 'start', 1);
                this.shiftBoundary(newSeg, segMapping[key], 'stop', 1);
            }
        }
        return newSeg;
    },

    /**
     * Convert (5|4|3)(start|end) to (5|4|3) : {'start', 'stop'}
     */
    getConvertedSeg: function(seg, key) {
        var boundaryMapping = {'start': 'start', 'stop': 'end'};
        var newSeg = {};
        if (typeof seg[key] != 'undefined') newSeg.name = seg[key];
        for(var boundary in boundaryMapping) {
            var tmp = this.getConvertedBoundary(seg, key, boundaryMapping[boundary]);
            if (typeof tmp != 'undefined') newSeg[boundary] = tmp;
        }
        return newSeg;
    },

    /**
     * Convert fields from old names to new names.
     * For instance some fields were called 'end', they now must be 'stop' (see bc32af9)
     * We convert all of them.
     * NOT USED ANYMORE
     */
    getConvertedSegNames: function(seg) {
        var renameFields = {'end': 'stop'}
        for (var field in renameFields) {
            if (typeof seg[field] != 'undefined' &&
                typeof seg[renameFields[field]] == 'undefined') {
                seg[renameFields[field]] = seg[field]
                delete seg[field]
            }
        }
        return seg
    },

    /**
     * Copy object, whiled converting fields from old names to new names
     * For instance some fields were called 'end', they now must be 'stop' (see bc32af9)
     * We convert all of them.
     */
    getCopyConvertedSegNames: function(seg) {
        var newSeg = {};
        var renameFields = {'end': 'stop'};
        for (var field in seg) {
            renamed = (typeof renameFields[field] != 'undefined') && (typeof seg[renameFields[field]] == 'undefined') ? renameFields[field] : field ;
            newSeg[renamed] = seg[field]
        }
        return newSeg
    },

    /**
     * shift the given boundary (when it exists) by 'shift' positions
     **/
    shiftBoundary: function(seg, key, bound, shift) {
        if (typeof seg[key] != 'undefined')
            if (typeof seg[key][bound] != 'undefined')
                seg[key][bound] += shift ;
    },

    getConvertedBoundary: function(seg, key, bound) {
        var newSeg;
        if (typeof seg[key+bound] != 'undefined') {
            newSeg = seg[key+bound];
        }
        return newSeg;
    },
    
    compute_average_quality: function() {
        this.min_quality = 255;
        this.max_quality = 0;
        this.average_quality = 0;
        var count = 0;
        
        for (var i in this.clones){
            if (this.clones[i].hasSeg('quality')){
                var s = this.clones[i].seg.quality.seq;
                for (var j in s){
                    if (s[j] != "!"){
                        var c = s[j].charCodeAt(0);
                        if (c < this.min_quality) this.min_quality=c;
                        if (c > this.max_quality) this.max_quality=c;
                        this.average_quality += c;
                        count++;
                    }
                }
            }
        }
        this.average_quality = this.average_quality/count; 
    },

};
