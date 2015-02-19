/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
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
function ScatterPlot(id, model) {
    this.id = id; //ID of the scatterPlot div
    this.m = model; //Model object

    //size ( computed value -> resize() function)
    this.resizeCoef = 1; //Multiplifying factor, application to nodes radius
    this.resizeW = 1; //scatterplot width
    this.resizeH = 1; //scatterplot height
    this.gridSizeW = 1; //grid width
    this.gridSizeH = 1; //grid height

    //Margins left/right ( fixed value )
    this.marge_left = 100;
    this.marge_right = 10;
    this.marge_top = 45;
    this.marge_bot = 10;

    this.max_precision = 9; //Precision max (default: 9)

    /* EDIT DISTANCE ONLY
       BEG --
    */
    this.mouseZoom = 1; //Zoom (scroll wheel)
    this.reinit = false; //Boolean used to know the physics engine state (reinit/init)
    this.continue = false; //Boolean used for the nodes movements
    this.allEdges = new Array(); //Initial edges array
    this.edgeSaved = new Array(); //Edges array saved for the Edit Distance visualization
    this.edge = new Array(); //Edges array given to the engine
    this.edgeContainer = null; //SVG element to save the container of graph distribution
    this.active_move = false; //Boolean given to the nodes movements
    this.reloadCharge = true; //Boolean allowing to reload the physic engine charge (reject)
    this.canSavePositions = true; //Boolean which allows to save initial positions of nodes
    this.initialPositions = []; //Initial positions of all nodes - usefull when calling reinit_motor()
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

    this.splitY = "gene_j"; //Distribution method, for the Y axis
    this.splitX = "gene_v"; //Distribution method, for the X axis

    this.m.view.push(this); //Model's sync

    this.time0 = Date.now(), //Initial date saved
        this.time1 = this.time0; //Frames computed
    this.fpsqueue = []; //Numbers of frames computed, according to the 20th last values

    //Booléen pour le sélecteur de nodes
    this.active_selector = false

    //axis X text position
    this.rotation_x = 0;
    this.text_position_x = 15;
    this.sub_text_position_x = 30;

    //axis Y text position
    this.rotation_y = 0;
    this.text_position_y = 40;
    this.sub_text_position_y = 80;

    //Clone selected
    this.cloneSelected = -1;

    //mouse coordinates
    this.coordinates = [0, 0];

    //Menu without graph distrib'
    this.menu = [
        ["gene_v", "gene V"],
        ["gene_j", "gene J"],
        ["allele_v", "allele V"],
        ["allele_j", "allele J"],
        ["Size", "abundance"],
        ["sequenceLength", "clone length"],
        ["n", "N length"],
        ["lengthCDR3", "CDR3 length"]
    ];

    //Menu with graph distrib' (see initMenu function)
    this.graph_menu = [
        ["dbscan", "Dbscan graph"],
        ["graph", "Edit dist. graph"]
    ];

    this.axisX = new Axis(this.m)
    this.axisY = new Axis(this.m)
    this.use_system_grid = false
}

/*
Déclaration des fonctions attribuées à l'objet
*/
ScatterPlot.prototype = {

    /* Fonction permettant l'initialisation complète du ScatterPlot
     */
    init: function() {
        myConsole.log("ScatterPlot " + this.id + ": init()");

        document.getElementById(this.id)
            .innerHTML = "";

        this.initMenu();
        this.initSVG();
        this.axisX.useGermline(this.m.germlineV, "V")
        this.axisY.useGermline(this.m.germlineJ, "J")
        this.changeSplitMethod(this.splitX, this.splitY);
        this.resize();
    },

    /* Fonction permettant l'initialisation d'un élément SVG contenu dans le Scatterplot, pour D3JS
     */
    initSVG: function() {
        var self = this;

        this.label_container = d3.select("#" + this.id)
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
        d3.select("body")
            .on("mouseup", function() {
                self.stopSelector()
            })
        d3.select("body")
            .on("mousemove", function() {
                self.updateSelector()
            })

        //Sélection du contenu de l'axe des X -> Ajout d'un attribut valant un id
        this.axis_x_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_x_container")

        //Sélection du contenu de l'axe des X -> Ajout d'un attribut valant un id
        this.axis_y_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_y_container")

        //Sélection du contenu des points -> Ajout d'un attribut valant un id
        this.plot_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_plot_container")


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

        //Initialisation des nodes
        this.nodes = d3.range(this.m.clones.length)
            .map(Object);
        for (var i = 0; i < this.m.clones.length; i++) {
            this.nodes[i].id = i; //L'id d'un cercle vaut le nombre de i dans la boucle
            this.nodes[i].r1 = 5; // longueur du rayon1
            this.nodes[i].r2 = 5; // longueur du rayon2
            this.nodes[i].x = Math.random() * 500;
            this.nodes[i].old_x = [0, 0, 0, 0, 0]
            this.nodes[i].y = Math.random() * 250;
            this.nodes[i].old_y = [0, 0, 0, 0, 0]
        };

        //Initialisation of tmp array which contains all the edges
        this.allEdges = this.m.links;
        //Initialisation of array which contains all the usefull edges for the Edit Distane visualization
        this.edge = this.keepUsefullEdgesForEditDistanceGraph(this.allEdges);

        /*
        //DBSCAN algorithm loading
        this.m.loadDBSCAN(this);
        //DBSCAN sliders values loading
        this.m.changeSliderValue(true, "DBSCANNbrSlider", "Nbr ", this.m.nbr);
        this.m.changeSliderValue(true, "DBSCANEpsSlider", "Eps ", this.m.eps);
        */

        //Initialisation of the D3JS physic engine
        this.force = d3.layout.force();
        this.initMotor();
        this.force
            .nodes(this.nodes) //Nodes array initialisation
            .on("tick", this.tick.bind(this)); // on -> Listen updates compared to modified positions

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
                return "circle" + d.id;
            })
            //Attribution de l'activité des cercles (inactif, sélectionné, demande d'info ou autre)
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_inactive";
                if (self.m.clone(p.id)
                    .isSelected()) return "circle_select";
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

    /* Function which allows to return the number of active clones
     */
    returnActiveclones: function() {
        var activeclones = 0;
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.clone(i)
                .isActive()) activeclones += 1;
        }
        return activeclones;
    },

    /* Function which allows to initialize the D3JS engine - usefull with reinitMotor()
     * */
    initMotor: function() {
        this.force
            .gravity(0) //No gravity
            .theta(0) //Default value: 0.8
            .charge(0) //Default value: -1
            .friction(0.75) //Velocity
            .size([1, 1]);
        //Previous graph destruction
        this.unsetGraphLinks();
        //Free nodes
        this.fixedAllClones(false);
    },

    /* Function which permits to modify the D3JS physic engine, compared to the graph distribution
     * */
    graphMotor: function() {
        var self = this;
        this.force
            //Added greater 'alpha' to obtains a larger nodes animation
            .alpha(100)
            //Gravity only for Edit Distance - no gravity to DBSCAN for fixed nodes in the SVG frame (without charge between nodes)
            .gravity(function(d) {
                if (self.dbscanActive) return 0;
                else return -0.001
            })
            //Added edges array (different according to the graphe visualization)
            .links(self.edge)
            /*
            LinkDistance:
                -Edit Distance = Distance power 1.3, with zoom and coeff parameters
                -DBSCAN = 2 choices:
                                    -> CORE node = default length (see DBSCANLength) and zoom + coeff parameters
                                    -> NEAR node = attribution  of a superior length
            */
            .linkDistance(function(d) {
                if (self.dbscanActive && (self.m.clone(d.source)
                        .tagCluster == "CORE" || self.m.clone(d.target)
                        .tagCluster == "CORE"))
                    return (self.DBSCANLength * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
                else {
                    //Added length between nodes to let the CORE node at the middle of the cluster
                    if (self.dbscanActive) return (8 * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
                }
                if (!self.dbscanActive) return (Math.pow(d.len, 1.4) * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
            })
            .charge(function(d) {
                if (self.reloadCharge) {
                    return -1;
                }
            }) //Allows to act to the DBSCAN visualization -> clusters with length not equals to 1 are rejected -> independant clusters = independant graphs 
            .linkStrength(1) //Added strong strength
            .size([self.resizeW - 50, self.resizeH - 50]);
        this.setGraphLinks(); //Edges initialization in the graph
    },

    /* Function which allows to initialize the edges creation, for the D3JS engine
     * */
    setGraphLinks: function() {
        var self = this;
        //Add links selected, added data
        var allLinks = this.grpLinks
            .selectAll("line")
            //Attributing to each 'line' object a data contains in the edges array, give with the engine initialization
            .data(self.edge);
        //Added real edges (see setEdgeContainer developer documentation)
        this.setEdgeContainer(allLinks);
    },

    /*  Function which allow to initialize/re-initialize the edges array of the graph, and unset lines
     * */
    unsetGraphLinks: function() {
        this.force.links([]); //The engine not contains links
        this.grpLinks.selectAll("line")
            .remove(); //Useless links are delete
    },

    /* Function which allows to re-initialize the D3JS engine, according to the visualization
     * -> If visualization 'DBSCAN' -> New configuration fo the physic engine (see 'graphMotor')
     * -> Else, configuration by default of the engine (see 'init_motor')
     * */
    reinit_motor: function() {
        this.m.resetClusters();
        if (!this.reinit) {
            //The configuration of the engine is active
            this.reinit = true;
            //All the nodes positions are saved
            if (this.canSavePositions)
                this.saveInitialPositions();
            //Permission to save all positions is now delete - in order to not save initial positions of nodes when switching: DBSCAN -> Edit Distance OR Edit Distance -> DBSCAN
            this.canSavePositions = false;
            //Re-init of X/Y axis
            this.switchInitMenu();
            /* Relaunch of the physic engine ->
             * If DBSCAN mode is activated, we compute the DBSCAN object
             * Else, relaunch of the engine for Edit Distance visualization 
             */
            if (this.dbscanActive) {
                this.activeSliderDistanceMax(false);
                this.runGraphVisualization("dbscan");
            } else this.runGraphVisualization("edit_distance");
            //Charge disabled
            this.reloadCharge = false;
            //Activation of the slider to move the distanceMax parameter, IF AND ONLY IF the Edit Distance visualization is activated
            if (!this.dbscanActive) {
                this.activeSliderDistanceMax(true);
            }
        } else {
            //Graph mode disabled
            this.reinit = false;
            //Reloading of the charge
            this.reloadCharge = true;
            //Allow to save all nodes
            this.canSavePositions = true;
            //Re-init grid (for 'normal' distribution)
            this.initGrid();
            //Re-init of X/Y axis menu (see switchInitMenu doc)
            this.switchInitMenu();
            //Motor by default
            this.initMotor();
            //Reloading of the initial positions of nodes
            this.reinitInitialPositions();
            //Reloading of physic engine
            this.force.start();
            //Reloading of graph distribution axis
            this.m.update();
            //Edit Distance slider disabled
            this.activeSliderDistanceMax(false);
        }
    },

    /* Function which allows to run a graph visualization
     * @param viewing: the visualization given
     */
    runGraphVisualization: function(viewing) {
        //All the links are now erased
        this.unsetGraphLinks();
        //Compute edges, according to the visualization given
        switch (viewing) {
            case "dbscan":
                this.computeDBSCANEdges();
                break;
            case "edit_distance":
                this.computeEditDistanceEdges();
                break;
        }
        //Re-init the physic engine
        this.graphMotor();
        //Added color to edges, according to the visualization given
        this.addColorEdge();
        //We allow to separate clusters
        this.reloadCharge = true;
        //Reload the physic engine
        this.force.start();
        //Charge disabled -> no separation of clusters by charge
        this.reloadCharge = false;
    },

    /* Function which allows to create physically edges (see D3JS developer documentation on enter() and remove())
     * @allEdges: array of all edges
     */
    setEdgeContainer: function(allEdges) {
        //Added SVG 'line' element -> "line_active" 'cause no apparition of links - links will be active when manual selection of one or more clone(s)
        this.edgeContainer = allEdges.enter()
            .append("svg:line")
            .attr("class", "line_inactive")
            .on("mouseover", function(d) {
                self.m.focusEdge(d);
            });
    },

    /* Function which permits to add a color for each object which is contains in the initial edges array
     */
    addColorEdge: function() {
        //DBSCAN visualization case
        if (this.dbscanActive) {
            for (var i = 0; i < this.edge.length; i++) {
                //Yellow color attributed to edges which have source or target, with tag 'CORE'
                if (this.m.clone(this.edge[i].source)
                    .tagCluster == "CORE" || this.m.clone(this.edge[i].target)
                    .tagCluster == "CORE")
                    this.edge[i].color = "yellow";
                else
                //Red color attributed to edges which have source or target, with tag 'NEAR' (neighbors)
                if (this.m.clone(this.edge[i].source)
                    .tagCluster == "NEAR" || this.m.clone(this.edge[i].target)
                    .tagCluster == "NEAR")
                    this.edge[i].color = "red";
            }
        }
        //Edit Distance visualization case
        else {
            for (var i = 0; i < this.edge.length; i++) {
                //If the link's length is lower than distanceMax, color the link
                if (this.edge[i].len <= this.distanceMax)
                //colorGenerator usage for color red (0) to blue (270), by gap: 270/distanceMax
                    this.edge[i].color = colorGenerator((270 / this.distanceMax) * this.edge[i].len, color_s, color_v);
                //If the link is not interesting, we attribute the white color (usefull for the activeAllLine() function)
                else this.edge[i].color = "white";
            }
        }
    },

    /* Function which allows to compute usefull edges in dataset, for the DBSCAN graph visualization
     */
    computeDBSCANEdges: function() {
        this.edge = self.keepUsefullEdgesForDBSCANGraph(self.allEdges);
    },

    /* Function which allows to compute usefull edges in dataset, for the Edit Distance graph visualization
     */
    computeEditDistanceEdges: function() {
        this.edge = self.keepUsefullEdgesForEditDistanceGraph(self.allEdges);
    },

    /* Function which allows to keep only edges which concerns nodes in specific cluster -> verification done to see if source and target is in the same cluster
       @param tmp: array of all edges
     */
    keepUsefullEdgesForDBSCANGraph: function(tmp) {
        var returnedTab = [];
        if (typeof tmp != 'undefined') {
            for (var i = 0; i < tmp.length; i++) {
                if (this.m.clone(tmp[i].source)
                    .cluster == this.m.clone(tmp[i].target)
                    .cluster) {
                    returnedTab.push(tmp[i]);
                }
            }
        }
        return returnedTab;
    },

    /* Function which allows to keep only edges which length is lower than distanceMax
       @param tmp: array of all edges
     */
    keepUsefullEdgesForEditDistanceGraph: function(tmp) {
        var returnedTab = [];
        if (typeof tmp != 'undefined') {
            //Sorted array, according to growing edges length
            tmp.sort(function(a, b) {
                if (a.len < b.len) return -1;
                if (a.len > b.len) return 1;
                return 0
            });
            for (var i = 0; i < tmp.length; i++) {
                //Keep only edges lower or equals than distanceMax
                if (tmp[i].len <= this.distanceMax)
                    returnedTab.push(tmp[i]);
                else
                    break;
            }
        }
        return returnedTab
    },

    /* Fonction permettant d'initialiser le menu contenant les axes, ainsi que tout autre élément n'étant pas du SVG
     * */
    initMenu: function() {
        var self = this;

        //Initialisation du menu sans graphes

        //Création d'un div fils valant des infos concernant l'axe des X dans la classe
        var div_x = document.createElement('div');
        div_x.className = "axis_select axis_select_x";

        //Création d'un div fils valant des infos concernant l'axe des Y dans la classe
        var div_y = document.createElement('div');
        div_y.className = "axis_select axis_select_y";

        //Création d'un select (menu avec options déroulantes) pour l'axe des X
        var select_x = document.createElement('select');
        //Initialisation du menu déroulant
        select_x.setAttribute('name', 'select_x[]');
        select_x.id = "select_x"
            //Changement du menu en fonction de la demande
        select_x.onchange = function() {
            self.changeXaxis(this);
        }

        //Création d'un select (menu avec options déroulantes) pour l'axe des Y
        var select_y = document.createElement('select');
        //Initialisation du menu déroulant
        select_y.setAttribute('name', 'select_y[]');
        select_y.id = "select_y"
            //Changement du menu en fonction de la demande
        select_y.onchange = function() {
            self.changeYaxis(this);
        }

        //Ajout de chaque méthode de répartition dans les menus pour l'axe des X/Y
        for (var i = 0; i < this.menu.length; i++) {

            var element = document.createElement("option");
            element.setAttribute('value', this.menu[i][0]);
            var text = document.createTextNode(this.menu[i][1]);
            element.appendChild(text);

            var element2 = element.cloneNode(true);

            select_x.appendChild(element);
            select_y.appendChild(element2);

        }

        //On ajoute ce qui a été précédemment créé aux élèments fils
        div_x.appendChild(select_x);
        div_y.appendChild(select_y);

        /*Graph menu initialization*/

        var divParent = document.getElementById(this.id)

        var div_graph = document.createElement('div');
        div_graph.className = "axis_select axis_select_graph"

        var select_graph = document.createElement('select');
        select_graph.setAttribute('name', 'select_graph[]');
        select_graph.id = "select_graph"

        select_graph.onchange = function() {
            self.changeXaxis(this);
        }

        for (var i = 0; i < this.graph_menu.length; i++) {
            var element = document.createElement("option");
            element.setAttribute('value', this.graph_menu[i][0]);
            var text = document.createTextNode(this.graph_menu[i][1]);
            element.appendChild(text);

            select_graph.appendChild(element);

        }

        div_graph.appendChild(select_graph);

        //Added all childs
        divParent.appendChild(div_x);
        divParent.appendChild(div_y);
        divParent.appendChild(div_graph);
    },

    /*Function which allows to switch between initial menu and graph menu*/
    switchInitMenu: function() {
        var axis_select_x = document.getElementsByClassName("axis_select_x");
        var axis_select_y = document.getElementsByClassName("axis_select_y");
        var graph_selector = document.getElementsByClassName("axis_select_graph");
        for (var i = 0; i < axis_select_x.length; i++)
            axis_select_x[i].style.display = this.reinit ? "none" : "block";
        for (var i = 0; i < axis_select_y.length; i++)
            axis_select_y[i].style.display = this.reinit ? "none" : "block";
        for (var i = 0; i < graph_selector.length; i++)
            graph_selector[i].style.display = this.reinit ? "block" : "none";
    },

    /* Function which allows to update edges of graph
     * */
    updateGraph: function() {
        this.setGraphLinks();
    },

    /* Function which allows to initialize SVG element for the Diagram distribution
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
                return "bar" + d.id;
            })
            .attr("width", 30)
            .attr("height", 50)
            .attr("y", self.resizeH + self.marge_top)
            //Retourne la couleur attribuée au SVG -via CSS:style.fill- pour chaque fenÃªtre dans le contenu de l'objet model
            .style("fill", function(d) {
                return (self.m.clone(d.id)
                    .getColor());
            })
            //Affichage de la fenêtre contenue dans l'objet model, via son ID
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            //Sélection de la fenêtre contenue dans l'objet model, via son ID
            .on("click", function(d) {
                self.m.select(d.id);
            })
    },

    /* Fonction permettant la mise à jour de l'élément SVG concernant le graphe 'diagramme'
     * */
    updateBar: function() {
        self = this

        this.vKey = Object.keys(this.m.germlineV.gene);
        this.vKey.push("undefined V");
        this.bar_v = {};
        this.bar_max = 0;
        this.bar_width = (0.5 * (1 / this.vKey.length)) * this.resizeW

        //Initialisation du tableau d'objets
        for (var i = 0; i < this.vKey.length; i++) {
            this.bar_v[this.vKey[i]] = {}
            this.bar_v[this.vKey[i]].clones = [];
            this.bar_v[this.vKey[i]].totalSize = 0;
            this.bar_v[this.vKey[i]].currentSize = 0;
        }

        //classement des clones suivant V
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.clone(i)
                .isActive()) {
                var geneV = this.m.clone(i)
                    .getV(false);
                var clone = {
                    id: i
                }
                if (typeof this.bar_v[geneV] == 'undefined') geneV = "undefined V"
                this.bar_v[geneV].clones.push(clone);
                this.bar_v[geneV].totalSize += this.m.clone(i)
                    .getSize();
            }
        }

        //classement des clones suivant J
        for (var i = 0; i < this.vKey.length; i++) {
            if (this.bar_v[this.vKey[i]].totalSize > this.bar_max)
                this.bar_max = this.bar_v[this.vKey[i]].totalSize;
            this.bar_v[this.vKey[i]].clones.sort(function(a, b) {
                var ja = self.m.clone(a.id)
                    .getJ();
                var jb = self.m.clone(b.id)
                    .getJ();
                return jb - ja
            });
        }

        //calcul des positions y
        for (var i = 0; i < this.vKey.length; i++) {
            var somme = 0;
            for (var j = 0; j < this.bar_v[this.vKey[i]].clones.length; j++) {
                somme += this.getBarHeight(this.bar_v[this.vKey[i]].clones[j].id);
                this.bar_v[this.vKey[i]].clones[j].pos = 1 - somme;
            }
        }

        self.axisY.computeCustomLabels(0, this.bar_max, true, true, true);

        //redraw
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            .attr("id", function(d) {
                return "bar" + d.id;
            })
            .attr("width", this.bar_width)
            .attr("x", function(d) {
                return self.axisX.pos(d.id) * self.resizeW - (self.bar_width / 2) + self.marge_left;
            })
            .attr("height", function(d) {
                return self.getBarHeight(d) * self.resizeH;
            })
            .attr("y", function(d) {
                if (!self.m.clone(d.id)
                    .isActive()) return self.resizeH + self.marge_top;
                return (self.getBarPosition(d) * self.resizeH) + self.marge_top;
            })
            .style("fill", function(d) {
                return (self.m.clone(d.id)
                    .getColor());
            })
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_hidden";
                if (self.m.clone(p.id)
                    .isSelected()) return "circle_select";
                if (self.m.clone(p.id)
                    .isFocus()) return "circle_focus";
                return "circle";
            })

    },

    /* Fonction permettant de désactiver la distribution "Bar"
     * */
    endBar: function() {
        this.initBar();
        var self = this;
        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            .attr("class", function(p) {
                return "circle_hidden";
            })
    },

    /* Fonction permettant de calculer la hauteur d'un 'bar' pour un clone donné (ID du clone)
     * @param cloneID: l'ID du clone
     * */
    getBarHeight: function(cloneID) {
        var size = this.m.clone(cloneID)
            .getSize();
        return size / this.bar_max;
    },

    /* Fonction permettant de calculer la position d'un 'bar' pour un clone donné (ID du clone)
     * @param cloneID: l'ID du clone
     * */
    getBarPosition: function(cloneID) {
        for (var i = 0; i < this.vKey.length; i++) {
            for (var j = 0; j < this.bar_v[this.vKey[i]].clones.length; j++) {
                if (this.bar_v[this.vKey[i]].clones[j].id == cloneID)
                    return this.bar_v[this.vKey[i]].clones[j].pos;
            }
        }
    },

    buildSystemGrid: function() {
        this.systemGrid = {
            "label": []
        }
        var n = this.m.system_available.length
        var h = this.resizeH
        var w = this.resizeW * 0.2

        //compute hidden position for unactivated germline (to avoid firework effect)
        for (var key in this.m.system_available) {
            var system = this.m.system_available[key]
            this.systemGrid[system] = {
                'x': 0.99,
                'y': 0.99
            }
        }

        //compute position for selected germline
        var i = 0;
        for (var key in this.m.system_available) {

            var system = this.m.system_available[key]

            var enabled = false
            if (this.m.system_selected.indexOf(system) != -1) enabled = true

            var xpos = 0.8

            if (system != this.m.germlineV.system) {
                this.systemGrid["label"].push({
                    "text": system,
                    "enabled": enabled,
                    "x": xpos + 0.01,
                    "y": ((i * 2) + 1) / (n * 2)
                })
            } else {
                this.systemGrid["label"].push({
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

    /* Recalcule les coefficients d'agrandissement/réduction, en fonction de la taille de la div
     * */
    resize: function(div_width, div_height) {
        var print = true
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            var div_height = div.offsetHeight
            var div_width = div.offsetWidth
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
    },

    compute_size: function(div_width, div_height, print) {
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            var div_height = div.offsetHeight
            var div_width = div.offsetWidth
        }
        //On prend la largeur de la div
        this.resizeW = div_width - this.marge_left - this.marge_right;
        //On prend la hauteur de la div
        this.resizeH = div_height - this.marge_top - this.marge_bot;

        if (this.splitY != "bar" && (this.splitX == "allele_v" || this.splitX == "gene_v" || this.splitX == "allele_j" || this.splitX == "gene_j" || this.splitY == "allele_v" || this.splitY == "gene_v" || this.splitY == "allele_j" || this.splitY == "gene_j")) {
            this.use_system_grid = true;
            this.buildSystemGrid()
        } else {
            this.use_system_grid = false
            this.systemGrid = {}
        }

        if (!print && this.splitY != "bar" && this.use_system_grid && this.m.system_available.length > 1) {
            this.gridSizeW = 0.8 * this.resizeW;
            this.gridSizeH = 1 * this.resizeH;
        } else {
            this.gridSizeW = this.resizeW;
            this.gridSizeH = this.resizeH;
        }

        this.resizeCoef = Math.sqrt(this.resizeW * this.resizeH);
        if (this.resizeCoef < 0.1 || (this.resizeW * this.resizeH) < 0) this.resizeCoef = 0.1;

        return this;
    },

    /* Function which allows to add a stroke attribute to all edges
     */
    addColor: function() {
        this.edgeContainer
            .style("stroke", function(d) {
                return d.color;
            });
    },

    /*Function which permits to compute and add edges positions, according to source and target nodes
     */
    addPosition: function() {
        var self = this;
        //self.marge = margin top and left given in the scatterPlot
        this.edgeContainer
            //Awarding of the source position
            .attr("x1", function(d) {
                return (d.source.px + self.marge_left);
            })
            .attr("y1", function(d) {
                return (d.source.py + self.marge_top);
            })
            //Awarding of the target position
            .attr("x2", function(d) {
                return (d.target.px + self.marge_left);
            })
            .attr("y2", function(d) {
                return (d.target.py + self.marge_top);
            });
    },

    fastForward: function() {
        this.force.stop()
        for (var i = 0; i < 500; i++) this.computeFrame()
        this.drawFrame()
    },

    /* Fonction permettant le calcul d'une étape d'animation
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

    computeFrame: function() {
        var self = this;

        this.active_node = this.node.filter(function(d, i) {
            return d.r2 > 0.1;
        });

        //mise a jour des rayons( maj progressive )
        this.node.each(this.updateRadius());

        this.active_node.each(this.debugNaN())
            //deplace le node vers son objectif
        this.active_node.each(this.move());
        //résolution des collisions
        var quad = d3.geom.quadtree(this.nodes)

        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].r1 > 0.1) {
                quad.visit(this.collide(this.nodes[i]));
            }
        }
        this.active_node.each(this.debugNaN())

        return this
    },

    drawFrame: function() {
        this.active_node
            //attribution des nouvelles positions/tailles
            .attr("cx", function(d) {
                return (d3.mean(d.old_x) + self.marge_left);
            })
            .attr("cy", function(d) {
                return (d3.mean(d.old_y) + self.marge_top);
            })
            .attr("r", function(d) {
                return (d.r2);
            })
            .attr("title", function(d) {
                return (self.m.clone(d.id)
                    .getName());
            })
    },

    /* Fonction permettant le déplacement des nodes en fonction de la méthode de répartition utilisée à l'instant T
     * */
    move: function() {
        self = this;
        return function(d) {
            d.old_x.push(d.x);
            d.old_x.shift();
            if (d.x != d.x2) {
                var delta = d.x2 - d.x;
                var s = ((d.r1 / self.resizeCoef))
                d.x += 0.015 * delta
            }
            d.old_y.push(d.y);
            d.old_y.shift();
            if (d.y != d.y2) {
                var delta = d.y2 - d.y;
                var s = ((d.r1 / self.resizeCoef))
                d.y += 0.015 * delta
            }
        }
    },


    /* Fonction permettant de mettre à jour les rayons de chaque cercle
     * Précision: r2 = rayon affiché // r1 = rayon a atteindre
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

    /* Fonction permettant de repositionner les nodes, ayant des positions impossibles a afficher
     * */
    debugNaN: function() {
        return function(d) {
            //Repositionnement dans l'axe des X si position non-déterminée/infinie
            if (!isFinite(d.x)) {
                d.x = Math.random() * 500;
            }
            //Repositionnement dans l'axe des Y si position non-déterminée/infinie
            if (!isFinite(d.y)) {
                d.y = Math.random() * 500;
            }
        }
    },

    collide: function(node) {
        var r = node.r2 + 30,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node) && quad.point.r1 != 0) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.r2 + quad.point.r2 + 2;
                if (l < r) {
                    var c1 = node.s
                    var c2 = quad.point.s
                    var w = (c2 / (c1 + c2))
                    l = (l - r) / l * w;
                    node.x -= x *= l;
                    node.y -= y *= l;
                }
                /*
                                if (l < r) {
                                    l = (l - r) / l * .5;
                                    node.x -= x *= l;
                                    node.y -= y *= l;
                                    quad.point.x += x;
                                    quad.point.y += y;
                                }*/
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
    },

    /* Fonction permettant de mettre à jour les données du ScatterPlot, et de relancer une sequence d'animation
     * */
    update: function() {
        var self = this;
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        this.compute_size()
            .updateClones()
            .updateMenu()
            .initGrid();

        //Donne des informations quant au temps de MàJ des données
        elapsedTime = new Date()
            .getTime() - startTime;
        myConsole.log("update sp: " + elapsedTime + "ms", -1);
    },

    updateClones: function() {
        if (this.splitY == "bar" && !this.reinit) {
            this.updateBar();
        } else {
            for (var i = 0; i < this.nodes.length; i++) {
                this.updateClone(i);
            }
            this.force.start();
            this.updateElemStyle();
        }

        if (this.m.germlineV.system != this.system) {
            this.system = this.m.germlineV.system
            this.changeSplitMethod(this.splitX, this.splitY)
        }
        return this;
    },

    /* Fonction permettant de mettre à jour les données liées à tous les clones présents dans une liste -> FONCTION DEPRECATED ?????
     * @param list: Une liste contenant tous les clones à mettre à jour
     * */
    updateElem: function(list) {
        this.update();
    },

    /* Fonction permettant de mettre à jour les données liées à un seul clone
     * @param cloneID: ID d'un clone
     * */
    updateClone: function(cloneID) {
        if (this.m.clone(cloneID)
            .isActive()) {

            if (this.m.clone(cloneID)
                .split) {
                for (var i = 0; i < this.m.clusters[cloneID].length; i++) {
                    var seqID = this.m.clusters[cloneID][i]
                    var size = this.m.clone(seqID)
                        .getSequenceSize();
                    this.nodes[seqID].s = size
                        //Math.pow(x,y) -> x**y
                    if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                    this.nodes[seqID].r1 = size
                }
            } else {
                for (var i = 0; i < this.m.clusters[cloneID].length; i++) {
                    var seqID = this.m.clusters[cloneID][i]
                    this.nodes[seqID].s = 0
                    this.nodes[seqID].r1 = 0
                }
                var size = this.m.clone(cloneID)
                    .getSize2();
                if (this.m.clusters[cloneID].length == 0) size = this.m.clone(cloneID)
                    .getSequenceSize();
                this.nodes[cloneID].s = size
                if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                this.nodes[cloneID].r1 = size
            }

        } else {
            this.nodes[cloneID].r1 = 0
            this.nodes[cloneID].s = 0
        }
        var sys = this.m.clone(cloneID)
            .getSystem()
        if (this.use_system_grid && this.m.system == "multi" && typeof sys != 'undefined' && sys != this.m.germlineV.system) {
            this.nodes[cloneID].x2 = this.systemGrid[sys].x * this.resizeW
            this.nodes[cloneID].y2 = this.systemGrid[sys].y * this.resizeH
        } else {
            this.nodes[cloneID].x2 = this.axisX.pos(cloneID) * this.gridSizeW
            this.nodes[cloneID].y2 = this.axisY.pos(cloneID) * this.gridSizeH
        }

    },

    /* Function which allows to re-init all points to a (no-)fixed position
     * @bool: True -> fix / False -> no-fix
     */
    fixedAllClones: function(bool) {
        for (var i = 0; i < this.nodes.length; i++)
            this.nodes[i].fixed = bool;
    },

    /* Function which permits to force all no-clustered clones, to return at their initial position
     */
    forceNodesToStayInInitialPosition: function() {
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.dbscan.clusters[this.m.clone(i)
                    .cluster].length == 1) {
                //Calcul du delta
                var x = this.nodes[i].x;
                var y = this.nodes[i].y;
                var deltaX = this.initialPositions[i].initPosX - x;
                var deltaY = this.initialPositions[i].initPosY - y;
                this.nodes[i].x += 5 * deltaX / 100;
                this.nodes[i].y += 5 * deltaY / 100;
            }
        }
    },

    /* Save clones positions in object which contains x/y coordinates (usefull for init_motor -> graphMotor)
     * Usefull function to force clones to return at their initial position IF the clone is not in a cluster, for the DBSCAN visualization
     */
    saveInitialPositions: function() {
        function newObject(x, y) {
            this.initPosX = x;
            this.initPosY = y;
        };
        for (var i = 0; i < this.nodes.length; i++) {
            this.initialPositions.push(new newObject(this.nodes[i].x, this.nodes[i].y));
        }
    },

    /* Function which permits to add X/Y margins to the initialPositions array (which contains initial positions of all nodes) - usefull for the selector movements
     * @marginX: margin left
     * @marginY: margin top
     */
    addNextPositionsToClones: function(marginX, marginY) {
        for (var i = 0; i < this.nodes.length; i++) {
            //Added X margin
            this.initialPositions[i].initPosX += marginX;
            //Added Y margin
            this.initialPositions[i].initPosY += marginY;
        }
    },

    /* Function which re-init initial positions of all clones
     */
    reinitInitialPositions: function() {
        this.initialPositions = [];
    },

    /* Function which allow to vary the max distance given between two clones
     * @distanceMax: the new distanceMax
     */
    displayDistanceMax: function(distanceMax) {
        //Replacement of the distanceMax attribute, if distanceMax parameter is not undefined
        distanceMax = typeof(distanceMax) != "undefined" ? distanceMax : this.distanceMax;
        this.distanceMax = distanceMax;

        //Disable and active slider -> display value of the slider
        this.activeSliderDistanceMax(false);
        this.activeSliderDistanceMax(true);

        var display_container = document.getElementById('distanceMax_slider');
        if (display_container != null) {
            display_container.value = distanceMax;
        }

        //Compute and display EditDistance visualization
        this.runGraphVisualization("edit_distance");

        //Update the style of all elements
        this.updateElemStyle();
    },

    /* Activation/Disactivation of the distanceMax display slider
     * @bool: True -> on / False -> off
     */
    activeSliderDistanceMax: function(bool) {
        var slider = document.getElementById("displayMax_slider");
        this.m.changeSliderEditDistanceValue(bool, this.distanceMax);
        bool ? slider.style.display = "" : slider.style.display = "none";
    },

    /* Function which allow to activate the opacity of a specific clone
     */
    activeLine: function() {
        var self = this;
        var selected = self.m.getSelected()
        if (selected.length > 0) {
            this.grpLinks.selectAll("line")
                .attr("class", function(d) {
                    if ((selected.indexOf(d.source.id) >= 0 || sselected.indexOf(d.target.id) >= 0) && (self.m.clone(d.source)
                            .isActive() && self.m.clone(d.target)
                            .isActive())) return "line_active";
                    else return "line_inactive"
                });
        } else this.activeAllLine(false);
    },

    /* Function which allows to activate/disactivate all lines which are contains in the scatterPlot
     * @bool: True -> active all / False -> disactive all
     */
    activeAllLine: function(bool) {
        var self = this;
        this.grpLinks.selectAll("line")
            .attr("class", bool ? "line_active" : "line_inactive");
    },

    /* Fonction permettant de mettre à jour l'apparence liée a l'état (focus/select/inactive) des nodes, sans relancer l'animation
     * */
    updateElemStyle: function() {
        var self = this;
        if (this.splitY == "bar") {
            this.updateBar();
        } else {
            this.node
                .attr("class", function(p) {
                    if (!self.m.clone(p.id)
                        .isActive()) return "circle_hidden";
                    if (self.m.clone(p.id)
                        .isSelected()) return "circle_select";
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus";
                    return "circle";
                })
                .style("fill", function(d) {
                    return (self.m.clone(d.id)
                        .getColor());
                })
        }
        //Activation des liens "utiles" pour le graphe
        if (this.reinit) this.activeLine();
    },

    /* Fonction permettant d'appliquer la grille correspondant à/aux méthode(s) de répartition définie(s) pour chaque axe
     * */
    initGrid: function() {

        self = this;

        //Réinitialisation de la grille si les légendes sont placées sur "graph", mais que la répartition par distance d'édition est désactivée
        if ((self.splitX == "graph" || self.splitY == "graph" || self.splitX == "dbscan" ||  self.splitY == "dbscan") && self.reinit == false) {
            this.splitX = "gene_v";
            this.splitY = "gene_j";
        }

        if (!self.reinit) this.axis_x_update(this.axisX.labels);
        if (!self.reinit) this.axis_y_update(this.axisY.labels);
        if (!self.reinit) this.system_label_update(this.systemGrid.label);

        return this;
    },

    /* Function which allows to verify if we can switch to an accessible distribution
     * @value: dbscan / graph, according to the visualization hope
     */
    checkGraphMethod: function(value) {
        switch (value) {
            case 'dbscan':
                this.changeSplitMethod('dbscan', 'dbscan');
                return true;
            case 'graph':
                this.changeSplitMethod('graph', 'graph');
                return true;
        }
        return false;
    },

    changeXaxis: function(elem) {
        if (this.checkGraphMethod(elem.value)) return;
        this.changeSplitMethod(elem.value, this.splitY);
    },


    /* Fonction permettant de changer l'axe des Y en fonction d'un élément donné en paramètre
     * @param elem: un élément ?????
     * */
    changeYaxis: function(elem) {
        if (this.checkGraphMethod(elem.value)) return;
        this.changeSplitMethod(this.splitX, elem.value);
    },

    /* Fonction permettant de mettre à jour de l'axe des X
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de X)
     * */
    axis_x_update: function(data) {

        var self = this;

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
            this.text_position_x = 45;
            this.sub_text_position_x = 55;
            className = "sp_rotated_legend";
        } else {
            this.rotation_x = 0;
            className = "sp_legend";
            this.text_position_x = 15;
            this.sub_text_position_x = 30;
        }

        //LEGENDE
        leg = this.axis_x_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg
            .attr("x", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
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
          if (self.coordinates[0] > ((self.resizeW*d.pos+self.marge_left)-(label_width/4) ) &&
          self.coordinates[0] < ((self.resizeW*d.pos+self.marge_left)+(label_width/4) )
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
                return "rotate(" + self.rotation_x + " " + (self.gridSizeW * d.pos + self.marge_left) + " " + y + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitX == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //AXIS
        lines = this.axis_x_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
            })
            .attr("x2", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
            })
            .attr("y1", function(d) {
                return self.marge_top;
            })
            .attr("y2", function(d) {
                return self.resizeH + self.marge_top;
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
                if (self.m.colorMethod == "V" && self.splitX == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    /* Fonction permettant de mettre à jour de l'axe des Y
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de Y)
     * */
    axis_y_update: function(data) {

        self = this;

        //LEGENDE
        leg = this.axis_y_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg
            .attr("x", function(d) {
                if (d.type == "subline") return self.sub_text_position_y;
                else return self.text_position_y;
            })
            .attr("y", function(d) {
                return (self.resizeH * d.pos + self.marge_top);
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", "sp_legend")
            .attr("transform", function(d) {
                var x = self.text_position_y
                if (d.type == "subline") x = self.sub_text_position_y
                return "rotate(" + self.rotation_y + " " + x + " " + (self.resizeH * d.pos + self.marge_top) + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //AXIS
        lines = this.axis_y_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.marge_left;
            })
            .attr("x2", function(d) {
                return self.gridSizeW + self.marge_left;
            })
            .attr("y1", function(d) {
                return self.gridSizeH * d.pos + self.marge_top;
            })
            .attr("y2", function(d) {
                return self.gridSizeH * d.pos + self.marge_top;
            })
            .style("stroke", function(d) {
                return null;
            })
            .attr("class", function(d) {
                if (d.type == "subline") {
                    if (self.splitY != "allele_j" && self.splitY != "allele_v" && self.splitY != "allele_v_used") return "sp_subline_hidden";
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

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
                    return "" + (d.x * self.resizeW + self.marge_left) + "px"
                })
                .style("top", function(d) {
                    return "" + (d.y * self.resizeH + self.marge_top) + "px"
                })
                .html(function(d) {
                    return "<div class='sp_system'>" + self.m.systemBox(d.text)
                        .outerHTML + " " + d.text + "</div>"
                })
                .on("click", function(d) {
                    self.m.changeGermline(d.text)
                })
                .attr("class", function(d) {
                    if (d.enabled) return "sp_system_label"
                    return "sp_system_label inactive"
                })
        }
    },

    /* Fonction permettant de changer la méthode de répartition du ScatterPlot selon les X et Y (non pas par bloc)
     * @param splitX: Méthode de répartition demandée pour l'axe des X
     * @param splitY: Méthode de répartition demandée pour l'axe des Y
     * */
    changeSplitMethod: function(splitX, splitY) {

        //if split method in the direction of a graph distribution, or if the graph split is allready activated
        if (splitX == "graph" ||  (this.reinit && splitX != "dbscan")) {
            if (this.dbscanActive) {
                //Removal of useless edges
                this.unsetGraphLinks();
                this.dbscanActive = false;
                //Disable reinit to switch to DBSCAN at EditDistance after maybe...
                if (splitX == "graph" || splitY == "graph") this.reinit = false;
                //Reinit of the edges array - switch DBSAN -> EditDistance
                this.edge = self.keepUsefullEdgesForEditDistanceGraph( /*self.edgeSaved*/ self.allEdges);
            }
            this.reinit_motor();
            this.endBar();
        }

        if (splitX == "dbscan") {
            this.dbscanActive = true;
            if (this.reinit) this.reinit = false;
            this.reinit_motor();
            this.endBar();
        }

        if (splitY == "bar" && splitY != this.splitY) {
            this.endPlot();
            this.initBar();
        }

        if (splitY != "bar" && this.splitY == "bar") {
            this.endBar();
        }

        this.splitX = splitX;
        this.splitY = splitY;

        this.updateAxis(this.axisX, this.splitX);
        this.updateAxis(this.axisY, this.splitY);
        this.update();
    },

    updateAxis: function(axis, splitMethod) {
        if (splitMethod == "allele_v") {
            axis.useGermline(this.m.germlineV, "V", true)
        }
        if (splitMethod == "gene_v") {
            axis.useGermline(this.m.germlineV, "V", false)
        }
        if (splitMethod == "allele_j") {
            axis.useGermline(this.m.germlineJ, "J", true)
        }
        if (splitMethod == "gene_j") {
            axis.useGermline(this.m.germlineJ, "J", false)
        }
        if (splitMethod == "Size") {
            axis.useSize()
        }
        if (splitMethod == "sequenceLength") {
            axis.custom(function(cloneID) {
                var value = m.clone(cloneID)
                    .getSequenceLength()
                if (typeof value != "undefined" && value != 0) return value;
                return undefined;
            })
        }
        if (splitMethod == "n") {
            axis.custom(function(cloneID) {
                var value = m.clone(cloneID)
                    .getNlength()
                if (typeof value != "undefined" && value != 0) return value;
                return undefined;
            })

        }
        if (splitMethod == "lengthCDR3") {
            axis.custom(function(cloneID) {
                return m.clone(cloneID)
                    .seg["cdr3"].length
            })
        }
    },

    /* Fonction permettant de mettre à jour le menu
     * */
    updateMenu: function() {
        var select_x = 0;
        var select_y = 0
        for (var i = 0; i < this.menu.length; i++) {
            if (this.menu[i][0] == this.splitX) select_x = i
            if (this.menu[i][0] == this.splitY) select_y = i
        }
        document.getElementById("select_x")
            .selectedIndex = select_x
        document.getElementById("select_y")
            .selectedIndex = select_y

        return this;
    },

    /* Fonction permettant de 'cacher' un node
     * */
    endPlot: function() {
        var self = this;
        this.node
            .transition()
            .duration(500)
            .attr("class", function(p) {
                return "circle_hidden";
            })
            // Relancera le moteur physique D3
        this.force.start()
    },

    /* Fonction permettant l'activation d'un sélecteur
     * */
    activeSelector: function() {
        var self = this;
        this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
            .node());

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

    /* Function which allow to update the selector
     * */
    updateSelector: function() {
        this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
            .node());

        //Active selector -> activeSelector() function
        if (this.active_selector) {

            /*Movement of all nodes, with mouse move*/
            if (this.active_move) {

                this.positionToMove.x = this.coordinates[0];
                this.positionToMove.y = this.coordinates[1];

                var width = this.positionToMove.originx - this.positionToMove.x;
                var height = this.positionToMove.originy - this.positionToMove.y;

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

                var width = this.coordinates[0] - x;
                var height = this.coordinates[1] - y;

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

    /*Fonction permettant de stopper l'exéc sélective
     * */
    stopSelector: function(e) {
        if (this.active_selector) {

            this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                .node());

            if (this.active_move) {

                //Selector disabled
                this.cancelSelector();

                //Set the CSS of the mouse to "default"
                document.body.style.cursor = "default";

            }
            /*Sélection*/
            else {

                //On annule la sélection
                if (this.coordinates[0] < 0 || this.coordinates[1] < 0 || this.coordinates[0] > this.marge_left + this.resizeW || this.coordinates[1] > this.marge_top + this.resizeH) {

                    this.cancelSelector();

                } else {

                    var nodes_selected = []
                    var x1 = parseInt(this.selector.attr("x"))
                    var x2 = x1 + parseInt(this.selector.attr("width"))
                    var y1 = parseInt(this.selector.attr("y"))
                    var y2 = y1 + parseInt(this.selector.attr("height"))

                    for (var i = 0; i < this.nodes.length; i++) {

                        var node_x = this.nodes[i].x + this.marge_left
                        var node_y = this.nodes[i].y + this.marge_top
                        var clone = this.m.clone(i)
                        if (clone.isActive() && (clone.getSize() || clone.getSequenceSize()) && node_x > x1 && node_x < x2 && node_y > y1 && node_y < y2)
                            nodes_selected.push(i);
                    }

                    this.selector
                        .style("display", "none")
                        .attr("width", 0)
                        .attr("height", 0)
                    this.active_selector = false;

                    if (!(d3.event.ctrlKey || d3.event.metakey)) this.m.unselectAll()
                    this.m.multiSelect(nodes_selected)
                }
            }
        }
    },

    clickNode: function(cloneID) {
        if (!d3.event.ctrlKey) this.m.unselectAll()
        this.m.select(cloneID)
    },

    /* Fonction permettant l'annulation du sélecteur
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

}