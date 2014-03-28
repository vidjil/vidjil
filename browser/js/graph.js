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
 */
/* constructor
 *
 * */
function Graph(id, model) {
    this.id = id;
    this.m = model;
    this.resizeW = 1; //coeff d'agrandissement/réduction largeur                
    this.resizeH = 1; //coeff d'agrandissement/réduction hauteur        

    this.marge1 = 0.05; //marge droite bord du graph/premiere colonne
    this.marge2 = 0.05; //marge gauche derniere colonne/bord du graph
    this.marge4 = 80; //marge droite/gauche (non influencé par le resize)
    this.marge5 = 25; //marge top (non influencé par le resize)

    this.data_axis = [];
    this.mobil = {};

    this.drag_on = false;
    this.draged_time_point = 0;

    this.m.view.push(this)

}

Graph.prototype = {

    /* crée le cadre svg pour le graph
     *
     * */
    init: function () {
        document.getElementById(this.id)
            .innerHTML = "";

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
            })

        this.axis_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "axis_container")
        this.polyline_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "polyline_container")
        this.reso_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "reso_container")
        this.date_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "date_container")
        this.text_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", "text_container")


        this.data_graph = [];
        this.data_res = [];
        this.graph_col = [];

        var count = this.m.min_size;
        this.precision = 1;

        while (count < 1) {
            count = count * 10;
            this.precision = this.precision * 10;
        }

        this.scale_x = d3.scale.log()
            .domain([1, this.precision])
            .range([0, 1]);

        this.initAxis();

        for (var i = 0; i < this.m.n_windows; i++) {
            this.data_graph[i] = {
                id: i,
                name: "line" + i,
                path: this.constructPath(i, false)
            };
        }

        this.resolution1 = []
        this.resolution5 = []

        for (i = 0; i < this.m.normalization_factor.length; i++) {
            this.resolution1[i] = (1 / this.m.reads_segmented[i])
            this.resolution5[i] = (5 / this.m.reads_segmented[i])
        }

        this.data_res.push({
            id: this.m.n_windows,
            name: "resolution1",
            path: this.constructPathR(this.resolution1)
        });
        this.data_res.push({
            id: this.m.n_windows + 1,
            name: "resolution5",
            path: this.constructPathR(this.resolution5)
        });

        this.g_graph = this.polyline_container.selectAll("path")
            .data(this.data_graph);
        this.g_graph.enter()
            .append("path")
            .attr("id", function (d) {
                return d.name;
            })
            .transition()
            .duration(500)
            .style("fill", "none")
            .attr("id", function (d) {
                return "poly" + d.name;
            })
        this.g_graph.exit()
            .remove();

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

        this.resize();
    },

    initAxis: function () {

        this.data_axis = [];
        this.graph_col = [];

        //abscisse
        for (var i = 0; i < this.m.time_order.length; i++) {
            this.graph_col[i] = this.marge1 + i * ((1 - (this.marge1 + this.marge2)) / (this.m.time_order.length - 1));
        }
        if (this.m.time_order.length == 1) {
            this.graph_col[0] = 1 / 2
        }
        if (this.m.time_order.length == 2) {
            this.graph_col[0] = 1 / 4;
            this.graph_col[1] = 3 / 4;
        }

        for (var i = 0; i < this.m.time_order.length; i++) {
            d = {}

            var time_name = "fu" + (i + 1);
            if (typeof this.m.time != "undefined" && typeof this.m.time[i] != "undefined") {
                time_name = this.m.time[i];
            }

            d.type = "axis_v";
            d.text = time_name;
            d.orientation = "vert";
            if (this.drag_on && i == this.draged_time_point) {
                var coordinates = [0, 0];
                coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                    .node());
                d.pos = (coordinates[0] - this.marge4) / this.resizeW
            } else {
                d.pos = this.graph_col[this.m.time_order.indexOf(i)];
            }
            d.time = i;
            this.data_axis.push(d);
        }

        var height = 1;

        //ordonnée
        while ((height * this.precision) > 0.5) {

            var d = {};
            d.type = "axis_h";
            d.text = this.m.formatSize(height, false)
            d.orientation = "hori";
            d.pos = 1 - this.scale_x(height * this.precision);
            this.data_axis.push(d);

            height = height / 10;
        }

        //current time_point
        this.mobil = {};
        this.mobil.type = "axis_m";
        this.mobil.text = "";
        this.mobil.orientation = "vert";
        this.mobil.pos = this.graph_col[this.m.t];
        this.data_axis.push(this.mobil)

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
    },

    /* repositionne le graphique en fonction de la taille de la div le contenant
     *
     * */
    resize: function () {
        this.resizeW = document.getElementById(this.id)
            .offsetWidth - this.marge4;
        this.resizeH = document.getElementById(this.id)
            .offsetHeight - this.marge5;

        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", document.getElementById(this.id)
                .offsetWidth)
            .attr("height", document.getElementById(this.id)
                .offsetHeight)
        d3.select("#" + this.id + "_back")
            .attr("width", document.getElementById(this.id)
                .offsetWidth)
            .attr("height", document.getElementById(this.id)
                .offsetHeight);
        d3.select("#" + this.id + "_back2")
            .attr("width", document.getElementById(this.id)
                .offsetWidth - (this.marge4))
            .attr("height", document.getElementById(this.id)
                .offsetHeight);

        this.update();
    },

    /* update l'intégralité du graphique
     *
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        this.initAxis();

        if (this.m.focus != -1) {
            var line = document.getElementById("polyline" + this.m.focus);
            document.getElementById("polyline_container")
                .appendChild(line);
        }
        this.data_res[0].path = this.constructPathR(this.resolution1);
        this.data_res[1].path = this.constructPathR(this.resolution5);

        for (var i = 0; i < this.m.windows.length; i++) {
            for (var j = 0; j < this.m.clones[i].cluster.length; j++) {
                this.data_graph[this.m.clones[i].cluster[j]].path = this.constructPath(i, false);
            }
        }
        for (var i = 0; i < this.m.windows.length; i++) {
            var cloneID = i
            for (var j = 0; j < this.m.clones[cloneID].cluster.length; j++) {
                var seqID = this.m.clones[cloneID].cluster[j]
                if (this.m.clones[cloneID].split) {
                    this.data_graph[seqID].path = this.constructPath(seqID, true);
                } else {
                    this.data_graph[seqID].path = this.constructPath(cloneID, false);
                }
            }
        }
        this.mobil.pos = this.graph_col[this.m.t];
        this.draw();
        elapsedTime = new Date()
            .getTime() - startTime;
        console.log("update Graph: " + elapsedTime + "ms");
    },

    /*update la liste de clones passé en parametre
     *
     * */
    updateElem: function (list) {
        for (var i = 0; i < list.length; i++) {
            var cloneID = list[i]
            for (var j = 0; j < this.m.clones[cloneID].cluster.length; j++) {
                var seqID = this.m.clones[cloneID].cluster[j]
                if (this.m.clones[cloneID].split) {
                    this.data_graph[seqID].path = this.constructPath(seqID, true);
                } else {
                    this.data_graph[seqID].path = this.constructPath(cloneID, false);
                }
            }
        }
        this.updateElemStyle(list)
    },

    updateElemStyle: function (list) {
        if (this.m.focus != -1) {
            var line = document.getElementById("polyline" + this.m.focus);
            document.getElementById("polyline_container")
                .appendChild(line);
        }
        this.drawLines(250);
    },

    /* 
     *
     * */
    drawLines: function (speed) {
        var self = this;

        //courbes
        this.g_graph
            .style("fill", "none")
            .style("stroke", function (d) {
                return self.m.windows[d.id].color;
            })
            .transition()
            .duration(speed)
            .attr("d", function (p) {
                var x = (p.path[0][0] * self.resizeW + self.marge4)
                var y = (p.path[0][1] * self.resizeH + self.marge5)
                var che = ' M ' + x + ',' + y;
                for (var i = 1; i < p.path.length; i++) {
                    x = (p.path[i][0] * self.resizeW + self.marge4)
                    y = (p.path[i][1] * self.resizeH + self.marge5)
                    che += ' L ' + x + ',' + y;
                }
                return che;
            })
            .attr("class", function (p) {
                if (!self.m.windows[p.id].active) return "graph_inactive";
                if (self.m.windows[p.id].select) return "graph_select";
                if (p.id == self.m.focus) return "graph_focus";
                return "graph_line";
            })
            .attr("id", function (d) {
                return "poly" + d.name;
            })
    },

    /* 
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
            .attr("id", function (d) {
                if (d.type == "axis_m") return "timebar"
                return
            });

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
            })
            .attr("id", function (d) {
                if (d.type == "axis_v") return ("time" + d.time);
            })
            .attr("y", function (d) {
                if (d.type == "axis_h") return Math.floor(self.resizeH * d.pos) + self.marge5;
                else return 15;
            })
            .attr("x", function (d) {
                if (d.type == "axis_h") return 40;
                else return Math.floor(self.resizeW * d.pos + self.marge4);
            })
            .attr("class", function (d) {
                if (d.type == "axis_v") return "graph_time"
                else return "graph_text";
            });

        this.text_container.selectAll("text")
            .on("click", function (d) {
                if (d.type == "axis_v") return self.m.changeTime(self.m.time_order.indexOf(d.time))
            })
            .on("dblclick", function (d) {
                if (d.type == "axis_v") return self.rename(d.time)
            })
            .on("mousedown", function (d) {
                if (d.type == "axis_v") return self.startDrag(d.time)
            })

    },


    /* reconstruit le graphique
     *
     * */
    draw: function () {
        var self = this;

        this.drawAxis(500)
        this.drawLines(500)

        //resolution
        this.g_res.selectAll("path")
            .transition()
            .duration(500)
            .attr("d", function (p) {
                var x = (p.path[0][0] * self.resizeW + self.marge4)
                var y = (p.path[0][1] * self.resizeH + self.marge5)
                var che = ' M ' + x + ',' + y;
                for (var i = 1; i < p.path.length; i++) {
                    x = (p.path[i][0] * self.resizeW + self.marge4)
                    y = (p.path[i][1] * self.resizeH + self.marge5)
                    che += ' L ' + x + ',' + y;
                }
                che += ' Z ';
                return che;
            })

        this.polyline_container.selectAll("path")
            .on("mouseover", function (d) {
                self.m.focusIn(d.id);
            })
            .on("click", function (d) {
                self.m.select(d.id);
            });
    },

    /* 
     *
     * */
    rename: function () {

    },

    /* 
     *
     * */
    dragTimePoint: function (time_point) {
        if (this.drag_on) {
            this.initAxis()
            this.drawAxis(0)
        }
    },

    /* 
     *
     * */
    stopDrag: function (time_point) {
        if (this.drag_on) {
            this.drag_on = false;

            //stock tuples time_point/axis position
            var list = []
            for (var i = 0; i < this.m.time_order.length; i++) {
                if (i == this.draged_time_point) {
                    var coordinates = [0, 0];
                    coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                        .node());
                    list.push([i, (coordinates[0] - this.marge4) / this.resizeW]);
                } else {
                    list.push([i, this.graph_col[this.m.time_order.indexOf(i)]]);
                }
            }

            //sort by axis position
            list.sort(function (a, b) {
                return a[1] - b[1]
            })

            var result = [];
            //save new time point order
            for (var i = 0; i < this.m.time_order.length; i++) {
                result[i] = list[i][0]
            }

            this.m.changeTimeOrder(result)
        }
    },

    /* 
     *
     * */
    startDrag: function (time) {
        this.drag_on = true;
        this.draged_time_point = time;
    },

    /* construit le tableau des points par laquelle la courbe de résolution doit passer
     *
     * */
    constructPathR: function (res) {
        if (typeof res != "undefined" && res.length != 0) {
            var p;
            p = [
                [0, 1 + 0.1]
            ];
            
            var size = []
            if (this.m.norm == true){
                for (var i = 0; i < res.length; i++) {
                    size[i] = this.m.normalize(res[this.m.time_order[i]], this.m.time_order[i])
                }
            }else{
                for (var i = 0; i < res.length; i++) {
                    size[i] = res[this.m.time_order[i]]
                }
            }
                
            p.push([0, (1 - this.scale_x(size[0] * this.precision))]);

            for (var i = 0; i < this.graph_col.length; i++) {
                p.push([(this.graph_col[i]), (1 - this.scale_x(size[i] * this.precision))]);
            }
            p.push([1, (1 - this.scale_x(size[this.graph_col.length - 1] * this.precision))]);
            p.push([1, 1 + 0.1]);

            return p;
        } else return [[0, 0]];
    }, //fin constructPathR()

    /* construit le tableau des points par laquelle la courbe d'un clone doit passer
     *
     * */
    constructPath: function (id, seq_size) {
        t = 0;
        var p;

        var size = []
        for (var i = 0; i < this.graph_col.length; i++) {
            if (seq_size) size[i] = this.m.getSequenceSize(id, i)
            else size[i] = this.m.getSize(id, i)
        }

        var x = this.graph_col[0];
        var y = this.scale_x(size[0] * this.precision)

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
                    y = this.scale_x(size[i] * this.precision)

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
        return p;
    }, //fin constructPath

} //fin Graph