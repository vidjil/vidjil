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
 * info.js
 *
 * contains tools to manipulate element of the left-container :
 * favorites list
 * clone list
 * info panel
 *
 *
 */
/* List constructor
 *
 * */
function List(id, model) {
    this.id = id; //ID de la div contenant la liste
    this.m = model; //Model utilisé
    this.index = []

    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
    this.m.view.push(this); //synchronisation au Model
}

List.prototype = {

    /* initialise la liste et crée un div pour chaque clones
     *
     * */
    init: function () {
        this.build_list()
        this.update();
    },

    build_list: function () {
        var self = this
        this.index = []

        var div_parent = document.getElementById(this.id);
        div_parent.innerHTML = "";

        var div_list_menu = this.build_list_menu()

        var div_list_clones = document.createElement('div')
        div_list_clones.id = "list_clones"

        for (var i = 0; i < this.m.n_windows; i++) {
            var div = document.createElement('li');
            div.className = "list";
            div.id = i;

            div_list_clones.appendChild(div);
            this.index[i] = div;
        }
        
        div_parent.appendChild(div_list_menu)
        div_parent.appendChild(div_list_clones)

    },
    
    build_list_menu: function () {
        var self = this
        
        var div_list_menu = document.createElement('div')
        div_list_menu.id = "list_menu"

        var a_split = document.createElement('a')
        a_split.className = "button"
        a_split.appendChild(document.createTextNode("+"))
        a_split.onclick = function () {
            self.m.split_all(true)
        }
        
        var a_unsplit = document.createElement('a')
        a_unsplit.className = "button"
        a_unsplit.appendChild(document.createTextNode("-"))
        a_unsplit.onclick = function () {
            self.m.split_all(false)
        }
        /*
        var a_sortV = document.createElement('a')
        a_sortV.className = "button"
        a_sortV.appendChild(document.createTextNode("V sort"))
        a_sortV.onclick = function () {
            self.sortListByV()
        }

        var a_sortJ = document.createElement('a')
        a_sortJ.className = "button"
        a_sortJ.appendChild(document.createTextNode("J sort"))
        a_sortJ.onclick = function () {
            self.sortListByJ()
        }
        */
        var filter_label = document.createElement('span')
        filter_label.appendChild(document.createTextNode("filter"))
        
        var filter_input = document.createElement('input')
        filter_input.id = 'filter_input'
        filter_input.type = 'text'
        filter_input.onchange = function () {
            self.filter(this.value)
        }
        
        var filter_reset = document.createElement('span')
        filter_reset.appendChild(document.createTextNode("X"))
        filter_reset.className = "button"
        filter_reset.onclick = function () {
            document.getElementById('filter_input').value = ''
            self.reset_filter(false)
            self.m.update()
        }
        
        var a_sort = document.createElement('a')
        a_sort.className = "button"
        a_sort.appendChild(document.createTextNode("sort"))
        a_sort.style.float = "right";
        a_sort.style.marginRight = "75px";
        a_sort.onclick = function () {
            self.sortListBySize()
        }

        div_list_menu.appendChild(a_split)
        div_list_menu.appendChild(a_unsplit)
        /*
        div_list_menu.appendChild(a_sortV)
        div_list_menu.appendChild(a_sortJ)
        */
        div_list_menu.appendChild(filter_label)
        div_list_menu.appendChild(filter_input)
        div_list_menu.appendChild(filter_reset)
        div_list_menu.appendChild(a_sort)
        
        return div_list_menu
    },


    /*mise a jour de la liste
     *
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;
        for (var i = 0; i < this.m.n_windows; i++) {
            this.updateElem([i]);
        }
        elapsedTime = new Date()
            .getTime() - startTime;
        myConsole.log("update Liste: " + elapsedTime + "ms", 0);
    },

    /*
     * TODO
     * */
    resize: function () {},

    /* genere le code HTML des infos d'un clone
     * @div_elem : element HTML a remplir
     * @cloneID : identifiant du clone a décrire
     * */
    div_elem: function (div_elem, cloneID) {

        var self = this;
        div_elem.innerHTML = '';
        div_elem.onmouseover = function () {
            self.m.focusIn(cloneID);
        }
        div_elem.className = "listElem";
        div_elem.style.display = "block";

        
        var span_name = document.createElement('div');
        span_name.className = "nameBox";
        span_name.ondblclick = function () {
            self.editName(cloneID, this);
        }
        span_name.onclick = function (e) {
            self.clickList(e, cloneID);
        }
        span_name.appendChild(document.createTextNode(this.m.clone(cloneID).getName()));
        span_name.title = this.m.clone(cloneID).getName();
        span_name.style.color = this.m.clone(cloneID).getColor();

        
        var span_star = document.createElement('div');
        span_star.className = "starBox";
        span_star.onclick = function () {
            changeTag(cloneID);
        }
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', this.starPath);
        path.setAttribute('id', 'color' + cloneID);
        path.setAttribute("fill", tagColor[this.m.clone(cloneID).getTag()]);
        svg.appendChild(path);
        span_star.appendChild(svg)

        
        var span_size = document.createElement('span')
        span_size.className = "sizeBox";
        span_size.onclick = function (e) {
            self.clickList(e, cloneID);
        }
        span_size.style.color = this.m.clone(cloneID).getColor();
        span_size.appendChild(document.createTextNode(this.m.clone(cloneID).getStrSize()));

        
        var span_info = document.createElement('span')
        span_info.className = "infoBox";
        span_info.onclick = function () {
            dataBox(self.m.clone(cloneID).getHtmlInfo());
        }
        span_info.appendChild(document.createTextNode("I"));

        
        var span_cluster = document.createElement('span')
        span_cluster.className = "clusterBox";
        if (this.m.clones[cloneID].cluster.length > 1) {
            if (this.m.clones[cloneID].split) {
                span_cluster.onclick = function () {
                    self.hideCluster(cloneID)
                }
                span_cluster.appendChild(document.createTextNode("-"));
            } else {
                span_cluster.onclick = function () {
                    self.showCluster(cloneID)
                }
                span_cluster.appendChild(document.createTextNode("+"));
            }
        } else {
            span_cluster.appendChild(document.createTextNode(' '));
        }

        if (this.m.system=="multi"){
            var span_system = document.createElement('span')
            var system = this.m.clone(cloneID).getSystem()
            span_system.className = "systemBox";
            if ((typeof system != 'undefined') && (typeof germline.icon[system] != 'undefined')){
                span_system.appendChild(document.createTextNode(germline.icon[system].letter));
                span_system.style.background = germline.icon[system].color
                span_system.title = system
            }else{
                span_system.appendChild(document.createTextNode("?"));
		if (typeof system != 'undefined')
		    span_system.title = system ;
            }
        }
        
        
        div_elem.appendChild(span_cluster);
        if (this.m.system=="multi") div_elem.appendChild(span_system);
        div_elem.appendChild(span_name);
        div_elem.appendChild(span_info);
        div_elem.appendChild(span_star);
        div_elem.appendChild(span_size);

    },

    /* genere le code HTML des infos d'un cluster
     * @div_cluster : element HTML a remplir
     * @cloneID : identifiant du clone a décrire
     * @display : affichage true/false
     * */
    div_cluster: function (div_cluster, cloneID) {

        var self = this;
        div_cluster.innerHTML = '';

        div_cluster.id = "cluster" + cloneID;
        div_cluster.id2 = cloneID;

        var display = this.m.clones[cloneID].split
        if (this.m.clones[cloneID].cluster.length < 2) display = false

        if (!display) div_cluster.style.display = "none";

        var clusterSize = this.m.clone(cloneID).getSize()
        var clusterReads = this.m.clone(cloneID).getReads()

        for (var i = 0; i < this.m.clones[cloneID].cluster.length; i++) {
            (function (i) {
                var id = this.m.clones[cloneID].cluster[i]
                var div_clone = document.createElement('div');
                div_clone.id = "_" + id;
                div_clone.id2 = id;
                div_clone.className = "listElem";
                div_clone.onmouseover = function () {
                    self.m.focusIn(id);
                }
                if (self.m.clone(id).isSelected) div_clone.className = "listElem selected";

                var span_name = document.createElement('span');
                span_name.className = "nameBox";
                span_name.onclick = function (e) {
                    self.clickList(e, id);
                }
                span_name.appendChild(document.createTextNode(this.m.clone(id).getCode()));
                span_name.title = this.m.clone(id).getCode();

                var span_info = document.createElement('span')
                span_info.className = "infoBox";
                span_info.onclick = function () {
                    dataBox(self.m.clone(this.parentNode.id2).getHtmlInfo());
                }
                span_info.appendChild(document.createTextNode("I"));

                var img = document.createElement('img');
                img.onclick = function () {
                    self.m.split(cloneID, this.parentNode.id2);
                }
                if (id != parseInt(cloneID)) {
                    img.src = "images/delete.png";
                }
                img.className = "delBox";

                var span_stat = document.createElement('span');
                span_stat.className = "sizeBox";
                
                var r = 100
                if (clusterSize != 0) {
                    span_stat.appendChild(document.createTextNode( (this.m.clone(id).getSequenceReads(this.m.t)*100/clusterReads).toFixed(1) + "%"));
                } else {
                    span_stat.appendChild(document.createTextNode("0%"))
                }

                div_clone.appendChild(img);
                div_clone.appendChild(span_info);
                div_clone.appendChild(span_name);
                div_clone.appendChild(span_stat);
                div_cluster.appendChild(div_clone);
            })(i)
        }
    },


    /* affiche une fenetre d'édition pour le nom d'un clone
     * @cloneID : identifiant du clone édité
     * @elem : element HTML acceuillant la fenetre d'édition
     * */
    editName: function (cloneID, elem) {
        var self = this;
        if (document.getElementById("new_name")) {
            this.updateElem([document.getElementById("new_name")
                .parentNode.parentNode.parentNode.id
            ]);
        }
        var divParent = elem;
        divParent.innerHTML = "";

        if (cloneID[0] == 's')
            cloneID = cloneID.substr(3);

        var input = document.createElement('input');
        input.type = "text";
        input.id = "new_name";
        input.value = this.m.clone(cloneID).getName();
        input.style.width = "200px"; //TODO remplacer par une class css
        input.style.border = "0px";
        input.style.margin = "0px";
        input.onkeydown = function () {
            if (event.keyCode == 13) document.getElementById('btnSave')
                .click();
        }
        divParent.appendChild(input);
        divParent.onclick = "";

        var a = document.createElement('a');
        a.className = "button";
        a.appendChild(document.createTextNode("save"));
        a.id = "btnSave";
        a.onclick = function () {
            var newName = document.getElementById("new_name")
                .value;
            self.m.clone(cloneID).changeName(newName);
        }
        divParent.appendChild(a);
        $('#new_name')
            .select();
    },

    /*update une liste d'elements
     *
     * */
    updateElem: function (list) {
        for (var i = 0; i < list.length; i++) {

            var div = this.index[list[i]];

            if ((this.m.clone(list[i]).isActive() && this.m.clones[list[i]].cluster.length != 0) || this.m.clone(list[i]).window == "other") {

                div.innerHTML = '';

                if (this.m.clone(list[i]).isSelected()) {
                    div.className = "list list_select";
                } else {
                    div.className = "list";
                }

                var div2 = document.createElement('div');
                this.div_elem(div2, list[i]);
                div.appendChild(div2);

                var div3 = document.createElement('div');
                this.div_cluster(div3, list[i]);
                div.appendChild(div3);
                div.style.display = "";

            } else {
                div.style.display = "none";
            }

            var div4 = document.getElementById("_" + list[i]);
            if (div4) {
                if (this.m.clone(list[i]).isSelected()) {
                    div4.className = "listElem selected";
                } else {
                    div4.className = "listElem";
                }
            }

        }

    },

    updateElemStyle: function (list) {
        for (var i = 0; i < list.length; i++) {

            var div = this.index[list[i]];

            //color
            var color = this.m.clone(list[i]).getColor();

            $("#" + list[i] + " .nameBox")
                .css("color", color)
            $("#" + list[i] + " .sizeBox")
                .css("color", color)

            //clone selected ?
            if (this.m.clone(list[i]).isSelected()) {
                div.className = "list list_select";
            } else {
                div.className = "list";
            }

            //cluster sequence selected?
            var div2 = document.getElementById("_" + list[i]);
            if (div2) {
                if (this.m.clone(list[i]).isSelected()) {
                    div2.className = "listElem selected";
                } else {
                    div2.className = "listElem";
                }
            }
        }
    },
    
    reset_filter: function (bool) {
        for (var i=0; i<this.m.n_windows; i++){
            var c = this.m.clone(i)
            c.isFiltered=bool
        }
    },
    
    filter: function (str) {
        this.reset_filter(true)
        for (var i=0; i<this.m.n_windows; i++){
            var c = this.m.clone(i) 
            if (c.getName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequence().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequenceName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
        }
        this.m.update()
    },
    
    
    sortListBySize: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");
            return self.m.clone(idB).getSize() > self.m.clone(idA).getSize() ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },
    

    sortListByTop: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");
            return self.m.clone(idA).top > self.m.clone(idB).top ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },

    sortListByV: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");

            var oA = 2147483647
            var oB = 2147483647

            var cA = self.m.clone(idA)
            if (typeof (cA.V) != 'undefined' && 
                typeof (cA.V[0]) != 'undefined' &&
                typeof (self.m.germlineV.allele[cA.V[0]]) != 'undefined') {
                var vA = cA.V[0];
                oA = this.m.germlineV.allele[vA].gene * 1000 + this.m.germlineV.allele[vA].rank
            }

            var cB = self.m.clone(idB)
            if (typeof (cB.V) != 'undefined' && 
                typeof (cB.V[0]) != 'undefined' &&
                typeof (self.m.germlineV.allele[cB.V[0]]) != 'undefined') {
                var vB = cB.V[0];
                oB = this.m.germlineV.allele[vB].gene * 1000 + this.m.germlineV.allele[vB].rank
            }

            return oA > oB ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },

    sortListByJ: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");

            var oA = 2147483647
            var oB = 2147483647

            var cA = self.m.clone(idA)
            if (typeof (cA.J) != 'undefined' && 
                typeof (cA.J[0]) != 'undefined' &&
                typeof (self.m.germlineJ.allele[cA.J[0]]) != 'undefined') {
                var jA = cA.J[0];
                oA = this.m.germlineJ.allele[jA].gene * 1000 + this.m.germlineJ.allele[jA].rank
            }

            var cB = self.m.clone(idB)
            if (typeof (cB.J) != 'undefined' && 
                typeof (cB.J[0]) != 'undefined' &&
                typeof (self.m.germlineJ.allele[cB.J[0]]) != 'undefined') {
                var jB = cB.J[0];
                oB = this.m.germlineJ.allele[jB].gene * 1000 + this.m.germlineJ.allele[jB].rank
            }

            return oA > oB ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },

    showCluster: function (cloneID) {
        var self = this
        this.m.clones[cloneID].split = true
        $("#cluster" + cloneID)
            .show(50, function () {
                self.m.updateElem([cloneID])
            });
    },

    hideCluster: function (cloneID) {
        var self = this
        this.m.clones[cloneID].split = false
        $("#cluster" + cloneID)
            .hide(50, function () {
                self.m.updateElem([cloneID])
            });
    },
    
    clickList: function (e, cloneID) {
        if (!e.ctrlKey) this.m.unselectAll()
        this.m.select(cloneID)
    },

} //fin prototype




function changeTag(cloneID) {
    if (cloneID[0] == "s") cloneID = cloneID.substr(3);
    $('#tagSelector')
        .show("fast");
    document.getElementById("tag_name")
        .innerHTML = m.getName(cloneID);
    document.getElementById("tag_id")
        .innerHTML = cloneID;
}
