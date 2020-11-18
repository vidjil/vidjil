SEGMENT_KEYS = ["4", "4a", "4b", "cdr3"];

CHAR_WIDTH = 15;


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

    this.layers = [
        {
            'menu_name': "VDJ",
            'height': 15,
            'position': 0, 
            'segment':[{   
                'className' : "seq-v",
                'start' : function(c){return c.seg["5"].start;},
                'stop' : function(c){return c.seg["5"].stop;},
                'color' : "green"
            },
            {   
                'className' : "seq-d",
                'start' : function(c){return c.seg["4"].start;},
                'stop' : function(c){return c.seg["4"].stop;},
                'color' : "red"
            },
            {   
                'className' : "seq-j",
                'start' : function(c){return c.seg["3"].start;},
                'stop' : function(c){return c.seg["3"].stop;},
                'color' : "yellow"
            },
            {   
                'className' : "seq-dd",
                'start' : function(c){return c.seg["4a"].start;},
                'stop' : function(c){return c.seg["4a"].stop;},
                'color' : "red"
            },
            {   
                'className' : "seq-ddd",
                'start' : function(c){return c.seg["4b"].start;},
                'stop' : function(c){return c.seg["4b"].stop;},
                'color' : "red"
            }]
        },
        {
            'menu_name': "CDR3",
            'height': 5,
            'position': 15, 
            'segment':[{   
                    'className' : "seq-cdr3",
                    'start' : function(c){return c.seg.cdr3.start;},
                    'stop' : function(c){return c.seg.cdr3.stop;},
                    'color' : "pink"
            }]
        }
    ];
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

    toString: function(div) {
        var div_nuc = div.getElementsByClassName("seq-nuc")[0];
        div_nuc.style.letterSpacing = "0px";
        var c_size = this.average_char_size(div_nuc);
        var l_spacing = CHAR_WIDTH - c_size;
        div_nuc.style.letterSpacing = l_spacing + "px";
        div_nuc.innerHTML = this.seq.join('');

        var clone = this.m.clone(this.id);
        if (typeof clone.sequence != 'undefined' && clone.sequence !== 0) {
            for (var i in this.layers){
                var l = this.layers[i];
                for (var j in l.segment){
                    var s = l.segment[j];

                    var div_h = div.getElementsByClassName(s.className)[0];
                    var start = this.segment_start(clone,s.start);
                    var stop = this.segment_stop(clone,s.stop);
                    
                    if (start != undefined && stop != undefined){
                        var width = Math.floor(CHAR_WIDTH * (stop - start));
                        var left = Math.floor(CHAR_WIDTH * start) - Math.round(l_spacing*2)/4;
                        div_h.style.width = width + "px";
                        div_h.style.left = left + "px";
                    }
                }    
            }


            if (this.segmenter.aligned && this.id != this.segmenter.sequence[this.segmenter.sequence_order[0]].id){
                var seq,ref;
                if (this.segmenter.amino) {
                    seq = this.seqAA;
                    ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seqAA;
                } else {
                    seq = this.seq;
                    ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
                }
    
                this.seq_mut=[];
                this.seq_mut2=[];
                this.seq_a =[];
                for (var a in this.seq){
                    if (this.seq[a] != ref[a] && this.seq[a] != '-' && ref[a] != '-'){
                        this.seq_mut2[a] = this.seq[a];
                        this.seq_mut[a] = '_';
                        this.seq_a[a] = this.seq[a];
                    }else{
                        this.seq_mut[a] = '\u00A0';
                        this.seq_mut2[a] = '\u00A0';
                        this.seq_a[a] = '.';
                        if(this.seq[a] == '-' || ref[a] == '-')
                            this.seq_a[a] = this.seq[a];
                    }
                }

                var div_mut = div.getElementsByClassName("seq-mut")[0];
                div_mut.style.letterSpacing = l_spacing + "px";
                div_mut.innerHTML = this.seq_mut.join('');

                var div_mut2 = div.getElementsByClassName("seq-mut2")[0];
                div_mut2.style.letterSpacing = l_spacing + "px";
                div_mut2.innerHTML = this.seq_mut2.join('');

                if (this.segmenter.use_dot)
                    div_nuc.innerHTML = this.seq_a.join('');
            }

        }
    },

    segment_start: function(clone, fct){
        try{
            return this.pos[fct(clone)];
        }catch(e){
            return undefined;
        }
    },
    segment_stop: function(clone, fct){
        try{
            return this.pos[fct(clone)]+1;
        }catch(e){
            return undefined;
        }
    },

    average_char_size: function(parent, classname){
        var size = 100;
        var text = "";
        for (var i = 0; i < size; i++) text+="A";
        var div = document.createElement("div");
        div.className = classname;
        div.style.display = "inline-block";
        div.textContent = text;
        parent.appendChild(div);
        average_size = div.offsetWidth/size;
        console.log(average_size); 
        parent.removeChild(div);
        return average_size;
    },

 

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
