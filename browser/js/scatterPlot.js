/*
 * This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
 * Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr> and the Vidjil Team
 * Bonsai bioinformatics at LIFL (UMR CNRS 8022, UniversitÃ© Lille) and Inria Lille
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

/* Classe ScatterPlot
 * Classe permettant de gérer tout le ScatterPlot (ou 'nuage de points') contenu dans l'affichage
 * I -> Déclaration de l'objet
 * II -> Déclaration des fonctions attribuées à l'objet (.prototype)
 * Documentation modifiée le 3 Avril 2014
 * */

/*
  Déclaration de l'objet ScatterPlot
*/
function ScatterPlot(id, model) {
    this.id = id; //ID de la div contenant le scatterPlot
    this.m = model; //objet Model utilisé 
    this.resizeCoef = 1; //coef d'agrandissement a appliquer aux rayons des elements
    this.resizeW = 1; //coef d'agrandissement largeur
    this.resizeH = 1; //coef d'agrandissement hauteur
    this.marge_left = 120; //marge 
    this.marge_top = 45; //
    this.max_precision = 9; //precision max atteignable (par défaut: 9)

    this.positionGene = {}; //position des gènes
    this.positionUsedGene = {}; //position des gènes que l'on utilisera
    this.positionAllele = {}; //position des allèles
    this.positionUsedAllele = {}; //position des allèles que l'on utilisera

    this.splitY = "gene_j"; //methode de répartition actuelle, pour l'axe des Y
    this.splitX = "gene_v"; //methode de répartition actuelle, pour l'axe des X

    this.m.view.push(this); //synchronisation au Model

    this.time0 = Date.now(), //sauvegarde d'une date initiale
    this.time1 = this.time0; //utilisation de cette variable afin de pouvoir calculer les frames
    this.fpsqueue = []; //sert à calculer le nombre de frame selon les 20 dernières valeurs

    //use_simple_v -> visualisation de v présents lors d'un nombre très grands de v
    this.use_simple_v = false
    this.active_selector = false

    //axis X text position
    this.rotation_x = 0;
    this.text_position_x = 15;
    this.sub_text_position_x = 30;

    //axis Y text position
    this.rotation_y = 0;
    this.text_position_y = 40;
    this.sub_text_position_y = 90;

    //mouse coordinates
    this.coordinates = [0, 0];

    //select_menu
    this.menu = [
        ["gene_v", "gene V"],
        ["gene_j", "gene J"],
        ["allele_v", "allele V"],
        ["allele_j", "allele J"],
        ["Size", "abundance"],
        ["n", "N length"]
    ]

}

/*
  Déclaration des fonctions attribuées à l'objet
*/
ScatterPlot.prototype = {

    /* Fonction permettant l'initialisation complète du ScatterPlot
     */
    init: function () {
        console.log("ScatterPlot " + this.id + ": init()");

        document.getElementById(this.id)
            .innerHTML = "";

        this.initMenu();
        this.initSVG();
        this.initGridModel();

        this.changeSplitMethod(this.splitX, this.splitY);
        this.resize();
    },

    /* Fonction permettant l'initialisation d'un élément SVG contenu dans le Scatterplot, pour D3JS
     */
    initSVG: function () {
        var self = this;

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
            .on("mouseover", function () {
                self.m.focusOut();
            })
            .on("mousedown", function () {
                self.activeSelector();
            })

	//Actions sur le corps -|- aux sélections
        d3.select("body")
            .on("mouseup", function () {
                self.stopSelector()
            })
        d3.select("body")
            .on("mousemove", function () {
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

        //initialisation des nodes
        this.nodes = d3.range(this.m.n_windows)
            .map(Object);
        for (var i = 0; i < this.m.n_windows; i++) {
            this.nodes[i].id = i; //L'id d'un cercle vaut le nombre de i dans la boucle
            this.nodes[i].r1 = 5; // r1 -> ?
            this.nodes[i].r2 = 5; // r2 -> ?
        }

        //initialisation moteur physique D3
        this.force = d3.layout.force()
            .gravity(0)
            .theta(0) //Valeur par défaut 0.8
            .charge(0) //Valeur par défaut -1
            .friction(0.9)
            .nodes(this.nodes) //Initialisation du tableau de noeuds
            .on("tick", this.tick.bind(this)) // on -> Ecoute des mises à jour -|- aux positions données/modifiées
            .size([1, 1]); //Taille de ...?

        //création d'un element SVG pour chaque nodes (this.node.[...])
        this.node = this.plot_container.selectAll("circle")
            .data(this.nodes) //Ajout de données pour les cercles
        this.node.enter()
            .append("svg:circle"); //Ajout d'un élément SVG (cercle) à un node
        this.node.exit()
            .remove() //On efface tous les cercles non pris en compte

	//Action concernant tous les nodes présents dans le ScatterPlot
        this.plot_container.selectAll("circle")
            .attr("stroke-width", 4)
            .attr("stroke", "")
            .attr("id", function (d) {
                return "circle" + d.id;
            })
	//Attribution de l'activité des cercles (inactif, sélectionné, demande d'info ou autre)
            .attr("class", function (p) {
                if (!self.m.windows[p.id].active) return "circle_inactive";
                if (self.m.windows[p.id].select) return "circle_select";
                if (p.id == self.m.focus) return "circle_focus";
                return "circle";
            })
	//Appel de la fonction drag
            .call(this.force.drag)
	//Action -> Si la souris est pointée/fixée sur un cercle, alors on affiche l'information concernant ce cercle
            .on("mouseover", function (d) {
                self.m.focusIn(d.id);
            })
	//Action -> Si l'on clique sur un cercle, alors on le sélectionne
            .on("click", function (d) {
                self.m.select(d.id);
            })

    },

    /* Fonction permettant d'initialiser le menu contenant les axes, ainsi que tout autre élément n'étant pas du SVG
     * */
    initMenu: function () {
        var self = this;

        var divParent = document.getElementById(this.id)

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
        select_x.onchange = function () {
            self.changeXaxis(this);
        }

	//Création d'un select (menu avec options déroulantes) pour l'axe des Y
        var select_y = document.createElement('select');
	//Initialisation du menu déroulant
        select_y.setAttribute('name', 'select_y[]');
        select_y.id = "select_y"
	//Changement du menu en fonction de la demande
        select_y.onchange = function () {
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

	//On ajoute les élèments fils au div parent
        divParent.appendChild(div_x);
        divParent.appendChild(div_y);
    },

    /* Fonction permettant l'initialisation d'un élément SVG pour le graphe 'diagramme'
     * */
    initBar: function () {
        self = this;

        //création d'un element SVG pour chaque nodes
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar.enter()
            .append("svg:rect");
        this.bar.exit()
            .remove()
        this.bar_container.selectAll("rect")
            .attr("id", function (d) {
                return "bar" + d.id;
            })
            .attr("width", 30)
            .attr("x", function (d) {
                var geneV = "undef";
                if (typeof (self.m.windows[d.id].V) != 'undefined') {
                    var geneV = self.m.windows[d.id].V[0];
                    return self.positionGene[geneV] * self.resizeW - 15 + self.marge_left;
                } else {
                    return self.positionGene["undefined V"] * self.resizeW - 15 + self.marge_left;
                }
            })
            .attr("height", 50)
            .attr("y", self.resizeH + self.marge_top)
	//Retourne la couleur attribuée au SVG -via CSS:style.fill- pour chaque fenÃªtre dans le contenu de l'objet model
            .style("fill", function (d) {
                return (self.m.windows[d].color);
            })
	//Zoom-Affichage de la fenêtre contenue dans l'objet model, via son ID
            .on("mouseover", function (d) {
                self.m.focusIn(d.id);
            })
	//Sélection de la fenêtre contenue dans l'objet model, via son ID
            .on("click", function (d) {
                self.m.select(d.id);
            })
    },

    /* Fonction permettant la mise à jour de l'élément SVG concernant le graphe 'diagramme'
     * */
    updateBar: function () {
        var self = this

	//Object.keys -> Retourne un tableau contenant les 'propriétés entières' en chaînes de caractères, correspondants aux éléments présents dans le tableau donné en paramètre de la fonction ==> Tableau
        this.vKey = Object.keys(this.m.germline.vgene);
        //Array.push() -> Ajoute des élèments en fin de tableau
	this.vKey.push("undefined V");
        this.bar_v = {};
        this.bar_max = 0;

	//Redimensionnement du bar graph en fonction de use_simple_v
        if (this.use_simple_v) {
            this.bar_width = (0.5 * (1 / Object.keys(this.m.usedV)
				     .length)) * this.resizeW
        } else {
            this.bar_width = (0.5 * (1 / this.vKey.length)) * this.resizeW
        }

        //Initialisation du tableau d'objets
        for (var i = 0; i < this.vKey.length; i++) {
            this.bar_v[this.vKey[i]] = {}
            this.bar_v[this.vKey[i]].clones = [];
            this.bar_v[this.vKey[i]].totalSize = 0;
            this.bar_v[this.vKey[i]].currentSize = 0;
        }

        //classement des clones suivant V
        for (var i = 0; i < this.m.windows.length; i++) {
            if (this.m.windows[i].active) {
                var geneV = this.m.getV(i);
                var clone = {
                    id: i
                }
                if (typeof this.bar_v[geneV] == 'undefined') geneV = "undefined V"
                this.bar_v[geneV].clones.push(clone);
                this.bar_v[geneV].totalSize += this.m.getSize(i);
            }
        }

        //classement des clones suivant J
        for (var i = 0; i < this.vKey.length; i++) {
            if (this.bar_v[this.vKey[i]].totalSize > this.bar_max)
                this.bar_max = this.bar_v[this.vKey[i]].totalSize;
            this.bar_v[this.vKey[i]].clones.sort(function (a, b) {
                var ja = self.m.getJ(a.id);
                var jb = self.m.getJ(b.id);
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

        //Création / Initialisation de la grille
        for (var i = 0; i < this.gridModel["bar"].length; i++) {
            var value = this.gridModel["bar"][i].value / 100;
            if (this.bar_max < 0.1) value = value / 5;
            this.gridModel["bar"][i].pos = 1 - (value / this.bar_max);
            if (value > this.bar_max) {
                this.gridModel["bar"][i].type = "subline";
                this.gridModel["bar"][i].text = ""
            } else {
                this.gridModel["bar"][i].type = "line";
                this.gridModel["bar"][i].text = Math.round(value * 100) + " %"
            }
        }

        //redraw
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            .attr("id", function (d) {
                return "bar" + d.id;
            })
            .attr("width", this.bar_width)
            .attr("x", function (d) {
                if (typeof (self.m.windows[d.id].V) != 'undefined' && typeof self.posG[self.m.windows[d.id].V[0]] != 'undefined') {
                    var geneV = self.m.windows[d.id].V[0];
                    return self.posG[geneV] * self.resizeW - (self.bar_width / 2) + self.marge_left;
                } else {
                    return self.posG["undefined V"] * self.resizeW - (self.bar_width / 2) + self.marge_left;
                }
            })
            .attr("height", function (d) {
                return self.getBarHeight(d) * self.resizeH;
            })
            .attr("y", function (d) {
                if (!self.m.windows[d.id].active) return self.resizeH + self.marge_top;
                return (self.getBarPosition(d) * self.resizeH) + self.marge_top;
            })
            .style("fill", function (d) {
                return (self.m.windows[d].color);
            })
            .attr("class", function (p) {
                if (!self.m.windows[p.id].active) return "circle_hidden";
                if (self.m.windows[p.id].select) return "circle_select";
                if (p.id == self.m.focus) return "circle_focus";
                return "circle";
            })

    },

    /* Fonction permettant d'attribuer "circle_hidden" sur un cercle, afin de permettre de le cacher par la suite
     * */
    endBar: function () {
        this.initBar();
        var self = this;
        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            .attr("class", function (p) {
                return "circle_hidden";
            })
    },

    /* Fonction permettant de calculer la hauteur d'un 'bar' pour un clone donné (ID du clone)
     * @param cloneID: l'ID du clone
     * */
    getBarHeight: function (cloneID) {
        var size = this.m.getSize(cloneID);
        return size / this.bar_max;
    },

    /* Fonction permettant de calculer la position d'un 'bar' pour un clone donné (ID du clone)
     * @param cloneID: l'ID du clone
     * */
    getBarPosition: function (cloneID) {
        for (var i = 0; i < this.vKey.length; i++) {
            for (var j = 0; j < this.bar_v[this.vKey[i]].clones.length; j++) {
                if (this.bar_v[this.vKey[i]].clones[j].id == cloneID)
                    return this.bar_v[this.vKey[i]].clones[j].pos;
            }
        }
    },

    /* Recalcule les coefficients d'agrandissement/réduction, en fonction de la taille de la div
     * */
    resize: function () {
	//On prend la largeur de la div
        this.resizeW = document.getElementById(this.id)
            .parentNode.offsetWidth - this.marge_left;
	//On prend la hauteur de la div
        this.resizeH = document.getElementById(this.id)
            .offsetHeight - this.marge_top;
        
	//Calculs
	if (this.resizeW < 0.1) this.resizeW = 0.1;
        if (this.resizeH < 0.1) this.resizeH = 0.1;

        this.resizeCoef = Math.sqrt(this.resizeW * this.resizeH);
        if (this.resizeCoef < 0.1) this.resizeCoef = 0.1;

	//Attributions
        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", document.getElementById(this.id)
                  .parentNode.offsetWidth)
            .attr("height", document.getElementById(this.id)
                  .offsetHeight)
        d3.select("#" + this.id + "_back")
            .attr("width", document.getElementById(this.id)
                  .parentNode.offsetWidth)
            .attr("height", document.getElementById(this.id)
                  .offsetHeight);

	//Initialisation de la grille puis mise-à-jour
        this.initGrid();
        this.update();
    },

    /* Fonction permettant la création et initialisation d'un objet model
     * @param type: Le type (line, subline, ...)
     * @param pos: La position donnée de l'élèment
     * @param text: Le texte donné
     * @param color: La couleur donnée pour cette création
     * */
    makeLineModel: function (type, pos, text, color) {
        result = {};
        result.type = type;
        result.pos = pos;
        result.text = text;
        result.geneColor = color;

        return result;
    },

    /* Fonction permettant d'initialiser les grilles de répartition du ScatterPlot 
     * */
    initGridModel: function () {
        this.gridModel = {};

        this.initGridModelV()
        this.initGridModelJ()
        this.initGridModelN()
        this.initGridModelSize()
        this.initGridModelBar()

    },

    /* Fonction permettant d'initialiser les grilles de répartition du ScatterPlot selon le modèle V
     * */
    initGridModelV: function () {

	//Initialisation des paramètres de l'objet concernant les positions des gènes/allèles V _ [gene/allele]_v_used -> Tableau contenant toutes les positions des gènes et allèles V utilisés pendant ce temps
        this.gridModel["allele_v"] = [];
        this.gridModel["gene_v"] = [];
        this.gridModel["allele_v_used"] = [];
        this.gridModel["gene_v_used"] = [];

	//Obtention de toutes les clefs concernant les allèles et les gènes V
        var vKey = Object.keys(this.m.germline.v);
        var vKey2 = Object.keys(this.m.germline.vgene);

	//Calcul de distances de colonnes
        var stepV = 1 / (vKey2.length + 1)
        var stepV2 = 1 / (Object.keys(this.m.usedV)
			  .length + 1)

        // Concerne toutes les allèles V -> Initialisation et calcul de position
        for (var i = 0; i < vKey.length; i++) {

            var elem = vKey[i].split('*');
            var pos = (this.m.germline.v[vKey[i]].gene) * stepV +
                (this.m.germline.v[vKey[i]].allele + 0.5) * (stepV / (this.m.germline.vgene[elem[0]].n));
            var pos2 = (this.m.germline.v[vKey[i]].gene + 0.5) * stepV;
            var color = this.m.germline.v[vKey[i]].color;

            this.positionAllele[vKey[i]] = pos;
            this.gridModel["allele_v"].push(this.makeLineModel("subline", pos, "*" + elem[1], color));

            this.positionGene[vKey[i]] = pos2

            if (this.m.usedV[elem[0]]) {
                pos = stepV2 * (this.m.usedV[elem[0]] - 1) +
                    (this.m.germline.v[vKey[i]].allele + 0.5) * (stepV2 / (this.m.germline.vgene[elem[0]].n));
                pos2 = stepV2 * (this.m.usedV[elem[0]] - 0.5)
                this.gridModel["allele_v_used"].push(this.makeLineModel("subline", pos, "*" + elem[1], color));
            }

            this.positionUsedAllele[vKey[i]] = pos
            this.positionUsedGene[vKey[i]] = pos2
        }

        // Concerne tous les gènes V -> Initialisation et calcul de position
        for (var i = 0; i < vKey2.length; i++) {

            var pos = (i + 0.5) * stepV;
            var color = this.m.germline.vgene[vKey2[i]].color;

            this.gridModel["allele_v"].push(this.makeLineModel("line", pos, vKey2[i], color));
            this.gridModel["gene_v"].push(this.makeLineModel("line", pos, vKey2[i], color));

            if (this.m.usedV[vKey2[i]]) {
                pos = stepV2 * (this.m.usedV[vKey2[i]] - 0.5)
                this.gridModel["allele_v_used"].push(this.makeLineModel("line", pos, vKey2[i].replace(this.m.system, ""), color));
                this.gridModel["gene_v_used"].push(this.makeLineModel("line", pos, vKey2[i].replace(this.m.system, ""), color));
            }

        }

        // Concernant tous les gènes/allèles V non-définis ("undefined"), initialisation à des valeurs calculées, contenues dans pos et pos2
        var pos = (vKey2.length + 0.5) * stepV;
        var pos2 = (Object.keys(this.m.usedV)
		    .length + 0.5) * stepV2;

	//Ajout dans l'attribut gridModel
        this.gridModel["allele_v"].push(this.makeLineModel("line", pos, "?", ""));
        this.gridModel["gene_v"].push(this.makeLineModel("line", pos, "?", ""));
        this.gridModel["allele_v_used"].push(this.makeLineModel("line", pos2, "?", ""));
        this.gridModel["gene_v_used"].push(this.makeLineModel("line", pos2, "?", ""));

	//Modification des positions non-définies
        this.positionGene["undefined V"] = pos
        this.positionAllele["undefined V"] = pos
        this.positionUsedGene["undefined V"] = pos2
        this.positionUsedAllele["undefined V"] = pos2

        //choix du gridModel V a utiliser
        this.posG = this.positionGene
        this.posA = this.positionAllele
        if (Object.keys(m.germline.vgene)
            .length > 20) {
            this.use_simple_v = true;
            this.posG = this.positionUsedGene
            this.posA = this.positionUsedAllele
        }
    },

    /* Fonction permettant d'initialiser les grilles de répartition du ScatterPlot selon le modèle J
     * */
    initGridModelJ: function () {

	//Initialisation des paramètres de l'objet concernant les positions des gènes/allèles J
        this.gridModel["allele_j"] = [];
        this.gridModel["gene_j"] = [];

	//Obtention de toutes les clefs concernant les allèles et gènes J
        var jKey = Object.keys(this.m.germline.j);
        var jKey2 = Object.keys(this.m.germline.jgene);
	//Initialisation d'un pas pour ?????
        var stepJ = 1 / (jKey2.length + 1)

        //Concerne toutes les allèles J -> Initialisation et calcul de position
        for (var i = 0; i < jKey.length; i++) {

            var elem = jKey[i].split('*');

            var color = this.m.germline.j[jKey[i]].color;
            var pos = (this.m.germline.j[jKey[i]].gene) * stepJ +
                (this.m.germline.j[jKey[i]].allele + 0.5) * (stepJ / (this.m.germline.jgene[elem[0]].n));
            var pos2 = (this.m.germline.j[jKey[i]].gene + 0.5) * stepJ;

            this.gridModel["allele_j"].push(this.makeLineModel("subline", pos, "*" + elem[1], color));

            this.positionAllele[jKey[i]] = pos;
            this.positionGene[jKey[i]] = pos2;
            this.positionUsedAllele[jKey[i]] = pos;
            this.positionUsedGene[jKey[i]] = pos2;

        }

        //Concerne tous les gènes J -> Initialisation et calcul de position
        for (var i = 0; i < jKey2.length; i++) {

            var pos = (i + 0.5) * stepJ
            var color = this.m.germline.jgene[jKey2[i]].color;

            this.gridModel["allele_j"].push(this.makeLineModel("line", pos, jKey2[i], color));
            this.gridModel["gene_j"].push(this.makeLineModel("line", pos, jKey2[i], color));
        }

        //Gestion de toutes les positions non-définies pour les allèles ou gènes J
        var pos = (jKey2.length + 0.5) * stepJ;

        this.gridModel["allele_j"].push(this.makeLineModel("line", pos, "?", color));
        this.gridModel["gene_j"].push(this.makeLineModel("line", pos, "?", color));

        this.positionGene["undefined J"] = pos
        this.positionAllele["undefined J"] = pos
        this.positionUsedGene["undefined J"] = pos
        this.positionUsedAllele["undefined J"] = pos

    },

    /* Fonction permettant d'initialiser la taille de la grille, définie selon le modèle
     * */
    initGridModelSize: function () {
	//Déclaration
        this.gridModel["Size"] = [];

	//Calcul initial
        this.sizeScale = d3.scale.log()
            .domain([this.m.min_size, 1])
            .range([1, 0]);
        var height = 1;

	//Calcul selon les précisions et le modèle
        for (var i = 0; i < this.max_precision; i++) {
            var pos = this.sizeScale(height);
            var text = this.m.formatSize(height, false)
            this.gridModel["Size"].push(this.makeLineModel("line", pos, text));
            height = height / 10;
        }

    },

    //Fonction permettant d'initialiser la grille de répartition du ScatterPlot selon la répartition n ?????
    initGridModelN: function () {
        this.gridModel["n"] = [];

        for (var i = 0; i <= (Math.floor(this.m.n_max / 5)); i++) {
            var pos = (1 - ((i * 5) / this.m.n_max));
            this.gridModel["n"].push(this.makeLineModel("line", pos, i * 5));
        }
    },

    //Fonction permettant d'initialiser le 'bar' de la grille
    initGridModelBar: function () {
        this.gridModel["bar"] = [];

        for (var i = 0; i < 20; i++) {
            var d = {};
            d.type = "line";
            d.value = i * 5;
            this.gridModel["bar"].push(d);
        }
    },

    /* Fonction permettant le calcul d'une étape d'animation
     * */
    tick: function () {
        self = this;
        //mise a jour des rayons( maj progressive )
        this.node.each(this.updateRadius());
        //élimine les valeurs NaN ou infinity pouvant apparaitre
        this.node.each(this.debugNaN());
        //deplace le node vers son objectif
        this.node.each(this.move());
        //résolution des collisions
        this.node.each(this.collide());
        //élimine les valeurs NaN ou infinity pouvant apparaitre
        this.node.each(this.debugNaN())
            //attribution des nouvelles positions/tailles
            .attr("cx", function (d) {
		return (d.x + self.marge_left);
            })
            .attr("cy", function (d) {
                return (d.y + self.marge_top);
            })
            .attr("r", function (d) {
                return (d.r2);
            })
            .attr("title", function (d) {
                return (self.m.getName(d));
            })

        //Calcul d'une frame (image / seconde)
        this.time1 = Date.now();
        if (this.fpsqueue.length === 10) {
            document.getElementById("fps")
                .innerHTML = d3.mean(this.fpsqueue)
                .toFixed(3);
            this.fpsqueue = [];
        }
        this.fpsqueue.push(Math.round(1000 / (this.time1 - this.time0)));
        this.time0 = this.time1;

    },

    /* Fonction permettant le déplacement des nodes en fonction de la méthode de répartition utilisée à l'instant T
     * */
    move: function () {
        self = this;
        return function (d) {
            var coef = 0.005; //?????
            var coef2 = 0.01; //force d'attraction
            var coef3 = 0.0015; //?????
            var geneV = "undefined V"; //Gène/Allèle V de la grille à bouger
            var geneJ = "undefined J"; //Gène/Allèle J de la grille à bouger
            //Vérification de l'existence du gène/allèle V -> initialisation de geneV
	    if (typeof (self.m.windows[d.id].V) != 'undefined' && self.m.germline.v[self.m.windows[d.id].V[0]]) {
                geneV = self.m.windows[d.id].V[0];
            }
	    //Vérification de l'existence du gène/allèle J -> initialisation de geneJ
            if (typeof (self.m.windows[d.id].J) != 'undefined' && self.m.germline.j[self.m.windows[d.id].J[0]]) {
                geneJ = self.m.windows[d.id].J[0];
            }

	    //Switch sur l'axe des Y en fonction de la méthode de répartition demandée, afin de calculer les nouvelles positions sur les axes
            switch (self.splitY) {
		//Cas de 'bar'
            case "bar":
                d.y += coef * (-d.y);
                break;
		//Cas de 'gene_j'
            case "gene_j":
                d.y += coef * ((self.posG[geneJ] * self.resizeH) - d.y);
                break;
		//Cas de 'allele_j'
            case "allele_j":
                d.y += coef * ((self.posA[geneJ] * self.resizeH) - d.y);
                break;
		//Cas de 'gene_v_used' et 'gene_v' (même calcul)
            case "gene_v_used":
            case "gene_v":
                d.y += coef * ((self.posG[geneV] * self.resizeH) - d.y);
                break;
		//Cas de 'allele_v_used' et 'allele_v' (même calcul)
            case "allele_v_used":
            case "allele_v":
                d.y += coef * ((self.posA[geneV] * self.resizeH) - d.y);
                break;
		//Cas de 'Size'
            case "Size":
                if (d.r1 != 0) {
                    if (self.m.clones[d.id].cluster.length == 0) {
                        d.y += coef2 * (self.sizeScale(self.m.getSequenceSize(d.id)) * self.resizeH - d.y);
                    } else {
                        d.y += coef2 * (self.sizeScale(self.m.getSize(d.id)) * self.resizeH - d.y);
                    }
                } else {
                    d.y += coef2 * (self.resizeH - d.y);
                }
                break;
		//Cas de 'nSize'
            case "nSize":
                if (typeof (self.m.windows[d.id].V) != 'undefined') {
                    if (self.m.windows[d.id].N != -1) {
                        d.y += coef2 * ((self.marge_top + (1 - (self.m.windows[d.id].Nlength / self.m.n_max)) * (self.resizeH - (2 * self.marge_top))) * self.resizeH - d.y);
                    } else {
                        d.y += coef2 * (self.resizeH - d.y);
                    }
                } else {
                    d.y += coef2 * (self.resizeH - d.y);
                }
                break;
		//Cas de 'n'
            case "n":
                d.y += coef2 * ((1 - (self.m.windows[d.id].Nlength / self.m.n_max)) * self.resizeH - d.y);
                break;
            }

	    //Switch sur l'axe des Y en fonction de la méthode de répartition demandée, afin de calculer les nouvelles positions sur les axes
            switch (self.splitX) {
		//Cas de 'bar'
            case "bar":
                d.x += coef * (-d.x);
                break;
		//Cas de 'gene_j'
            case "gene_j":
                d.x += coef * ((self.posG[geneJ] * self.resizeW) - d.x);
                break;
		//Cas de 'allele_j'
            case "allele_j":
                d.x += coef * ((self.posA[geneJ] * self.resizeW) - d.x);
                break;
		//Cas de 'gene_v_used' et 'gene_v' (même calcul)
            case "gene_v_used":
            case "gene_v":
                d.x += coef * ((self.posG[geneV] * self.resizeW) - d.x);
                break;
		//Cas de 'allele_v_used' et 'allele_v' (même calcul)
            case "allele_v_used":
            case "allele_v":
                d.x += coef * ((self.posA[geneV] * self.resizeW) - d.x);
                break;
		//Cas de 'Size'
            case "Size":
                if (d.r1 != 0) {
                    d.x += coef2 * (self.sizeScale(self.m.getSize(d.id)) * self.resizeW - d.x);
                } else {
                    d.x += coef2 * (self.resizeW - d.x);
                }
                break;
		//Cas de 'nSize'
            case "nSize":
                if (typeof (self.m.windows[d.id].V) != 'undefined') {
                    if (self.m.windows[d.id].N != -1) {
                        d.x += coef2 * ((self.marge_top + (1 - (self.m.windows[d.id].Nlength / self.m.n_max)) * (1 - (2 * self.marge_top))) * self.resizeW - d.x);
                    } else {
                        d.x += coef2 * (self.resizeW - d.x);
                    }
                } else {
                    d.x += coef2 * (self.resizeW - d.x);
                }
                break;
		//Cas de 'n'
            case "n":
                d.x += coef2 * ((1 - (self.m.windows[d.id].Nlength / self.m.n_max)) * self.resizeW - d.x);
                break;
            }
        }
    },


    /* Fonction permettant de mettre à jour les rayons de chaque cercle
     * Précision: r2 = rayon affiché // r1 = rayon a atteindre
     * */
    updateRadius: function () {
        return function (d) {
            if (d.r1 != d.r2) {
                var delta = d.r1 - d.r2;
                d.r2 += 0.03 * delta;
                if (d.r2 < 0.01) d.r2 = 0;
            }
        }
    },

    /* Fonction permettant de repositionner les nodes, ayant des positions impossibles a afficher
     * */
    debugNaN: function () {
        return function (d) {
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

    /* Fonction permettant de résoudre les collisions apportées par les nodes
     * */
    collide: function () {
	//Création d'un arbre à 4 fils
        var quadtree = d3.geom.quadtree(this.nodes);
        self = this;
        return function (d) {
            if (d.drag != 1 && d.r1 != 0) {
                var r = self.nodes[d.id].r2 + 1,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
                quadtree.visit(function (quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d) && quad.point.r1 != 0) {
                        var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = self.nodes[d.id].r2 + self.nodes[quad.point].r2 + 1;
                        if (l < r) {
                            l = (l - r) / l * 0.5;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            quad.point.x += x;
                            quad.point.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            }
        };
    },

    /* Fonction permettant de mettre à jour les données du ScatterPlot, et de relancer une sequence d'animation
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        if (this.splitY == "bar") {
            this.updateBar();
        } else {
            for (var i = 0; i < this.nodes.length; i++) {
                this.updateClone(i)
            }
            this.force.start();
            this.updateElemStyle();
        }

        this.updateMenu()
        this.initGridModelSize()
        this.initGrid();

	//Donne des informations quant au temps de MàJ des données
        elapsedTime = new Date()
            .getTime() - startTime;
        console.log("update sp: " + elapsedTime + "ms");
    },


    /* Fonction permettant de mettre à jour les données liées à tous les clones présents dans une liste -> FONCTION DEPRECATED ?????
     * @param list: Une liste contenant tous les clones à mettre à jour ?????
     * */
    updateElem: function (list) {
        this.update();
    },

    /* Fonction permettant de mettre à jour les données liées à un seul clone
     * @param cloneID: ID d'un clone
     * */
    updateClone: function (cloneID) {
        if (this.m.windows[cloneID].active) {
            if (this.m.clones[cloneID].split) {
                for (var i = 0; i < this.m.clones[cloneID].cluster.length; i++) {
                    var seqID = this.m.clones[cloneID].cluster[i]
                    var size = this.m.getSequenceSize(seqID);
		    //Math.pow(x,y) -> x**y
                    if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                    this.nodes[seqID].r1 = size
                }
            } else {
                for (var i = 0; i < this.m.clones[cloneID].cluster.length; i++) {
                    var seqID = this.m.clones[cloneID].cluster[i]
                    this.nodes[seqID].r1 = 0
                }
                var size = this.m.getSize(cloneID);
                if (this.m.clones[cloneID].cluster.length == 0) size = this.m.getSequenceSize(cloneID);
                if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                this.nodes[cloneID].r1 = size
            }
        } else {
            this.nodes[cloneID].r1 = 0
        }
    },


    /* Fonction permettant de mettre à jour l'apparence liée a l'état (focus/select/inactive) des nodes, sans relancer l'animation
     * */
    updateElemStyle: function () {
        var self = this;
        if (this.splitY == "bar") {
            this.updateBar();
        } else {
            this.node
                .attr("class", function (p) {
                    if (!self.m.windows[p.id].active) return "circle_hidden";
                    if (self.m.windows[p.id].select) return "circle_select";
                    if (p.id == self.m.focus) return "circle_focus";
                    return "circle";
                })
                .style("fill", function (d) {
                    return (self.m.windows[d].color);
                })
        }
    },

    /* Fonction permettant d'appliquer la grille correspondant à/aux méthode(s) de répartition définie(s) pour chaque axe
     * */
    initGrid: function () {
        self = this;

        var x_grid = this.gridModel[this.splitX]
        var y_grid = this.gridModel[this.splitY]

        this.axis_x_update(x_grid);
        this.axis_y_update(y_grid);
    },

    /* Fonction permettant de changer l'axe des X en fonction d'un élément donné en paramètre
     * @param elem: Un élément ?????
     * */
    changeXaxis: function (elem) {
        this.changeSplitMethod(elem.value, this.splitY);
    },


    /* Fonction permettant de changer l'axe des Y en fonction d'un élément donné en paramètre
     * @param elem: un élément ?????
     * */
    changeYaxis: function (elem) {
        this.changeSplitMethod(this.splitX, elem.value);
    },

    /* Fonction permettant de mettre à jour de l'axe des X
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de X)
     * */
    axis_x_update: function (data) {

        var self = this;

        //detect label size 
        var label_width = 0;
        var line = 0
        var sub_line =0
        
        for (var i=0; i< data.length; i++){
            if (data[i].type=="line"){
                if (data[i].text.length > label_width){
                    label_width = data[i].text.length;
                }
                line++
            }else{
                sub_line++
            }
        }
        
        label_width = (label_width*8)
        var space = (this.resizeW/line)/label_width
        //var count=space
        
        var className = "sp_legend"
        if (space < 1.1){
            this.rotation_x = 330;
            this.text_position_x = 35;
            this.sub_text_position_x = 50;
            className = "sp_rotated_legend";
        }else{
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
            .attr("x", function (d) {
                return self.resizeW * d.pos + self.marge_left;
            })
            .attr("y", function (d) {
                if (d.type == "subline") return self.sub_text_position_x
                else return self.text_position_x
            })
            .text(function (d) {
                return d.text;
            })
            .attr("class", function (d) {
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
            .attr("transform", function (d) {
                var y = self.text_position_x
                if (d.type == "subline") y = self.sub_text_position_x
                return "rotate(" + self.rotation_x + " " + (self.resizeW * d.pos + self.marge_left) + " " + y + ")"
            })
            .style("fill", function (d) {
                if (self.m.colorMethod == "V" && (self.splitX == "gene_v" || self.splitX == "gene_v_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && (self.splitX == "gene_j" || self.splitX == "gene_j_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
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
            .attr("x1", function (d) {
                return self.resizeW * d.pos + self.marge_left;
            })
            .attr("x2", function (d) {
                return self.resizeW * d.pos + self.marge_left;
            })
            .attr("y1", function (d) {
                return self.marge_top;
            })
            .attr("y2", function (d) {
                return self.resizeH + self.marge_top;
            })
            .style("stroke", function (d) {
                return null;
            })
            .attr("class", function (d) {
                if (d.type == "subline") {
                    if (self.splitX != "allele_j" && self.splitX != "allele_v" && self.splitX != "allele_v_used") return "sp_subline_hidden";
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function (d) {
                if (self.m.colorMethod == "V" && (self.splitX == "gene_v" || self.splitX == "gene_v_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && (self.splitX == "gene_j" || self.splitX == "gene_j_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    /* Fonction permettant de mettre à jour de l'axe des Y
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de Y)
     * */
    axis_y_update: function (data) {

        self = this;

        //LEGENDE
        leg = this.axis_y_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg
            .attr("x", function (d) {
                if (d.type == "subline") return self.sub_text_position_y;
                else return self.text_position_y;
            })
            .attr("y", function (d) {
                return (self.resizeH * d.pos + self.marge_top);
            })
            .text(function (d) {
                return d.text;
            })
            .attr("class", "sp_legend")
            .attr("transform", function (d) {
                var x = self.text_position_y
                if (d.type == "subline") x = self.sub_text_position_y
                return "rotate(" + self.rotation_y + " " + x + " " + (self.resizeH * d.pos + self.marge_top) + ")"
            })
            .style("fill", function (d) {
                if (self.m.colorMethod == "V" && (self.splitY == "gene_v" || self.splitY == "gene_v_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && (self.splitY == "gene_j" || self.splitY == "gene_j_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
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
            .attr("x1", function (d) {
                return self.marge_left;
            })
            .attr("x2", function (d) {
                return self.resizeW + self.marge_left;
            })
            .attr("y1", function (d) {
                return self.resizeH * d.pos + self.marge_top;
            })
            .attr("y2", function (d) {
                return self.resizeH * d.pos + self.marge_top;
            })
            .style("stroke", function (d) {
                return null;
            })
            .attr("class", function (d) {
                if (d.type == "subline") {
                    if (self.splitY != "allele_j" && self.splitY != "allele_v" && self.splitY != "allele_v_used") return "sp_subline_hidden";
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function (d) {
                if (self.m.colorMethod == "V" && (self.splitY == "gene_v" || self.splitY == "gene_v_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && (self.splitY == "gene_j" || self.splitY == "gene_j_used") && (typeof (d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    /* Fonction permettant de changer la méthode de répartition du ScatterPlot selon les X et Y (non pas par bloc)
     * @param splitX: Méthode de répartition demandée pour l'axe des X
     * @param splitY: Méthode de répartition demandée pour l'axe des Y
     * */
    changeSplitMethod: function (splitX, splitY) {
        if (splitY == "bar" && splitY != this.splitY) {
            this.endPlot();
            this.initBar();
        }

        if (splitY != "bar" && this.splitY == "bar") {
            this.endBar();
        }

        this.splitX = splitX;
        if (splitX == "gene_v" && this.use_simple_v) this.splitX = "gene_v_used";
        if (splitX == "allele_v" && this.use_simple_v) this.splitX = "allele_v_used";

        this.splitY = splitY;
        if (splitY == "gene_v" && this.use_simple_v) this.splitY = "gene_v_used";
        if (splitY == "allele_v" && this.use_simple_v) this.splitY = "allele_v_used";

        this.update();
    },

    /* Fonction permettant de mettre à jour le menu
     * */
    updateMenu: function () {
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
    },

    /* Fonction permettant de 'cacher' un node
     * */
    endPlot: function () {
        var self = this;
        this.node
            .transition()
            .duration(500)
            .attr("class", function (p) {
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
	
	//Initialisation du sélecteur
        this.selector
            .attr("originx", this.coordinates[0])
            .attr("originy", this.coordinates[1])
            .attr("x", this.coordinates[0])
            .attr("y", this.coordinates[1])
            .attr("width", 0)
            .attr("height", 0)

	//On le rend actif en lui apposant un booléen à 'True' 
        this.active_selector = true;
    },

    /* Fonction permettant de mettre à jour le sélecteur
     * */
    updateSelector: function () {
        this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
				    .node());

	//Sélecteur actif -> Via la fonction activeSelector()
        if (this.active_selector) {

            var x = this.selector.attr("originx")
            var y = this.selector.attr("originy")

            var width = this.coordinates[0] - x
            var height = this.coordinates[1] - y

            if (width > 5) {
                this.selector.attr("width", width - 3)
                    .attr("x", x)
            } else if (width < -5) {
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
            } else if (height < -5) {
                this.selector
                    .attr("height", -height)
                    .attr("y", this.coordinates[1] + 3)
            } else {
                this.selector.attr("height", 0)
                    .attr("y", y)
            }
        }
    },

    /*Fonction permettant de stopper l'exéc sélective
     * */
    stopSelector: function (e) {

        if (this.active_selector) {

            this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
					.node());

	    //On annule la sélection
            if (this.coordinates[0] < 0 || this.coordinates[1] < 0 || this.coordinates[0] > this.marge_left + this.resizeW || this.coordinates[1] > this.marge_top + this.resizeH) {

                this.cancelSelector()

            } else {

                var nodes_selected = []
                var x1 = parseInt(this.selector.attr("x"))
                var x2 = x1 + parseInt(this.selector.attr("width"))
                var y1 = parseInt(this.selector.attr("y"))
                var y2 = y1 + parseInt(this.selector.attr("height"))

                for (var i = 0; i < this.nodes.length; i++) {

                    var node_x = this.nodes[i].x + this.marge_left
                    var node_y = this.nodes[i].y + this.marge_top

                    if (this.m.windows[i].active && !this.m.windows[i].select && this.m.getSize(i) && node_x > x1 && node_x < x2 && node_y > y1 && node_y < y2) {
                        nodes_selected.push(i)
                    }
                }

                this.selector
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 0)
                    .attr("height", 0)
                this.active_selector = false;
                console.log("stopSelector : selectBox [x : " + x1 + "/" + x2 + ", y : " + y1 + "/" + y2 + "]   nodes :" + nodes_selected)

                this.m.unselectAll()
                for (var i = 0; i < nodes_selected.length; i++) {
                    this.m.select(nodes_selected[i])
                }
            }
        }
    },

    /* Fonction permettant l'annulation du sélecteur
     * */
    cancelSelector: function () {

        this.selector
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", 0)
	//On met le sélecteur à false -> annulation
        this.active_selector = false;
        console.log("cancel selector")

	//Si sélection sur le document, on efface tout
        if (document.selection) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection()
                .removeAllRanges();
        }
    },

}
