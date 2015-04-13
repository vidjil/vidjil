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

/* @module utils */

/**
 * Model.js
 *
 * contains data models, control function and a comparison function (mySortedArray)
 * data models are stocked here and can be accessed by the different views to be displayed
 * everytime a data model is modified by a control function the views are called to be updated
 * */

VIDJIL_JSON_VERSION = '2014.09';

/** Model constructor
 * Used to parse a .vidjil file (local file or from url) and store his content in a more convenient way, <br>
 * provide manipulation function, <br>
 * takes care to warn all linked views when changes happens. <br>
 * @class Model
 * @constructor 
 * */
function Model() {
    console.log("creation Model")
    
    for (f in Model_loader.prototype) {
        this[f] = Model_loader.prototype[f]
    }
    
    this.view = [];
    this.checkBrowser();
    this.germlineList = new GermlineList()
    this.build();
    window.onresize = function () { m.resize(); };
    
    this.start()
    
}


Model.prototype = {
    /**
     * Build html elements used by model
     * */
    build: function () {
        this.waiting_screen = document.createElement("div");
        this.waiting_screen.className = "waiting_screen";
        
        this.waiting_msg = document.createElement("div")
        this.waiting_msg.className = "waiting_msg";
        
        this.waiting_screen.appendChild(this.waiting_msg);
        document.body.appendChild(this.waiting_screen);
    },
    
    /**
     * remove all elements from the previous .vidjil file but keep current user parameters and linked views
     * */
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
        
        this.t = 0;          // Selected time/sample
        this.tOther = 0;  // Other (previously) selected time/sample
        this.focus = -1;
        this.system_selected = []
        
        this.colorMethod = "Tag";
        this.changeNotation("percent", false)
        this.changeTimeFormat("name", false)
                
        this.display_window = false
        this.isPlaying = false;
        
        this.mapID = {};
        this.top = 50;
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

        this.tag = [
            {"color" : "#dc322f", "name" : "clone 1", "display" : true},
            {"color" : "#cb4b16", "name" : "clone 2", "display" : true},
            {"color" : "#b58900", "name" : "clone 3", "display" : true},
            {"color" : "#268bd2", "name" : "standard", "display" : true},
            {"color" : "#6c71c4", "name" : "standard (noise)", "display" : true},
            {"color" : "#2aa198", "name" : "custom 1", "display" : true},
            {"color" : "#d33682", "name" : "custom 2", "display" : true},
            {"color" : "#859900", "name" : "custom 3", "display" : true},
            {"color" : "", "name" : "-/-", "display" : true}
        ]

        this.default_tag=8;
        
    },
    
    
    
    /**
     * load a germline / attribute a color for each genes / and compute some info
     * @param {string} [system=current_system] system name ('TRG'/'IGH'), see germline.js for a list of available germlines 
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

    /**
     * compute some meta-data for each clones
     * */
    initClones: function () {
        console.log("initClones()");

        // time_type to delta_date if we have enough different dates
        deltas = this.dateDiffMinMax()
        if (deltas.max > 1)
            this.changeTimeFormat("delta_date")
        
        //      NSIZE
        var n_max = 0;
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)
            var n = clone.getNlength();
            if (n > n_max) {n_max = n; }
        }
        this.n_max = n_max
        
        //      COLOR_N
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clone(i)
            clone.colorN = colorGenerator((((clone.getNlength() / n_max) - 1) * (-250)));
        }
        
        this.applyAnalysis(this.analysis);
        this.initData();
    }, //end initClones
    
    /**
     * compute data_info who contain some meta-data for each "data"
     * */
    initData: function () {
        this.data_info = {}
        var i=1;
        for (key in this.data){
            if (this.data[key].length == this.samples.number){
                this.data_info[key] = {
                    "color" : this.tag[i].color,
                    "isActive" : false
                }
                i++
            }
        }
        this.update()
    },
    
    /**
     * complete some clones with informations found in the analysis file (tag / name / expected value)
     * @param {object} analysis / json content of .analysis file
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
                            console.log(" apply analysis : clones "+ c[i].id + " > incorrect expected value", 0)
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
    
    /**
     * merge clones together using a list of clones to be merged
     * @param {integer[]} clusters - an array of list of clone_id
     * */
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

    /**
     * search in the clone list, a clone who share his window with the given sequence.
     * @param {string} sequence
     * @return {integer} clone_id - index of the clone in the clone list (or -1 if not found)
     * */
    findWindow: function (sequence) {
        if (sequence != 0){
            for ( var i=0; i<this.clones.length; i++ ){
                if ( sequence.indexOf(this.clone(i).id) != -1 ) return i
            }
        }
        return -1
    },

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
     * return the given time index if exist, or the one currently used as default
     * @return {integer} time - time index 
     * */
    getTime: function(time) {
        return typeof time !== 'undefined' ? time : this.t
    },

    /**
     * return a name that can be displayed gracefully <br>
     * (either with a real filename, or a name coming from the database).
     * @return {string} filename - clean analysis filename
     * */
    getPrintableAnalysisName : function() {
        var ext = this.dataFileName.lastIndexOf(".")
        if (ext > 0) {
            return this.dataFileName.substr(0, ext)
        } else {
            return this.dataFileName
        }
    },
    
    /**
     * return date of a timepoint given a time/sample index 
     * @return {string} timestamp - sample date
     * */
    getSampleTime: function(time) {
        var value = "–"
        if (typeof this.samples.timestamp != 'undefined'){
            if (typeof this.samples.timestamp[time] != 'undefined'){
                value = this.samples.timestamp[time]
            } 
        }
        return value;
    },
    
    /**
     * return name of the soft used to produce sample result given a time/sample index 
     * @return {string} soft - name of the software used 
     * */
    getSoftVersionTime: function(time) { 
        var soft_version = "–"
        if (typeof m.samples.producer != 'undefined')
            soft_version = m.samples.producer[time]
        return soft_version;
    },

    /**
     * return commandline used to produce sample result given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getCommandTime: function(time) {
        var command = "–"
        if (typeof m.samples.commandline != 'undefined')
            command = m.samples.commandline[time]
        return command;
    },
    
    /**
     * return date of software run given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getTimestampTime: function(time) {
        var timestamp = "–"
        if (typeof m.samples.run_timestamp != 'undefined')
            timestamp = m.samples.run_timestamp[time]
        return timestamp
    },

    /**
     * return the soft version used to produce all samples results <br>
     * return "multiple" if different soft have been used for different samples
     * @return {string} software - name of the software used 
     * */
    getSoftVersion: function() {
        if (typeof this.samples.producer == "undefined"){
            return "–"
        }else{
            var soft_version = this.samples.producer[this.samples.order[0]]
            for (var i=1; i<this.samples.order.length; i++){
                if (soft_version != this.samples.producer[this.samples.order[i]])
                    return "multiple softwares/versions"
            }
            return soft_version
        }
    },

    /**
     * Keep only one system activated, the one given as a parameter
     * @param {string} system - system string id
     * */
    keep_one_active_system: function (system) {
        this.system_selected = [system]
        this.update_selected_system()
    },

    /**
     * Toggle all system on (if the parameter is true) or off (otherwise)
     * @param {bool} is_on 
     * */
    toggle_all_systems: function(is_on) {
        if (is_on) {
            this.system_selected = this.system_available
        } else {
            this.system_selected = []
        }
        this.update_selected_system()
    },
    
    /**
     * Toggle the selected system
     * */
    toggle_system: function(system){
        if (this.system_available.indexOf(system) != -1) {
            var pos = this.system_selected.indexOf(system) 
            if (pos== -1){ this.system_selected.push(system) }
            else{ this.system_selected.splice(pos, 1) }
        }
        this.update_selected_system()
    },
    
    /**
     * compute the number of reads segmented for the current selected system(s)
     * */
    update_selected_system: function(){
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
        
        this.updateModel()
        //check if current germline is in the selected_system
        if (this.system_selected.indexOf(this.germlineV.system) == -1 && this.system_selected.length > 0){
            this.changeGermline(this.system_selected[0], false)
        }else{
            this.update()
        }
    },
    
    /**
     * normalize a size to match the normalization done on a given time/sample
     * @param {float} original_size - size before normalization
     * @param {integer} time - time/sample index of the timepoint where happen the normalization
     * @return {float} normalized_size - size after normalization
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

    /**
     * compute normalization factor needed to give a clone an expected size
     * @param {integer} cloneID - index of the clone used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
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
    
    /**
     * compute normalization factor needed to give a data an expected size
     * @param {integer} data - index of the data used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
     * */
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
    
    /**
     * compute the last normalization again <br>
     * clones sizes can change depending the parameters so it's neccesary to recompute normalization from time to time
     * */
    update_normalization: function () {
        if (this.normalization.B != 0 && this.normalization.type=="clone") {
            this.compute_normalization( this.normalization.id, this.normalization.B);
        }
    },
    
    /**
     * compute min/max clones sizes and abundance color scale<br>
     * clone size can change depending the parameter so it's neccesary to recompute precision from time to time
     * */
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

    /**
     * return log of a given sample (if exist) 
     * @param {integer} timeID - time/sample index
     * */
    getSegmentationInfo: function (timeID) {
        if (typeof this.samples.log != 'undefined'){
            return this.samples.log[timeID].replace(/(?:\r\n|\r|\n)/g, '<br />')
        }else{
            return "not specified";
        }
    },

    /**
     * put a marker on a specific clone
     * @param {integer} cloneID - index of the clone to focus 
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


    /**
     * release the current focused clone
     * */
    focusOut: function () {
        var tmp = this.focus;
        this.focus = -1;
        if (tmp != -1) this.updateElemStyle([tmp]);
        $(".focus")
            .text("")
    },

    /**
     * return clones currently in the selection
     * @return {integer[]} clone_list - array of clone index
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

    /**
     * put a clone in the selection
     * @param {integer} - cloneID - index of the clone to add to the selection
     * */
    select: function (cloneID) {
        console.log("select() (clone " + cloneID + ")");

        if (cloneID == (this.clones.length - 1)) return 0

        if (this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = false;
        } else {
            this.clone(cloneID).select = true;
        }
        
        this.updateElemStyle([cloneID]);
    },
    
    /**
     * put a list of clones in the selection
     * @param {integer[]} - list - array of clone index
     * */
    multiSelect: function (list) {

        console.log("select() (clone " + list + ")");

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

    /**
     * kick all clones out of the selection
     * */
    unselectAll: function () {
        console.log("unselectAll()")
        var list = this.getSelected();
        for (var i = 0; i < list.length; i++) {
            this.clone(list[i]).select = false;
        }
        this.updateElemStyle(list);
    },


    /**
     * ask all linked views to do a resize
     * @param {integer} [speed] - speed of the resize used by views able to do a transition
     * */
    resize: function (speed) {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].resize(speed);
        }
        
        return this
    },


    /**
     * enable/disable clones using the current model state <br>
     * recompute the clone 'other' size <br>
     * update clones colors
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

    /**
     * ask all linked views to do a complete update <br>
     * this function must be call for major change in the model
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
        console.log("update(): " + elapsedTime + "ms");
    },


    /**
     * ask all linked views to update a clone list
     * @param {integer[]} - list - array of clone index
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

    /**
     * ask all linked views to update the style of a clone list
     * @param {integer[]} - list - array of clone index
     * */
    updateElemStyle: function (list) {
        this.updateModel();
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElemStyle(list);
        }
    },
    
    /**
     * ask all linked views to update the style of all clones
     * */
    updateStyle: function () {
        var list = []
        for (var i=0; i<this.clones.length; i++) list[i]=i
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElemStyle(list);
        }
        this.updateModel()
    },

    /**
     * ask all linked views to init <br>
     * reset the display limit
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
            this.top = 100
            this.displayTop()
        }

    },


    /**
     * define a minimum top rank required for a clone to be displayed
     * @param {integer} top - minimum rank required to display
     * */
    displayTop: function (top) {
        top = typeof top !== 'undefined' ? top : this.top;
        if (top < 0)
            top = 0
        if (top > this.countRealClones())
            top = this.countRealClones()

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

    /**
     * @return {integer} the number of real clones (excluded the fake clones internally
     * added)
     * */
    countRealClones: function() {
        return this.clones.length - 1
    },

    /**
     * sum all the unsegmented/undisplayed clones reads and put them in the 'other' clone
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
    
    /**
     * return info about a timePoint in html 
     * @param {integer} timeID - time/sample index
     * @return {string} html 
     * */
    getPointHtmlInfo: function (timeID) {
        var html = ""

        html = "<h2>Point " + this.getStrTime(timeID, "name") + " ("+m.getSampleTime(timeID)+")</h2>"
        html += "<div id='info_timepoint'><table><tr><th></th>"
        html += "<tr><td> reads </td><td>" + this.reads.total[timeID] + "</td></tr>"
        html += "<tr><td> reads segmented </td><td>" + this.reads.segmented_all[timeID] +
            " ("+ (this.reads.segmented_all[timeID]*100/this.reads.total[timeID]).toFixed(3) + " % )</td></tr>"

        html += "<tr><td> software used </td><td>" + this.getSoftVersionTime(timeID) + "</td></tr>"
        html += "<tr><td> parameters </td><td>" + this.getCommandTime(timeID) + "</td></tr>"
        html += "<tr><td> timestamp </td><td>" + this.getTimestampTime(timeID) + "</td></tr>"
        html += "<tr><td> segmentation </td><td><pre>" + this.getSegmentationInfo(timeID) + "</pre></td></tr>"
            
        html += "</table></div>"
        return html
    },


////////////////////////////////////
//// clusters functions
////////////////////////////////////
    
    /**
     * merge all clones currently in the selection into one cluster
     * */
    merge: function () {
        var new_cluster = [];
        var list = this.getSelected()
        var leader;
        var top = 200;
        console.log("merge clones " + list)

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


    /**
     * remove a clone from a cluster
     * @param {integer} clusterID - cluster index
     * @param {integer} cloneID - clone index
     * */
    split: function (clusterID, cloneID) {
        console.log("split() (cloneA " + clusterID + " windowB " + cloneID + ")")
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
    
    /** 
     * cluster clones who produce the same result with the function given in parameter <br>
     * save a copy of clusters made by user 
     * @param {function} fct 
     * */
    clusterBy: function (fct) {
        var self = this;
        
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
            tmp[i].sort(function(a, b) {
                return self.clone(a).top - self.clone(b).top;
            });
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


    /**
     * reset clusters to default
     * */
    resetClusters: function () {
        //reset cluster
        this.cluster_key = ""
        
        for (var i = 0; i < this.clones.length; i++) {
            this.clusters[i] = [i]
        }

        this.update()
    },
    
    /**
     * restore clusters made by user
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
    
    /** 
     * change the current tracking point used
     * @param {integer} newT - time/sample index to use
     * */
    changeTime: function (newT) {
        console.log("changeTime()" + newT)
        this.tOther = this.t
        this.t = newT;
        this.update();
        return this.t
    },
    
    /**
     * exchange position of 2 timepoints
     * @param {integer} a - time/sample index
     * @param {integer} b - time/sample index
     * */
    switchTimeOrder: function (a, b) {
        var tmp = this.samples.order[a];
        this.samples.order[a] = this.samples.order[b]
        this.samples.order[b] = tmp;
        this.update()
    },
    
    /**
     * replace the current time order with a new one
     * @param {integer[]} list - list of time/sample index
     * */
    changeTimeOrder: function (list) {
        this.samples.order = list
        this.update()
    },
    
    /**
     * change timepoint for the next one in the current displayed time_order 
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
    
    /**
     * change timepoint for the previous one in the current displayed time_order 
     * */
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
    
    /**
     * recursive function calling nexTime() till encounter the specified timePoint 
     * @param {integer} stop - time/sample index
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

    /** 
     * break recursive play()
     * */
    stop: function (){ 
        this.isPlaying = false;
        this.update();
    },
    
    /**
     * return the number of days between two date
     * @param {string} aa - timestamp a
     * @param {string} bb - timestamp b
     * @return {integer} days
     * */
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

    /**
     * return the min/max number of days between two consecutive timepoints
     * @return {{min : number, max : number}} days
     * */
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
            console.log("No delta times can be computed")
            delta_min = -1
            delta_max = -1
        }

        return { 'min': delta_min, 'max': delta_max }
    },        
    
    /**
     * return the sample date of the oldest sample/timepoint
     * @return {string} date_min - timestamp
     * */
    dateMin: function () {
        var date_min = "0"
        try{
            date_min = this.samples.timestamp[this.samples.order[0]] 
            
            for (var i = 1; i < this.samples.order.length; i++) {
                var date = this.samples.timestamp[this.samples.order[i]] 
                if (this.dateDiffInDays(date_min, date)<0){
                    date_min = date
                }
            }
        } catch (e) {}
        
        return date_min
    },        
    
    /**
     * return the sample date of the most recent sample/timepoint
     * @return {string} date_max - timestamp
     * */
    dateMax: function () {
        var date_max = "0"
        try{
            var date_max = this.samples.timestamp[this.samples.order[0]] 
        
            for (var i = 1; i < this.samples.order.length; i++) {
                var date = this.samples.timestamp[this.samples.order[i]] 
                if (this.dateDiffInDays(date_max, date)>0){
                    date_max = date
                }
            }
        } catch (e) {}
        
        return date_max
    },        
    
    /**
     * return sample/time name in a specified format
     * @param {integer} timeID - sample/time index
     * @param {string} [format] - can be 'name', 'sampling_date', 'delta_date', 'delta_date_no_zero', 
     * @return {string} sample name
     * */
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

    /**
     * 
     * */
    toStringThousands: function (num) {
        
        DECIMAL_SEPARATOR = " "
        s = num.toString()

        if (num <= 9999)
            return s

        l = s.length 
        ss = ""
        
        for (var i=l-1; i >= 0; i--) {
            ss += s[l-1-i]
            if (i && !(i % 3))
                ss += DECIMAL_SEPARATOR
        }

        return ss
    },
    
/////////////////////////////////////////////////////////////////////////////
    
    /**
     * check browser version and display an error message for incompatible version
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
            console.log({"type": "popup", "default": "browser_error"});
        }

    },

    /**
     * format size with the default format in use (model.notation_type) 
     * @param {float} size 
     * @param {bool} fixed - use a fixed size 
     * */
    formatSize: function (size, fixed) {
        var result = "-"

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
    
    /**
     * change the split of all clusters
     * @param {bool} bool - new value for all clones
     * */
    split_all: function (bool) {
        for (var i=0; i < this.clusters.length; i++) {
            this.clone(i).split = bool
        }
        this.update()
    },
    
    /**
     * return clone by index
     * @param {integer} clone index
     * @return {clone} 
     * */
    clone: function(cloneID) {
        return this.clones[cloneID]
    },
    
    
    
    /**
     * change the strategy for normalization
     * @param {string} method - can be 'constant' or 'to-100'
     * */
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
    
    /**
     * load a new germline and update 
     * @param {string} system - system string to load
     * @param {bool} only_this_system -
     * */
    changeGermline: function (system, only_this_system) {

        if (only_this_system)
        {
            this.keep_one_active_system(system);
            return ;
        }
        
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
    
    /**
     * change default notation display for sizes
     * @param {string} notation - notation type ('scientific' , 'percent')
     * @pram {bool} update - will update the display after
     * */
    changeNotation: function (notation, update) {
        this.notation_type = notation
        if (update) this.update()
                
        var radio = document.getElementsByName("notation");
        for(var elem in radio){
            if(radio[elem].value == notation) radio[elem].checked=true;
        }
    },
    
    /**
     * change default time format for sample/time names
     * @param {string} notation - format ('name', 'sampling_date', 'delta_date', 'delta_date_no_zero')
     * @pram {bool} update - will update the display after
     * */
    changeTimeFormat: function (time, update) {
        this.time_type = time
        if (update) this.update()
        
        var radio = document.getElementsByName("time");
        for(var elem in radio){
            if(radio[elem].value == time) radio[elem].checked=true;
        }
    },
    
    /**
     * change default color method
     * @param {string} colorM - TODO 
     * */
    changeColorMethod: function (colorM) {
        this.colorMethod = colorM;
        this.update();
    },
    
    /**
     * convert visible clones to csv 
     * @return {string} csv 
     * */
    toCSV: function () {
        //header
        var csv = "name,id,system,tag,v,d,j,sequence"
        for (var i=0; i<this.samples.order.length; i++) csv += ",reads_"+i
        for (var i=0; i<this.samples.order.length; i++) csv += ",ratio_"+i
        for (var i=0; i<this.samples.order.length; i++) csv += ",ratios_"+i
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
    
    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportCSV: function () {
        var textToWrite = this.toCSV()
        var textFileAsBlob = new Blob([textToWrite], {
            type: 'text'
        });

        var filename = this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')

        saveAs(textFileAsBlob, filename + ".csv");
    },
    
    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportFasta: function () {
        var list = this.getSelected()
        if (list.length>0){
            var w = window.open("", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
            
            var fasta = '<pre>'
            for (var i=0; i<list.length; i++){
                fasta += this.clone(list[i]).getFasta() + '\n'
            }
            
            var result = $('<div/>', {
                html: fasta
            }).appendTo(w.document.body);
        }else{
            console.log("exportFasta: select clones to export before")
        }
        
    },
    
    /**
     * produce an html systemBox of the given system
     * @param {string} system - system string ('trg', 'igh', ...)
     * @return {dom_element} span
     * */
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

    /**
     * return the system size
     * @param {string} system - system string ('trg', 'igh', ...)
     * @param {integer} time - sample/time index 
     * @return {float} size - system size in the given time/sample
     * */ 
    systemSize: function(system, time) {
        time = this.getTime(time)
        if (typeof this.reads.germline[system] != 'undefined'){
            return this.reads.germline[system][time]/this.reads.segmented[time]
        }else{
            if (this.system_available.indexOf(system) != -1 && this.system_available.length == 1){
                return 1
            }else{
                return 0
            }
        }
        
    },


    /* Two systems are in the same group when then only differs by '+' */

    sameSystemGroup: function(system1, system2) {
        system1 = system1.replace('+', '')
        system2 = system2.replace('+', '')
        return (system1 == system2)
    },

    /* Representation of a system group, such as 'TRD/TRD+' */

    systemGroup: function(system) {
        list = ''
        if (typeof system == 'undefined'){
            return "?"
        }

        for (var germline in this.reads.germline) {
            if (this.sameSystemGroup(germline, system)) {
                if (list) list += '/'
                list += germline
            }
        }
        return list
    },

    /* Returns the number of reads of a given system group at a given time */

    systemGroupSize: function(system, time) {
        time = this.getTime(time)
        reads = 0

        for (var germline in this.reads.germline) {
            if (this.sameSystemGroup(germline, system)) {
                reads += this.reads.germline[germline][time]
            }
        }

        return reads
    },


    
    wait: function(text){
        this.waiting_screen.style.display = "block";
        this.waiting_msg.innerHTML= text;
        if (typeof shortcut != 'undefined') shortcut.on = false;
    },
    
    resume: function(){
        this.waiting_screen.style.display = "none";
        this.waiting_msg.innerHTML= "";
        if (typeof shortcut != 'undefined') shortcut.on = true;
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
                this.clone(i).colorDBSCAN = colorGenerator( ( (270 / maxCluster) * (this.tabRandomColor[this.clone(i)] + 1) ));
            }
            else
                this.clone(i).colorDBSCAN = "";
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



