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
    var self = this

    if(ScatterPlot.prototype.initSelector == undefined)
        Object.assign(ScatterPlot.prototype, ScatterPlot_selector.prototype)
    if(ScatterPlot.prototype.initMenu == undefined)
        Object.assign(ScatterPlot.prototype, ScatterPlot_menu.prototype)

    ScatterPlot_menu.call(this, default_preset)
    ScatterPlot_selector.call(this)
    View.call(this, model, id)
    this.db = database
    this.id = id

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

    this.CLONE_MIN_SIZE = 0.001

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

    // Plot axis
    this.available_axis = Axis.prototype.available();

    if (typeof this.m.sp == "undefined")
        this.m.sp = this

    this.axisX = new Axis("V/5' gene")
    this.axisY = new Axis("J/3' gene")
    this.mode = "grid"
    this.use_system_grid = false

    //flag used to count the number of transition (multiple transition can run at the same time)
    //increase every time a transition is started
    //decrease every time a transition is completed
    //0 means all started transition have been completed
    this.inProgress = 0
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

            this.initSVG();
            this.initBar();
            this.initMenu();
            this.initSelector();
            this.resize();
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
            .attr("class", "circle_hidden")     

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
            .attr("class", "circle_hidden")     
    },

    /**
     * compute and update the position of all rectangles representing a clone using selected axis
     * */
    updateBar: function() {
        if (!this.axisX.json) return

        this.use_system_grid = (this.axisX.germline != "multi")

        var cloneList = []
        for (var cloneID in this.m.clones){
            var clone = m.clone(cloneID)
            if (this.includeBar(clone)) cloneList.push(cloneID)
        }

        this.axisX
            .reload()
            .compute(Math.round(this.resizeW/40))
            .computeBar(cloneList)
        var max = this.axisX.barMax
        this.axisY = new Axis().load({
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
        this.axisY.compute(Math.round(this.resizeH/20))

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
        var bars = this.axisX.getBar()

        for (var b in bars) {
            var bar = bars[b]
            var x_pos = this.axisX.getValuePos(bar.value)

            for (var c in bar.clones){
                var cloneID = bar.clones[c].id
                var clone = this.m.clone(cloneID)
                var node = this.nodes[cloneID]

                if (this.includeBar(clone)){
                    var start = this.axisY.getValuePos(bar.clones[c].start)
                    var stop =  this.axisY.getValuePos(bar.clones[c].stop)
                    var height = Math.abs(start-stop)

                    // Minimal height (does not affect y_pos)
                    var y_pos = Math.max(start,stop)
                    var height_for_display = this.heightClone(height)
                    var y_pos_for_display = y_pos - height + height_for_display

                    node.old_bar_y = node.bar_y
                    node.old_bar_x = node.bar_x
                    node.old_bar_h = node.bar_h
                    node.old_bar_w = node.bar_w

                    node.bar_y = self.gridSizeH - (this.gridSizeH * y_pos_for_display)
                    node.bar_x = this.gridSizeW * x_pos
                    node.bar_h = this.gridSizeH * height_for_display
                    node.bar_w = this.gridSizeW * bar.width
                    node.includeBar = true
                }else{
                    node.includeBar = false
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

                if ((!p.terminate) &&
                    (!p.hasValidAxisPosition || p.use_system_grid || !c.isActive() || c.isFiltered || !p.includeBar) )
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
                var w = bar_w
                if (isNaN(w)) return 1
                else return w
            })
            .attr("x", function(d) { 
                var bar_x = (d.requireInit) ? d.bar_x : d.old_bar_x
                var bar_w = (d.requireInit) ? d.bar_w : d.old_bar_w
                var x = (bar_x - bar_w/2)+ self.margin[3]
                if (isNaN(x)) return 1
                else return x
                
             })
            .attr("height", function(d) { 
                if (d.requireInit)
                    return 0

                var h = d.old_bar_h
                if (isNaN(h)) return 1
                else return h
            })
            .attr("y", function(d) { 
                if (d.requireInit)
                    return self.gridSizeH + self.margin[0]

                var y = d.old_bar_y + self.margin[0]
                if (isNaN(y)) return 1
                else return y
            })
            
            var bar = this.bar_container.selectAll("rect")
            if (speed !== 0){
                bar = bar
                .transition()
                .duration(speed)
                .on("start", function(){self.inProgress++}) 
                .on("end", function(){self.inProgress--}) 
                .on("interrupt", function(){self.inProgress--}) 
                .on("cancel", function(){self.inProgress--}) 
            }
            bar
             .attr("width", function(d) { 
                var bar_w = (d.terminate) ? d.old_bar_w : d.bar_w
                var w = bar_w
                if (isNaN(w)) return 1
                else return w
            })
            .attr("x", function(d) { 
                var bar_w = (d.terminate) ? d.old_bar_w : d.bar_w
                var bar_x = (d.terminate) ? d.old_bar_x : d.bar_x
                var x = (bar_x - bar_w/2) + self.margin[3]
                if (isNaN(x)) return 1
                else return x
            })
            .attr("height", function(d) { 
                var bar_h = (d.terminate) ? 0: d.bar_h
                var h = bar_h
                if (isNaN(h)) return 1
                else return h
            })
            .attr("y", function(d) { 
                if (d.terminate)
                    return self.gridSizeH + self.margin[0]

                var y = d.bar_y + self.margin[0]
                if (isNaN(y)) return 1
                else return y
            })
            .style("fill", function(d) { 
                return (self.m.clone(d.id).getColor()) 
                //return self.axisX.getColor(self.m.clone(d.id))   
            })

    },

    /**
     * select a mode
     * @param {mode} new mode, this.MODE_*
     * */
    changeMode : function (mode) {
        this.changeSplitMethod(this.splitX, this.splitY, mode);
    },

    updateMode : function (mode) {
        this.changeMode(mode)
        this.smartUpdate()
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

        this.update()
        
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

        if (this.axisX && this.axisX.germline != "multi" || this.axisY.germline != "multi"){
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
                else if (d.r2 < 2) d.r2 = 2;
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
            this.node = this.plot_container.selectAll("circle")
                                           .data(this.nodes);

            if (this.mode == "bar"){
                this.updateBar()
            }else{
                this.axisX.reload()
                        .compute(Math.round(this.resizeW/40))
                this.axisY.reload()
                        .compute(Math.round(this.resizeH/25))
            }

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
                .nodes(this.nodes.filter(function(d){return (d.hasValidAxisPosition || d.use_system_grid)}))
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

    updateInProgress: function() {
        if (this.inProgress>0) return true
        return false
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
        var xpos = this.axisX.getPos(clone)
        var ypos = this.axisY.getPos(clone)

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
            this.bar_container.selectAll("rect")
                .attr("class", function(p) {
                    var c = self.m.clone(p.id)
                    
                    if (!p.hasValidAxisPosition || p.use_system_grid || !c.isActive() || c.isFiltered || !p.includeBar)
                        return "circle_hidden"
                    if (c.isSelected() && c.isFocus())
                        return "circle_focus circle_select"
                    if (c.isSelected())
                        return "circle_select"
                    if (c.isFocus()) 
                        return "circle_focus"

                    return "circle"
                })
                .style("fill", function(d) { 
                    return (self.m.clone(d.id).getColor()) 
                    //return self.axisX.getColor(self.m.clone(d.id))   
                })
        } else {
            this.node
                .attr("class", function(p) {
                    var c = self.m.clone(p.id)

                    if (!(p.hasValidAxisPosition || p.use_system_grid) || !c.isActive() || c.isFiltered) 
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
                    //return self.axisX.getColor(self.m.clone(d.id))    
                    return (self.m.clone(d.id).getColor());
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
        this.smartUpdate();
    },

    /**
     * retrieve and apply selected splitMethod in the axisY menu selector
     * */
    changeYaxis: function() {
        var elem = this.select_y;
        this.changeSplitMethod(this.splitX, elem.value, this.mode);
        this.smartUpdate();
    },
    
    /* Fonction permettant de mettre à jour de l'axe des X
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de X)
     * */
    axis_x_update: function() {
        var self = this
        var data = []
        if (Object.values)
            data = Object.values(this.axisX.labels)
        else{
            keys = Object.keys(this.axisX.labels)
            keys.forEach(function (k, i) {
                data.push(self.axisX.labels[k])
            })
        }
        
        //detect label size
        var label_width = 0;
        var line = 0

        this.label_update();

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
                self.m.multiSelect(self.axisX.getLabelInfo(d.id).clones)
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
        var self = this
        var data = []
        if (Object.values)
            data = Object.values(this.axisY.labels)
        else{
            keys = Object.keys(this.axisY.labels)
            keys.forEach(function (k, i) {
                data.push(self.axisY.labels[k])
            })
        }

        this.label_update();
        
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
                    self.m.multiSelect(self.axisY.getLabelInfo(d.id).clones);
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

    label_update : function () {

        var data = [
            {x:(this.gridSizeW/2)+this.margin[3], y:12, text:this.axisX.name, rotation:0 },
            {y:(this.gridSizeH/2)+this.margin[0], x:12, text:this.axisY.name, rotation:270}
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

        if (this.available_axis.indexOf(splitX) != -1)        
            this.splitX = splitX
        if (this.available_axis.indexOf(splitY) != -1)
            this.splitY = splitY
        this.compute_size()

        if (this.splitX)
            this.axisX = new Axis(this.splitX)
        if (this.splitY)
            this.axisY = new Axis(this.splitY)
        
        if (this.mode == "bar"){
            this.updateBar()
            return this
        } else {
            this.axisX.compute(Math.round(this.resizeW/40))
            this.axisY.compute(Math.round(this.resizeH/20))
        }
        
        if (endbar){
            this.endBar();
        }else{
            this.smartUpdate();
        }

        oldOtherVisibility = this.otherVisibility
        this.otherVisibility = this.splitX == "size (other sample)" || this.splitY == "size (other sample)" 
        if (this.otherVisibility != oldOtherVisibility)
            this.updateClones()

        if (typeof this.m.graph != "undefined") {
            this.m.graph.setOtherVisibility(this.otherVisibility)
        }

    },

    /** 
     * transition between scatterplot and bar graph 
     * */
    endPlot: function() {
        var self = this;
        setTimeout(function(){
            self.node
                .attr("class", function(p) {
                    return "circle_hidden";
                })
        }, 250)

        
        for (var c in this.nodes){
            var node = this.nodes[c]
            node.old_bar_y = node.y
            node.old_bar_x = node.x
            node.old_bar_h = node.r2*2
            node.old_bar_w = node.r2*2

            node.bar_y = node.y
            node.bar_x = node.x
            node.bar_h = node.r2*2
            node.bar_w = node.r2*2
        }
    },

        /**
     * transition between bar graph and scatterplot mode
     * */
    endBar: function() {
        var self = this;

        for (var c in this.nodes){
            var node = this.nodes[c]
            node.old_y.fill(node.bar_y+node.bar_h/2)
            node.old_x.fill(node.bar_x+node.bar_w/2)
            node.r1 = Math.min(node.bar_w/2, node.bar_h/2)

            node.y = node.bar_y+node.bar_h/2
            node.x = node.bar_x+node.bar_w/2
            node.r2 = Math.min(node.bar_w/2, node.bar_h/2)
        }

        this.bar_container.selectAll("rect")
            .transition()
            .duration(250)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
            .attr("height", function(d) { return 0 })

            setTimeout(function(){
                self.bar_container.selectAll("rect")
                    .attr("class", function(p) {
                        return "circle_hidden";
                    })
            }, 250)
    },

    shouldRefresh: function () {
        this.init();
        this.smartUpdate();
    }
}
ScatterPlot.prototype = $.extend(Object.create(View.prototype), ScatterPlot.prototype)

