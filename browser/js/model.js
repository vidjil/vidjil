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
/*  MODEL
 *
 * load
 * loadGermline
 * loadAnalysis
 * initClones
 * saveAnalysis
 * resetAnalysis
 * changeName
 * getName
 * getCode
 * getSize
 * changeRatio
 * changeTime
 * focusIn
 * focusOut
 * select
 * unselect
 * unselectAll
 * getSelected
 * merge
 * split
 *
 * */
VIDJIL_JSON_VERSION = '2014.09';

/*Model constructor
 *
 * */
function Model() {
    myConsole.log("creation Model")
    this.view = [];

    this.reset();

    this.checkBrowser();
}


Model.prototype = {

    reset: function () {
        this.analysis = {
            clones: [],
            cluster: [],
            date: []
        };
        this.t = 0;
        this.norm = false;
        this.focus = -1;
        this.colorMethod = "Tag";
        this.mapID = {};
        this.top = 10;
        this.precision = 1;
        this.isPlaying = false;
        this.timestamp = [];
        this.timestamp2 = [];
        this.clones = [];
        this.windows = [];
        this.germline = {}
        this.germlineV = new Germline(this)
        this.germlineD = new Germline(this)
        this.germlineJ = new Germline(this)
        this.dataFileName = '';
        this.analysisFileName = '';
        this.notation_type = "percent"
        this.time_type = "name"
        this.system_selected = []
        this.db_key = "" //for file who came from the database
        this.normalization = { 
            "A" : [],
            "B" : 0,
            "id" : 0
        };

        /*Variables pour DBSCAN*/
        this.eps = 0;
        this.nbr = 0;
        this.nodes = null;
        this.edges = null;

        this.clonesSelected = [];
        //This attribute contains the last clone selected in/out the graphe
        this.lastCloneSelected = -1;
        this.currentCluster = "";
        
        this.cluster_key = ""
        
        this.display_window = false
        
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

    //Fonction permettant d'ajouter l'objet Segmenter dans le Model
    addSegment: function(segment) {
	this.segment = segment;
    },

    /* load the selected data/analysis file in the model
     * @id : id of the form (html element) linking to the data file
     * @analysis : id of the form (html element) linking to the analysis file
     * impossible to use direct path to input files, need a fakepath from input form
     * @limit : minimum top value to keep a window*/
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
            try {
                var data = JSON.parse(oFREvent.target.result);
            } catch (e) {
                popupMsg(myConsole.msgfile_error);
                return 0
            }
            if ((typeof (data.vidjil_json_version) == 'undefined') || (data.vidjil_json_version < VIDJIL_JSON_VERSION)) {
                popupMsg(myConsole.msgversion_error);
                return 0;
            }
            self.reset()
            self.dataFileName = document.getElementById(id)
                .files[0].name;
            self.parseJsonData(data, limit)
                .loadGermline()
                .loadAnalysis(analysis);
            self.initClones()

        }

    }, //end load
    
    loadDataUrl: function (url) {
        var self = this;
        
        var url_split = url.split('/')
        
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: url,
            success: function (result) {
                json = jQuery.parseJSON(result)
                self.reset();
                self.parseJsonData(json, 100)
                    .loadGermline();
                self.initClones()
                self.dataFileName = url_split[url_split.length-1]
                self.loadAnalysisUrl(url)
            },                
            error: function (request, status, error) {
                myConsole.flash("error : can't reach " + url + "file");
            }
        });

    }, //end load
    
    loadAnalysisUrl: function (url) {
        var self = this;
        
        var url2 = url.replace(".data",".analysis");
        
        var url_split = url2.split('/')
        
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: url2,
            success: function (result) {
                self.parseJsonAnalysis(result)
                self.analysisFileName = url_split[url_split.length-1]
            },
            error: function () {
                self.update()
            }
        });

    }, //end load

    parseJsonData: function (data, limit) {
        self = this;
        self.windows = [];
        self.links = [];
        self.mapID = {}
        self.dataCluster = []
        var min_sizes = [];
        var n_max = 0;
        
        for (var k = 0; k < data.windows[0].size.length; k++) {
                min_sizes[k] = 0.01;
        }

        var hash = 0
        //keep best top value
        for (var i = 0; i < data.windows.length; i++) {
            if (data.windows[i].top <= limit) {
                //search for min_size
                for (var k = 0; k < data.windows[i].size.length; k++) {
                    var size = (data.windows[i].size[k] / data.reads_segmented[k])

                    if (min_sizes[k] > size && data.windows[i].size[k] != 0)
                        min_sizes[k] = size;
                }
                
                data.windows[i].Nlength = 0;
                if ((typeof (data.windows[i].Jstart) != 'undefined') &&
                    (typeof (data.windows[i].Vend) != 'undefined') ) {
                    data.windows[i].Nlength = data.windows[i].Jstart - data.windows[i].Vend
                }

                //search for n_max 
                if ((typeof (data.windows[i].sequence) != 'undefined') &&
                    (typeof (data.windows[i].Nlength) != 'undefined') &&
                    (data.windows[i].Nlength > n_max)) {
                    n_max = data.windows[i].Nlength;
                }
                
                var clone = new Clone(data.windows[i], self, hash)
                self.windows.push(clone);
                hash++
            }
        }
        
        self.samples = data.samples
        self.links = data.links;
        self.reads_segmented = data.reads_segmented;
        self.system_segmented = data.system_segmented;
        self.segmentation_info = data.segmentation_info;
        
        // synthetic window
        var other = {
            "sequence": 0,
            "window": "other",
            "top": 0,
            "size": []
        }
        var clone = new Clone(other, self, hash)
        self.windows.push(clone);
        
        // default samples
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
        
        self.n_windows = self.windows.length;
        self.min_sizes = min_sizes;
        self.n_max = n_max;
        self.system_selected = [];
        for (var key in self.system_segmented) self.system_selected.push(key)
        self.reads_segmented_total = self.reads_segmented.reduce(function (a, b) {
            return a + b;
        });
        self.reads_total = data.reads_total;
        if (self.reads_total) {
            self.reads_total_total = self.reads_total.reduce(function (a, b) {
                return a + b;
            });
        } else {
            self.reads_total_total = self.reads_segmented_total;
            self.reads_total = self.reads_segmented;
        }
        self.timestamp = data.timestamp;
        self.scale_color = d3.scale.log()
            .domain([1, self.precision])
            .range([250, 0]);
        

        //extract germline
        if (typeof data.germline != 'undefined') {
            var t = data.germline.split('/');
            self.system = t[t.length - 1];
        } else {
            self.system = "TRG";
        }

        for (var i = 0; i < self.n_windows; i++) {
            self.mapID[self.windows[i].window] = i;
        }

        var tmp = {}
        // init clones
        if (data.clones) {
            for (var i = 0; i < data.clones.length; i++) {
                var cl = {}
                cl.cluster = []
                for (var j = 0; j < data.clones[i].cluster.length; j++) {
                    if (self.mapID[data.clones[i].cluster[j]] || self.mapID[data.clones[i].cluster[j]] == "0") {
                        cl.cluster.push(self.mapID[data.clones[i].cluster[j]])
                    }
                }
                if (data.clones[i].name) {
                    cl.name = data.clones[i].name
                } else {
                    cl.name = "cluster " + i
                }

                //fuse cluster with same name
                if (cl.cluster.length != 0) {
                    if (!tmp[cl.name]) {
                        tmp[cl.name] = cl
                        tmp[cl.name].cluster.sort()
                    } else {
                        tmp[cl.name].cluster = tmp[cl.name].cluster.concat(cl.cluster)
                        tmp[cl.name].cluster.sort()
                    }
                }
            }

            for (var key in tmp) {
                self.dataCluster.push(tmp[key])
            }
            
            //      DATA CLUSTER
            this.dataCluster.sort(function (a, b) {
                return b.cluster[0] - a.cluster[0]
            })
            for (var i = 0; i < this.dataCluster.length; i++) {
                var new_cluster = [];
                for (var j = 0; j < this.dataCluster[i].cluster.length; j++) {
                    new_cluster = new_cluster.concat(this.clones[this.dataCluster[i].cluster[j]].cluster);
                    this.clones[this.dataCluster[i].cluster[j]].cluster = []
                }
                this.clones[this.dataCluster[i].cluster[0]].cluster = new_cluster
                this.clones[this.dataCluster[i].cluster[0]].name = this.dataCluster[i].name
            }

        }

        return this
    },
    
    //temporary keep old parser to make the transition with new '2014.09' version
    
    parseJsonAnalysis: function (analysis) {
        var self = this
        
        this.analysis = JSON.parse(analysis);
        
        if (typeof self.analysis.vidjil_json_version != 'undefined' && self.analysis.vidjil_json_version == "2014.09"){
            //samples
            var match = 0;
            if (self.analysis.samples) {
                var s = self.analysis.samples
                
                //replace names
                for (var i=0; i<s.number; i++){
                    var pos = self.samples.original_names.indexOf(s.original_names[i])
                    if (pos != -1){
                        if (s.names[i] != "") self.samples.names[pos] = s.names[i]
                        match++
                    }
                }
                
                self.samples.order = []
                for (var i=0; i<s.order.length; i++){
                    var pos = self.samples.original_names.indexOf(s.original_names[s.order[i]])
                    if ( pos != -1) self.samples.order.push(pos)
                }
                
                for (var i=0; i<self.samples.number; i++){
                    var pos = s.original_names.indexOf(self.samples.original_names[i])
                    if (pos == -1) self.samples.order.push(i)
                }

            }
            
            //tags
            if (self.analysis.tags) {
                var s = self.analysis.tags
                
                var keys = Object.keys(s.names);
                for (var i=0; i<keys.length; i++){
                    tagName[parseInt(keys[i])] = s.names[keys[i]]
                }
                
                for (var i=0; i<s.hide.length; i++){
                    tagDisplay[s.hide[i]] = 0;
                }
            }
            
            if (self.analysis.timestamp2) {
                self.timestamp2 = self.analysis.timestamp2;
            }
            if (self.analysis.patient) {
                self.dataFileName = self.analysis.patient;
            }
            self.initClones();
        }else{
            myConsole.flash("invalid json version for analysis file", 1)
        }
    },
    
    
    /* load a new germline and update 
     * 
     * */
    changeGermline: function (system) {
        this.loadGermline(system)
            .computeColor()
            .resize()
            .update()
    },
    
    /* charge le germline définit a l'initialisation dans le model
     * détermine le nombre d'allele pour chaque gene et y attribue une couleur
     * */
    loadGermline: function (system) {
        console.log("loadGermline : " + system)
        system = typeof system !== 'undefined' ? system : this.system;
        if (system == "multi") system = Object.keys(this.system_segmented)[0]
        
        return  this.germlineV.load(system, "V", this)
                    .germlineD.load(system, "D", this)
                    .germlineJ.load(system, "J", this)
                    
    }, //end loadGermline

    /* 
     * gene : kind of gene V/D/J
     * system : system wanted IGH/TRG/TRB/...
     * */
    compute_gene_list: function(gene, system){
        var list = {}
        
        //si le germline complet est inférieur a 20 genes on le charge entierement
        if ( typeof germline[system+gene] != "undefined" && Object.keys(germline[system+gene]).length < 20){
            for (var key in germline[system+gene]){
                list[key] = 0
            }
        }
        
        if (this.system == "multi"){
            for ( var i=0; i<this.n_windows; i++){
                var clone = this.clone(i)
                if (clone.getSystem() == system) {
                    if (clone[gene] && clone[gene][0]){
                        list[clone[gene][0]]=0
                    }   
                }
            }
            
        }else{
            for (var i=0; i<this.n_windows; i++){
                var clone = this.clone(i)
                if (clone[gene] && clone[gene][0]){
                    list[clone[gene][0]]=0
                }
            }
        }
        
        var result = Object.keys(list)
        mySortedArray(result);
        return result
    },
    
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

    /* initializes clones with analysis file data
     *
     * */
    initClones: function () {
        myConsole.log("initClones()");
        var maxNlength = 0;
        var nsize;
        self.mapID = [];
        this.clones = [];

        //      NSIZE
        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)
            
            if (typeof (clone.getSequence()) != 'undefined') {
                nsize = clone.Nlength;
                if (nsize > maxNlength) {
                    maxNlength = nsize;
                }
            } else {
                nsize = -1;
            }
            self.mapID[clone.window] = i;
            this.clones[i] = {
                cluster: [i],
                split: false
            };
            clone.Nlength = nsize;
            clone.tag = default_tag;
        }
        
        //      COLOR_N
        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)
            clone.colorN = colorGenerator((((clone.Nlength / maxNlength) - 1) * (-250)), color_s, color_v);
        }

        this.computeColor()
        
        //      SHORTNAME
        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)
            if (typeof (clone.getSequence()) != 'undefined' && typeof (clone.name) != 'undefined') {
                clone.shortName = clone.name.replace(new RegExp('IGHV', 'g'), "VH");
                clone.shortName = clone.shortName.replace(new RegExp('IGHD', 'g'), "DH");
                clone.shortName = clone.shortName.replace(new RegExp('IGHJ', 'g'), "JH");
                clone.shortName = clone.shortName.replace(new RegExp('TRG', 'g'), "");
                clone.shortName = clone.shortName.replace(new RegExp('\\*..', 'g'), "");
            }
        }
        
        this.applyAnalysis(this.analysis);
        
    }, //end initClones
    
    computeColor: function(){
        //      COLOR_V
        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)
            
            if (typeof (clone.V) != 'undefined' && this.germlineV.allele[clone.V[0]]) {
                var vGene = clone.V[0];
                clone.colorV = this.germlineV.allele[vGene].color;
            } else {
                clone.colorV = "";
            }
        }

        //      COLOR_J
        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)
            
            if (typeof (clone.J) != 'undefined' && this.germlineJ.allele[clone.J[0]]) {
                var jGene = clone.J[0];
                clone.colorJ = this.germlineJ.allele[jGene].color;
            } else {
                clone.colorJ = "";
            }
        }
        
        return this
    },
    
    /* 
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
                //check if we have a clone with a similar window
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
                            myConsole.log(" apply analysis : windows "+ c[i].window + " > incorrect expected value", 0)
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

            //      CUSTOM CLUSTER
            var cluster = analysis.cluster;
            for (var i = 0; i < cluster.length; i++) {

                var new_cluster = [];
                var l = self.mapID[cluster[i][0]]
                
                for (var j=0; j<cluster[i].length;j++){
                    var cloneID = self.mapID[cluster[i][j]]
                    new_cluster = new_cluster.concat(this.clones[cloneID].cluster);
                    this.clones[cloneID].cluster = [];
                }
                this.clones[l].cluster = new_cluster;
            }
        }
        this.init()
    },

    /*
     * 
     */
    findWindow: function (sequence) {
        if (sequence != 0){
            for ( var i=0; i<this.n_windows; i++ ){
                if ( sequence.indexOf(this.clone(i).window) != -1 ) return i
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
            cluster : [],
            tags : {}
        }

        for (var i = 0; i < this.n_windows; i++) {
            var clone = this.clone(i)

            //tag, custom name, expected_value
            if ((typeof clone.tag != "undefined" && clone.tag != 8) || 
                typeof clone.c_name != "undefined" ||
                typeof clone.expected != "undefined") {

                var elem = {};
                elem.id = clone.window;
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
            if (this.clones[i].cluster.length > 1) {
                var elem = [];
                for (var j = 0; j < this.clones[i].cluster.length; j++) {
                    elem.push(this.clone(this.clones[i].cluster[j]).window);
                }
                analysisData.cluster.push(elem);
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
        analysisData.timestamp2 = this.timestamp2

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
    
    /* compute the number of reads segmented for the current selected system(s) 
     * 
     * */
    update_selected_system: function(){
        
        //reset reads_segmented
        for (var i=0 ; i<this.reads_segmented.length; i++){
            this.reads_segmented[i]=0
        }
        
        //reset system
        this.system_selected = []
        
        //check system currently selected in menu
        for (var key in this.system_segmented) {
            if (document.getElementById("checkbox_system_"+key).checked){
                this.system_selected.push(key)
            }
        }
        
        //if 0 box checked in menu then all selected
        if (this.system_selected.length == 0) {
            for (var key in this.system_segmented) {
                this.system_selected.push(key)
            }
        }
        
        //compute new reads_segmented value (sum of reads_segmented of selected system)
        for (var i=0; i<this.system_selected.length; i++){
            var key = this.system_selected[i]
            for (var j=0; j<this.reads_segmented.length; j++){
                this.reads_segmented[j] += this.system_segmented[key][j]
            }
        }

        this.updateModel()
        //check if current germline is in the selected_system
        if (this.system_selected.indexOf(this.germlineV.system) == -1 ){
            this.changeGermline(this.system_selected[0])
        }else{
            this.resize()
                .update()
        }
    },
    
    /*
     * 
     * */
    normalize: function (original_size, time) {
        var normalized_size = 0;
        
        if (this.normalization.A.length != 0 && this.normalization.A[time] != 0) {
            var A = this.normalization.A[time]
            var B = this.normalization.B
            
            if (original_size <= A){
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
            
            var tmp = this.norm
            this.norm = false
            
            for (var i=0; i<this.samples.number; i++){
                this.normalization.A[i] = this.getSize(cloneID, i)
            }
            
            this.norm = tmp
        }
    },
    
    update_normalization: function () {
        if (this.normalization.B != 0) {
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
        
        this.min_size = min_size
        
        //*2 pour avoir une marge minimum d'un demi-log
        this.precision=(1/this.min_size)*2
        
        this.scale_color = d3.scale.log()
            .domain([1, this.precision])
            .range([250, 0]);
    },

    getSegmentationInfo: function (timeID) {
        if (typeof this.segmentation_info != 'undefined'){
            return this.segmentation_info[timeID].replace(/(?:\r\n|\r|\n)/g, '<br />')
        }else{
            return "not specified";
        }
    },
    
    /*
     *
     * */
    changeColorMethod: function (colorM) {
        this.colorMethod = colorM;
        this.update();
    },

    /* use normalization_factor to compute clone size ( true/false )
     *
     * */
    normalization_switch: function (newR) {
        myConsole.log("normalization : " + newR)
        this.norm = newR;
        this.update();
    },
    
    /* use scientific notation / percent
     *
     * */
    notation_switch: function () {
        var radio = document.getElementsByName("notation");
    
        for(var elem in radio){
            if(radio[elem].checked){
                this.notation_type = radio[elem].value
                this.update();
            }
        }
    },
    
    /* use name / date 
     *
     * */
    time_switch: function () {
        var radio = document.getElementsByName("time");
    
        for(var elem in radio){
            if(radio[elem].checked){
                this.time_type = radio[elem].value
                this.update();
            }
        }
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
                }
                break;
            case "sampling_date":
                if ((typeof this.timestamp2 != 'undefined') && this.timestamp2[timeID])
                    result = this.timestamp2[timeID].split(" ")[0]
                break;
            case "run_date":
                if ((typeof this.timestamp != 'undefined') && this.timestamp[timeID])
                    result = this.timestamp[timeID].split(" ")[0]
                break;
        }
        return result
    },

    /* change the current tracking point used
     *
     * */
    changeTime: function (newT) {
        myConsole.log("changeTime()" + newT)
        this.t = newT;
        this.update();
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

    /* Fonction permettant de recharger le bouton 'align' en fonction de ce qui a été selectionné dans le model
    */
    updateAlignmentButton: function() {
      var self = this;
      var align = document.getElementById("align");
      if (align != null) {
	if (this.clonesSelected.length > 1) {
	  align.className = "button";
	  align.onclick = function() {self.segment.align();};
	}
	else {
	  align.className = "";
	  align.onclick = function() {};
	}
      }
    },

    /* return clones currently in the selection
     *
     * */
    getSelected: function () {
        var result = []
        for (var i = 0; i < this.n_windows; i++) {
            if (this.clone(i).isSelected()) {
                result.push(i);
            }
        }
        return result
    },

    /*Fonction permettant d'ajouter un clône donné*/
    addClonesSelected: function(cloneID) {
      this.clonesSelected.push(cloneID);
    },

    /*Fonction permettant de déselectionner un clône donné*/
    removeClonesSelected: function(cloneID) {
      //Si suppression d'un clone parmis une liste de plusieurs, alors on supprime le clone spécifié
      if (this.clonesSelected.length > 1) {
        for (var i = 0; i < this.clonesSelected.length; i++) {
	       if (this.clonesSelected[i] == cloneID) this.clonesSelected.splice(i, 1);
        }
        this.lastCloneSelected = this.clonesSelected[0];
      }
      //Sinon, on remet tout à 0
      else this.removeAllClones();
    },

    /*Fonction permettant de déselectionner tous les clônes déjà sélectionnés*/
    removeAllClones: function() {
      this.clonesSelected = [];
      this.lastCloneSelected = -1;
    },

    /* put a clone in the selection
     *
     * */
    select: function (cloneID) {
        myConsole.log("select() (clone " + cloneID + ")");

        if (cloneID == (this.n_windows - 1)) return 0

        if (this.clone(cloneID).isSelected()) {
            return;
        } else {
            this.clone(cloneID).select = true;
            this.addClonesSelected(cloneID);
	    }
	    
	    this.lastCloneSelected = cloneID;
        this.updateElemStyle([cloneID]);
        this.updateAlignmentButton();
    },
    
   multiSelect: function (list) {

        myConsole.log("select() (clone " + list + ")");

        for (var i=0; i<list.length; i++){
            this.clone(list[i]).select = true;
            this.addClonesSelected(list[i]);
        }

        this.lastCloneSelected = list[0];
        this.updateElemStyle(list);
        this.updateAlignmentButton();
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
	    this.removeAllClones();
        this.updateAlignmentButton();
        this.updateElemStyle(list);
    },

    /* merge all clones currently in the selection into one
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
            new_cluster = new_cluster.concat(this.clones[list[i]].cluster);
            this.clones[list[i]].cluster = [];
        }

        this.clones[leader].cluster = new_cluster;
        this.unselectAll()
        this.updateElem(list)
        this.select(leader)
    },


    /* sépare une window d'un clone
     *
     * */
    split: function (cloneID, windowID) {
        myConsole.log("split() (cloneA " + cloneID + " windowB " + windowID + ")")
        if (cloneID == windowID) return

        var nlist = this.clones[cloneID].cluster;
        var index = nlist.indexOf(windowID);
        if (index == -1) return

        nlist.splice(index, 1);

        //le clone retrouve sa liste de windows -1
        this.clones[cloneID].cluster = nlist;
        //la window forme son propre clone a part
        this.clones[windowID].cluster = [windowID];

        this.updateElem([windowID, cloneID]);
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
        for (var i = 0; i < this.clones.length; i++) {
            // compute only non empty clones
            if (this.clones[i].cluster.length != 0) {
                if (!this.clones[i].split) {
                    for (var j = 0; j < this.clones[i].cluster.length; j++) {
                        var seq = this.clones[i].cluster[j]
                        this.clone(seq).active = false;
                    }
                    this.active(i)
                } else {
                    for (var j = 0; j < this.clones[i].cluster.length; j++) {
                        var seq = this.clones[i].cluster[j]
                        this.active(seq)
                    }
                }
            }
        }
        
        // unactive clones from unselected system
        if (this.system == "multi" && this.system_selected.length != 0) {
            for (var i = 0; i < this.n_windows; i++) {
                if (this.system_selected.indexOf(this.clone(i).getSystem()) == -1) {
                    this.windows[i].active = false;
                }
            }
        }
        
        //unactive filtered clone
        for (var i = 0; i < this.n_windows; i++) {
            if (this.clone(i).isFiltered) {
                this.clone(i).active = false;
            }
        }
        
        this.computeOtherSize();

        for (var i = 0; i < this.n_windows; i++) {
            this.clone(i).updateColor()
        }

    },

    active: function (id) {
        if (this.clone(id).top <= this.top && tagDisplay[this.clone(id).tag] == 1 && this.clone(id).window != "other") {
            this.clone(id).active = true;
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
        myConsole.log("update() : " + elapsedTime);
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
        for (var i=0; i<this.n_windows; i++) list[i]=i
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
        for (var i = 0; i < this.n_windows; i++) {
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
            for (var i=0; i<this.n_windows; i++){
                if (this.clone(i).top <= top) count++;
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

        for (var j = 0; j < this.reads_segmented.length; j++) {
            other[j] = this.reads_segmented[j]
        }

        for (var i = 0; i < this.n_windows - 1; i++) {
            for (var j = 0; j < this.reads_segmented.length; j++) {
                if (this.clone(i).isActive) {
                    for (var k = 0; k < this.clones[i].cluster.length; k++) {
                        if (this.clones[i].cluster[k] != this.n_windows - 1)
                            other[j] -= this.clone(this.clones[i].cluster[k]).size[j];
                    }
                }
            }
        }

        this.clone(this.n_windows - 1).size = other;

    },
    
    /* return info about a timePoint in html 
     *
     * */
    getPointHtmlInfo: function (timeID) {
        var html = ""

        html = "<h2>Point info : " + this.getStrTime(timeID, "name") + "("+this.timestamp[timeID]+")</h2>"
        html += "<div id='info_timepoint'><table><tr><th></th>"
        html += "<tr><td> reads </td><td>" + this.reads_total[timeID] + "</td></tr>"
        html += "<tr><td> reads segmented </td><td>" + this.reads_segmented[timeID] +
            " ("+ (this.reads_segmented[timeID]*100/this.reads_total[timeID]).toFixed(3) + " % )</td></tr>"
        html += "<tr><td> segmentation </td><td>" + this.getSegmentationInfo(timeID) + "</td></tr>"
            
        html += "</table></div>"
        return html
    },

    /* Fonction de clusterisation
     *
     * */
    clusterBy: function (data_name) {

        this.currentCluster = data_name;
        //save user cluster
        if ( this.cluster_key==""){
            this.clones_copy = this.clones
            this.clones = []
        }
        
        var tmp = {}
        for (var i = 0; i < this.n_windows - 1; i++) {

            //detect key value
            var key = "undefined"

            if (this.clone(i)[data_name]) {
                if (this.clone(i)[data_name] instanceof Array) {
                    for (var j = this.clone(i)[data_name].length; j >= 0; j--) {
                        if (this.clone(i)[data_name][j] != 0)
                            key = this.clone(i)[data_name][j]
                    }
                } else {
                    if (this.clone(i)[data_name] != 0)
                        key = this.clone(i)[data_name]
                }
            }

            //store windows with same key together
            if (key == "") key = "undefined"
            if (tmp[key]) {
                tmp[key].push(i)
            } else {
                tmp[key] = [i]
            }

        }

        //order windows with same key
        var keys = Object.keys(tmp)
        for (var i in tmp) {
            tmp[i].sort()
        }

        //reset cluster
        for (var i = 0; i < this.windows.length; i++) {
            this.clones[i] = {
                cluster: [i]
            };
        }

        //new cluster
        for (var i in tmp) {
            this.clones[tmp[i][0]].cluster = tmp[i]
            this.clones[tmp[i][0]].name = i

            for (var j = 1; j < tmp[i].length; j++) {
                this.clones[tmp[i][j]].cluster = []
            }
        }
        this.cluster_key = data_name
        this.update()
    },


    /* 
     *
     * */
    resetClones: function () {
        //reset cluster
        this.cluster_key = ""
        
        for (var i = 0; i < this.windows.length; i++) {
            this.clones[i] = {
                cluster: [i]
            };
        }

        this.update()
    },
    
    /* 
     *
     * */
    restoreClones: function () {
        this.cluster_key = ""
        if ( typeof this.clones_copy != 'undefined'){
            this.clones = this.clones_copy
            this.update()
        }
        
    },


    /* 
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
                this.changeTime(this.samples.order[current_pos+1])
            }else{
                //back to the beginning
                this.changeTime(this.samples.order[0])
            }
        }else{
            this.changeTime(this.samples.order[0])   
        }
    },
    
    previousTime: function (){
        var current_pos = this.samples.order.indexOf(this.t)
        
        if (current_pos != -1){
            if (current_pos == 0){
                //teleport to the end
                this.changeTime(this.samples.order[this.samples.order.length-1])
            }else{
                //previous one
                this.changeTime(this.samples.order[current_pos-1])
            }
        }else{
            this.changeTime(this.samples.order[0])   
        }
        
    },
    
    /* recursive function calling nexTime() till encounter the specified timePoint 
     * 
     * */
    play: function (stop) {
        var self = this;
        this.isPlaying = true;
        this.nextTime();
        
        //check if "stop" is still in time_order and replace it if neccesary
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
            popupMsg(myConsole.msgbrowser_error)
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
        for (var i=0; i < this.clones.length; i++) {
            this.clones[i].split = bool
        }
        this.update()
    },
    

    clone: function(hash) {
        return this.windows[hash]
    },
    

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
   /*For DBSCAN*/
    loadRandomTab: function() {
        this.tabRandomColor = [];
        /*Initialisation du tableau de couleurs*/
        for (var i = 0; i < this.n_windows; i++) {
            this.tabRandomColor.push(i);
        }
        /*Fisher yates algorithm to shuffle the array*/
        for (var i = this.n_windows - 1; i >= 1; i--) {
            var j = Math.floor(Math.random() * i) + 1;
            var abs = this.tabRandomColor[i];
            this.tabRandomColor[i] = this.tabRandomColor[j];
            this.tabRandomColor[j] = abs;
        }
    },

    /* Fonction permettant de charger la clusterisation avec DBSCAN, mais aussi de colorer les nodes directement après en fonction de cette clusterisation
     *
     */
    loadDBSCAN: function(sp) {
        if (typeof(sp) != "undefined") this.sp = sp;
            this.dbscan = new DBSCAN(this.sp, this.eps, this.nbr);
            this.dbscan.runAlgorithm();
            for (var i = 0; i < this.dbscan.clusters.length; i++)
                for (var j = 0; j < this.dbscan.clusters[i].length; j++)
                    this.windows[this.dbscan.clusters[i][j]].cluster = i;
            //Color DBSCAN
            if (typeof(this.tabRandomColor) == "undefined") this.loadRandomTab();
            this.colorNodesDBSCAN();
            //Add information about the window (Noise, Core, ...)
            this.addTagCluster();
            if (this.currentCluster == "cluster") this.clusterBy("cluster");
    },

    /* Fonction permettant de colorer les nodes en fonction de la clusterisation DBSCAN
    */
    colorNodesDBSCAN: function() {
        /*Adding color by specific cluster*/
        /*-> Solution provisoire quant à la couleur noire non voulue est d' "effacer" le nombre max de clusters, mais de le prendre par défaut (100), soit un intervalle de 2.7 à chaque fois*/
        var maxCluster = this.dbscan.clusters.length;
        for (var i = 0; i < this.n_windows; i++) {
            if (typeof(this.clone(i).cluster) != 'undefined') {
                this.clone(i).colorDBSCAN = colorGenerator( ( (270 / maxCluster) * (this.tabRandomColor[this.clone(i).cluster] + 1) ), color_s, color_v);
            }
            else
                this.clone(i).colorDBSCAN = color['@default'];
        }
    },

    /* Fonction permettant d'ajouter un tab concernant un node - s'il est au coeur d'un cluster, à l'extérieur ou appartenant à...
     */
    addTagCluster: function() {
        for (var i = 0; i < this.n_windows; i++)
            if (typeof(this.clone(i).cluster) != 'undefined')
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

} //end prototype Model












//TODO a deplacer

function loadData() {
    document.getElementById("file_menu")
        .style.display = "block";
    document.getElementById("analysis_menu")
        .style.display = "none";
}

function loadAnalysis() {
    document.getElementById("analysis_menu")
        .style.display = "block";
    document.getElementById("file_menu")
        .style.display = "none";
}

function cancel() {
    document.getElementById("analysis_menu")
        .style.display = "none";
    document.getElementById("file_menu")
        .style.display = "none";
}



function showSelector(elem) {
        $('.selector')
            .stop()
        $('.selector')
            .css('display', 'none');
        $('#' + elem)
            .css('display', 'block')
            .animate({
                height: $('#' + elem).children(":first").height()
            }, 100);
}

function hideSelector() {
    $('.selector')
        .stop()
        .animate({
            height: "hide",
            display: "none"
        }, 100);
}


function initCoef() {
    m.resize();
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;

function showDisplayMenu() {
    $('#display-menu')
        .stop
    $('#display-menu')
        .toggle("fast");
}



function return_URL_CGI() {
    if (typeof config != "undefined") return config.cgi_address;
    else return "No_CGI_found";
}



