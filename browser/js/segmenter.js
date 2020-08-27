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
 *
 * segmenter.js
 *
 * segmenter
 *
 * content:
 *
 *
 */


CGI_ADDRESS = ""

SEGMENT_KEYS = ["4", "4a", "4b"]

/** segment 
 * Segment is a view object to see the sequences of the selected clones in the model <br>
 * some function are provided to allow alignement / highlight / imgt request / ...
 * @constructor
 * @param {string} id - dom id of the html div who will contain the segmenter
 * @param {Model} model
 * @augments View
 * @this View
 * */
function Segment(id, model, database) {
    
    View.call(this, model);
    this.db = database;
        
    if (typeof config != 'undefined') {
        if (config.cgi_address){
            if (config.cgi_address) CGI_ADDRESS = config.cgi_address
            if (config.cgi_address == "default") CGI_ADDRESS = "http://"+window.location.hostname+"/cgi/"
        }
    }
    
    this.id = id; //ID de la div contenant le segmenteur
    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z";
    this.cgi_address = CGI_ADDRESS
    this.m = model
    this.memtab = [];
    this.sequence = {};
    this.sequence_order = [];
    this.is_open = false;
    this.amino = false;
    this.aligned = false;
        
    this.fixed = false;         // whether the segmenter is fixed
    this.germline = this.m.germline;
    //elements to be highlited in sequences
    this.highlight = [
        {'field' : "", 'color': "red", 'type': 'highlight'},
        {'field': "", 'color': "orange", 'type': 'highlight'},
        {'field' : "", 'color': "blue", 'type': 'highlight'},
        {'field' : "", 'color': "green", 'type': 'highlight'},
        {'field' : "", 'color': "yellow", 'type': 'highlight'}
    ];

    this.selectedAxis = [];

    this.index = [];
}


Segment.prototype = {

    /**
     * init the view before use
     * */
    init: function () {
        this.build()
    },
    
    /**
     * build needed html elements (button / highlight menu)
     * 
     * */
    build: function () {
        var self = this
        try {
            var parent = document.getElementById(this.id)
            parent.removeAllChildren();

            //bot-bar
            var div = document.createElement('div');
            div.className = "bot-bar"

            //menu-segmenter
            var div_menu = document.createElement('div');
            div_menu.className = "menu-segmenter"
            div_menu.onmouseover = function () {
                self.m.focusOut()
            };

            //merge button
            var span = document.createElement('span');
            span.id = "merge"
            span.setAttribute('title', 'Merge the selected clones into a unique cluster')
            span.className = "button"
            span.onclick = function () {
                self.m.merge()
            }
            span.appendChild(document.createTextNode("cluster"));
            div_menu.appendChild(span)

            //align button
            if (this.cgi_address) {
            span = document.createElement('span');
            span.id = "align"
            span.setAttribute('title', 'Align the sequences')
            this.updateAlignmentButton();
            span.className = "button"
            span.onclick = function () {
                self.toggleAlign()
            }
            span.appendChild(document.createTextNode("align"));
            div_menu.appendChild(span)
            }

            //axis menu
            span = document.createElement('span');
            span.id = "segmenter_axis_menu";
            span.className = "pointer devel-mode";
            span.onmouseover = function() {showSelector('segmenter_axis_select')};
            span.appendChild(document.createTextNode("axis"));

            var axis = document.createElement('span');
            axis.id = "segmenter_axis_select";
            axis.className = "selector";
            axis.style.position = "absolute";
            axis.style.top = "-230px";
            axis.onmouseout = function() {hideSelector('segmenter_axis_select')};

            var tmp = document.createElement('div');

            var available_axis = Axis.prototype.available()
            var self_update = function() {
                var index = parseInt(this.id.substring(3)); // ex: "sai5" -> index = 5
                if (this.checked) self.selectedAxis[index] = Axis.prototype.getAxisProperties(this.value)
                else delete self.selectedAxis[index];
                self.update();
            }
            for (var i in available_axis) {
                var axis_option = document.createElement('div');
                var axis_input = document.createElement('input');
                axis_input.setAttribute('type', "checkbox");
                axis_input.setAttribute('value', available_axis[i]);
                axis_input.setAttribute('id', "sai"+i); // segmenter axis input
                if (available_axis[i] == "size") axis_input.setAttribute('checked', "");
                axis_input.onchange = self_update;

                var axis_label = document.createElement('label');
                axis_label.setAttribute('for', "sai"+i);
                axis_label.appendChild(document.createTextNode(available_axis[i]));

                axis_option.appendChild(axis_input);
                axis_option.appendChild(axis_label);
                tmp.appendChild(axis_option);
            }
            this.selectedAxis[available_axis.indexOf("size")] = Axis.prototype.getAxisProperties("size")

            axis.appendChild(tmp);
            span.appendChild(axis);

            div_menu.appendChild(span)

            //toIMGT button
            span = createSendToButton("toIMGT", 'imgt', "❯ IMGT/V-QUEST",
                                      'Send sequences to IMGT/V-QUEST and see the results in a new tab', this);
            div_menu.appendChild(span)

            //toIMGTSeg button
            span = createSendToButton("toIMGTSeg", "IMGTSeg", "▼",
                                      'Send sequences to IMGT/V-QUEST and loads the results in the sequence panel', this);
            span.className += " button_next";
            div_menu.appendChild(span);

            //toIgBlast button
            span = createSendToButton("toIgBlast", 'igBlast', "❯ IgBlast",
                                      'Send sequences to NCBI IgBlast and see the results in a new tab', this);
            div_menu.appendChild(span);

            //toARResT button
            span = createSendToButton("toARResT", "arrest", "❯ ARResT/CJ",
                                      'Send sequences to ARResT/CompileJunctions and see the results in a new tab', this);
            span.className += " devel-mode";
            div_menu.appendChild(span);

            //toCloneDB button
            span = createSendToButton('toCloneDB', '', "❯ CloneDB",
                                      'Send sequences to EC-NGS/CloneDB in the background',
                                      this,
                                      function () {
                                          self.db.callCloneDB(self.m.getSelected());
                                      });
            span.className += (typeof config !== 'undefined' && config.clonedb) ? "" : " devel-mode";
            div_menu.appendChild(span);

            //toBlast button
            span = createSendToButton("toBlast", "blast",
                                      "❯ Blast",
                                      'Send sequences to Ensembl Blast and see the results in a new tab', this);
            div_menu.appendChild(span);

            // to AssignSubset
            span = createSendToButton("toAssignSubsets", "assignSubsets", "❯ AssignSubsets",
                                      "Send sequences to ARResT/AssignSubsets to classify IGH sequence in a CLL subset", this);
            div_menu.appendChild(span);

            //toClipBoard button
            span = document.createElement('span');
            span.id = "toClipBoard";
            span.className = "button";
            span.appendChild(document.createTextNode("❯ clipBoard"));
            // div_menu.appendChild(span)

            //germline button
            /*
            span = document.createElement('span');
            span.id = "germline"
            span.setAttribute('title', 'add germline')
            span.className = "button"
            span.onclick = function () {
                self.add_all_germline_to_segmenter()
            }
            span.appendChild(document.createTextNode("germline"));
            div_menu.appendChild(span)
            */

            //checkbox to fix the segmenter
            span_fixsegmenter = document.createElement('span')
            span_fixsegmenter.id = "fixsegmenter"
            span_fixsegmenter.className = "button"
            var i_elem = document.createElement('i');
            i_elem.setAttribute("title", 'fix the segmenter in his position');
            i_elem.onclick = function() {
                self.switchFixed();
            }
            span_fixsegmenter.appendChild(i_elem);

            div.appendChild(div_menu);


            //menu-highlight
            var div_menu_highlight = this.updateHighLightMenu();
            div.appendChild(div_menu_highlight);

            span = document.createElement("span");
            span.id = 'highlightCheckboxes';

            if(this.findPotentialField().indexOf('cdr3') != -1) {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.id = 'vdj_input_check';
                input.checked = (self.m.localStorage && localStorage.getItem('segmenter_cdr3'))

                input.addEventListener('change', (event) => {
                    if (event.target.checked) {
                        self.highlight[0].field = "cdr3"
                        self.highlight[0].color = "red"
                        if (self.m.localStorage) localStorage.setItem('segmenter_cdr3', "checked")
                    } else {
                        self.highlight[0].field = ""
                        if (self.m.localStorage) localStorage.removeItem('segmenter_cdr3')
                    }
                    self.update()
                })

                var label = document.createElement('label');
                label.setAttribute("for", 'vdj_input_check');
                label.innerHTML = 'CDR3';

                input.setAttribute("title", 'Display CDR3 computed by Vidjil');
                label.setAttribute("title", 'Display CDR3 computed by Vidjil');

                span.appendChild(input);
                span.appendChild(label);
            }
            div.appendChild(span);


            // Checkbox for id
            /*
             var windowCheckbox = document.createElement('input');
             windowCheckbox.type = "checkbox";
             windowCheckbox.onclick = function () {
             var id = 1;
             if (this.checked){
             segment.highlight[id].field = "id";
             }else{
             segment.highlight[id].field = "";
             }
             segment.update();
             }
             div_highlight.appendChild(windowCheckbox)
             div_highlight.appendChild(document.createTextNode("id"));
             */
            //div.appendChild(div_highlight)


            var div_focus = document.createElement('div');
            div_focus.className = "focus cloneName"
            div.appendChild(div_focus)

            var div_stats = document.createElement('div');
            div_stats.className = "stats"

            var stats_content = document.createElement('span');
            stats_content.className = "stats_content"
            div_stats.appendChild(stats_content)

            // Focus and hide
            var focus_selected = document.createElement('a');
            focus_selected.appendChild(document.createTextNode("(focus)"))
            focus_selected.className = "focus_selected"
            focus_selected.id        = "focus_selected"
            focus_selected.onclick = function () { self.m.focusSelected() }
            div_stats.appendChild(focus_selected)

            div_stats.appendChild(document.createTextNode(' '))

            var hide_selected = document.createElement('a');
            hide_selected.appendChild(document.createTextNode("(hide)"))
            hide_selected.className = "focus_selected"
            hide_selected.id        = "hide_selected"
            hide_selected.onclick = function () { self.m.hideSelected() }
            div_stats.appendChild(hide_selected)

            
            // Tag/Star
            var span_star = document.createElement('span')
            span_star.setAttribute('class', 'button');
            span_star.setAttribute("title", 'Tag selected clones');
            span_star.onclick = function (e) {
                if (m.getSelected().length > 0) { self.m.openTagSelector(m.getSelected(), e); }
            }
            var tag_icon = document.createElement('i')
            tag_icon.id  = "tag_icon__multiple"
            tag_icon.classList.add('icon-star-2')
            span_star.appendChild(tag_icon)
            div_stats.appendChild(span_star);

            div.appendChild(div_stats)
            div_stats.appendChild(span_fixsegmenter);


            parent.appendChild(div)

            this.div_segmenter = document.createElement('div');
            this.div_segmenter.className = "segmenter"
            //listSeq
            ul = document.createElement('ul');
            ul.id = "listSeq"
            this.div_segmenter.appendChild(ul)

            parent.appendChild(this.div_segmenter)

            
            $(this.div_segmenter)
                .scroll(function(){
                    var leftScroll = $(self.div_segmenter).scrollLeft();
                    $('.seq-fixed').css({'left':+leftScroll});
                })
                .mouseenter(function(){
                    if (! self.fixed){
                        if (!self.is_open){
                            var seg = $(self.div_segmenter),
                            curH = seg.height(),
                            autoH = seg.css('height', 'auto').height();
                            if (autoH > 100){
                                if (autoH > 500) autoH = 500
                                seg.stop().height(curH).animate({height: autoH+5}, 250);
                            }else{
                                seg.stop().height(curH)

                            }
                            self.is_open = true
                        }
                    }
                });

            $('#'+this.id)
                .mouseleave(function(e){
                    if (e.relatedTarget !== null && self.is_open){
                        setTimeout(function(){
                            if (!$(".tagSelector").hasClass("hovered")){
                                var seg;
                                if (! self.fixed){
                                    seg = $(self.div_segmenter)
                                    seg.stop().animate({height: 100}, 250);
                                }else{
                                    seg.stop();
                                }
                            self.is_open = false
                            }
                         }, 200);
                    }
                });
            this.setFixed(this.fixed);
            
            for (var c_id = 0; c_id < self.m.clones.length; c_id++)
                self.build_skeleton(c_id);
            
            
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },


    /**
     * get the highlight select box according to existing values in model.
     * Mainly ADN recognized sequence and field with start/stop values.
     *
     */
    updateHighLightMenu: function () {
        var self = this;
        var div_highlight = document.createElement('div');
        div_highlight.className = "menu-highlight devel-mode";
        div_highlight.onmouseover = function () {
            self.m.focusOut()
        };

        // Guessing fields, populating dropdown lists
        var fields = this.findPotentialField();
        var filter = ["sequence", "_sequence.trimmed nt seq"]; // Fields that are ignored

        var input_onchange = function () {
            var id = this.id.replace("highlight_", "");
            self.highlight[id].field = this.options[this.selectedIndex].text;
            self.update();
        };

        for (var i in this.highlight) {
            var input = document.createElement('select');
            input.style.borderColor = this.highlight[i].color;
            input.style.width = "60px";
            input.id = "highlight_" + i;

            for (var j in fields) {
                if (filter.indexOf(fields[j]) == -1) {
                    var option = document.createElement('option');
                    option.appendChild(document.createTextNode(fields[j]));
                    input.appendChild(option);
                }
            }

            input.onchange = input_onchange;

            div_highlight.appendChild(input);
        }

        // Checkbox for cdr3
        if (fields.indexOf("cdr3") != -1) {

            var aaCheckbox = document.createElement('input');
            aaCheckbox.id = "segmenter_aa"
            aaCheckbox.type = "checkbox";
            aaCheckbox.onclick = function () {
                self.amino = this.checked;
                self.update();
            }
            div_highlight.appendChild(aaCheckbox);
            div_highlight.appendChild(document.createTextNode("AA"));
        }
        return div_highlight;
    },

    /**
     * clear functionnal data in order to start from a clean instance when loading a new .vidjil file
     * */
    reset: function() {
        this.sequence = {}
        this.sequence_order = []
        this.index = []
        if (document.getElementById("listSeq"))
            document.getElementById("listSeq").innerHTML = ""  
    },

    removeGermline:function(id){
        elem = document.getElementById("seq"+id);
        elem.parentNode.removeChild(elem)
        delete this.sequence[id];
        this.sequence_order.splice( this.sequence_order.indexOf(id), 1 );
    },

    /**
     * 
     */
    update: function() {
        var self = this;
        try{
            var list = [];
            for (var i = 0; i < this.m.clones.length; i++) list.push(i);
            this.updateElem(list);
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /**
     * check the list for newly selected/unselected clones to add/remove to segmenter 
     * update others
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElem: function (list) {
        var self = this;
        list.sort(function(a,b){ return self.m.clone(b).getSize() - self.m.clone(a).getSize() })
        var sliderNeedUpdate = (Object.keys(this.sequence).length==0)//slider move only if we add sequence to an empty segmenter

        for (var i = 0; i < list.length; i++) {     

            var cloneID = list[i];

            var liDom = this.index[cloneID];
            
            if (this.m.clone(cloneID).isSelected()) {               // the clone is selected
                this.addToSegmenter(cloneID);
                liDom = this.index[cloneID];
                if (liDom == null) continue;
                liDom.display("main", "block");
                this.div_elem(liDom.getElement("seq-fixed"), cloneID);
                var seq = this.sequence[cloneID].toString(this);
                liDom.content("seq-mobil", seq);        
            } else {    
                if (this.sequence[cloneID]){                         
                    delete this.sequence[cloneID];                  //  > delete the sequence 
                    this.sequence_order.splice( this.sequence_order.indexOf(cloneID), 1 );
                }

                liDom = this.index[cloneID];
                if (liDom == null) 
                    continue;                                    
                else
                    liDom.display("main", "none");                          //  > hide the dom element
            }
        }

        if (sliderNeedUpdate) this.show();
        this.updateAlignmentButton()
        this.updateStats();  
    },

    /**
     * used to highlight mouseover clones or selected clones.
     * in the segmenter case selecting/unselecting clones produces more than just a highlight and need an update
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function (list) {   
        this.updateElem(list);    
    },

    isClone: function (id) {
        return ((typeof this.m.clone(id) != "undefined") && this.m.clone(id).isSelected())
    },
    
    isGermline: function (id) {
        return (typeof this.germline[this.sequence[id].locus] != "undefined")
    },

    /**
     * enable/disable align button if their is currently enough sequences selected
     * */
    updateAlignmentButton: function() {
        var self = this;
        var align = document.getElementById("align");
        list = this.sequenceListInSegmenter()
        if (align !== null) {
            if (list.length > 1) {
                align.className = "button";
                align.onclick = function() {self.toggleAlign();};
            }
            else {
                align.className = "";
                align.className = "button inactive";
                align.onclick = function() {};
            }
        }
    },

    sequenceListInSegmenter: function() {
        return Object.keys(this.sequence);
    },


    /**
     * complete a node with a clone information/sequence
     * @param {dom_object} div_elem - html element to complete
     * @param {integer} cloneID - clone index 
     * */
    div_elem: function (div_elem, cloneID) {

        var self = this;
        var clone = this.m.clone(cloneID)

        clone.div_elem(div_elem);

        div_elem.className = "seq-fixed cloneName";
        if (this.m.focus == cloneID) {
            $(div_elem).addClass("list_focus");
        } 

        var seq_name = document.createElement('span');
        seq_name.className = "nameBox";

        var del = document.createElement('span')
        del.className = "delBox"
        del.appendChild(icon('icon-cancel', 'Unselect this clone'));
        del.onclick = function () {
            clone.unselect();
            self.aligned = false;
        }
        seq_name.appendChild(del);

        var span_name = document.createElement('span');
        span_name.className = "nameBox2";
        span_name.appendChild(document.createTextNode(clone.getShortName()));
        seq_name.appendChild(span_name);
        seq_name.title = clone.getName();
        seq_name.style.color = clone.color;

        var span_axis = div_elem.getElementsByClassName("axisBox")[0];
        span_axis.style.color = clone.getColor();
        this.fillAxisBox(span_axis, clone);

        if (this.m.clone_info == cloneID) {
            div_elem.getElementsByClassName("infoBox")[0]
                .className += " infoBox-open"
        }

        div_elem.insertBefore(seq_name, div_elem.childNodes[0]);
    },

    fillAxisBox: function (axisBox, clone) {
        axisBox.removeAllChildren();
        var available_axis = Axis.prototype.available()
        for (var i in this.selectedAxis) {
            var span = document.createElement('span');
            var axis = this.selectedAxis[i];
            span.removeAllChildren();
            span.appendChild(axis.pretty ? axis.pretty(axis.fct(clone)) : document.createTextNode(axis.fct(clone)));
            span.setAttribute('title', this.selectedAxis[i].doc);
            span.className = available_axis[i];
            axisBox.appendChild(span);
        }
    },
        
    /**
     * add a clone in the segmenter<br>
     * build a div with clone information and sequence
     * @param {intger} cloneID - clone index 
     * */
    addToSegmenter: function (cloneID) {
        var self = this;
        if ( !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return
        }

        if (this.sequence[cloneID]){
            // This clone has already been added to the segmenter
            return
        }

        this.aligned = false ;
        if (this.aligned) this.resetAlign()
        this.sequence[cloneID] = new Sequence(cloneID, this.m, this)
        this.sequence[cloneID].load();
        this.sequence_order.push(cloneID);
        
        if (document.getElementById("seq" + cloneID) != null ){                 //div already exist
            document.getElementById("seq" + cloneID).style.display = "block";
            var divParent = document.getElementById("listSeq");
            divParent.appendChild(document.getElementById("seq" + cloneID));
            return;
        }
        else{                                                                   //create div
            this.build_skeleton(cloneID)
        }

    },

    build_skeleton: function(cloneID){
        if ( !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return
        }

        var divParent = document.getElementById("listSeq");
        var li = document.createElement('li');
        li.id = "seq" + cloneID;
        li.className = "sequence-line";
        li.onmouseover = function () {
            self.m.focusIn(cloneID);
        }

        var spanF = document.createElement('span');
        spanF.className = "seq-fixed";
        li.appendChild(spanF);

        var spanM = document.createElement('span');
        spanM.className = "seq-mobil";
        li.appendChild(spanM);

        divParent.appendChild(li);

        this.index[cloneID] = new IndexedDom(li);
    },

    /**
    * select all the germline of a clone .
    * add them to the segmenter
    **/
    add_all_germline_to_segmenter : function() {
       for (var id in this.sequence) {
           if (this.isClone(id)) {
                var c = this.m.clone(id)
                this.addGermlineToSegmenter(c.getGene("3"),c.germline)
                this.addGermlineToSegmenter(c.getGene("4"),c.germline)
                this.addGermlineToSegmenter(c.getGene("5"),c.germline)
            }
        }
        this.show();
    },

    /**
    * complete a node with a clone information/sequence
    * @param {dom_object} div_elem - html element to complete
    * @param {integer} id - sequence id 
    **/
    // TODO rename this method, or refactor this into the div_elem method
    div_element:function(div_elem, id) {

        var self = this; 
        div_elem.removeAllChildren(); 
        div_elem.className = "seq-fixed cloneName";
        if (this.m.focus == id) { 
        $(span).addClass("list_focus");         } 
        var seq_name = document.createElement('span');
        seq_name.className = "nameBox";
        var del = document.createElement('span')
        del.className = "delBox"        
        del.appendChild(icon('icon-cancel', 'Unselect this clone'));
        del.onclick = function () {
            delete self.sequence[id];
            self.sequence_order.splice( self.sequence_order.indexOf(id), 1 );
            self.aligned = false;
            self.removeGermline(id)
        }
        seq_name.appendChild(del);
        var span_name = document.createElement('span');
        span_name.className = "nameBox2";
        span_name.appendChild(document.createTextNode(id));
        seq_name.appendChild(span_name);
        seq_name.title = id;
        div_elem.appendChild(seq_name);

        // create some elements to fill out the space, ideally refactor this method.
        var fake_info = document.createElement('span');
        fake_info.className = "infoBox";
        var fake_star = document.createElement('span');
        fake_star.className = "starBox";
        var fake_axis = document.createElement('span');
        fake_axis.className = "axisBox";
        var fake_size = document.createElement('span');
        fake_size.className = 'Size';
        var fake_size_box = document.createElement('span');
        fake_size_box.className = "sizeBox sixChars";

        fake_size.appendChild(fake_size_box);
        fake_axis.appendChild(fake_size);
        div_elem.appendChild(fake_info);
        div_elem.appendChild(fake_star);
        div_elem.appendChild(fake_axis);
    },

    /**
    * add a sequence to the segmenter
    * build a div with sequence information and sequence
    * @param {str} id sequence id
    * @param {str} sequence
    **/

    addSequenceTosegmenter : function(id, locus, str){
        var self =this
        this.aligned = false ;
        this.resetAlign()
        if ( typeof this.sequence[id]=="undefined"){
            this.sequence[id] = new genSeq(id, locus, this.m, this)
            this.sequence[id].load("str")
            var divParent = document.getElementById("listSeq");
            var previous_li = divParent.getElementsByTagName("li");
            this.sequence_order.push(id);

            var li = document.createElement('li');
            li.id = "seq" + id;
            li.className = "sequence-line";
            var spanF = document.createElement('span');
            this.div_element(spanF, id);
            var spanM = document.createElement('span');

            spanM.className = "seq-mobil";
            spanM.innerHTML = this.sequence[id].load(str).toString(this);
            li.appendChild(spanF);
            li.appendChild(spanM);
            divParent.appendChild(li);
        }
    },

    /**
    * get the germline from the germline object
    * and use add germline to the segmenter
    * @param {str} id sequence id
    **/
    addGermlineToSegmenter: function(id, locus) {
        if (typeof this.germline[locus][id]==="undefined"){
            console.log("addGermlineToSegmenter: no germline, " + locus + ", " + id)
        }else{
            this.addSequenceTosegmenter(id , locus, this.germline[locus][id])
        }
    },

    /**
     * build a request with currently selected clones to send to IMGT or igblast <br>
     * (see crossDomain.js)
     * @param {string} address - 'imgt', 'arrest', 'igBlast' or 'blast'
     * */
    sendTo: function (address) {

        var list = this.sequenceListInSegmenter()
        var request = ""
        var system;
        var max=0;

        for (var i = 0; i < list.length; i++) {
            if (this.isClone(list[i])) {
                var c = this.m.clone(list[i])
                
                if (typeof (c.getSequence()) !== 0){
                    request += ">" + c.index + "#" + c.getName() + "\n" + c.getSequence() + "\n";
                } else {
                    request += ">" + c.index + "#" + c.getName() + "\n" + c.id + "\n";
                }
                if (c.getSize()>max){
                    system = c.getLocus()
                    max=c.getSize()
                }
            }
            else if (typeof this.germline[list[i]]) {
                request += ">" +list[i] + "\n" +this.germline[this.sequence[list[i]].locus][list[i]] + "\n";
            }
        }
        if (address == 'IMGTSeg') {
            imgtPostForSegmenter(this.m.species, request, system, this);
            var change_options = {'xv_ntseq' : 'false', // Deactivate default output
                                  'xv_summary' : 'true'}; // Activate Summary output
            imgtPostForSegmenter(this.m.species, request, system, this, change_options);
        } else {
            window[address+"Post"](this.m.species, request, system)
        }

        this.update();

    },

    /**
     * TODO: move the horizontal slider to focus the most interesting parts of the sequences
     * */
    show: function () {
        if (Object.keys(this.sequence).length > 0) {
            var mid = 999999
            $(this.div_segmenter)
                .animate({
                    scrollLeft: 0
                }, 0);
            $(this.div_segmenter)
                .animate({
                    scrollLeft: mid
                }, 0);
        }
    },

    /**
     * enable/disable alignment
     * */
    toggleAlign: function () {
        if (this.aligned)
            this.resetAlign() ;
        else
            this.align() ;
    },

    /**
     * align currently selected clone's sequences using a server side cgi script
     * */
    align: function () {
        var self = this
        var list = this.sequenceListInSegmenter()
        var request = "";
        this.memTab = list;

        if (list.length === 0) return;

        for (var i = 0; i < list.length; i++) {
            if (this.isClone(list[i]) && !(this.m.clone(list[i]).sequence).match("undefined") && this.m.clone(list[i]).sequence !== 0) { /// why '.match' ? why 0 ?
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).sequence + "\n";

               }
                else if(typeof this.germline[this.sequence[list[i]].locus]!="undefined"){
                    request += ">" + list[i] + "\n" + this.germline[this.sequence[list[i]].locus][list[i]] + "\n";

               }
            else{
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).id + "\n";
            }
        }


        $.ajax({
            type: "POST",
            data: request,
            url: this.cgi_address + "align.cgi",
            beforeSend: function () {
                $(".seq-mobil").css({ opacity: 0.5 })
            },
            complete: function () {
                $(".seq-mobil").css({ opacity: 1 })
            },
            success: function (result) {
                self.aligned = true ;
                self.displayAjaxResult(result);
            },
            error: function () {
                console.log({"type": "flash", "msg": "cgi error : impossible to connect", "priority": 2});
            }
        });

        // Allow to use button of the export menu
        try {

            div = document.getElementById("export_fasta_align")
            div.classList.remove("disabledClass")
        } catch (err) {
            // Div doesn't exist (qunit only ?)
        }
    },

    /**
     * transform currently selected sequences in fasta format
     * @return {string} fasta 
     * */
    toFasta: function () {
        var selected = this.m.orderedSelectedClones;
        var result = '';

        for (var i = 0; i < selected.length; i++) {
            if (typeof this.sequence[selected[i]] !== "undefined" &&
                typeof this.sequence[selected[i]].seq !== "undefined") {
                var seq = this.sequence[selected[i]];
                if (seq.is_clone) {
                    result += "> " + this.m.clone(selected[i]).getName() + " // " + this.m.clone(selected[i]).getStrSize() + "\n";
                } else {
                    result += "> " + selected[i];
                }
                result += this.sequence[selected[i]].seq.join('') + "\n";
            }
        }
        return result;
    },


    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportAlignFasta: function () {

        var list = this.m.getSelected()
        if (list.length>0){
        
            var fasta = this.toFasta()
            openAndFillNewTab( "<pre>" + fasta )
        }else{
            console.log({msg: "Export FASTA: please select clones to be exported", type: 'flash', priority: 2});
        }
        
    },


    /**
     * remove alignement
     * */
    resetAlign: function() {
        var selected = this.sequenceListInSegmenter();

        this.aligned = false

        try {
            div = document.getElementById("export_fasta_align")
            div.classList.add("disabledClass")
        } catch (err) {
            // Div doesn't exist (qunit only ?)
        }

        try{
            if( selected.length && this.index.length){
                for (var i = 0; i < selected.length; i++) {
                    this.index[selected[i]].content("seq-mobil", 
                                                    this.sequence[selected[i]].load().toString(this))
                }
            }
        } catch (err) {
        }
    },
    
    
    /**
     * callback function for align()
     * @param {file} file - align file done by the cgi script
     * */
    displayAjaxResult: function(file) {

        var json = JSON.parse(file)

	    // Load all (aligned) sequences
        for (var i = 0; i < json.seq.length; i++) {
            this.sequence[this.memTab[i]].load(json.seq[i])
    	}

	    // Render all (aligned) sequences
        for (var j = 0; j < json.seq.length; j++) {

            // global container
            var seq = this.sequence[this.memTab[j]]
            this.index[this.memTab[j]].content("seq-mobil", seq.toString(this));
        }

    },
    
    /**
     * build and display statistics about selected clones
     * */
    updateStats: function (){
        var list = this.m.getSelected()
        var sumPercentage = 0;
        var sumReads = 0;
        var sumRawReads = 0;
        var length = 0;
        var nb_clones_not_constant = 0;
        var lastActiveClone = 0;
            
        //verifier que les points sélectionnés sont dans une germline courante
        for (var i = 0; i < list.length ; i++){
            if (this.m.clones[list[i]].isActive()) {
                lastActiveClone = this.m.clones[list[i]]
                if (lastActiveClone.hasSizeConstant()) {
                  length += 1;
                } else {
                  var timepoint = this.m.t
                  nb_clones_not_constant += lastActiveClone.current_clones[timepoint];
                }
                sumPercentage += lastActiveClone.getSize();
                sumReads+= lastActiveClone.getReads();
                sumRawReads+= lastActiveClone.getRawReads();
            }
        }

        var t = ""
        if (sumRawReads > 0) {

            if (length) t += length ;
            if (nb_clones_not_constant) t += '+' + nb_clones_not_constant;
            t += " clone" + (length+nb_clones_not_constant>1 ? "s" : "") + ", "

            t += this.m.toStringThousands(sumRawReads) + " read" + (sumRawReads>1 ? "s" : "")

            if (sumRawReads != sumReads)
               t += " [" + this.m.toStringThousands(Math.floor(sumReads*100)/100) + " norm.]"

            percentageStr = this.m.getStrAnySize(this.m.t, sumPercentage)
            if (percentageStr != "+")
                t += " (" + percentageStr + ")"
            if (length == 1){
                extra_info_system = lastActiveClone.getStrAllSystemSize(this.m.t, true)
            } else {
                extra_info_system = ""
            }
            t += " "
            $(".focus_selected").css("display", "")
        }
        else {
            $(".focus_selected").css("display", "none")
        }
            
        $(".stats_content").text(t)
        if (length == 1) {
            s = ''
            if (extra_info_system.systemGroup !== undefined) {
                s = extra_info_system.systemGroup
                if (extra_info_system.system !== undefined)
                    s += ', '
            }
            if (extra_info_system.system !== undefined) {
                s += extra_info_system.system
            }
            $(".stats_content").prop('title', s)
        }

        if (this.m.getSelected().length > 0){  
            $("#tag_icon__multiple").css("display", "")
        } else {
            $("#tag_icon__multiple").css("display", "none")
        }
    },

    /**
     * find and return the list of clone fields who contain potential information that can be highlighted on sequences
     * @return {string[]} - field list
     *
     * Please note that these pushed values will have to be present in the model ( and properly set with start, stop, seq)
     * to be processed and displayed in the segmenter. ( )
     *
     * */
    findPotentialField : function () {
        // Guess fields for the highlight menu
        result = [""];
        forbidden_fields = ['m', 'sequence']

        for (var j=0; (j<10 & j<this.m.clones.length) ; j++){
            var clone = this.m.clone(j);

            for (var i in clone) {
                if (forbidden_fields.indexOf(i) == -1 &&(this.isDNA(clone[i]) || this.isPos(clone[i]) )){
                    if (result.indexOf(i) == -1) result.push(i);
                }
            }
            
            // In the .seg element, What looks like DNA sequence or what is a Pos field
            for (var k in clone.seg) {
                if (forbidden_fields.indexOf(k) == -1 &&(this.isDNA(clone.seg[k]) || this.isPos(clone.seg[k])) ){
                    if (result.indexOf(k) == -1) result.push(k);
                }
            }
        }

        //Add external infos like IMGT's ... to selectbox values in a static way
        // as imgt info might not have been requested at the moment of menu buidling.
        result.push("V-REGION");
        result.push("J-REGION");
        result.push("D-REGION");
        result.push("CDR3-IMGT");


        return result;
    },

    /**
     * update segmenter with dev menu info if displayed upon update after select or info imported into model
     *
     */
    updateSegmenterWithHighLighSelection: function () {

        var iterator = document.evaluate(".//div[@class='menu-highlight devel-mode']/select", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

        if (typeof iterator != 'undefined') {
            try {
                var thisNode = iterator.iterateNext();

                while (thisNode) {
                    var id = thisNode.id.replace("highlight_", "");
                    if (typeof thisNode.id != 'undefined' && typeof thisNode.selectedIndex != 'undefined' && typeof thisNode.selectedIndex !='undefined') {
                        self.highlight[id].field = thisNode.options[thisNode.selectedIndex].text;
                        self.update();
                    }
                    thisNode = iterator.iterateNext();
                }
            }
            catch (e) {
                //if no proper node then nothing to do
            }
        }
    },

    /**
     * determine if a string is a DNA sequence or not
     * @param {string}
     * @return {bool}
     * */
    isDNA : function (string) {
        if (typeof string === 'undefined' || string === null) {
            return false;
        }else if (string.constructor === String) {
            var reg = new RegExp("^[ACGTacgt]+$")
            return reg.test(string);
        }else if (string.constructor === Array & string.length>0) {
            return this.isDNA(string[0]);
        }else{
            return false;
        }
    },
    
    /**
     * check if the object can be used to find a position on a sequence
     * @param {object}
     * @return {bool}
     * */
    isPos : function (obj) {
        if (typeof obj === 'undefined' || obj === null) {
            return false;
        }else if (typeof obj.start != 'undefined' && typeof obj.stop != 'undefined') {
            return true;
        }else{
            return false;
        }
    },

    /**
     * determine if a string is an amino acid sequence or not
     * @param {string}
     * @return {bool}
     * */
    isAA : function (string) {
        if (typeof string === 'undefined' || string === null) {
            return false;
        }else if (string.constructor === String) {
            var reg = new RegExp("^[ACDEFGHIKLMNOPQRSTUVWY]+$")
            return reg.test(string)
        }else if (string.constructor === Array & string.length>0) {
            return this.isAA(string[0])
        }else{
            return false;
        }
    },

    /**
     * Switch the fixed status of the segmenter.
     * @post old this.fixed == ! this.fixed
     */
    switchFixed: function() {
        this.setFixed(! this.fixed);
    },

    /**
     * Set the fixed status of the segmenter.
     * Should be used rather than directly modifying the fixe property
     */
    setFixed: function(fixed) {
        this.fixed = fixed
        this.updateFixedPicture()
    },

    updateFixedPicture: function() {
        fix_icons = $('#fixsegmenter i')
        if (fix_icons.length > 0) {
            fix_icons = fix_icons[0]
            if (this.fixed) {
                fix_icons.className = 'icon-pin';
            } else {
                fix_icons.className = 'icon-pin-outline';
            }
        }
    },

    shouldRefresh: function() {
        this.init()
    },

    empty: function() {
        this.reset();
    }

}; //fin prototype Segment
Segment.prototype = $.extend(Object.create(View.
    prototype), Segment.prototype);

function genSeq(id, locus, model, segmenter) {
    this.id = id; //clone ID     
    this.m = model; //Model utilisé     
    this.segmenter = segmenter;     
    this.seq = [];     
    this.pos = [];     
    this.locus = locus
    this.use_marge = true; 
    this.is_clone = false;
    }

genSeq.prototype= {



    /**
     * load the sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str) {
        if (typeof str !== 'undefined') this.use_marge = false
        str = typeof str !== 'undefined' ? str : this.m.germline[this.locus][this.id];

        str = str.replace(/\./g, "");
        this.seq = str.split("");
        this.seqAA = str.split("");
        this.computePos();
        return this;
    },


    /**
     * TODO !
     * @param {char} self
     * @param {char} other
     * @return {string}  
     * */
    spanify_mutation: function (self, other, mutation, i_am_first_clone) {
        if (mutation != undefined && !i_am_first_clone) {
            mutation = mutation.replace(END_CODON, END_CODON_NOT_FIRST)
        }
        if (mutation != undefined && mutation) {
            var span = document.createElement('span');
            span.className = mutation
            span.setAttribute('other', other + '-' + this.segmenter.sequence_order[0]);
            span.appendChild(document.createTextNode(self));
            return span;
        }else {

            return document.createTextNode(self);
        }
    },


    /**
     * save the position of each nucleotide in an array <br>
     * return {array}
     * */
    computePos: function () {
        this.pos = [];
        var j = 0
        for (var i = 0; i < this.seq.length; i++) {
            if (this.seq[i] != "-") {
                this.pos.push(i)
            }
        }
        this.pos.push(this.seq.length)
        return this;
    },

    toString:function(){
        var highlights=[];

       return this.highlightToString(highlights);

    },

    /**
    *return sequence completed with html tag <br>
    * @return {string}
    **/
    highlightToString: function(highlights, window_start) {
        result = document.createElement('span');
        currentSpan = document.createElement('span');
        currentSpan.id = "sequence-clone-"+ this.id

        var canDisplaySynMutations = (! this.segmenter.amino &&
                                      this.m.clones.hasOwnProperty(this.segmenter.sequence_order[0]) &&
                                      this.m.clones[this.segmenter.sequence_order[0]].isProductive());
        var reference_phase = (canDisplaySynMutations) ? (this.m.clones[this.segmenter.sequence_order[0]].getPhase()) : undefined;

        var mutations = {};
        var ref = '';
        var seq = '';

        if (this.segmenter.amino) {
            seq = this.seqAA;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seqAA;
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }
        if (this.segmenter.aligned) {
            mutations = get_mutations(ref, seq, reference_phase, true);
        }

        var i_am_first_clone = (this.id == this.segmenter.sequence_order[0])
        
        for (var i = 0; i < this.seq.length; i++) {
            for (var m in highlights){
                var h = highlights[m];

                if (i == h.start){
                    result.appendChild(currentSpan);
                    var highlightSpan = document.createElement('span');
                    highlightSpan.style.color = h.color;
                    highlightSpan.className = h.css ? h.css : h.type;
                    if(typeof h.tooltipe != 'undefined') {
                        highlightSpan.dataset.tooltip = h.tooltip;
                        highlightSpan.dataset.tooltip_position = "right";
                    }

                    if (typeof h.seq !== "undefined") {
                        // highlight is designed to underline the sequence
                        // or add information underneath the sequence
                        highlightSpan.innerHTML = h.seq;

                        var highlightWrapper = document.createElement("span");
                        highlightWrapper.appendChild(highlightSpan);
                        highlightWrapper.className = "highlight";
                        result.appendChild(highlightWrapper);

                        // create a new currentSpan
                        var oldCurSpan = currentSpan;
                        currentSpan = document.createElement('span');
                        currentSpan.className = oldCurSpan.className;
                        result.appendChild(currentSpan);
                        //console.log("results: " + result.innerHTML);
                    } else {
                        currentSpan = highlightSpan;
                    }
                }
            }

            currentSpan.appendChild(this.spanify_mutation(seq[i], ref[i], mutations.hasOwnProperty(i) ? mutations[i] : undefined, i_am_first_clone))
        }
        result.appendChild(currentSpan);
        var marge = ""
        if (this.use_marge){
            marge += "<span class='seq-marge'>";
            var size_marge = 300 - window_start;
            if (size_marge > 0) {
                for (var n = 0; n < size_marge; n++) marge += "\u00A0";
            }
            marge += "</span>"
        }
        return marge + result.innerHTML;
    },
};

/**
 * Sequence object contain a dna sequence and various functions to manipulate them
 * @param {integer} id - clone index
 * @param {Model} model 
 * @constructor
 * */
function Sequence(id, model, segmenter) {
    this.id = id; //clone ID
    this.m = model; //Model utilisé
    this.segmenter = segmenter;
    this.seq = [];
    this.pos = [];
    this.use_marge = true;
    this.is_clone = true;
    this.locus = this.m.clone(id).germline;
}

Sequence.prototype = Object.create(genSeq.prototype); 
    /**
     * load the clone sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    Sequence.prototype.load = function (str) {
        if (typeof str !== 'undefined') this.use_marge = false
        str = typeof str !== 'undefined' ? str : this.m.clone(this.id).sequence;

        if (typeof this.m.clone(this.id).sequence == 'undefined' || this.m.clone(this.id).sequence === 0) {
            str = this.m.clone(this.id).id
        }
        
        this.seq = str.split("")
        this.seqAA = str.split("")
        this.computePos()
        this.computeAAseq()

        return this;
    }

    /**
     * use the cdr3 (if available) to compute the amino acid sequence <br>
     * */
    Sequence.prototype.computeAAseq = function () {
        var start = -1;
        var stop = -1;
                
        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return 

        if (clone.hasSeg('cdr3')){
            if (typeof clone.seg.cdr3.start != "undefined") {
                start = this.pos[clone.seg.cdr3.start];
                stop = this.pos[clone.seg.cdr3.stop];
            }else if (clone.seg.cdr3.constructor === String){
                start = this.pos[clone.sequence.indexOf(clone.seg.cdr3)];
                stop = this.pos[clone.sequence.indexOf(clone.seg.cdr3) + clone.seg.cdr3.length -1];
            }
        }
        if (start == undefined || stop == undefined){
            console.error( "Sequence error. Start/stop position of cdr3 are undefined")
            return
        }

        for (var h=0; h<this.seq.length; h++) this.seqAA[h] = " ";
        
        var i = 0

        while (i<this.seq.length){

            if (i < start || i > stop)
            {
                i++
                continue
            }
                
            var code = "";
            var pos;
            
            while (code.length<3 && i<=stop){
                if (this.seq[i] != "-") {
                    code += this.seq[i];
                    this.seqAA[i] = " ";
                }
                if(code.length == 2) pos = i;
                i++;
            }

            if (code.length == 3){
                this.seqAA[pos] = tableAAdefault(code);
            }
        }
    }


    /**
     * return sequence completed with html tag <br>
     * @return {string}
     * */
    Sequence.prototype.toString = function () {
        var clone = this.m.clone(this.id)

        var window_start, result;
        var highlights = [];

        if (typeof clone.sequence != 'undefined' && clone.sequence !== 0) {

            //find V, D, J position
            if (clone.hasSeg('5', '3')){

                var vdjArray = this.getVdjStartEnd(clone);

                // We first put the end positions
                highlights.push({'type':'N', 'color': "", 'start': vdjArray["5"].stop});
                highlights.push({'type':'N', 'color': "", 'start': vdjArray["3"].start});
                highlights.push({'type':'before5', 'color': "black", 'start': 0});                  // from seq start to 5 start
                highlights.push({'type':'after3',  'color': "black", 'start': vdjArray["3"].stop}); // from 3 stop to seq end
                // TOOD: remove the two previous lines, see #2135

                var key;
                for (var i in SEGMENT_KEYS) {
                    key = SEGMENT_KEYS[i]
                    if (typeof vdjArray[key] != 'undefined' && typeof vdjArray[key].stop != 'undefined'){
                        highlights.push({'type':'N', 'color': "", 'start': vdjArray[key].stop});
                    }
                }

                // We now put the start positions (that may override previous end positions)
                for (var j in SEGMENT_KEYS) {
                    key = SEGMENT_KEYS[j]
                    if (typeof vdjArray[key] != 'undefined' && typeof vdjArray[key].start!= 'undefined'){
                        highlights.push({'type':'D', 'color': "", 'start': vdjArray[key].start});
                    }
                }

                highlights.push({'type':'V', 'color': this.m.colorMethod == "V" ? clone.colorV : "", 'start': vdjArray["5"].start});
                highlights.push({'type':'J', 'color': this.m.colorMethod == "J" ? clone.colorJ : "", 'start': vdjArray["3"].start});
            }

            window_start = this.pos[clone.sequence.indexOf(clone.id)];
            if (clone.hasSeg('cdr3')){
                if (typeof clone.seg.cdr3.start != "undefined"){
                    window_start = this.pos[clone.seg.cdr3.start];
                }else if (clone.seg.cdr3.constructor === String){
                    window_start = this.pos[clone.sequence.indexOf(clone.seg.cdr3)];
                }
            }
            
            for (var k in this.segmenter.highlight){
                highlights.push(this.get_positionned_highlight(this.segmenter.highlight[k].field,
                                                               this.segmenter.highlight[k].color));
            }
        }
        return this.highlightToString(highlights, window_start)
    }

    /**
     * get V D J start end position in a reusable way...
     *
     * @param cloneinfo
     * @return {object}
     */
    Sequence.prototype.getVdjStartEnd = function (clone) {

        var vdjArray ={"5": {}, "3": {}} ;
        vdjArray["5"].start = (clone.seg["5"].start != undefined) ? this.pos[clone.seg["5"].start] : 0;
        vdjArray["5"].stop  = this.pos[clone.seg["5"].stop] + 1;
        vdjArray["3"].start = this.pos[clone.seg["3"].start];
        vdjArray["3"].stop  = (clone.seg["3"].stop != undefined)  ? this.pos[clone.seg["3"].stop] : this.seq.length;

        for (var i in SEGMENT_KEYS)
        {
            var key = SEGMENT_KEYS[i]
            vdjArray[key] = {}
            if (typeof clone.seg[key] != 'undefined' && typeof clone.seg[key].start != 'undefined' && typeof clone.seg[key].stop != 'undefined') {
                vdjArray[key] = {}
                vdjArray[key].start = this.pos[clone.seg[key].start];
                vdjArray[key].stop = this.pos[clone.seg[key].stop] + 1
            }
        }
        return vdjArray;
    }

    /**
     * build a highlight descriptor (start/stop/color/...)
     * @param {string} field - clone field name who contain the information to highlight
     * @param {string} color
     * @return {object}
     * */
    Sequence.prototype.get_positionned_highlight = function (field, color) {
        var clone = this.m.clone(this.id);
        var h = {'color' : color, 'seq': ''};
        var p = clone.getSegFeature(field)

        if (typeof p.start == 'undefined')
            return {'start' : -1, 'stop' : -1, 'seq': '', 'color' : color}

        if (typeof p.seq == 'undefined')
            p.seq = ''

        // Build the highlight object from p        
        // Both 'start' and 'stop' positions are included in the highlight
        {
            h.start = this.pos[p.start];
            h.stop = this.pos[p.stop];
            h.tooltip = typeof p.tooltip != 'undefined'? p.tooltip:"";
        }

        // Build the (possibly invisible) sequence
        if (p.seq === '') {
            h.css = "highlight_border"
            for (var l=0; l<(h.stop - h.start + 1); l++) h.seq += "\u00A0"
        } else {
            h.css = "highlight_seq"
            var j = 0
            for (var k=h.start; j<p.seq.length; k++) { // End condition on j, not on k
                var c = "\u00A0";
                if (this.seq[k] != '-') {
                    var cc = p.seq[j++]
                    if ((cc != '_') && (cc != ' ')) c = cc ;
                    if (field == "quality") {
                        var percent = (cc.charCodeAt(0)-this.m.min_quality)/(this.m.max_quality-this.m.min_quality)
                        var color_hue = (percent * 100);
                        var col = colorGenerator(color_hue);
                        c = "<span style='height:"+(50+(percent*50))+"%;"
                        c += "top:"+(100-(50+(percent*50)))+"%;"
                        c += "position:relative;"
                        c += "background-color:"+col+";"
                        c += "'>\u00A0</span>"
                    }
                }
                h.seq += c
            }

        }

        return h
    }

tableAA = {
 'TTT' : 'F',
 'TTC' : 'F',
 'TTA' : 'L',
 'TTG' : 'L',
 'TCT' : 'S',
 'TCC' : 'S',
 'TCA' : 'S',
 'TCG' : 'S',
 'TAT' : 'Y',
 'TAC' : 'Y',
 'TAA' : '*',
 'TAG' : '*',
 'TGT' : 'C',
 'TGC' : 'C',
 'TGA' : '*',
 'TGG' : 'W',
 'CTT' : 'L',
 'CTC' : 'L',
 'CTA' : 'L',
 'CTG' : 'L',
 'CCT' : 'P',
 'CCC' : 'P',
 'CCA' : 'P',
 'CCG' : 'P',
 'CAT' : 'H',
 'CAC' : 'H',
 'CAA' : 'Q',
 'CAG' : 'Q',
 'CGT' : 'A',
 'CGC' : 'A',
 'CGA' : 'A',
 'CGG' : 'A',
 'ATT' : 'I',
 'ATC' : 'I',
 'ATA' : 'I',
 'ATG' : 'M',
 'ACT' : 'T',
 'ACC' : 'T',
 'ACA' : 'T',
 'ACG' : 'T',
 'AAT' : 'N',
 'AAC' : 'N',
 'AAA' : 'K',
 'AAG' : 'K',
 'AGT' : 'S',
 'AGC' : 'S',
 'AGA' : 'R',
 'AGG' : 'R',
 'GTT' : 'V',
 'GTC' : 'V',
 'GTA' : 'V',
 'GTG' : 'V',
 'GCT' : 'A',
 'GCC' : 'A',
 'GCA' : 'A',
 'GCG' : 'A',
 'GAT' : 'D',
 'GAC' : 'D',
 'GAA' : 'E',
 'GAG' : 'E',
 'GGT' : 'G',
 'GGC' : 'G',
 'GGA' : 'G',
 'GGG' : 'G',
 // If 'N' in sequence, but with no effect
 'CTN' : 'L',
 'TCN' : 'S',
 'GGN' : 'G',
 'GCN' : 'A',
 'GTN' : 'V',
 'ACN' : 'T',
 'CCN' : 'P'
};

// Return a default value '?' if key are not in AA table
function defaultDict(map, defaultValue) {
    return function(key) {
        if (key in map)
            return map[key];
        if (typeof defaultValue == "function")
            return defaultValue(key);
        return defaultValue;
    };
}

tableAAdefault = defaultDict(tableAA, '?');
