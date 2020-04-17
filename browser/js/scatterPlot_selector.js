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
 * ScatterPlot_selector
 * */

function ScatterPlot_selector() {

        //Boolean for the nodes selector
        this.active_selector = false

        //Boolean given to the nodes movements
        this.active_move = false    


        this.positionToMove =   {
                                    originx: 0,
                                    originy: 0,
                                    x: 0,
                                    y: 0
                                }
    
        //mouse coordinates
        this.coordinates = [0, 0]

        this.mousedown = 0

}

ScatterPlot_selector.prototype = {

    initSelector: function (){
        var self = this

        //multi-node selector
        d3.select("#" + this.id + "_svg")
            .on("mousedown", function() {
                self.mousedown = true
                //self.activeSelector();
                self.m.unselectAllUnlessKey(d3.event)
            })
        $("body")
            .bind("mouseup", function(e) {
                self.mousedown = false
                d3.event = e;
                if (self.active_selector)
                    self.stopSelector()
            })
            .bind("mousemove", function(e) {
                d3.event = e;
                if (!self.active_selector && self.mousedown) 
                    self.activeSelector()
                self.updateSelector()
            })


        //drag&drop/focus/select singlenode 
        this.plot_container.selectAll("circle")
            .call(d3.drag()
                .on("start", function(d){return self.dragstarted(d)})
                .on("drag", function(d){return self.dragged(d)})
                .on("end", function(d){return self.dragended(d)})
            )            
            .on("mouseover", function(d) {
                if (!self.isDragging)
                    self.m.focusIn(d.id)
            })
            .on("mouseout", function(d) {
                if (!self.isDragging)
                    self.m.focusOut();
            })
            .on("click", function(d) {
                self.clickNode(d.id)
            });

        this.bar_container.selectAll("rect")
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            .on("mouseout", function(d) {
                self.m.focusOut();
            })
            .on("click", function(d) {
                self.clickNode(d.id);
            })
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
                    node_x = node.bar_x + this.margin[3];
                    var mid_y = node.bar_y + node.bar_h / 2; // bar_x represents the middle of the rectangle, but not bar_y
                    node_y = mid_y + this.margin[0];
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
    }

}