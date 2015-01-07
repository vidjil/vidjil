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

/*
 * Model.js
 *
 * contains data models, control function and a comparison function (mySortedArray)
 * data models are stocked here and can be accessed by the different views to be displayed
 * everytime a data model is modified by a control function the views are called to be updated
 */

VIDJIL_JSON_VERSION = '2014.09';

/*Model constructor
 *
 * */
function Model() {
    myConsole.log("creation Model")
    this.view = [];
    this.reset();
    this.checkBrowser();
    this.germlineList = new GermlineList()
}


Model.prototype = {

    /**/
    reset: function () {
        this.analysis = {
            clones: [],
            clusters: [],
            date: []
        };
        
        this.clusters = [];
        this.clones = [];
        this.data = {};
        this.data_info = {};
        
        this.t = 0;
        this.focus = -1;
        this.system_selected = []
        
        this.colorMethod = "Tag";
        this.changeNotation("percent", false)
        this.changeTimeFormat("name", false)
                
        this.display_window = false
        this.isPlaying = false;
        
        this.mapID = {};
        this.top = 10;
        this.precision = 1;

        this.germlineV = new Germline(this)
        this.germlineD = new Germline(this)
        this.germlineJ = new Germline(this)
        
        this.dataFileName = '';
        this.analysisFileName = '';
        this.db_key = "" //for file who came from the database
        
        this.norm = false;
        this.normalization = { 
            "method" : "constant",
            "A" : [],
            "B" : 0,
            "id" : -1
        };

        /*Variables pour DBSCAN*/
        this.eps = 0;
        this.nbr = 0;
        this.nodes = null;
        this.edges = null;

        this.cluster_key = ""
        
        //segmented status
        this.segmented_mesg = ["?", 
            "SEG_+", 
            "SEG_-", 
            "UNSEG too short", 
            "UNSEG strand",  
            "UNSEG too few (zero)", 
            "UNSEG too few V", 
            "UNSEG too few J",
            "UNSEG < delta_min", 
            "UNSEG > delta_max",
            "UNSEG ambiguous",
            "= SEG, with window",
            "= SEG, but no window",
        ];

    },

    /* load the selected vidjil/analysis file from an html input file
     * @id : id of the form (html element) linking to the vidjil file
     * @analysis : id of the form (html element) linking to the analysis file
     * @limit : minimum top value to keep a clone*/
    load: function (id, analysis, limit) {
        var self = this;

        myConsole.log("load()");

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
                .loadAnalysis(analysis);
            self.dataFileName = document.getElementById(id)
                .files[0].name;
            self.initClones()
        }

    }, //end load
    
    
    /* load the selected analysis file in the model
     * @analysis : id of the form (html element) linking to the analysis file
     * */
    loadAnalysis: function (analysis) {
        var self = this
        
        var input = document.getElementById(analysis)
        
        myConsole.log("loadAnalysis()");
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
    }, //end loadAnalysis 
    
    
    /* load the selected vidjil/analysis file from an url
     * */
    loadDataUrl: function (url, callback) {
        var self = this;
        callback = typeof callback !== 'undefined' ? callback : function(){self.loadAnalysisUrl(url)}

        myConsole.flash("loadDataUrl: " + url)        

        var url_split = url.split('/')
        
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: url,
            success: function (result) {
                self.parseJsonData(result, 100)
                self.loadGermline();
                self.initClones()
                self.dataFileName = url_split[url_split.length-1]
                callback()
            },                
            error: function (request, status, error) {
                myConsole.flash("error : can't reach " + url + "file");
            }
        });

    }, //end load
    
    /* load the selected analysis file from an url
     * */
    loadAnalysisUrl: function (url) {
        var self = this;
        
        var url2 = url.replace(new RegExp(".vidjil" + '$'), ".analysis")
        myConsole.flash("loadAnalysisUrl: " + url2)
        
        var url_split = url2.split('/')
        
        $.ajax({
            type: "POST",
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

    
    /* parse a json or a json_text and init model with */
    parseJsonData: function (data, limit) {
        self = this;
        
        //convert data to json if necessary
        if (typeof data == "string") {
            var json_text = data
            try {
                var data = jQuery.parseJSON(json_text)
            } catch (e) {
                    myConsole.popupMsg(myConsole.msg.file_error);
                return 0
            }
        }
        
	try {
        
        //check version
        if ((typeof (data.vidjil_json_version) == 'undefined') || (data.vidjil_json_version < VIDJIL_JSON_VERSION)) {
            myConsole.popupMsg(myConsole.msg.version_error);
            return 0;
        }
        self.reset();
        
        //copy .vidjil file in model
        for (var key in data){
            if (key != "clusters") self[key] = data[key]
        }
        this.data_clusters = data.clusters;
        
        //filter clones (remove clone beyond the limit)
        self.clones = [];
        var hash = 0
        for (var i = 0; i < data.clones.length; i++) {
            if (data.clones[i].top <= limit) {
                var clone = new Clone(data.clones[i], self, hash)
                self.mapID[data.clones[i].id] = hash;
                hash++
            }
        }
        
        // add fake clone 
        var other = {
            "sequence": 0,
            "id": "other",
            "top": 0,
            "reads": []
        }
        var clone = new Clone(other, self, hash)
        
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
        
        //extract germline
        if (typeof self.germlines != 'undefined'){
            self.germlineList.add(self.germlines)
        }
        self.system_selected = [];
        self.system_available = [];
        for (var i = 0; i < this.clones.length; i++) {
            var system = this.clone(i).getSystem()
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
            myConsole.popupMsg(myConsole.msg.parse_error);
            throw e; 
            return 0
        }
	
    },

     /* parse a json or a json_text and complete model with */
    parseJsonAnalysis: function (analysis) {
        var self = this
        
        
        if (typeof analysis == "string") {
            try {
                this.analysis = jQuery.parseJSON(analysis)
            } catch (e) {
                    myConsole.popupMsg(myConsole.msg.file_error);
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
                    tagName[parseInt(keys[i])] = s.names[keys[i]]
                }
                
                for (var i=0; i<s.hide.length; i++){
                    tagDisplay[s.hide[i]] = 0;
                }
            }
            
            if (this.analysis.patient) {
                this.dataFileName = this.analysis.patient;
            }
            if (this.analysis.data) {
                for (var key in this.analysis.data)
                    this.data[key] = this.analysis.data[key]
            }
            this.initClones();
            this.initData();
        }else{
            myConsole.flash("invalid version for this .analysis file", 1)
        }
    },
    
    
    /* charge le germline définit a l'initialisation dans le model
     * détermine le nombre d'allele pour chaque gene et leur attribue une couleur
     * */
    loadGermline: function (system) {
        console.log("loadGermline : " + system)
        system = typeof system !== 'undefined' ? system : this.system;
        if (system == "multi" || typeof system == 'undefined'){
            var system = this.system_available[0]
            var max = 0;
            for (var i=0; i<this.clones.length; i++){
                var clone_size = this.clone(i).getSize()
                var clone_system = this.clone(i).getSystem()
                if (clone_size>max && typeof clone_system != "undefined"){
                    max = clone_size
                    system = clone_system
                }
            }
        }
        
        return  this.germlineV.load(system, "V", this)
                    .germlineD.load(system, "D", this)
                    .germlineJ.load(system, "J", this)
                    
    }, //end loadGermline

    /* compute some meta-data for each clones
     * 
     * */
    initClones: function () {
        myConsole.log("initClones()");

        // time_type to delta_date if we have enough different dates
        deltas = this.dateDiffMinMax()
        myConsole.log(deltas)
        if (deltas.max > 1)
            this.changeTimeFormat("delta_date")
        
        //      NSIZE
        var n_max = 0;
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)
            var n = clone.getNlength();
            if (n > n_max) {n_max = n; }
            clone.tag = default_tag;
        }
        this.n_max = n_max
        
        //      COLOR_N
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)
            clone.colorN = colorGenerator((((clone.getNlength() / n_max) - 1) * (-250)), color_s, color_v);
        }
        
        this.applyAnalysis(this.analysis);
        this.initData();
    }, //end initClones
    
    /* compute data_info who contain some meta-data for each "data"
     * */
    initData: function () {
        this.data_info = {}
        var i=1;
        for (key in this.data){
            if (this.data[key].length == this.samples.number){
                this.data_info[key] = {
                    "color" : tagColor[i],
                    "isActive" : false
                }
                i++
            }
        }
        this.update()
    },
    
    /* complete some clones with analysis (tag / name / expected value)
     * 
     * */
    applyAnalysis: function (analysis) {
        
        if (this.analysis.vidjil_json_version != 'undefined' && this.analysis.vidjil_json_version == VIDJIL_JSON_VERSION){
            var c = analysis.clones
            
            //      CUSTOM TAG / NAME
            //      EXPECTED VALUE
            var max = {"id" : -1 , "size" : 0 }     //store biggest expected value ( will be used for normalization)
            for (var i = 0; i < c.length; i++) {
                
                var id = -1
                var f = 1;
                //check if we have a clone with a similar id
                if (typeof c[i].id != "undefined" && typeof this.mapID[c[i].id] != "undefined") {
                    id = this.mapID[c[i].id]
                }
                
                //check if we have a window who can match the sequence
                if (typeof c[i].sequence != "undefined" && id == -1) {
                    id = this.findWindow(c[i].sequence);
                }
                
                if (id != -1){
                    var clone = this.clone(id)
                    
                    if (typeof c[i].expected != "undefined") {
                        clone.expected = c[i].expected
                        f = clone.getSize() / c[i].expected;
                        
                        if (f < 100 && f > 0.01) {
                            if (typeof (c[i].tag) != "undefined") {
                                clone.tag = c[i].tag;
                            }

                            if (typeof (c[i].name) != "undefined") {
                                clone.c_name = c[i].name;
                            }
                            
                            if (c[i].expected>max.size){
                                max.size = c[i].expected
                                max.id = id
                            }
                        }else{
                            myConsole.log(" apply analysis : clones "+ c[i].id + " > incorrect expected value", 0)
                        }
                    }else{
                        if (typeof (c[i].tag) != "undefined") {
                            clone.tag = c[i].tag;
                        }
                        if (typeof (c[i].name) != "undefined") {
                            clone.c_name = c[i].name;
                        }
                    }
                }
            }
            this.loadCluster(analysis.clusters)
        }
        this.init()
    },
    
    
    loadCluster: function (clusters) {

	if (typeof (clusters) == 'undefined')
	    return ;

        for (var i = 0; i < clusters.length; i++) {

            var new_cluster = [];
            
            for (var j=0; j<clusters[i].length;j++){
                if (typeof this.mapID[clusters[i][j]] != 'undefined'){
                    var cloneID = this.mapID[clusters[i][j]]
                    new_cluster = new_cluster.concat(this.clusters[cloneID]);
                    this.clusters[cloneID] = [];
                }
            }
            
            if (new_cluster.length != 0){
                var l = new_cluster[0]
                for (var j=0; j<new_cluster.length;j++){
                    if (m.clone(new_cluster[j]).top < m.clone(l).top) l = new_cluster[j]
                }
                this.clusters[l] = new_cluster;
            }
        }
    },

    /*
     * 
     */
    findWindow: function (sequence) {
        if (sequence != 0){
            for ( var i=0; i<this.clones.length; i++ ){
                if ( sequence.indexOf(this.clone(i).id) != -1 ) return i
            }
        }
        return -1
    },

    /* generate à json file from user analysis currently applied
     *
     * */
    saveAnalysis: function () {
        myConsole.log("save Analysis (local)", 0)

        var textToWrite = this.strAnalysis()
        var textFileAsBlob = new Blob([textToWrite], {
            type: 'json'
        });

        var filename = this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')

        saveAs(textFileAsBlob, filename + ".analysis");
        self.m.analysisHasChanged = false
    }, //end saveAnalysis
    
    /* create a string with analysis
     *
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
        for (var i=0; i<tagName.length; i++){
            analysisData.tags.names[""+i] = tagName[i]
            if (!tagDisplay[i]) analysisData.tags.hide.push(i)
        }
        
        
        analysisData.normalization = this.normalization

        return JSON.stringify(analysisData, undefined, 2);
    },

    /* erase all changes 
     *
     * */
    resetAnalysis: function () {
        myConsole.log("resetAnalysis()");
        this.analysis = {
            clones: [],
            cluster: [],
            date: []
        };
        this.initClones();
    },

    /**
     * return a name that can be displayed gracefully
     * (either with a real filename, or a name coming from the database).
     */
    getPrintableAnalysisName : function() {
        var ext = this.dataFileName.lastIndexOf(".")
        if (ext > 0) {
            return this.dataFileName.substr(0, ext)
        } else {
            return this.dataFileName
        }
    },
    
    toggle_system: function(system){
        if (this.system_available.indexOf(system) != -1) {
            var pos = this.system_selected.indexOf(system) 
            if (pos== -1){ this.system_selected.push(system) }
            else{ this.system_selected.splice(pos, 1) }
        }
        this.update_selected_system()
    },
    
    /* compute the number of reads segmented for the current selected system(s) 
     * 
     * */
    update_selected_system: function(){
        
        this.computeReadsSum()
        this.updateModel()
        //check if current germline is in the selected_system
        if (this.system_selected.indexOf(this.germlineV.system) == -1 && this.system_selected.length > 0){
            this.changeGermline(this.system_selected[0])
        }else{
            this.update()
        }
    },
    
    computeReadsSum: function() {
        //reset reads.segmented
        for (var i=0 ; i<this.reads.segmented.length; i++){
            this.reads.segmented[i]=0
        }

        //compute new reads.segmented value (sum of reads.segmented of selected system)
        for (var i=0; i<this.system_selected.length; i++){
            var key = this.system_selected[i]
            for (var j=0; j<this.reads.segmented.length; j++){
                this.reads.segmented[j] += this.reads.germline[key][j]
            }
        }
    },
    
    /*
     * 
     * */
    normalize: function (original_size, time) {
        var normalized_size = 0;
        
        if (this.normalization.A.length != 0 && this.normalization.A[time] != 0) {
            var A = this.normalization.A[time] /* standard/spike at point time */
            var B = this.normalization.B       /* standard/spike expected value */
            
            if (this.normalization.method=="constant" || original_size <= A){
                normalized_size = (original_size * B) / A
            }else{
                normalized_size = B + ( (original_size - A) * ( (1 - B) / (1 - A) ) )
            }
            
        }else{
            normalized_size = original_size
        }
        
        return normalized_size
    },

    /*compute normalization factor needed to give a clone an expected size
     * 
     * */
    compute_normalization: function (cloneID, expected_size) {
        if (cloneID==-1){ 
            this.norm = false
            expected_size = 0;
            this.normalization.id = cloneID
        }else{
            this.norm = true
            expected_size = typeof expected_size !== 'undefined' ? expected_size : this.clone(cloneID).expected;
            
            this.normalization.A = []
            this.normalization.B = expected_size
            this.normalization.id = cloneID
            this.normalization.type = "clone"
            
            var tmp = this.norm
            this.norm = false
            
            for (var i=0; i<this.samples.number; i++){
                this.normalization.A[i] = this.clone(cloneID).getSize(i)
            }
            
            this.norm = tmp
        }
    },
    
    compute_data_normalization: function (data, expected_size) {
        expected_size = typeof expected_size !== 'undefined' ? expected_size : this.data[data].expected;
        this.norm = true
        
        this.normalization.A = []
        this.normalization.B = expected_size
        this.normalization.id = data
        this.normalization.type = "data"
        this.data[data].expected = expected_size
        
        for (var i=0; i<this.samples.number; i++){
            this.normalization.A[i] = this.data[data][i]
        }
        this.changeNormMethod("constant")
    },
    
    update_normalization: function () {
        if (this.normalization.B != 0 && this.normalization.type=="clone") {
            this.compute_normalization( this.normalization.id, this.normalization.B);
        }
    },
    
    update_precision: function () {
        var min_size = 1
        
        for (var i=0; i<this.samples.order.length; i++){
            var t = this.samples.order[i]
            var size = this.min_sizes[t]
            if (this.norm) size = this.normalize(this.min_sizes[t], t) 
            if (size < min_size) min_size = size
        }
        
        this.max_size = 1
        this.min_size = min_size
        if (this.norm && this.normalization.method=="constant"){
            for (var i=0; i<this.samples.order.length; i++){
                var max = this.normalization.B/this.normalization.A[i]
                if (max>this.max_size) this.max_size=max;
            }
        }
        
        //*2 pour avoir une marge minimum d'un demi-log
        this.precision=(1/this.min_size)*2
        
        this.scale_color = d3.scale.log()
            .domain([1, this.precision])
            .range([250, 0]);
    },

    getSegmentationInfo: function (timeID) {
        if (typeof this.samples.log != 'undefined'){
            return this.samples.log[timeID].replace(/(?:\r\n|\r|\n)/g, '<br />')
        }else{
            return "not specified";
        }
    },

    /* put a marker on a specific clone
     *
     * */
    focusIn: function (cloneID) {
        var tmp = this.focus;

        if (tmp != cloneID) {
            this.focus = cloneID;
            if (tmp != -1) {
                this.updateElemStyle([cloneID, tmp]);
            } else {
                this.updateElemStyle([cloneID]);
            }
        }

        $(".focus")
            .text(this.clone(cloneID).getName())

    },


    /* remove focus marker
     *
     * */
    focusOut: function () {
        var tmp = this.focus;
        this.focus = -1;
        if (tmp != -1) this.updateElemStyle([tmp]);
        $(".focus")
            .text("")
    },

    /* return clones currently in the selection
     *
     * */
    getSelected: function () {
        var result = []
        for (var i = 0; i < this.clones.length; i++) {
            if (this.clone(i).isSelected()) {
                result.push(i);
            }
        }
        return result
    },

    /* put a clone in the selection
     *
     * */
    select: function (cloneID) {
        myConsole.log("select() (clone " + cloneID + ")");

        if (cloneID == (this.clones.length - 1)) return 0

        if (this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = false;
        } else {
            this.clone(cloneID).select = true;
	    }
	    
        this.updateElemStyle([cloneID]);
    },
    
   multiSelect: function (list) {

        myConsole.log("select() (clone " + list + ")");

        var tmp = []
        for (var i=0; i<list.length; i++){
            tmp[i] = {'id': list[i], 'size': this.clone(list[i]).getSize()}
        }
        
        list=[]
        tmp = tmp.sort(function (a, b) {
            if (a.size < b.size) return 1;
            return -1;
        })
        
        for (var i=0; i<tmp.length; i++){
            this.clone(tmp[i].id).select = true;
            list[i]=tmp[i].id
        }

        this.updateElemStyle(list);
    },

    /* kick all clones out of the selection
     *
     * */
    unselectAll: function () {
        myConsole.log("unselectAll()")
        var list = this.getSelected();
        for (var i = 0; i < list.length; i++) {
            this.clone(list[i]).select = false;
        }
        this.updateElemStyle(list);
    },


    /* resize all views
     *
     * */
    resize: function (speed) {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].resize(speed);
        }
        
        return this
    },


    /* 
     *
     * */
    updateModel: function () {
        for (var i = 0; i < this.clusters.length; i++) {
            // compute only non empty clones
            if (this.clusters[i].length != 0) {
                if (!this.clone(i).split) {
                    for (var j = 0; j < this.clusters[i].length; j++) {
                        var seq = this.clusters[i][j]
                        this.clone(seq).disable();
                    }
                    this.clone(i).enable(this.top)
                } else {
                    for (var j = 0; j < this.clusters[i].length; j++) {
                        var seq = this.clusters[i][j]
                        this.clone(seq).enable(this.top)
                    }
                }
            }
        }
        
        // unactive clones from unselected system
        if (this.system == "multi") {
            for (var i = 0; i < this.clones.length; i++) {
                if (this.system_selected.indexOf(this.clone(i).getSystem()) == -1) {
                    this.clones[i].disable()
                }
            }
        }
        
        //unactive filtered clone
        for (var i = 0; i < this.clones.length; i++) {
            if (this.clone(i).isFiltered) {
                this.clone(i).disable();
            }
        }
        
        this.computeOtherSize();

        for (var i = 0; i < this.clones.length; i++) {
            this.clone(i).updateColor()
        }

    },

    /*update all views
     *
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        this.update_normalization();
        this.update_precision();
        this.updateModel();

        for (var i = 0; i < this.view.length; i++) {
            this.view[i].update();
        }
        
        elapsedTime = new Date()
            .getTime() - startTime;
        myConsole.log("update(): " + elapsedTime + "ms");
    },


    /*update a clone list in all views
     *
     * */
    updateElem: function (list) {
        if ( list.indexOf(this.normalization.id) != -1 ){
            this.update_normalization()
            this.update_precision()
        }
        this.updateModel()
        
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElem(list);
        }
    },

    /*style a clone list in all views
     *
     * */
    updateElemStyle: function (list) {
        this.updateModel();
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElemStyle(list);
        }
    },
    
    updateStyle: function () {
        var list = []
        for (var i=0; i<this.clones.length; i++) list[i]=i
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElemStyle(list);
        }
        this.updateModel()
    },

    /*init all views
     *
     * */
    init: function () {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].init();
        }
        this.displayTop();

        var count = 0;
        for (var i = 0; i < this.clones.length; i++) {
            if (this.clone(i).isActive()) count++
        }

        if (count < 5) {
            this.top = 25
            this.displayTop()
        }

    },


    /* define a minimum top rank required for a clone to be displayed
     *
     * */
    displayTop: function (top) {
        top = typeof top !== 'undefined' ? top : this.top;
        this.top = top;

        var html_slider = document.getElementById('top_slider');
        if (html_slider != null) {
            html_slider.value = top;
        }
        
        var html_label = document.getElementById('top_label');
        if (html_label != null) {
            var count = 0;
            for (var i=0; i<this.clones.length; i++){
                if (this.clone(i).top < top) count++;
            }
            html_label.innerHTML = count + ' clones (top ' + top + ')' ;
        }
        
        this.update();
    },

    /* 
     *
     * */
    computeOtherSize: function () {
        var other = [];

        for (var j = 0; j < this.samples.number; j++) {
            other[j] = this.reads.segmented[j]
        }

        for (var i = 0; i < this.clones.length - 1; i++) {
            for (var j = 0; j < this.samples.number; j++) {
                if (this.clone(i).isActive()) {
                    for (var k = 0; k < this.clusters[i].length; k++) {
                        if (this.clusters[i][k] != this.clones.length - 1)
                            other[j] -= this.clone(this.clusters[i][k]).getSequenceReads(j);
                    }
                }
            }
        }

        this.clone(this.clones.length - 1).reads = other;

    },
    
    /* return info about a timePoint in html 
     *
     * */
    getPointHtmlInfo: function (timeID) {
        var html = ""

        html = "<h2>Point info : " + this.getStrTime(timeID, "name") + "("+this.samples.timestamp[timeID]+")</h2>"
        html += "<div id='info_timepoint'><table><tr><th></th>"
        html += "<tr><td> reads </td><td>" + this.reads.total[timeID] + "</td></tr>"
        html += "<tr><td> reads segmented </td><td>" + this.reads.segmented[timeID] +
            " ("+ (this.reads.segmented[timeID]*100/this.reads.total[timeID]).toFixed(3) + " % )</td></tr>"
        html += "<tr><td> segmentation </td><td>" + this.getSegmentationInfo(timeID) + "</td></tr>"
            
        html += "</table></div>"
        return html
    },


////////////////////////////////////
//// clusters functions
////////////////////////////////////
    
    /* merge all clones currently in the selection into one cluster
     *
     * */
    merge: function () {
        var new_cluster = [];
        var list = this.getSelected()
        var leader;
        var top = 200;
        myConsole.log("merge clones " + list)

        for (var i = 0; i < list.length; i++) {
            if (this.clone(list[i]).top < top) {
                leader = list[i];
                top = this.clone(list[i]).top;
            }
            new_cluster = new_cluster.concat(this.clusters[list[i]]);
            this.clusters[list[i]] = [];
        }

        this.clusters[leader] = new_cluster;
        this.unselectAll()
        this.updateElem(list)
        this.select(leader)
        
        this.analysisHasChanged = true
    },


    /* sépare un clone d'un cluster
     *
     * */
    split: function (clusterID, cloneID) {
        myConsole.log("split() (cloneA " + clusterID + " windowB " + cloneID + ")")
        if (clusterID == cloneID) return

        var nlist = this.clusters[clusterID];
        var index = nlist.indexOf(cloneID);
        if (index == -1) return

        nlist.splice(index, 1);

        //le cluster retrouve sa liste de clones -1
        this.clusters[clusterID] = nlist;
        //le clone forme un cluster de 1 clone
        this.clusters[cloneID] = [cloneID];

        this.updateElem([cloneID, clusterID]);
    },
    
    /* cluster clones who produce the same result with the function given in parameter
     *
     * */
    clusterBy: function (fct) {

        //save user cluster
        if ( this.cluster_key==""){
            this.clusters_copy = this.clusters
            this.clusters = []
        }
        
        var tmp = {}
        for (var i = 0; i < this.clones.length - 1; i++) {

            //detect key value
            var key = "undefined"

            key = fct(i)

            //store clones with same key together
            if (key == "") key = "undefined"
            if (tmp[key]) {
                tmp[key].push(i)
            } else {
                tmp[key] = [i]
            }

        }

        //order clones with same key
        var keys = Object.keys(tmp)
        for (var i in tmp) {
            tmp[i].sort()
        }

        //reset cluster
        for (var i = 0; i < this.clones.length; i++) {
            this.clusters[i] = []
        }

        //new cluster
        for (var i in tmp) {
            this.clusters[tmp[i][0]] = tmp[i]
            this.clusters[tmp[i][0]].name = i

            for (var j = 1; j < tmp[i].length; j++) {
                this.clusters[tmp[i][j]] = []
            }
        }
        this.cluster_key = fct
        this.update()
    },


    /* 
     *
     * */
    resetClusters: function () {
        //reset cluster
        this.cluster_key = ""
        
        for (var i = 0; i < this.clones.length; i++) {
            this.clusters[i] = [i]
        }

        this.update()
    },
    
    /* 
     *
     * */
    restoreClusters: function () {
        this.cluster_key = ""
        if ( typeof this.clusters_copy != 'undefined'){
            this.clusters = this.clusters_copy
            this.update()
        }
        
    },

////////////////////////////////////
//// time functions
////////////////////////////////////
    
    /* change the current tracking point used
     *
     * */
    changeTime: function (newT) {
        myConsole.log("changeTime()" + newT)
        this.t = newT;
        this.update();
        return this.t
    },
    
    /* exchange position of 2 timepoints
     *
     * */
    switchTimeOrder: function (a, b) {
        var tmp = this.samples.order[a];
        this.samples.order[a] = this.samples.order[b]
        this.samples.order[b] = tmp;
        this.update()
    },
    
    /* 
     *
     * */
    changeTimeOrder: function (list) {
        this.samples.order = list
        this.update()
    },
    
    /*change timepoint for the next one in the current displayed time_order 
     * 
     * */
    nextTime: function () {
        var current_pos = this.samples.order.indexOf(this.t)
        
        if (current_pos != -1){
            if (current_pos+1 < this.samples.order.length){
                //next one
                return this.changeTime(this.samples.order[current_pos+1])
            }else{
                //back to the beginning
                return this.changeTime(this.samples.order[0])
            }
        }else{
            return this.changeTime(this.samples.order[0])   
        }
    },
    
    previousTime: function (){
        var current_pos = this.samples.order.indexOf(this.t)
        
        if (current_pos != -1){
            if (current_pos == 0){
                //teleport to the end
                return this.changeTime(this.samples.order[this.samples.order.length-1])
            }else{
                //previous one
                return this.changeTime(this.samples.order[current_pos-1])
            }
        }else{
            return this.changeTime(this.samples.order[0])   
        }
        
    },
    
    /* recursive function calling nexTime() till encounter the specified timePoint 
     * 
     * */
    play: function (stop) {
        var self = this;
        this.isPlaying = true;
        this.nextTime();
        
        //check if "stop" is still in time_order and replace it if necessary
        if (this.samples.order.indexOf(stop)==-1) stop = this.samples.order[0]
        
        //continue until stop
        if (this.t != stop) { 
            setTimeout(function(){
                if (self.isPlaying) self.play(stop)
            },3000);
        }else{
            this.isPlaying = false
            setTimeout(function(){ 
                self.update()
            },1000);
        }
    },

    /* break recursive play()
     * 
     * */
    stop: function (){ 
        this.isPlaying = false;
        this.update();
    },
    
    dateDiffInDays: function(aa, bb) {
    // inspired by http://stackoverflow.com/questions/3224834
    var _MS_PER_DAY = 1000 * 60 * 60 * 24 ;
    var a = new Date(aa.split(" ")[0]+"T00:00:00.00Z");
    var b = new Date(bb.split(" ")[0]+"T00:00:00.00Z");

    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
    },

    dateDiffMinMax: function () {
        // Computes the min and max delta between timepoints
        
        delta_min = 9999
        delta_max = 0

        try
        {
            previous_t = this.samples.timestamp[0]

            for (var i = 1; i < this.samples.order.length; i++) {
                t =  this.samples.timestamp[this.samples.order[i]]                    
                delta = this.dateDiffInDays(previous_t, t)
                
                if (delta > delta_max)
                    delta_max = delta
                if (delta < delta_min)
                    delta_min = delta
                
                previous_t = t
            }
        }
        catch (e)
        {
            // The computation can fail if one of the times is badly given
            myConsole.log("No delta times can be computed")
            delta_min = -1
            delta_max = -1
        }

        return { 'min': delta_min, 'max': delta_max }
    },        
    
    getStrTime: function (timeID, format){
        format = typeof format !== 'undefined' ? format : this.time_type;
        var result = "-/-"

        switch (format) {
            case "name":
                if (typeof this.samples.names != 'undefined' && this.samples.names[timeID] != ""){
                    result = this.samples.names[timeID]
                }else{
                    result = this.samples.original_names[timeID]
                    result = result.split('/')[result.split('/').length-1]
                    result = result.split('.')[0]
                }
                break;

            case "sampling_date":
                if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[timeID])
                    result = this.samples.timestamp[timeID].split(" ")[0]
                break;

            case "delta_date":
            case "delta_date_no_zero":            
                if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[0]){
                    var time0 = this.samples.timestamp[0];

                    if (timeID == '0'){
                        result = time0.split(" ")[0];

                        if (format == "delta_date_no_zero")
                            result = "";

                        break;
                    }else{
                        if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[timeID]){
                            time = this.samples.timestamp[timeID];
                            diff = this.dateDiffInDays(time0, time);
                            result = (diff >= 0 ? '+' : '') + diff;
                        }
                    }
                }
        }
        return result
    },
    
/////////////////////////////////////////////////////////////////////////////
    
    /* 
     *
     * */
    checkBrowser: function () {
        this.browser_version = parseInt(navigator.appVersion, 10);
        this.browser = null

        if ((navigator.userAgent.indexOf("Chrome")) != -1) {
            this.browser = "Chrome";
        } else if ((navigator.userAgent.indexOf("Firefox")) != -1) {
            this.browser = "Firefox";
        } else if ((navigator.userAgent.indexOf("MSIE")) != -1) {
            this.browser = "Internet Explorer";
        } else if ((navigator.userAgent.indexOf("Safari")) != -1) {
            this.browser = "Safari";
        }

        //TODO check version 
        if (this.browser != "Chrome" &&
            this.browser != "Firefox" &&
            this.browser != "Safari") {
            myConsole.popupMsg(myConsole.msg.browser_error)
        }

    },

    formatSize: function (size, fixed) {
        var result = "-/-"

        if (size == 0) return result

        switch (this.notation_type) {
        case "percent":
            if (fixed) {
                if (size < 0.0001) {
                    result = (100 * size)
                        .toFixed(4) + "%";
                } else if (size > 0.1) {
                    result = (100 * size)
                        .toFixed(2) + "%";
                } else {
                    result = (100 * size)
                        .toFixed(3) + "%";
                }
            } else {
                //hack to avoid approximation due to javascript way to handle Number
                result = parseFloat((100 * size)
                    .toFixed(10)) + "%";
            }
            break;
        case "scientific":
            result = (size)
                .toExponential(1);
            break;
        }
        return result
    },
    
    split_all: function (bool) {
        for (var i=0; i < this.clusters.length; i++) {
            this.clone(i).split = bool
        }
        this.update()
    },
    

    clone: function(hash) {
        return this.clones[hash]
    },
    
    
    
    
    changeNormMethod : function (method){
        this.normalization.method=method;
        if (this.normalization.type=="data" && method !="constant"){
            this.normalization.method="constant";
        }
        
        this.update()
        
        var radio = document.getElementsByName("normalize_method");
        for(var elem in radio){
            if(radio[elem].value == this.normalization.method) radio[elem].checked=true;
        }
    },
    
    /* load a new germline and update 
     * 
     * */
    changeGermline: function (system) {
        
        if (this.system_selected.indexOf(system) == -1){
            this.toggle_system(system)
        }
        
        this.loadGermline(system)
            .update()
            
        var radio = document.getElementsByName("germline")
        for(var elem in radio){
            if (radio[elem].value == system) radio[elem].checked=true;
        }
    },
    
    /* use scientific notation / percent
     *
     * */
    changeNotation: function (notation, update) {
        this.notation_type = notation
        if (update) this.update()
                
        var radio = document.getElementsByName("notation");
        for(var elem in radio){
            if(radio[elem].value == notation) radio[elem].checked=true;
        }
    },
    
    /* use name / date 
     *
     * */
    changeTimeFormat: function (time, update) {
        this.time_type = time
        if (update) this.update()
        
        var radio = document.getElementsByName("time");
        for(var elem in radio){
            if(radio[elem].value == time) radio[elem].checked=true;
        }
    },
    
    changeColorMethod: function (colorM) {
        this.colorMethod = colorM;
        this.update();
    },
    
    //convert clones to csv with the current clustering/filtering
    toCSV: function () {
        //header
        var csv = "name,id,system,tag,v,d,j,sequence"
        for (var i=0; i<this.samples.order.length; i++) csv += ",reads_"+i
        for (var i=0; i<this.samples.order.length; i++) csv += ",ratio_"+i
        csv += "\n"
        
        //only non-empty active clones and "other"
        for (var i=0; i<this.clusters.length; i++){
            if ( (this.clusters[i].length != 0 && this.clone(i).isActive()) || this.clone(i).getName()=="other" ){
                csv += this.clone(i).toCSV()
                csv += "\n"
            }
        }
        
        return csv
    },
    
    exportCSV: function () {
        var textToWrite = this.toCSV()
        var textFileAsBlob = new Blob([textToWrite], {
            type: 'text'
        });

        var filename = this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')

        saveAs(textFileAsBlob, filename + ".csv");
    },
    
    systemBox: function (system){
        
        var span = document.createElement('span')
        span.className = "systemBox";
        if ((typeof system != 'undefined')){
            span.appendChild(document.createTextNode(this.germlineList.getShortcut(system)));
            if (this.system_selected.indexOf(system) != -1) 
                span.style.background = this.germlineList.getColor(system)
            span.title = system
        }else{
            span.appendChild(document.createTextNode("?"));
            if (typeof system != 'undefined')
                span.title = system ;
        }
        return span
    },
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
   /*For DBSCAN*/
    loadRandomTab: function() {
        this.tabRandomColor = [];
        /*Initialisation du tableau de couleurs*/
        for (var i = 0; i < this.clones.length; i++) {
            this.tabRandomColor.push(i);
        }
        /*Fisher yates algorithm to shuffle the array*/
        for (var i = this.clones.length - 1; i >= 1; i--) {
            var j = Math.floor(Math.random() * i) + 1;
            var abs = this.tabRandomColor[i];
            this.tabRandomColor[i] = this.tabRandomColor[j];
            this.tabRandomColor[j] = abs;
        }
    },

    /* Fonction permettant de charger la clusterisation avec DBSCAN, mais aussi de colorer les nodes 
    directement après en fonction de cette clusterisation
     *
     */
    loadDBSCAN: function(sp) {
        if (typeof(sp) != "undefined") this.sp = sp;
            this.dbscan = new DBSCAN(this.sp, this.eps, this.nbr);
            this.dbscan.runAlgorithm();
            for (var i = 0; i < this.dbscan.clusters.length; i++)
                for (var j = 0; j < this.dbscan.clusters[i].length; j++)
                    this.clones[this.dbscan.clusters[i][j]].cluster = i;
            //Color DBSCAN
            if (typeof(this.tabRandomColor) == "undefined") this.loadRandomTab();
            this.colorNodesDBSCAN();
            //Add information about the window (Noise, Core, ...)
            this.addTagCluster();
    },

    /* Fonction permettant de colorer les nodes en fonction de la clusterisation DBSCAN
    */
    colorNodesDBSCAN: function() {
        /*Adding color by specific cluster*/
        /*-> Solution provisoire quant à la couleur noire non voulue est d' "effacer" le nombre max de clusters, 
        mais de le prendre par défaut (100), soit un intervalle de 2.7 à chaque fois*/
        var maxCluster = this.dbscan.clusters.length;
        for (var i = 0; i < this.clones.length; i++) {
            if (typeof(this.clone(i)) != 'undefined') {
                this.clone(i).colorDBSCAN = colorGenerator( ( (270 / maxCluster) * (this.tabRandomColor[this.clone(i)] + 1) ), color_s, color_v);
            }
            else
                this.clone(i).colorDBSCAN = color['@default'];
        }
    },

    /* Fonction permettant d'ajouter un tab concernant un node - s'il est au coeur d'un cluster, 
    à l'extérieur ou appartenant à...
     */
    addTagCluster: function() {
        for (var i = 0; i < this.clones.length; i++)
            if (typeof(this.clone(i)) != 'undefined')
                switch (this.dbscan.visitedTab[i].mark) {
                case -1:
                        this.clone(i).tagCluster = "NOISE";
                        break;
                case 0:
                        this.clone(i).tagCluster = "CORE";
                        break;
                case 1:
                        this.clone(i).tagCluster = "NEAR";
                        break;
                }
            else
                this.clone(i).tagCluster = null;
    },

    /*
    // Fonction permettant de changer dynamiquement le nombre epsilon, pour DBSCAN
    //
    changeEps: function(newEps) {
        //Modification de l'attribut 'Eps' contenu dans l'objet
        this.eps = newEps;
        //Prise en compte du slider
        var html_container = document.getElementById('changeEps');
        if (html_container != null) {
            html_container.value = newEps;
        }
        //Création d'un nouvel objet DBSCAN
        this.loadDBSCAN();
        this.update();
        //Activation du moteur et autres paramètres spé à l'affichage du graphe DBSCAN
        if (this.sp.dbscanActive) this.sp.runGraphVisualization("dbscan");
        //Changement de l'affichage de la valeur liée au slider
        this.changeSliderValue(true, "DBSCANEpsSlider", "Eps ", this.eps);
    },

    // Fonction permettant de changer dynamiquement le nombre de voisins minimum, pour DBSCAN
    //
    changeNbr: function(newNbr) {
        //Modification de l'attribut 'nbr' contenu dans l'objet
        this.nbr = newNbr;
        //Prise en compte du slider
        var html_container = document.getElementById('changeNbr');
        //Changement de la valeur du slider
        if (html_container != null) {
            html_container.value = newNbr;
        }
        //Création d'un nouvel objet DBSCAN
        this.loadDBSCAN();
        this.update();
        //Activation du moteur et autres paramètres spé à l'affichage du graphe DBSCAN
        if (this.sp.dbscanActive) this.sp.runGraphVisualization("dbscan");
        //Changement de l'affichage de la valeur liée au slider
        this.changeSliderValue(true, "DBSCANNbrSlider", "Nbr ", this.nbr);
    },

    */
    /* Fonction permettant de changer dynamiquement la valeur d'affichage, à côté du slider Epsilon/MinPts dans le menu Display
    */
    changeSliderValue: function(bool, div, name, value) {
        var div = document.getElementById(div);
        var text = document.createTextNode(name + value);
        if (bool) {
            //Suppression du précédent noeud
            div.removeChild(div.childNodes[0]);
        }
        if (!bool) div.insertBefore(document.createElement('br'), div.firstChild);
        div.insertBefore(text, div.firstChild);
    },

    /* Fonction permettant de changer dynamiquement la valeur d'affichage du slider "Edit Distance"
    */
    changeSliderEditDistanceValue: function(bool, value) {
        var div = document.getElementById("EditDistanceSlider");
        var text =  document.createTextNode("Distance: " + value);
        if (!bool) {
            div.removeChild(div.childNodes[0]);
        }
        else {
            div.insertBefore(text, div.firstChild);
        }
    },
    
    /* put a marker on a specific edge, for the edit distance distribution
     *
     */
    focusEdge: function(edge) {
       $(".focus")
            .text(this.printInformationEdge(edge));
    },

    /* remove the focus marker to the edge
     *
     */
    removeFocusEdge: function() {
        $(".focus")
            .text("")
    },

    /* print informations of a specific edge
     */
    printInformationEdge: function(edge) {
        return this.getName(edge.source)+" -- "+this.getName(edge.target)+" == "+edge.len;
    },

} //end prototype Model



