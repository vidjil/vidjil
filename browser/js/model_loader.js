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
    start: function() {
        var self = this;
        var dataURL = ""
        var analysisURL = ""
        var patient = -1
        var dbconfig = -1
        var custom_list = []
        
        /** Process arguments in conf.js */
        if (typeof config != 'undefined' && typeof config.autoload != 'undefined')
            dataURL = config.autoload

        if (typeof config != 'undefined' && typeof config.autoload_analysis != 'undefined')
            analysisURL = config.autoload_analysis

        /** Process arguments given on the URL (overrides conf.js) */
        if (location.search != '') {
            var tmp = location.search.substring(1).split('&')

            for (var i=0; i<tmp.length; i++){
                var tmp2 = tmp[i].split('=')
                
                if (tmp2[0] == 'data') dataURL = tmp2[1]
                if (tmp2[0] == 'analysis') analysisURL = tmp2[1]
                if (tmp2[0] == 'patient') patient = tmp2[1]
                if (tmp2[0] == 'config') dbconfig = tmp2[1]
                if (tmp2[0] == 'custom') {
                    custom_split = tmp2[1].split(',')
                    for (var j=0; j<custom_split.length; j++) {
                    custom_list.push(custom_split[j])
                    }
                    console.log(custom_list.join('+'))
                }

            }
        }    

        /** load the default vidjil file, open the database or display the welcome popup depending on the case*/
        if (dataURL != "") {
            if (analysisURL != ""){
                var callback = function() {self.loadAnalysisUrl(analysisURL)}
                this.loadDataUrl(dataURL, callback)
            }else{
                this.loadDataUrl(dataURL)
            }
        }
            
        else if (patient != "-1" && dbconfig != "-1"){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_data( {"patient" : patient , "config" : dbconfig } , "")  }, 1000);
        }
            
        else if (custom_list.length>0){
            //wait 1sec to check ssl
            setTimeout(function () { db.load_custom_data( {"custom" : custom_list })  }, 1000);
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
            self.parseJsonData(oFREvent.target.result, limit)
                .loadGermline()
                .loadAnalysis(analysis)
                .update_selected_system()
            self.dataFileName = document.getElementById(id)
                .files[0].name;
            self.initClones()
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
        if (input.files.length != 0) {
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
    loadDataUrl: function (url, callback) {
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
                self.parseJsonData(result, 100)
                    .loadGermline()
                    .initClones()
                self.update_selected_system()
                self.dataFileName = url_split[url_split.length-1]
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
                var data = jQuery.parseJSON(json_text)
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
        
        // add fake clone 
        var other = {
            "sequence": 0,
            "id": "other",
            "top": 0,
            "reads": []
        }
        var clone = new Clone(other, self, index)
        
        //init clusters
        this.loadCluster(this.data_clusters)
        
        // default samples (complete fields if missing)
        if (typeof self.samples.number == 'string'){
            self.samples.number = parseInt(self.samples.number)
        }
        if (typeof self.samples.order == 'undefined'){
            self.samples.order = []
            for (var i = 0; i < self.samples.number; i++) self.samples.order.push(i);
        }
        if (self.samples.order.length >= 2) {
            self.tOther = 1
        }

        if (typeof self.samples.names =='undefined'){
            self.samples.names = []
            for (var i = 0; i < self.samples.number; i++) self.samples.names.push("");
        }
        
        //search for min_size (used to compute the
        var min_sizes = [];
        for (var k = 0; k < self.samples.number; k++) min_sizes[k] = 0.01;
        
        for (var i = 0; i < this.clones.length; i++) {
            for (var k = 0; k < self.samples.number; k++) {
                var size = (self.clone(i).reads[k] / data.reads.segmented[k])
                if (min_sizes[k] > size && data.clones[i].reads[k] != 0)min_sizes[k] = size;
            }
        }
        self.min_sizes = min_sizes;

        // save reads.segmented     
        this.reads.segmented_all = []                                                                                                                                                                                     
        for (var i=0 ; i<this.reads.segmented.length; i++){
            this.reads.segmented_all[i] = this.reads.segmented[i]
        }

        
        //extract germline
        if (typeof self.germlines != 'undefined'){
            self.germlineList.add(self.germlines)
        }
        self.system_selected = [];
        self.system_available = [];
        for (var i = 0; i < this.clones.length; i++) {
            var system = this.clone(i).get('germline')
            if (typeof system != "undefined" && self.system_available.indexOf(system) ==-1){
                self.system_available.push(system)
            }
        }
        for (var key in self.system_available){
            var system = this.system_available[key]
            self.system_selected.push(system)
        }
        
        var germline_list = Object.keys(this.reads.germline)
        if (germline_list.length >1) {
            self.system = "multi"
        } else {
            self.system = germline_list[0];
        }
        
        return this

    }
    catch (e) {
            console.log({"type": "popup", "default": "parse_error"});
            throw e; 
            return 0
        }
    
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

            //samples
            var match = 0;
            if (this.analysis.samples) {
                var s = this.analysis.samples
                
                //replace names
                for (var i=0; i<s.number; i++){
                    var pos = this.samples.original_names.indexOf(s.original_names[i])
                    if (pos != -1){
                        if (s.names[i] != "") this.samples.names[pos] = s.names[i]
                        match++
                    }
                }
                
                this.samples.order = []
                for (var i=0; i<s.order.length; i++){
                    var pos = this.samples.original_names.indexOf(s.original_names[s.order[i]])
                    if ( pos != -1) this.samples.order.push(pos)
                }
                
                for (var i=0; i<this.samples.number; i++){
                    var pos = s.original_names.indexOf(this.samples.original_names[i])
                    if (pos == -1) this.samples.order.push(i)
                }

            }
            
            //tags
            if (this.analysis.tags && this.analysis.tags.names) {
                var s = this.analysis.tags
                
                var keys = Object.keys(s.names);
                for (var i=0; i<keys.length; i++){
                    this.tag[parseInt(keys[i])].name = s.names[keys[i]]
                }
                
                for (var i=0; i<s.hide.length; i++){
                    this.tag[s.hide[i]].display = false;
                }
            }
            
            if (this.analysis.data) {
                for (var key in this.analysis.data)
                    this.data[key] = this.analysis.data[key]
            }
            this.initClones();
            this.initData();
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
        var date = new Date;
        var timestamp = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() 
                    + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
        
        var analysisData = {
            producer : "browser",
            timestamp : timestamp,
            vidjil_json_version : VIDJIL_JSON_VERSION,
            samples : this.samples,
            clones : [],
            clusters : [],
            tags : {}
        }

        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)

            //tag, custom name, expected_value
            if ((typeof clone.tag != "undefined" && clone.tag != 8) || 
                typeof clone.c_name != "undefined" ||
                typeof clone.expected != "undefined") {

                var elem = {};
                elem.id = clone.id;
                elem.sequence = clone.sequence;

                if (typeof clone.tag != "undefined" && clone.tag != 8)
                    elem.tag = clone.tag;
                if (typeof clone.c_name != "undefined")
                    elem.name = clone.c_name;
                if (typeof clone.expected != "undefined")
                    elem.expected = clone.expected;

                analysisData.clones.push(elem);
            }

            //clones / cluster
            if (this.clusters[i].length > 1) {
                var elem = [];
                for (var j = 0; j < this.clusters[i].length; j++) {
                    elem.push(this.clone(this.clusters[i][j]).id);
                }
                analysisData.clusters.push(elem);
            }
        }
        
        //tags
        analysisData.tags.names = {}
        analysisData.tags.hide = []
        for (var i=0; i<this.tag.length; i++){
            analysisData.tags.names[""+i] = this.tag[i].name
            if (!this.tag[i].display) analysisData.tags.hide.push(i)
        }
        
        
        analysisData.normalization = this.normalization

        return JSON.stringify(analysisData, undefined, 2);
    },


}