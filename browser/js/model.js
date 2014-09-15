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
            custom: [],
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
                popupMsg(msg.file_error);
                return 0
            }
            if ((typeof (data.vidjil_json_version) == 'undefined') || (data.vidjil_json_version < VIDJIL_JSON_VERSION)) {
                popupMsg(msg.version_error);
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

                self.windows.push(data.windows[i]);
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
        self.windows.push(other);
        
        // default order
        if (typeof self.samples.number == 'string'){
            self.samples.number = parseInt(self.samples.number)
        }
        if (typeof self.samples.order == 'undefined'){
            self.samples.order = []
            for (var i = 0; i < self.samples.number; i++) self.samples.order.push(i);
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

        }

        return this
    },
    
    parseJsonAnalysis: function (analysis) {
        var self = this
        
        this.analysis = JSON.parse(analysis);
        if (self.analysis.time && (self.analysis.time.length == self.time.length)) {
            self.time = self.analysis.time;
            self.time_order = self.analysis.time_order;
            self.t = self.time_order[0]
        }
        if (self.analysis.normalization) {
            self.normalization= self.analysis.normalization;
        }
        if (self.analysis.timestamp2) {
            self.timestamp2 = self.analysis.timestamp2;
        }
        if (self.analysis.patient) {
            self.dataFileName = self.analysis.patient;
        }
        self.initClones();
    },
    
    
    /* load a new germline and update 
     * 
     * */
    changeGermline: function (system) {
        this.loadGermline(system)
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
            for ( var i=0; i<this.windows.length; i++){
                if (this.windows[i].system == system) {
                    if (this.windows[i][gene] && this.windows[i][gene][0]){
                        list[this.windows[i][gene][0]]=0
                    }   
                }
            }
            
        }else{
            for (var i=0; i<this.windows.length; i++){
                if (this.windows[i][gene] && this.windows[i][gene][0]){
                    list[this.windows[i][gene][0]]=0
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

        myConsole.log("loadAnalysis()");
        if (document.getElementById(analysis)
            .files.length != 0) {
            var oFReader = new FileReader();
            var oFile = document.getElementById(analysis)
                .files[0];

            self.analysisFileName = document.getElementById(analysis)
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

        return this;
    }, //end loadAnalysis


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
            if (typeof(this.windows[i].cluster) != 'undefined') {
                this.windows[i].colorDBSCAN = colorGenerator( ( (270 / maxCluster) * (this.tabRandomColor[this.windows[i].cluster] + 1) ), color_s, color_v);
            }
            else
                this.windows[i].colorDBSCAN = color['@default'];
        }
    },

    /* Fonction permettant d'ajouter un tab concernant un node - s'il est au coeur d'un cluster, à l'extérieur ou appartenant à...
     */
    addTagCluster: function() {
        for (var i = 0; i < this.n_windows; i++)
            if (typeof(this.windows[i].cluster) != 'undefined')
                switch (this.dbscan.visitedTab[i].mark) {
                case -1:
                        this.windows[i].tagCluster = "NOISE";
                        break;
                case 0:
                        this.windows[i].tagCluster = "CORE";
                        break;
                case 1:
                        this.windows[i].tagCluster = "NEAR";
                        break;
                }
            else
                this.windows[i].tagCluster = null;
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

            if (typeof (this.windows[i].sequence) != 'undefined') {
                nsize = this.windows[i].Nlength;
                if (nsize > maxNlength) {
                    maxNlength = nsize;
                }
            } else {
                nsize = -1;
            }
            self.mapID[this.windows[i].window] = i;
            this.clones[i] = {
                cluster: [i],
                split: false
            };
            this.windows[i].Nlength = nsize;
            this.windows[i].tag = default_tag;
        }
        myConsole.log(maxNlength);
        
        /*TODO rework color
         * */
        
        //      COLOR_N
        for (var i = 0; i < this.n_windows; i++) {
            this.windows[i].colorN = colorGenerator((((this.windows[i].Nlength / maxNlength) - 1) * (-250)), color_s, color_v);
        }

        //      COLOR_V
        for (var i = 0; i < this.n_windows; i++) {
            if (typeof (this.windows[i].V) != 'undefined' && this.germlineV.allele[this.windows[i].V[0]]) {
                var vGene = this.windows[i].V[0];
                this.windows[i].colorV = this.germlineV.allele[vGene].color;
            } else {
                this.windows[i].colorV = "";
            }
        }

        //      COLOR_J
        for (var i = 0; i < this.n_windows; i++) {
            if (typeof (this.windows[i].J) != 'undefined' && this.germlineJ.allele[this.windows[i].J[0]]) {
                var jGene = this.windows[i].J[0];
                this.windows[i].colorJ = this.germlineJ.allele[jGene].color;
            } else {
                this.windows[i].colorJ = "";
            }
        }
        
        //      SHORTNAME
        for (var i = 0; i < this.n_windows; i++) {
            if (typeof (this.windows[i].sequence) != 'undefined' && typeof (this.windows[i].name) != 'undefined') {
                this.windows[i].shortName = this.windows[i].name.replace(new RegExp('IGHV', 'g'), "VH");
                this.windows[i].shortName = this.windows[i].shortName.replace(new RegExp('IGHD', 'g'), "DH");
                this.windows[i].shortName = this.windows[i].shortName.replace(new RegExp('IGHJ', 'g'), "JH");
                this.windows[i].shortName = this.windows[i].shortName.replace(new RegExp('TRG', 'g'), "");
                this.windows[i].shortName = this.windows[i].shortName.replace(new RegExp('\\*..', 'g'), "");
            }
        }
        
        this.applyAnalysis(this.analysis.custom);
        
    }, //end initClones
    
    /* 
     * 
     * */
    applyAnalysis: function (c) {
        //      CUSTOM TAG / NAME
        //      EXPECTED VALUE
        var max = {"id" : -1 , "size" : 0 }     //store biggest expected value ( will be used for normalization)
        for (var i = 0; i < c.length; i++) {
            
            var id = -1
            var f = 1;
            //check if we have a clone with a similar window
            if (typeof c[i].window != "undefined" && typeof this.mapID[c[i].window] != "undefined") {
                id = this.mapID[c[i].window]
            }
            
            //check if we have a window who can match the sequence
            if (typeof c[i].sequence != "undefined" && id == -1) {
                id = this.findWindow(c[i].sequence);
            }
            
            if (id != -1){
                if (typeof c[i].expected != "undefined") {
                    this.windows[id].expected = c[i].expected
                    f = this.getSize(id) / c[i].expected;
                    
                    if (f < 100 && f > 0.01) {
                        if (typeof (c[i].tag) != "undefined") {
                            this.windows[id].tag = c[i].tag;
                        }

                        if (typeof (c[i].name) != "undefined") {
                            this.windows[id].c_name = c[i].name;
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
                        this.windows[id].tag = c[i].tag;
                    }
                    if (typeof (c[i].name) != "undefined") {
                        this.windows[id].c_name = c[i].name;
                    }
                }
            }
        }
        
        //      default normalization
        if (max.id != -1 && this.normalization.B == 0){
            this.compute_normalization(max.id, max.size)
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

        //      CUSTOM CLUSTER
        var cluster = this.analysis.cluster;
        for (var i = 0; i < cluster.length; i++) {
            if (typeof self.mapID[cluster[i].l] != "undefined" && typeof self.mapID[cluster[i].f] != "undefined") {

                var new_cluster = [];
                new_cluster = new_cluster.concat(this.clones[self.mapID[cluster[i].l]].cluster);
                new_cluster = new_cluster.concat(this.clones[self.mapID[cluster[i].f]].cluster);

                this.clones[self.mapID[cluster[i].l]].cluster = new_cluster;
                this.clones[self.mapID[cluster[i].f]].cluster = [];

            }
        }

        this.init()
    },

    /*
     * 
     */
    findWindow: function (sequence) {
        for ( var i=0; i<this.windows.length; i++ ){
            if ( sequence.indexOf(this.windows[i].window) != -1 ) return i
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
        var analysisData = {
            custom: [],
            cluster: []
        }

        for (var i = 0; i < this.n_windows; i++) {

            //tag, custom name, expected_value
            if ((typeof this.windows[i].tag != "undefined" && this.windows[i].tag != 8) || 
                typeof this.windows[i].c_name != "undefined" ||
                typeof this.windows[i].expected != "undefined") {

                var elem = {};
                elem.window = this.windows[i].window;
                elem.sequence = this.windows[i].sequence;

                if (typeof this.windows[i].tag != "undefined" && this.windows[i].tag != 8)
                    elem.tag = this.windows[i].tag;
                if (typeof this.windows[i].c_name != "undefined")
                    elem.name = this.windows[i].c_name;
                if (typeof this.windows[i].expected != "undefined")
                    elem.expected = this.windows[i].expected;

                analysisData.custom.push(elem);
            }

            //clones / cluster
            if (this.clones[i].cluster.length > 1) {
                for (var j = 0; j < this.clones[i].cluster.length; j++) {
                    if (this.clones[i].cluster[j] != i) {
                        var elem = {};
                        elem.l = this.windows[i].window;
                        elem.f = this.windows[this.clones[i].cluster[j]].window;
                        analysisData.cluster.push(elem);
                    }
                }
            }
        }

        //name time/point
        analysisData.time = this.time
        analysisData.time_order = this.time_order
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
            custom: [],
            cluster: [],
            date: []
        };
        this.initClones();
    },

    /* give a new custom name to a clone
     *
     * */
    changeName: function (cloneID, newName) {
        myConsole.log("changeName() (clone " + cloneID + " <<" + newName + ")");
        this.windows[cloneID].c_name = newName;
        this.updateElem([cloneID]);
    }, //fin changeName,

    /* give a new custom tag to a clone
     *
     * */
    changeTag: function (cloneID, newTag) {
        newTag = "" + newTag
        newTag = newTag.replace("tag", "");
        myConsole.log("changeTag() (clone " + cloneID + " <<" + newTag + ")");
        this.windows[cloneID].tag = newTag;
        this.updateElem([cloneID]);
    },

    /* return clone name
     * or return name of the representative sequence of the clone
     *
     * */
    getName: function (cloneID) {
        if (this.clones[cloneID].name) {
            return this.clones[cloneID].name;
        } else {
            return this.getSequenceName(cloneID);
        }
    }, //end getCloneName

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

    /* return custom name of cloneID,
     * or return segmentation name
     *
     * */
    getSequenceName: function (cloneID) {
        if (typeof (this.windows[cloneID].c_name) != 'undefined') {
            return this.windows[cloneID].c_name;
        } else {
            return this.getCode(cloneID);
        }
    }, //end getName

    /* return segmentation name "geneV -x/y/-z geneJ",
     * return a short segmentation name if system == IGH,
     *
     * */
    getCode: function (cloneID) {
        if (typeof (this.windows[cloneID].sequence) != 'undefined' && typeof (this.windows[cloneID].name) != 'undefined') {
            if (this.windows[cloneID].name.length > 100 && typeof (this.windows[cloneID].shortName) != 'undefined') {
                return this.windows[cloneID].shortName;
            } else {
                return this.windows[cloneID].name;
            }
        } else {
            return this.windows[cloneID].window;
        }
    }, //end getCode


    /* compute the clone size ( sum of all windows clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getSize: function (cloneID, time) {
        time = typeof time !== 'undefined' ? time : this.t;

        if (this.reads_segmented[time] == 0 ) return 0
        var result = this.getReads(cloneID, time) / this.reads_segmented[time]
        
        if (this.norm) {
            result = this.normalize(result, time)
        }

        return result

    }, //end getSize
    
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
            this.loadGermline(this.system_selected[0])
        }
        
        this.resize()
            .update()
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
            expected_size = typeof expected_size !== 'undefined' ? expected_size : this.windows[cloneID].expected;
            
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
    
    /* 
     *
     * */
    getSequenceSize: function (cloneID, time) {
        time = typeof time !== 'undefined' ? time : this.t;
        
        if (this.reads_segmented[time] == 0 ) return 0
        var result = this.getSequenceReads(cloneID, time) / this.reads_segmented[time]
        
        if (this.norm) {
            result = this.normalize(result, time)
        }

        return result

    }, //end getSequenceSize


    /* compute the clone reads number ( sum of all reads of windows clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getReads: function (cloneID, time) {
        time = typeof time !== 'undefined' ? time : this.t;
        var result = 0;

        for (var j = 0; j < this.clones[cloneID].cluster.length; j++) {
            result += this.windows[this.clones[cloneID].cluster[j]].size[time];
        }

        return result

    }, //end getSize

    /* 
     *
     * */
    getSequenceReads: function (cloneID, time) {
        time = typeof time !== 'undefined' ? time : this.t;

        var result = 0;
        result = this.windows[cloneID].size[time];

        return result;

    }, //end getSequenceSize
    getV: function (cloneID) {
        if (typeof (this.windows[cloneID].sequence) != 'undefined' && typeof (this.windows[cloneID].V) != 'undefined') {
            return this.windows[cloneID].V[0].split('*')[0];
        }
        return "undefined V";
    },

    getJ: function (cloneID) {
        if (typeof (this.windows[cloneID].sequence) != 'undefined' && typeof (this.windows[cloneID].J) != 'undefined') {
            return this.windows[cloneID].J[0].split('*')[0];;
        }
        return "undefined J";
    },


    /* return the clone size with a fixed number of character
     * use scientific notation if neccesary
     * */
    getStrSize: function (cloneID) {
        var size = this.getSize(cloneID);
        return this.formatSize(size, true)
    },

    /* return the clone color
     *
     * */
    getColor: function (cloneID) {
        if (this.focus == cloneID)
            return color['@select'];
        if (!this.windows[cloneID].active)
            return color['@default'];
        if (this.colorMethod == "abundance") {
            var size = this.getSize(cloneID)
            if (size == 0) return color['@default'];
            return colorGenerator(this.scale_color(size * this.precision), color_s, color_v);
        }
        if (this.colorMethod == "Tag")
            return tagColor[this.windows[cloneID].tag];
        if (this.colorMethod == "dbscan")
            return this.windows[cloneID].colorDBSCAN;
        if (typeof (this.windows[cloneID].V) != 'undefined') {
            switch(this.colorMethod) {
                case 'V':
                    return this.windows[cloneID].colorV;
                case 'J':
                    return this.windows[cloneID].colorJ;
                case 'N':
                    return this.windows[cloneID].colorN;
            }
        }
        if (this.colorMethod == "system") {
            return germline.icon[this.windows[cloneID].system].color
        }
        return color['@default'];
    },
    
    /* return clone segmentation status
     * 
     * */
    getStatus: function (cloneID) {
        if (typeof this.windows[cloneID].status != 'undefined'){
            return this.segmented_mesg[this.windows[cloneID].status]
        }else{
            return "not specified";
        }
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
            .text(this.getName(cloneID))

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
            if (this.windows[i].select) {
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

        if (this.windows[cloneID].select) {
            return;
        } else {
            this.windows[cloneID].select = true;
            this.addClonesSelected(cloneID);
	    }
	    
	    this.lastCloneSelected = cloneID;
        this.updateElemStyle([cloneID]);
        this.updateAlignmentButton();
    },
    
   multiSelect: function (list) {

        myConsole.log("select() (clone " + list + ")");

        for (var i=0; i<list.length; i++){
            this.windows[list[i]].select = true;
            this.addClonesSelected(list[i]);
        }

        this.lastCloneSelected = list[0];
        this.updateElemStyle(list);
        this.updateAlignmentButton();
    },

    /* kick a clone out of the selection
     *
     * */
    unselect: function (cloneID) {
        myConsole.log("unselect() (clone " + cloneID + ")")
        if (this.windows[cloneID].select) {
            this.windows[cloneID].select = false;
        }
        this.removeClonesSelected(cloneID);
	    this.updateElemStyle([cloneID]);
        this.updateAlignmentButton();
    },


    /* kick all clones out of the selection
     *
     * */
    unselectAll: function () {
        myConsole.log("unselectAll()")
        var list = this.getSelected();
        for (var i = 0; i < list.length; i++) {
            this.windows[list[i]].select = false;
        }
        this.updateElemStyle(list);
	    this.removeAllClones();
        this.updateAlignmentButton();
    },
    
    isSelected: function (cloneID) {
        if (this.clonesSelected.indexOf(cloneID) != -1){
            return true;
        }else{
            return false;
        }
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
            if (this.windows[list[i]].top < top) {
                leader = list[i];
                top = this.windows[list[i]].top;
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
                        this.windows[seq].active = false;
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
            for (var i = 0; i < this.windows.length; i++) {
                if (this.system_selected.indexOf(this.windows[i].system) == -1) {
                    this.windows[i].active = false;
                }
            }
        }
        
        this.computeOtherSize();

        for (var i = 0; i < this.n_windows; i++) {
            this.windows[i].color = this.getColor(i);
        }

    },

    active: function (id) {
        if (this.windows[id].top <= this.top && tagDisplay[this.windows[id].tag] == 1 && this.windows[id].window != "other") {
            this.windows[id].active = true;
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

    /*init all views
     *
     * */
    init: function () {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].init();
        }
        this.displayTop();

        var count = 0;
        for (var i = 0; i < this.windows.length; i++) {
            if (this.windows[i].active) count++
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

        var html_container = document.getElementById('top_slider');
        if (html_container != null) {
            html_container.value = top;
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
                if (this.windows[i].active == true) {
                    for (var k = 0; k < this.clones[i].cluster.length; k++) {
                        if (this.clones[i].cluster[k] != this.n_windows - 1)
                            other[j] -= this.windows[this.clones[i].cluster[k]].size[j];
                    }
                }
            }
        }

        this.windows[this.n_windows - 1].size = other;

    },

    /* return info about a sequence/clone in html 
     *
     * */
    getCloneHtmlInfo: function (id, type) {

        if (this.clones[id].cluster.length <= 1) type = "sequence"
        var time_length = this.samples.order.length
        var html = ""

        //clone/sequence label
        if (type == "clone") {
            html = "<h2>Clone info : " + this.getName(id) + "</h2>"
        } else {
            html = "<h2>Sequence info : " + this.getSequenceName(id) + "</h2>"
        }
        
        //column
        html += "<div id='info_window'><table><tr><th></th>"

        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getStrTime(this.samples.order[i], "name") + "</td>"
        }
        html += "</tr>"

        //clone info
        if (type == "clone") {
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> clone information </td></tr>"
            html += "<tr><td> clone name </td><td colspan='" + time_length + "'>" + this.getName(id) + "</td></tr>"
            html += "<tr><td> clone size (n-reads (total reads) )</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getReads(id, this.samples.order[i]) + "  (" + this.reads_segmented[this.samples.order[i]] + ")</td>"
            }
            html += "</tr><tr><td> clone size (%)</td>"
            for (var i = 0; i < time_length; i++) {
            html += "<td>" + (this.getSize(id, this.samples.order[i]) * 100).toFixed(3) + " % </td>"
            }
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> clone's main sequence information</td></tr>"
        }else{
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> sequence information</td></tr>"
        }

        
        //sequence info (or clone main sequence info)
        html += "<tr><td> sequence name </td><td colspan='" + time_length + "'>" + this.getSequenceName(id) + "</td></tr>"
        html += "<tr><td> code </td><td colspan='" + time_length + "'>" + this.getCode(id) + "</td></tr>"
        html += "<tr><td> size (n-reads (total reads) )</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getSequenceReads(id, this.samples.order[i]) + 
                    "  (" + this.reads_segmented[this.samples.order[i]] + ")</td>"
        }
        html += "</tr>"
        html += "<tr><td> size (%)</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + (this.getSequenceSize(id, this.samples.order[i]) * 100)
                .toFixed(3) + " % </td>"
        }
        html += "</tr>"

        
        //segmentation info
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> segmentation information</td></tr>"
        html += "<tr><td> segmented </td><td colspan='" + time_length + "'>" + this.getStatus(id) + "</td></tr>"
        
        if (typeof this.windows[id].seg_stat != 'undefined'){
            var total_stat = [];
            for (var i=0; i<this.windows[id].seg_stat.length; i++) total_stat[i] = 0
            for (var i=0; i<this.windows[id].seg_stat.length; i++){
                for (var key in this.windows[id].seg_stat[i]) total_stat[i] +=  this.windows[id].seg_stat[i][key]
            }
            
            for (var key in this.windows[id].seg_stat[0]){
                html += "<tr><td> "+this.segmented_mesg[key]+"</td>"
                for (var i = 0; i < time_length; i++) {
                html += "<td>"+this.windows[id].seg_stat[i][key] 
                        + " (" + ((this.windows[id].seg_stat[i][key]/total_stat[i]) * 100).toFixed(1) + " %)</td>"
                }
            }
        }
        
        html += "<tr><td> sequence </td><td colspan='" + time_length + "'>" + this.windows[id].sequence + "</td></tr>"
        html += "<tr><td> window </td><td colspan='" + time_length + "'>" + this.windows[id].window + "</td></tr>"
        html += "<tr><td> V </td><td colspan='" + time_length + "'>" + this.windows[id].V + "</td></tr>"
        html += "<tr><td> D </td><td colspan='" + time_length + "'>" + this.windows[id].D + "</td></tr>"
        html += "<tr><td> J </td><td colspan='" + time_length + "'>" + this.windows[id].J + "</td></tr>"
        
        
        //other info (clntab)
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> other information</td></tr>"
        for (var key in this.windows[id]) {
            if (key[0] == "_") {
                html += "<tr><td>" + key + "</td>"
                if (this.windows[id][key] instanceof Array) {
                    for (var i = 0; i < time_length; i++) {
                        html += "<td>" + this.windows[id][key][this.samples.order[i]] + "</td>"
                    }
                } else {
                    html += "<td>" + this.windows[id][key] + "</td>"
                }
                html += "</tr>"
            }
        }
        html += "</table></div>"
        return html
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
        for (var i = 0; i < this.windows.length - 1; i++) {

            //detect key value
            var key = "undefined"

            if (this.windows[i][data_name]) {
                if (this.windows[i][data_name] instanceof Array) {
                    for (var j = this.windows[i][data_name].length; j >= 0; j--) {
                        if (this.windows[i][data_name][j] != 0)
                            key = this.windows[i][data_name][j]
                    }
                } else {
                    if (this.windows[i][data_name] != 0)
                        key = this.windows[i][data_name]
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
            popupMsg(msg.browser_error)
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
    
        
    flash: function (str){
        
        var div = jQuery('<div/>', {
            text: str,
            style: 'display : none',
            class: 'flash'
        }).appendTo('#flash_mes')
        .slideDown(200);
        
        setTimeout(function(){
            div.fadeOut('slow', function() { div.remove();});
        }, 5000);
        
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


function popupMsg(msg) {
    document.getElementById("popup-msg")
        .innerHTML = "";
    document.getElementById("popup-container")
        .style.display = "block";
    document.getElementById("popup-msg")
        .innerHTML += msg;
}

function closePopupMsg() {
    document.getElementById("popup-container")
        .style.display = "none";
    document.getElementById("popup-msg")
        .innerHTML = "";
}

function dataBox(msg) {
    document.getElementById("data-container")
        .style.display = "block";
    document.getElementById("data-msg")
        .innerHTML = msg;
}

function closeDataBox() {
    document.getElementById("data-container")
        .style.display = "none";
    document.getElementById("data-msg")
        .innerHTML = "";
}

function return_URL_CGI() {
    if (typeof config != "undefined") return config.cgi_address;
    else return "No_CGI_found";
}

var msg = {
    "align_error": "Error &ndash; connection to align server ("+return_URL_CGI()+") failed" + "</br> Please check your internet connection and retry." + "</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",

    "file_error": "Error &ndash; incorrect data file" + "</br> Please check you use a .data file generated by Vidjil." + "</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",

    "json_not_found":"Error &ndash; editDistanceFile.json not found" + "</br> Please to check the specified repository in the c++ program, or to run Vidjil program with the specified datas." + "</br></br> <div class='center'><button onclick='closePopupMsg()'>ok</button></div>",

    "version_error": "Error &ndash; data file too old (version " + VIDJIL_JSON_VERSION + " required)" + "</br> This data file was generated by a too old version of Vidjil. " + "</br> Please regenerate a newer data file. " + "</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",

    "welcome": " <h2>Vidjil <span class='logo'>(beta)</span></h2>" + "(c) 2011-2014, the Vidjil team" + "<br />Marc Duez, Mathieu Giraud and Mikaël Salson" + " &ndash; <a href='http://www.vidjil.org'>http://www.vidjil.org/</a>" + "</br>" + "</br>Vidjil is developed by the <a href='http://www.lifl.fr/bonsai'>Bonsai bioinformatics team</a> (LIFL, CNRS, U. Lille 1, Inria Lille), in collaboration with the <a href='http://biologiepathologie.chru-lille.fr/organisation-fbp/91210.html'>department of Hematology</a> of CHRU Lille" 
    + " the <a href='http://www.ircl.org/plate-forme-genomique.html'>Functional and Structural Genomic Platform</a> (U. Lille 2, IFR-114, IRCL)" + " and the <a href='http://www.euroclonality.org/'>EuroClonality-NGS</a> working group." + "</br>" + "</br>This is a beta version, please use it only for test purposes." + " " + "Please cite <a href='http://www.biomedcentral.com/1471-2164/15/409'>BMC Genomics 2014, 15:409</a> if you use Vidjil for your research." +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>start</button></div>",

    "browser_error": "The web browser you are using has not been tested with Vidjil." + "</br>Note in particular that Vidjil is <b>not compatible</b> with Internet Explorer 9.0 or below." +"</br>For a better experience, we recommend to install one of those browsers : " + "</br> <a href='http://www.mozilla.org/'> Firefox </a> " + "</br> <a href='www.google.com/chrome/'> Chrome </a> " + "</br> <a href='http://www.chromium.org/getting-involved/download-chromium'> Chromium </a> " + "</br></br> <div class='center' > <button onclick='popupMsg(msg.welcome)'>I want to try anyway</button></div>",
}


var rootTab = []

function root(n) {
    var startTime = new Date()
        .getTime();
    var elapsedTime = 0;
    
    for (var i=0; i<n; i++){
        var dx = 5
        var dy = 5+1
        
        rootTab[i] = Math.sqrt( dx*dx + dy*dy )
    }
    
    elapsedTime = new Date()
        .getTime() - startTime;
    myConsole.log("root("+n+") : " + elapsedTime);
}

function root2(n) {
    var startTime = new Date()
        .getTime();
    var elapsedTime = 0;
    
    for (var i=0; i<n; i++){
        var dx = Math.abs(5)
        var dy = Math.abs(5+1)
        
        var min = Math.min(dx,dy)

        rootTab[i] =  dx + dy - (min >> 1) - (min >> 2) + (min >> 4)
    }
    
    elapsedTime = new Date()
        .getTime() - startTime;
    myConsole.log("root2("+n+") : " + elapsedTime);
}


