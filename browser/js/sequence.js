function genSeq(id, locus, model, segmenter) {
    this.id = id; //clone ID     
    this.m = model; //Model utilisé     
    this.segmenter = segmenter;     
    this.seq = [];     
    this.pos = [];     
    this.locus = locus;
    this.use_marge = true; 
    this.is_clone = false;
    }

genSeq.prototype = {
    /**
     * load the sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str) {
        if (typeof str !== 'undefined') this.use_marge = false;
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
            mutation = mutation.replace(END_CODON, END_CODON_NOT_FIRST);
        }
        if (mutation != undefined && mutation) {
            var span = document.createElement('span');
            span.className = mutation;
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
        var j = 0;
        for (var i = 0; i < this.seq.length; i++) {
            if (this.seq[i] != "-") {
                this.pos.push(i);
            }
        }
        this.pos.push(this.seq.length);
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
        currentSpan.id = "sequence-clone-"+ this.id;

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

        var i_am_first_clone = (this.id == this.segmenter.sequence_order[0]);
        
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

            currentSpan.appendChild(this.spanify_mutation(seq[i], ref[i], mutations.hasOwnProperty(i) ? mutations[i] : undefined, i_am_first_clone));
        }
        result.appendChild(currentSpan);
        var marge = "";
        if (this.use_marge){
            marge += "<span class='seq-marge'>";
            var size_marge = 300 - window_start;
            if (size_marge > 0) {
                for (var n = 0; n < size_marge; n++) marge += "\u00A0";
            }
            marge += "</span>";
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

Sequence.prototype = {
    /**
     * load the clone sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str) {
        if (typeof str !== 'undefined') this.use_marge = false;
        str = typeof str !== 'undefined' ? str : this.m.clone(this.id).sequence;

        if (typeof this.m.clone(this.id).sequence == 'undefined' || this.m.clone(this.id).sequence === 0) {
            str = this.m.clone(this.id).id;
        }
        
        this.seq = str.split("");
        this.seqAA = str.split("");
        this.computePos();
        this.computeAAseq();

        return this;
    },

    /**
     * use the cdr3 (if available) to compute the amino acid sequence <br>
     * */
    computeAAseq: function () {
        var start = -1;
        var stop = -1;
                
        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return;

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
            console.error( "Sequence error. Start/stop position of cdr3 are undefined");
            return;
        }

        for (var h=0; h<this.seq.length; h++) this.seqAA[h] = " ";
        
        var i = 0;

        while (i<this.seq.length){

            if (i < start || i > stop)
            {
                i++;
                continue;
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
    },

    /**
     * return sequence completed with html tag <br>
     * @return {string}
     * */
    toString: function () {
        var clone = this.m.clone(this.id);

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
                    key = SEGMENT_KEYS[i];
                    if (typeof vdjArray[key] != 'undefined' && typeof vdjArray[key].stop != 'undefined'){
                        highlights.push({'type':'N', 'color': "", 'start': vdjArray[key].stop});
                    }
                }

                // We now put the start positions (that may override previous end positions)
                for (var j in SEGMENT_KEYS) {
                    key = SEGMENT_KEYS[j];
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
        return this.highlightToString(highlights, window_start);
    },

    /**
     * get V D J start end position in a reusable way...
     *
     * @param cloneinfo
     * @return {object}
     */
    getVdjStartEnd: function (clone) {

        var vdjArray ={"5": {}, "3": {}} ;
        vdjArray["5"].start = (clone.seg["5"].start != undefined) ? this.pos[clone.seg["5"].start] : 0;
        vdjArray["5"].stop  = this.pos[clone.seg["5"].stop] + 1;
        vdjArray["3"].start = this.pos[clone.seg["3"].start];
        vdjArray["3"].stop  = (clone.seg["3"].stop != undefined)  ? this.pos[clone.seg["3"].stop] : this.seq.length;

        for (var i in SEGMENT_KEYS)
        {
            var key = SEGMENT_KEYS[i];
            vdjArray[key] = {};
            if (typeof clone.seg[key] != 'undefined' && typeof clone.seg[key].start != 'undefined' && typeof clone.seg[key].stop != 'undefined') {
                vdjArray[key] = {};
                vdjArray[key].start = this.pos[clone.seg[key].start];
                vdjArray[key].stop = this.pos[clone.seg[key].stop] + 1;
            }
        }
        return vdjArray;
    },

    /**
     * build a highlight descriptor (start/stop/color/...)
     * @param {string} field - clone field name who contain the information to highlight
     * @param {string} color
     * @return {object}
     * */
    get_positionned_highlight: function (field, color) {
        var clone = this.m.clone(this.id);
        var h = {'color' : color, 'seq': ''};
        var p = clone.getSegFeature(field);

        if (typeof p.start == 'undefined')
            return {'start' : -1, 'stop' : -1, 'seq': '', 'color' : color};

        if (typeof p.seq == 'undefined')
            p.seq = '';

        // Build the highlight object from p        
        // Both 'start' and 'stop' positions are included in the highlight
        {
            h.start = this.pos[p.start];
            h.stop = this.pos[p.stop];
            h.tooltip = typeof p.tooltip != 'undefined'? p.tooltip:"";
        }

        // Build the (possibly invisible) sequence
        if (p.seq === '') {
            h.css = "highlight_border";
            for (var l=0; l<(h.stop - h.start + 1); l++) h.seq += "\u00A0";
        } else {
            h.css = "highlight_seq";
            var j = 0;
            for (var k=h.start; j<p.seq.length; k++) { // End condition on j, not on k
                var c = "\u00A0";
                if (this.seq[k] != '-') {
                    var cc = p.seq[j++];
                    if ((cc != '_') && (cc != ' ')) c = cc ;
                    if (field == "quality") {
                        var percent = (cc.charCodeAt(0)-this.m.min_quality)/(this.m.max_quality-this.m.min_quality);
                        var color_hue = (percent * 100);
                        var col = colorGenerator(color_hue);
                        c = "<span style='height:"+(50+(percent*50))+"%;";
                        c += "top:"+(100-(50+(percent*50)))+"%;";
                        c += "position:relative;";
                        c += "background-color:"+col+";";
                        c += "'>\u00A0</span>";
                    }
                }
                h.seq += c;
            }

        }

        return h;
    }
};
Sequence.prototype = $.extend(Object.create(genSeq.prototype), Sequence.prototype);

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
