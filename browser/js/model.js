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

/* @module utils */

/**
 * Model.js
 *
 * contains data models, control function and a comparison function (mySortedArray)
 * data models are stocked here and can be accessed by the different views to be displayed
 * everytime a data model is modified by a control function the views are called to be updated
 * */

VIDJIL_JSON_VERSION = '2014.09';
BROWSER_COMPATIBILITY = {
    "Firefox": {
        "legacy": 32,
        "supported": 78,
        "latest": 89
    }, 
    "Chrome": {
        "legacy": 49,
        "supported":  79,
        "latest": 93
    }
}
BROWSER_SUPPORTED_UNTIL = "April 2024"

SIZE_MANUALLY_ADDED_CLONE = 100000; // Default size of a manually added clone.

/** Model constructor
 * Used to parse a .vidjil file (local file or from url) and store his content in a more convenient way, <br>
 * provide manipulation function, <br>
 * takes care to warn all linked views when changes happens. <br>
 * @class Model
 * @constructor 
 * */
function Model() {
    var self=this;
    m=this;
    console.log("creation Model")
    
    for (var f in Model_loader.prototype) {
        this[f] = Model_loader.prototype[f]
    }

    this.germline = {};
    this.create_germline_obj();
    this.view = [];
    this.checkLocalStorage();
    this.reset();
    this.filter = new Filter(this)
    this.color = new Color(this)
    this.setAll();
    this.checkBrowser();
    this.germlineList = new GermlineList()
    this.build();
    //window.onresize = function () { self.resize(); };

    this.NORM_FALSE     = "no_norm"
    this.NORM_EXPECTED  = "expected"
    this.NORM_EXTERNAL  = "external"
    this.normalization_mode = this.NORM_FALSE
    this.available_axes = Axis.prototype.available()

    this.search_ratio_limit     = 0.80
    setInterval(function(){return self.updateIcon()}, 100); 

    this.trimming_before_external = false
}


Model.prototype = {
    /**
     * Build html elements used by model
     * */
    build: function () {
        var self =this;
        
        // BROWSER_COMPATIBILITY
        this.checkBrowserVersion()

        this.waiting_screen_is_on = false;
        this.waiting_screen = document.createElement("div");
        this.waiting_screen.className = "waiting_screen";
        
        this.waiting_msg = document.createElement("div")
        this.waiting_msg.className = "waiting_msg";
        
        this.waiting_screen.appendChild(this.waiting_msg);
        document.body.appendChild(this.waiting_screen);
        
                
        //build infoBox
        
        this.infoBox = document.createElement("div");
        this.infoBox.className = "modal info-container";
        
        var closeinfoBox = document.createElement("span");
        closeinfoBox.className = "closeButton" ;
        closeinfoBox.appendChild(icon('icon-cancel', ''));
        closeinfoBox.onclick = function() {self.closeInfoBox()};
        this.infoBox.appendChild(closeinfoBox);
        
        var div_info = document.createElement("div");
        div_info.className = "info-msg";
        this.infoBox.appendChild(div_info);
        
        document.body.appendChild(this.infoBox);
        
        //build tagSelector
        this.tagSelector = document.createElement("div");
        this.tagSelector.className = "tagSelector";
        
        var closeTag = document.createElement("span");
        closeTag.className = "closeButton" ;
        closeTag.appendChild(icon('icon-cancel', ''));
        closeTag.onclick = function() {$(this).parent().hide('fast')};
        this.tagSelector.appendChild(closeTag);
        
        this.tagSelectorInfo = document.createElement("div")
        this.tagSelector.appendChild(this.tagSelectorInfo);
        
        this.tagSelectorList = document.createElement("ul")
        this.tagSelector.appendChild(this.tagSelectorList);
        
        document.body.appendChild(this.tagSelector);
        $('.tagSelector').hover(function() { 
          $(this).addClass('hovered');
        }, function() {
          $(this).removeClass('hovered');
        });

        $("#filter_switch_sample").click(function(){
            self.filter.toggle("Size", "=", 0)
            var check = document.getElementById("filter_switch_sample_check")
            check.checked = (self.filter.check("Size", "=", 0) != -1)
        })

        $("#remove_primer_external").click(function(){
            // bloquer si pas de primerset 
            var check = document.getElementById("remove_primer_external_check")
            if (self.primersSetData == undefined){
                console.log({ msg: "Please set a primerset before (settings menu)", type: "flash", priority: 1 });
                check.checked = self.trimming_before_external
                return
            } else {
                self.trimming_before_external = !self.trimming_before_external
                check.checked = self.trimming_before_external
                console.default.log( self.trimming_before_external )
            }
        })

        
        // Table of conversion between axes name and distribution names
        this.distrib_convertion = {
            // Axes --> Fuse
            "V/5' gene":        "seg5",
            "D gene":           "seg4",
            "J/3' gene":        "seg3",
            "CDR3 length":      "lenCDR3",
            "Locus" :           "germline",
            // Particular, take the nb reads value of the distribution
            "Size":             "size",
            // Should be in Array format
            "Sequence length" : "lenSeqConsensus",
            "Reads length" :    "lenSeqAverage", // make a round on it (into fuse.py) ?
            /////////////////////
            // Fuse --> Axes
            "seg5":             "V/5' gene",
            "seg4":             "D gene",
            "seg3":             "J/3' gene",
            "lenCDR3":          "CDR3 length",
            "lenSeqConsensus":  "Sequence length",
            "lenSeqAverage":    "Reads length",
        }
        // List of axe that must be in an array format
        this.distrib_axe_is_timmed = {
            "lenSeqConsensus": true,
            "lenSeqAverage":   true,
            "coverage":        true,
        }

        // List of axe that must be returned as number
        this.distrib_axe_as_number = {
        }
    },

    /**
     * Check the browser version and return a warning if version is older than supported
     * Only available for firefox and chrome client.
     * Don't know how it will work on unsupported browsers
     */
    checkBrowserVersion: function(){
        var browserAgent = navigator.userAgent;
        var browserName = navigator.appName;
        var browserVersion = "";

        // For Chrome
        if ((OffsetVersion = browserAgent.indexOf("Chrome")) != -1) {
            browserName = "Chrome";
            browsersVersion = browserAgent.split("Chrome/")[browserAgent.split("Chrome/").length-1]
            browserVersion  = parseInt(browsersVersion.split(" ")[0].split(".")[0])
        }
        // For Firefox
        else if ((OffsetVersion = browserAgent.indexOf("Firefox")) != -1) {
            browserName = "Firefox";
            browserVersion = parseInt(browserAgent.split("/")[browserAgent.split("/").length-1])
        }

        var msg = browserName + " " + browserVersion;
        var priority = 0;
        if (BROWSER_COMPATIBILITY[browserName] != undefined){
            console.log("Detected browser: " + msg)
            if (BROWSER_COMPATIBILITY[browserName].legacy > browserVersion){
                msg += " is not supported."
                priority = 3
            } else if (BROWSER_COMPATIBILITY[browserName].supported > browserVersion){
                msg += ", as a legacy browser, is only partially supported."
                msg += "\n<br />Some features will not be available and the support will be dropped in a few months."
                priority = 2
            }

            if (priority >= 2)
            {
                msg += "\n<br />We recommend using " + browserName + " " + BROWSER_COMPATIBILITY[browserName].supported + " or later, or other modern browsers, "
                msg += "that will be supported until at least " + BROWSER_SUPPORTED_UNTIL + "."
                msg += "\n<br />See our documentation on <a target='_blank' href='http://www.vidjil.org/doc/user/#supported-browsers'>supported browsers</a>."
                console.log({ msg: msg, type: "flash", priority: priority, timeout:15000 });
            }
        } else {
            console.log("Not supported browser: "+browserName)
        }

    },


    /**
     * Set all the properties. Called in the constructor.
     */
    setAll: function () {
        this.system_selected = []
        this.top = 50

        try {
            if (this.localStorage){
                if (localStorage.getItem('colorAxis'))      this.axis_color = localStorage.getItem('colorAxis')
                if (localStorage.getItem('timeFormat'))     this.time_type = localStorage.getItem('timeFormat')
                if (localStorage.getItem('notation'))       this.notation_type  = localStorage.getItem('notation')
                if (localStorage.getItem('alleleNotation')) this.alleleNotation = localStorage.getItem('alleleNotation')
                if (localStorage.getItem('cloneNotation'))  this.cloneNotationType = localStorage.getItem('cloneNotation')
            }
            
        } catch (e) {
            console.log("invalid data stored in localStorage")
        }

        this.color.set(this.axis_color,    false)
        this.changeNotation(this.notation_type,     false)
        this.changeTimeFormat(this.time_type,       false)
        this.changeAlleleNotation(this.alleleNotation, false)
        this.changeCloneNotation(this.cloneNotationType, false)
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

        this.orderedSelectedClones=[];
        this.clusters = [];
        this.clusters_copy = [];
        this.clones = [];
        this.data = {}; // external data
        this.data_info = {};
        this.clone_info = -1;

        this.t = 0;          // Selected time/sample
        this.tOther = 0;  // Other (previously) selected time/sample
        this.focus = -1;

        this.display_window = false
        this.isPlaying = false;

        this.mapID = {};
        this.precision = 1;

        this.germlineV = new Germline(this)
        this.germlineD = new Germline(this)
        this.germlineJ = new Germline(this)
        
        this.dataFileName = '';
        this.analysisFileName = '';
        this.db_key = "" //for file who came from the database
        this.cloneNotationType="short_sequence";
        this.alleleNotation = "when_not_01";

        this.normalization = { 
            "method" : "constant",
            "size_list" : [],
            "expected_size" : 0,
            "id" : -1
        };
        this.normalization_list=[]
        this.normalization_mode = this.NORM_FALSE
        /*Variables pour DBSCAN*/
        this.eps = 0;
        this.nbr = 0;
        this.nodes = null;
        this.edges = null;
        
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
            {"color" : "#dc322f", "name" : "clonotype 1", "display" : true},
            {"color" : "#cb4b16", "name" : "clonotype 2", "display" : true},
            {"color" : "#b58900", "name" : "clonotype 3", "display" : true},
            {"color" : "#268bd2", "name" : "standard", "display" : true},
            {"color" : "#6c71c4", "name" : "standard (noise)", "display" : true},
            {"color" : "#2aa198", "name" : "custom 1", "display" : true},
            {"color" : "#d33682", "name" : "custom 2", "display" : true},
            {"color" : "#859900", "name" : "custom 3", "display" : true},
            {"color" : "",        "name" : "-/-", "display" : true},
            {"color" : "#bdbdbd", "name" : "smaller clonotypes", "display" : true}
        ]

        this.default_tag=8;
        this.distrib_tag=9;

        this.axis_color = "Tag"
        this.notation_type = "percent"
        this.time_type = "name"

        for (var i = 0; i < this.view.length; i++) {
            this.view[i].reset();
        }

    },
    
    
    create_germline_obj: function() {
        for (var locus in germline){
            germl = locus.substring(0,3)
            if (typeof this.germline[germl]==="undefined") {
             this.germline[germl]={};
            }
            for (var allele in germline[locus]) {
                    this.germline[germl][allele]="";
                    this.germline [germl][allele]+=germline[locus][allele];
                    }
                }


        return this.germline;
    },
    
    /**
     * load a germline / attribute a color for each genes / and compute some info
     * @param {string} [system=current_system] system name ('TRG'/'IGH'), see germline.js for a list of available germlines 
     * */
    loadGermline: function (system) {
        console.log("loadGermline : " + system)
        system = typeof system !== 'undefined' ? system : this.system;
        if (system == "multi" || typeof system == 'undefined'){
            system = this.system_available[0]
            var max = 0;
            for (var i=0; i<this.clones.length; i++){
                var clone_size = this.clone(i).getSize()
                var clone_system = this.clone(i).get('germline')
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

    getCurrentSystem: function(){
        return this.germlineV.system
    },
    /**
     * compute some meta-data for each clones
     * */
    initClones: function () {
        console.log("initClones()");
        this.have_external_normalization = false
        $("#external_normalization").hide();
        $("#expected_normalization").hide();

        // time_type to name_short if there is many samples
        if (this.samples.order.length > 6 && !localStorage.getItem("timeFormat"))
            this.changeTimeFormat("short_name", false)

        // time_type to delta_date if we have enough different dates
        deltas = this.dateDiffMinMax()
        if (deltas.max > 1 && !localStorage.getItem("timeFormat"))
            this.changeTimeFormat("delta_date", false)
        
        //      NSIZE
        var n_max = 0;
        var clone;
        for (var i = 0; i < this.clones.length; i++) {
            clone = this.clone(i)
            var n = clone.getNlength();
            if (n > n_max) {n_max = n; }
            if (clone.normalized_reads){
                this.have_external_normalization = true
            }
        }
        this.n_max = n_max
        
        for (var j = 0; j < this.clones.length; j++) 
            this.clone(j).tag = this.default_tag;
        
        this.applyAnalysis(this.analysis);
        this.initData();
        if (this.have_external_normalization){
            this.set_normalization(this.NORM_EXTERNAL)
            // change radio button selection
            var radio = document.getElementById("external_normalization_input")
            if (radio != undefined) {
                radio.checked = true;
                $("#external_normalization").show();
            }
        }
        this.update()
    }, //end initClones

changeCloneNotation: function(cloneNotationType, update, save) {
    this.cloneNotationType = cloneNotationType

    if (this.localStorage && save) localStorage.setItem('cloneNotation', cloneNotationType)

    var menu = document.getElementById("menuCloneNot_" + cloneNotationType)
    if (menu) menu.checked = true

    update = (update==undefined) ? true : update
    if (update) this.update();
},


changeAlleleNotation: function(alleleNotation, update, save) {
    this.alleleNotation = alleleNotation;

    if (this.localStorage && save) localStorage.setItem('alleleNotation', alleleNotation)
    
    var menu = document.getElementById("menuAlleleNot_" + alleleNotation)
    if (menu) menu.checked = true

    update = (update==undefined) ? true : update
    if (update) this.update();
},
    
    /**
     * compute data_info who contain some meta-data for each "data"
     * */
    initData: function () {
        this.data_info = {}
        var i=1;
        for (var key in this.data){
            if (this.data[key].length == this.samples.number){
                this.data_info[key] = {
                    "color" : this.tag[i].color,
                    "isActive" : false
                }
                i++
            }
        }
    },
    
    /**
     * complete some clones with informations found in the analysis file (tag / name / expected value)
     * @param {object} analysis / json content of .analysis file
     * */
    applyAnalysis: function (analysis) {
        
        this.analysis_clones = []   // will store unused clones analysis
        
        if (this.analysis.vidjil_json_version != 'undefined' && this.analysis.vidjil_json_version >= VIDJIL_JSON_VERSION){
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
                }else{
                    this.analysis_clones.push(c[i])
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

    this.analysis_clusters = [] // will store unused clusters analysis
    
	if (typeof (clusters) == 'undefined')
	    return ;

        var biggest_clone;

        for (var i = 0; i < clusters.length; i++) {

            var clusterByIds = [];
            var unfoundClone = [];
            var cloneID;

            // Create cluster by clone id
            biggest_clone = undefined;
            for (var j=0; j<clusters[i].length;j++){
                if (typeof this.mapID[clusters[i][j]] != 'undefined'){
                    cloneID = this.mapID[clusters[i][j]]
                    if (typeof this.clusters[cloneID] != 'undefined'){
                        clusterByIds = clusterByIds.concat(this.clusters[cloneID]);
                    } else {
                        console.error("Error on cluster loading of clone "+cloneID)
                    }
                    // order may be unconserved...
                    // Look for the biggest clone (with the smallest top)
                    if (biggest_clone == undefined || this.clone(cloneID).top < this.clone(biggest_clone).top){
                        biggest_clone = cloneID
                    }
                } else {
                    unfoundClone.push( clusters[i][j] )
                }
            }

            if (clusterByIds.length !== 0){
                this.clusters[biggest_clone] = clusterByIds;

                // Set mergeId values
                for (var pos=0; pos<clusterByIds.length;pos++){
                    cloneID = clusterByIds[pos]

                    // Set the mergeId value for cluterized clones
                    var clone = this.clones[cloneID] 
                    if (clone.index != biggest_clone){
                        clone.mergedId = biggest_clone
                        this.clusters[cloneID] = []
                    }
                }

            }

            if (unfoundClone.length !== 0){
                this.analysis_clusters.push(unfoundClone);
            }

        }
    },

    /**
     * search in the clone list, a clone who share his window with the given sequence.
     * @param {string} sequence
     * @return {integer} clone_id - index of the clone in the clone list (or -1 if not found)
     * */
    findWindow: function (sequence) {
        if (sequence !== 0){
            for ( var i=0; i<this.clones.length; i++ ){
                if ( sequence.indexOf(this.clone(i).id) != -1 ) return i
            }
        }
        return -1
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
        time = typeof time !== 'undefined' ? time : this.t
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
        time = typeof time !== 'undefined' ? time : this.t
        var soft_version = "–"
        if (typeof this.samples.producer != 'undefined')
            soft_version = this.samples.producer[time]
        return soft_version;
    },

    /**
     * return commandline used to produce sample result given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getCommandTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var command = "–"
        if (typeof this.samples.commandline != 'undefined')
            command = this.samples.commandline[time]
        return command;
    },

    getDiversity: function(key, time) {
	time = typeof time !== 'undefined' ? time : this.t
	if (typeof this.diversity != 'undefined' &&
	    typeof this.diversity[key] != 'undefined') {

	    // Diversity may not be stored in an Array for retrocompatiblitiy reasons
	    // See #1941 and #3416
	    if (typeof this.diversity[key][time] != 'undefined') {
            if (this.diversity[key][time] != null) {
                return this.diversity[key][time].toFixed(3);
            } else {
                return this.diversity[key][time]
            }
	    } else {
            return this.diversity[key].toFixed(3);
	    }
	}
    },
    
    /**
     * return date of software run given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getTimestampTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var timestamp = "–"
        if (typeof this.samples.run_timestamp != 'undefined')
            timestamp = this.samples.run_timestamp[time]
        return timestamp
    },

    getInfoTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var info = "-"
        if (typeof this.samples.info != 'undefined' && this.samples.info !== null)
            info = this.samples.info[time]
        return info
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
            this.system_selected = this.system_available.slice()
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
        for (var h=0 ; h<this.reads.segmented.length; h++){
            this.reads.segmented[h]=0
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
     * [changeNormalisation description]
     * @param  {String} mode - some this.NORM_*
     * @return {[type]}      [description]
     */
    set_normalization: function(mode){
        if (mode !== this.NORM_FALSE && mode !== this.NORM_EXPECTED && mode !== this.NORM_EXTERNAL ){
            console.error("Try to change to an undetermined mode of normalization")
            this.normalization_mode = this.NORM_FALSE
            return
        }
        this.normalization_mode = mode
        if (mode == this.NORM_FALSE || mode == this.NORM_EXTERNAL ){
            this.normalization.id = -1
        }

        return
    },


    /**
     * normalize a ratio/size to match the normalization done on a given time/sample
     * normalization is done when update is 
     * @param {float} original_size - size before normalization
     * @param {integer} time - time/sample index of the timepoint where happen the normalization
     * @return {float} normalized_size - size after normalization
     * */
    normalize: function (original_size, time, normalized_reads) {
        var normalized_size = 0;
        
        if (this.normalization_mode == this.NORM_EXPECTED){
            if (this.normalization.size_list.length !== 0 && this.normalization.size_list[time] !== 0) {
                var A = this.normalization.size_list[time] /* standard/spike at point time */
                var B = this.normalization.expected_size       /* standard/spike expected value */
                normalized_size = (original_size * B) / A
                return normalized_size
            }
        }
        
        // includes this.NORM_FALSE
        return original_size
    },

    /**
     * normalize a number of reads according to this.NORM_EXTERNAL
     * if raw is defined, do not normalize
     */
    normalize_reads: function(clone, time, raw) {
      if (this.normalization_mode == this.NORM_EXTERNAL &&
          clone.normalized_reads != undefined &&
          clone.normalized_reads[time] != null &&
          raw == undefined) {
              return clone.normalized_reads[time] ;
      } else if (clone.hasSizeDistrib() && !isNaN(clone.current_reads[time])){          
        return clone.current_reads[time]
      } else {
        return clone.reads[time] ;
      }
    },

    /**
     * compute normalization factor needed to give a clone an expected size
     * @param {integer} cloneID - index of the clone used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
     * */
    compute_normalization: function (cloneID, expected_size) {
        if (cloneID==-1){ 
            expected_size = 0;
            this.normalization.id = cloneID
        }else{
            expected_size = typeof expected_size !== 'undefined' ? expected_size : this.clone(cloneID).expected;
            
            this.normalization.size_list = []
            this.normalization.expected_size = expected_size
            this.normalization.id = cloneID
            this.normalization.type = "clone"
            
            var tmp = this.normalization_mode
            this.normalization_mode = this.NORM_FALSE

            for (var i=0; i<this.samples.number; i++){
                this.normalization.size_list[i] = this.clone(cloneID).getSize(i)
            }
            this.normalization_mode = tmp
        norm_hash = jQuery.extend(true, {}, this.normalization)     
        this.normalization_list.push(norm_hash)
    
        }
    },
    
    /**
     * compute normalization factor needed to give a data an expected size
     * first function called when normalization button is clicked
     * @param {integer} data - index of the data used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
     * */
    compute_data_normalization: function (data, expected_size) {
        expected_size = typeof expected_size !== 'undefined' ? expected_size : this.data[data].expected;
        
        this.normalization.size_list = []
        this.normalization.expected_size = expected_size
        this.normalization.id = data
        this.data[data].expected = expected_size
        
        for (var i=0; i<this.samples.number; i++){
            this.normalization.size_list[i] = this.data[data][i]
        }
         norm_hash = jQuery.extend(true, {}, this.normalization)
        this.normalization_list.push(norm_hash)
    },
    
    /**
     * compute the last normalization again <br>
     * clones sizes can change depending the parameters so it's neccesary to recompute normalization from time to time
     * */
    update_normalization: function () {
        if ((this.normalization.expected_size !== 0 && this.normalization.type=="clone" )) {
            this.compute_normalization( this.normalization.id, this.normalization.expected_size);
        }
    },
    
    /**
     * compute min/max clones sizes and abundance color scale<br>
     * clone size can change depending the parameter so it's neccesary to recompute precision from time to time
     * */
    update_precision: function () { 
        this.min_size = 1
        this.max_size = 0
        for (var i=0; i<this.samples.order.length; i++){
            var t = this.samples.order[i]
            var size = this.min_sizes[t]
            size = this.normalize(this.min_sizes[t], t)
            if (size < this.min_size) this.min_size = size
        }


        for (var j=0;j<this.clones.length;j++){
            if (this.clone(j).isActive() && this.clone(j).hasSizeConstant()) {
                max_s = this.clones[j].getMaxSize()
                if (max_s > this.max_size)
                    this.max_size  = max_s
            }
        }    
        
        //*2 pour avoir une marge minimum d'un demi-log
        // 1/0 == infinity
        this.precision=(1/this.min_size)*2
        
        this.scale_color = d3.scaleLog()
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
            .text(this.clone(cloneID).getNameAndCode())

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

        // others shouldn't be selectable
        if (!this.clones[cloneID].isInteractable()) {
            return 0;
        }

        if (!this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = true;
            this.orderedSelectedClones.push(cloneID);

            this.updateElemStyle([cloneID]);
        }
        this.colorize_multitag_star_icon()
    },


    /**
     * [colorize_multitag_star_icon description]
     * @return {[type]} [description]
     */
    colorize_multitag_star_icon: function(){
        var color = this.getColorSelectedClone()

        try {
            // put it in a try to not create errors on qunit
            var div = document.getElementById("tag_icon__multiple")
            if (color){
                div.style.color = color;
            } else  {
                div.style.color = ""
            }
        } catch (err) {
            // Don't exist into Qunit pipeline
        }
    },


    /**
     * Return the color of selected clones if similar; else return false
     * @return {[type]} [description]
     */
    getColorSelectedClone: function(){
        var selected   = this.getSelected()
        
        if (selected.length == 0){
            return false
        }
        
        var common_color;
        for (var i = 0; i < selected.length; i++) {
            var clone_id = selected[i]
            var clone = this.clones[clone_id]
            var color = clone.true_color;
            if (common_color != color) {
                if (common_color === undefined) {
                    common_color = color;
                } else {
                    return false;
                }
            }
        }

        return common_color;
    },


    /**
     * Unselect an isolated clone
     * @param {integer} - cloneID - index of the clone to remove from the selection
     */
    unselect: function(cloneID) {
        console.log("unselect() (clone " + cloneID + ")");
        if (!this.clones[cloneID].isInteractable()) {
            return 0;
        }

        if (this.clone(cloneID).isSelected()) {
            var index = this.orderedSelectedClones.indexOf(cloneID);
            if (index > -1)
                this.orderedSelectedClones.splice(index, 1);
            this.clone(cloneID).select = false;
            this.updateElemStyle([cloneID]);
        }
        console.log("orderedSelectedClones: " + this.orderedSelectedClones.join(","));
    },

    toggleSelect: function(cloneID) {
        console.log("toggle() (clone " + cloneID + ")");

        // others shouldn't be selectable
        if (this.clones[cloneID].isInteractable()) {
            return 0;
        }

        if (this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = false;
            this.removeFromOrderedSelectedClones(cloneID);
        } else {
            this.clone(cloneID).select = true;
            this.orderedSelectedClones.push(cloneID);
        }
        
        this.updateElemStyle([cloneID]);
    },
    
    /**
     * put clones who match the description in the selection
     * @param {Array} - desc
     * */
    selectBy: function (desc) {
        for (var i=0; i<this.clones.length; i++){
            var clone = this.clone(i);
            var select = true;
            for (var key in desc) {
                select = (select && (clone.get(key) == desc[key]))
            }
            if (clone.isInteractable())
                clone.select = select;
        }
        this.updateStyle();
    },


    /**
     * select clones correlated to a given clone
     * @param {integer} - cloneID - index of the reference clone
     */
    selectCorrelated: function(ref, threshold) {

        if (typeof threshold === "undefined") {
            threshold = 0.95
        }

        refReads = this.clone(ref).getReadsAllSamples(logadd1)

        for (var i=0; i<this.clones.length; i++){
            var clone = this.clone(i);
            var coeff = pearsonCoeff(refReads, clone.getReadsAllSamples(logadd1))
            if (clone.isInteractable())
                clone.select = (Math.abs(coeff) > threshold)
        }
        this.updateStyle();
    },

    
    /**
     * put a list of clones in the selection
     * @param {integer[]} - list - array of clone index
     * */
    multiSelect: function (list) {

        if (list.length == 0) return;
        console.log("select() (clone " + list + ")");

        var tmp = []
        for (var i = 0; i < list.length; i++) {
            tmp[i] = {'id': list[i], 'size': this.clone(list[i]).getSize()}
        }

        list = []
        tmp = tmp.sort(function (a, b) {
            if (a.size < b.size) return 1;
            return -1;
        })

        for (var j = 0; j < tmp.length; j++) {
            if (this.clone(tmp[j].id).isInteractable())
                this.clone(tmp[j].id).select = true;
            this.orderedSelectedClones.push(tmp[j].id);
            list[j] = tmp[j].id
        }
        this.updateModel();
        this.updateElemStyle(this.orderedSelectedClones);
    },

    /**
     * select all clones
     * */
    selectAll: function () {
        for (var i=0; i<this.clones.length; i++){
            if (this.clone(i).isInteractable())
                this.clone(i).select = true;
        }
        this.updateStyle();
    },

    /**
     * kick all clones out of the selection
     * */
    unselectAll: function () {
        console.log("unselectAll()");
        this.orderedSelectedClones = [];
        var list = [];
        for (var i=0; i<this.clones.length; i++){
            if (this.clone(i).select == true){
                list.push(i);
                this.clone(i).select = false;
            }
        }
        this.updateElemStyle(list);
    },

    unselectAllUnlessKey: function (e) {
        if (!(e.ctrlKey || e.altKey || e.metaKey)) this.unselectAll()
    },

    /**
     * Remove an item from the selected Clones list
     */
    removeFromOrderedSelectedClones: function (cloneID){

        if (this.orderedSelectedClones!==null){
            var pos=this.orderedSelectedClones.indexOf(cloneID);
            if (pos>-1){
                this.orderedSelectedClones.splice(pos,1);
            }
        }
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

        var clone;

        for (var i = 0; i < this.clusters.length; i++) {
            // compute only non empty clones
            var seq;
            if (this.clusters[i].length !== 0) {
                if (!this.clone(i).split) {
                    for (var j = 0; j < this.clusters[i].length; j++) {
                        seq = this.clusters[i][j]
                        var subclone = this.clone(seq);
                        subclone.disable();
                        if (seq != i && subclone.isSelected()){
                            // Unselect all subclones
                            this.unselect(seq);
                        }
                    }
                    this.clone(i).enable()
                } else {
                    var main_clone = this.clone(i);
                    for (var k = 0; k < this.clusters[i].length; k++) {
                        seq = this.clusters[i][k]
                        clone = this.clone(seq);
                        clone.enable()
                        if (clone.isSelected() != main_clone.isSelected())
                            this.select(seq, main_clone.select);
                    }
                }
            }
        }
        
        // unactive clones from unselected system
        if (this.system == "multi") {
            for (var l = 0; l < this.clones.length; l++) {
                if (this.system_selected.indexOf(this.clone(l).get('germline')) == -1) {
                    this.clones[l].disable()
                }
            }
        }

        this.filter.apply()
        
        this.computeOtherSize();

        for (var n = 0; n < this.clones.length; n++) {
            this.clone(n).updateColor()
            this.clone(n).updateCloneTagIcon()
        }

        this.colorize_multitag_star_icon();

        this.updateReadsDistribClones()
    },

    /**
     * Update the current reads values of each distributions clones.
     * Use to show the real size of a distribution clone, without the values of real and enable clone of the sample
     * @return {[type]} [description]
     */
    updateReadsDistribClones:function(){
        for (var m = 0; m < this.clones.length; m++) {
            // recuperer le time pour être certain de la soustraction.
            // enalbe peut être faux car compter dans un cluster, donc possiblement compter 2 fois...
            if ( this.clone(m).hasSizeDistrib() ){
                this.clone(m).updateReadsDistribClones()
            }
        }
    },


    /**
     * ask all linked views to do a complete update <br>
     * this function must be call for major change in the model
     * */
    update: function () {
        this.color.update();
        this.filter.update();
        this.update_normalization();
        this.update_precision();
        this.updateModel();

        for (var i = 0; i < this.view.length; i++) {
            if (this.view[i].useSmartUpdate)
                this.view[i].smartUpdate();
            else
                this.view[i].update();
        }
        this.updateIcon();
        this.computeOrderWithStock()
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
            if (this.view[i].useSmartUpdateElem)
                this.view[i].smartUpdateElem(list);
            else
                this.view[i].updateElem(list);
        }
        this.updateIcon();
    },

    /**
     * ask all linked views to update the style of a clone list
     * @param {integer[]} - list - array of clone index
     * */
    updateElemStyle: function (list) {
        for (var i = 0; i < list.length; i++) {
            this.clone(list[i]).updateColor();
            this.clone(list[i]).updateCloneTagIcon();
        }
        for (i = 0; i < this.view.length; i++) {
            if (this.view[i].useSmartUpdateElemStyle)
                this.view[i].smartUpdateElemStyle(list);
            else
                this.view[i].updateElemStyle(list);
        }
        this.updateIcon();
    },

    /**
     * return true if a view has not finished an update
     */
    updateIsPending:function(){
        //check if a view is waiting an update
        for (var i = 0; i < this.view.length; i++) 
            if (this.view[i].updateIsPending())
                return true;

        //check waiting screen
        if (this.waiting_screen_is_on) 
            return true;

        if (this.loading_is_pending == true)
            return true;

        return false;
    },

    /**
     * display an icon in the top-container if a view has not finished an update
     */
    updateIcon:function(){
        if (typeof (this.divUpdateIcon) == "undefined")
            this.divUpdateIcon = document.getElementById("updateIcon");
        if (this.divUpdateIcon==null) return

        if (this.updateIsPending())
            this.divUpdateIcon.style.display = "flex";
        else
            this.divUpdateIcon.style.display = "none";
    },
    
    /**
     * ask all linked views to update the style of all clones
     * */
    updateStyle: function () {
        this.updateModel()
        var list = []
        for (var i=0; i<this.clones.length; i++) list[i]=i
        for (var j = 0; j < this.view.length; j++) {
            this.view[j].updateElemStyle(list);
        }
    },

    /**
     * ask all linked views to init <br>
     * reset the display limit
     * */
    init: function () {

        this.color.init();

        for (var i = 0; i < this.view.length; i++) {
            this.view[i].init();
        }

        var count = 0;
        for (var j = 0; j < this.clones.length; j++) {
            if (this.clone(j).isActive()) count++
        }
        
        this.resize();

        if (typeof this.url_manager !== "undefined") {
            this.url_manager.applyURL();
        }

        this.update()
    },

    /**
     * sum all the unsegmented/undisplayed clones reads and put them in the 'other' clone
     * */
    computeOtherSize: function () {
        var newOthers = {};

        // Creation of newOthers dict by germlines & timestamp
        for (var elt in this.system_available){
            var locus = this.system_available[elt];
            newOthers[locus] = [];
            for (var sample = 0; sample < this.samples.number; sample++) {
                newOthers[locus][sample] = this.reads.germline[locus][sample];
                }
        }

        // compute size for each germlines of newOthers
        other_quantifiable_clones = [];
        for (var pos = 0; pos < this.clones.length; pos++) {
            var c = this.clone(pos)
            if (c.hasSizeOther()){
                other_quantifiable_clones.push(pos);
            } else if (c.isActive() && c.quantifiable && c.hasSizeConstant() ) {
                for (var s = 0; s < this.samples.number ; s++) {
                    for (var k = 0; k < this.clusters[pos].length; k++) {
                        newOthers[c.germline][s] -= this.clone(this.clusters[pos][k]).get('reads', s);
                    }
                }
            }
        }

        // values assignation of other
        //for (var pos = this.clones.length -lenSA; pos < this.clones.length ; pos++) {
        var self = this;
        other_quantifiable_clones.forEach(function(pos) {
            var c = self.clone(pos);
            c.reads = newOthers[c.germline];
            c.name = c.germline + " smaller clonotypes";
            if (this.filter && this.filter.check("Clonotype", "hide") != -1)
                c.name += " + filtered clonotypes";
        })
    },
    
    /**
     * return info about a timePoint in html 
     * @param {integer} timeID - time/sample index
     * @return {string} html 
     * */
    getPointHtmlInfo: function (timeID) {
        var time_length = this.samples.order.length
        var html = ""

        html = "<h2>Sample " + this.getStrTime(timeID, "name") + " ("+ this.getSampleTime(timeID)+")</h2>"
        html += "<div id='info_timepoint'><table><tr><th></th>"
        html += "<tr><td> reads </td><td>" + this.reads.total[timeID] + "</td></tr>"
        html += "<tr><td> analyzed reads </td><td>" + this.reads.segmented_all[timeID] +
            " ("+ (this.reads.segmented_all[timeID]*100/this.reads.total[timeID]).toFixed(3) + " % )</td></tr>"

        html += "<tr><td> analysis software </td><td>" + this.getSoftVersionTime(timeID) + "</td></tr>"
        html += "<tr><td> parameters </td><td>" + this.getCommandTime(timeID) + "</td></tr>"
        html += "<tr><td> timestamp </td><td>" + this.getTimestampTime(timeID) + "</td></tr>"
        html += "<tr><td> analysis log </td><td><pre>" + this.getSegmentationInfo(timeID) + "</pre></td></tr>"

        // 
        var colspan_header =  "colspan='"+(1+this.samples.number)+"'"

        // Sub-table diversity
        if ( typeof this.diversity != 'undefined') {
            html += "<tr><td class='header' "+colspan_header+"> diversity </td></tr>"
            for (var key_diversity in this.diversity) {
                html += "<tr><td> " + key_diversity.replace('index_', '') + "</td><td>" + this.getDiversity(key_diversity, timeID) + '</td></tr>'
            }
        }
        if ( typeof this.samples.diversity != 'undefined' && typeof this.samples.diversity[timeID] != 'undefined') {
            html += "<tr><td class='header' "+colspan_header+"> diversity </td></tr>"
            for (var k in this.samples.diversity[timeID]) {
                html += "<tr><td> " + k.replace('index_', '') + "</td><td>" + this.samples.diversity[timeID][k].toFixed(3) + '</td></tr>'
            }
        }

        // Sub-table preprocess
        if ( typeof this.samples.pre_process != 'undefined') {

            html_preprocess = "<tr><td class='header' "+colspan_header+"> Preprocess </td></tr>"
            // order fct for preprocess
            sort_preprocess = function(a,b){
                var order = ["producer", "run_timestamp", "commandline", "parameters", "input", "output", "stats"]
                return sortFromList(a, b, order)
            }
            var sorted_preprocess = Object.keys(this.samples.pre_process).sort(sort_preprocess)
            for (var key_preprocess in sorted_preprocess) {
                var key   = sorted_preprocess[key_preprocess]
                var value_pre = this.samples.pre_process[key]
                if (value_pre == null){
                    continue
                } else if (Array.isArray(value_pre)){
                    if (value_pre[timeID] == null){ continue }
                    html_preprocess += row_1(key, value_pre[timeID], undefined, 1)
                } else if (typeof(value_pre) == "object"){
                    if (value_pre == null){
                        continue
                    } else {
                        var value_keys = Object.keys(value_pre)
                        for (var i = 0; i < value_keys.length; i++) {
                            var subkey = value_keys[i]
                            var subval = value_pre[subkey]
                            if (subval[timeID] == null){ continue }
                            html_preprocess += row_1(key+" - "+subkey, subval[timeID], undefined, time_length)
                        }
                    }
                }
            }
            if (html_preprocess != "<tr><td class='header' "+colspan_header+"> Preprocess </td></tr>"){
                html += html_preprocess
            }
        }



        html += "</table></div>"

        if ( typeof this.overlaps != 'undefined') {
            html += "<br/><h3>Overlaps index</h3>"

            var overlap_links = {
                "morisita": "https://en.wikipedia.org/wiki/Morisita%27s_overlap_index",
                "jaccard": "https://en.wikipedia.org/wiki/Jaccard_index"
            }
            for (var key_overlap in this.overlaps) {
                var overlap_name = key_overlap.charAt(0).toUpperCase() + key_overlap.slice(1);
                html += "<h4 style='display:inline'>"+overlap_name+"'s index</h4>"
                html += "<a title='Help link for "+overlap_name+"\'s index' class='icon-help-circled-1' target='_blank' href='"+overlap_links[key_overlap]+"' style='text-decoration: none;'></a>"
                html += "<table class='info_overlaps' id='overlap_"+key_overlap+"'>"
                var overlap = this.overlaps[key_overlap]
                html += "<tr><td  class='header'></td>" // header with samples names
                for (var posSample = 0; posSample < overlap.length; posSample++) {
                    html += "<td  class='header'>"+this.getSampleName(posSample)+"</td>"
                }
                html += '</tr>'
                for (posSample = 0; posSample < overlap.length; posSample++) {
                    if (posSample == this.t){
                        html += "<tr class='info_overlaps_line' >"
                    } else {
                        html += "<tr>"
                    }
                    html += "<td class='header'>"+this.getSampleName(posSample)+"</td>"
                    values = overlap[posSample]
                    for (var j = 0; j < (overlap[posSample].length); j++) {
                        value = overlap[posSample][j]

                        if (j == posSample){
                            html += "<td class=''>" + "--" + '</td>'
                        } else {
                            html += "<td>" + value + '</td>'
                        }
                    }
                    html += '</tr>'
                }
                html += "</table>"
            }
        }
        return html
    },


////////////////////////////////////
//// clusters functions
////////////////////////////////////
    
    /**
     * merge all clones currently in the selection into one cluster
     * */
    merge: function (list) {
        var select_lead = false;
        if (list===undefined){
            list = this.getSelected();
            select_lead = true;
        } 

        // remove not real selection
        var self = this
        function to_keep(cloneID){
            var clone = self.clone(cloneID)
            return clone.isClusterizable()
        }
        var filtered_list = list.filter(to_keep)

        if (filtered_list.length === 0) // <= 1 ?
            return ;
        
        var new_cluster = [];
        var leader;
        var top = 200;
        
        console.log("merge clones " + filtered_list)

        this.saveClusters()

        for (var i = 0; i < filtered_list.length; i++) {
            if (this.clone(filtered_list[i]).top < top) {
                leader = filtered_list[i];
                top = this.clone(filtered_list[i]).top;
            }
            new_cluster = new_cluster.concat(this.clusters[filtered_list[i]]);

            // All cluster lists of these clones are now empty...
            this.clusters[filtered_list[i]] = [];
        }

        // make assignation
        for (var j = 0; j < filtered_list.length; j++) {
            if (filtered_list[j] != leader){
                this.clone(filtered_list[j]).mergedId = leader
            }
        }


        // ... except for the leader, who takes the filtered_list of all clones
        this.clusters[leader] = new_cluster;
        this.unselectAll()
        this.updateElem(filtered_list)
        if (select_lead) this.select(leader)
        
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

        this.saveClusters()

        // The cluster has now a list with one less clone
        this.clusters[clusterID] = nlist;
        if (this.clusters[clusterID].length <= 1) this.clone(clusterID).split = false;

        // The unmerged clone has now its own 1-clone cluster
        this.clusters[cloneID] = [cloneID];
        this.clone(cloneID).mergedId = undefined;

        this.updateElem([cloneID, clusterID]);
    },
    
    /** 
     * cluster clones who produce the same result with the function given in parameter <br>
     * @param {function} fct 
     * */
    clusterBy: function (fct) {
        var self = this;
        
        this.saveClusters()
        
        var tmp = {}
        for (var i = 0; i < this.clones.length - this.system_available.length; i++) {

            //detect key value
            var key = "undefined"

            key = fct(i)

            //store clones with same key together
            if (key === "") key = "undefined"
            if (tmp[key]) {
                tmp[key].push(i)
            } else {
                tmp[key] = [i]
            }

        }

        //order clones with same key
        var keys = Object.keys(tmp)
        var compare = function(a, b) {
            return self.clone(a).top - self.clone(b).top;
        }
        for (var j in tmp) {
            tmp[j].sort(compare);
        }

        //reset clusters
        for (var k = 0; k < this.clones.length; k++) {
            this.clusters[k] = []
            this.clone(k).mergedId = undefined
        }

        //new clusters
        for (var l in tmp) {
            var cluster = tmp[l]
            var cluster_main_clone = tmp[l][0]
            this.clusters[cluster_main_clone] = cluster
            this.clusters[cluster_main_clone].name = l

            for (var m = 1; m < tmp[l].length; m++) {
                this.clone(tmp[l][m]).mergedId = cluster_main_clone 
            }
        }
        this.update()
    },

    /**
     * break the given clusters into 1-clone clusters
     * @param {integer list} clusters
     * */
    break: function (clusters) {
        console.log("break(" + clusters+ ")")

        if (clusters === undefined)
            clusters = this.getSelected();

        console.log("break(" + clusters+ ")")

        this.saveClusters()

        for (var i = 0; i < clusters.length; i++) {
            var list = this.clusters[clusters[i]]

            console.log("b " + list)

            for (var j = 0; j < list.length; j++) {
                this.clusters[list[j]] = [list[j]]
            }

            this.updateElem(list);
        }
    },

    /**
     * break all clusters to default 1-clone clusters
     * */
    resetClusters: function () {
        this.saveClusters()

        for (var i = 0; i < this.clones.length; i++) {
            this.clusters[i] = [i]
            this.clone(i).mergedId = undefined
        }

        this.update()
    },


    /**
     * save clusters
     * */
    saveClusters: function () {
        var l = this.clusters_copy.push(this.clusters.slice())

        if (l > 20)
            this.clusters_copy.shift()
    },

    /**
     * restore previously saved clusters
     * */
    restoreClusters: function () {
        if (this.clusters_copy.length > 0){
            this.clusters = this.clusters_copy.pop()
            
            for (var c = 0; c < this.clones.length; c++) {
                this.clone(c).mergedId = undefined
            }
            for (var i = 0; i < this.clusters.length; i++) {
                var cluster = this.clusters[i]
                for (var j = 1; j < cluster.length; j++) {
                    this.clone(cluster[j]).mergedId = cluster[0]
                }
            }
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
        this.updateListCompatibleClones()
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
     * Invert the value of a sample (show/hide).
     * Update the checkbox, the sample in model order, and the model 
     * @param  {[type]} time The timepoint to invert
     */
    switchTime: function(time){
        var pos_timepoint_in_order = this.samples.order.indexOf(time)
        if (pos_timepoint_in_order == -1){
            // Add new timepoint
            this.addTimeOrder( time )
            this.changeTime(time)
        } else if (this.samples.order.length != 1) {
            // Remove timepoint; Don't if there is only one sample
            this.removeTimeOrder(time)
            this.changeTime(this.samples.order[0])
        }
        this.update()
        return
    },

    /**
     * Show all timepoint in the timeline graphic.
     * Add all samples that are not already in the list of actif samples
     * Each sample added will be put at the end of the list.
     */
    showAllTime: function(){
        // keep current timepoint active if exist, else, give active to first timepoint
        var keeptime = this.t
        for (var time = 0; time < this.samples.number; time++) {
            if (this.samples.order.indexOf(time) == -1) this.addTimeOrder(time)
        }
        this.changeTime(keeptime)
        return
    },

    /**
     * Remove all sample of the graph except one
     */
    hideAllTime: function(){
        this.changeTimeOrder( [this.t] )
        return
    },

    /**
     * replace the current time order with a new one
     * @param {integer[]} list - list of time/sample index
     * */
    changeTimeStockOrder: function (list) {
        this.samples.stock_order = list
        this.update()
    },

    /**
     * Order the samples order list with the stock_order
     */
    computeOrderWithStock: function(){
        /*
          order     = [a, b, e, c]    // change e before c; d is not available
          old_stock = [a, b, c, d, e] // original order
          new_stock = [a, b, e, c, d] // new order
         */
        var order      = this.samples.order
        var old_stock  = this.samples.stock_order
        var time_stock = 0

        for (var time = 0; time < order.length; time++) {

            while (order.indexOf(old_stock[time_stock]) == -1){
                time_stock += 1
            }

            if (order[time] != old_stock[time_stock]){
                var index_old = old_stock.indexOf(order[time])
                old_stock.splice(index_old, 1)
                old_stock.splice(time_stock, 0, order[time])
            } // else nothing

            time_stock++
        }
        return old_stock
    },


    /**
     * Add a sample in the time order; at the end of the list
     * @param {Number} time Time point to add at the list
     */
    addTimeOrder: function (time) {
        var index = this.samples.stock_order.indexOf(time)
        this.samples.order.splice(index, 0, time)
        this.update()
    },
    
    /**
     * Add a sample in the time order; at the end of the list
     * @param {Number} time Time point to add at the list
     */
    removeTimeOrder: function (time) {
        var index = this.samples.order.indexOf(time)
        if (this.samples.order.length != 1 && index != -1) {
            this.samples.order.splice(index, 1)
        }
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
            if (current_pos === 0){
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

        for (var i = 0; i < this.samples.order.length; i++)
	    if ((typeof this.samples.timestamp == 'undefined') || (this.samples.timestamp[i] == 'None'))
		return { 'min': -1, 'max': -1 }

        try
        {
            previous_t = this.samples.timestamp[0]

            for (var j = 1; j < this.samples.order.length; j++) {
                t =  this.samples.timestamp[this.samples.order[j]]
                delta = this.dateDiffInDays(previous_t, t)

                if (isNaN(delta)) {
                    throw TypeError("Are "+previous_t+" and "+t+" really dates?")
                }
                
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
            date_max = this.samples.timestamp[this.samples.order[0]]
        
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
            case "names":
                //TODO resolve thid hack
            case "short_name":
                if (typeof this.samples.names !== 'undefined' && this.samples.names[timeID] !== ""){
                    result = this.samples.names[timeID]
                }else{
                    result = this.samples.original_names[timeID]
                    result = result.split('/')[result.split('/').length-1]
                    result = result.split('.')[0]
                }
                if (format == "short_name"){
                    result = result.substring(0, 8);
                }
                break;

            case "sampling_date":
                if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[timeID] && this.samples.timestamp[timeID] != "None")
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
                break;
            default:
                if (typeof this.samples[format] != 'undefined') {
                    result = this.samples[format][timeID];
                }
                break;
        }

        if (this.filter.check("Size", "=", 0) != -1 && timeID == this.getTime() ) result += " *"
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
            if (i && (i % 3) === 0)
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
     * check browser local storage availability
     * */
    checkLocalStorage: function () {
        try {
            this.localStorage = window.localStorage
            var x = '__storage_test__'
            this.localStorage.setItem(x, x)
            this.localStorage.removeItem(x)
        }
        catch(e) {
            return e instanceof DOMException && (
                e.code === 22 ||
                e.code === 1014 ||
                e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                (this.localStorage && this.localStorage.length !== 0)
        }
    },


    NB_READS_THRESHOLD_QUANTIFIABLE: 5,

    /**
     * Size threshold to compute percentages.
     * Under this threshold, the clone is 'positive, but not quantifiable'
     * inspired from clone:getSize()
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSizeThresholdQ: function (time) {
        time = this.getTime(time);

        if (this.reads.segmented[time] === 0 ) return 0;
        var result = this.NB_READS_THRESHOLD_QUANTIFIABLE / this.reads.segmented[time];
        result = this.normalize(result, time);

        return result;
    },


    /**
     * return the size ratio with a fixed number of character
     * @param {integer} time - tracking point (default value : current tracking point)
     * @param {integer} size - the ratio to be formatted
     * @return {string} size
     * */
    getStrAnySize: function (time, size) {
        var sizeQ = this.getSizeThresholdQ(time);
        return this.formatSize(size, true, sizeQ)
    },

    /**
     * format size with the default format in use (model.notation_type) 
     * @param {float} size 
     * @param {bool} fixed - use a fixed size 
     * @param {float} sizeQ - under this size, this is not quantifiable
     * */
    formatSize: function (size, fixed, sizeQ) {
        var result = "−"

        if (size === 0 || typeof size == 'undefined') return result

        if (typeof sizeQ !== 'undefined') {
            if (size < sizeQ) {
                return "+"
                // return "< " + this.formatSize(sizeQ, true)
            }
        }

        switch (this.notation_type) {
        case "percent":
            if (fixed) {
                result = floatToFixed(100*size, 5) + "%";
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
     * compute and display clone information in a window
     * @param {integer} cloneID - clone index
     * */
    displayInfoBox: function(cloneID) {
        $(".list").find(".infoBox").removeClass("infoBox-open")
        
        if (this.clone_info == cloneID) {
            this.closeInfoBox();
            return;
        }
        
        this.clone_info = cloneID;
        this.infoBox.style.display = "block";
        this.infoBox.lastElementChild.innerHTML = self.m.clone(cloneID).getHtmlInfo();
        $("#"+cloneID).find(".infoBox").addClass("infoBox-open")
        $("#f"+cloneID).find(".infoBox").addClass("infoBox-open")
    },

    /**
     * close clone information box
     * */
    closeInfoBox: function() {
        $(".list").find(".infoBox").removeClass("infoBox-open")
        $(".listSeq").find(".infoBox").removeClass("infoBox-open")
        this.clone_info = -1;
        this.infoBox.style.display = "none";
        this.infoBox.lastElementChild.removeAllChildren();
    },

 
    /**
     * open/build the tag/normalize menu for a clone
     * @param {integer} cloneID - clone index
     * */
    openTagSelector: function (clonesIDs, e) {
        var self = this;
        this.tagSelectorList.removeAllChildren();
        clonesIDs = clonesIDs !== undefined ? clonesIDs : this.clonesIDs; 
        this.clonesIDs=clonesIDs

        var buildTagSelector = function (i) {
            var span1 = document.createElement('span');
            span1.className = "tagColorBox tagColor" + i
           
            var span2 = document.createElement('span');
            span2.className = "tagName" + i + " tn"
            span2.appendChild(document.createTextNode(self.tag[i].name))

            var div = document.createElement('div');
            div.className = "tagElem"
            div.id = "tagElem_" + i
            div.appendChild(span1)
            div.appendChild(span2)
            div.onclick = function () {
                for (var j = 0; j < clonesIDs.length; j++) {
                    self.clone(clonesIDs[j]).changeTag(i)
                }
                $(self.tagSelector).hide('fast')
            }

            var li = document.createElement('li');
            li.appendChild(div)

            self.tagSelectorList.appendChild(li);
        }

        for (var i = 0; i < this.tag.length; i++) {
            buildTagSelector(i);
        }
        
        var separator = document.createElement('div');
        separator.innerHTML = "<hr>"

        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode("normalize to: "))

        
        this.norm_input = document.createElement('input');
        this.norm_input.id = "normalized_size";
        this.norm_input.type = "text";
        
        var span2 = document.createElement('span');
        span2.appendChild(this.norm_input)
        
        this.norm_button = document.createElement('button');
        this.norm_input.id = "norm_button";
        this.norm_button.appendChild(document.createTextNode("ok"))
        
        this.norm_button.onclick = function () {
            var cloneID = self.clonesIDs[0];
            var size = parseFloat(self.norm_input.value);
            
            if (size>0 && size<1){
                self.set_normalization( self.NORM_EXPECTED )
                $("#expected_normalization").show();
                self.norm_input.value = ""
                self.clone(cloneID).expected=size;
                self.compute_normalization(cloneID, size)
                self.update()
                $(self.tagSelector).hide('fast')
                $("expected_normalization_input").prop("checked", true)
            }else{
                console.log({"type": "popup", "msg": "expected input between 0.0001 and 1"});
            }
        }
        this.norm_input.onkeydown = function (event) {
            if (event.keyCode == 13) self.norm_button.click();
        }
        
        var div = document.createElement('div');
        div.id  = "normalization_expected_input_div"
        div.appendChild(separator)
        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(this.norm_button)

        var li = document.createElement('li');
        li.appendChild(div)

        this.tagSelectorList.appendChild(li);
        
        var string;
        if (clonesIDs.length > 1){
            string = "Tag for " + clonesIDs.length +  " clonotypes"
        } else {
            if (clonesIDs[0][0] == "s") cloneID = clonesIDs[0].substr(3);
            string = "Tag for "+this.clone(clonesIDs[0]).getName()
        }
        this.tagSelectorInfo.innerHTML = string
        $(this.tagSelector).show();
        
        
        //replace tagSeelector
        var tagSelectorH = $(this.tagSelector).outerHeight()
        var minTop = 40;
        var maxTop = Math.max(40, $(window).height()-tagSelectorH);
        var top = e.clientY - tagSelectorH/2;
        if (top<minTop) top=minTop;
        if (top>maxTop) top=maxTop;
        this.tagSelector.style.top=top+"px";

        var tagSelectorW = $(this.tagSelector).outerWidth()
        var maxLeft = $(window).width() - tagSelectorW;
        var tmp = e.clientX;
        if(typeof e.currentTarget !== 'undefined') {
            tmp = e.currentTarget.offsetLeft + (e.currentTarget.offsetWidth/2);
        }
        var left = tmp + (tagSelectorW/2);
        if (left>maxLeft) left=maxLeft;
        this.tagSelector.style.left=left+"px";

        // If multiple clones Ids; disabled normalization div
        if (clonesIDs.length > 1) {
            $("#"+div.id).addClass("disabledbutton");
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
     * @param {bool} update - will update the display after
     * @param {bool} save - will save value in user preferences (localStorage) 
     * */
    changeNotation: function (notation, update, save) {
        this.notation_type = notation
        if (this.localStorage && save) localStorage.setItem('notation', notation)

        var menu = document.getElementById("menuNotation_" + notation)
        if (menu) menu.checked = true

        if (update) this.update()
    },
    
    /**
     * change default time format for sample/time names
     * @param {string} notation - format ('name', 'sampling_date', 'delta_date', 'delta_date_no_zero')
     * @param {bool} update - will update the display after
     * @param {bool} save - will save value in user preferences (localStorage) 
     * */
    changeTimeFormat: function (time, update, save) {
        this.time_type = time
        if (this.localStorage && save) localStorage.setItem('timeFormat', time)

        var menu = document.getElementById("menuTimeForm_" + time)
        if (menu) menu.checked = true

        if (update) this.update()
    },

    resetSettings: function () {
        localStorage.clear()
        this.color.set("Tag",         false)
        this.changeNotation("percent",      false)
        this.changeTimeFormat("name",       false)
        this.changeAlleleNotation("when_not_01", false)
        this.changeCloneNotation("short_sequence", false)
        console.log({ msg: "user preferences have been reset", type: "flash", priority: 1 });
    },
    
    /**
     * convert visible clones to csv 
     * @return {string} csv 
     * */
    toCSV: function () {
        //header
        var csv = Clone.prototype.toCSVheader(this).join(',')
        csv += "\n"
        
        //only non-empty active clones and virtual clones
        for (var i=0; i<this.clusters.length; i++){
            if ( (this.clusters[i].length !== 0 && this.clone(i).isActive()) || !this.clone(i).hasSizeConstant() ){ 
            // todo; autoriser les distrib ?
                csv += this.clone(i).toCSV().join(',')
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
    getFasta: function () {
        var list = this.getSelected()
        if (list.length>0){
            
            var fasta = ''
            for (var i=0; i<list.length; i++){
                fasta += this.clone(list[i]).getFasta() + '\n'
            }
            //V D J

            var listGene = [];
            var gene_germline = [];
            for (var j=0; j<list.length; j++){
                // gene_way: 5, 4, 3
                for (var gene_way = 5; gene_way >= 3; gene_way--) {
                    var gene = this.clone(list[j]).getGene(gene_way);

                    if ((gene !== undefined) && listGene.indexOf(gene) == -1) {
                        listGene.push(gene);
                        gene_germline.push(this.clones[list[j]].germline);
                    }
                }
            }

            for (var k=0; k<listGene.length; k++){
                var germName = gene_germline[k].substring(0, 3);
                if (this.germline[germName] != undefined) {
                    seq_found = this.findGermlineFromGene(listGene[k]);
                    if (seq_found != undefined){
                        fasta += ">" + listGene[k] + '\n';
                        fasta += seq_found.toUpperCase().replace(/\./g, '') + '\n';
                    }
                }
            }
            return fasta
        } else {
            console.log({msg: "Export FASTA: please select clones to be exported", type: 'flash', priority: 2});
        }
        return -1
    },

    exportFasta: function () {
        var fasta = this.getFasta()
        if (fasta != -1) {
            openAndFillNewTab( "<pre>" + fasta )
        }
        
    },


    /** 
     * Bypass the germline name to ge tthe sequence of a gene
     * This function is used for case of unexpected
     * return the sequence (if found), else an empty string
     */
    findGermlineFromGene: function(gene_name){
        // If germline can be determined from gene name
        var locus = gene_name.substring(0, 3).toUpperCase()
        if (this.germline[locus] != undefined) {
            return this.germline[locus][gene_name]
        }
        // Else, try with all germline of model
        for (var i in this.germline){
            if (this.germline[i][gene_name] != undefined ){
                return this.germline[i][gene_name]
            }
        }
        // Case if gene is not present in this.germline
        return undefined
    },

    exportViewToPNG: function(tag) {
        exportD3ToPNG(tag, decodeURIComponent(this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')));
    },
    
    /**
     * produce an html systemBox of the given system
     * @param {string} system - system string ('trg', 'igh', ...)
     * @return {dom_element} span
     * */
    systemBox: function (system){
        
        var span = document.createElement('span')
        span.className = "systemBoxMenu";
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
        this.waiting_screen_is_on = true;
        this.updateIcon();
    },
    
    resume: function(){
        this.waiting_screen.style.display = "none";
        this.waiting_msg.removeAllChildren();
        if (typeof shortcut != 'undefined') shortcut.on = true;
        this.waiting_screen_is_on = false;
        this.updateIcon();
    },
    
    
    /* --------------------- */

    
   /*For DBSCAN*/
    loadRandomTab: function() {
        this.tabRandomColor = [];
        /*Initialisation du tableau de couleurs*/
        for (var h = 0; h < this.clones.length; h++) {
            this.tabRandomColor.push(h);
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
        div = document.getElementById(div);
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

    DEFAULT_SEGMENTER_URL: "https://dev.vidjil.org/vidjil/segmenter",

    /*
     * Load the default primers sets into the model.
     * TODO : Should load data directly from primers files from germline or other dict
     * TODO : Give the posibility to user to load his own primer set
     */
    populatePrimerSet : function () {
      console.log("Model; populatePrimerSet()")
      this.primersSetData = {"biomed2" : {}, "primer_fictif": {}, "primer_test": {}, "ecngs": {}, "ecngs_FR1": {} }
      // warning: Primer3 are in reverse complement state
      // WARNING: TRA & IGL are missing

      //  Primer Biomed2, can include degenerated sequences
      this.primersSetData.biomed2.TRD = {}; // TODO : init by defaultdict equivalent
      this.primersSetData.biomed2.TRD.primer5 = ["CAGCCAAATCCTTCAGTCTCAA", "CCCTGCATTATTGATAGCCAT", "ACCCTGCTGAAGGTCCTACAT", "ATGACCAGCAAAATGCAACAG", "GTACCGGATAAGGCCAGATTA", "ATACCGAGAAAAGGACATCTATG", "ATGCAAAAAGTGGTCGCTATT", "TTGTACCTCCAGATAGGTTCC", "CTCACGGGGCTCCACGAAGAG", "GTTCCACGATGAGTTGTGTTC", "GTTCCACAGTCACACGGGTTC"];
      this.primersSetData.biomed2.TRD.primer5.concat(["TGGGACCCAGGGTGAGGATAT", "AGCGGGTGGTGATGGCAAAGT"]); // D
      this.primersSetData.biomed2.TRD.primer3 = ["TGTACCTAGAATGCTTTTGCC", "GGAACCTATCTGGAGGTACAA", "CTCTTCGTGGAGCCCCGTGAG", "GAACACAACTCATCGTGGAAC", "GAACCCGTGTGACTGTGGAAC"];

      this.primersSetData.biomed2.TRB = {};
      this.primersSetData.biomed2.TRB.primer5 = ["TTATGTTTACTGGTATCGTAAGAAGC", "CAAAATGTACTGGTATCAACAA", "ATACATGTACTGGTATCGACAAGAC", "GGCCATGTACTGGTATAGACAAG", "GTATATGTCCTGGTATCGACAAGA", "TAACCTTTATTGGTATCGACGTGT", "GGCCATGTACTGGTACCGACA", "TCATGTTTACTGGTATCGGCAG", "TTATGTTTATTGGTATCAACAGAATCA", "AACTATGTTTTGGTATCGTCA", "CAACCTATACTGGTACCGACA", "TACCCTTTACTGGTACCGGCAG", "ATACTTCTATTGGTACAGAGACAAATCT", "CACGGTCTACTGGTACCAGCA", "CGTCATGTACTGGTACCAGCA", "CACGATGTTCTGGTACCGTCAGCA", "CAGTGTGTCCTGGTACCAACAG", "AACCCTTTATTGGTACCGACA", "ATCCCTTTTTTGGTACCAACAG", "AACCCTTTATTGGTATCAACAG", "CGCTATGTATTGGTACAAGCA", "CTCCCGTTTTCTGGTACAGACAGAC", "CGCTATGTATTGGTATAAACAG"];
      this.primersSetData.biomed2.TRB.primer5.concat(["GCCAAACAGCCTTACAAAGAC", "TTTCCAAGCCCCACACAGTC"]); // D
      this.primersSetData.biomed2.TRB.primer3 = ["CACCAGATTCACAGTTGTAGGTAAG", "GACCAGGTTAACCGTTGTAGGTAAG", "AAGTTGGCTCACTGTTGTAGGTAAG", "GAACCCAGCTCTCTGTCTTGGGTATG", "GACTCGACTCTCCATCCTAGGTAAG", "CAGGCTCACTGTGACAGGTATG", "TCACCGTGCTAGGTAAGAAGG", "AGGCTGACCGTACTGGGTAAG", "TGACAGTGCTCGGTAAGCGGG", "TCTCAGTGCTGGGTAAGCTGG", "AGGCTGACCGTGCTGGGCGAG", "CAGGCTCACGGTTACAGGTAAG", "GTGCTCGGTGTGCGCG"]; // complement

      this.primersSetData.biomed2.TRG = {};
      this.primersSetData.biomed2.TRG.primer5 = ["CTTCCACTTCCACTTTGAAA", "ACCTGGTGAAGTCATACAGTTC", "ACTGGTACCTACACCAGGAGG", "GGAAGGCCCCACAGCRTCTT", "AGCATGGGTAAGACAAGCAA", "CGGCACTGTCAGAAAGGAATC", "GGTTGTGTTGGAATCAGGAGTCA", "TTGCTCAGGTGGGAAGACTA"];
      this.primersSetData.biomed2.TRG.primer3 = ["cAAcAcTGGTTGTcAcAGGTA","AAAGcTTATcATTAcAGGTAAGT","cATAGTAAcTTcGccTGGTAA"] // complement

      this.primersSetData.biomed2.IGH = {};
      this.primersSetData.biomed2.IGH.primer5 = ["GGCCTCAGTGAAGGTCTCCTGCAAG", "GTCTGGTCCTACGCTGGTGAAACCC", "CTGGGGGGTCCCTGAGACTCTCCTG", "CTTCGGAGACCCTGTCCCTCACCTG", "CGGGGAGTCTCTGAAGATCTCCTGT", "TCGCAGACCCTCTCACTCACCTGTG", "CTGGGTGCGACAGGCCCCTGGACAA", "TGGATCCGTCAGCCCCCAGGGAAGG", "GGTCCGCCAGGCTCCAGGGAA", "TGGATCCGCCAGCCCCCAGGGAAGG", "GGGTGCGCCAGATGCCCGGGAAAGG", "TGGATCAGGCAGTCCCCATCGAGAG", "TTGGGTGCGACAGGCCCCTGGACAA"] ;
      this.primersSetData.biomed2.IGH.primer3 = ["CCAGTGGCAGAGGAGTCCATTC", "GTCACCGTCTCCTCAGGTA"]; // complement

      this.primersSetData.biomed2.IGK = {};
      this.primersSetData.biomed2.IGK.primer5 = ["TCAAGGTTCAGCGGCAGTGGATCTG", "GGCCTCCATCTCCTGCAGGTCTAGTC", "CCCAGGCTCCTCATCTATGATGCATCC", "CAACTGCAAGTCCAGCCAGAGTGTTTT", "CCTGCAAAGCCAGCCAAGACATTGAT", "GACCGATTTCACCCTCACAATTAATCC", ];
      this.primersSetData.biomed2.IGK.primer5.concat(["CGTGGCACCGCGAGCTGTAGAC"]) // intron
      this.primersSetData.biomed2.IGK.primer3 = ["GGGACCAAGGTGGAGATCAAACGTAAG", "GGGACACGACTGGAGATTAAACGTAAG"];  // complement
      this.primersSetData.biomed2.IGK.primer3.concat(["GTCTACAGCTCGCGGTGCCACG"]) // KDE



      // Primer ECNGS, can include degenerated sequences
      this.primersSetData.ecngs.IGH = {};
      this.primersSetData.ecngs.IGH.primer5  = ["CTGGGTGCGACAGGCCCCT", "CAGGCTCCTGGAAAAGGGCTTGA", "CCCCCGGACAAAGGCTTGA", "CCCGGACAAGCGCTTGAG", "CGACAGGCTCGTGGACAAC", "CGTCAGCCCCCAGGAAAGG", "CCGCCAGGCTCCAGGGAA", "ATGCACTGGGTCCGCCAAG", "CCAGGCTCCAGGAAAGGG", "GCCAGGCTCCCGGGAAGG", "CAGGCTCCAGGCAAGGGG", "ATGCACTGGGTCCGTCAAGC", "GCACTGGGTCTGCCAGGCTC", "CCAGGCTTCCGGGAAAGGG", "ATGCACTGGGTCCGGCAAG", "GGCAGCCCCCAGGGAAGG", "GCCAGCACCCAGGGAAGG", "CAGCCACCAGGGAAGGGCC", "AACTGGGTGCGACAGGCCAC", "CTGGGTGCGCCAGATGCC", "GAACTGGATCAGGCAGTCCC", "GGTTAGATCTGTCAGCCCTCAG", "ATGAGCTGGGTCCGCCAAG", "CTGGGTCCGCCAAGCTACAGGAAA", "GGTCCGCCAGGCTCCAGGGAA", "GGTCCGCCAAGCTCCAGGGAA", "TCCGCCAGCCCCCAGGGAAGG"]
      this.primersSetData.ecngs.IGH.primer5.concat(["GATTCYGAACAGCCCCGAGTCA", "GATTTTGTGGGGGYTCGTGTC", "GTTTGRRGTGAGGTCTGTGTCA", "GTTTRGRRTGAGGTCTGTGTCACT", "CTTTTTGTGAAGGSCCCTCCTR", "GTTATTGTCAGGSGRTGTCAGAC", "GTTATTGTCAGGGGGTGYCAGRC", "GTTTCTGAAGSTGTCTGTRTCAC"])
      this.primersSetData.ecngs.IGH.primer3  = ["GGTCACCGTCTCCTCAGGTAAG", "GGTCACCGTCTCCTCAGGTGAG"] // complement

      this.primersSetData.ecngs.IGKDE = {};
      this.primersSetData.ecngs.IGK_DE   = ["GCAGCTGCAGACTCATGAGGAG"]
      this.primersSetData.ecngs.IGK_INTR = ["GAGTGGCTTTGGTGGCCATGC"]

      this.primersSetData.ecngs.IGK = {};
      this.primersSetData.ecngs.IGK.primer5 = ["AAGTGGGGTCCCATCAAGGTTCAG", "AGTCCCATCTCGGTTCAGTGGCAG", "GAAACAGGGGTCCCATCAAGGTTC", "TCCCAGACAGATTCAGTGGCAGTG", "CTGGAGTGCCAGATAGGTTCAGTG", "CCCTGGAGTCCCAGACAGGTTCAG", "GCATCCCAGCCAGGTTCAGTG", "GTCCCTGACCGATTCAGTGGCA", "AATCCCACCTCGATTCAGTGGC", "CTCAGGGGTCCCCTCGAGGTT", "AGACACTGGGGTCCCAGCCA"]
      this.primersSetData.ecngs.IGK.primer3 = ["GGGACCAAGGTGGAGATCAAACGT", "GGGACCAAAGTGGATATCAAACGT", "GGGACACGACTGGAGATTAAACGT"] // complement

      this.primersSetData.ecngs.TRB = {};
      this.primersSetData.ecngs.TRB.primer5  = ["CTCAGTTGAAAGGCCTGATGGA", "TCAGCTAAGTGCCTCCCAAATT", "GCCAAAGGAACGATTTTCTGCT", "CTGAAGGGTACAGCGTCTCTC", "TTTCTCATCAACCATGCAAGCC", "TGAGCGATTTTTAGCCCAATGC", "GGAGATGCACAAGAAGCGATTC", "ACAAAGGAGAGATCTCTGATGGA", "TCCTCTGAGTCAACAGTCTCCA", "AGGGAGATGTTCCTGAAGGGTA", "CCTGAGGGGTACAGTGTCTCTA", "CTGAGGCCACATATGAGAGTGG", "CAGAATCTCTCAGCCTCCAGAC", "AGTTCCAAATCGCTTCTCACCT", "TCGCTTCTCACCTGAATGCCC", "GGAAACTTCCCTGGTCGATTC", "ACTTCCCTGATCGATTCTCAGC", "TTCCCTAATCGATTCTCAGGGC", "GATTCTCAGGTCTCCAGTTCCC", "CTCAGGTCACCAGTTCCCTAAC", "CCTAGATTTTCAGGTCGCCAGT", "TACAACTGCCAAAGGAGAGGTC", "TACCACTGGCAAAGGAGAAGTC", "TAAAGGAGAAGTCCCGAATGGC", "GGAGAAGTTCCCAATGGCTACA", "CAACGATCGGTTCTTTGCAGTC", "TAAATCAGGGCTGCTCAGTGAT", "CAGTGATCGGTTCTCTGCAGAG", "CTCAACTAGACAAATCGGGGCT", "CTTGAACGATTCTCCGCACAAC", "ATAAAGGAGAAGTCCCCGATGG", "CAAAGGAGAAGTCTCAGATGGC", "ATCGATTTTCTGCAGAGAGGCT", "CCGAGGATCGATTCTCAGCTAA", "CTCTAGATGATTCGGGGATGCC", "GGAAGCATCCCTGATCGATTCT", "CGGTATGCCCAACAATCGATTC", "TGAAGCAGACACCCCTGATAAC"]
      this.primersSetData.ecngs.TRB.primer5.concat(["CCTCCACTCCCCTCAAAGGA", "CAGACTAACCTCTGCCACCTG"])
      this.primersSetData.ecngs.TRB.primer3  = ["GGCACCAGACTCACAGTTGTAG", "GGACCAGGTTAACCGTTGTAG", "GGACCAGGTTAACCGTTGTAG", "GGGAAGTTGGCTCACTGTTGTA", "GGGAAGTTGGCTCACTGTTGTA", "GGAACCCAGCTCTCTGTCTTG", "GGAACCCAGCTCTCTGTCTTG", "GGGACTCGACTCTCCATCCTAG", "GGGACTCGACTCTCCATCCTAG", "GACCAGGCTCACTGTGACAG", "GACCAGGCTCACTGTGACAG", "CTCACCGTGCTAGGTAAGAAGG", "CTCACCGTGCTAGGTAAGAAGG", "CTAGGCTGACCGTACTGGGTAA", "CTAGGCTGACCGTACTGGGTAA", "GGCTGACAGTGCTCGGTAAG", "GGCTGACAGTGCTCGGTAAG", "GGCTCTCAGTGCTGGGTAAG", "GGCTCTCAGTGCTGGGTAAG", "GGCTCCTGGTGCTCGGTGA", "GGCTCCTGGTGCTCGGTGA", "GACCGTGCTGGGTGAGTTTTC", "GACCGTGCTGGGTGAGTTTTC", "GGCTGACCGTGCTGGGTGA", "GGCTGACCGTGCTGGGTGA", "CTCACGGTCACAGGTGAGATTC", "CTCACGGTCACAGGTGAGATTC"] // complement

      this.primersSetData.ecngs.TRD = {};
      this.primersSetData.ecngs.TRD.primer5  = ["GAATGCAAAAAGTGGTCGCTATTC", "TGCAAAGAACCTGGCTGTACT", "TGCAGATTTTACTCAAGGACGG", "GCAAAATGCAACAGAAGGTCG","GATAAAAATGAAGATGGAAGATTCACTGT", "CTCCTTCAATAAAAGTGCCAAGC", "ATTGAAAAGAAGTCAGGAAGACTAAGT", "TCCAGAAAGCAGCCAAATCC"]
      this.primersSetData.ecngs.TRD.primer5.concat(["AGGGGTATTGTGGATGGCAG", "CCCAGGGAAATGGCACTTTTG"])
      this.primersSetData.ecngs.TRD.primer3  = ["ACCCGTGTGACTGTGGAA", "AACACAACTCATCGTGGAACC", "ACTGGCATCAAACTCTTCGTG", "AACCTATCTGGAGGTACAACAAC", "TGCAAGTAAGTGTTTCTAGCCA"] // complement

      this.primersSetData.ecngs.TRG = {};
      this.primersSetData.ecngs.TRG.primer5 = ["GCACAAGGAACAACTTGAGATTG", "TGGAAGCACAAGGAAGAACTTGAGAA", "GCACAGGGAAGAGCCTTAAATT", "CAGGAGGTGGAGCTGGATATT", "CAAGCATGAGGAGGAGCTGGAAATTG", "ACGTCTACATCCACTCTCACC", "CTCTCACTTCAATCCTTACCATCAA", "GCTCACACTTCCACTTCCACTTTGAAAATAAAGT"]
      this.primersSetData.ecngs.TRG.primer3 = ["CTTTGGCAGTGGAACAACACT", "CAAGGTATTTGGTCCCGGAAC", "TATTTGCTGAAGGGACTAAGCTC", "CGTTTGCAAAAGGGACTAGG"] // complement

      // IGH FR1
      this.primersSetData.ecngs_FR1.IGH = {}
      this.primersSetData.ecngs_FR1.IGH.primer5  = ["CTGGGGCTGAGGTGAAGAAG", "GCAGTCTGGAGCAGAGGTGAAAA", "TCACCTTGAAGGAGTCTGGTCC", "AGGTGCAGCTGGTGGAGTC", "GAGGTGCAGCTGTTGGAGTC", "CCAGGACTGGTGAAGCCTTC", "CAGTGGGGCGCAGGACTGTT", "CCAGGACTGGTGAAGCCTCC", "GTACAGCTGCAGCAGTCAGG", "GCTGGTGCAATCTGGGTCTG", "CCTCAGTGAAGGTTTCCTGCAAGG", "AAACCCACAGAGACCCTCACGCTGAC", "CTGGGGGGTCCCTGAGACTCTCCTG", "CTTCACAGACCCTGTCCCTCACCTG", "TCGCAGACCCTCTCACTCACCTGTG"]
      this.primersSetData.ecngs_FR1.IGH.primer5.concat(["GATTCYGAACAGCCCCGAGTCA", "GATTTTGTGGGGGYTCGTGTC", "GTTTGRRGTGAGGTCTGTGTCA", "GTTTRGRRTGAGGTCTGTGTCACT", "CTTTTTGTGAAGGSCCCTCCTR", "GTTATTGTCAGGSGRTGTCAGAC", "GTTATTGTCAGGGGGTGYCAGRC", "GTTTCTGAAGSTGTCTGTRTCAC"])
      this.primersSetData.ecngs_FR1.IGH.primer3  = ["GGTCACCGTCTCCTCAGGTAAG", "GGTCACCGTCTCCTCAGGTGAG"] // complement

      // test fictif; sequence inclut dans les sequences de clones
      this.primersSetData.primer_fictif.TRD = {};
      this.primersSetData.primer_fictif.TRD.primer5 = ["GATTTTACTCAAGGACGGTT", "GCAAAGAACCTGGCTGT", "AGATTTTACTCAAGGAC"] // V3, V2,
      this.primersSetData.primer_fictif.TRD.primer3 = ["AGGAACCCGTGTGACT", "GAACACAACTCATCGTGGA", "GAACTGGCATCAAACTCTTC"] // J1, J2, J3

    },


    /*
     * Generic function to add a feature based on sequence for each clones
     * Sequence can be an array of sequence. In this case, the function will search for best matching sequence in the array before adding feature
     */
    addSegFeatureFromSeq : function (feature, sequence) {
        numberToProcess = this.clones.length

        var best_sequence;
        for (var i = 0; i < numberToProcess; i++) {
            var clone = this.clones[i]
            if ( clone.seg[feature] == undefined && clone.hasSequence() ) {
                // filter to extend only in one direction; depending of feature naming
                var extend = ([5, 3].indexOf(feature.substr(feature.length - 1)) != -1) ? feature.substr(feature.length - 1) : undefined

                // TODO : sequence 0 ou undefined ? bypass la fct ?
                if (Array.isArray(sequence)){
                    var values = clone.getBestMatchingSequence(sequence, extend)
                    best_sequence = values[0]
                    extend        = values[1]
                } else {
                    best_sequence = sequence
                }

                if (best_sequence == undefined){
                    continue
                }
                clone.addSegFeatureFromSeq(feature, best_sequence, extend)
            }
        }
    },


    /*
     * Delete all previous entries for a seg feature for all clones
     * Start the adding of primers on a clean base
     */
    cleanPreviousFeature : function (feature) {
        for (var i = 0; i < this.clones.length; i++) {
            if ( this.clones[i].hasSequence() ) {
                    delete this.clones[i].seg[feature]
            }
        }
    },


    /*
     * Add to each clones the primer sequence and positions for seg 5 and 3
     * Insert into the primer field the name of the primer set used
     * Replace/erase the value of primer field if this one already exist
     */
    switchPrimers : function () {
        if (typeof this.primerSetCurrent == "undefined") {
            console.log("Primer set unknow")
            return -1
        }

        this.cleanPreviousFeature("primer5")
        this.cleanPreviousFeature("primer3")
        for (var i = 0; i < this.system_available.length; i++) {
            var germline = this.system_available[i].replace("+", "")
            if (this.primersSetData[this.primerSetCurrent][germline] != undefined){
                primer5 = this.primersSetData[this.primerSetCurrent][germline].primer5
                primer3 = this.primersSetData[this.primerSetCurrent][germline].primer3

                this.addSegFeatureFromSeq("primer5", primer5)
                this.addSegFeatureFromSeq("primer3", primer3)
            }
        }
    },


    /*
     * Set the current primer set of the model
     * Compute the positions of these primers inside each clones
     */
    switchPrimersSet : function(primersSet){
        if (typeof this.primersSetData == "undefined") {
            this.populatePrimerSet();
            console.log("Primer set have been loaded")
        }
        if (typeof this.primersSetData[primersSet] == "undefined") {
            console.log("Primer set unknow")
            return 1
        } else {
            document.body.style.cursor = 'wait';
            this.primerSetCurrent = primersSet;
            console.log("Current primer set : "+ this.primerSetCurrent)
            this.switchPrimers();
            console.log("Switch primers values : "+ this.primerSetCurrent)
            this.update();
            document.body.style.cursor = 'default';
            return 0
        }
    },

    
    /**
     * sends an ajax request to manually add special clones
     * @param {string} input - the id of the input to extract the sequences from
     */
    addManualClones: function(input) {
        var url = config && config.segmenter_address ? config.segmenter_address : this.DEFAULT_SEGMENTER_URL;

        var inputNode = document.getElementById(input);
        if (!inputNode) {
            console.log("[model] could not find '" + input + "' input node");
            return;
        }

        if (inputNode) {
            var sequences = inputNode.value;

            // When empty, show error
            if (!sequences) {
                showAddManualCloneMenu(true);
            } else {
                var self = this;
                var displayAjax = function (display) {
                    var liveAjaxNode = document.getElementById("live-ajax");
                    var bodyNode = document.getElementsByTagName("body")[0];
                    if (display) {
                        // var imgNode = document.createElement("img");
                        liveAjaxNode.appendChild(icon('icon-spin4 animate-spin', 'Sequences are being analyzed'));
                        bodyNode.style.cursor = "wait";
                    } else {
                        while (liveAjaxNode.lastChild) {
                            liveAjaxNode.removeChild(liveAjaxNode.lastChild);
                        }
                        bodyNode.style.cursor = "default";
                    }
                };
                var params = {
                    method: "POST",
                    data: {
                        sequences: sequences
                    },
                    success: function (data) {
                        displayAjax(false);
                        if (data.error) {
                            console.log({ msg: data.error, type: "flash", priority: 2 });
                            return;
                        }

                        var index = self.clones.length;
                        data.clones.forEach(function (clone) {
                            clone.quantifiable = false;

                            // real
                            var c_attributes = C_CLUSTERIZABLE
                                   | C_INTERACTABLE
                                   | C_IN_SCATTERPLOT
                                   | C_SIZE_CONSTANT

                            clone = new Clone(clone, self, index, c_attributes);
                            // Array with self.sample.number times the same value
                            clone.reads = Array.apply(null, Array(self.samples.number))
                                .map(function(){return SIZE_MANUALLY_ADDED_CLONE})
                            clone.top = 1
                            self.mapID[clone.id] = index;
                            index++;
                        });

                        self.shouldRefresh();
                        self.update();
                        console.log({ msg: "Clonotype(s) added!", type: "flash", priority: 1 })
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        displayAjax(false);
                        console.log({ msg: textStatus + " " + errorThrown, type: "flash", priority: 2 });
                    },
                    timeout: 60000
                };
                $.ajax(url, params);
                displayAjax(true);
            }
        }
    },

    shouldRefresh: function () {
        this.view.forEach(function (view) {
            if (view.shouldRefresh) {
                view.shouldRefresh();
            }
        });
    },



    ////////////////////////////
    /// Distributions 
    ////////////////////////////
    /**
     * Load all distributions and create each distributons clones associated, for each timepoint
     */
    loadAllDistribClones: function(){
        var raw_distribs_axes = []
        var timename  = this.samples.original_names[0]
        var distribs = this.distributions.repertoires[timename]
        // Create the list of all available distributions (on the first timepoint, but should be similar for each)
        if (distribs != undefined){
            for (var i = 0; i < distribs.length; i++) {
                var distrib = distribs[i]
                raw_distribs_axes.push( distrib.axes )
            }
            console.log("Their are " + raw_distribs_axes.length + " distribs to load")
        } else {
            console.log("Their are no distribs to load")
        }

        var same_distribs;
        var current_distrib;

        this.distribs_compatible_clones = {}

        // Fill this.distribs_compatible_clones
        for (var pos_axes = 0; pos_axes < raw_distribs_axes.length; pos_axes++) {
            var axes = raw_distribs_axes[pos_axes]
            this.distribs_compatible_clones[axes] = []
            for (var sample = 0; sample < this.samples.number; sample++) {
                this.distribs_compatible_clones[axes][sample] = {}
                for (var c_pos = 0; c_pos < this.clones.length; c_pos++) {
                    values = this.clones[c_pos].getDistributionsValues(axes, sample)
                    if (typeof this.distribs_compatible_clones[axes][sample][values] != typeof []){ // equivalent python defaultdict
                        this.distribs_compatible_clones[axes][sample][values] = []
                    }
                    this.distribs_compatible_clones[axes][sample][values].push(this.clones[c_pos].index)
                }
            }

            same_distribs = []
            // Get the list of all distributions of axes given
            for (var pos_time = 0; pos_time < this.samples.number; pos_time++) {
                var time = this.samples.order.indexOf(pos_time)
                current_distrib = this.getDistrib(axes, time)
                if (current_distrib == undefined) {
                    console.default.error("Error, no distribution ", axes, " for timePoint ", time)
                    // Should not happen
                    // Create an empty distribution for this timepoint
                    same_distribs.push({"axes":axes, "values":{}})
                } else {
                    same_distribs.push(current_distrib)
                }
            }

            //Get all values for clones to creates (axs, number of reads, clones, ...)
            concat = this.concatDistrib(same_distribs)
            // Create all the corresponding clones
            var indexs = this.createCloneFromdistribConcat(axes, concat)
        }

    },


    /**
     * Create clones from a list of information concatenated directly from distributions
     * EAch clones created corresponding to each distribution of an axes set.
     * @param  {Array} axes   List of axes 
     * @param  {Array} concat Clones informations for the creation
     * @return {Array}        Index of all created clones
     */
    createCloneFromdistribConcat: function(axes, concat){
        var ids = []
        for (var i = 0; i < concat.length; i++) {
            var content = concat[i]
            var creads  = content.splice(content.length-1, 1)[0]
            var reads   = Array(creads.length)
            var clone_number   = Array(creads.length)

            for (var t = 0; t < creads.length; t++) {
                reads[t] = creads[t][1]
                clone_number[t] = creads[t][0]
            }

            // Compute new index
            var index = this.clones.length 

            // Minimal clone data content
            var raw_data     = {"reads": reads, "sequence":0, "id": "distrib_"+index, "top":0, "germline": "distrib", "seg":{}}
            dclone = new Clone(data, this, index, C_INTERACTABLE | C_IN_SCATTERPLOT | C_SIZE_DISTRIB)

            // Increase data with specific content
            dclone.augmentedDistribCloneData(axes, content )
            dclone.axes          = axes
            dclone.reads         = reads
            dclone.clone_number  = clone_number
            dclone.top           = 0
            dclone.active        = true
            dclone.current_reads = JSON.parse(JSON.stringify(reads))
            dclone.defineCompatibleClones()
            ids.push(index)
        }

        return ids
    },


    /**
     * 
     */
    updateListCompatibleClones: function(){
        for (var i = 0; i < this.clones.length; i++) {
            var dclone = this.clones[i]
            if (dclone.hasSizeDistrib()) {
                dclone.current_reads = JSON.parse(JSON.stringify(reads))
            }
        }
        return
    },

    /**
     * Create an array with all data for distrib clones creation by concatenation of each distributions that share same axes values (given in paramer)
     * @param  {Array} distribs The list of each distribution of an axes set given (should be one by timepoint)
     * @return {Array}          List of each clone content, with axes values and number of reads/clones associatied for each timepoint
     */
    concatDistrib: function(distribs){
        if (distribs.length != this.samples.number){
            console.error("concatDistrib: The number of distributions given is not the same that the length of sample present in the model")
            // what should i do ?
            return
        }
        combo = [] // store each created associations
        equal = 0

        // Loop on the distributions
        for (var i = 0; i < distribs.length; i++) {
            var distrib = distribs[i]
            var values  = distrib.values

            // Get each values as a couple ([axe1_value, axe2_value, axeN_value, ..., reads, clone])
            var couples = this.getCoupleForDistribClones(values, [], [])
            

            for (var j = 0; j < couples.length; j++) {
                var couple    = couples[j]
                var clone_val = couple.splice(couple.length-1, 1)[0]
                var found     = false 
                
                // Look if the association already exist
                for (var k = 0; k < combo.length; k++) {
                    var cb = combo[k]


                    if (couple.equals(cb.slice(0, cb.length-1))){
                        // If equal, add reads/clones values
                        found = true
                        cb[cb.length-1][i] = clone_val
                    }
                }
                // If not, init the association and add it to the list
                if (!found){
                    // Create a reads/clones array of the size of samples length
                    reads = new Array(distribs.length)
                    for (var p = 0; p < distribs.length; p++) {
                        reads[p] = [0,0]
                    }
                    reads[i][0] = clone_val[0]
                    reads[i][1] = clone_val[1]
                    couple.push(reads)
                    combo.push(couple)
                }
            }

        }
        return combo
    },



    /**
     * Recursive function to return a list of values for the creation of each distrib clones
     * The return is an Array of Array. Each element is the array of values for each axes plus the distribution values (aka [clones, reads])
     * Compatible with distribution of various axe length
     * @param  {Array/Hash} values  Current values of the given depth
     * @param  {Array} clones  Array (of Array); the list of data to create each distribution clones. Augmented by recursion
     * @param  {Array} current The current values of data for clones creation
     * @return {Array}         Return clones values, depending of the depth.
     */
    getCoupleForDistribClones: function(values, clones, current){
        if (Array.isArray(values)){
            current.push(values)
            clones.push(current)
            return clones
        } else {
            var keys = Object.keys(values)
            for (var pos = 0; pos < keys.length; pos++) {
                var key = keys[pos]
                var current_array = JSON.parse(JSON.stringify(current)); // copy
                current_array.push(key)
                clones = this.getCoupleForDistribClones( values[key], clones, current_array)
            }
            return clones
        }

    },



    /**
     * Return the distribution for the given list of axes and a timepoint
     * @param  {Array} axes    Array of axes names, as available in distributiuon (so must be converted before)
     * @param  {Number} time   timepoint position to get
     * @return {distribution}  The distribution  with thze correct axes list and the correct timepoint
     */
    getDistrib: function(axes, time){
        // get distributions of a timepoint
        var timename  = this.samples.original_names[time]
        var distribs  = this.distributions.repertoires[timename]
        // Loop to find the one of the corresponding axes values
        for (var i = 0; i < distribs.length; i++) {
            var distrib = distribs[i]
            if (distrib.axes.equals(axes) ){
                return distrib
            }
        }
        return undefined
    },


    /**
     * Return the list of clones in function of the values of real, virtual and distrib
     * @param  {boolean} real     set if real clone should be or not retained
     * @param  {boolean} virtual  set if virtual clone should be or not retained
     * @param  {boolean} distrib  set if distrib clone should be or not retained
     * @return {Array}            Array of each clones correspondingf to the selection criteria.
     */
    getListClones: function(real, virtual, distrib){
        real    = real    == undefined ? real    : true;
        virtual = virtual == undefined ? virtual : true;
        distrib = distrib == undefined ? distrib : false;

        var lst = []
        for (var i = 0; i < this.clones.length; i++) {
            var clone = this.clones[i]
            // a revoir.
        }
        return lst

    },

    /**
     * Get the number of cloens that have constant size
     * @return {Number} 
     */
    getNumberRealClones: function(){
        var nb = 0
        for (var i = 0; i < this.clones.length; i++) {
            if (this.clone(i).hasSizeConstant()){
                nb += 1
            }
        }
        return nb

    },

    /**
     * Return a list of samples with selected clones, in the same order than in stock_order
     * @return {Array} list of samples
     */
    getSampleWithSelectedClones: function(){
        var selected = this.getSelected()
        if (selected.length == 0) {
            return this.samples.order
        }

        var list = []
        for (var pos = 0; pos < selected.length; pos++) {
            var clone = this.clones[selected[pos]]
            for (var time = 0; time < clone.reads.length; time++) {
                if (clone.reads[time] != 0 && list.indexOf(time) == -1) {
                    list.push(time)
                }
            }
        }

        // Reorder list as in stock_order
        nlist = []
        for (var i = 0; i < this.samples.stock_order.length; i++) {
            pos = this.samples.stock_order[i]
            if (list.indexOf( pos ) != -1 ){
                nlist.push( pos )
            }
        }
        return nlist
    },

    /**
     * Remove all sample of the graph except one
     */
    hideNotShare: function(){
        // get list of sample with shared clone
        if (this.getSelected().length == 0) {
            return
        }
        this.changeTimeOrder( this.getSampleWithSelectedClones() )
        // this.updateList()
        // this.m.update()
        return
    },

    /**
     * Get the name of a samples.
     * If getted from the server, the correct name to send come from original_names field
     * Else return value from samples.names
     */
    getSampleName: function(posSample){
        var name_server = this.samples.original_names[posSample]
        var name_file = this.samples.names[posSample]
        if (name_file == ""){
            return name_server
        }
        return name_file
    },

    /**
     * Get clones data in AIRR format
     * @param  {Array} cloneIds Array of clone ids to export
     * @return {string}         return data as a string in airr format
     */
    getClonesAsAIRR: function(cloneIds){

        var airr_values = []
        var time_length = this.samples.order.length

        // Get data as hash for each clone and each time
        for (var i = 0; i < cloneIds.length; i++) {
            var cloneId = cloneIds[i]
            var clone = this.clone(cloneId)
            for (var time = 0; time < time_length; time++) {

                var val_airr = clone.getAsAirr(time)
                if (val_airr != undefined){
                    airr_values.push(clone.getAsAirr(time))
                }
            }
        }

        // Make a concatenation of AIRR keys that can be different between clones
        var values;
        var key;
        list_keys = []
        for (v = 0; v < airr_values.length; v++) {
            values = airr_values[v]
            for (key in values){
                list_keys.push(key)
            }
        }
        list_keys = Array.from(new Set(list_keys))

        // Concat content as CSV
        csv = [list_keys]
        for (var m = 0; m < airr_values.length; m++) {
            values = airr_values[m]
            liste = []
            for (var j = 0; j < list_keys.length; j++) {
                key = list_keys[j]
                liste.push( values[key] )
            }
            csv.push(liste)
        }

        return csv.join("\n")
    },


    /**
     * Get clones data in JSON format
     * @param  {Array} cloneIds Array of clone ids to export
     * @return {string}         return data as a string in json format
     */
    exportAsJson: function(cloneIds){
        var data = []
        for (var i = 0; i < cloneIds.length; i++) {
            var clone = this.clone(cloneIds[i]).getAsJson()
            data.push( clone )
        }
        return data
    },



    /**
     * Export clones in the expected format
     * Array of clones can be undefined. In this case, will replace by the list of selected clone
     * @param  {string} file_format file format; allow to thrown an error in console
     * @param  {Array}  cloneIds    Array of clones 'to clean'
     */
    exportCloneAs: function(file_format, cloneIds){
        if (cloneIds == undefined || !Array.isArray(cloneIds)){
            cloneIds = this.getSelected()
        }
        if (cloneIds.length == 0){
            console.error( "Export "+file_format+": please select clones to be exported")
            return
        }

        // Get data in correct format
        if (file_format == "airr") {
            data = this.getClonesAsAIRR(cloneIds)
            file_format = "tsv"
        } else if (file_format == "json") {
            data = JSON.stringify(this.exportAsJson(cloneIds))
        } else {
            console.error("exportCloneAs; unknow file format: " + file_format)
            return
        }

        // Download data in a file

        var filename = "clone_" + cloneIds.join("_") + "." + file_format
        download_csv(data, filename);
    },


}; //end prototype Model
