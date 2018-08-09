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


/**
 * scatterplot is a View object who display node as bubble or bar according to 2 selected axis
 * 
 * @constructor 
 * @augments View
 * @this View
 * 
 * @param {string} id - dom id of the html div who will contain the scatterplot
 * @param {Model} model
 * */
function ScatterPlot(id, model, database, default_preset) {
    var self = this;
    
    View.call(this, model);
    this.db = database;
    
    this.id = id; //ID of the scatterPlot div

    //size ( computed value -> resize() function)
    this.resizeCoef = 1; //Multiplifying factor, application to nodes radius
    this.resizeMinSize = 0.001; // Any clone with a non-null size is displayed as clones of this size
    this.resizeW = 1; //scatterplot width
    this.resizeH = 1; //scatterplot height
    this.gridSizeW = 1; //grid width
    this.gridSizeH = 1; //grid height

    //Margins (css style : top/right/bottom/left)
    this.default_margin = [45,10,15,90];
    this.graph_margin = [25,25,25,25];
    this.margin = this.default_margin;

    this.max_precision = 9; //Precision max (default: 9)

    /* EDIT DISTANCE ONLY
       BEG --
    */
    this.mouseZoom = 1; //Zoom (scroll wheel)
    this['continue'] = false; //Boolean used for the nodes movements
    this.allEdges = []; //Initial edges array
    this.edgeSaved = []; //Edges array saved for the Edit Distance visualization
    this.edge = []; //Edges array given to the engine
    this.edgeContainer = null; //SVG element to save the container of graph distribution
    this.active_move = false; //Boolean given to the nodes movements
    this.reloadCharge = true; //Boolean allowing to reload the physic engine charge (reject)
    this.canSavePositions = true; //Boolean which allows to save initial positions of nodes
    //Object which allows to save new position, and move all nodes according to the object's parameters
    this.positionToMove = {
        originx: 0,
        originy: 0,
        x: 0,
        y: 0
    };
    this.distanceMax = 10; //Distance max to display (Edit Distance visualization)
    /*
       END --
    */

    this.dbscanActive = false; //Boolean to know if the DSCAN visualization is on
    this.DBSCANLength = 5; //Length of the DBSCAN edges

    this.CLONE_MIN_SIZE = 0.001

    this.AXIS_GENE_V = "v"
    this.AXIS_GENE_J = "j"
    this.AXIS_ALLELE_V = "allele_v"
    this.AXIS_ALLELE_J = "allele_j"
    
    this.MODE_GRID = "grid"
    this.MODE_BAR = "bar"

    this.mode = this.MODE_GRID;
    this.splitY = this.AXIS_GENE_J; //Distribution method, for the Y axis
    this.splitX = this.AXIS_GENE_V; //Distribution method, for the X axis

    this.time0 = Date.now(); //Initial date saved
    this.time1 = this.time0; //Frames computed
    this.fpsqueue = []; //Numbers of frames computed, according to the 20th last values

    //Boolean for the nodes selector
    this.active_selector = false

    //axis X text position
    this.rotation_x = 0;
    this.text_position_x = 30;
    this.sub_text_position_x = 45;

    //axis Y text position
    this.rotation_y = 0;
    this.text_position_y = 60;
    this.sub_text_position_y = 100;

    // is 'otherSize' selected ?
    this.otherVisibility = false

    //Clone selected
    this.cloneSelected = -1;

    //mouse coordinates
    this.coordinates = [0, 0];

    // Plot axis
    var axes = new Axes(this.m);
    this.available_axis = axes.available();

    // Plot Presets
    this.preset = {
        "V/J (genes)" : { "mode": this.MODE_GRID, "x" : this.AXIS_GENE_V, "y": this.AXIS_GENE_J},
        "V/J (alleles)" : { "mode": this.MODE_GRID, "x" : this.AXIS_ALLELE_V, "y": this.AXIS_ALLELE_J},
        "V/N length" : { "mode": this.MODE_GRID, "x" : this.AXIS_GENE_V, "y": "nLength"},
        "clone average read length / locus" : { "mode": this.MODE_GRID, "x": "averageLength", "y" : "locus"},
        // "V/abundance" : { "mode": this.MODE_GRID, "x" : this.AXIS_GENE_V, "y": "size"},
        "clone average read length distribution" : { "mode": this.MODE_BAR, "x" : "averageLength", "y": "size"},
        "V distribution" :            { "mode": this.MODE_BAR, "x" : this.AXIS_GENE_V, "y": "size"},
        "N length distribution" :     { "mode": this.MODE_BAR, "x" : "nLength",  "y": this.AXIS_GENE_V},
        "CDR3 length distribution" : { "mode": this.MODE_BAR, "x": "lengthCDR3", "y" : "size"},
        "J distribution" :            { "mode": this.MODE_BAR, "x" : this.AXIS_GENE_J,         "y": "size"},
        "compare two samples" : { "mode": this.MODE_GRID, "x" : "size", "y": "sizeOtherSample"},
        "plot by similarity" : { "mode": this.MODE_GRID, "x" : "tsneX", "y": "tsneY"},
        "plot by similarity and by locus" : { "mode": this.MODE_GRID, "x" : "tsneX_system", "y": "tsneY_system"},
        "clone average read length / GC content " : { "mode": this.MODE_GRID, "x": "averageLength", "y" : "GCContent"},
        "clone consensus coverage / GC content " : { "mode": this.MODE_GRID, "x": "coverage", "y" : "GCContent"},
        "number of samples sharing each clone" : { "mode": this.MODE_GRID, "x": "nbSamples", "y" : "locus"},
        // "interpolated length between BIOMED2 primers (inclusive)" : { "mode": this.MODE_BAR, "x": "primers", "y" : "size"},
        "number of deletions for the segment V/5 in 3" : { "mode": this.MODE_BAR, "x": "vDel", "y" : "size"},
        "number of deletions for the segment J/3 in 5" : { "mode": this.MODE_BAR, "x": "jDel",  "y" : "size"},
    };

    this.default_preset = (typeof default_preset == "undefined") ? 1 : default_preset ;

    //Menu with graph distrib' (see initMenu function)
    this.graph_menu = [
        ["dbscan", "Dbscan graph"],
        ["graph", "Edit dist. graph"]
    ];

    this.axisX = new GermlineAxis(this.m, false)
    this.axisY = new GermlineAxis(this.m, true)
    this.axisX.init(this.m.germlineV, "V")
    this.axisY.init(this.m.germlineJ, "J")
    this.use_system_grid = false

    if (typeof this.m.sp == "undefined")
        this.m.sp = this
}



ScatterPlot.prototype = {

    /**
     * init the view before use <br>
     * build grid / pre-select axis
     * */
    init: function() {
        console.log("ScatterPlot " + this.id + ": init()");
        try {

            document.getElementById(this.id)
                .removeAllChildren();

            this.initMenu();
            this.initSVG();

            this.setPreset(this.default_preset)
            this.tsne_ready=false;

        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /**
     * build all the svg container who will receive axis / labels / clones
     * */
    initSVG: function() {
        var self = this;

        this.label_container = d3.select("#" + this.id)
            .attr("class", "scatterplot")
            .append("div")
            .attr("id", this.id + "_label_container")

        //création de la fenetre SVG
        this.vis = d3.select("#" + this.id)
            .append("svg:svg")
            .attr("id", this.id + "_svg");

        //création de l'arriere plan
        d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("id", this.id + "_back")
            .attr("class", "background_sp")
            .attr("x", 0)
            .attr("y", 0)
            //Actions sur l'arrière-plan
            .on("mouseover", function() {
                self.m.focusOut();
                self.m.removeFocusEdge();
            })
            .on("mousedown", function() {
                self.activeSelector();
            })

        //Actions sur le corps -|- aux sélections
        $("body").bind("mouseup", function(e) {
            d3.event = e;
            self.stopSelector()
        })
        $("body").bind("mousemove", function(e) {
            d3.event = e;
            self.updateSelector()
        })

        //add a container for x axis in the scatterplot svg
        this.axis_x_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_x_container")

        //add a container for y axis in the scatterplot svg
        this.axis_y_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_y_container")

        //add a container for plots/bar in the scatterplot svg
        this.plot_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_plot_container")
            
        //add a container for axis label in the scatterplot svg
        this.axis_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_container")


        $("#" + this.id + "_plot_container")
            .fadeTo(0, 0)
        setTimeout(function() {
            $("#" + self.id + "_plot_container")
                .fadeTo(300, 1)
        }, 2000);

        //Sélection du contenu de bar -> Ajout d'un attribut valant un id
        this.bar_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_bar_container")

        //Initialisation du sélecteur
        this.selector = d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("class", "sp_selector")
            .attr("id", this.id + "_selector")
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", 5)
            .attr("ry", 5)

        //Initialisation du groupe d'arêtes (pour le graphe de comparaison, au niveau de la distance d'édition)
        this.grpLinks = this.plot_container.append('svg:g')
            .attr('class', 'grpLinks');

        //Initialisation of nodes
        this.nodes = d3.range(this.m.clones.length)
            .map(Object);
        for (var i = 0; i < this.m.clones.length; i++) {
            this.nodes[i].id = i; //L'id d'un cercle vaut le nombre de i dans la boucle
            this.nodes[i].r1 = 0; // longueur du rayon1
            this.nodes[i].r2 = 0; // longueur du rayon2
            this.nodes[i].x = Math.random() * 500;
            this.nodes[i].old_x = [0, 0, 0, 0, 0]
            this.nodes[i].y = Math.random() * 250;
            this.nodes[i].old_y = [0, 0, 0, 0, 0]
        }

        //Initialisation of the D3JS physic engine
        this.force = d3.layout.force();
        this.initMotor();
        this.force
            .nodes(this.nodes) //Nodes array initialisation
            .on("tick", function(){self.tick()}); // on -> Listen updates compared to modified positions

        //Création d'un element SVG pour chaque nodes (this.node.[...])
        this.node = this.plot_container.selectAll("circle")
            .data(this.nodes) //Ajout de données pour les cercles
        this.node.enter()
            .append("svg:circle"); //Ajout d'un élément SVG (cercle) à un node
        this.node.exit()
            .remove() //On efface tous les cercles non pris en compte

        //Action concernant tous les nodes présents dans le ScatterPlot
        this.plot_container.selectAll("circle")
            .attr("stroke", "")
            .attr("id", function(d) {
                return self.id + "_circle" + d.id;
            })
            //Attribution de l'activité des cercles (inactif, sélectionné, demande d'info ou autre)
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_inactive";
                if (self.m.clone(p.id)
                    .isSelected()){
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus circle_select";
                    return "circle_select";
                }
                if (self.m.clone(p.id)
                    .isFocus()) return "circle_focus";
                return "circle";
            })
            //Appel de la fonction drag
            .call(this.force.drag)
            //Action -> Si la souris est pointée/fixée sur un cercle, alors on affiche l'information concernant ce cercle
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            //Action -> Si l'on clique sur un cercle, alors on le sélectionne
            .on("click", function(d) {
                self.clickNode(d.id);
            })

    },

    /**
     * Function which allows to return the number of active clones
     * @return {integer}
     * */
    returnActiveclones: function() {
        var activeclones = 0;
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.clone(i)
                .isActive()) activeclones += 1;
        }
        return activeclones;
    },

    /**
     * initialize the D3JS physic engine with default values - usefull with reinitMotor()
     * */
    initMotor: function() {
        this.force
            .gravity(0) //No gravity
            .theta(0) //Default value: 0.8
            .charge(0) //Default value: -1
            .friction(0.75) //Velocity
            .size([1, 1]);
    },

    /**
     * build scatterplot menu <br>
     * preset/axisX/axisY selector<br>
     * scatterplot/bargraph selector<br>
     * */
    initMenu: function() {
        var self = this;
        
        var divParent = document.getElementById(this.id)
        var anchor = document.createElement('div');
        anchor.className = "sp_menu_anchor";
        var menu = document.createElement('div');
        menu.className = "sp_menu";
        var content = document.createElement('div');
        content.className = "sp_menu_content";
        
        var div_x = document.createElement('div');
        div_x.className = "axis_select axis_select_x";

        var div_y = document.createElement('div');
        div_y.className = "axis_select axis_select_y";
        
        var div_preset = document.createElement('div');
        div_preset.className = "axis_select axis_select_preset";

        this.select_x = document.createElement('select');
        //Initialisation du menu déroulant
        this.select_x.setAttribute('name', 'select_x[]');
        this.select_x.onchange = function() {
            self.changeXaxis();
        }

        this.select_y = document.createElement('select');
        this.select_y.setAttribute('name', 'select_y[]');
        this.select_y.onchange = function() {
            self.changeYaxis();
        }
        
        //Ajout de chaque méthode de répartition dans les menus pour l'axe des X/Y
        var element;
        for (var key in this.available_axis) {
            if (typeof this.available_axis[key].hide == "undefined" || !this.available_axis[key].hide){
                element = document.createElement("option");
                element.setAttribute('value', key);
                var text = document.createTextNode(this.available_axis[key].label);
                element.appendChild(text);

                var element2 = element.cloneNode(true);

                this.select_x.appendChild(element);
                this.select_y.appendChild(element2);
            }
        }

        this.select_preset = document.createElement('select');
        this.select_preset.className = "axis_select_preset_select";
        //Initialisation du menu déroulant
        this.select_preset.setAttribute('name', 'select_preset[]');
        this.select_preset.onchange = function() {
            self.updatePreset();
        }
        
        element = document.createElement("option");
        element.setAttribute('value', "custom");
        element.appendChild(document.createTextNode("–"));
        this.select_preset.appendChild(element);

        var p = 0
        for (var i in this.preset) {
            element = document.createElement("option");
            element.setAttribute('value', i);
            element.appendChild(document.createTextNode('[' + (p < 10 ? p : '⇧' + (p-10)) + '] ' + i));
            this.select_preset.appendChild(element);
	    p += 1;
        }
        
        div_x.appendChild(document.createTextNode("x "));
        div_x.appendChild(this.select_x);
        div_y.appendChild(document.createTextNode("y "));
        div_y.appendChild(this.select_y);
        div_preset.appendChild(document.createTextNode("preset "));
        div_preset.appendChild(this.select_preset);

        
        
        /*Graph menu initialization*/
        /*
        var div_graph = document.createElement('div');
        div_graph.className = "axis_select axis_select_graph"

        var select_graph = document.createElement('select');
        select_graph.setAttribute('name', 'select_graph[]');
        select_graph.id = "select_graph"

        select_graph.onchange = function() {
            self.changeXaxis();
        }

        for (var i = 0; i < this.graph_menu.length; i++) {
            var element = document.createElement("option");
            element.setAttribute('value', this.graph_menu[i][0]);
            var text = document.createTextNode(this.graph_menu[i][1]);
            element.appendChild(text);

            select_graph.appendChild(element);

        }

        div_graph.appendChild(select_graph);
        
        */
        
        var span_icon_bar = document.createElement('div');
        span_icon_bar.className = "sp_menu_icon";
        span_icon_bar.id = this.id+"_bar";
        jQuery.get("images/bar.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_bar).empty().append(svg);
            }, 'xml');
        span_icon_bar.onclick = function(){
                self.updateMode(self.MODE_BAR);
            };
        
        span_icon_plot = document.createElement('div');
        span_icon_plot.className = "sp_menu_icon";
        span_icon_plot.id = this.id+"_plot";
        jQuery.get("images/plot.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_plot).empty().append(svg);
            }, 'xml');
        span_icon_plot.onclick = function(){
                self.updateMode(self.MODE_GRID);
            };
        
        var div_mode = document.createElement('div');
        div_mode.className = "sp_menu_mode";
        div_mode.appendChild(span_icon_bar);
        div_mode.appendChild(span_icon_plot);
        
        //Added all childs
        content.appendChild(div_preset);
        content.appendChild(div_mode);
        content.appendChild(div_x);
        content.appendChild(div_y);
        //menu.appendChild(div_graph);
        menu.appendChild(document.createTextNode("plot"));
        menu.appendChild(content)
        anchor.appendChild(menu);
        divParent.appendChild(anchor);
        
        if (this.mode==this.MODE_BAR) $("#"+this.id+"_bar").addClass("sp_selected_mode")
        if (this.mode==this.MODE_GRID) $("#"+this.id+"_plot").addClass("sp_selected_mode")
    },

    /**
     * init bar positions using current bubbles positions
     * */
    initBar: function() {
        self = this;

        //création d'un element SVG pour chaque nodes
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar.enter()
            .append("svg:rect");
        this.bar.exit()
            .remove()
        this.bar_container.selectAll("rect")
            .attr("id", function(d) {
                return self.id + "_bar" + d.id;
            })

            //use clone circle position to init the clone bar position
            .attr("width", function(d) { return d.r2*2 })
            .attr("x", function(d) { return d.x+self.margin[3]-(d.r2) })
            .attr("height", function(d) { return d.r2*2 })
            .attr("y", function(d) { return d.y+self.margin[0]-(d.r2) })
            .style("fill", function(d) {
                return (self.m.clone(d.id)
                    .getColor());
            })
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            .on("click", function(d) {
                self.m.select(d.id);
            })
    },

    /**
     * compute and update the position of all rectangles representing a clone using selected axis
     * */
    updateBar: function() {

        //split clones into bar (axisX)
        this.axisX.init(this.m.clones, this.available_axis[this.splitX].fct);

        this.axisX.computeBarTab(this)
        
        //sort each bar (axisY)
        
        this.axisY = new PercentAxis(this.m, true);
        this.axisY.MAX_NB_STEPS_IN_AXIS = 5;
        this.axisY.init(this.m.clones, this.available_axis[this.splitY].fct);
        this.sortBarTab(this.axisY.converter);

        //compute position for each clones
        this.computeBarTab();
        
    },
    
    /**
     * sort each bar of barplot using a distribution function <br>
     * param {function} fct - distribution function
     * */
    sortBarTab: function (fct) {
        // console.log('sort')
        // console.log(fct)
        if (typeof fct == "string"){
            var tmp = fct 
            fct = function(clone){
                return clone.get(tmp)
            }
        }

        var compare = function (a,b) {
            var va;
            try{
                va = fct(this.m.clone(a));
            }catch(e){
            }
            var vb;
            try{
                vb = fct(this.m.clone(b));
            }catch(e){}
            
            if (typeof va == "undefined") return (typeof vb == "undefined")  ? 0 :  -1;
            if (typeof vb == "undefined") return (typeof va == "undefined")  ? 0 :  1;
                    
            if (va.constructor === String) {
                if (vb.constructor === String) return va.localeCompare(vb);
                if (vb.constructor === Number ) return 1
            }
            
            if (va.constructor === Number) return (vb.constructor === Number ) ? (va-vb) : -1;
        }
        
        for (var i in this.barTab) {
            this.barTab[i].sort(compare);
        }
        
        return this;
    },

    includeBar: function(clone) {
        return ((!this.use_system_grid ||
                (this.use_system_grid && this.m.germlineV.system == clone.get('germline') )) &&
                clone.isActive() &&
                !clone.isVirtual());
    },
    
    /**
     * return the size of the biggest bar
     * @return {float} - size
     * */
    computeBarMax : function () {
        var bar_max = 0;
        for (var i in this.barTab) {
            var tmp = 0;
            for (var j in this.barTab[i]) {
                var clone = this.barTab[i][j]
                if (this.includeBar(clone)){
                    tmp += clone.getSize();
                }
            }
            if (tmp > bar_max) bar_max = tmp;
        }
        
        return bar_max;
    },
    
    /**
     * compute the position of each rectangles / labels and start the display
     * */
    computeBarTab : function () {
        var bar_max = nice_ceil(this.computeBarMax());
        var tab_length = Object.keys(this.barTab).length;
        var width = Math.min(0.08, 0.8 / tab_length);
        
        
        //reset (TODO improve default position )
        for (var n in this.nodes) {
            this.nodes[n].bar_y = 0.5;
            this.nodes[n].bar_x = 1;
            this.nodes[n].bar_h = 0;
            this.nodes[n].bar_w = 0;
        }
        
        k=1 ;
        for (var i in this.barTab) {
            var y_pos = 0
            var x_pos = this.axisX.pos_from_value(i).pos
            
            for (var j in this.barTab[i]){
                var clone = this.barTab[i][j]
                var cloneID = clone.index;
                if (this.includeBar(clone)){
                    height = clone.getSize()/bar_max;

                    // Minimal height (does not affect y_pos)
                    var height_for_display = this.heightClone(height)
                    var y_pos_for_display = y_pos + height_for_display ;

                    y_pos += height;

                    this.nodes[cloneID].bar_y = y_pos_for_display;
                    this.nodes[cloneID].bar_x = x_pos;
                    this.nodes[cloneID].bar_h = height_for_display;
                    this.nodes[cloneID].bar_w = width;
                }
            }
            k++;
        }
        this.axisY.reverse = true;
        this.axisY.computeLabels(0, bar_max);
        this.initGrid();
        this.drawBarTab(500);
        
        return this
    },

    /**
     * draw/move rectangles to their computed position
     * @param {integer} speed
     * */
    drawBarTab : function (speed) {
        var self = this;
        //redraw
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar_container.selectAll("rect")
            .transition()
            .duration(speed)
            .attr("id", function(d) {
                return self.id + "_bar" + d.id;
            })
            .attr("width", function(d) { return d.bar_w*self.gridSizeW })
            .attr("x", function(d) { return (d.bar_x - d.bar_w/2)*self.gridSizeW + self.margin[3] })
            .attr("height", function(d) { return d.bar_h*self.gridSizeH })
            .attr("y", function(d) { return (1-d.bar_y)*self.gridSizeH + self.margin[0] })
            .style("fill", function(d) { return (self.m.clone(d.id).getColor()) })
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_hidden";
                if (self.m.clone(p.id)
                    .isSelected()){
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus circle_select";
                    return "circle_select";
                }
                if (self.m.clone(p.id)
                    .isFocus()) return "circle_focus";
                return "circle";
            })
    },

    /**
     * transition between bar graph and scatterplot mode
     * */
    endBar: function() {
        var self = this;

        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            //use clone circle position to init the clone bar position
            .attr("width", function(d) { return d.r2*2 })
            .attr("x", function(d) { return d.x+self.margin[3]-(d.r2) })
            .attr("height", function(d) { return d.r2*2 })
            .attr("y", function(d) { return d.y+self.margin[0]-(d.r2) })
        this.node
            .attr("class", function(p) {
                return "circle_hidden";
            })

        this.axis_x_update(this.axisX.labels);
        this.axis_y_update(this.axisY.labels);

        setTimeout(function () {
            self.bar_container.selectAll("rect")
                .attr("class", function(p) {
                    return "circle_hidden";
            })
            self.update()
        },400)

        
    },

    /**
     * select a mode
     * @param {mode} new mode, this.MODE_*
     * */
    changeMode : function (mode) {
        this.changeSplitMethod(this.splitX, this.splitY, mode);
        this.cancelPreset()
    },

    updateMode : function (mode) {
        this.changeMode(mode);
        this.m.update();
    },

    /**
     * switch between available modes
     */
    switchMode: function () {
        this.changeMode(this.mode === this.MODE_GRID ? this.MODE_BAR : this.MODE_GRID)
    },
    
    /**
     * build a system labels descriptor
     * */
    buildSystemGrid: function() {
        this.systemGrid = {
            "label": []
        }
        var n = this.m.system_available.length
        var h = this.resizeH
        var w = this.resizeW * 0.2

        var system
        //compute hidden position for unactivated germline (to avoid firework effect)
        for (var sa in this.m.system_available) {
            system = this.m.system_available[sa]
            this.systemGrid[system] = {
                'x': 0.99,
                'y': 0.99
            }
        }

        //compute position for selected germline
        var i = 0;
        for (var key in this.m.system_available) {

            system = this.m.system_available[key]

            var enabled = false
            if (this.m.system_selected.indexOf(system) != -1) enabled = true

            var xpos = 0.8

            if (system != this.m.germlineV.system) {
                this.systemGrid.label.push({
                    "text": system,
                    "enabled": enabled,
                    "x": xpos + 0.01,
                    "y": ((i * 2) + 1) / (n * 2)
                })
            } else {
                this.systemGrid.label.push({
                    "text": system,
                    "enabled": enabled,
                    "x": xpos,
                    "y": ((i * 2) + 1) / (n * 2)
                })
            }
            this.systemGrid[system].x = 0.92
            this.systemGrid[system].y = ((i * 2) + 1) / (n * 2)
            i++
        }
    },

    /**
     * resize the scatterplot to the size of the div parent element or to a given size
     * @param {float} [div_width]
     * @param {float} [div_height]
     * */
    resize: function(div_width, div_height) {
        var print = true
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            div_height = div.offsetHeight
            div_width = div.offsetWidth
            print = false
        }
        this.compute_size(div_width, div_height, print)
            //Attributions
        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", div_width)
            .attr("height", div_height)
        d3.select("#" + this.id + "_back")
            .attr("width", div_width)
            .attr("height", div_height);

        //Initialisation de la grille puis mise-à-jour
        this.initGrid()
            .updateClones()
            .updateMenu()
            .initGrid();
        
        if (this.splitX == "tsneX_system" || this.splitX == "tsneX"){
            this.changeSplitMethod(this.splitX, this.splitY, this.mode)
        }
    },
    
    /**
     * @param {float} [div_width]
     * @param {float} [div_height]
     * @param {float} [print]
     * */
    compute_size: function(div_width, div_height, print) {
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            div_height = div.offsetHeight
            div_width = div.offsetWidth
        }
        //On prend la largeur de la div
        this.resizeW = div_width - this.margin[3] - this.margin[1];
        //On prend la hauteur de la div
        this.resizeH = div_height - this.margin[0] - this.margin[2];

        if (this.splitX == this.AXIS_ALLELE_V || this.splitX == this.AXIS_GENE_V || this.splitX == this.AXIS_ALLELE_J || this.splitX == this.AXIS_GENE_J || this.splitX == "tsneX_system" ||
            (this.mode == this.MODE_GRID & (this.splitY == this.AXIS_ALLELE_V || this.splitY == this.AXIS_GENE_V || this.splitY == this.AXIS_ALLELE_J || this.splitY == this.AXIS_GENE_J))) {
            this.use_system_grid = true;
            this.buildSystemGrid()
        } else {
            this.use_system_grid = false
            this.systemGrid = {}
        }

        if (!print && this.splitY != this.MODE_BAR && this.use_system_grid && this.m.system_available.length > 1) {
            this.gridSizeW = 0.8 * this.resizeW;
            this.gridSizeH = 1 * this.resizeH;
        } else {
            this.gridSizeW = 0.95 * this.resizeW;
            this.gridSizeH = this.resizeH;
        }

        this.resizeCoef = Math.sqrt(this.resizeW * this.resizeH);
        if (this.resizeCoef < 0.1 || (this.resizeW * this.resizeH) < 0) this.resizeCoef = 0.1;

        return this;
    },

    /**
     * compute the position of the 500 next frame but don't display them <br>
     * (used for export a scatterplot screenshot without waiting for the clones have found a balance)
     * */
    fastForward: function() {
        this.force.stop()
        for (var i = 0; i < 500; i++) this.computeFrame()
        this.drawFrame()
    },

    /**
     * one animation step<br>
     * compute next frame and draws
     * */
    tick: function() {
        var self = this

        this.computeFrame()
            .drawFrame()

        //Calcul d'une frame (image / seconde)
        this.time1 = Date.now();
        if (this.fpsqueue.length === 10) {
            $("#fps")
                .innerHTML = d3.mean(this.fpsqueue)
                .toFixed(3);
            this.fpsqueue = [];
        }
        this.fpsqueue.push(Math.round(1000 / (this.time1 - this.time0)));
        this.time0 = this.time1;

    },

    /**
     * compute next position of each clones <br>
     * resolve collision
     * */
    computeFrame: function() {
        var self = this;

        this.active_node = this.node.filter(function(d, i) {
            return d.r2 > 0.1;
        });

        //deplace le node vers son objectif
        this.node.each(this.move());
        //mise a jour des rayons( maj progressive )
        this.node.each(this.updateRadius());

        this.node.each(this.debugNaN())
        //résolution des collisions
        this.r_max = 0;
        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].r2 > this.r_max) this.r_max = this.nodes[i].r2;
        }

        var quad = d3.geom.quadtree(this.nodes)

        for (var j = 0; j < this.nodes.length; j++) {
            if (this.nodes[j].r1 > 0.1) {
                quad.visit(this.collide(this.nodes[j]));
            }
        }
        this.active_node.each(this.debugNaN())

        return this
    },

    /**
     * draw each clones
     * */
    drawFrame: function() {
        if (this.mode != this.MODE_BAR){
            this.active_node
                //attribution des nouvelles positions/tailles
                .attr("cx", function(d) {
                    return (d3.mean(d.old_x) + self.margin[3]);
                })
                .attr("cy", function(d) {
                    return (d3.mean(d.old_y) + self.margin[0]);
                })
                .attr("r", function(d) {
                    return (d.r2);
                })
                .attr("title", function(d) {
                    return (self.m.clone(d.id)
                        .getName());
                })
        }
    },

    /**
     * move current clone's positions closer to their expected positions
     * */
    move: function() {
        self = this;
        return function(d) {
            if (d.r2<0.4){ //teleport a nodes directly at his expected position
                d.old_x=[d.x2,d.x2,d.x2,d.x2,d.x2];
                d.x=d.x2+Math.random(); //add a small random to avoid multiple nodes to teleport at the exact same position
                d.old_y=[d.y2,d.y2,d.y2,d.y2,d.y2];
                d.y=d.y2+Math.random();
                return
            }
            d.old_x.push(d.x);
            d.old_x.shift();
            var delta, s;
            if (d.x != d.x2) {
                delta = d.x2 - d.x;
                s = ((d.r1 / self.resizeCoef))
                d.x += 0.015 * delta
            }
            d.old_y.push(d.y);
            d.old_y.shift();
            if (d.y != d.y2) {
                delta = d.y2 - d.y;
                s = ((d.r1 / self.resizeCoef))
                d.y += 0.015 * delta
            }
        }
    },


    /**
     * update current clone's radius closer to their expected radius
     * */
    updateRadius: function() {
        return function(d) {
            if (d.r1 != d.r2) {
                var delta = d.r1 - d.r2;
                d.r2 += 0.03 * delta;
                if (d.r2 < 0.01) d.r2 = 0;
            }
        }
    },

    /**
     * repair empty clone's position <br>
     * */
    debugNaN: function() {
        return function(d) {
            if (!isFinite(d.x)) {
                d.x = Math.random() * 500;
            }
            if (!isFinite(d.y)) {
                d.y = Math.random() * 500;
            }
        }
    },

    /**
     * resolve collision function
     * @param {node} node - d3js node for a clone
     * */
    collide: function(node) {
        
        var r = node.r2 + this.r_max + 2,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
            
        return function(quad, x1, y1, x2, y2) {
            var node2 = quad.point
            
            if (node2 && (node2 !== node) && node2.r1 !== 0) {
                var delta_x = node.x - node2.x,
                    delta_y = node.y - node2.y,
                    delta = Math.sqrt( (delta_x * delta_x) + (delta_y * delta_y) ),
                    r_sum = node.r2 + node2.r2 + 2;
                if (delta < r_sum) {
                    var s1 = node.s
                    var s2 = node2.s
                    var w = (s2 / (s1 + s2))
                    var l = (delta - r_sum) / delta * w;
                    node.x -= delta_x *= l;
                    node.y -= delta_y *= l;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
        
    },

    /**
     * update all elements (resize / clones positions / axis / menu / labels / system labels)
     * */
    update: function() {
        var self = this;
        try{
            var startTime = new Date()
                .getTime();
            var elapsedTime = 0;

            this.compute_size()
                .initGrid()
                .updateClones()
                .updateMenu();

            //Donne des informations quant au temps de MàJ des données
            elapsedTime = new Date()
                .getTime() - startTime;
            //console.log("update sp: " + elapsedTime + "ms");
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /**
     * update all clones (color / position / axis)
     * */
    updateClones: function() {
        if (this.mode == this.MODE_BAR) {
            this.computeBarTab();
        }
        
        for (var i = 0; i < this.nodes.length; i++) {
            this.updateClone(i);
        }
        this.force.start();
        this.updateElemStyle();

        if (this.m.germlineV.system != this.system) {
            this.system = this.m.germlineV.system
            this.changeSplitMethod(this.splitX, this.splitY, this.mode)
        }
        return this;
    },
    
    /**
     * update(size/style/position) a list of selected clones <br>
     * scatterlot can't update only one clone
     * @param {integer[]} list - array of clone index
     * */
    updateElem: function(list) {
        this.update();
    },

    /** 
     * return the actual radius (for MODE_GRID) or height (for MODE_BAR) of the clone
     * A clone without reads is not displayed
     * A clone with a small number of reads is displayed and has a minimal size
     * @param {float} size/height - clone ratio size, between 0.0 and 1.0
     * @return {float} size - clone display size
     * */
    radiusClone: function(size) {
        if (size === 0)
            return 0 ;
        return this.resizeCoef * Math.pow((size + this.resizeMinSize), (1 / 3)) / 25
    },
    heightClone: function(height) {
        if (height === 0)
            return 0 ;
        return Math.max(height, 0.01)
    },


    /**
     * Update the size of a single clone
     * @param {integer} cloneID - clone index
     * @param {float} size
     * */
    updateCloneSize: function(cloneID, size)
    {
        if (this.otherVisibility) {
            var otherSize = this.m.clone(cloneID).getSequenceSize(this.m.tOther)
            if (otherSize > size) size = otherSize
        }

        if ((size == Clone.prototype.NOT_QUANTIFIABLE_SIZE) ||
            (size > 0 && size < this.CLONE_MIN_SIZE))
            size = this.CLONE_MIN_SIZE

        this.nodes[cloneID].s = size
        this.nodes[cloneID].r1 = this.radiusClone(size)
    },

    /**
     * Update color/style/position of a single clone
     * @param {integer} cloneID - clone index 
     * */
    updateClone: function(cloneID) {

        // Clone size

        if (this.m.clone(cloneID)
            .isActive()) {

            var seqID, size;
            if (this.m.clone(cloneID)
                .split) {
                // Display merged sub-clones
                for (var i = 0; i < this.m.clusters[cloneID].length; i++) {
                    seqID = this.m.clusters[cloneID][i]
                    size = this.m.clone(seqID)
                        .getSequenceSize();

                    this.updateCloneSize(seqID, size)
                }
            } else {
                // Do not display merged sub-clones
                for (var j = 0; j < this.m.clusters[cloneID].length; j++) {
                    seqID = this.m.clusters[cloneID][j]
                    this.nodes[seqID].s = 0
                    this.nodes[seqID].r1 = 0
                }
                size=Math.min(1.5,this.m.clone(cloneID).getSize2())
                              
                if (this.m.clusters[cloneID].length === 0) size = this.m.clone(cloneID)
                    .getSequenceSize();

                this.updateCloneSize(cloneID, size)
            }

        } else {
            this.nodes[cloneID].r1 = 0
            this.nodes[cloneID].s = 0
        }

        // Clone position

        var clone = this.m.clone(cloneID);
        var sys = clone.get('germline');
        if (this.use_system_grid && this.m.system == "multi" && typeof sys != 'undefined' && sys != this.m.germlineV.system) {
            this.nodes[cloneID].x2 = this.systemGrid[sys].x * this.resizeW;
            this.nodes[cloneID].y2 = this.systemGrid[sys].y * this.resizeH;
        } else {
            this.nodes[cloneID].x2 = this.axisX.pos(clone).pos * this.gridSizeW
            this.nodes[cloneID].y2 = this.axisY.pos(clone).pos * this.gridSizeH
        }

    },

    /**
     * update(style only) a list of selected clones
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function() {
        var self = this;
        if (this.mode == this.MODE_BAR) {
            this.updateBar();
        } else {
            this.node
                .attr("class", function(p) {
                    if (!self.m.clone(p.id)
                        .isActive()) return "circle_hidden";
                    if (self.m.clone(p.id)
                        .isSelected()){
                        if (self.m.clone(p.id)
                            .isFocus()) return "circle_focus circle_select";
                        return "circle_select";
                    }
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus";
                    return "circle";
                })
                .style("fill", function(d) {
                    return (self.m.clone(d.id)
                        .getColor());
                })
        }
    },

    /**
     * set default axisX/Y
     * */
    initGrid: function() {
        self = this;

        this.axis_x_update(this.axisX.labels);
        this.axis_y_update(this.axisY.labels);
        this.system_label_update(this.systemGrid.label);

        return this;
    },

     
    /**
     * retrieve and apply selected splitMethod in the axisX menu selector
     * */
    changeXaxis: function() {
        var elem = this.select_x;
        this.changeSplitMethod(elem.value, this.splitY, this.mode);
        this.cancelPreset()
        this.m.update();
    },

    /**
     * retrieve and apply selected splitMethod in the axisY menu selector
     * */
    changeYaxis: function() {
        var elem = this.select_y;
        this.changeSplitMethod(this.splitX, elem.value, this.mode);
        this.cancelPreset()
        this.m.update();
    },
    
    /**
     * retrieve and apply selected preset in the preset menu selector
     * */
    changePreset: function(){
        var elem = this.select_preset;
        this.changeSplitMethod(this.preset[elem.value].x, this.preset[elem.value].y, this.preset[elem.value].mode);
    },

    updatePreset: function(){
        this.changePreset();
        this.m.update();
    },

    setPreset: function(preset){
        this.select_preset.selectedIndex = preset
        this.changePreset()
    },

    /**
     * deactivate preset selection
     */
    
    cancelPreset: function() {
        this.select_preset.selectedIndex = 0
    },
    
    /* Fonction permettant de mettre à jour de l'axe des X
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de X)
     * */
    axis_x_update: function(data) {

        var self = this;

        this.label_update();
        
        //detect label size
        var label_width = 0;
        var line = 0
        var sub_line = 0

        for (var i = 0; i < data.length; i++) {
            if (data[i].type == "line") {
                if (data[i].text.length > label_width) {
                    label_width = data[i].text.length;
                }
                line++
            } else {
                sub_line++
            }
        }

        label_width = (label_width * 8)
        var space = (this.gridSizeW / line) / label_width
            //var count=space

        var className = "sp_legend"
        if (space < 1.1) {
            this.rotation_x = 320;
            this.text_position_x = 40;
            this.sub_text_position_x = 80;
            className = "sp_rotated_legend";
        } else {
            this.rotation_x = 0;
            className = "sp_legend";
            this.text_position_x = 30;
            this.sub_text_position_x = 45;
        }

        //LEGENDE
        leg = this.axis_x_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg.on("click", function(d){
            self.m.unselectAllUnlessKey(d3.event)
            var listToSelect = [];
            var halfRangeColumn = 0.5;
            if (self.axisX.labels.length>1){
                var nb_start = 0
                if (self.axisX.labels[0].text == "?")
                    nb_start = 1
                halfRangeColumn = Math.abs((self.axisX.labels[nb_start+1].pos - self.axisX.labels[nb_start].pos)/2);
            }
            for (n=0; n<self.nodes.length; n++){
                if (Math.abs(self.axisX.pos(self.m.clone(n)).pos - d.pos) < halfRangeColumn){
                    if (self.nodes[n].r1>0){
                        console.log("splitX : " + (self.splitX == this.AXIS_GENE_V) + ", " + (self.splitX));
                        console.log("germline : " + (self.m.clones[n].germline == self.m.germlineV.system));
                        if (self.splitX == this.AXIS_ALLELE_V || self.splitX == this.AXIS_GENE_V || self.splitX == this.AXIS_ALLELE_J || self.splitX == this.AXIS_GENE_J || (self.mode == this.MODE_GRID & (self.splitY == this.AXIS_ALLELE_V || self.splitY == this.AXIS_GENE_V || self.splitY == this.AXIS_ALLELE_J || self.splitY == this.AXIS_GENE_J))){
                            if (self.m.clones[n].germline == self.m.germlineV.system)
                                listToSelect.push(self.nodes[n]);
                        }
                        else {
                            listToSelect.push(self.nodes[n]);
                        }
                    }
                }
            }
                self.m.multiSelect(listToSelect);
           })
            .attr("x", function(d) {
                return self.gridSizeW * d.pos + self.margin[3];
            })
            .attr("y", function(d) {
                if (d.type == "subline") return self.sub_text_position_x
                else return self.text_position_x
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", function(d) {
                return className;
                /*
                * TODO
                if ( d.type=="line" ){
                count++
                if (self.coordinates[0] > ((self.resizeW*d.pos+self.margin[3])-(label_width/4) ) &&
                self.coordinates[0] < ((self.resizeW*d.pos+self.margin[3])+(label_width/4) )
                ){
                return "sp_legend_focus";
                }
                if (count >= space){
                count=0
                return "sp_legend";
                }else{
                return "sp_hidden_legend";
                }
                }else{ return "sp_legend";}
                */
            })
            .attr("transform", function(d) {
                var y = self.text_position_x
                if (d.type == "subline") y = self.sub_text_position_x
                return "rotate(" + self.rotation_x + " " + (self.gridSizeW * d.pos + self.margin[3]) + " " + y + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitX == this.AXIS_GENE_V && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == this.AXIS_GENE_J && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //this.AXIS
        lines = this.axis_x_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.gridSizeW * d.pos + self.margin[3];
            })
            .attr("x2", function(d) {
                return self.gridSizeW * d.pos + self.margin[3];
            })
            .attr("y1", function(d) {
                return self.margin[0];
            })
            .attr("y2", function(d) {
                return self.resizeH + self.margin[0];
            })
            .style("stroke", function(d) {
                return null;
            })
            .attr("class", function(d) {
                if (d.type == "subline") {
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function(d) {
                if (self.m.colorMethod == "V" && self.splitX == this.AXIS_GENE_V && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == this.AXIS_GENE_J && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    /* Fonction permettant de mettre à jour de l'axe des Y
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de Y)
     * */
    axis_y_update: function(data) {

        self = this;

        this.label_update();
        
        //LEGENDE
        leg = this.axis_y_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg.on("click", function(d){
            if (self.mode !=this.MODE_BAR){
                // Multi-selection by clicking on a legend
                self.m.unselectAllUnlessKey(d3.event)
                var listToSelect = [];
                var halfRangeLine = 0.5;
                if (self.axisY.labels.length>1){
                    var nb_start = 0
                    if (self.axisY.labels[0].text == "?")
                        nb_start = 1
                    halfRangeLine = Math.abs((self.axisY.labels[nb_start+1].pos - self.axisY.labels[nb_start].pos)/2);
                }
                for (n=0; n<self.nodes.length; n++){
                        if (Math.abs(self.axisY.pos(self.m.clone(n)).pos - d.pos) < halfRangeLine){
                            if (self.nodes[n].r1>0){
                                if (self.splitX == this.AXIS_ALLELE_V || self.splitX == this.AXIS_GENE_V || self.splitX == this.AXIS_ALLELE_J || self.splitX == this.AXIS_GENE_J || (self.mode == this.MODE_GRID & (self.splitY == this.AXIS_ALLELE_V || self.splitY == this.AXIS_GENE_V || self.splitY == this.AXIS_ALLELE_J || self.splitY == this.AXIS_GENE_J))){
                                    if (self.m.clones[n].germline == self.m.germlineV.system)
                                        listToSelect.push(self.nodes[n]);
                                }
                                else
                                    listToSelect.push(self.nodes[n]);
                            }
                        }
                    }
                self.m.multiSelect(listToSelect);
                }
            })

            .attr("x", function(d) {
                if (d.type == "subline") return self.sub_text_position_y;
                else return self.text_position_y;
            })
            .attr("y", function(d) {
                return (self.resizeH * d.pos + self.margin[0]);
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", "sp_legend")
            .attr("transform", function(d) {
                var x = self.text_position_y
                if (d.type == "subline") x = self.sub_text_position_y
                return "rotate(" + self.rotation_y + " " + x + " " + (self.resizeH * d.pos + self.margin[0]) + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == this.AXIS_GENE_V && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == this.AXIS_GENE_J && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //this.AXIS
        lines = this.axis_y_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.margin[3];
            })
            .attr("x2", function(d) {
                return self.gridSizeW + self.margin[3];
            })
            .attr("y1", function(d) {
                return self.gridSizeH * d.pos + self.margin[0];
            })
            .attr("y2", function(d) {
                return self.gridSizeH * d.pos + self.margin[0];
            })
            .style("stroke", function(d) {
                return null;
            })
            .attr("class", function(d) {
                if (d.type == "subline") {
                    if (self.splitY != this.AXIS_ALLELE_J && self.splitY != this.AXIS_ALLELE_V && self.splitY != "allele_v_used") return "sp_subline_hidden";
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == this.AXIS_GENE_V && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == this.AXIS_GENE_J && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    label_update : function () {

        var data = [
            {x:(this.gridSizeW/2)+this.margin[3], y:12, text:this.available_axis[this.splitX].label, rotation:0 },
            {y:(this.gridSizeH/2)+this.margin[0],  x:12, text:this.available_axis[this.splitY].label, rotation:270}
        ]

        leg = this.axis_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove()
        leg.attr("x", function(d) {return d.x})
            .attr("y", function(d) {return d.y})
            .text(function(d) {return d.text})
            .attr("class", "sp_legend2")
            .attr("transform", function(d) {
                if (d.rotate !== 0) return "rotate(" + d.rotation + " " + d.x + " " + d.y + ")"
            })
    },

    /**
     * redraw labels for system (TRG/IGH/...)
     * @param {object} data - system label descriptor
     * */
    system_label_update: function(data) {
        self = this;

        if (typeof data == "undefined" || self.m.system_available.length <= 1) {
            this.label_container.style("display", "none");
        } else {
            this.label_container.style("display", "");
            //LEGENDE
            leg = this.label_container.selectAll(".sp_system_label")
                .data(data);
            leg.enter()
                .append("div");
            leg.exit()
                .remove();
            leg
                .style("left", function(d) {
                    return "" + (d.x * self.resizeW + self.margin[3]) + "px"
                })
                .style("top", function(d) {
                    return "" + (d.y * self.resizeH + self.margin[0]) + "px"
                })
                .html(function(d) {
                    return "<div class='sp_system'>" + self.m.systemBox(d.text)
                        .outerHTML + " " + d.text + "</div>"
                })
                .on("click", function(d) {
                    self.m.changeGermline(d.text, false) // How can we get the shiftKey here ?
                })
                .attr("class", function(d) {
                    if (d.enabled) return "sp_system_label"
                    return "sp_system_label inactive"
                })
        }
    },

    /**
     * compute both axis with a new splitmethod (list of splitmethod in this.available_axis) <br>
     * and a mode ( 'bar' or 'scatterplot' )
     * @param {string} splitX - splitMethod
     * @param {string} splitY - splitMethod
     * @param {string} mode
     * */
    changeSplitMethod: function(splitX, splitY, mode) {
        var self = this;

        if (mode == this.MODE_BAR && mode != this.mode) {
            this.endPlot();
            this.initBar();
        }

        var endbar = false;
        if (mode != this.MODE_BAR && this.mode == this.MODE_BAR) {
            endbar = true;
        }

        if (splitX == "tsneX" || splitX == "tsneX_system"){
            this.margin = this.graph_margin;
            if (!this.tsne_ready){
                console.log("plop")
                this.tsne_ready=true;
                this.m.similarity_builder.init(function(){self.changeSplitMethod(splitX, splitY, mode)});
                return 0;
            }
        }else{
            this.margin = this.default_margin;
        }

        this.splitX = splitX;
        this.splitY = splitY;
        this.mode = mode;
        this.compute_size();

        this.axisX = this.updateAxis(this.splitX, false);
        this.axisY = this.updateAxis(this.splitY, true);
        
        if (this.mode == this.MODE_BAR){
            this.updateBar();
        }
        
        if (endbar){
            this.endBar();
        }else{
            this.update();
        }

        oldOtherVisibility = this.otherVisibility
        this.otherVisibility = this.splitX == "sizeOtherSample" || this.splitY == "sizeOtherSample"
        if (this.otherVisibility != oldOtherVisibility)
            this.updateClones()

        if (typeof this.m.graph != "undefined") {
            this.m.graph.setOtherVisibility(this.otherVisibility)
        }

    },

    /**
     * compute one axis with a given splitMethod (list of splitmethod in this.available_axis)
     * @param {Axis} axis
     * @param {string} splitMethod
     * */
    updateAxis: function(splitMethod, is_Y) {
        if (typeof is_Y === "undefined") is_Y = false;
        var axis;
        var aa = this.available_axis[splitMethod] 
        if (aa == undefined) {
            console.log('Undefined axis: ' + splitMethod)
            return
        }

        axis = aa.axis;
        axis.reverse = is_Y;
        if (is_Y)
            axis.MAX_NB_STEPS_IN_AXIS = 6
        axis.init(this.m.clones, aa.fct, aa.labels, aa.sort, aa.min, aa.max, aa.log, aa.display_label);

        return axis;
    },

    /**
     * check and put the correct currently 
      axis for axisX/Y menu <br>
     * */
    updateMenu: function() {
        var select_x = 0;
        var select_y = 0
        var i=0;
        for (var key in this.available_axis) {
            if (typeof this.available_axis[key].hide !== "undefined" && this.available_axis[key].hide)
                continue;
            if (key == this.splitX) select_x = i
            if (key == this.splitY) select_y = i
            i++;
        }
        this.select_x.selectedIndex = select_x
        this.select_y.selectedIndex = select_y
        $(".sp_menu_icon").removeClass("sp_selected_mode");
        $("#"+this.id+"_"+this.mode).addClass("sp_selected_mode");

        return this;
    },

    /** 
     * transition between scatterplot and bar graph 
     * */
    endPlot: function() {
        var self = this;
        this.node
            .transition()
            .duration(500)
            .attr("class", function(p) {
                return "circle_hidden";
            })
    },

    /**
     * onmousedown event <br>
     * start drawing a selector at this position
     * */
    activeSelector: function() {
        this.activeSelectorAt(
            d3.mouse(d3.select("#" + this.id + "_svg")
                        .node())
        );
    },
    
    /**
     * start drawing a selector at this position
     * @param {integer[]} coord - the [x,y] coordinates at which start the selection
     * */
    activeSelectorAt: function(coord) {
        this.coordinates = coord;

        if (this.active_move) {

            //Initialisation of the movement
            this.positionToMove.x = this.coordinates[0];
            this.positionToMove.y = this.coordinates[1];
            this.positionToMove.originx = this.coordinates[0];
            this.positionToMove.originy = this.coordinates[1];

            //Simple modification to the CSS of the mouse
            document.body.style.cursor = "move";

        } else {

            //Initialisation du sélecteur
            this.selector
                .attr("originx", this.coordinates[0])
                .attr("originy", this.coordinates[1])
                .attr("x", this.coordinates[0])
                .attr("y", this.coordinates[1])
                .attr("width", 0)
                .attr("height", 0)
                .style("display", "");

        }

        this.active_selector = true;
    },


    /**
     * onmousemove event <br>
     * redraw the selector every time the mouse move till the click release
     * */
    updateSelector: function() {
        this.updateSelectorAt(
            d3.mouse(d3.select("#" + this.id + "_svg")
                    .node())
        );
    },
    
    
    /**
     * redraw the selector every time the mouse move till the click release
     * @param {integer[]} coord - the [x,y] coordinates at which update the selector
     * */
    updateSelectorAt: function(coord) {
        this.coordinates = coord;

        //Active selector -> activeSelector() function
        if (this.active_selector) {

            var width, height;
            /*Movement of all nodes, with mouse move*/
            if (this.active_move) {

                this.positionToMove.x = this.coordinates[0];
                this.positionToMove.y = this.coordinates[1];

                width = this.positionToMove.originx - this.positionToMove.x;
                height = this.positionToMove.originy - this.positionToMove.y;

                this.fixedAllClones(false);

                var movementWidth = -(Math.abs(0.5 * width / 100) * width);
                var movementHeight = -(Math.abs(0.5 * height / 100) * height);

                for (var i = 0; i < this.nodes.length; i++) {
                    this.nodes[i].x += movementWidth;
                    this.nodes[i].px += movementWidth;
                    this.nodes[i].y += movementHeight;
                    this.nodes[i].py += movementHeight;
                }

                if (this.dbscanActive) this.addNextPositionsToClones(movementWidth, movementHeight);

                this.positionToMove.originx += movementWidth;
                this.positionToMove.originy += movementHeight;

            }
            /*Nodes selection*/
            else {

                var x = this.selector.attr("originx");
                var y = this.selector.attr("originy");

                width = this.coordinates[0] - x;
                height = this.coordinates[1] - y;

                if (width > 5) {
                    this.selector.attr("width", width - 3)
                        .attr("x", x)
                } else
                if (width < -5) {
                    this.selector
                        .attr("width", -width)
                        .attr("x", this.coordinates[0] + 3)
                } else {
                    this.selector.attr("width", 0)
                        .attr("x", x)
                }

                if (height > 5) {
                    this.selector.attr("height", height - 3)
                        .attr("y", y)
                } else
                if (height < -5) {
                    this.selector
                        .attr("height", -height)
                        .attr("y", this.coordinates[1] + 3)
                } else {
                    this.selector.attr("height", 0)
                        .attr("y", y)
                }
            }
        }
    },




    /**
     * onmouserelease event<br>
     * detect and select all clones under the selector
     * @param {Event} e
     * */
    stopSelector: function(e) {
        if (this.active_selector) {
            this.stopSelectorAt(
                d3.mouse(d3.select("#" + this.id + "_svg")
                            .node())
            );
        }
    },

    /**
     * detect and select all clones under the selector
     * @param {integer[]} coord - the [x,y] coordinates at which stop the selector
     * */
    stopSelectorAt: function(coord) {

        this.coordinates = coord;
        
        if (this.active_move) {
            
            //Selector disabled
            this.cancelSelector();
            
            //Set the CSS of the mouse to "default"
            document.body.style.cursor = "default";
            
        }
        /*Selection*/
        else {
            var nodes_selected = []
            var x1 = parseInt(this.selector.attr("x"))
            var x2 = x1 + parseInt(this.selector.attr("width"))
            var y1 = parseInt(this.selector.attr("y"))
            var y2 = y1 + parseInt(this.selector.attr("height"))
            
            
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i]
                var clone = this.m.clone(i)
                var node_x, node_y;
                if (this.mode != this.MODE_BAR) {
                    node_x = node.x + this.margin[3]
                    node_y = node.y + this.margin[0]
                } else {
                    // bar_x and bar_y are both ratio values (between 0 and 1), need to multiply by the size of the grid
                    node_x = node.bar_x * this.gridSizeW + this.margin[3];
                    var mid_y = node.bar_y - node.bar_h / 2; // bar_x represents the middle of the rectangle, but not bar_y
                    // bar_y starts from bottom, so we need to substract the y value from the height of the grid
                    node_y = this.gridSizeH - mid_y * this.gridSizeH + this.margin[0];
                }
                
                if (clone.isActive() && (clone.getSize() || clone.getSequenceSize()) && node_x > x1 && node_x < x2 && node_y > y1 && node_y < y2)
                nodes_selected.push(i);
            }
            
            this.selector
            .style("display", "none")
            .attr("width", 0)
            .attr("height", 0)
            this.active_selector = false;
            
            this.m.unselectAllUnlessKey(d3.event)
            this.m.multiSelect(nodes_selected)
        }
        
    },









    /**
     * click event, select/unselect clones <br>
     * @param {integer} cloneID - clone index
     * */
    clickNode: function(cloneID) {
        this.m.unselectAllUnlessKey(d3.event)
        this.m.select(cloneID)
    },

    /**
     * cancel current select box
     * */
    cancelSelector: function() {
        this.selector
            .style("display", "none")
            .attr("width", 0)
            .attr("height", 0)
            //On met le sélecteur à false -> annulation
        this.active_selector = false;

        //Si sélection sur le document, on efface tout
        if (document.selection) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection()
                .removeAllRanges();
        }
    },
    

    shouldRefresh: function () {
        this.init();
        this.update();
        this.resize();
    }
}
ScatterPlot.prototype = $.extend(Object.create(View.prototype), ScatterPlot.prototype);
