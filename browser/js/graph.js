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
 * graph.js
 *
 * contains only graph function and graph element
 *
 * content:
 *
 * 
 * build_graph()
 *  build_menu()
 *  build_list()
 * resize()
 * 
 * clickGraph()
 * startDrag()
 * stopDrag()
 * stopDrag2()
 * dragTimePoint()
 * 
 * constructPath()
 * constructPathR()
 * constructStack()
 * 
 * init()
 *  initData()
 *  initClones()
 *  initRes()
 *  initAxis()
 *    initAbscisse()
 *    initOrdinateClones()
 *    initOrdinateData()
 *    initAbscisseT()
 * 
 * update()
 *  updateData()
 *  updateRes()
 *  updateClones()
 *    updateElem()
 *      updateElemStyle()
 * 
 * draw()
 *  drawAxis()
 *  drawData()
 *  drawClones()
 *  drawRes()
 */


/* constructor
 *
 * */
function Graph(id, model) {
    this.id = id;
    this.m = model;
    this.resizeW = 1; //coeff d'agrandissement/réduction largeur                
    this.resizeH = 1; //coeff d'agrandissement/réduction hauteur        
    
    this.display_limit2 = 50 //nombre max de clones pouvant etre affiché sur le graph
    this.display_limit = 10  //les clones du top 10 sont toujours affiché (même s'il y en a plus de 50)
     

    this.marge1 = 0.05; //marge droite bord du graph/premiere colonne
    this.marge2 = 0.05; //marge gauche derniere colonne/bord du graph
    this.marge3 = 70; //marge droite (non influencé par le resize)
    this.marge4 = 70; //marge gauche (non influencé par le resize)
    this.marge5 = 30; //marge top (non influencé par le resize)

    // maximum ratio between small and large time deltas for rescaling x axis
    // if set to 1.0, no rescaling
    this.max_ratio_between_deltas = 2.0;

    this.data_axis = [];
    this.mobil = {};

    this.drag_on = false;
    this.dragged_time_point = 0;
    
    this.text_position_y = 15;
    this.text_position_x = 60;

    this.m.view.push(this)
}

Graph.prototype = {

/* ************************************************ *
 * BUILD FUNCTIONS
 * ************************************************ */
    
    /* build all layers needed for the graph and link default mouse events to them
     * 
     * */
    build_graph : function () {
        document.getElementById(this.id)
            .innerHTML = "";
        
        this.mode = "curve";
            
        var self = this;
        this.vis = d3.select("#" + this.id)
            .append("svg:svg")
            .attr("id", this.id + "_svg")
            .on("mouseup", function () {
                self.stopDrag()
            })
            .on("mousemove", function () {
                self.dragTimePoint()
            })

        d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("id", this.id + "_back")
            .attr("class", "background_graph")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 2500)
            .attr("height", 2500)
            .on("click", function () {
                self.m.unselectAll();
            })
            .on("mouseover", function () {
                self.m.focusOut();
                $("#" + self.id + "_list")
                    .stop(true, true)
                    .hide("fast")
            })

        d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("id", this.id + "_back2")
            .attr("class", "background_graph2")
            .attr("x", this.marge4)
            .attr("y", 0)
            .attr("width", 2500)
            .attr("height", 2500)
            .on("click", function () {
                self.m.unselectAll();
            })
            .on("mouseover", function () {
                self.m.focusOut();
                $("#" + self.id + "_list")
                    .stop(true, true)
                    .hide("fast")
            })

        this.axis_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "axis_container")
        this.reso_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "reso_container")
        this.data_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "data_container")
        this.clones_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "clones_container")
        this.date_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "date_container")
        this.text_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "text_container")

        this.build_menu()
            .build_list();
        
        return this
    },
    

    /* constructor for the menu in the top-right corner of the graph
     * 
     * */
    build_menu : function() {
        var self = this;
        var parent = document.getElementById(this.id)
        
        var div = document.createElement('div')
        div.id = "" + this.id + "_menu"
        div.className = "graph_menu"
        div.appendChild(document.createTextNode("+"))
        
        var list = document.createElement('div')
        list.id = "" + this.id + "_list"
        list.className = "graph_list"
        
        div.appendChild(list)
        parent.appendChild(div)
        
        
        this.vis = d3.select("#" + this.id + "_menu")
            .on("mouseup", function () {
                self.stopDrag2()
            })
            .on("mousemove", function () {
                self.dragTimePoint()
            })
            .on("mouseover", function () {
                $("#" + self.id + "_list")
                    .stop(true, true)
                    .show("fast")
            })
            
        return this
    },
    
    /* used to build and update the list of disabled timepoint displayed in the top-right menu
     * 
     * */
    build_list : function() {
        var self = this;
        
        var list = document.getElementById("" + this.id + "_list")
        list.innerHTML = ""
        
        for (var i=0; i<this.m.samples.number; i++){
            if ( this.m.samples.order.indexOf(i) == -1){
                $("<div/>", {
                    class: "graph_listElem",
                    text: this.m.getStrTime(i),
                    time: i,
                }).appendTo("#" + this.id + "_list");
            }
        }
        
        $(".graph_listElem").mousedown(function () {
            var time = parseInt( $(this).attr("time") )
            self.startDrag(time)
        })
        
    },

    /* repositionne le graphique en fonction de la taille de la div le contenant
     *
     * */
    resize: function (div_width, div_height) {
        var div = document.getElementById(this.id)
        
        var speed = 0
        if (typeof div_height == 'undefined'){
            var div_height = div.offsetHeight
            var div_width = div.offsetWidth
            speed = 500
        }
        
        this.resizeW = div_width - this.marge4 - this.marge3;
        this.resizeH = div_height - this.marge5;

        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", div_width)
            .attr("height", div_height)
            
        d3.select("#" + this.id + "_back")
            .attr("width", div_width)
            .attr("height", div_height);
            
        d3.select("#" + this.id + "_back2")
            .attr("width", this.resizeW)
            .attr("height", div_height);

            
        this.text_position_y = 15;
        this.text_position_x = 60;
        this.text_position_x2 = div_width - 60;
    
        this.update(speed);
        
        return this
    },
    
/* ************************************************ *
 * UPDATE FUNCTIONS
 * ************************************************ */

    /* global update and redraw
     * 
     * */
    update : function (speed) {
        speed = typeof speed !== 'undefined' ? speed : 500;
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;
        
        this.initAxis()
            .initData()
            .updateRes()
            .updateClones()
            .draw(speed);
        
        elapsedTime = new Date()
            .getTime() - startTime;
        myConsole.log("update Graph: " + elapsedTime + "ms", -1);
        
        return this
    },
    
    /* update resolution curves
     * 
     * */
    updateRes : function () {
        if(this.mode != "stack"){
            this.data_res[0].path = this.constructPathR(1);
            this.data_res[1].path = this.constructPathR(5);
        }

        return this
    },
    
    /* update data curves and axis
     * instant redraw 
     * */
    updateData : function () {
        this.initData();
        this.initAxis();
        this.drawData(0);
        this.drawAxis(0);
        
        return this
    },
    
    /* update all clones curves or stacks
     * 
     * */
    updateClones: function () {
        if(this.mode=="stack"){
            var stack = new Stack(this.m)
            stack.compute();
            for (var i = 0; i < this.m.clones.length; i++) {
                this.data_clone[i].path = this.constructStack(i, stack);
            }
        }else{
            var list = []
            for (var i = 0; i < this.m.clones.length; i++) list.push(i)
            this.updateElem(list)
        }
        
        return this
    },

    /* update a list of selected clones
     *
     * */
    updateElem: function (list) {
        if (this.mode == "stack"){
            //in stack mode we can't update only a few clones whithout updating all of them
            this.updateClones()
        }else{
            for (var i = 0; i < list.length; i++) {
                var cloneID = list[i]
                for (var j = 0; j < this.m.clusters[cloneID].length; j++) {
                    var seqID = this.m.clusters[cloneID][j]
                    if (this.m.clone(cloneID).split) {
                        this.data_clone[seqID].path = this.constructPath(seqID, true);
                    } else {
                        this.data_clone[seqID].path = this.constructPath(cloneID, false);
                    }
                }
            }
            this.updateElemStyle(list)
        }
        
        return this
    },

    /* put focused clone on forground and redraw all curves to update their color/style
     *
     * */
    updateElemStyle: function (list) {
        if (this.m.focus != -1) {
            var line = document.getElementById("polyline" + this.m.focus);
            document.getElementById("clones_container")
                .appendChild(line);
        }
        this.drawClones(0);
        
        return this
    },

    
/* ************************************************ *
 * CLICK/DRAG FUNCTIONS
 * ************************************************ */
 
    /* every time user move a timepoint we redraw axis
     *
     * */
    dragTimePoint: function () {
        if (this.drag_on) {
            this.initAxis()
            this.drawAxis(0)
        }
    },

    /* call if user drop a timepoint
     * compute new timpoint order and update axis
     * */
    stopDrag: function () {
        if (this.drag_on) {
            this.drag_on = false;

            var coordinates = [0, 0];
            coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                .node());
            
            //stock tuples time_point/axis position
            var list = []
            for (var i = 0; i < this.m.samples.order.length; i++) {
                var t = this.m.samples.order[i]
                if (t == this.dragged_time_point) {
                    list.push([t, (coordinates[0] - this.marge4) / this.resizeW]);
                } else {
                    list.push([t, this.graph_col[i]]);
                }
            }
            
            if (this.m.samples.order.indexOf(this.dragged_time_point) == -1)
                list.push([this.dragged_time_point, (coordinates[0] - this.marge4) / this.resizeW]);

            //sort by axis position
            list.sort(function (a, b) {
                return a[1] - b[1]
            })

            var result = [];
            //save new time point order
            for (var i = 0; i < list.length; i++) {
                result[i] = list[i][0]
            }

            this.m.changeTimeOrder(result)
            this.build_list();
        }
    },
    
    /* call if user drop a timepoint in the top-right corner menu -> disable timepoint
     * compute new timpoint order and update axis
     * */
    stopDrag2: function () {
        if (this.drag_on) {
            this.drag_on = false;
            
            var result = []
            for (var i=0; i<this.m.samples.order.length; i++){
                if (this.m.samples.order[i] != this.dragged_time_point){
                    result.push(this.m.samples.order[i])
                }
            }

            this.m.changeTime(result[0])
            this.m.changeTimeOrder(result)
            this.build_list()
        }
    },

    /* 
     * 
     * */
    startDrag: function (time) {
        this.drag_on = true;
        this.dragged_time_point = time;
    },
    
    /* 
     * 
     * */
    clickGraph: function (cloneID){
        if (!d3.event.ctrlKey) this.m.unselectAll()
        this.m.select(cloneID)
    },

    
/* ************************************************ *
 * SVG PATH CONSTRUCTOR
 * ************************************************ */

    /* construit le svg path de la courbe de résolution 
     *
     * */
    constructPathR: function (r) {
        var res = []
        for (i = 0; i < this.m.samples.number; i++) {
            res[i] = (r / this.m.reads.segmented[i])
        }
        
        if (typeof res != "undefined" && res.length != 0) {
            var p;
            p = [
                [0, 1 + 0.1]
            ];
            
            var size = []
            if (this.m.norm == true){
                for (var i = 0; i < res.length; i++) {
                    size[i] = this.m.normalize(res[i], i)
                }
            }else{
                for (var i = 0; i < res.length; i++) {
                    size[i] = res[i]
                }
            }
                
            p.push([0, (1 - this.scale_x(size[0] * this.m.precision))]);

            for (var i = 0; i < this.graph_col.length; i++) {
                p.push([(this.graph_col[i]), (1 - this.scale_x(size[this.m.samples.order[i]] * this.m.precision))]);
            }
            p.push([1, (1 - this.scale_x(size[this.m.samples.order[this.graph_col.length - 1]] * this.m.precision))]);
            p.push([1, 1 + 0.1]);
            
            var x = (p[0][0] * this.resizeW + this.marge4)
            var y = (p[0][1] * this.resizeH + this.marge5)
            var che = ' M ' + x + ',' + y;
            for (var i = 1; i < p.length; i++) {
                x = (p[i][0] * this.resizeW + this.marge4)
                y = (p[i][1] * this.resizeH + this.marge5)
                che += ' L ' + x + ',' + y;
            }
            che += ' Z ';
            return che;
                
        } else return "";
    }, //fin constructPathR()

    /* construit le svg path d'un clone
     *
     * */
    constructPath: function (id, seq_size) {
        var self = this
        
        t = 0;
        var p;

        var size = []
        for (var i = 0; i < this.graph_col.length; i++) {
            if (seq_size) size[i] = this.m.clone(id).getSequenceSize(this.m.samples.order[i])
            else size[i] = this.m.clone(id).getSize(this.m.samples.order[i])
        }

        var x = this.graph_col[0];
        var y = this.scale_x(size[0] * this.m.precision)

        //cas avec un seul point de suivi
        if (this.graph_col.length == 1) {
            if (size[0] == 0) {
                p = [];
            } else {
                p = [
                    [(x + (Math.random() * 0.05) - 0.125), (1 - y)]
                ];
                p.push([(x + (Math.random() * 0.05) + 0.075), (1 - y)]);
            }
        }
        

        //plusieurs points de suivi
        else {

            var to = 0;
            for (var k = 0; k < this.graph_col.length; k++) to += size[k];

            //premier point de suivi 
            if (size[0] == 0) {
                p = [];
            } else {
                p = [
                    [(x - 0.03), (1 - y)]
                ];
                p.push([(x), (1 - y)]);

                if (to == size[0]) {
                    p.push([(x + 0.03), (1 - y)]);
                }
            }

            //points suivants
            for (var i = 1; i < this.graph_col.length; i++) {
                to = 0;
                for (var k = i; k < this.graph_col.length; k++) to += size[k]

                if (to != 0) {
                    x = this.graph_col[i];
                    y = this.scale_x(size[i] * this.m.precision)

                    if (size[i] == 0) {
                        if (p.length != 0) {
                            p.push([(x), (1 + 0.03)]);
                        }
                    } else {

                        //si premiere apparition du clone sur le graphique
                        if (p.length == 0) {
                            p.push([(x - 0.03), (1 - y)]);
                        }

                        p.push([(x), (1 - y)]);

                        //si derniere apparition du clone sur le graphique
                        if (to == size[i]) {
                            p.push([(x + 0.03), (1 - y)]);
                        }

                    }

                }
            }

        }
        
        if (p.length != 0){
            var x = (p[0][0] * self.resizeW + self.marge4)
            var y = (p[0][1] * self.resizeH + self.marge5)
            var che = ' M ' + x + ',' + y;
            for (var i = 1; i < p.length; i++) {
                x = (p[i][0] * self.resizeW + self.marge4)
                y = (p[i][1] * self.resizeH + self.marge5)
                che += ' L ' + x + ',' + y;
            }
            return che;
        }else{
            return ' M 0,' + self.resizeH;
        }
    }, //fin constructPath
    
    /* construit le svg path d'un clone en mode stack
     *
     * */
    constructStack: function (id, stack) {
        var p = [];
        
        if (typeof stack.min[id] == 'undefined'){
            return []
        }
        
        for (var i=0; i<this.graph_col.length; i++){
            var x = this.graph_col[i];
            var y = stack.min[id][this.m.samples.order[i]]
            p.push([x,y])
        }
        
        for (var i=this.graph_col.length-1; i>=0; i--){
            var x = this.graph_col[i];
            var y = stack.max[id][this.m.samples.order[i]]
            p.push([x,y])
        }
        
        if (p.length != 0){
            var x = (p[0][0] * this.resizeW + this.marge4)
            var y = (p[0][1] * this.resizeH + this.marge5)
            var che = ' M ' + x + ',' + y;
            for (var i = 1; i < p.length; i++) {
                x = (p[i][0] * this.resizeW + this.marge4)
                y = (p[i][1] * this.resizeH + this.marge5)
                che += ' L ' + x + ',' + y;
            }
            return che + ' Z';
        }else{
            return ' M 0,' + this.resizeH;
        }
    },
    
    
    
    
/* ************************************************ *
 * INIT FUNCTIONS
 * ************************************************ */
    
    /* global init function
     *
     * */
    init: function () {
        this.build_graph()
            .initAxis()
            .initData()
            .initClones()
            .initRes()
            .resize();
        
        return this
    },
    
    
    /*
     * 
     * */
    initData : function () {
        this.data_data = [];
        
        for (var key in this.m.data_info) {
            var max = this.m.data[key][0]
            var min = this.m.data[key][0];
            var tab = [];
            
            for (var i = 0; i < this.m.samples.number; i++) {
                var t = this.m.samples.order.indexOf(i)
                var val = this.m.data[key][t]
                if (this.m.norm && this.m.normalization.type=="data") val = this.m.normalize(val,t)
                tab.push(val)
            }
            
            this.data_data.push ({
                name: key,
                tab : tab,
                color : this.m.data_info[key].color,
                active : this.m.data_info[key].isActive
            });
            
        }
        
        this.g_data = this.data_container.selectAll("path")
            .data(this.data_data);
            
        this.g_data.enter()
            .append("path")
        this.g_data.exit()
            .remove();
            
        return this
    },
    
    
    /* build g_clone object 
     * 
     * */
    initClones : function () {
        this.data_clone = [];
        
        for (var i = 0; i < this.m.clones.length; i++) {
            this.data_clone[i] = {
                id: i,
                name: "line" + i,
                path: this.constructPath(i, false)
            };
        }
        
        this.g_clone = this.clones_container.selectAll("path")
            .data(this.data_clone);
        this.g_clone.enter()
            .append("path")
            .style("fill", "none")
            .attr("id", function (d) {
                return "poly" + d.name;
            })
        this.g_clone.exit()
            .remove();
            
        return this
    },
    
    
    /*
     * 
     * */
    initRes : function () {
        this.data_res = [];
        this.resolution1 = []
        this.resolution5 = []

        this.data_res.push({
            id: this.m.clones.length,
            name: "resolution1",
            path: this.constructPathR(1)
        });
        
        this.data_res.push({
            id: this.m.clones.length + 1,
            name: "resolution5",
            path: this.constructPathR(5)
        });

        this.g_res = this.reso_container.selectAll("g")
            .data(this.data_res);
        this.g_res.enter()
            .append("svg:g")
            .attr("id", function (d) {
                return d.name;
            });
        this.g_res.exit()
            .remove();

        this.g_res.append("path")
        this.g_res.exit()
            .remove();
            
        return this
    },
    
    /* 
     * 
     * */
    initAxis: function () {

        this.data_axis = [];
        this.graph_col = [];
            
        this.initAbscisse()
            .initOrdinateClones()
            .initOrdinateData()
            .initAbscisseT()
        

        this.g_axis = this.axis_container.selectAll("line")
            .data(this.data_axis);
        this.g_axis.enter()
            .append("line");
        this.g_axis.exit()
            .remove();

        this.g_text = this.text_container.selectAll("text")
            .data(this.data_axis);
        this.g_text.enter()
            .append("text");
        this.g_text.exit()
            .remove();
            
        return this
    },
    
    /*
     * 
     * */
    initAbscisse : function () {

        /* Compute coordinates of the samples / time points */
        for (var i = 0; i < this.m.samples.order.length; i++) {
            this.graph_col[i] = this.marge1 + i * ((1 - (this.marge1 + this.marge2)) / (this.m.samples.order.length - 1));
        }
        if (this.m.samples.order.length == 1) {
            this.graph_col[0] = 1 / 2
        }
        if (this.m.samples.order.length == 2) {
            this.graph_col[0] = 1 / 4;
            this.graph_col[1] = 3 / 4;
        }

        /* x-rescaling taking into account time deltas */
        if (this.m.samples.order.length >= 3) {

            deltas = this.m.dateDiffMinMax()
            myConsole.log(deltas)
            myConsole.log(deltas.min)
            
            /* only if there are enough different dates */
            if ((deltas.min >= 0) && (deltas.max >= 2))
                {
                    previous_t = this.m.samples.timestamp[0]
                    total_col = 0
                    this.graph_col[0] = total_col ;

                    for (var i = 1; i < this.m.samples.order.length; i++) {
                        t =  this.m.samples.timestamp[this.m.samples.order[i]]
                        delta = this.m.dateDiffInDays(previous_t, t)
                        total_col += 1 + (this.max_ratio_between_deltas - 1) * (delta - deltas.min) / (deltas.max - deltas.min)
                        
                        this.graph_col[i] = total_col
                        previous_t = t
                    }

                    /* re-normalizing */
                    for (var i = 0; i < this.m.samples.order.length; i++) {
                        t =  this.m.samples.timestamp[i] // pas i
                        this.graph_col[i] = this.marge1 + this.graph_col[i] * ((1 - (this.marge1 + this.marge2)) / total_col);
                    }
                }            
        }
        
        /* Init the axis */
        for (var i = 0; i < this.m.samples.number; i++) {
            var t = this.m.samples.order.indexOf(i)
            d = {}

            time_name = this.m.getStrTime(i);
            time_name = time_name.split(".")[0]

            d.type = "axis_v";
            d.text = time_name;

            // Warns when there are very few segmented reads 
            var percent = (this.m.reads.segmented[this.m.t] / this.m.reads.total[this.m.t]) * 100;
            if (percent < 10)
                d.text += " !" ;

            d.orientation = "vert";
            if (this.drag_on && i == this.dragged_time_point) {
                var coordinates = [0, 0];
                coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                    .node());
                d.pos = (coordinates[0] - this.marge4) / this.resizeW
            } else {
                if (t == -1){
                    d.pos = 1.05;
                    d.text = "";
                    d.type = "axis_v_hidden";
                }else{
                    d.pos = this.graph_col[t];
                }
            }
            d.time = i;
            this.data_axis.push(d);
        }  
        
        return this
    },
    
    /*
     * 
     * */
    initOrdinateClones : function () {
        
        var max = 0;
        //get ready for something really dirty
        if (this.m.norm && this.m.normalization.method == "constant"){
            for (var i=0; i<this.m.samples.order.length; i++) {
                for (var j=0; j<this.m.clones.length; j++){
                    var size = this.m.precision*100*this.m.clone(j).getSize()
                    if (size>max) max=size;
                }
            }
        }else{
            max = this.m.precision*this.m.max_size
        }
        
        this.scale_x = d3.scale.log()
            .domain([1, max])
            .range([0, 1]);
        
        //padding
        while (this.data_axis.length<20){
            this.data_axis.push({"type" :"axis_v_hidden" , "text": "", "pos" : 1.05});
        }

        //ordonnée clone
        if (this.mode == "stack"){
            this.data_axis.push({"type" : "axis_h", "text" : "0%" ,"orientation" : "hori", "pos" : 1});
            this.data_axis.push({"type" : "axis_h", "text" : "50%" ,"orientation" : "hori", "pos" : 0.5});
            this.data_axis.push({"type" : "axis_h", "text" : "100%" ,"orientation" : "hori", "pos" : 0});
        }else{
            var height = 1;
            while(height<this.m.max_size) height = height*10
            while ((height * this.m.precision) > 0.5) {

                var d = {};
                d.type = "axis_h";
                d.text = this.m.formatSize(height, false)
                d.orientation = "hori";
                d.pos = 1 - this.scale_x(height * this.m.precision);
                if (d.pos>=-0.1) this.data_axis.push(d);

                height = height / 10;
            }
        }
        
        return this
    },
    
    /*
     * 
     * */
    initOrdinateData : function () {
        
        var g_min = undefined
        var g_max = undefined
        var enabled = false
        
        // find min / max for
        for (var key in this.m.data_info) {
            var max = this.m.data[key][0];
            var min = this.m.data[key][0];
            
            if (this.m.norm && this.m.normalization.type=="data"){
                max = this.m.normalize(max, 0)
                min = this.m.normalize(min, 0)
            }
            
            for (var i = 0; i < this.m.samples.number; i++) {
                var t = this.m.samples.order.indexOf(i)
                var val = this.m.data[key][t]
                if (this.m.norm && this.m.normalization.type=="data") val = this.m.normalize(val, t)
                if (val>max) max=val;
                if (val<min) min=val;
            }
            
            if (typeof g_min == 'undefined' || g_min>min) g_min=min 
            if (typeof g_max == 'undefined' || g_max<max) g_max=max
            if (this.m.data_info[key].isActive) enabled = true
        }
        
        //choose the best scale (linear/log) depending of the space between min/max
        if ( g_min!=0 && (g_min*100)<g_max){
            this.scale_data = d3.scale.log()
                .domain([g_max, g_min])
                .range([0, 1]);
        }else{
            if ( (g_min*2)<g_max) g_min = 0
            this.scale_data = d3.scale.linear()
                .domain([g_max, g_min])
                .range([0, 1]);
        }
        
        //padding
        while (this.data_axis.length<40){
            this.data_axis.push({"type" :"axis_h_hidden" , "text": "", "pos" : 0});
        }
        
        //ordonnée data
        if (enabled && typeof g_min != 'undefined'){
            var height = 1;
            while(height<g_max) height = height*10
            while ((height ) > g_min/2 ) {

                var d = {};
                d.type = "axis_h2";
                d.text = height
                d.orientation = "hori";
                d.pos = this.scale_data(height);
                if (d.pos>=-0.1) this.data_axis.push(d);

                height = height / 10;
            }
        }
        
        return this
    },
    
    /*
     * 
     * */
    initAbscisseT : function () {
        //padding
        while (this.data_axis.length<60){
            this.data_axis.push({"type" :"axis_h_hidden" , "text": "", "pos" : 1.05});
        }

        //current time_point
        if ( this.m.samples.order.indexOf(this.m.t) != -1 ){
            this.mobil = {};
            this.mobil.type = "axis_m";
            this.mobil.text = "";
            this.mobil.orientation = "vert";
            this.mobil.pos = this.graph_col[this.m.samples.order.indexOf(this.m.t)];
            this.data_axis.push(this.mobil)
        }
        
        return this
    },
    

/* ************************************************ *
 * RENDERER FUNCTIONS
 * ************************************************ */
    
    
    /* global renderer function
     *
     * */
    draw: function (speed) {
        speed = typeof speed !== 'undefined' ? speed : 500;
        var self = this;

        this.drawAxis(speed)
            .drawData(speed)
            .drawClones(speed)
            .drawRes(speed)
    },
    
    /* renderer function for axis and labels
     *
     * */
    drawAxis: function (speed) {
        var self = this;

        //axes
        this.g_axis
            .transition()
            .duration(speed)
            .attr("x1", function (d) {
                if (d.orientation == "vert") return self.resizeW * d.pos + self.marge4;
                else return self.marge4;
            })
            .attr("x2", function (d) {
                if (d.orientation == "vert") return self.resizeW * d.pos + self.marge4;
                else return (self.resizeW) + self.marge4
            })
            .attr("y1", function (d) {
                if (d.orientation == "vert") return self.marge5;
                else return (self.resizeH * d.pos) + self.marge5;
            })
            .attr("y2", function (d) {
                if (d.orientation == "vert") return (self.resizeH) + self.marge5;
                else return (self.resizeH * d.pos) + self.marge5;
            })
            .attr("class", function (d) {
                return d.type
            })

        //legendes
        this.g_text
            .transition()
            .duration(speed)
            .text(function (d) {
                return d.text;
            })
            .attr("class", function (d) {
                if (d.type == "axis_v") return "axis_button";
                if (d.type == "axis_h") return "axis_leg";
                if (d.type == "axis_h2") return "axis_leg";
            })
            .attr("id", function (d) {
                if (d.type == "axis_v") return ("time" + d.time);
            })
            .attr("y", function (d) {
                if (d.type == "axis_h" || d.type == "axis_h2") return Math.floor(self.resizeH * d.pos) + self.marge5;
                else return self.text_position_y;
            })
            .attr("x", function (d) {
                if (d.type == "axis_h") return self.text_position_x;
                if (d.type == "axis_h2") return self.text_position_x2;
                else return Math.floor(self.resizeW * d.pos + self.marge4);
            })
            .attr("class", function (d) {
                if (d.type == "axis_v") return "graph_time"
                else if (d.type == "axis_h2") return "graph_text2"
                else return "graph_text";
            });

        this.text_container.selectAll("text")
            .on("click", function (d) {
                if (d.type == "axis_v") return self.m.changeTime(d.time)
            })
            .on("mousedown", function (d) {
                if (d.type == "axis_v") return self.startDrag(d.time)
            })
        
        return this
    },
    
    /* renderer function for clones
     *
     * */
    drawClones: function (speed) {
        var self = this;

        var c = 0;
        
        if (this.mode=="stack"){
            //volumes
            this.g_clone
                .style("fill", function (d) {
                    return self.m.clone(d.id).getColor();
                })
                .style("stroke", "none")
                .transition()
                .duration(speed)
                .attr("d", function (p) {
                    return p.path
                })
                .attr("class", function (p) {
                    var clone = self.m.clone(p.id)
                    if (!clone.isActive()) return "graph_inactive";
                    if (clone.isSelected()) return "graph_select";
                    if (clone.isFocus()) return "graph_focus";
                    c++
                    return "graph_line";
                })
                .attr("id", function (d) {
                    return "poly" + d.name;
                })
        }else{
            //courbes
            this.g_clone
                .style("fill", "none")
                .style("stroke", function (d) {
                    return self.m.clone(d.id).getColor();
                })
                .transition()
                .duration(speed)
                .attr("d", function (p) {
                    return p.path
                })
                .attr("class", function (p) {
                    var clone = self.m.clone(p.id)
                    if (!clone.isActive()) return "graph_inactive";
                    if (clone.isSelected()) return "graph_select";
                    if (clone.isFocus()) return "graph_focus";
                    c++
                    if (c < self.display_limit2 ) return "graph_line";
                    if (clone.top > self.display_limit) return "graph_inactive";
                    return "graph_line";
                })
                .attr("id", function (d) {
                    return "poly" + d.name;
                })
        }
        
        this.clones_container.selectAll("path")
            .on("mouseover", function (d) {
                self.m.focusIn(d.id);
            })
            .on("click", function (d) {
                self.clickGraph(d.id);
            });
            
        return this
    },

    
    /* renderer function for data curves
     * 
     * */
    drawData: function (speed) {
        var self = this;

        this.g_data
            .style("fill", "none")
            .style("stroke", function (d) {
                return d.color
            })
            .transition()
            .duration(speed)
            .attr("d", function (p) {
                var x,y;
                if (p.tab.length != 0 && p.active){
                    x = (self.graph_col[0] * self.resizeW + self.marge4);
                    y=(self.scale_data(p.tab[0]) * self.resizeH + self.marge5)
                    var che = ' M ' + x + ',' + y;
                    for (var i = 1; i < p.tab.length; i++) {
                        x = (self.graph_col[i] * self.resizeW + self.marge4);
                        y=(self.scale_data(p.tab[i]) * self.resizeH + self.marge5)
                        che += ' L ' + x + ',' + y;
                    }
                    return che;
                }else{
                    var che = ' M ' + (self.graph_col[0] * self.resizeW + self.marge4) + ',' + self.resizeH;
                    for (var i = 1; i < p.tab.length; i++) {
                        che += ' L ' + (self.graph_col[i] * self.resizeW + self.marge4) + ',' + self.resizeH;
                    }
                    return che;
                }
            })
            .attr("class", function (p) {
                if (!p.active){
                    return "graph_inactive";
                }else{
                    return "graph_data";
                }
            })
            .attr("id", function (d) {
                return "data_g_" + d.name;
            })
            
        return this
    },
    
    /* renderer function for resolution curves 
     * 
     * */
    drawRes: function (speed) {
        var self = this;
        
        this.g_res.selectAll("path")
            .transition()
            .duration(speed)
            .attr("d", function (p) {
                return p.path
            })
            
        return this
    },


} //fin Graph











/*
 * 
 * */
function Stack(model) {
    this.m = model;
}

Stack.prototype = {
    
    //compute sum of all clone +others (dans un monde parfait ca devrait faire 1 mais avec la normalisation...)
    init: function () {
        this.total_size = []; 
        for (j=0; j<this.m.samples.number; j++){
            this.total_size[j]=0
            for (i=0; i<this.m.clones.length; i++){
                if (this.m.clone(i).isActive()) this.total_size[j] += this.m.clone(i).getSize(j); //active clones
            }
            
            this.total_size[j] += this.m.clone(this.m.clones.length-1).getSize(j);//other clones
        }
    },
    
    //compute bot and top curve for each active clones
    compute: function () {
        this.sum = []; 
        this.min = [];
        this.max = [];
        for (j=0; j<this.m.samples.number; j++){
            this.sum[j]=1
        }
        
        for (i=0; i<this.m.clones.length; i++){
            this.min[i] = []
            this.max[i] = []
            //active clones
            if (this.m.clone(i).isActive()) {
                for (j=0; j<this.m.samples.number; j++){
                    this.min[i][j] = this.sum[j]
                    this.sum[j] -= this.m.clone(i).getSize(j)
                    this.max[i][j] = this.sum[j]
                }
            }else{
                for (j=0; j<this.m.samples.number; j++){
                    this.min[i][j] = this.sum[j]
                    this.max[i][j] = this.sum[j]
                }
            }
        }
        
        //other
        for (j=0; j<this.m.samples.number; j++){
            this.min[this.m.clones.length-1][j] = this.sum[j]
            this.sum[this.m.clones.length-1] += this.m.clone(this.m.clones.length-1).getSize(j)
            this.max[this.m.clones.length-1][j] = this.sum[j]
        }
        
    },

}
























