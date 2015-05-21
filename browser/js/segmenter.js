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
 *
 * segmenter.js
 *
 * segmenter tools
 *
 * content:
 *
 *
 */


CGI_ADDRESS = ""

/** segment 
 * Segment is a view object to see the sequences of the selected clones in the model <br>
 * some function are provided to allow alignement / highlight / imgt request / ...
 * @constructor
 * @param {string} id - dom id of the html div who will contain the segmenter
 * @param {Model} model
 * @augments View
 * @this View
 * */
function Segment(id, model) {
    
    View.call(this, model);
        
    if (typeof config != 'undefined') {
        if (config.cgi_address){
            if (config.cgi_address) CGI_ADDRESS = config.cgi_address
            if (config.cgi_address == "default") CGI_ADDRESS = "http://"+window.location.hostname+"/cgi/"
        }
    }
    
    this.id = id; //ID de la div contenant le segmenteur
    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
    this.cgi_address = CGI_ADDRESS

    this.first_clone = 0 ; // id of sequence at the top of the segmenter
    
    this.memtab = [];
    this.sequence = {};
    this.is_open = false;
    this.amino = false;
    this.aligned = false;
    
    //elements to be highlited in sequences
    this.highlight = [
        {'field' : "", 'color': "red"},
        {'field' : "", 'color': "blue"},
        //{'field' : "", 'color': "green"}
    ];
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

        var parent = document.getElementById(this.id)
        parent.innerHTML = "";
        
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
        span.className = "button"
        span.onclick = function () {
            self.m.merge()
        }
        span.appendChild(document.createTextNode("merge"));
        div_menu.appendChild(span)

        //align button
        if (this.cgi_address) {
        span = document.createElement('span');
        span.id = "align"
        this.updateAlignmentButton();
        span.className = "button"
        span.onclick = function () {
            self.toggleAlign()
        }
        span.appendChild(document.createTextNode("align"));
        div_menu.appendChild(span)
        }
        
        //toIMGT button
        span = document.createElement('span');
        span.id = "toIMGT"
        span.className = "button"
        span.onclick = function () {
            self.sendTo('IMGT')
        }
        span.appendChild(document.createTextNode("❯ to IMGT/V-QUEST"));
        div_menu.appendChild(span)

        //toIgBlast button
        span = document.createElement('span');
        span.id = "toIgBlast"
        span.className = "button"
        span.onclick = function () {
            self.sendTo('igBlast')
        }
        span.appendChild(document.createTextNode("❯ to IgBlast"));
        div_menu.appendChild(span)

        //toClipBoard button
        span = document.createElement('span');
        span.id = "toClipBoard"
        span.className = "button"
        span.appendChild(document.createTextNode("❯ to clipBoard"));
        // div_menu.appendChild(span)

        div.appendChild(div_menu)
        
        
        
        //menu-highlight
        var div_highlight = document.createElement('div');
        div_highlight.className = "menu-highlight"
        div_highlight.onmouseover = function () {
            self.m.focusOut()
        };
        
        // Guessing fields, populating dropdown lists
        var fields = this.findPotentialField();
        var filter = ["sequence", "_sequence.trimmed nt seq"]; // Fields that are ignored

        for (var i in this.highlight) {
            var input = document.createElement('select');
            input.style.borderColor = this.highlight[i].color;
            input.style.width = "60px";
            input.id = "highlight_"+i
            
            for (var i in fields){
                if (filter.indexOf(fields[i]) == -1) {
                    var option = document.createElement('option');
                    option.appendChild(document.createTextNode(fields[i]));
                    input.appendChild(option);
                }
            }
            
            input.onchange = function () {
                var id = this.id.replace("highlight_","")
                segment.highlight[id].field = this.options[this.selectedIndex].text;
                segment.update();
            }
            
            div_highlight.appendChild(input)
        }

        // Checkbox for cdr3
        if (fields.indexOf("cdr3") != -1) {
            
            var aaCheckbox = document.createElement('input');
            aaCheckbox.type = "checkbox";
            aaCheckbox.onclick = function () {
                segment.amino = this.checked;
                segment.update();
            }
            div_highlight.appendChild(aaCheckbox)
            div_highlight.appendChild(document.createTextNode("AA"));
                
                
            var cdr3Checkbox = document.createElement('input');
            cdr3Checkbox.type = "checkbox";
            cdr3Checkbox.onclick = function () {
                var id = 0;
                if (this.checked){
                    segment.highlight[id].field = "cdr3";
                }else{
                    segment.highlight[id].field = "";
                }
                segment.update();
            }
            div_highlight.appendChild(cdr3Checkbox)
            div_highlight.appendChild(document.createTextNode("CDR3"));
        
        }

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
        div.appendChild(div_highlight)

        
        
        
        
        

        var div_focus = document.createElement('div');
        div_focus.className = "focus"
        div.appendChild(div_focus)

        var div_stats = document.createElement('div');
        div_stats.className = "stats"

        var stats_content = document.createElement('span');
        stats_content.className = "stats_content"
        div_stats.appendChild(stats_content)        

        var focus_selected = document.createElement('a');
        focus_selected.appendChild(document.createTextNode("(focus)"))
        focus_selected.className = "focus_selected"
        focus_selected.onclick = function () { list_clones.focus() }
        div_stats.appendChild(focus_selected)

        div.appendChild(div_stats)

        parent.appendChild(div)

        this.div_segmenter = document.createElement('div');
        this.div_segmenter.className = "segmenter"
        //listSeq
        ul = document.createElement('ul');
        ul.id = "listSeq"
        this.div_segmenter.appendChild(ul)
        
        parent.appendChild(this.div_segmenter)

       /* $('#toClipBoard')
            .zclip({
                path: 'js/lib/ZeroClipboard.swf',
                copy: function () {
                    return self.toFasta()
                }
            });
        */
       
        $(this.div_segmenter)
            .scroll(function(){
                var leftScroll = $(self.div_segmenter).scrollLeft();  
                $('.seq-fixed').css({'left':+leftScroll});
            })
            .mouseenter(function(){
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
            });
            
        $('#'+this.id)
            .mouseleave(function(e){
                if (e.relatedTarget != null && self.is_open){
                    var seg = $(self.div_segmenter)
                    seg.stop().animate({height: 100}, 250);
                    self.is_open = false
                }
            });
    },

    /**
     * update(size/style/position) a list of selected clones <br>
     * @param {integer[]} list - array of clone index
     * */
    updateElem: function (list) {
        
        for (var i = 0; i < list.length; i++) {
            var id = list[i]
            if (this.m.clone(id).isSelected()) {
                if (document.getElementById("seq" + id)) {
                    var spanF = document.getElementById("f" + id);
                    this.div_elem(spanF, id);
                    
                    var spanM = document.getElementById("m" + id);
                    spanM.innerHTML = this.sequence[id].toString(this)
                } else {
                    this.addToSegmenter(id);
                    this.show();
                }
            } else {
                if (document.getElementById("seq" + id)) {
                    var element = document.getElementById("seq" + id);
                    element.parentNode.removeChild(element);
                }
            }
            this.updateStats();
        }    
    },

    /**
     * update(style only) a list of selected clones
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function (list) {
        
        for (var i = 0; i < list.length; i++) {
            if (this.m.clone(list[i]).isSelected()) {
                if (document.getElementById("seq" + list[i])) {
                    var spanF = document.getElementById("f" + list[i]);
                    this.div_elem(spanF, list[i]);
                } else {
                    this.addToSegmenter(list[i]);
                    this.show();
                }
            } else {
                if (document.getElementById("seq" + list[i])) {
                    var element = document.getElementById("seq" + list[i]);
                    element.parentNode.removeChild(element);
                }
            }
        }
        this.updateAlignmentButton()
        this.updateStats();
       
    },
    
    /**
     * enable/disable align button if their is currently enough sequences selected
     * */
    updateAlignmentButton: function() {
        var self = this;
        var align = document.getElementById("align");
        if (align != null) {
            if (this.m.getSelected().length > 1) {
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


    /**
     * complete a div with a clone information/sequence
     * @param {dom} div_elem - the dom element to complete
     * @param {intger} cloneID - clone index 
     * */
    div_elem: function (div_elem, cloneID) {
        var self = this;

        div_elem.innerHTML = '';
        div_elem.className = "seq-fixed";
        if (this.m.focus == cloneID) {
            $(div_elem).addClass("list_focus");
        } 

        var seq_name = document.createElement('span');
        seq_name.className = "nameBox";

        var del = document.createElement('img')
        del.className = "delBox"
        del.src = "images/delete-gray.png"
        seq_name.appendChild(del);

        del.onclick = function () {
            self.m.clone(cloneID).unselect();
            self.aligned = false;
        }
        seq_name.appendChild(document.createTextNode(this.m.clone(cloneID).getName()));
        seq_name.title = this.m.clone(cloneID).getName();
        seq_name.style.color = this.m.clone(cloneID).color;

        var svg_star = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg_star.setAttribute('class', 'starBox');
        svg_star.onclick = function () {
            self.m.openTagSelector(cloneID);
        }

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', this.starPath);
        path.setAttribute('id', 'color' + cloneID);
        if (typeof this.m.clone(cloneID).tag != 'undefined') path.setAttribute("fill", this.m.tag[this.m.clone(cloneID).tag].color);
        else path.setAttribute("fill", "");

        svg_star.appendChild(path);

        var seq_size = document.createElement('span')
        seq_size.className = "sizeBox";
        seq_size.onclick = function () {
            self.m.clone(cloneID).unselect();
        }
        seq_size.style.color = this.m.clone(cloneID).color;
        seq_size.appendChild(document.createTextNode(this.m.clone(cloneID).getStrSize()));

        var span_info = document.createElement('span')
        span_info.className = "infoBox";
        if (cloneID == this.m.clone_info) span_info.className = "infoBox infoBox-open";
        span_info.onclick = function () {
            self.m.displayInfoBox(cloneID);
        }
        span_info.appendChild(document.createTextNode("i"));
        
        div_elem.appendChild(seq_name);
        div_elem.appendChild(span_info);
        div_elem.appendChild(svg_star);
        div_elem.appendChild(seq_size);
    },

    /**
     * add a clone in the segmenter<br>
     * build a div with clone information and sequence
     * @param {intger} cloneID - clone index 
     * */
    addToSegmenter: function (cloneID) {
        var self = this;

        this.aligned = false ;
        this.sequence[cloneID] = new Sequence(cloneID, this.m)
        
        var divParent = document.getElementById("listSeq");

        // Am I the first clone in this segmenter ?
        var previous_li = document.getElementById("listSeq").getElementsByTagName("li");
        if (previous_li.length == 0) {
            this.first_clone = cloneID
        }

        var li = document.createElement('li');
        li.id = "seq" + cloneID;
        li.className = "sequence-line";
        li.onmouseover = function () {
            self.m.focusIn(cloneID);
        }

        var spanF = document.createElement('span');
        spanF.id = "f" + cloneID;
        this.div_elem(spanF, cloneID);

        var spanM = document.createElement('span');
        spanM.id = "m" + cloneID;
        spanM.className = "seq-mobil";
        spanM.innerHTML = this.sequence[cloneID].load().toString(this)

        li.appendChild(spanF);
        li.appendChild(spanM);
        divParent.appendChild(li);

    },


    /**
     * build a request with currently selected clones to send to IMGT or igblast <br>
     * (see crossDomain.js)
     * @param {string} address - 'IMGT' or 'igBlast'
     * */
    sendTo: function (address) {

        var list = this.m.getSelected()
        var request = ""
        var system;
        var max=0;

        for (var i = 0; i < list.length; i++) {
            var c = this.m.clone(list[i])
            
            if (typeof (c.getSequence()) != 0){
                request += ">" + c.getName() + "\n" + c.getSequence() + "\n";
            }else{
                request += ">" + c.getName() + "\n" + c.id + "\n";
            }
            if (c.getSize()>max){
                system=c.get('germline')
                max=c.getSize()
            }
        }
        if (address == 'IMGT') imgtPost(request, system);
        if (address == 'igBlast') igBlastPost(request, system);

    },
    
    /**
     * move the horizontal slider to focus the most interesting parts of the sequences 
     * */
    show: function () {
        var li = document.getElementById("listSeq")
            .getElementsByTagName("li");
        if (li.length > 0) {
            var id = li[0].id.substr(3);
            var mid = 999999
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
        var list = this.m.getSelected()
        var request = "";
        this.memTab = list;

        if (list.length == 0) return;

        for (var i = 0; i < list.length; i++) {
            if (typeof (this.m.clone(list[i]).sequence) != 'undefined' && this.m.clone(list[i]).sequence != 0)
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).sequence + "\n";
            else
                request += ">" + list[i] + "\n" + this.m.clone(list[i]).id + "\n";
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
        })
    },

    /**
     * transform currently selected sequences in fasta format
     * @return {string} fasta 
     * */
    toFasta: function () {
        var selected = this.m.getSelected();
        var result = "";

        for (var i = 0; i < selected.length; i++) {
            result += "> " + this.m.clone(selected[i]).getName() + " // " + this.m.clone(selected[i]).getStrSize() + "\n";
            result += this.m.clone(selected[i]).sequence + "\n";
        }
        return result
    },

    /**
     * remove alignement
     * */
    resetAlign: function() {
        var selected = this.m.getSelected();

        this.aligned = false

        for (var i = 0; i < selected.length; i++) {
            var spanM = document.getElementById("m" + selected[i])
            spanM.innerHTML =  this.sequence[selected[i]].load().toString(this)
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
        for (var i = 0; i < json.seq.length; i++) {

            // global container
            var spanM = document.getElementById("m" + this.memTab[i]);
            var seq = this.sequence[this.memTab[i]]
            spanM.innerHTML = seq.toString(this)
        }

    },
    
    /**
     * build and display statistics about selected clones
     * */
    updateStats: function (){
        var list = this.m.getSelected()
        var sumPercentage = 0;
        var sumReads = 0;
        var length = 0;
            
        //verifier que les points sélectionnés sont dans une germline courante
        for (var i = 0; i < list.length ; i++){   
            if (this.m.clones[list[i]].isActive()) {
                length += 1;
                sumPercentage += this.m.clone(list[i]).getSize();
                sumReads+= this.m.clone(list[i]).getReads(); 
            }
        }

        var t = ""
        if (sumReads > 0) {
            t += length + " clone" + (length>1 ? "s" : "") + ", "
            t += this.m.toStringThousands(sumReads) + " read" + (sumReads>1 ? "s" : "") + ", "
            t += sumPercentage = this.m.formatSize(sumPercentage, true);
            t += " "
            $(".focus_selected").css("display", "")
        }
        else {
            $(".focus_selected").css("display", "none")
        }
            
        $(".stats_content").text(t)
    },

    /**
     * find and return the list of clone fields who contain potential information who can be highlighted on sequences
     * @return {string[]} - field list
     * */
    findPotentialField : function () {
        // Guess fields for the highlight menu
        result = [""];
        
        // What looks likes DNA everywhere
        for (var i in this.m) {
            if (this.isDNA(this.m[i])){
                if (result.indexOf(i) == -1) result.push(i);
            }
        }
        
        for (var j=0; (j<10 & j<this.m.clones.length) ; j++){
            var clone = this.m.clone(j);

            for (var i in clone) {
                if (this.isDNA(clone[i]) || this.isPos(clone[i]) ){
                    if (result.indexOf(i) == -1) result.push(i);
                }
            }
            
            // In the .seg element, What looks like DNA sequence or what is a Pos field
            if (typeof clone.seg != 'undefined'){
                for (var i in clone.seg) {
                    if (this.isDNA(clone.seg[i]) || this.isPos(clone.seg[i]) ){
                        if (result.indexOf(i) == -1) result.push(i);
                    }
                }
            }
        }
        return result;
    },
    
    /**
     * determine if a string is a DNA sequence or not
     * @param {string}
     * @return {bool}
     * */
    isDNA : function (string) {
        if (string == null) {
            return false;
        }else if (string.constructor === String) {
            var reg = new RegExp("^[ACGT]+$")
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
        if (obj == null) {
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
        if (string == null) {
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

} //fin prototype Segment
Segment.prototype = $.extend(Object.create(View.prototype), Segment.prototype);










/**
 * Sequence object contain a dna sequence and various functions to manipulate them
 * @param {integer} id - clone index
 * @param {Model} model 
 * @constructor
 * */
function Sequence(id, model) {
    this.id = id; //clone ID
    this.m = model; //Model utilisé
    this.seq = [];
    this.pos = [];
    this.use_marge = true;
}

Sequence.prototype = {

    /**
     * load the clone sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str) {
        if (typeof str !== 'undefined') this.use_marge = false
        str = typeof str !== 'undefined' ? str : this.m.clone(this.id).sequence;

        if (typeof this.m.clone(this.id).sequence == 'undefined' || this.m.clone(this.id).sequence == 0) {
            str = this.m.clone(this.id).id
        }
        
        this.seq = str.split("")
        this.seqAA = str.split("")
        this.computePos()
        this.computeAAseq()

        return this;
    },

    /**
     * save the position of each nucleotide in an array <br>
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

    /**
     * use the cdr3 (if available) to compute the amino acid sequence <br>
     * */
    computeAAseq : function () {
        var start = -1;
        var stop = -1;
                
        var clone = this.m.clone(this.id);
        if (typeof clone.seg != "undefined" && typeof clone.seg["cdr3"] != "undefined"){
            if (typeof clone.seg["cdr3"].start != "undefined") {
                start = this.pos[clone.seg["cdr3"].start];
                stop = this.pos[clone.seg["cdr3"].stop];
            }else if (clone.seg["cdr3"].constructor === String){
                start = this.pos[clone.sequence.indexOf(clone.seg["cdr3"])];
                stop = this.pos[clone.sequence.indexOf(clone.seg["cdr3"]) + clone.seg["cdr3"].length -1];
            }
        }
        
        for (var i=0; i<this.seq.length; i++) this.seqAA[i] =this.seq[i]; // "&nbsp";
        
        var i = 0

        while (i<this.seq.length){

            if (i < start || i > stop)
            {
                i++
                continue
            }
                
            var code = "";
            var pos;
            
            while (code.length<3 & i<=stop){
                if (this.seq[i] != "-") {
                    code += this.seq[i];
                    this.seqAA[i] = "&nbsp";
                }
                if(code.length == 2) pos = i;
                i++;
            }
            
            if (code.length == 3){
                this.seqAA[pos] = tableAA[code];
            }
        }
    },

    /**
     * compare sequence with another string and surround change
     * @param {char} self
     * @param {char} other
     * @return {string}  
     * */
    spanify_mutation: function (self, other) {
        if (segment.aligned && self != other) {
            return "<span class='substitution' other='" + other + '-' + segment.first_clone + "'>" + self + "</span>"
        }else {
            return self
        }
    },

    /**
     * return sequence completed with html tag <br>
     * @return {string}
     * */
    toString: function (segment) {
        var clone = this.m.clone(this.id)
        var result = ""
        
        if (typeof clone.sequence != 'undefined' && clone.sequence != 0) {
            //find V, D, J position
            if (typeof clone.seg != 'undefined'){
                var startV = 0
                var endV = this.pos[clone.seg["5end"]]
                var startJ = this.pos[clone.seg["3start"]]
                var endJ = this.seq.length
                if (typeof clone.seg["4start"] != 'undefined' && typeof clone.seg["4end"] != 'undefined') {
                    var startD = this.pos[clone.seg["4start"]]
                    var endD = this.pos[clone.seg["4end"]]
                }
            }

            //V color
            var vColor = "";
            if (this.m.colorMethod == "V") vColor = "style='color : " + clone.colorV + "'";

            //J color
            var jColor = "";
            if (this.m.colorMethod == "J") jColor = "style='color : " + clone.colorJ + "'";
            
            var window_start = this.pos[clone.sequence.indexOf(clone.id)];
            if (typeof clone.seg != "undefined" && typeof clone.seg["cdr3"] != "undefined"){
                if (clone.seg["cdr3"].start != "undefined"){
                    window_start = this.pos[clone.seg["cdr3"].start];
                }else if (clone.seg["cdr3"].constructor === String){
                    window_start = this.pos[clone.sequence.indexOf(clone.seg["cdr3"])];
                }
            }
            
            var highlights = [];
            for (var i in segment.highlight){
                highlights.push(this.get_positionned_highlight(segment.highlight[i].field, segment.highlight[i].color));
            }
            
            // Build the sequence, adding VDJ and highlight spans
            result += "<span>"
            for (var i = 0; i < this.seq.length; i++) {

                // Highlight spans
                for (var j in highlights){
                    var h = highlights[j];

                    if (i == h.start){
                        result += "<span class='highlight'><span class='" + h.css + "' style='color:" + h.color + "'>"
                        result += h.seq
                        result += "</span></span>"
                    }
                }
                
                // VDJ spans - begin
                if (i == startV) result += "</span><span class='V' "+ vColor + " >"
                if (i == startD) result += "</span><span class='D'>"
                if (i == startJ) result += "</span><span class='J' " + jColor + " >"

                // one character
                if (segment.amino) {
                    result += this.spanify_mutation(this.seqAA[i], segment.sequence[segment.first_clone].seqAA[i])
                }else{
                    result += this.spanify_mutation(this.seq[i], segment.sequence[segment.first_clone].seq[i])
                }

                // VDJ spans - end
                if (i == endV) result += "</span><span class ='N'>"
                if (i == endD) result += "</span><span class ='N'>"
                if (i == endJ) result += "</span><span>"
            }
            result += "</span>"
        }else{
            var window_start = 0
            result += clone.id
        }
        
        //marge
        var marge = ""
        if (this.use_marge){
            marge += "<span class='seq-marge'>";
            var size_marge = 300 - window_start;
            if (size_marge > 0) {
                for (var i = 0; i < size_marge; i++) marge += "&nbsp";
            }
            marge += "</span>"
        }
        
        return marge + result
    },
    
    
    /**
     * build a highlight descriptor (start/stop/color/...)
     * @param {string} field - clone field name who contain the information to highlight
     * @param {string} color
     * @return {object}
     * */
    get_positionned_highlight : function (field, color) {
        var clone = this.m.clone(this.id);
        var h = {'start' : -1, 'stop' : -1, 'seq': '', 'color' : color};
        var p;

        // Find the good object p
        if (typeof clone[field] != 'undefined'){
            p = clone[field];                   //check clone meta-data
        }else if (typeof clone.seg != 'undefined' &&typeof clone.seg[field] != 'undefined'){
            p = clone.seg[field];               //check clone seg data
        }else if (typeof this.m[field] != 'undefined'){
            p = this.m[field];               //check model
        }else{
            return h
        }
        
        if (p.constructor === Array ){
            p = p[this.m.t];
        }

        var raw_seq = ""

        // Build the highlight object from p        
        if (p.constructor === String){
            h.start = this.pos[clone.sequence.indexOf(p)]
            h.stop = this.pos[clone.sequence.indexOf(p)+p.length]
        }else if (p.constructor === Object & typeof p.start != 'undefined'){
            h.start = this.pos[p.start]
            h.stop = this.pos[p.stop]

            if (typeof p.seq != 'undefined') {
                raw_seq = p.seq
            }
        }

        // Build the (possibly invisible) sequence
        if (raw_seq == "") {
            h.css = "highlight_border"
            for (var k=0; k<(h.stop - h.start); k++) h.seq += "&nbsp;"
        } else {
            h.css = "highlight_seq"
            var j = 0
            for (var k=h.start; j<raw_seq.length; k++) { // End condition on j, not on k
                var c = "&nbsp";
                if (this.seq[k] != '-') {
                    var cc = raw_seq[j++]
                    if ((cc != '_') && (cc != ' ')) c = cc ;
                }
                h.seq += c
            }

        }

        return h
    }
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
 'GGG' : 'G'
}
