
CGI_ADDRESS = "";

SEGMENT_KEYS = ["4", "4a", "4b"];

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
        
    if (typeof config != 'undefined') {
        if (config.cgi_address){
            if (config.cgi_address) CGI_ADDRESS = config.cgi_address;
            if (config.cgi_address == "default") CGI_ADDRESS = "http://"+window.location.hostname+"/cgi/";
        }
    }
    
    this.id = id; //ID de la div contenant le segmenteur
    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z";
    this.cgi_address = CGI_ADDRESS;
    this.m = model;
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
            var parent = document.getElementById(this.id);
            parent.removeAllChildren();

            var template = document.getElementById("aligner");
            var clone = template.content.firstElementChild.cloneNode(true);

            parent.appendChild(clone);

            
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
                                if (autoH > 500) autoH = 500;
                                seg.stop().height(curH).animate({height: autoH+5}, 250);
                            }else{
                                seg.stop().height(curH);

                            }
                            self.is_open = true;
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
                                    seg = $(self.div_segmenter);
                                    seg.stop().animate({height: 100}, 250);
                                }else{
                                    seg.stop();
                                }
                            self.is_open = false;
                            }
                         }, 200);
                    }
                });
            this.setFixed(this.fixed);
            
            for (var c_id = 0; c_id < self.m.clones.length; c_id++)
                self.build_skeleton(c_id);

            if (self.highlightCDR3)
                this.highlightCDR3(self.highlightCDR3.checked, false);
                
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
            self.m.focusOut();
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
            aaCheckbox.id = "segmenter_aa";
            aaCheckbox.type = "checkbox";
            aaCheckbox.onclick = function () {
                self.amino = this.checked;
                self.update();
            };
            div_highlight.appendChild(aaCheckbox);
            div_highlight.appendChild(document.createTextNode("AA"));
        }
        return div_highlight;
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
                liDom.replace("seq-fixed", this.spanF_clone(cloneID));
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
        this.updateAlignmentButton();
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
        return ((typeof this.m.clone(id) != "undefined") && this.m.clone(id).isSelected());
    },
    
    isGermline: function (id) {
        return (typeof this.germline[this.sequence[id].locus] != "undefined");
    },

    /**
     * enable/disable align button if their is currently enough sequences selected
     * */
    updateAlignmentButton: function() {
        var self = this;
        var align = document.getElementById("align");
        list = this.sequenceListInSegmenter();
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
     * @param {integer} cloneID - clone index 
     * */
    spanF_clone: function (cloneID) {

        var self = this;
        var clone = this.m.clone(cloneID);
        
        //copy template
        var template = document.getElementById("aligner-F");
        var cloneT = template.content.firstElementChild.cloneNode(true);

        //???
        clone.div_elem(cloneT, false);

        //edit
        if (this.m.focus == cloneID) cloneT.addClass("list_focus");
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
            this.build_skeleton(cloneID);
        }

    },

    build_skeleton: function(cloneID){
        if ( !this.m.clone(cloneID).hasSequence() ){
            // This clone should not be added to the segmenter
            return;
        }
        var parent = document.getElementById("listSeq");
        var template = document.getElementById("aligner-sequence");
        var clone = template.content.firstElementChild.cloneNode(true);
        clone.id = "seq" + cloneID;
        parent.appendChild(clone);

        this.index[cloneID] = new IndexedDom(clone);
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
        if (this.m.focus == geneID) clone.addClass("list_focus");
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
        if (typeof this.germline[locus][id]==="undefined"){
            console.log("addGermlineToSegmenter: no germline, " + locus + ", " + id);
        }else{
            this.addSequenceTosegmenter(id , locus, this.germline[locus][id]);
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
            window[address+"Post"](this.m.species, request, system);
        }

        this.update();

    },

    /**
     * TODO: move the horizontal slider to focus the most interesting parts of the sequences
     * */
    show: function () {
        if (Object.keys(this.sequence).length > 0) {
            var mid = 999999;
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
                $(".seq-mobil").css({ opacity: 0.5 });
            },
            complete: function () {
                $(".seq-mobil").css({ opacity: 1 });
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
                    this.index[selected[i]].content("seq-mobil", 
                                                    this.sequence[selected[i]].load().toString(this));
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

        var json = JSON.parse(file);

	    // Load all (aligned) sequences
        for (var i = 0; i < json.seq.length; i++) {
            this.sequence[this.memTab[i]].load(json.seq[i]);
    	}

	    // Render all (aligned) sequences
        for (var j = 0; j < json.seq.length; j++) {

            // global container
            var seq = this.sequence[this.memTab[j]];
            this.index[this.memTab[j]].content("seq-mobil", seq.toString(this));
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

    shouldRefresh: function() {
        this.init();
    },

    empty: function() {
        this.reset();
    },

    /** set the checkbox for highlight cdr3
     * @param {bool} - checkbox value
     * @param {bool} - save in localStorage as user preference
    */
    highlightCDR3: function(checked, save){
        //if value is unspecified, retrieve current value of the checkbox to sync segmenter internal parameter with it
        if (typeof checked == 'undefined') 
            if (this.checkboxCDR3) 
                checked = this.checkboxCDR3.checked;

        if (checked) {
            this.highlight[0].field = "cdr3";
            this.highlight[0].color = "red";
            if (this.m.localStorage && save) localStorage.setItem('segmenter_cdr3', "checked");
            if (this.checkboxCDR3) this.checkboxCDR3.checked = true;
        } else {
            this.highlight[0].field = "";
            if (this.m.localStorage && save) localStorage.setItem('segmenter_cdr3', "unchecked");
            if (this.checkboxCDR3) this.checkboxCDR3.checked = false;
        }

        this.update();
    }

}; //fin prototype Segment

Aligner.prototype = $.extend(Object.create(View.prototype), Aligner.prototype);