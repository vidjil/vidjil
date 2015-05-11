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


/** 
 * List view - build a list of clones/data and keep them up to date with the model
 * @param {string} id_list - dom id of the html who will contain the clone list
 * @param {string} id_data - dom id of the html who will contain the data list
 * @param {Model} model 
 * @class List
 * @constructor 
 * @augments View
 * @this View
 * */
function List(id_list, id_data, model) {
    var self=this;
    
    View.call(this, model);
    
    this.id = id_list; //ID de la div contenant la liste
    this.id_data = id_data;
    this.index = []
    this.index_data = {};
    this.clone_info = -1;

    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
    this.build();
    
    this.sort_option = {
        "-" : function () {},
        "size" : function(){self.sortListBySize()},
        "V" : function(){self.sortListByV()},
        "J" : function(){self.sortListByJ()}
    }
}

List.prototype = {
    
    /**
     * Build html elements needed (except clone and data list)<br>
     * need to be done only once
     * */
    build: function () {
        var self =this;
        
        //build tagSelector
        this.tagSelector = document.createElement("div");
        this.tagSelector.className = "tagSelector";
        
        var closeTag = document.createElement("span");
        closeTag.className = "closeButton" ;
        closeTag.appendChild(document.createTextNode("X"));
        closeTag.onclick = function() {$(this).parent().hide('fast')};
        this.tagSelector.appendChild(closeTag);
        
        this.tagSelectorInfo = document.createElement("div")
        this.tagSelector.appendChild(this.tagSelectorInfo);
        
        this.tagSelectorList = document.createElement("ul")
        this.tagSelector.appendChild(this.tagSelectorList);
        
        
        //build dataMenu
        this.dataMenu = document.createElement("div");
        this.dataMenu.className = "dataMenu";
        
        var closedataMenu = document.createElement("span");
        closedataMenu.className = "closeButton" ;
        closedataMenu.appendChild(document.createTextNode("X"));
        closedataMenu.onclick = function() {$(this).parent().hide('fast')};
        this.dataMenu.appendChild(closedataMenu);
        
        this.dataMenuInfo = document.createElement("div");
        this.dataMenu.appendChild(this.dataMenuInfo);
        
        var div_normalize = document.createElement("div");
        div_normalize.appendChild(document.createElement("span").appendChild(document.createTextNode("normalize to: ")));
        this.data_norm_input = document.createElement("input");
        this.data_norm_input.step = '0.0001';
        this.data_norm_input.type = 'number';
        div_normalize.appendChild(document.createElement("span").appendChild(this.data_norm_input));
        this.data_norm_input_button = document.createElement("BUTTON");
        this.data_norm_input_button.appendChild(document.createTextNode("ok"));
        div_normalize.appendChild(this.data_norm_input_button);
        this.dataMenu.appendChild(div_normalize);
        
        this.data_norm_input.onkeydown = function () {
            if (event.keyCode == 13) self.data_norm_input_button.click();
        }
        
        this.data_norm_input_button.onclick = function () {
            var data = self.dataMenuInfo.innerHTML
            var size = parseFloat(self.data_norm_input.value);
            
            self.data_norm_input.value = ""
            self.m.compute_data_normalization(data, size)
            self.m.update()
            $(self.dataMenu).hide('fast')
        }
        
        //build infoBox
        
        this.infoBox = document.createElement("div");
        this.infoBox.className = "info-container";
        
        var closeinfoBox = document.createElement("span");
        closeinfoBox.className = "closeButton" ;
        closeinfoBox.appendChild(document.createTextNode("X"));
        closeinfoBox.onclick = function() {self.closeInfoBox()};
        this.infoBox.appendChild(closeinfoBox);
        
        var div_info = document.createElement("div");
        div_info.className = "info-msg";
        this.infoBox.appendChild(div_info);
        
        //add to body
        document.body.appendChild(this.tagSelector);
        document.body.appendChild(this.dataMenu);
        document.body.appendChild(this.infoBox);
        
    },
    
    /** 
     * build html elements for clone and data list <br>
     * need to be done after each .vidjil file change
     * */
    init: function () {
        this.build_list()
        this.build_data_list()
        this.update();
        this.resize();
    },

    /** 
     * reset/build clone list <br>
     * build an index for a quick access
     * */
    build_list: function () {
        var self = this
        this.index = []

        var div_parent = document.getElementById(this.id);
        div_parent.innerHTML = "";

        var div_list_menu = this.build_list_menu()

        //clone list
        var div_list_clones = document.createElement('div')
        div_list_clones.id = "list_clones"
        for (var i = 0; i < this.m.clones.length; i++) {
            var div = document.createElement('li');
            div.className = "list";
            div.id = i;

            div_list_clones.appendChild(div);
            this.index[i] = div;
        }
        
        div_parent.appendChild(div_list_menu)
        div_parent.appendChild(div_list_clones)
        
        this.sortListBySize()
    },
    
    /** 
     * reset/build data list <br>
     * build an index for a quick access
     * */
    build_data_list: function () {
        var self=this;
        this.index_data = {}
        
        var div_parent = document.getElementById(this.id_data);
        div_parent.innerHTML = "";
        
        var div_list_data = document.createElement('div');
        div_list_data.id = "list_data";
        for (var key in this.m.data_info) {
            
            var div = document.createElement('div');
            div.className = "data";
            div.id = "data_"+key;
            div.style.color = this.m.data_info[key].color
            if (!this.m.data_info[key].isActive) div.style.opacity = 0.5
            
            var name = document.createElement('span');
            name.appendChild(document.createTextNode(key))
            name.className = "data_name";
            name.onclick = function () {
                var k = this.parentNode.id.replace("data_", "")
                if (self.m.data_info[k].isActive){
                    self.m.data_info[k].isActive = false
                }else{
                    self.m.data_info[k].isActive = true
                }
                self.build_data_list()
                graph.updateData();
            }
            div.appendChild(name)
            
            var value = document.createElement('span');
            value.className = "data_value";
            div.appendChild(value)
            
            var star = document.createElement('div');
            star.className = "starBox";
            (function (key) {
                star.onclick = function () {
                    self.openDataMenu(key);
                }
            })(key);
            
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('d', this.starPath);
            svg.appendChild(path);
            star.appendChild(svg)
            div.appendChild(star)
            
            this.index_data[key] = value;
            
            div_list_data.appendChild(div);
        }

        div_parent.appendChild(div_list_data);
        this.update_data_list()
    },
    
    /**
     * reset/build the sort/search menu for the list
     * */
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

        var filter_label = document.createElement('span')
        filter_label.appendChild(document.createTextNode("search"))
        
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
        a_sort.style['float'] = "right";
        a_sort.style.marginRight = "75px";
        a_sort.onclick = function () {
            self.sortListBySize()
        }
        
        var sort_span = document.createElement('span')
        sort_span.className = "list_sort"
        
        var sort = document.createElement('select');
        sort.setAttribute('name', 'sort_list[]');
        sort.id = "list_sort_select"
        sort.className = "list_sort_select"
        sort.onchange = function() {
            self.sort_option[this.value]()
        }
        
        for (var key in this.sort_option) {
            var sort_option = document.createElement("option");
            sort_option.setAttribute('value', key);
            sort_option.appendChild(document.createTextNode(key));
            sort.appendChild(sort_option);
        }
        
        sort_span.appendChild(document.createTextNode("sort by "));
        sort_span.appendChild(sort);

        div_list_menu.appendChild(a_split)
        div_list_menu.appendChild(a_unsplit)

        div_list_menu.appendChild(filter_label)
        div_list_menu.appendChild(filter_input)
        div_list_menu.appendChild(filter_reset)
        div_list_menu.appendChild(sort_span)
        
        return div_list_menu
    },
    
    
    /**
     * update all content for list and data list
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;
        
        for (var i = 0; i < this.m.clones.length; i++) {
            this.updateElem([i]);
        }
        this.update_data_list()
        
        elapsedTime = new Date()
            .getTime() - startTime;
        console.log("update Liste: " + elapsedTime + "ms");
        
        //TODO check order 
        document.getElementById("list_sort_select").selectedIndex = 0;
    },

    /**
     * update content only for data list
     * */
    update_data_list: function () {
        if (Object.keys(this.index_data).length != Object.keys(this.m.data_info).length){
            this.build_data_list()
            this.resize();
            return
        }
        for (var key in this.index_data){
            var val = this.m.data[key][this.m.t]
            if (this.m.norm && this.m.normalization.type=="data") val = this.m.normalize(val,this.m.t)
            if (val > 100) this.index_data[key].innerHTML = val.toFixed(0);
            if (val < 100) this.index_data[key].innerHTML = val.toPrecision(3);
        }
    },

    /**
     * resize List view to match his div size
     * */
    resize: function () {
        //hardcore resize (for firefox and ...)
        //seriously 7 years after the first release of the html5 specs there is no simple way (except with chrome) to put a scrollbar inside a table-cell 
        
        document.getElementById("list_data").style.height = ""
        document.getElementById("list_clones").style.height = "0px"
        
        var data = document.getElementById("data-row").offsetHeight
        if (data>100)data = 100
        document.getElementById("list_data").style.height = data+"px"
        
        var menu = document.getElementById("list_menu").offsetHeight
        var list = $("#list-row").innerHeight()
        document.getElementById("list_clones").style.height = (list-menu)+"px"
        
    },

    /** 
     * fill a div with clone informations
     * @param {dom_object} div_elem - html element to complete
     * @pram {integer} cloneID - clone index
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
            self.openTagSelector(cloneID);
        }
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', this.starPath);
        path.setAttribute('id', 'color' + cloneID);
        path.setAttribute("fill", this.m.tag[this.m.clone(cloneID).getTag()].color);
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
            self.displayInfoBox(cloneID);
        }

        if (this.m.clone(cloneID).coverage < this.m.clone(cloneID).COVERAGE_WARN) {
            span_info.className += " warning" ;
            span_info.appendChild(document.createTextNode("!"));
        } else {
            span_info.appendChild(document.createTextNode("i"));
        }
        
        var span_cluster = document.createElement('span')
        span_cluster.className = "clusterBox";
        if (this.m.clusters[cloneID].length > 1) {
            if (this.m.clone(cloneID).split) {
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

        
        div_elem.appendChild(span_cluster);
        if (this.m.system=="multi") {
            var system = this.m.clone(cloneID).get('germline')
            var span_systemBox = this.m.systemBox(system);
            span_systemBox.className = "systemBox";
            div_elem.appendChild(span_systemBox);
        }
        div_elem.appendChild(span_name);
        div_elem.appendChild(span_info);
        div_elem.appendChild(span_star);
        div_elem.appendChild(span_size);

    },

    /** 
     * fill a div with cluster informations
     * @param {dom_object} div_cluster - html element to complete
     * @pram {integer} cloneID - index of the cluster main clone
     * */
    div_cluster: function (div_cluster, cloneID) {

        var self = this;
        div_cluster.innerHTML = '';

        div_cluster.id = "cluster" + cloneID;
        div_cluster.id2 = cloneID;

        var display = this.m.clone(cloneID).split
        if (this.m.clusters[cloneID].length < 2) display = false

        if (!display) div_cluster.style.display = "none";

        var clusterSize = this.m.clone(cloneID).getSize()
        var clusterReads = this.m.clone(cloneID).getReads()

        for (var i = 0; i < self.m.clusters[cloneID].length; i++) {
            (function (i) {
                var id = self.m.clusters[cloneID][i]
                var color = self.m.clone(id).getColor();
                var div_clone = document.createElement('div');
                div_clone.id = "_" + id;
                div_clone.id2 = id;
                div_clone.style.color = color;
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
                span_name.appendChild(document.createTextNode(self.m.clone(id).getCode()));
                span_name.title = self.m.clone(id).getCode();

                var span_info = document.createElement('span')
                span_info.className = "infoBox";
                span_info.onclick = function () {
                    self.displayInfoBox(self.m.clone(this.parentNode.id2).getHtmlInfo());
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
                    span_stat.appendChild(document.createTextNode( (self.m.clone(id).get('reads', self.m.t)*100/clusterReads).toFixed(1) + "%"));
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


    /**
     * display an edit field to change a clone name
     * @param {integer} cloneID - clone index
     * @param {dom_object} elem - div where will be the edit field
     * */
    editName: function (cloneID, elem) {
        var self = this;
        if (document.getElementById("new_name")) {
            this.update();
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
        input.onkeydown = function (e) {
            e = e || window.event;
            var key = e.keyCode
            if (key == 0) key = e.which 
            if (key == 13) document.getElementById('btnSave')
                .click();
        }
        $(input).focusout(function() {
            setTimeout(function(){self.m.update()},500)
        })
        divParent.appendChild(input);
        divParent.onclick = "";

        var a = document.createElement('a');
        a.className = "button";
        a.appendChild(document.createTextNode("save"));
        a.id = "btnSave";
        a.onclick = function (event) {
            event.preventDefault()
            event.stopPropagation()
            var newName = document.getElementById("new_name")
                .value;
            self.m.clone(cloneID).changeName(newName);
        }
        divParent.appendChild(a);
        $('#new_name')
            .select();
    },

    /** 
     * update(size/style/position) a list of selected clones
     * @augments View
     * param {integer[]} list - array of clone index
     * */
    updateElem: function (list) {
        for (var i = 0; i < list.length; i++) {

            var div = this.index[list[i]];

            if ((this.m.clone(list[i]).isActive() && this.m.clusters[list[i]].length != 0) || this.m.clone(list[i]).id == "other") {

                div.innerHTML = '';
                div.className = "list";
                
                if (this.m.clone(list[i]).isSelected()) {
                    $(div).addClass("list_select");
                } 
                if (this.m.focus ==list[i]) {
                    $(div).addClass("list_focus");
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

    /**
     * update (style only) a list of selected clones
     * @augments View
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function (list) {
        for (var i = 0; i < list.length; i++) {

            var div = this.index[list[i]];

            //color
            var color = this.m.clone(list[i]).getColor();

            $("#" + list[i] + " .nameBox:first")
                .css("color", color)
            $("#" + list[i] + " .sizeBox:first")
                .css("color", color)
            $("#_" + list[i] + " .nameBox:first")
                .css("color", color)
            $("#_" + list[i] + " .sizeBox:first")
                .css("color", color)

            //clone selected ?
            div.className = "list";
            
            if (this.m.clone(list[i]).isSelected()) {
                $(div).addClass("list_select");
            } 
            if (this.m.focus ==list[i]) {
                $(div).addClass("list_focus");
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
    
    /**
     * apply a boolean isFiltered too all Clones<br>
     * filtered clone will be hidden in all views
     * @param {boolean} bool - isFiltered value given to all clones
     * */
    reset_filter: function (bool) {
        for (var i=0; i<this.m.clones.length; i++){
            var c = this.m.clone(i)
            c.isFiltered=bool
        }
    },
    
    /**
     * apply a filter to all clones <br> 
     * a clone need to contain a given string to pass the filter (search through name/nt sequence/sequenceName) (case insensitive)<br>
     * filtered clone will be hidden in all views
     * @param {string} str - required string to pass the filter
     * */
    filter: function (str) {
        this.reset_filter(true)
        for (var i=0; i<this.m.clones.length; i++){
            var c = this.m.clone(i) 
            if (c.getName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequence().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequenceName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
        }
        this.m.update()
    },
    
    /**
     * filter, keep only currently selected clones <br> 
     * */
    focus: function () {
        // this.reset_filter(true)
        for (var i=0; i<this.m.clones.length; i++){
            var c = this.m.clone(i)
            c.isFiltered = !c.isSelected()
        }
        $("#filter_input").val("(focus on some clones)")
        this.m.update()
    },
    
    /**
     * sort clone list by size (reorder html elements in the clone list/ no rebuild)
     * TODO more generic function for sorting
     * */
    sortListBySize: function () {
        self = this;
        var list = jQuery('#list_clones').children()
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");
            if (idA == "list_data") return 1;
            if (idB == "list_data") return -1;
            return self.m.clone(idB).getSize() > self.m.clone(idA).getSize() ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },
    
    /**
     * sort clone list by Top (reorder html elements in the clone list/ no rebuild)
     * TODO more generic function for sorting
     * */
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

    /**
     * sort clone list by V gene (reorder html elements in the clone list/ no rebuild)
     * TODO more generic function for sorting
     * */
    sortListByV: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");
            
            var cloneA = self.m.clone(idA)
            var cloneB = self.m.clone(idB)
            
            //sort by system
            var systemA = cloneA.get('germline')
            if (typeof systemA == "undefined") systemA = "";
            var systemB = cloneB.get('germline')
            if (typeof systemB == "undefined") systemB = "";
            if (systemA != systemB) return systemA.localeCompare(systemB);
            
            //sort by V
            var vA = cloneA.getGene("5",true)
            var vB = cloneB.getGene("5",true)
            return vA.localeCompare(vB);
            
        })
        $("#list_clones")
            .html(sort);
    },

    /**
     * sort clone list by J gene (reorder html elements in the clone list/ no rebuild)
     * TODO more generic function for sorting
     * */
    sortListByJ: function () {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = $(a)
                .attr("id");
            var idB = $(b)
                .attr("id");

            var cloneA = self.m.clone(idA)
            var cloneB = self.m.clone(idB)
            
            //sort by system
            var systemA = cloneA.get('germline')
            if (typeof systemA == "undefined") systemA = "";
            var systemB = cloneB.get('germline')
            if (typeof systemB == "undefined") systemB = "";
            if (systemA != systemB) return systemA.localeCompare(systemB);
            
            //sort by J
            var jA = cloneA.getGene("3",true)
            var jB = cloneB.getGene("3",true)
            return jA.localeCompare(jB);
                
        })
        $("#list_clones")
            .html(sort);
    },

    /**
     * toggle on the display for a given clone of all clones merged with it
     * @param {integer} cloneID - 
     * */
    showCluster: function (cloneID) {
        var self = this
        this.m.clone(cloneID).split = true
        $("#cluster" + cloneID)
            .show(50, function () {
                self.m.updateElem([cloneID])
            });
    },

    /**
     * toggle off the display for a given clone of all clones merged with it
     * @param {integer} cloneID - 
     * */
    hideCluster: function (cloneID) {
        var self = this
        this.m.clone(cloneID).split = false
        $("#cluster" + cloneID)
            .hide(50, function () {
                self.m.updateElem([cloneID])
            });
    },
    
    /**
     * custom event for list click <br>
     * simple click -> select only the clicked clone <br>
     * ctrl+click -> add the clicked clone to the selected clones
     * @param {event} e - click event
     * @param {integer} cloneID - clone index
     * */
    clickList: function (e, cloneID) {
        if (!(e.ctrlKey || e.metaKey)) this.m.unselectAll()
        this.m.select(cloneID)
    },
    
    /**
     * open/build the tag/normalize menu for a clone
     * @param {integer} cloneID - clone index
     * */
    openTagSelector: function (cloneID) {
        var self = this;
        cloneID = typeof cloneID !== 'undefined' ? cloneID : this.cloneID;
        this.tagSelectorList.innerHTML = "";
        this.cloneID=cloneID
        
        for (var i = 0; i < this.m.tag.length; i++) {
            (function (i) {
                var span1 = document.createElement('span');
                span1.className = "tagColorBox tagColor" + i
                span1.onclick = function () {
                    self.m.clone(cloneID).changeTag(i)
                    $(self.tagSelector).hide('fast')
                }
                
                var span2 = document.createElement('span');
                span2.className = "tagName" + i + " tn"
                span2.appendChild(document.createTextNode(self.m.tag[i].name))
                span2.onclick = function () {
                    self.m.clone(cloneID).changeTag(i)
                    $(self.tagSelector).hide('fast')
                }

                var div = document.createElement('div');
                div.className = "tagElem"
                div.appendChild(span1)
                div.appendChild(span2)

                var li = document.createElement('li');
                li.appendChild(div)

                self.tagSelectorList.appendChild(li);
            })(i)
        }
        
        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode("normalize to: "))

        
        this.norm_input = document.createElement('input');
        this.norm_input.type = "number";
        this.norm_input.step = "0.0001"
        
        var span2 = document.createElement('span');
        span2.appendChild(this.norm_input)
        
        this.norm_button = document.createElement('button');
        this.norm_button.appendChild(document.createTextNode("ok"))
        this.norm_button.onclick = function () {
            var cloneID = self.cloneID;
            var size = parseFloat(self.norm_input.value);
            
            if (size>0 && size<1){
                self.norm_input.value = ""
                self.m.clone(cloneID).expected=size;
                self.m.compute_normalization(cloneID, size)
                self.m.update()
                $(self.tagSelector).hide('fast')
            }else{
                console.log({"type": "popup", "msg": "expected input between 0.0001 and 1"});
            }
        }
        this.norm_input.onkeydown = function () {
            if (event.keyCode == 13) self.norm_button.click();
        }
        
        var div = document.createElement('div');
        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(this.norm_button)
        
        var li = document.createElement('li');
        li.appendChild(div)

        this.tagSelectorList.appendChild(li);
        
        
        if (cloneID[0] == "s") cloneID = cloneID.substr(3);
        $(this.tagSelector).show("fast");
        this.tagSelectorInfo.innerHTML = "tag for "+this.m.clone(cloneID).getName()+"("+cloneID+")"; 
    },
    
    
    openDataMenu : function (data) {
        $(this.dataMenu).show("fast");
        this.dataMenuInfo.innerHTML = data;
    },
    
    /**
     * compute and display clone information in a window
     * @param {integer} cloneID - clone index
     * */
    displayInfoBox: function(cloneID) {
        $(this.index[this.clone_info]).find(".infoBox").removeClass("infoBox-open")
        
        if (this.clone_info == cloneID) {
            this.closeInfoBox();
            return;
        }
        
        this.clone_info = cloneID;
        this.infoBox.style.display = "block";
        this.infoBox.lastElementChild.innerHTML = self.m.clone(cloneID).getHtmlInfo();
        $(this.index[cloneID]).find(".infoBox").addClass("infoBox-open")
    },

    /**
     * close clone information box
     * */
    closeInfoBox: function() {
        $(this.index[this.clone_info]).find(".infoBox").removeClass("infoBox-open")
        this.clone_info = -1;
        this.infoBox.style.display = "none";
        this.infoBox.lastElementChild.innerHTML = "";
    }

} //fin prototype
List.prototype = $.extend(Object.create(View.prototype), List.prototype);






