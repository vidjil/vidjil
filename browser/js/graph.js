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


/** constructor
 *
 * */
function Graph(id, model, database) {
    //
    View.call(this, model, id);
    this.useSmartUpdateElemStyle = false;
    
    this.resizeW = 1; //coeff d'agrandissement/réduction largeur                
    this.resizeH = 1; //coeff d'agrandissement/réduction hauteur        
    
    this.display_limit2 = 50 //nombre max de clones pouvant etre affiché sur le graph
    this.display_limit = 10  //les clones du top 10 sont toujours affiché (même s'il y en a plus de 50)
     

    this.marge1 = 0.05; //marge droite bord du graph/premiere colonne
    this.marge2 = 0.05; //marge gauche derniere colonne/bord du graph
    this.marge3 = 70; //marge droite (non influencé par le resize)
    this.marge4 = 70; //marge gauche (non influencé par le resize)
    this.marge5 = 40; //marge top (non influencé par le resize)

    // maximum ratio between small and large time deltas for rescaling x axis
    // if set to 1.0, no rescaling
    this.max_ratio_between_deltas = 2.0;

    this.data_axis = [];
    this.mobil = {};

    this.drag_on = false;
    this.dragged_time_point = 0;
    
    this.text_position_y = 30
    this.text_position_y2 = 15;
    this.text_position_x = 60;

    this.m.graph = this // TODO: find a better way to do this
    this.db = database;

    this.lineGenerator = d3.line().curve(d3.curveMonotoneX);

    //flag used to count the number of transition (multiple transition can run at the same time)
    //increase every time a transition is started
    //decrease every time a transition is completed
    //0 means all started transition have been completed
    this.inProgress = 0
}

Graph.prototype = {

/* ************************************************ *
 * BUILD FUNCTIONS
 * ************************************************ */
    
    /* build all layers needed for the graph and link default mouse events to them
     * 
     * */
    build_graph : function () {
        try {
            document.getElementById(this.id)
                .removeAllChildren();

            this.mode = "curve";

            var self = this;
            this.vis = d3.select("#" + this.id)
                .attr("class", "graph")
                .append("svg:svg")
                .attr("id", this.id + "_svg")
                .on("mouseup", function () {
                    self.stopDrag()
                })
                .on("mousemove", function () {
                    self.dragTimePoint()
                })

            d3.select("#" + this.id + "_svg")
                .append('svg:clipPath')
                .attr('id', this.id+'_clip')
                .append("svg:rect")
                .attr('id', this.id+'_backclip')
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 2500)
                .attr("height", 2500)

            d3.select("#" + this.id + "_svg")
                .append('svg:g')
                .attr('id', this.id+'_clipped')
                .attr('style', 'clip-path: url(#'+this.id+'_clip);')

            d3.select("#" + this.id + "_clipped")
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
                    $("#" + this.id + "_table")
                        .stop(true, true)
                        .hide("fast")
                })


            d3.select("#" + this.id + "_clipped")
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
                    $("#" + this.id + "_table")
                        .stop(true, true)
                        .hide("fast")
                })

            this.axis_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "axis_container")
            this.data_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "data_container")
            this.clones_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "clones_container")
            this.date_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "date_container")
            this.text_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "text_container")
            this.reso_container = d3.select("#" + this.id + "_clipped")
                .append("svg:g")
                .attr("id", "reso_container")

            this.build_menu()
                .build_list();
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
        
        return this
    },

    updateInProgress: function() {
        if (this.inProgress>0) return true
        return false
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

        var list_title_line = document.createElement('div')
        var list_title = document.createElement('span')
        list_title.id = this.id +"_title"

        var list_title_samples = document.createElement('span')
        list_title_samples.textContent = " sample" + (this.m.samples.number > 1 ? "s" : "")
        list_title_samples.id = this.id +"_title_samples"
        list_title_samples.style.display = "none"

        list_title_line.appendChild(list_title)
        list_title_line.appendChild(list_title_samples)

        div.appendChild(list_title_line)
        
        var list = document.createElement('table')
        list.id = this.id +"_table"
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
                $("#"+ self.id +"_table")
                    .stop(true, true)
                    .show()
                $("#"+ self.id +"_title_samples")
                    .stop(true, true)
                    .show()
                self.updateList()
            })
            .on("mouseout", function () {
                $("#"+ self.id +"_table")
                    .stop(true, true)
                    .hide()
                $("#"+ self.id +"_title_samples")
                    .stop(true, true)
                    .hide()
            })
            
        this.updateCountActiveSample()
        return this
    },
    
    /**
     *  used to build and update the list of disabled timepoint displayed in the top-right menu
     */
    build_list : function() {
        var self = this;
        
        var list = document.getElementById("" + this.id + "_list")

        this.updateCountActiveSample()

        // Update table to store each line
        var table = document.getElementById(""+this.id +"_table")
        table.removeAllChildren()

        // Show All
        var line   = document.createElement("tr")
        var line_content   = document.createElement("td")
        line_content.id = this.id +"_listElem_showAll"
        line_content.classList.add("graph_listAll")
        line_content.textContent = "show all"
        line_content.colSpan = "2"
        line.appendChild(line_content)
        table.appendChild(line)   

        // Hide All
        line   = document.createElement("tr")
        line_content   = document.createElement("td")
        line_content.id = this.id +"_listElem_hideAll"
        line_content.classList.add("graph_listAll")
        line_content.textContent = "focus on selected samples"
        line_content.colSpan = "2"
        line.appendChild(line_content)
        table.appendChild(line)

        // Hide not share
        line   = document.createElement("tr")
        line_content   = document.createElement("td")
        line_content.id = this.id +"_listElem_hideNotShare"
        line_content.classList.add("graph_listAll")
        line_content.textContent = "focus on selected clones"
        line_content.colSpan = "2"
        line.appendChild(line_content)
        table.appendChild(line)

        for (var i=0; i<this.m.samples.number; i++){
            // Create a line for each sample, with checkbox and name (text)
            var list_content   = document.createElement("tr")
            list_content.id    = this.id +"_listElem_"+i
            list_content.classList.add("graph_listElem")
            list_content.dataset.time = i
            // case: Name of sample
            var line_content_text   = document.createElement("td")
            line_content_text.classList.add("graph_listElem_text")
            line_content_text.id    = this.id +"_listElem_text_"+i
            line_content_text.textContent  = this.m.getStrTime(i)
            line_content_text.dataset.time = i
            // case: checkbox
            var line_content_check  = document.createElement("td")
            var content_check  = document.createElement("input")
            content_check.classList.add("graph_listElem_check")
            content_check.type = "checkbox"
            content_check.id   = this.id +"_listElem_check_"+i
            content_check.dataset.time = i
            line_content_check.appendChild(content_check)

            list_content.appendChild(line_content_check)
            list_content.appendChild(line_content_text)

            // Add all descripion of sample keys as tooltip
            var tooltip = this.getTooltip(i, false, false)
            list_content.title = tooltip

            /* jshint ignore:start */
            list_content.onmouseover = function() {
                self.graphListFocus(this.dataset.time)
            };
            list_content.onmouseout = function() {
                self.graphListFocus(undefined)
            };
            /* jshint ignore:end */

            table.appendChild(list_content) 
        }

        $("#"+this.id +"_listElem_showAll").click(function () {
            console.log( "self.showAllTimepoint()" )
            self.m.showAllTime()
        })
        $("#"+this.id +"_listElem_hideAll").click(function () {
            console.log( "self.hideAllTimepoint( true )" )
            self.m.hideAllTime()
        })
        $("#"+this.id +"_listElem_hideNotShare").click(function () {
            console.log( "self.hideNotShare()" )
            self.m.hideNotShare()
        })

        $(".graph_listElem").click(function () {
            var time = parseInt( this.dataset.time )
            if (self.m.samples.order.indexOf(time) != -1){
                self.m.changeTime(time)
            }
        })
        $(".graph_listElem").dblclick(function () {
            var time = parseInt( this.dataset.time )
            self.m.switchTime(time)
        })
        $(".graph_listElem_check").click(function () {
            var time = parseInt( this.dataset.time )
            self.m.switchTime(time)
        })

        // Update checkbox state at init
        this.updateList()
    },

    /**
     * Update the content of checkbox for each sample, depending if his presence into the model samples order list
     */
    updateList : function() {
        for (var time = 0; time < this.m.samples.number; time++) {
            this.updateListCheckbox(time)
            this.updateListName(time)
        }
        return
    },

    /**
     * Update, in the graph list, the sample with the selected css rule
     */
    updateListElemSelected: function(){
        var time = this.m.t
        var elem = document.getElementsByClassName("graph_listElem_selected")
        // remove css rule of previous sample
        if (elem.length != 0) {
            // dont change if previous and current sample are the same
            if (elem[0].id == this.id +'_listElem_text_'+time && this.m.samples.order.length != 0){ return }
            elem[0].classList.remove("graph_listElem_selected")
        }
        // Add css rule to current timepoint (and if at least one is show)
        if (time != undefined && this.m.samples.order.length > 1){
            elem = document.getElementById(this.id +'_listElem_text_'+time)
            elem.classList.add("graph_listElem_selected")
        }
        return
    },

    /**
     * Update the state of the checkbox of a sample. Use the model samples order as reference.
     * @param  {[type]} time The timepoint to update
     */
    updateListCheckbox: function(time){
        var checkbox_id  = this.id +"_listElem_check_"+time
        var checkbox     = document.getElementById(checkbox_id)
        checkbox.checked = (this.m.samples.order.indexOf(time) != -1)
        return
    },

    /**
     * Update the text of a sample. Adapt it with the model time_type format
     * @param  {Number} time The timepoint to update
     */
    updateListName: function(time){
        var name_id  = this.id +"_listElem_text_"+time
        var name     = document.getElementById(name_id)
        name.textContent  = this.m.getStrTime(time)
        return
    },

    /**
     * Show all timepoint in the timeline graphic.
     * Add all samples that are not already in the list of actif samples
     * Each sample added will be put at the end of the list.
     */
    showAllTimepoint: function(){
        var self = this
        this.inProgress++
        setTimeout(function(){
            self.inProgress--
        }, 250)

        // keep current timepoint active if exist, else, give active to first timepoint
        var keeptime = this.m.t
        for (var time = 0; time < this.m.samples.number; time++) {
            if (this.m.samples.order.indexOf(time) == -1) this.m.addTimeOrder(time)
        }
        this.updateList()
        this.m.changeTime(keeptime)
        this.m.update()
        return
    },



    /**
     * Update count of active samples
     * This value is shown in the first line of the graphList
     */
    updateCountActiveSample: function(){
        var div   = document.getElementById(this.id +"_title")
        if (this.m.samples.number > 1 && this.m.samples.number != undefined){
            div.textContent  = ""+this.m.samples.order.length+" / " + this.m.samples.number
        } else if (this.m.samples.number == 0 && this.m.samples.number != undefined){
            // If no sample in the model
            div.textContent  = "..."
        }
    },




    /* repositionne le graphique en fonction de la taille de la div le contenant
     *
     * */
    resize: function (div_width, div_height) {
        if(!this.m.isReady()) return      //don't resize if model is not ready

        var div = document.getElementById(this.id)
        
        var speed = 0
        if (typeof div_height == 'undefined'){
            div_height = div.offsetHeight
            div_width = div.offsetWidth
            speed = 500
        }
        
        this.resizeW = div_width - this.marge4 - this.marge3;
        this.resizeH = div_height - this.marge5;
        
        this.maxLabelSize = (this.resizeW-100)/this.m.samples.order.length;

        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", div_width)
            .attr("height", div_height)
            
        d3.select("#" + this.id + "_backclip")
            .attr("width", div_width)
            .attr("height", div_height);

        d3.select("#" + this.id + "_back")
            .attr("width", div_width)
            .attr("height", div_height);
            
        d3.select("#" + this.id + "_back2")
            .attr("width", this.resizeW)
            .attr("height", div_height);

            
        this.text_position_y = 30;
        this.text_position_y2 = 15;
        this.text_position_x = 60;
        this.text_position_x2 = div_width - 60;
    
        this.update(speed);
    },
    
/* ************************************************ *
 * UPDATE FUNCTIONS
 * ************************************************ */

    /* global update and redraw
     * 
     * */
    update : function (speed) {
        speed = typeof speed !== 'undefined' ? speed : 500;
        this.updateListElemSelected();
        this.updateCountActiveSample();
        this.graphListFocus(undefined)
        if (this.m.samples.number > 1){
            this.updateList()
        }

        this.g_clone = this.clones_container.selectAll("path")
            .data(this.data_clone);
        this.initAxis()
            .initData()
            .updateRes()
            .updateClones()
            .drawAxis(speed)
            .drawData(speed)
            .drawRes(speed)
    },
    
    /* update resolution curves
     * 
     * */
    updateRes : function () {
        this.initRes();
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
                if (this.m.clone(i).hasSizeConstant()) {
                    this.data_clone[i].path = this.constructStack(i, stack);
                }
            }
        }else{
            var list = []
            for (var j = 0; j < this.m.clones.length; j++) 
                if (this.m.clone(j).hasSizeConstant()) {
                    list.push(j)
                }
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
        if (this.m.focus != -1 && this.m.clone(this.m.focus).hasSizeConstant()) {
            var line = document.getElementById("polyline" + this.m.focus);
            document.getElementById("clones_container")
                .appendChild(line);
        }
        this.drawClones(0, list);
        
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
            for (var j = 0; j < list.length; j++) {
                result[j] = list[j][0]
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
            this.m.update()
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
        this.m.unselectAllUnlessKey(d3.event)
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
        for (var i = 0; i < this.m.samples.number; i++) {
            res[i] = (r / this.m.reads.segmented[i])
            if(this.m.reads.segmented[i]==0) res[i] = 1;
            if(res[i] > this.displayMax) res[i] = this.displayMax;
        }
        
        if (typeof res !== "undefined" && res.length !== 0) {
            var p;
            p = [
                [0, 1 + 0.1]
            ];
            
            var size = []
            for (var j = 0; j < res.length; j++) {
                size[j] = this.m.normalize(res[j], j)
            }
                
            p.push([0, (1 - this.scale_x(size[0] * this.m.precision))]);

            for (var l = 0; l < this.graph_col.length; l++) {
                p.push([(this.graph_col[l]), (1 - this.scale_x(size[this.m.samples.order[l]] * this.m.precision))]);
            }
            p.push([1, (1 - this.scale_x(size[this.m.samples.order[this.graph_col.length - 1]] * this.m.precision))]);
            p.push([1, 1 + 0.1]);
            
            var tab = []
            for (var m = 0; m < p.length; m++) {
                x = (p[m][0] * this.resizeW + this.marge4)
                y = (p[m][1] * this.resizeH + this.marge5)
                if (isNaN(x)) return ' M 0,' + this.resizeH;
                if (isNaN(y)) return ' M 0,' + this.resizeH;
                tab.push([x.toFixed(3),y.toFixed(3)]);
            }
            return this.lineGenerator(tab);
                
        } else return "";
    }, //fin constructPathR()

    /* construit le svg path d'un clone
     *
     * */
    constructPath: function (id, seq_size) {
        var self = this
        
        t = 0;
        var p;

        var clone = self.m.clone(id)
        if (!clone.isActive() && !clone.isSelected() && !clone.isFocus()) return ' M 0,' + self.resizeH;
        if (clone.top > self.display_limit)return ' M 0,' + self.resizeH;

        var size = []
        var selected_point       = this.m.t
        var value_selected_point = this.m.clone(id).getSize(selected_point)

        for (var i = 0; i < this.graph_col.length; i++) {
            // bypass clone size if it is not present in the current timepoint; TODO, add a switch on this behavior
            if (this.m.show_only_one_sample && value_selected_point == 0) {
                size[i] = 0
            } else {
                if (seq_size) size[i] = this.m.clone(id).getSequenceSize(this.m.samples.order[i])
                else          size[i] = this.m.clone(id).getSize(this.m.samples.order[i])
            }
        }

        var x = this.graph_col[0];
        var y = this.scale_x(size[0] * this.m.precision)

        //cas avec un seul point de suivi
        if (this.graph_col.length == 1) {
            if (size[0] === 0) {
                p = [];
            } else {
                p = [ [(x + (Math.random() * 0.05) - 0.125), (1 - y)],
                      [(x + (Math.random() * 0.05) + 0.075), (1 - y)]];
            }
        }
        
        //plusieurs points de suivi
        else {

            var to = 0;
            for (var j = 0; j < this.graph_col.length; j++) to += size[j];

            //premier point de suivi 
            if (size[0] === 0) {
                p = [];
            } else {
                p = [ [(x - 0.03), (1 - y)],
                      [(x),        (1 - y)] ];

                if (to == size[0]) p.push([(x + 0.03), (1 - y)]);
            }

            //points suivants
            for (var k = 1; k < this.graph_col.length; k++) {
                to = 0;
                for (var l = k; l < this.graph_col.length; l++) to += size[l]

                if (to !== 0) {
                    x = this.graph_col[k];
                    y = this.scale_x(size[k] * this.m.precision)

                    if (size[k] === 0) {
                        if (p.length !== 0) p.push([(x), (1 + 0.03)]);    
                    } else {
                        //si premiere apparition du clone sur le graphique
                        if (p.length === 0) p.push([(x - 0.03), (1 - y)]);

                        p.push([(x), (1 - y)]);

                        //si derniere apparition du clone sur le graphique
                        if (to == size[k]) p.push([(x + 0.03), (1 - y)]);
                    }
                }
            }
        }
        
        var tab = []
        if (p.length !== 0){
            for (var m = 0; m < p.length; m++) {
                x = (p[m][0] * self.resizeW + self.marge4)
                y = (p[m][1] * self.resizeH + self.marge5)
                if (isNaN(x)) return ' M 0,' + self.resizeH;
                if (isNaN(y)) return ' M 0,' + self.resizeH;
                tab.push([x.toFixed(3),y.toFixed(3)]);
            }
            return this.lineGenerator(tab);
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
        var x, y;
        for (var i=0; i<this.graph_col.length; i++){
            x = this.graph_col[i];
            y = stack.min[id][this.m.samples.order[i]]
            p.push([x,y])
        }
        
        for (var j=this.graph_col.length-1; j>=0; j--){
            x = this.graph_col[j];
            y = stack.max[id][this.m.samples.order[j]]
            p.push([x,y])
        }
        
        if (p.length !== 0){
            x = (p[0][0] * this.resizeW + this.marge4)
            y = (p[0][1] * this.resizeH + this.marge5)
            var che = ' M ' + x + ',' + y;
            for (var k = 1; k < p.length; k++) {
                x = (p[k][0] * this.resizeW + this.marge4)
                y = (p[k][1] * this.resizeH + this.marge5)
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
                val = this.m.normalize(val,t)
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
            if (this.m.clone(i).hasSizeConstant()) {
                this.data_clone[i] = {
                    id: i,
                    name: "line" + i,
                    path: this.constructPath(i, false)
                };
            }
        }
        
        this.g_clone = this.clones_container.selectAll("path")
            .data(this.data_clone);
        this.g_clone.enter()
            .append("path")
            .style("fill", "none")
            .attr("id", function (d) {
                return "poly" + d.name;
            })
            .attr("d", function (p) {
                return p.path
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

        this.g_res = this.reso_container.selectAll("path")
            .data(this.data_res);
        this.g_res.enter()
            .append("svg:path")
            .attr("id", function (d) {
                return d.name;
            })
            .attr("d", function (p) {
                return p.path
            });
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

        var t;
        /* x-rescaling taking into account time deltas */
        if (this.m.samples.order.length >= 3) {

            deltas = this.m.dateDiffMinMax()
            
            /* only if there are enough different dates */
            if ((deltas.min >= 0) && (deltas.max >= 2))
                {
                    previous_t = this.m.samples.timestamp[0]
                    total_col = 0
                    this.graph_col[0] = total_col ;

                    for (var j = 1; j < this.m.samples.order.length; j++) {
                        t =  this.m.samples.timestamp[this.m.samples.order[j]]
                        delta = this.m.dateDiffInDays(previous_t, t)
                        total_col += 1 + (this.max_ratio_between_deltas - 1) * (delta - deltas.min) / (deltas.max - deltas.min)
                        
                        this.graph_col[j] = total_col
                        previous_t = t
                    }

                    /* re-normalizing */
                    for (var k = 0; k < this.m.samples.order.length; k++) {
                        t =  this.m.samples.timestamp[k] // pas i
                        this.graph_col[k] = this.marge1 + this.graph_col[k] * ((1 - (this.marge1 + this.marge2)) / total_col);
                    }
                }            
        }
        
        /* Init the axis */
        for (var l = 0; l < this.m.samples.number; l++) {
            t = this.m.samples.order.indexOf(l)
            d = {}

            var maxchar = (this.resizeW/this.m.samples.order.length)/10;
            time_name = this.m.getStrTime(l);
            if (time_name.length > maxchar+3) time_name = time_name.substring(0,maxchar)+" ..."
            if (l == this.m.t) time_name = this.m.getStrTime(l);
            // If focus on this sample only (todo: #4221; add an search icon, hard with d3js)
            if (this.m.show_only_one_sample && l == this.m.t) time_name += " *"

            d.type = "axis_v";
            d.text = time_name;
            d['class'] = "graph_time";
            if ( l == this.m.t ) d['class'] = "graph_time2";
            if ( l == this.m.t ) d.type = "axis_v2";

            // Warns when there are very few segmented reads 
            var percent = (this.m.reads.segmented[l] / this.m.reads.total[l]) * 100;
            if (percent < 50)
                d['class'] += " warning" ;
            if (percent < 10)
                d['class'] += " alert" ;

            d.orientation = "vert";
            if (this.drag_on && l == this.dragged_time_point) {
                var coordinates = [0, 0];
                coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                    .node());
                d.pos = (coordinates[0] - this.marge4) / this.resizeW
            } else {
                if (t == -1){
                    d.pos = 1.05;
                    d.text = "";
                    d.type = "axis_v_hidden";
                    d['class'] = "graph_text"
                }else{
                    d.pos = this.graph_col[t];
                }
            }
            d.time = l;
            this.data_axis.push(d);
        }  
        
        return this
    },
    
    /*
     * 
     * */
    initOrdinateClones : function () {
        this.m.update_precision()
        var max = this.m.precision*this.m.max_size
        
        this.scale_x = d3.scaleLog()
            .domain([1, max])
            .range([0, 1]);
        
        //padding
        while (this.data_axis.length<20){
            this.data_axis.push({"type" :"axis_v_hidden", "class" : "graph_text" , "text": "", "pos" : 1.05});
        }

        //ordonnée clone
        if (this.mode == "stack"){
            this.data_axis.push({"type" : "axis_h", "class" : "graph_text", "text" : "0%" ,"orientation" : "hori", "pos" : 1});
            this.data_axis.push({"type" : "axis_h", "class" : "graph_text", "text" : "50%" ,"orientation" : "hori", "pos" : 0.5});
            this.data_axis.push({"type" : "axis_h", "class" : "graph_text", "text" : "100%" ,"orientation" : "hori", "pos" : 0});
        }else{

            //increase the max value displayable in graph until we can display the current biggest clone
            this.displayMax = 0.00001;
            while(this.displayMax<this.m.max_size) this.displayMax = this.displayMax*10

            //update scale
            this.scale_x = d3.scaleLog()
            .domain([1, this.m.precision*this.displayMax])
            .range([0, 1]);
            
            //compute axis label
            var axis_value = this.displayMax
            while ((axis_value * this.m.precision) > 0.5) {
                var d = {};
                d.type = "axis_h";
                d.text = this.m.formatSize(axis_value, false)
                d['class'] = "graph_text";
                d.orientation = "hori";
                d.pos = 1 - this.scale_x(axis_value * this.m.precision);
                if (d.pos>=-0.1) this.data_axis.push(d);

                axis_value = axis_value/10;
            }
        }

        return this
    },
    
    /*
     * 
     * */
    initOrdinateData : function () {
        
        var g_min;
        var g_max;
        var enabled = false
        
        // find min / max for
        for (var key in this.m.data_info) {
            var max = this.m.data[key][0];
            var min = this.m.data[key][0];
            
            max = this.m.normalize(max, 0)
            min = this.m.normalize(min, 0)
            
            for (var i = 0; i < this.m.samples.number; i++) {
                var t = this.m.samples.order.indexOf(i)
                var val = this.m.data[key][t]
                val = this.m.normalize(val, t)
                if (val>max) max=val;
                if (val<min) min=val;
            }
            
            if (typeof g_min == 'undefined' || g_min>min) g_min=min 
            if (typeof g_max == 'undefined' || g_max<max) g_max=max
            if (this.m.data_info[key].isActive) enabled = true
        }
        
        //choose the best scale (linear/log) depending of the space between min/max
        if ( g_min!==0 && (g_min*100)<g_max){
            this.scale_data = d3.scaleLog()
                .domain([g_max, g_min])
                .range([0, 1]);
        }else{
            if ( (g_min*2)<g_max) g_min = 0
            this.scale_data = d3.scaleLinear()
                .domain([g_max, g_min])
                .range([0, 1]);
        }
        
        //padding
        while (this.data_axis.length<40){
            this.data_axis.push({"type" :"axis_h_hidden" , "text": "", "pos" : 0, "class" : "graph_text"});
        }

        //ordonnée data
        if (enabled && typeof g_min != 'undefined'){
            var height = 1;
            while(height<g_max) height = height*10
            while ((height ) > g_min/2 ) {

                var d = {};
                d.type = "axis_h2";
                d['class'] = "graph_text2"
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
            this.mobil['class'] = "graph_text";
            this.mobil.orientation = "vert";
            this.mobil.pos = this.graph_col[this.m.samples.order.indexOf(this.m.t)];
            this.data_axis.push(this.mobil)
        }

        //other selected time_point
        if ( this.m.samples.order.indexOf(this.m.tOther) != -1 ){
            this.mobilOther = {};
            this.mobilOther.type = "axis_m_other";
            this.mobilOther.text = "";
            this.mobilOther['class'] = "graph_text";
            this.mobilOther.orientation = "vert";
            this.mobilOther.pos = this.graph_col[this.m.samples.order.indexOf(this.m.tOther)];
            this.data_axis.push(this.mobilOther)
        }
        
        return this
    },

    setOtherVisibility: function (visible) {
        if (visible) {
            $(".axis_m_other").show("fast")
        } else {
            $(".axis_m_other").hide("fast")
        }
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
        var axis = this.g_axis
        if (speed !== 0){
            axis = axis
            .transition()
            .duration(speed)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
        }
        axis
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
            });

        //legendes
        var label = this.g_text
        if (speed !== 0){
            label = label
            .transition()
            .duration(speed)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
        }
        label
            .text(function (d) {
                return d.text;
            })
            .attr("class", function (d) {
                if (d.type == "axis_v") return "axis_button";
                if (d.type == "axis_v2") return "axis_button";
                if (d.type == "axis_h") return "axis_leg";
                if (d.type == "axis_h2") return "axis_leg";
            })
            .attr("id", function (d) {
                if (d.type == "axis_v") return ("time" + d.time);
                if (d.type == "axis_v2") return ("time" + d.time);
            })
            .attr("y", function (d) {
                if (d.type == "axis_h" || d.type == "axis_h2") return Math.floor(self.resizeH * d.pos) + self.marge5;
                if (d.type == "axis_v2") return self.text_position_y2;
                if (d.type == "axis_v") return self.text_position_y;
            })
            .attr("x", function (d) {
                if (d.type == "axis_h") return self.text_position_x;
                if (d.type == "axis_h2") return self.text_position_x2;
                else return Math.floor(self.resizeW * d.pos + self.marge4);
            })
            .attr("class", function (d) {
                return d['class']
            })

        if (document.getElementById(this.id + "_tooltip") == null){
            d3.select("body").append("div")
              .attr("class", "tooltip")
              .attr("id", this.id + "_tooltip")
              .style("opacity", 0);
        }

        this.text_container.selectAll("text")
            .on("click", function (d) {
                if (d.type == "axis_v" || d.type == "axis_v2") return self.m.changeTime(d.time)
            })
            .on("mousedown", function (d) {
                if (d.type == "axis_v" || d.type == "axis_v2") return self.startDrag(d.time)
            })
            .on("dblclick", function (d) {
                var pos = self.m.samples.order.indexOf(d.time)
                if (self.m.samples.order.length != 1 && pos != -1) {
                    self.m.removeTimeOrder(d.time)
                }
                self.m.update()
                // change current time to use first element of the current samples list
                if (self.m.samples.order.length > 0){
                    var new_time = self.m.samples.order[0]
                    self.m.changeTime(new_time)
                }

            })
            .on("mouseover", function(d) {
                var div = d3.select("#"+self.id + "_tooltip")
                var time = d.time
                var tooltip = self.getTooltip(time, true, true)
                div.transition()
                    .duration(200)
                    .style("opacity", 1);
                div .html(tooltip)
                    .style("left", (d3.event.pageX + 24) + "px")
                    .style("top", (d3.event.pageY - 32) + "px");
                })
            .on("mouseout", function(d) {
                var div = d3.select("#"+self.id + "_tooltip")
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        return this
    },
    
    /* renderer function for clones
     *
     * */
    drawClones: function (speed, list) {
        var self = this;

        var c = 0;

        selected_clones = this.g_clone;
        if (typeof list != "undefined"){
            selected_clones = this.g_clone.filter(function(d) {
                if (list.indexOf(d.id) != -1) return true;
                return false
            });
        }
        
        if (speed !== 0){
            selected_clones = selected_clones
            .transition()
            .duration(speed)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
        }
        selected_clones
            .style("fill", "none")
            .style("stroke", function (d) {
                return self.m.clone(d.id).getColor();
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
            .on("mouseover", function (d) {
                self.m.focusIn(d.id);
            })
            .on("click", function (d) {
                self.clickGraph(d.id);
            })               
            .attr("d", function (d) {
                return d.path
            });
        
            
        return this
    },
    
    /* renderer function for data curves
     * 
     * */
    drawData: function (speed) {
        var self = this;
        
        var data = this.g_data
        if (speed !== 0){
            data = data
            .transition()
            .duration(speed)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
        }
        data.attr("d", function (p) {
                var x,y,che;
                if (p.tab.length !== 0 && p.active){
                    x = (self.graph_col[0] * self.resizeW + self.marge4);
                    y=(self.scale_data(p.tab[0]) * self.resizeH + self.marge5)
                    che = ' M ' + x + ',' + y;
                    for (var i = 1; i < p.tab.length; i++) {
                        x = (self.graph_col[i] * self.resizeW + self.marge4);
                        y=(self.scale_data(p.tab[i]) * self.resizeH + self.marge5)
                        che += ' L ' + x + ',' + y;
                    }
                    return che;
                }else{
                    che = ' M ' + (self.graph_col[0] * self.resizeW + self.marge4) + ',' + self.resizeH;
                    for (var j = 1; j < p.tab.length; j++) {
                        che += ' L ' + (self.graph_col[j] * self.resizeW + self.marge4) + ',' + self.resizeH;
                    }
                    return che;
                }
            })
                
        this.g_data
            .style("fill", "none")
            .style("stroke", function (d) {
                return d.color
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
        
        var res = this.g_res
        if (speed !== 0){
            res = res
            .transition()
            .duration(speed)
            .on("start", function(){self.inProgress++}) 
            .on("end", function(){self.inProgress--}) 
            .on("interrupt", function(){self.inProgress--}) 
            .on("cancel", function(){self.inProgress--}) 
        }
        res  
        .attr("d", function (p) {
                return p.path
            });
            
        return this
    },

    shouldRefresh: function() {
        this.init();
        this.smartUpdate();
        this.resize();
    },

    getTooltip: function(time, htmlFormat, includeName){
        var breakChar
        if (htmlFormat){
            breakChar = "<br/>"
        } else {
            breakChar = String.fromCharCode(13)
        }
        var tooltip = "";
        tooltip    += this.m.getStrTime(time, "names")
        tooltip    += breakChar + this.m.getStrTime(time, "sampling_date")
        tooltip    += breakChar + this.m.getStrTime(time, "delta_date")
        return tooltip
    },

    graphListFocus: function(timeFocus){
        var div;
        for (var time = 0; time < this.m.samples.number; time++) {
            div = document.getElementById("time"+time)
            if (div != null){ // at init of graph, these div could be not already created
                div.classList.remove("labelFocusMinor")
                div.classList.remove("labelFocusMajor")
                if (timeFocus != undefined ){
                    if (timeFocus == time){
                        div.classList.add("labelFocusMajor")
                    } else {
                        div.classList.add("labelFocusMinor")
                    }
                }
            }
        }
    }


} //fin Graph
Graph.prototype = $.extend(Object.create(View.prototype), Graph.prototype);










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
                if (this.m.clone(i).hasSizeConstant()) {
                    if (this.m.clone(i).isActive()) {
                        this.total_size[j] += this.m.clone(i).getSize(j); //active clones
                    }
                }
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
            if (this.m.clone(i).hasSizeConstant()) {
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
        }

        //other
        for (j=0; j<this.m.samples.number; j++){
            this.min[this.m.getNumberRealClones()-1][j] = this.sum[j]
            this.sum[this.m.getNumberRealClones()-1] += this.m.clone(this.m.clones.length-1).getSize(j)
            this.max[this.m.getNumberRealClones()-1][j] = this.sum[j]
        }

    }
}
