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
 * List view - build a list of clones/data and keep them up to date with the model
 * @param {string} id_list - dom id of the html who will contain the clone list
 * @param {string} id_data - dom id of the html who will contain the data list
 * @param {Model} model 
 * @class List
 * @constructor 
 * @augments View
 * @this View
 * */
function List(id_list, id_data, model, database) {
    var self=this;
    
    View.call(this, model);
    this.db = database;
    
    this.id = id_list; //ID de la div contenant la liste
    this.id_data = id_data;
    this.index = [];
    this.index_cluster = [];
    this.index_data = {};
    this.sort_lock = true; // By default, lock the list in the current state

    this.build();
    
    this.sort_option = {
        "size" : function(){self.sortListBy(function(id){return self.m.clone(id).getSize();})},
        "V/5'" : function(){self.sortListByV()},
        "J/3'" : function(){self.sortListByJ()}
    }

    this.sort_option_selected = "size"; // Store the selected sort method
    this.selectedAxis = {};
}

List.prototype = {
    
    /**
     * Build html elements needed (except clone and data list)<br>
     * need to be done only once
     * */
    build: function () {
        var self =this;
        
        try {
            //build dataMenu
            this.dataMenu = document.createElement("div");
            this.dataMenu.className = "dataMenu";

            var closedataMenu = document.createElement("span");
            closedataMenu.className = "closeButton" ;
            closedataMenu.appendChild(icon('icon-cancel', ''));
            closedataMenu.onclick = function() {$(this).parent().hide('fast')};
            this.dataMenu.appendChild(closedataMenu);

            this.dataMenuInfo = document.createElement("div");
            this.dataMenu.appendChild(this.dataMenuInfo);

            var div_normalize = document.createElement("div");
            div_normalize.appendChild(document.createElement("span").appendChild(document.createTextNode("normalize to: ")));
            this.data_norm_input = document.createElement("input");
            this.data_norm_input.id = "normalized_data_size";
            this.data_norm_input.step = '0.0001';
            this.data_norm_input.type = 'number';
            div_normalize.appendChild(document.createElement("span").appendChild(this.data_norm_input));
            this.data_norm_input_button = document.createElement("BUTTON");
            this.data_norm_input_button.id = "normalized_size_button";
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

            document.body.appendChild(this.dataMenu);
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },
    
    /** 
     * build html elements for clone and data list <br>
     * need to be done after each .vidjil file change
     * */
    init: function () {
        try {
            this.build_list()
            this.build_data_list()
            this.resize();
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /** 
     * reset/build clone list <br>
     * build an index for a quick access
     * */
    build_list: function () {
        var self = this
        this.index = []

        var div_parent = document.getElementById(this.id);
        div_parent.removeAllChildren();

        var div_list_menu = this.build_list_menu()

        //clone list
        var div_list_clones = document.createElement('div')
        div_list_clones.id = "list_clones"
        for (var i = 0; i < this.m.clones.length; i++) {
            var div = document.createElement('li');
            div.id = i;
            div.className = "list";

            div_list_clones.appendChild(div);
            this.index[i] = new IndexedDom(div);
        }
        
        for (var j = 0; j < this.m.clones.length; j++) {
            this.buildElem(j);
        }
        
        div_parent.appendChild(div_list_menu)
        div_parent.appendChild(div_list_clones)
        
        this.sortListBy(function(id){return self.m.clone(id).getSize();})
    },
    
    /** 
     * reset/build data list <br>
     * build an index for a quick access
     * */
    build_data_list: function () {
        var self=this;
        this.index_data = {}
        
        var div_parent = document.getElementById(this.id_data);
        div_parent.removeAllChildren();

        var div_list_data = document.createElement('div');
        div_list_data.id = "list_data";

        var name_onclick = function () {
            var k = this.parentNode.id.replace("data_", "")
            if (self.m.data_info[k].isActive){
                self.m.data_info[k].isActive = false
            }else{
                self.m.data_info[k].isActive = true
            }
            self.build_data_list()
            graph.updateData();
        }

        var star_onclick = function (key, star) {
            star.onclick = function () {
                self.openDataMenu(key);
            }
        }

        for (var key in this.m.data_info) {
            
            var div = document.createElement('div');
            div.className = "data";
            div.id = "data_"+key;
            div.style.color = this.m.data_info[key].color
            if (!this.m.data_info[key].isActive) div.style.opacity = 0.5
            
            var name = document.createElement('span');
            name.appendChild(document.createTextNode(key))
            name.className = "data_name";
            name.onclick = name_onclick;
            div.appendChild(name)
            
            var value = document.createElement('span');
            value.className = "data_value";
            div.appendChild(value)
            
            var star = document.createElement('span');
            star.className = "starBox";
            star_onclick(key, star);

            star.appendChild(icon('icon-star-2', 'clone tag'))
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
        a_split.appendChild(icon('icon-plus', 'Show all subclones'))
        a_split.id = "list_split_all"
        a_split.onclick = function () {
            self.m.split_all(true)
        }
        
        var a_unsplit = document.createElement('a')
        a_unsplit.className = "button"
        a_unsplit.appendChild(icon('icon-minus', 'Hide all subclones'))
        a_unsplit.id = "list_unsplit_all"
        a_unsplit.onclick = function () {
            self.m.split_all(false)
        }

        var filter_label = document.createElement('span')
        filter_label.appendChild(icon('icon-search-1', 'Search a clone by name, sequence, or V/D/J gene'))
        
        var filter_input = document.createElement('input')
        filter_input.id = 'filter_input'
        filter_input.type = 'text'
        filter_input.setAttribute('placeholder', 'search');
        filter_input.onchange = function () {
            self.m.filter(this.value)
        }
        
        var filter_reset = document.createElement('span')
        filter_reset.id  = "clear_filter"
        filter_reset.appendChild(icon('icon-cancel', 'Clear the search'))
        filter_reset.className = "button"
        filter_reset.onclick = function () {
            document.getElementById('filter_input').value = ''
            self.m.reset_filter(false)
            self.m.update()
        }
        
        var sort_span = document.createElement('span')
        sort_span.className = "list_sort"
        
        var sort = document.createElement('select');
        sort.setAttribute('name', 'sort_list[]');
        sort.id = "list_sort_select"
        sort.className = "list_sort_select"
        sort.onchange = function() {
            self.sort_option[this.value]()
            self.sort_option_selected = this.value
            // Open the lock
            self.sort_lock = false
            var div = document.getElementById("div_sortLock")
            div.className  = "icon-lock-open"
        }
        
        for (var key in this.sort_option) {
            var sort_option = document.createElement("option");
            sort_option.setAttribute('value', key);
            sort_option.appendChild(document.createTextNode(key));
            sort.appendChild(sort_option);
        }
        
        sort_span.appendChild(document.createTextNode("sort by "));
        sort_span.appendChild(sort);
        var lock_div = document.createElement("icon")
        lock_div.id = "div_sortLock"

        lock_div.className = "icon-lock-1"
        lock_div.title  = "Keep list sorted"
        lock_div.onclick = function(){
            var div = document.getElementById("div_sortLock")
            if (self.sort_lock == true){
                self.sort_lock = false
                div.className  = "icon-lock-open"
                div.title  = "Freeze list"
                // Apply sort method at unlock
                self.sort_option[self.sort_option_selected]()
            } else {
                self.sort_lock = true
                div.className  = "icon-lock-1"
                div.title  = "Keep list sorted"
            }
        }

        sort_span.appendChild( lock_div )

        var axis_span = document.createElement('span');
        axis_span.className = "list_axis devel-mode";

        var axis = document.createElement('select');
        axis.setAttribute('name', 'axis_list[]');
        axis.id = "list_axis_select";

        var axOpts = Clone.prototype.axisOptions();
        var available_axis = (new Axes(this.m)).available();
        for (var i in axOpts) {
            var axis_option = document.createElement("option");
            axis_option.setAttribute('value', axOpts[i]);
            axis_option.appendChild(document.createTextNode(available_axis[axOpts[i]].label));
            axis.appendChild(axis_option);
        }
        axis.value = "size";
        this.selectedAxis = available_axis.size;
        axis.onchange = function() {
            self.selectedAxis = available_axis[axis.value];
            self.update()
        }

        axis_span.appendChild(document.createTextNode("display "));
        axis_span.appendChild(axis);


        div_list_menu.appendChild(a_split)
        div_list_menu.appendChild(a_unsplit)

        // div_list_menu.appendChild(filter_label)
        div_list_menu.appendChild(filter_input)
        div_list_menu.appendChild(filter_reset)
        div_list_menu.appendChild(sort_span)
        div_list_menu.appendChild(axis_span)
        
        return div_list_menu
    },
    
    
    /**
     * update all content for list and data list
     * */
    update: function () {

        var list = [];
        for (var i = 0; i < this.m.clones.length; i++) {
            list.push(i);
        }
        this.updateElem(list);
        this.update_data_list()
        
        // Apply selected sort function if no sort lock
        if (this.sort_lock == false){
            this.sort_option[this.sort_option_selected]()
        }
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

    },

    /** 
     * fill a node with clone informations
     * @param {dom_object} div_elem - html element to complete
     * @param {integer} cloneID - clone index
     * */
    div_elem: function (div_elem, cloneID) {

        var self = this;
        var clone = this.m.clone(cloneID)

        clone.div_elem(div_elem);

        div_elem.onmouseover = function () {
            self.m.focusIn(cloneID);
        }
        div_elem.className = "listElem";
        div_elem.id        = "listElem_"+cloneID
        div_elem.style.display = "block";

        var span_name = document.createElement('span');
        span_name.className = "nameBox";
        if (clone.hasSizeConstant())
            span_name.className += " cloneName";
        span_name.ondblclick = function () {
            self.editName(cloneID);
        }
        span_name.onclick = function (e) {
            self.clickList(e, cloneID);
        }

        div_elem.getElementsByClassName("axisBox")[0]
            .onclick = function (e) {
                self.clickList(e, cloneID);
            }

        var span_cluster = document.createElement('span');
        span_cluster.setAttribute("cloneID", cloneID);
        span_cluster.className = "clusterBox";
        span_cluster.id = "clusterBox_"+cloneID;
        span_cluster.onclick = function () {self.toggleCluster(this)};

        var firstChild = div_elem.childNodes[0];
        div_elem.insertBefore(span_cluster, firstChild);

        if (this.m.system == "multi") {
            var system = clone.get('germline')
            var span_systemBox = this.m.systemBox(system);
            span_systemBox.className = "systemBox";
            div_elem.insertBefore(span_systemBox, firstChild);
        }

        div_elem.insertBefore(span_name, firstChild);
    },

    updateElem: function (list) {
        var self = this;

        for (var i = 0; i < list.length; i++) {
            var cloneID = list[i]
                
            if (typeof this.index[cloneID] == "undefined") return false;

            var clone = this.m.clone(cloneID);
            var cloneDom = this.index[cloneID];
            
            if (!( (clone.isActive() && this.m.clusters[cloneID].length !== 0) || 
                (clone.hasSizeOther() && this.m.system_selected.indexOf(clone.germline) !== -1)  )||
                (clone.isFiltered) || 
                (clone.hasSizeDistrib() && !clone.sameAxesAsScatter(this.m.view[1]))){ // TODO: trouver une meilleur manière d'avoir le scatterplot entre els mains
                
                cloneDom.display("main", "none");
                continue;
            }
            
            cloneDom.display("main", "block");
            
            var divClass = "nameBox"
            if (clone.hasSizeConstant())
                divClass = "cloneName";
            if (cloneDom.getElement(divClass) == null) return false

            cloneDom.color(  divClass, clone.getColor());
            cloneDom.content(divClass, clone.getShortName());
            cloneDom.title(  divClass, clone.getNameAndCode());
            
            //update clone axis
            var axis = this.selectedAxis;
            cloneDom.color("axisBox", clone.getColor());
            cloneDom.content("axisBox", axis.pretty ? axis.pretty(axis.fct(clone)).outerHTML : document.createTextNode(axis.fct(clone)).outerHTML)

            //update cluster icon
            if (this.m.clusters[cloneID].length > 1) {
                if (clone.split) {
                    cloneDom.content("clusterBox", icon('icon-minus', 'Hide the subclones').outerHTML)
                    this.showClusterContent(cloneID, false)
                } else {
                    cloneDom.content("clusterBox", icon('icon-plus', 'Show the subclones').outerHTML)
                    this.hideClusterContent(cloneID, false)
                }
                self.div_cluster(document.getElementById("cluster" + cloneID), cloneID);
            } else {
                cloneDom.getElement("clusterBox").appendChild(document.createTextNode(' '));
                if (this.m.clusters[cloneID].length < 2) display = false
                document.getElementById("cluster"+cloneID).style.display = "none";
            }
        }
    },
    

    /** 
     * fill a div with cluster informations
     * @param {dom_object} div_cluster - html element to complete
     * @pram {integer} cloneID - index of the cluster main clone
     * */
    div_cluster: function (div_cluster, cloneID) {

        var self = this;
        div_cluster.removeAllChildren();

        div_cluster.id = "cluster" + cloneID;
        div_cluster.id2 = cloneID;

        var display = this.m.clone(cloneID).split
        if (this.m.clusters[cloneID].length < 2) display = false

        if (!display) div_cluster.style.display = "none";

        var clusterSize = this.m.clone(cloneID).getSize()
        var clusterReads = this.m.clone(cloneID).getReads()

        var buildDivClone = function (i) {
            var id = self.m.clusters[cloneID][i]
            var clone = self.m.clone(id)
            var color = clone.getColor();
            var div_clone = document.createElement('div');
            div_clone.id = "_" + id;
            div_clone.id2 = id;
            div_clone.style.color = color;
            div_clone.className = "listElem";
            div_clone.onmouseover = function () {
                self.m.focusIn(id);
            }
            self.index_cluster[id] = new IndexedDom(div_clone);
            if (clone.isSelected) div_clone.className = "listElem selected";

            var span_name = document.createElement('span');
            span_name.className = "nameBox";

            if (!self.m.clone(cloneID).hasSizeOther())
                // todo; delete #3989
                span_name.className += " cloneName";

            span_name.onclick = function (e) {
                self.clickList(e, id);
            }
            span_name.appendChild(document.createTextNode(clone.getCode()));
            span_name.title = clone.getCode();

            var span_info = document.createElement('span')
            span_info.className = "infoBox";
            span_info.onclick = function () {
                self.m.displayInfoBox(id);
            }
            span_info.appendChild(icon('icon-info', 'clone information'));

            var img = document.createElement('span');
            img.onclick = function () {
                self.m.split(cloneID, this.parentNode.id2);
            }
            if (id != parseInt(cloneID)) {
                img.appendChild(icon('icon-cancel', 'Remove this subclone from the clone'));
            }
            img.className = "delBox";
            img.id = "delBox_list_"+id;

            var span_stat = document.createElement('span');
            span_stat.className = "axisBox";

            var r = 100
            if (clusterSize !== 0) {
                span_stat.appendChild(document.createTextNode( (clone.get('reads', self.m.t)*100/clusterReads).toFixed(1) + "%"));
            } else {
                span_stat.appendChild(document.createTextNode("0%"))
            }

            div_clone.appendChild(img);
            div_clone.appendChild(span_info);
            div_clone.appendChild(span_name);
            div_clone.appendChild(span_stat);
            div_cluster.appendChild(div_clone);
        }

        for (var i = 0; i < self.m.clusters[cloneID].length; i++) {
            buildDivClone(i);
        }
    },


    /**
     * display an edit field to change a clone name
     * @param {integer} cloneID - clone index
     * @param {dom_object} elem - div where will be the edit field
     * */
    editName: function (cloneID) {
        var self = this;
        if (document.getElementById("new_name")) {
            this.update();
        }
        var divParent = this.index[cloneID].getElement("nameBox");
        var old_event = divParent.onclick;
        this.index[cloneID].getElement("nameBox").removeAllChildren();
        this.index[cloneID].clear("nameBox");

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
            if (key === 0) key = e.which
            if (key == 13) {
                $('#btnSave').click();
                $(input).blur();
            }
        }
        $(input).focusout(function() {
            setTimeout(function(){self.m.update()},500)
            divParent.onclick = old_event;
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
            self.index[cloneID]= new IndexedDom(self.index[cloneID].getElement("main"));
            var newName = document.getElementById("new_name")
                .value;
            self.m.clone(cloneID).changeName(newName);
        }
        divParent.appendChild(a);
        $('#new_name')
            .select();
    },

    /** 
     * */
    buildElem: function (cloneID) {
        var div = this.index[cloneID].getElement("main");
        div.style.display = "block";
        if (!this.m.clone(cloneID).isActive()) div.style.display = "none";
        div.removeAllChildren();

        var div2 = document.createElement('div');
        this.div_elem(div2, cloneID);
        div.appendChild(div2);

        var div3 = document.createElement('div');
        this.div_cluster(div3, cloneID);
        div.appendChild(div3);
    },

    /**
     * update (style only) a list of selected clones
     * @augments View
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function (list) {
        for (var i = 0; i < list.length; i++) {

            var cloneDom = this.index[list[i]];
            var clusterDom = this.index_cluster[list[i]];
            var clone = this.m.clone(list[i])

            if (!((clone.isActive() && this.m.clusters[list[i]].length !== 0) ||
                  (clone.hasSizeOther() && this.m.system_selected.indexOf(clone.germline) != -1))){
                cloneDom.display("main", "none");
            }else{
                if (clone.hasSizeDistrib() && !clone.sameAxesAsScatter(this.m.view[1])){
                    // TODO: trouver une meilleur manière d'avoir le scatterplot entre els mains
                    cloneDom.display("main", "none");
                } else if (clone.isFiltered){
                    cloneDom.display("main", "none");
                } else {               
                    cloneDom.display("main", "block");
                    //color
                    var color = clone.getColor();
                    cloneDom.color("nameBox", color)
                    cloneDom.color("axisBox", color)

                    //clone selected ?
                    var classname = "list";
                    if (clone.isSelected())     classname += " list_select";
                    if (this.m.focus ==list[i]) classname += " list_focus";
                    cloneDom.classname("main", classname);

                    //cluster sequence selected?
                    if (clusterDom) {
                        clusterDom.color("nameBox", color)
                        clusterDom.color("axisBox", color)

                        if (clone.isSelected()) clusterDom.classname("main", "listElem list_select");
                        else                    clusterDom.classname("main", "listElem");
                    }
                }
            }
        }
    },

    
    /**
     * sort clone list by size (reorder html elements in the clone list/ no rebuild)
     * */
    sortListBy:function(fct){
        self = this;
        var list = jQuery('.list')
        var value = {};
        for (var i=0; i<list.length; i++){
            var id = list[i].getAttribute("id")
            value[id]=fct(id);
        }
        var sort = list.sort(function (a, b) {
            var idA = a.getAttribute("id")
            var idB = b.getAttribute("id")
            return value[idB] > value[idA] ? 1 : -1;
        })
        $("#list_clones")
            .html(sort);
    },
    

    sortListByGene: function(gene_type) {
        self = this;
        var list = jQuery('.list')
        var sort = list.sort(function (a, b) {
            var idA = a.getAttribute("id");
            var idB = b.getAttribute("id");
            
            var cloneA = self.m.clone(idA)
            var cloneB = self.m.clone(idB)
            
            //sort by system
            var systemA = cloneA.get('germline')
            if (typeof systemA == "undefined") systemA = "";
            var systemB = cloneB.get('germline')
            if (typeof systemB == "undefined") systemB = "";
            if (systemA != systemB) return systemA.localeCompare(systemB);
            
            // sort by (un)defined
            if (cloneA.hasSizeOther()) {
                if (cloneB.hasSizeOther())
                    return cloneA.getName().localeCompare(cloneB.getName())
                return 1
            } else if (cloneB.hasSizeOther())
                return -1

            //sort by gene
            var geneA = cloneA.getGene(gene_type,true)
            var geneB = cloneB.getGene(gene_type,true)
            return geneA.localeCompare(geneB);
            
        })
        $("#list_clones")
            .html(sort);
    },

    /**
     * sort clone list by V gene (reorder html elements in the clone list/ no rebuild)
     * */
    sortListByV: function () {
        this.sortListByGene("5")
    },

    /**
     * sort clone list by J gene (reorder html elements in the clone list/ no rebuild)
     * */
    sortListByJ: function () {
        this.sortListByGene("3")
    },

    /**
     * toggle the display for a given clone of all clones merged with it
     * Action by direct click on the show button of the list element
     * @param {String} div - div name of the show button 
     * */
    toggleCluster: function (div) {
        var cloneID = div.getAttribute("cloneID");
        var self = this
        if (this.m.clone(cloneID).split){
            this.m.clone(cloneID).split = false
            this.hideClusterContent(cloneID, true)
        }else{
            this.m.clone(cloneID).split = true
            this.showClusterContent(cloneID, true)
        }
    },

    /**
     * toggle on the display for a given clone of all clones merged with it
     * @param {integer} cloneID -
     * @param {bool}    update  - Set the content of the update fct. Slow down the refresh if call from the model on multiple clones 
     * */
    showClusterContent: function(cloneID, update){
        var self = this
        var fct;
        if (update == true || update == undefined) 
            self.m.updateElem([cloneID]) 
        $("#cluster" + cloneID)
            .show(50);
    },

    /**
     * toggle off the display for a given clone of all clones merged with it
     * @param {integer} cloneID - 
     * @param {bool}    update  - Set the content of the update fct. Slow down the refresh if call from the model on multiple clones 
     * */
    hideClusterContent: function(cloneID, update){
        var self = this
        var fct;
        if (update == true || update == undefined) 
            self.m.updateElem([cloneID]) 
        $("#cluster" + cloneID)
            .hide(50);
    },
    
    /**
     * custom event for list click <br>
     * simple click -> select only the clicked clone <br>
     * ctrl+click -> add the clicked clone to the selected clones
     * @param {event} e - click event
     * @param {integer} cloneID - clone index
     * */
    clickList: function (e, cloneID) {
        this.m.unselectAllUnlessKey(d3.event)
        this.m.select(cloneID)
    },
    
    
    openDataMenu : function (data) {
        $(this.dataMenu).show("fast");
        this.dataMenuInfo.innerHTML = data;
    },
    

    shouldRefresh: function () {
        this.init();
        this.update();
    }

} //fin prototype
List.prototype = $.extend(Object.create(View.prototype), List.prototype);
