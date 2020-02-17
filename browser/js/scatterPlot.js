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
    
    View.call(this, model, id);
    this.db = database;

    //size ( computed value -> resize() function)
    this.resizeCoef = 1; //Multiplifying factor, application to nodes radius
    this.resizeMinSize = 0.001; // Any clone with a non-null size is displayed as clones of this size
    this.resizeW = 1; //scatterplot width
    this.resizeH = 1; //scatterplot height
    this.gridSizeW = 1; //grid width
    this.gridSizeH = 1; //grid height

    //Margins (css style : top/right/bottom/left)
    this.default_margin = [70,10,15,100];
    this.graph_margin = [25,25,25,25];
    this.margin = this.default_margin;

    this.max_precision = 9; //Precision max (default: 9)

    /* EDIT DISTANCE ONLY
       BEG --
    */
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
    /*
       END --
    */

    this.CLONE_MIN_SIZE = 0.001

    this.mode = "grid";

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
    this.text_position_y = 50;
    this.sub_text_position_y = 90;

    // is 'otherSize' selected ?
    this.otherVisibility = false

    //Clone selected
    this.cloneSelected = -1;

    //mouse coordinates
    this.coordinates = [0, 0];

    // Plot axis
    var axes = new Axes(this.m);
    this.available_axis = Axis.prototype.available();

    // Plot Presets
    this.preset = {
        "V/J (genes)" :             { "x" : "V/5' gene",                "y": "J/3' gene"},
        "V/J (alleles)" :           { "x" : "V/5 allele",               "y": "J/3 allele"},
        "V/N length" :              { "x" : "V/5' gene",                "y": "N length"},
        "read length / locus" :     { "x" : "clone average read length","y": "locus"},
      //"V/abundance" :             { "x" : "V/5' gene", "y": "size"},
        "read length distribution" :{ "x" : "clone average read length"},
        "V distribution" :          { "x" : "V/5' gene"},
        "N length distribution" :   { "x" : "N length"},
        "CDR3 length distribution" :{ "x" : "CDR3 length (nt)"},
        "J distribution" :          { "x" : "J/3' gene"},
        "compare two samples" :     { "x" : "size",                     "y": "size (other sample)"},
      //"plot by similarity" :      { "x" : "tsneX",                    "y": "tsneY"},
      //"plot by similarity and by locus" :             { "x" : "tsneX_system", "y": "tsneY_system"},
        "clone average read length / GC content " :     { "x":"clone average read length",    "y" : "GC content"},
        "clone consensus coverage / GC content " :      { "x": "clone consensus length",      "y" : "GC content"},
        "number of samples sharing each clone" :        { "x": "nbSamples", "y" : "locus"},
      //"interpolated length between BIOMED2 primers (inclusive)" : { "x": "primers", "y" : "size"},
        "number of deletions for the segment V/5 in 3" :{ "x": "vDel"},
        "number of deletions for the segment J/3 in 5" :{ "x": "jDel"},
    };

    this.default_preset = (typeof default_preset == "undefined") ? 1 : default_preset ;

    //Menu with graph distrib' (see initMenu function)
    this.graph_menu = [
        ["dbscan", "Dbscan graph"],
        ["graph", "Edit dist. graph"]
    ];

    this.use_system_grid = false

    if (typeof this.m.sp == "undefined")
        this.m.sp = this

    this.axis2X = new Axis("V/5' gene")
    this.axis2Y = new Axis("J/3' gene")
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
            this.resize();

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
            this.nodes[i].old_x = [0,0,0,0,0,0,0,0,0,0]
            this.nodes[i].y = Math.random() * 250;
            this.nodes[i].old_y = [0,0,0,0,0,0,0,0,0,0]
        }
        this.active_nodes = [];

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
           
            .call(d3.drag()
                .on("start", function(d){return self.dragstarted(d)})
                .on("drag", function(d){return self.dragged(d)})
                .on("end", function(d){return self.dragended(d)}))            
                
            //Action -> Si la souris est pointée/fixée sur un cercle, alors on affiche l'information concernant ce cercle
            .on("mouseover", function(d) {
                if (!self.isDragging)
                    self.m.focusIn(d.id);
            })
            //Action -> Si l'on clique sur un cercle, alors on le sélectionne
            .on("click", function(d) {
                self.clickNode(d.id);
            });

    },

    dragstarted: function(d)
    { 
        this.isDragging = true;
    },
   
    dragged: function(d)
    {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    },
   
    dragended: function(d)
    {
        this.isDragging = false;
        if (!d3.event.active)
            this.simulation.alpha(0.9).alphaTarget(0.08).alphaDecay(0.0227).restart();
        d.fx = null;
        d.fy = null;
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
            var axisP = Axis.prototype.getAxisProperties(this.available_axis[key])
            if (typeof axisP.hide == "undefined" || !axisP.hide){
                element = document.createElement("option");
                element.setAttribute('value', axisP.name);
                var text = document.createTextNode( axisP.name);
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
                self.updateMode("grid");
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
        
        if (this.mode=="bar") $("#"+this.id+"_bar").addClass("sp_selected_mode")
        if (this.mode=="grid") $("#"+this.id+"_plot").addClass("sp_selected_mode")
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
                self.clickNode(d.id);
            })
    },

    /**
     * compute and update the position of all rectangles representing a clone using selected axis
     * */
    updateBar: function() {
        //sort each bar (axisY)
        this.axis2X
            .compute(Math.round(this.resizeW/40))
            .computeBar()
        var max = this.axis2X.barMax
        this.axis2Y = new Axis().load({
                                        name:       "size",
                                        scale:      {
                                                        mode:   "linear",
                                                        min:    0,
                                                        max:    max,
                                                        reverse: true,
                                                        display: "percent"
                                                    },
                                        fct:        function(clone) {
                                                        return clone.getSize()
                                                    },
                                        germline:   "multi"
                                    })
        this.axis2Y.compute(Math.round(this.resizeH/20))
    },

    includeBar: function(clone, log) {
        var system_grid = (!this.use_system_grid || (this.use_system_grid && this.m.germlineV.system == clone.get('germline') )) 
        var showVirtual;

        // Set if the clone should be show on is virtual/distrib status
        if (clone.isInScatterplot() && clone.axes != undefined){
            var axes = [this.splitX, this.splitY]
            showVirtual = clone.sameAxesAsScatter(this)
        } else if (!clone.isInScatterplot()) {
            showVirtual = false
        } else {
            showVirtual = true        
        }
        var include = (system_grid && (clone.isActive()|| clone.hasSizeDistrib()) && showVirtual)
        return include
    },
    
    /**
     * compute the position of each rectangles / labels and start the display
     * */
    computeBarTab : function () {        
        var bars = this.axis2X.getBar()

        for (var b in bars) {
            var bar = bars[b]
            var x_pos = this.axis2X.getValuePos(bar.value)

            for (var c in bar.clones){
                var cloneID = bar.clones[c].id
                var clone = this.m.clone(cloneID)
                var node = this.nodes[cloneID]

                if (this.includeBar(clone)){
                    var start = this.axis2Y.getValuePos(bar.clones[c].start)
                    var stop =  this.axis2Y.getValuePos(bar.clones[c].stop)
                    var height = Math.abs(start-stop)

                    // Minimal height (does not affect y_pos)
                    var y_pos = Math.max(start,stop)
                    var height_for_display = this.heightClone(height)
                    var y_pos_for_display = y_pos - height + height_for_display

                    node.old_bar_y = node.bar_y
                    node.old_bar_x = node.bar_x
                    node.old_bar_h = node.bar_h
                    node.old_bar_w = node.bar_w

                    node.bar_y = y_pos_for_display
                    node.bar_x = x_pos
                    node.bar_h = height_for_display
                    node.bar_w = bar.width
                }
            }
        }
        this.initGrid();
        this.drawBarTab(1000);
        
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
            .attr("id", function(d) {
                return self.id + "_bar" + d.id;
            })
            .attr("class", function(p) {
                var c = self.m.clone(p.id)

                if ((!d.terminate) &&
                    (!p.hasValidAxisPosition || p.use_system_grid || !c.isActive() || c.isFiltered) )
                    return "circle_hidden"
                if (c.isSelected() && c.isFocus())
                    return "circle_focus circle_select"
                if (c.isSelected())
                    return "circle_select"
                if (c.isFocus()) 
                    return "circle_focus"

                return "circle"
            })
            .attr("width", function(d) { 
                var bar_w = (d.requireInit) ? d.bar_w : d.old_bar_w
                var w = bar_w*self.gridSizeW
                if (isNaN(w)) return 1
                else return w
            })
            .attr("x", function(d) { 
                var bar_x = (d.requireInit) ? d.bar_x : d.old_bar_x
                var bar_w = (d.requireInit) ? d.bar_w : d.old_bar_w
                var x = (bar_x - bar_w/2)*self.gridSizeW + self.margin[3]
                if (isNaN(x)) return 1
                else return x
                
             })
            .attr("height", function(d) { 
                if (d.requireInit)
                    return 0

                var h = d.old_bar_h*self.gridSizeH 
                if (isNaN(h)) return 1
                else return h
            })
            .attr("y", function(d) { 
                if (d.requireInit)
                    return self.gridSizeH + self.margin[0]

                var y = (1-d.old_bar_y)*self.gridSizeH + self.margin[0]
                if (isNaN(y)) return 1
                else return y
            })
            .on("mouseover", function(d) {})
            .on("click", function(d) {})
            





            this.bar_container.selectAll("rect")
            .transition()
            .duration(speed)
            .attr("width", function(d) { 
                var bar_w = (d.terminate) ? d.old_bar_w : d.bar_w
                var w = bar_w*self.gridSizeW
                if (isNaN(w)) return 1
                else return w
            })
            .attr("x", function(d) { 
                var bar_w = (d.terminate) ? d.old_bar_w : d.bar_w
                var bar_x = (d.terminate) ? d.old_bar_x : d.bar_x
                var x = (bar_x - bar_w/2)*self.gridSizeW + self.margin[3]
                if (isNaN(x)) return 1
                else return x
            })
            .attr("height", function(d) { 
                var bar_h = (d.terminate) ? 0: d.bar_h
                var h = bar_h*self.gridSizeH 
                if (isNaN(h)) return 1
                else return h
            })
            .attr("y", function(d) { 
                if (d.terminate)
                    return self.gridSizeH + self.margin[0]

                var y = (1-d.bar_y)*self.gridSizeH + self.margin[0]
                if (isNaN(y)) return 1
                else return y
            })
            .style("fill", function(d) { 
                //return (self.m.clone(d.id).getColor()) 
                return self.axis2X.getColor(self.m.clone(d.id))   
            })

            setTimeout(function(){
                var that = self
                self.bar_container.selectAll("rect")
                .on("mouseover", function(d) {
                    that.m.focusIn(d.id)
                })
                .on("click", function(d) {
                    that.clickNode(d.id)
                })
            }, speed)
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

        this.axis_x_update();
        this.axis_y_update();

        setTimeout(function () {
            self.bar_container.selectAll("rect")
                .attr("class", function(p) {
                    return "circle_hidden";
            })
            self.smartUpdate()
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
        this.m.smartUpdate();
    },

    /**
     * switch between available modes
     */
    switchMode: function () {
        this.changeMode(this.mode === "grid" ? "bar" : "grid")
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

        this.smartUpdate();
        
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
        if (typeof div_height != 'undefined') {
            //recompute resizeW/H only if a custom div_Width/hieght is provided
            this.resizeW = div_width - this.margin[3] - this.margin[1];
            this.resizeH = div_height - this.margin[0] - this.margin[2];
        }

        if (this.axis2X && this.axis2X.germline != "multi" || this.axis2Y.germline != "multi"){
            this.use_system_grid = true;
            this.buildSystemGrid()
        } else {
            this.use_system_grid = false
            this.systemGrid = {}
        }

        if (!print && this.use_system_grid && this.m.system_available.length > 1) {
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
        this.simulation.stop()
        for (var i = 0; i < 200; i++) {
            this.computeFrame() 
            this.simulation.tick()
            this.drawFrame()
        }
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
     * resolve collision
     * */
    computeFrame: function() {
        //mise a jour des rayons( maj progressive )
        this.node.each(this.updateRadius());

        //find biggest node radius,will be used by collide() as max range for collision
        this.r_max = 0;
        for (var i = 0; i < this.active_nodes.length; i++) 
            if (this.active_nodes[i].r2 > this.r_max) 
                this.r_max = this.active_nodes[i].r2;

        //create a new quadtree with only active_nodes
        this.quad = d3.quadtree()    
            .x(function(d) {return d.x;})
            .y(function(d) {return d.y;})
            .addAll(this.active_nodes);

        //visit quadtree
        for (var j = 0; j < this.active_nodes.length; j++) 
            this.quad.visit(this.collide(this.active_nodes[j]));
        
        //debug invalid node positions
        this.node.each(this.debugNaN())
        return this
    },

    /**
     * draw each clones
     * */
    drawFrame: function(c) {
        var self = this;

        var visible_nodes = this.node.filter(function(d, i) {
            return d.r2 > 0;
        });

        if (this.mode != "bar"){
            visible_nodes 
                //attribution des nouvelles positions/tailles
                .attr("cx", function(d) {
                    d.old_x.push(d.x + self.margin[3]);
                    d.old_x.shift();
                    return d3.mean(d.old_x);
                })
                .attr("cy", function(d) {
                    d.old_y.push(d.y + self.margin[0]);
                    d.old_y.shift();
                    return d3.mean(d.old_y);
                })
                .attr("r", function(d) {
                    return (d.r2);
                })
                .attr("title", function(d) {
                    return (self.m.clone(d.id)
                        .getName());
                })
        }
        return this;
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
        
        var r = node.r2 + this.r_max,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
            
        return function(quad, x1, y1, x2, y2) {
            
            if (typeof (quad.data) != "undefined") {
                var node2 = quad.data;
                if (node2 != node){
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
            if (this.mode == "bar")
            this.updateBar();

            this.node = this.plot_container.selectAll("circle")
            .data(this.nodes);

            this.axis2X.reload()
                       .compute(Math.round(this.resizeW/40))
            this.axis2Y.reload()
                       .compute(Math.round(this.resizeH/25))
            this.compute_size()
                .initGrid()
                .updateClones()
                .updateMenu();    

            this.active_nodes = this.nodes.filter(function(d, i) {
                return d.r1 > 0;
            });
            if(typeof(this.simulation) != "undefined"){
                this.simulation.stop();
                this.simulation = null;
            }

            this.simulation = d3.forceSimulation()
                .nodes(this.nodes.filter(function(d){return d.hasValidAxisPosition}))
                    .force("forceX", d3.forceX()
                        .strength(0.1)
                        .x(function(d){return (d.x2) }))
                    .force("forceY", d3.forceY()
                        .strength(0.1)
                        .y(function(d){return d.y2 }))
                    .on("tick", function(){self.tick()})
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /**
     * update all clones (color / position / axis)
     * */
    updateClones: function() {    
        for (var i = 0; i < this.nodes.length; i++) {
            this.updateClone(i);
        }

        if (this.mode == "bar") {
            this.computeBarTab();
            return this
        }
        
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
        this.smartUpdate();
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
        var node = this.nodes[cloneID];

        if (this.otherVisibility) {
            var otherSize = this.m.clone(cloneID).getSequenceSize(this.m.tOther)
            if (otherSize > size) size = otherSize
        }

        if ( ((size == Clone.prototype.NOT_QUANTIFIABLE_SIZE) ||
              (size > 0 && size < this.CLONE_MIN_SIZE)) && !this.m.clone(cloneID).hasSizeDistrib() )
            size = this.CLONE_MIN_SIZE

        node.s = size
        node.r1 = this.radiusClone(size)
    },

    /**
     * Update color/style/position of a single clone
     * @param {integer} cloneID - clone index 
     * */
    updateClone: function(cloneID) {
        var clone = this.m.clone(cloneID)      
        var node = this.nodes[cloneID]

        if (this.m.clone(cloneID)
            .isActive()) {

            var seqID, size;
            if (clone.hasSizeDistrib()){
                var axes = [this.splitX, this.splitY]
                same_axes_as_scatter = clone.sameAxesAsScatter(this)
                if (same_axes_as_scatter){
                    time = this.m.getTime()
                    size = clone.getReads() / this.m.reads.segmented[time]
                } else {
                    size = 0
                }
                this.updateCloneSize(cloneID, size)
            } else if (clone.split) {
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
                size=Math.min(1.5,this.m.clone(cloneID).getSize(undefined, true))
                              
                if (this.m.clusters[cloneID].length === 0) size = this.m.clone(cloneID)
                    .getSequenceSize();

                this.updateCloneSize(cloneID, size)
            }

        } else {
            node.r1 = 0
            node.s = 0
        }

        // Clone position
        var sys = clone.get('germline');
        var xpos = this.axis2X.getPos(clone)
        var ypos = this.axis2Y.getPos(clone)

        node.requireInit = false
        if (!node.hasValidAxisPosition)
            node.requireInit = true
        
        node.terminate = false
        if (xpos  === undefined && node.hasValidAxisPosition) node.terminate = true
        if (ypos  === undefined && node.hasValidAxisPosition) node.terminate = true

        node.hasValidAxisPosition = true
        if (xpos  === undefined) node.hasValidAxisPosition = false
        if (ypos  === undefined) node.hasValidAxisPosition = false

        if (this.use_system_grid && this.m.system == "multi" && typeof sys != 'undefined' && sys != this.m.germlineV.system) {
            node.use_system_grid = true
            node.x2 = Math.random()*0.01 + this.systemGrid[sys].x * this.resizeW;
            node.y2 = Math.random()*0.01 + this.systemGrid[sys].y * this.resizeH;
        } else {
            node.use_system_grid = false
            node.x2 = Math.random()*0.01 + xpos  * this.gridSizeW
            node.y2 = Math.random()*0.01 + ypos * this.gridSizeH
        }

    },

    /**
     * update(style only) a list of selected clones
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function() {
        var self = this;
        if (this.mode == "bar") {
            this.drawBarTab(0);
        } else {
            this.node
                .attr("class", function(p) {
                    var c = self.m.clone(p.id)

                    if (!p.hasValidAxisPosition || !c.isActive() || c.isFiltered) 
                        return "circle_hidden";
                    if (c.isSelected() && c.isFocus())
                        return "circle_focus circle_select"
                    if (c.isSelected())
                        return "circle_select"
                    if (c.isFocus()) 
                        return "circle_focus"

                    return "circle"
                })
                .style("fill", function(d) {
                    return self.axis2X.getColor(self.m.clone(d.id))    
                    //return (self.m.clone(d.id).getColor());
                })
        }
    },

    /**
     * set default axisX/Y
     * */
    initGrid: function() {
        self = this;

        this.axis_x_update();
        this.axis_y_update();
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
        this.smartUpdate();
    },

    /**
     * retrieve and apply selected splitMethod in the axisY menu selector
     * */
    changeYaxis: function() {
        var elem = this.select_y;
        this.changeSplitMethod(this.splitX, elem.value, this.mode);
        this.cancelPreset()
        this.smartUpdate();
    },
    
    /**
     * retrieve and apply selected preset in the preset menu selector
     * */
    changePreset: function(){
        var elem = this.select_preset;
        this.changeSplitMethod(this.preset[elem.value].x, this.preset[elem.value].y);
        this.smartUpdate();
    },

    updatePreset: function(){
        this.changePreset();
        this.smartUpdate();
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
    axis_x_update: function() {
        var self = this;
        var data = Object.values(this.axis2X.labels);
        
        //detect label size
        var label_width = 0;
        var line = 0
        

        for (var i = 0; i < data.length; i++) {
            if (data[i].type != "subline"){
                var text = data[i].text
                if (text.length > label_width) {
                    label_width = text.length;
                }
                line++
            }
        }

        label_width = (label_width * 8)
        var space = (this.gridSizeW / line) / label_width

        var className = "sp_legend"
        if (space < 0.8) {
            this.rotation_x = 320;
            this.text_position_x = 55;
            this.sub_text_position_x = 70;
            className = "sp_rotated_legend";
        } else {
            this.rotation_x = 0;
            className = "sp_legend";
            this.text_position_x = 40;
            this.sub_text_position_x = 60;
        }


        //LEGENDE
        leg = this.axis_x_container.selectAll("text")
            .remove()
            .exit()   
            .data(data)
            .enter()
            .append("text")
            .on("click", function(d){
                self.m.unselectAllUnlessKey(d3.event)
                self.m.multiSelect(self.axis2X.getLabelInfo(d.id).clones)
            })
            .attr("x", function(d) {
                return self.gridSizeW * d.position + self.margin[3];
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
            })
            .attr("transform", function(d) {
                var y = self.text_position_x
                if (d.type == "subline") y = self.sub_text_position_x
                return "rotate(" + self.rotation_x + " " + (self.gridSizeW * d.position + self.margin[3]) + " " + y + ")"
            });

        //this.AXIS
        lines = this.axis_x_container.selectAll("line")
            .remove()
            .exit()
            .data(data)
            .enter()
            .append("line")
            .attr("x1", function(d) {
                return self.gridSizeW * d.position + self.margin[3];
            })
            .attr("x2", function(d) {
                return self.gridSizeW * d.position + self.margin[3];
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
            });
    },

    /* Fonction permettant de mettre à jour de l'axe des Y
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de Y)
     * */
    axis_y_update: function() {
        self = this;
        var data = Object.values(this.axis2Y.labels);

        //LEGENDE
        leg = this.axis_y_container.selectAll("text")
            .remove()
            .exit()
            .data(data)
            .enter()
            .append("text")
            .on("click", function(d){
                if (self.mode !="bar"){
                    self.m.unselectAllUnlessKey(d3.event)
                    self.m.multiSelect(self.axis2Y.getLabelInfo(d.id).clones);
                }
            })
            .attr("x", function(d) {
                if (d.type == "subline") return self.sub_text_position_y;
                else return self.text_position_y;
            })
            .attr("y", function(d) {
                return (self.resizeH * d.position + self.margin[0]);
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", "sp_legend")
            /*
            .attr("transform", function(d) {
                var x = self.text_position_y
                if (d.type == "subline") x = self.sub_text_position_y
                return "rotate(" + self.rotation_y + " " + x + " " + (self.resizeH * d.position + self.margin[0]) + ")"
            })
            */
            
        //this.AXIS
        lines = this.axis_y_container.selectAll("line")
            .remove()
            .exit()
            .data(data)
            .enter()
            .append("line")
            .attr("x1", function(d) {
                return self.margin[3];
            })
            .attr("x2", function(d) {
                return self.gridSizeW + self.margin[3];
            })
            .attr("y1", function(d) {
                return self.gridSizeH * d.position + self.margin[0];
            })
            .attr("y2", function(d) {
                return self.gridSizeH * d.position + self.margin[0];
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
                .remove()
                .exit()
                .data(data)
                .enter()
                .append("div")
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

        if (!mode && !splitY) mode = "bar"

        if (mode == "bar" && mode != this.mode) {
            this.mode = "bar"
            this.endPlot();
            this.initBar();
        }

        var endbar = false;
        if (mode != "bar" && this.mode == "bar") {
            this.mode = mode
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
        this.compute_size();

        if (this.splitX)
            this.axis2X = new Axis(this.splitX)
        if (this.splitY)
            this.axis2Y = new Axis(this.splitY)
        
        if (this.mode == "bar"){
            this.updateBar()
            return this
        }
        
        if (endbar){
            this.endBar();
        }else{
            this.smartUpdate();
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
     * check and put the correct currently 
      axis for axisX/Y menu <br>
     * */
    updateMenu: function() {
        var select_x = 0
        var select_y = 0
        var i=0
        
        for (var key in this.available_axis) {
            var axisName = this.available_axis[key]
            if (axisName == this.splitX) select_x = i
            if (axisName == this.splitY) select_y = i
            i++
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
                if (this.mode != "bar") {
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
        this.smartUpdate();
    }
}
ScatterPlot.prototype = $.extend(Object.create(View.prototype), ScatterPlot.prototype);
