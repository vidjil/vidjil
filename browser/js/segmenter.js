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


/* segment constructor
 *
 * */
function Segment(id, model, cgi_address) {
    this.id = id; //ID de la div contenant le segmenteur
    this.m = model; //Model utilisé
    this.m.view.push(this); //synchronisation au Model
    this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
    this.cgi_address = cgi_address
    
    this.memtab = [];
    this.sequence = {};
    this.is_open = false

}

Segment.prototype = {

    /* 
     *
     * */
    init: function () {

        this.build()

    },

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
        span = document.createElement('span');
        span.id = "align"
        this.updateAlignmentButton();
        span.className = "button"
        span.onclick = function () {
            self.align()
        }
        span.appendChild(document.createTextNode("align"));
        div_menu.appendChild(span)

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

        var div_focus = document.createElement('div');
        div_focus.className = "focus"
        div.appendChild(div_focus)

        var div_stats = document.createElement('div');
        div_stats.className = "stats"
        div.appendChild(div_stats)

        parent.appendChild(div)

        div = document.createElement('div');
        div.id = "segmenter"
        //listSeq
        ul = document.createElement('ul');
        ul.id = "listSeq"
        div.appendChild(ul)
        
        parent.appendChild(div)

        $('#toClipBoard')
            .zclip({
                path: 'js/lib/ZeroClipboard.swf',
                copy: function () {
                    return self.toFasta()
                }
            });
            
        $('#segmenter')
            .scroll(function(){
                var leftScroll = $('#segmenter').scrollLeft();  
                $('.seq-fixed').css({'left':+leftScroll});
            })
            .mouseenter(function(){
                if (!self.is_open){
                    var seg = $('#segmenter'),
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
            
        $('#bot-container')
            .mouseleave(function(){
                if (self.is_open){
                    var seg = $('#segmenter')
                    seg.stop().animate({height: 100}, 250);
                    self.is_open = false
                }
            });
        
        
        
    },

    /*
     *
     * */
    resize: function () {},

    /*
     *
     * */
    update: function () {
        for (var i = 0; i < this.m.clones.length; i++) {
            this.updateElem([i]);   
        }
    },

    /*
     *
     * */
    updateElem: function (list) {
        
        for (var i = 0; i < list.length; i++) {
            var id = list[i]
            if (this.m.clone(id).isSelected()) {
                if (document.getElementById("seq" + id)) {
                    var spanF = document.getElementById("f" + id);
                    this.div_elem(spanF, id);
                    
                    var spanM = document.getElementById("m" + id);
                    spanM.innerHTML = this.sequence[id].toString()
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
    
    /* Fonction permettant de recharger le bouton 'align' 
    */
    updateAlignmentButton: function() {
        var self = this;
        var align = document.getElementById("align");
        if (align != null) {
            if (this.m.getSelected().length > 1) {
                align.className = "button";
                align.onclick = function() {self.align();};
            }
            else {
                align.className = "";
                align.className = "button inactive";
                align.onclick = function() {};
            }
        }
    },


    /* genere le code HTML des infos d'un clone
     * @div_elem : element HTML a remplir
     * @cloneID : identifiant du clone a décrire
     * */
    div_elem: function (div_elem, cloneID) {
        var self = this;

        div_elem.innerHTML = '';
        div_elem.className = "seq-fixed";

        var seq_name = document.createElement('span');
        seq_name.className = "nameBox";
        seq_name.onclick = function () {
            self.m.clone(cloneID).unselect();
        }
        seq_name.appendChild(document.createTextNode(this.m.clone(cloneID).getName()));
        seq_name.title = this.m.clone(cloneID).getName();
        seq_name.style.color = this.m.clone(cloneID).color;

        var svg_star = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg_star.setAttribute('class', 'starBox');
        svg_star.onclick = function () {
            changeTag(cloneID);
        }

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', this.starPath);
        path.setAttribute('id', 'color' + cloneID);
        if (typeof this.m.clone(cloneID).tag != 'undefined') path.setAttribute("fill", tagColor[this.m.clone(cloneID).tag]);
        else path.setAttribute("fill", color['@default']);

        svg_star.appendChild(path);

        var seq_size = document.createElement('span')
        seq_size.className = "sizeBox";
        seq_size.onclick = function () {
            self.m.clone(cloneID).unselect();
        }
        seq_size.style.color = this.m.clone(cloneID).color;
        seq_size.appendChild(document.createTextNode(this.m.clone(cloneID).getStrSize()));

        div_elem.appendChild(seq_name);
        div_elem.appendChild(svg_star);
        div_elem.appendChild(seq_size);
    },

    addToSegmenter: function (cloneID) {
        var self = this;

        this.sequence[cloneID] = new Sequence(cloneID, this.m)
        
        var divParent = document.getElementById("listSeq");
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
        spanM.innerHTML = this.sequence[cloneID].load().toString()

        li.appendChild(spanF);
        li.appendChild(spanM);
        divParent.appendChild(li);

    },


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
                system=c.getSystem()
                max=c.getSize()
            }
        }
        if (address == 'IMGT') imgtPost(request, system);
        if (address == 'igBlast') igBlastPost(request, system);

    },

    show: function () {
        var li = document.getElementById("listSeq")
            .getElementsByTagName("li");
        if (li.length > 0) {
            var id = li[0].id.substr(3);
            var mid = 999999
            $("#segmenter")
                .animate({
                    scrollLeft: mid
                }, 0);
        }
    },

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
                self.displayAjaxResult(result);
            },
            error: function () {
                myConsole.flash("cgi error : impossible to connect", 2)
            }
        })
    },

    clipBoard: function () {

        var div = document.getElementById('clipBoard');
        div.innerHTML = "";
        div.appendChild(document.createTextNode(""));

        /*
        if (document.createRange && window.getSelection) {
            var range = document.createRange();
            range.selectNode(div);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        } 
        */

    },

    toFasta: function () {
        var selected = this.m.getSelected();
        var result = "";

        for (var i = 0; i < selected.length; i++) {
            result += "> " + this.m.clone(selected[i]).getName() + " // " + this.m.clone(selected[i]).getStrSize() + "\n";
            result += this.m.clone(selected[i]).sequence + "\n";
        }
        return result
    },
    
    displayAjaxResult: function(file) {

        var json = JSON.parse(file)

        for (var i = 0; i < json.seq.length; i++) {

            // global container
            var spanM = document.getElementById("m" + this.memTab[i]);
            spanM.innerHTML = "";

            var seq = this.sequence[this.memTab[i]]
            spanM.innerHTML = seq.load(json.seq[i])
                .diff(json.seq[0])
                .toString()

        }

    },
    updateStats: function (){
        var list = this.m.getSelected()
        var sumPercentage = 0;
        var sumReads = 0;
        var length = 0;
            
        //verifier que les points sélectionnés sont dans une germline courante
        for (var i = 0; i < list.length ; i++){   
            if (m.clones[list[i]].isActive()) {
                length += 1;
                sumPercentage += this.m.clone(list[i]).getSize();
                sumReads+= this.m.clone(list[i]).getReads(); 
            }
        }

        var t = ""
        if (sumReads > 0) {
            t += length + " clone" + (length>1 ? "s" : "") + ", "
            t += this.m.toStringThousands(sumReads) + " read" + (sumReads>1 ? "s" : "") + ", "
            t += sumPercentage = m.formatSize(sumPercentage, true);
        }
            
        $(".stats").text(t)
    }



} //fin prototype Segment




function Sequence(id, model) {
    this.id = id; //clone ID
    this.m = model; //Model utilisé
    this.seq = [];
    this.pos = [];
    this.use_marge = true
}

Sequence.prototype = {

    //load sequence from model or use given argument
    load: function (str) {
        if (typeof str !== 'undefined') this.use_marge = false
        str = typeof str !== 'undefined' ? str : this.m.clone(this.id).sequence;

        if (typeof this.m.clone(this.id).sequence == 'undefined' || this.m.clone(this.id).sequence == 0) {
            str = this.m.clone(this.id).id
        }
        
        this.seq = str.split("")
        this.computePos()

        return this;
    },

    //store position of each nucleotide
    computePos: function () {
        this.pos = [];
        var j = 0
        for (var i = 0; i < this.seq.length; i++) {
            if (this.seq[i] != "-") {
                this.pos.push(i)
            }
        }
        return this;
    },

    //compare sequence with another string and surround change
    diff: function (str) {
        for (var i = 0; i < this.seq.length; i++) {
            if (this.seq[i] != str[i]) {
                this.seq[i] = "<span class='substitution'>" + this.seq[i] + "</span>"
            }
        }
        return this;
    },

    //return sequence completed with html tag
    toString: function () {
        var clone = this.m.clone(this.id)
        var result = ""
        
        if (typeof clone.sequence != 'undefined' && clone.sequence != 0) {
            //find V, D, J position
            if (typeof clone.seg != 'undefined'){
                var endV = this.pos[clone.seg["5end"]]
                var startJ = this.pos[clone.seg["3start"]]
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

            //window
            var window_start = this.pos[clone.sequence.indexOf(clone.id)]
            var window_end = this.pos[clone.sequence.indexOf(clone.id)+clone.id.length]

            
            //add span VDJ
            if (typeof clone.seg != 'undefined') result += "<span class='V' " + vColor + " >"
            else result += "<span>"
            for (var i = 0; i < this.seq.length; i++) {
                result += this.seq[i]

                if (i == endV) result += "</span><span class ='N'>"
                if (i == startD - 1) result += "</span><span class ='D'>"
                if (i == endD) result += "</span><span class ='N'>"
                if (i == startJ - 1) result += "</span><span class ='J' " + jColor + " >"
                
                if (i== window_start-1 && this.m.display_window){
                    result += "<span class='window1'><span class='window2'>"
                    for (var j=0; j<(window_end - window_start); j++) result += "&nbsp"
                    result += "</span></span>"
                
                }
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


}
