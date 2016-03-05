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

    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z";
    this.thumbsUp = "M 0 906.256l0 -499.968q0 -39.06 27.342 -66.402t66.402 -27.342l93.744 0q32.074 0 60.543 23.436 11.718 -5.859 33.201 -15.624 123.039 -64.449 124.992 -226.548 0 -39.06 27.342 -66.402t66.402 -27.342q56.637 0 105.462 64.449t48.825 146.475q0 66.402 -7.812 103.509 236.313 5.859 265.608 13.671 42.966 11.718 65.425 42.966t22.46 62.496l0 23.436q-1.953 39.06 -27.342 68.355 17.577 33.201 11.718 74.214 -7.812 54.684 -41.013 85.932 15.624 37.107 0 83.979 -17.577 58.59 -52.731 82.026 7.812 27.342 0 54.684 -5.859 17.577 -13.671 33.201 -33.201 60.543 -111.321 60.543l-171.864 0q-91.791 0 -185.535 -21.483 -91.791 -21.483 -126.945 -29.295l-1.953 0q0 -1.953 -2.929 -1.953l-4.883 0l0 -1.953q-27.342 54.684 -83.979 54.684l-93.744 0q-39.06 0 -66.402 -27.342t-27.342 -66.402zm62.496 0q0 13.671 8.789 22.46t22.46 8.789l93.744 0q13.671 0 22.46 -8.789t8.789 -22.46l0 -499.968q0 -13.671 -8.789 -22.46t-22.46 -8.789l-93.744 0q-13.671 0 -22.46 8.789t-8.789 22.46l0 499.968zm31.248 -46.872q0 -19.53 13.671 -33.201t33.201 -13.671 33.201 13.671 13.671 33.201 -13.671 33.201 -33.201 13.671 -33.201 -13.671 -13.671 -33.201zm31.248 0q0 15.624 15.624 15.624t15.624 -15.624 -15.624 -15.624 -15.624 15.624zm124.992 -3.906q0 23.436 27.342 27.342 21.483 5.859 144.522 35.154 87.885 19.53 171.864 19.53l171.864 0q41.013 0 56.637 -27.342 5.859 -15.624 7.812 -23.436 5.859 -11.718 -1.953 -27.342t-29.295 -15.624l-48.825 0q-15.624 0 -15.624 -15.624t15.624 -15.624l50.778 0q31.248 0 48.825 -10.742t22.46 -19.53 10.742 -30.271q21.483 -64.449 -39.06 -64.449l-62.496 0q-15.624 0 -15.624 -15.624t15.624 -15.624l74.214 0q56.637 0 68.355 -66.402 1.953 -21.483 -8.789 -40.037t-41.989 -18.553l-60.543 0q-15.624 0 -15.624 -15.624t15.624 -15.624l62.496 0q60.543 0 62.496 -44.919l0 -21.483q0 -37.107 -37.107 -46.872 -44.919 -11.718 -337.869 -11.718 19.53 -58.59 24.413 -83.979t4.883 -80.073q0 -56.637 -32.224 -102.532t-59.567 -45.895q-31.248 0 -31.248 31.248 -1.953 91.791 -45.895 172.841t-141.593 122.063q-1.953 0 -3.906 .977l-1.953 .977q-25.389 7.812 -25.389 33.201l0 431.613z";
    this.thumbsDown="M 142.848 250.048q0 -14.508 -10.602 -25.11t-25.11 -10.602 -25.11 10.602 -10.602 25.11 10.602 25.11 25.11 10.602 25.11 -10.602 10.602 -25.11zm642.816 321.408q0 -19.53 -11.997 -45.198t-29.853 -26.226q8.37 -9.486 13.95 -26.505t5.58 -30.969q0 -38.502 -29.574 -66.402 10.044 -17.856 10.044 -38.502t-9.765 -41.013 -26.505 -29.295q2.79 -16.74 2.79 -31.248 0 -47.43 -27.342 -70.308t-75.888 -22.878h-71.424q-73.098 0 -190.836 40.734 -2.79 1.116 -16.182 5.859t-19.809 6.975 -19.53 6.417 -21.204 6.138 -18.414 3.627 -17.577 1.674h-17.856v357.12h17.856q8.928 0 19.809 5.022t22.32 15.066 21.483 19.809 22.32 24.552 19.251 23.715 17.577 22.878 12.834 16.74q30.69 37.944 42.966 50.778 22.878 23.994 33.201 61.101t17.019 70.029 21.204 47.43q53.568 0 71.424 -26.226t17.856 -80.91q0 -32.922 -26.784 -89.559t-26.784 -89.001h196.416q27.9 0 49.662 -21.483t21.762 -49.941zm71.424 .558q0 57.474 -42.408 99.882t-100.44 42.408h-98.208q26.784 55.242 26.784 107.136 0 65.844 -19.53 103.788 -19.53 38.502 -56.916 56.637t-84.258 18.135q-28.458 0 -50.22 -20.646 -18.972 -18.414 -30.132 -45.756t-14.229 -50.499 -9.765 -47.151 -17.298 -35.712q-26.784 -27.9 -59.706 -70.866 -56.358 -73.098 -76.446 -86.49h-152.892q-29.574 0 -50.499 -20.925t-20.925 -50.499v-357.12q0 -29.574 20.925 -50.499t50.499 -20.925h160.704q12.276 0 77.004 -22.32 71.424 -24.552 124.434 -36.828t111.6 -12.276h62.496q78.12 0 126.387 44.082t47.709 120.528v2.79q33.48 42.966 33.48 99.324 0 12.276 -1.674 23.994 21.204 37.386 21.204 80.352 0 20.088 -5.022 38.502 27.342 41.292 27.342 90.954z";

    this.build();
    
    this.sort_option = {
        "-" : function () {},
        "size" : function(){self.sortListBySize()},
        "V/5'" : function(){self.sortListByV()},
        "J/3'" : function(){self.sortListByJ()}
    }
}

List.prototype = {
    
    /**
     * Build html elements needed (except clone and data list)<br>
     * need to be done only once
     * */
    build: function () {
        var self =this;
        
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
        span_name.appendChild(document.createTextNode(this.m.clone(cloneID).getShortName()));
        span_name.title = this.m.clone(cloneID).getName();
        span_name.style.color = this.m.clone(cloneID).getColor();

        
        var span_star = document.createElement('div');
        span_star.className = "starBox";
        span_star.onclick = function () {
            self.m.openTagSelector(cloneID);
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

        if (!this.m.clone(cloneID).isVirtual()) {
        span_info.onclick = function () {
            self.m.displayInfoBox(cloneID);
        }

        if (this.m.clone(cloneID).isWarned()) {
            span_info.className += " warning" ;
            span_info.appendChild(icon('icon-warning-1', 'clone information'));
        } else {
            span_info.appendChild(icon('icon-info', 'clone information'));
        }
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
                    self.m.displayInfoBox(id);
                }
                span_info.appendChild(document.createTextNode("i"));

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
            if (key == 13) $('#btnSave')
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

            if ((this.m.clone(list[i]).isActive() && this.m.clusters[list[i]].length != 0)
                || (this.m.clone(list[i]).isVirtual() && this.m.system_selected.indexOf(this.m.clone(list[i]).germline) != -1)) {

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
            if (c.getRevCompSequence().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequenceName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
		}
        this.m.update()
    },
    

//filter with d error
/*filter: function(str){
   this.reset_filter(true)
        for (var i=0; i<this.m.clones.length; i++){
            var c = this.m.clone(i) 
            if (distanceLevenshtein(c.getName().toUpperCase(), str.toUpperCase()) <= d) 
                c.isFiltered = false
            if (distanceLevenshtein(c.getSequence().toUpperCase(), str.toUpperCase() <= d) 
                c.isFiltered = false
            if (distanceLevenshtein(c.getRevCompSequence().toUpperCase(), str.toUpperCase()) <= d ) 
                c.isFiltered = false
            if (distanceLevenshtein(c.getSequenceName().toUpperCase(), str.toUpperCase()) <= d ) 
                c.isFiltered = false
        }
        this.m.update()
    },

*/

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
    
    
    openDataMenu : function (data) {
        $(this.dataMenu).show("fast");
        this.dataMenuInfo.innerHTML = data;
    },
    


} //fin prototype
List.prototype = $.extend(Object.create(View.prototype), List.prototype);








