require(['./js/aligner_menu',
         './js/aligner_layer']);

/** segment 
 * Segment is a view object to see the sequences of the selected clones in the model <br>
 * some function are provided to allow alignement / highlight / imgt request / ...
 * @constructor
 * @param {string} id - dom id of the html div who will contain the segmenter
 * @param {Model} model
 * @augments View
 * @this View
 * */
function Aligner(id, model, database) {
    
    View.call(this, model);
    this.db = database;
    
    this.id = id;
    this.m = model;
    this.memtab = [];
    this.sequence = {};
    this.sequence_order = [];
    this.is_open = false;
    this.aligned = false;   
    this.selectedAxis = [];
    this.index = [];
}

Aligner.prototype = {

    /**
     * init the view before use
     * */
    init: function () {
        this.build();
    },

    /**
     * build needed html elements (button / highlight menu)
     * 
     * */
    build: function () {
        var self = this;
        try {
            self.build_segmenter();
            for (var c_id = 0; c_id < self.m.clones.length; c_id++)
                self.build_sequence(c_id);
            self.build_align_settings_menu();
            self.build_menu();
            self.build_axis_menu();
                
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    build_menu: function(){
        var self = this;

        for (var i in ALIGNER_MENU){
            var menu = ALIGNER_MENU[i];

            var parent = document.getElementById(menu.id);
            var menuC = parent.getElementsByClassName("menu-content")[0];
            
            for (var c in menu.checkbox){
                var mc = menu.checkbox[c];
                var template = document.getElementById("aligner-checkbox");
                var clone = template.content.firstElementChild.cloneNode(true);

                var input = clone.getElementsByClassName("aligner-checkbox-input")[0];
                var label = clone.getElementsByClassName("aligner-checkbox-label")[0];

                var id  = "aligner_checkbox_"+mc.id;
                clone.title = mc.title;
                input.id = id;
                input.checked = mc.enabled;
                label.setAttribute("for", id);
                label.innerHTML = mc.text;

                menuC.appendChild(clone);
                this.connect_checkbox(id, mc.layers);

            }
        }
    }, 

    build_axis_menu: function(){
        var self = this;

        var available_axis = Axis.prototype.available();

        var self_update = function() {
            var menu = document.getElementById("segmenter_axis_select");
            var inputs = menu.getElementsByTagName("input");
            var selectedAxis = [];

            for (var i in inputs)
                if (inputs[i].checked) selectedAxis.push(Axis.prototype.getAxisProperties(inputs[i].value));

            if (selectedAxis.length <= 5){
                self.selectedAxis = selectedAxis;
                self.update();
            }else{
                console.log({ msg: "selection is limited to 5", type: "flash", priority: 2 });
                this.checked = false;
            }
            
        };

        var menu = document.getElementById("segmenter_axis_select");
        for (var i in available_axis) {
            var axis_p = Axis.prototype.getAxisProperties(available_axis[i]);
            if (!axis_p.isInAligner) continue;

            var axis_button = document.createElement('a');
            var axis_option = document.createElement('span');
            var axis_input = document.createElement('input');
            axis_input.setAttribute('type', "checkbox");
            axis_input.setAttribute('value', available_axis[i]);
            axis_input.setAttribute('id', "sai"+i); // segmenter axis input
            axis_input.className = "aligner-checkbox-input";
            if (available_axis[i] == "size" ||
                available_axis[i] == "productivity IMGT" ||
                available_axis[i] == "VIdentity IMGT" ) axis_input.setAttribute('checked', "");
            axis_input.onchange = self_update;

            var axis_label = document.createElement('label');
            axis_label.setAttribute('for', "sai"+i);
            axis_label.className = "aligner-checkbox-label";
            axis_label.appendChild(document.createTextNode(available_axis[i]));

            axis_option.appendChild(axis_input);
            axis_option.appendChild(axis_label);
            axis_button.appendChild(axis_option);
            menu.appendChild(axis_button);
        }
        this.selectedAxis = [Axis.prototype.getAxisProperties("productivity IMGT"),
                            Axis.prototype.getAxisProperties("VIdentity IMGT"),
                            Axis.prototype.getAxisProperties("size")];
    },

    connect_checkbox: function(id, layers){
        var self = this;

        $(function () {
            $('#'+id).change(function (e) {                
                self.toggleLayers(layers, this.checked, true);
                e.stopPropagation();
            }).change(); //ensure visible state matches initially
          });
    },

    build_segmenter: function () {
        var self = this;

        // create a new dom element from aligner template  
        var template = document.getElementById("aligner");
        var clone = template.content.firstElementChild.cloneNode(true);

        // remove content from div assigned to aligner and put template copy in it
        var parent = document.getElementById(this.id);
        parent.removeAllChildren();
        parent.appendChild(clone);


        // restore mouse functions
        this.div_segmenter = clone.getElementsByClassName("segmenter")[0];
        self.min_H = 130;
        self.max_H = 500;
        $(this.div_segmenter)
            .scroll(function () {
                var leftScroll = $(self.div_segmenter).scrollLeft();
                $('.seq-fixed').css({ 'left': +leftScroll });
            })
            .mouseenter(function () {
                if (!self.fixed && !self.is_open) {
                    var seg = $(self.div_segmenter);
                    var cur_H = seg.height();
                    var auto_H = seg.css('height', 'auto').height();

                    if (auto_H > self.min_H+10) {
                        if (auto_H > self.max_H) auto_H = self.max_H;
                        if (cur_H  < self.min_H) cur_H  = self.min_H;
                        seg.stop().height(cur_H).animate({ height: auto_H+20 }, 250);
                        $(".menu-content").css("bottom", (auto_H+40)+"px");
                    } else {
                        seg.stop().height(self.min_H);
                        $(".menu-content").css("bottom", (auto_H+24)+"px");
                    }
                    self.is_open = true;
                }
            });

        $('#' + this.id)
            .mouseleave(function (e) {
                if (e.relatedTarget !== null && self.is_open) {
                    setTimeout(function () {
                        if ($(".tagSelector").hasClass("hovered")) return;

                        var seg = $(self.div_segmenter);

                        if (!self.fixed  && seg.height() > self.min_H) 
                            seg.stop().animate({ height: self.min_H }, 250);
                        else 
                            seg.stop();
                        
                        $(".menu-content").css("bottom", (self.min_H+24)+"px");
                        self.is_open = false;
                        
                    }, 200);
                }
            });

        // Focus/hide/label
        document.getElementById("focus_selected").onclick = function () { self.m.focusSelected(); };
        document.getElementById("hide_selected").onclick = function () { self.m.hideSelected(); };
        document.getElementById("star_selected").onclick = function (e) {
            if (m.getSelected().length > 0) { self.m.openTagSelector(m.getSelected(), e); }};
        document.getElementById("fixsegmenter").onclick = function () { self.switchFixed(); };
        document.getElementById("cluster").onclick = function () { self.m.merge(); };
        document.getElementById("align").onclick = function () { self.toggleAlign(); };
        this.setFixed(false);

    },

    build_sequence: function(cloneID){
        if ( !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return;
        }
        var parent = document.getElementById("listSeq");
        var template = document.getElementById("aligner-sequence");
        var clone = template.content.firstElementChild.cloneNode(true);
        clone.id = "seq" + cloneID;
        parent.appendChild(clone);

        var spanM = this.build_spanM(cloneID)
        clone.getElementsByClassName("sequence-holder")[0].appendChild(spanM);

        this.index[cloneID] = new IndexedDom(clone);

    },

    /**
     * Switch the fixed status of the segmenter.
     * @post old this.fixed == ! this.fixed
     */
    switchFixed: function() {
        this.setFixed(!this.fixed);
    },

    /**
     * Set the fixed status of the segmenter.
     * Should be used rather than directly modifying the fixe property
     */
    setFixed: function(fixed) {
        this.fixed = fixed;
        this.updateFixedPicture();
    },

    updateFixedPicture: function() {
        fix_icons = $('#fixsegmenter i');
        if (fix_icons.length > 0) {
            fix_icons = fix_icons[0];
            if (this.fixed) {
                fix_icons.className = 'icon-pin';
            } else {
                fix_icons.className = 'icon-pin-outline';
            }
        }
    },

   build_align_settings_menu: function(){
    var self = this;
      $(function () {
        $('#highlight_match').change(function () {                
           self.use_dot = this.checked;
           self.update();
        }).change(); //ensure visible state matches initially
      });
    }, 

    /**
     * complete a node with a clone sequence
     * @param {integer} cloneID - clone index 
     * */
    build_spanM: function (cloneID) {
        //copy template
        var template = document.getElementById("aligner-M");
        var clone = template.content.firstElementChild.cloneNode(true);

        return clone;
    },
    
    /**
     * complete a node with a clone information
     * @param {integer} cloneID - clone index 
     * */
    build_spanF: function (cloneID) {

        var self = this;
        var clone = this.m.clone(cloneID);
        
        //copy template
        var template = document.getElementById("aligner-F");
        var cloneT = template.content.firstElementChild.cloneNode(true);

        //???
        clone.div_elem(cloneT, false);

        //edit
        if (this.m.focus == cloneID) $(cloneT).addClass("list_focus");
        cloneT.getElementsByClassName("nameBox")[0].title = clone.getName();
        cloneT.getElementsByClassName("nameBox")[0].style.color = clone.color;
        cloneT.getElementsByClassName("nameBox2")[0].appendChild(document.createTextNode(clone.getShortName()));
        cloneT.getElementsByClassName("delBox")[0].onclick = function () {
            clone.unselect();
            self.aligned = false;
        };
        if (this.m.clone_info == cloneID) 
        cloneT.getElementsByClassName("infoBox")[0].className += " infoBox-open";
        cloneT.getElementsByClassName("axisBox")[0].color = clone.getColor();
        this.fillAxisBox(cloneT.getElementsByClassName("axisBox")[0], clone);

        return cloneT;
    },

    toggleLayers: function(layers, enabled, update){
        if (typeof update == "undefined") update = false;

        for (var l in layers)
            LAYERS[layers[l]].enabled = enabled;

        if (update)
            for (var s in this.sequence)
                this.sequence[s].updateLayers(layers);
    },


    getCGIAddress: function(){
        var cgi_address = "";

        if (typeof config != 'undefined') {
            if (config.cgi_address){
                if (config.cgi_address) cgi_address = config.cgi_address;
                if (config.cgi_address == "default") cgi_address = "http://"+window.location.hostname+"/cgi/";
            }
        }
        return cgi_address;
    },

    /**
     * clear functionnal data in order to start from a clean instance when loading a new .vidjil file
     * */
    reset: function() {
        this.sequence = {};
        this.sequence_order = [];
        this.index = [];
        if (document.getElementById("listSeq"))
            document.getElementById("listSeq").innerHTML = "";
    },

    removeGermline:function(id){
        elem = document.getElementById("seq"+id);
        elem.parentNode.removeChild(elem);
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
        list.sort(function(a,b){ return self.m.clone(b).getSize() - self.m.clone(a).getSize(); });
        var sliderNeedUpdate = (Object.keys(this.sequence).length==0);//slider move only if we add sequence to an empty segmenter

        for (var i = 0; i < list.length; i++) {     

            var cloneID = list[i];

            var liDom = this.index[cloneID];
            
            if (this.m.clone(cloneID).isSelected()) {               // the clone is selected
                this.addToSegmenter(cloneID);
                liDom = this.index[cloneID];
                if (liDom == null) continue;
                liDom.display("main", "block");
                liDom.replace("seq-fixed", this.build_spanF(cloneID));
                var seq = this.sequence[cloneID].toString();
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
        this.updateAlignmentButton();
        this.updateStats();  
        var leftScroll = $(this.div_segmenter).scrollLeft();
        $('.seq-fixed').css({'left':+leftScroll});
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
        return ((typeof this.m.clone(id) != "undefined") && this.m.clone(id).isSelected());
    },
    
    isGermline: function (id) {
        return (typeof this.m.germline[this.sequence[id].locus] != "undefined");
    },

    /**
     * enable/disable align button if their is currently enough sequences selected
     * */
    updateAlignmentButton: function() {
        var align = document.getElementById("align");
        var cluster = document.getElementById("cluster");
        list = this.sequenceListInSegmenter();
        if (align !== null) {
            if (list.length > 1) {
                align.className = "aligner-menu button";
                cluster.className = "aligner-menu button";
            }
            else {
                align.className = "button inactive";
                cluster.className = "button inactive";
            }
        }
    },

    sequenceListInSegmenter: function() {
        return Object.keys(this.sequence);
    },


    fillAxisBox: function (axisBox, clone) {
        axisBox.removeAllChildren();
        var available_axis = Axis.prototype.available();
        
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
            return;
        }

        if (this.sequence[cloneID]){
            // This clone has already been added to the segmenter
            return;
        }

        this.aligned = false ;
        if (this.aligned) this.resetAlign();
        this.sequence[cloneID] = new Sequence(cloneID, this.m, this);
        this.sequence[cloneID].load();
        this.sequence_order.push(cloneID);
        
        if (document.getElementById("seq" + cloneID) != null ){                 //div already exist
            document.getElementById("seq" + cloneID).style.display = "block";
            var divParent = document.getElementById("listSeq");
            divParent.appendChild(document.getElementById("seq" + cloneID));
            return;
        }
        else{                                                                   //create div
            this.build_sequence(cloneID);
        }

    },

    /**
    * select all the germline of a clone .
    * add them to the segmenter
    **/
    add_all_germline_to_segmenter : function() {
       for (var id in this.sequence) {
           if (this.isClone(id)) {
                var c = this.m.clone(id);
                this.addGermlineToSegmenter(c.getGene("3"),c.germline);
                this.addGermlineToSegmenter(c.getGene("4"),c.germline);
                this.addGermlineToSegmenter(c.getGene("5"),c.germline);
            }
        }
        this.show();
    },

    /**
    * return a spanF completed with germline gene info
    * @param {str} geneID - gene id 
    **/
    spanF_germline:function(geneID) {
        var self = this; 

        //copy template
        var template = document.getElementById("aligner-F");
        var clone = template.content.firstElementChild.cloneNode(true);

        //edit
        if (this.m.focus == geneID) $(clone).addClass("list_focus");
        clone.getElementsByClassName("nameBox")[0].title = geneID;
        clone.getElementsByClassName("nameBox2")[0].appendChild(document.createTextNode(geneID));
        clone.getElementsByClassName("delBox")[0].onclick = function () {
            delete self.sequence[geneID];
            self.sequence_order.splice( self.sequence_order.indexOf(geneID), 1 );
            self.aligned = false;
            self.removeGermline(geneID);
        };
        
        return clone;
    },

    /**
    * add a sequence to the segmenter
    * build a div with sequence information and sequence
    * @param {str} id sequence id
    * @param {str} sequence
    **/
    addSequenceTosegmenter : function(id, locus, str){
        this.aligned = false ;
        this.resetAlign();
        if ( typeof this.sequence[id]=="undefined"){
            this.sequence[id] = new genSeq(id, locus, this.m, this);
            this.sequence[id].load("str");
            var divParent = document.getElementById("listSeq");
            this.sequence_order.push(id);

            var li = document.createElement('li');
            li.id = "seq" + id;
            li.className = "sequence-line";
            var spanF = this.spanF_germline(id);
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
        if (typeof this.m.germline[locus][id]==="undefined"){
            console.log("addGermlineToSegmenter: no germline, " + locus + ", " + id);
        }else{
            this.addSequenceTosegmenter(id , locus, this.m.germline[locus][id]);
        }
    },

    /**
     * build a request with currently selected clones to send to IMGT or igblast <br>
     * (see crossDomain.js)
     * @param {string} address - 'imgt', 'arrest', 'igBlast' or 'blast'
     * */
    sendTo: function (address) {

        var list = this.sequenceListInSegmenter();
        var request = "";
        var system;
        var max=0;

        for (var i = 0; i < list.length; i++) {
            if (this.isClone(list[i])) {
                var c = this.m.clone(list[i]);
                
                if (c.seg.imgt) continue;
                if (typeof (c.getSequence()) !== 0){
                    request += ">" + c.index + "#" + c.getName() + "\n" + c.getSequence() + "\n";
                } else {
                    request += ">" + c.index + "#" + c.getName() + "\n" + c.id + "\n";
                }
                if (c.getSize()>max){
                    system = c.getLocus();
                    max=c.getSize();
                }
            }
            else if (typeof this.m.germline[list[i]]) {
                request += ">" +list[i] + "\n" +this.m.germline[this.sequence[list[i]].locus][list[i]] + "\n";
            }
        }
        if (request != ""){
            if (address == 'IMGTSeg') {
                imgtPostForSegmenter(this.m.species, request, system, this);
                var change_options = {'xv_ntseq' : 'false', // Deactivate default output
                                    'xv_summary' : 'true'}; // Activate Summary output
                imgtPostForSegmenter(this.m.species, request, system, this, change_options);
            } else {
                window[address+"Post"](this.m.species, request, system);
            }
        }

        this.update();

    },

    /**
     * TODO: move the horizontal slider to focus the most interesting parts of the sequences
     * */
    show: function () {
        if (Object.keys(this.sequence).length > 0) {
            var sequence = this.sequence[this.sequence_order[0]]
            var mid = (sequence.seq.length/2)*CHAR_WIDTH;

            try {
                if (sequence.id && this.m.clone(sequence.id).seg.cdr3){
                    cdr3 = this.m.clone(sequence.id).seg.cdr3;
                    mid = ((sequence.pos[cdr3.start]+sequence.pos[cdr3.stop])/2) * CHAR_WIDTH - (window.innerWidth/2) + 225;
                }
            } catch (error) {}
            

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
        var self = this;
        var list = this.sequenceListInSegmenter();
        var request = "";
        this.memTab = list;

        if (list.length === 0) return;

        for (var i = 0; i < list.length; i++) {
            if (this.isClone(list[i]) && !(this.m.clone(list[i]).sequence).match("undefined") && this.m.clone(list[i]).sequence !== 0) { /// why '.match' ? why 0 ?
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).sequence + "\n";

               }
                else if(typeof this.m.germline[this.sequence[list[i]].locus]!="undefined"){
                    request += ">" + list[i] + "\n" + this.m.germline[this.sequence[list[i]].locus][list[i]] + "\n";

               }
            else{
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).id + "\n";
            }
        }


        $.ajax({
            type: "POST",
            data: request,
            url: this.getCGIAddress() + "align.cgi",
            beforeSend: function () {
                $(".seq-mobil").css({ opacity: 0.5 });
            },
            complete: function () {
                $(".seq-mobil").css({ opacity: 1 });
            },
            success: function (result) {
                self.aligned = true ;
                self.displayAjaxResult(result);
                self.show();
            },
            error: function () {
                console.log({"type": "flash", "msg": "cgi error : impossible to connect", "priority": 2});
            }
        });

        // Allow to use button of the export menu
        try {

            div = document.getElementById("export_fasta_align");
            div.classList.remove("disabledClass");
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

        var list = this.m.getSelected();
        if (list.length>0){
        
            var fasta = this.toFasta();
            openAndFillNewTab( "<pre>" + fasta );
        }else{
            console.log({msg: "Export FASTA: please select clones to be exported", type: 'flash', priority: 2});
        }
        
    },


    /**
     * remove alignement
     * */
    resetAlign: function() {
        var selected = this.sequenceListInSegmenter();

        this.aligned = false;

        try {
            div = document.getElementById("export_fasta_align");
            div.classList.add("disabledClass");
        } catch (err) {
            // Div doesn't exist (qunit only ?)
        }

        try{
            if( selected.length && this.index.length){
                for (var i = 0; i < selected.length; i++) {
                    this.sequence[selected[i]].load();
                }
            }
            this.update();
        } catch (err) {
        }
    },
    
    
    /**
     * callback function for align()
     * @param {file} file - align file done by the cgi script
     * */
    displayAjaxResult: function(file) {

        var json = JSON.parse(file);

	    // Load all (aligned) sequences
        for (var i = 0; i < json.seq.length; i++) {
            this.sequence[this.memTab[i]].load(json.seq[i], true);
    	}

	    // Render all (aligned) sequences
        for (var j = 0; j < json.seq.length; j++) {

            // global container
            var seq = this.sequence[this.memTab[j]];
            seq.toString();
        }

    },
    
    /**
     * build and display statistics about selected clones
     * */
    updateStats: function (){
        var list = this.m.getSelected();
        var sumPercentage = 0;
        var sumReads = 0;
        var sumRawReads = 0;
        var length = 0;
        var nb_clones_not_constant = 0;
        var lastActiveClone = 0;
            
        //verifier que les points sélectionnés sont dans une germline courante
        for (var i = 0; i < list.length ; i++){
            if (this.m.clones[list[i]].isActive()) {
                lastActiveClone = this.m.clones[list[i]];
                if (lastActiveClone.hasSizeConstant()) {
                  length += 1;
                } else {
                  var timepoint = this.m.t;
                  nb_clones_not_constant += lastActiveClone.current_clones[timepoint];
                }
                sumPercentage += lastActiveClone.getSize();
                sumReads+= lastActiveClone.getReads();
                sumRawReads+= lastActiveClone.getRawReads();
            }
        }

        var t = "";
        if (sumRawReads > 0) {

            if (length) t += length ;
            if (nb_clones_not_constant) t += '+' + nb_clones_not_constant;
            t += " clone" + (length+nb_clones_not_constant>1 ? "s" : "") + ", ";

            t += this.m.toStringThousands(sumRawReads) + " read" + (sumRawReads>1 ? "s" : "");

            if (sumRawReads != sumReads)
               t += " [" + this.m.toStringThousands(Math.floor(sumReads*100)/100) + " norm.]";

            percentageStr = this.m.getStrAnySize(this.m.t, sumPercentage);
            if (percentageStr != "+")
                t += " (" + percentageStr + ")";
            if (length == 1){
                extra_info_system = lastActiveClone.getStrAllSystemSize(this.m.t, true);
            } else {
                extra_info_system = "";
            }
            t += " ";
            $(".focus_selected").css("display", "");
        }
        else {
            $(".focus_selected").css("display", "none");
        }
            
        $(".stats_content").text(t);
        if (length == 1) {
            s = '';
            if (extra_info_system.systemGroup !== undefined) {
                s = extra_info_system.systemGroup;
                if (extra_info_system.system !== undefined)
                    s += ', ';
            }
            if (extra_info_system.system !== undefined) {
                s += extra_info_system.system;
            }
            $(".stats_content").prop('title', s);
        }

        if (this.m.getSelected().length > 0){  
            $("#tag_icon__multiple").css("display", "");
        } else {
            $("#tag_icon__multiple").css("display", "none");
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
        forbidden_fields = ['m', 'sequence'];

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
     * determine if a string is a DNA sequence or not
     * @param {string}
     * @return {bool}
     * */
    isDNA : function (string) {
        if (typeof string === 'undefined' || string === null) {
            return false;
        }else if (string.constructor === String) {
            var reg = new RegExp("^[ACGTacgt]+$");
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
            var reg = new RegExp("^[ACDEFGHIKLMNOPQRSTUVWY]+$");
            return reg.test(string);
        }else if (string.constructor === Array & string.length>0) {
            return this.isAA(string[0]);
        }else{
            return false;
        }
    },

    shouldRefresh: function() {
        this.init();
    },

    empty: function() {
        this.reset();
    },


}; //fin prototype Segment

Aligner.prototype = $.extend(Object.create(View.prototype), Aligner.prototype);