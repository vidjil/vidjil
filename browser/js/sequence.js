require(['./js/aligner_layer.js']);

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
    this.is_aligned = false;
}

genSeq.prototype = {
    /**
     * load the sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str, isAligned) {
        this.is_aligned = false;
        if (typeof isAligned == 'undefined') this.is_aligned = isAligned;

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
    this.is_aligned = false;
    this.locus = this.m.clone(id).germline;

    this.layers = LAYERS;
}

Sequence.prototype = {
    /**
     * load the clone sequence <br>
     * retrieve the one in the model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str, isAligned) {
        this.is_aligned = false;
        if (typeof isAligned !== 'undefined') this.is_aligned = isAligned;

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
        this.div = div;
        this.updateSequence();
        this.updateLayers();
    },
    
    substitutionString: function(){
        var seq,ref;
        if (this.segmenter.amino) {
            seq = this.seqAA;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seqAA;
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var sub = [];
        for (var a in this.seq)
            if (this.seq[a] != ref[a] && this.seq[a] != '-' && ref[a] != '-')
                sub[a] = this.seq[a];
            else
                sub[a] = '\u00A0';

        return sub.join('');
    },

    deletionString: function(){
        var seq,ref;
        if (this.segmenter.amino) {
            seq = this.seqAA;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seqAA;
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var del = [];
        for (var a in this.seq)
            if (this.seq[a] != ref[a] && this.seq[a] == '-')
                del[a] = '-';
            else
                del[a] = '\u00A0';

        return del.join('');
    },   

    insertionString: function(){
        var seq,ref;
        if (this.segmenter.amino) {
            seq = this.seqAA;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seqAA;
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var ins = [];
        for (var a in this.seq)
            if (this.seq[a] != ref[a] && ref[a] == '-')
                ins[a] = this.seq[a];
            else
                ins[a] = '\u00A0';

        return ins.join('');
    },   

    updateSequence: function(){
        //check letterspacing
        var div_nuc = this.div.getElementsByClassName("seq_nuc")[0];
        div_nuc.style.letterSpacing = "0px";

        this.c_size = this.average_char_size(div_nuc);
        this.l_spacing = CHAR_WIDTH - this.c_size;
        div_nuc.style.letterSpacing = this.l_spacing + "px";

        var clone = this.m.clone(this.id);
        if (this.segmenter.use_dot && this.segmenter.aligned &&
            (typeof clone.sequence != 'undefined' && clone.sequence !== 0 ) &&
            (this.id != this.segmenter.sequence[this.segmenter.sequence_order[0]].id)){

            var ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;

            this.seq_a =[];
            for (var a in this.seq){
                if (this.seq[a] != ref[a] && this.seq[a] != '-' && ref[a] != '-'){
                    this.seq_a[a] = this.seq[a];
                }else{
                    this.seq_a[a] = '*';
                    if(this.seq[a] == '-' || ref[a] == '-')
                        this.seq_a[a] = this.seq[a];
                }
            }
            div_nuc.innerHTML = this.seq_a.join('');
        }else{
            div_nuc.innerHTML = this.seq.join('');
        }
    },

    updateLayers: function(){

        var clone = this.m.clone(this.id);
        var div_nuc = this.div.getElementsByClassName("seq_nuc")[0];

        if (typeof clone.sequence != 'undefined' && clone.sequence !== 0) {
            for (var i in this.layers){
                var l = this.layers[i];

                // create layer if needed
                var div_layer = this.div.getElementsByClassName("seq_layer_"+i)[0];
                if (!div_layer){
                    div_layer = document.createElement('div');
                    $(div_layer).addClass("seq_layer").insertAfter(div_nuc);
                }

                // check layer condition
                var isOk = true;
                if (l.condition){   
                    try{
                        isOk = l.condition(this,undefined);
                    }catch(e){
                        isOk = false;
                    }
                }
                if (!isOk || !l.enabled) {
                    div_layer.style.display = "none";
                    continue;   //next layer
                }
                div_layer.style.display = "block";


                //reset custom attributes
                div_layer.setAttribute("style", "");

                // set start / stop
                var start = this.segment_start(clone,l.start);
                var stop = this.segment_stop(clone,l.stop);
                if (start != undefined && stop != undefined){
                    var width = Math.floor(CHAR_WIDTH * (stop - start))-6;
                    var left = Math.floor(CHAR_WIDTH * start) - Math.round(this.l_spacing*2)/4;
                    div_layer.style.width = width + "px";
                    div_layer.style.left = (left+3) + "px";
                }  

                //set title
                if (l.title){
                    if (typeof l.title == "function")
                        try{
                            div_layer.title = l.title(this, this.m.clone(this.id));
                        }catch(e){
                            div_layer.title = i;
                        }
                    else
                        div_layer.title = l.title;
                }

                //set text
                if (l.text){
                    if (typeof l.text == "function")
                        try{
                            div_layer.innerHTML = l.text(this, this.m.clone(this.id));
                        }catch(e){
                            div_layer.innerHTML = i;
                        }
                    else
                        div_layer.innerHTML = l.text;
                }

                //set classname
                var className = "seq_layer seq_layer_"+i;          
                if (l.className) className += " "+ l.className;
                div_layer.className = className;

                //set custom style
                for (var s in l.style) div_layer.style[s] = l.style[s]; 
                div_layer.style.letterSpacing = this.l_spacing + "px";
            }
        }
    },

    segment_start: function(clone, fct){
        try{
            return this.pos[fct(this,clone)];
        }catch(e){
            return undefined;
        }
    },
    segment_stop: function(clone, fct){
        try{
            return this.pos[fct(this,clone)]+1;
        }catch(e){
            return undefined;
        }
    },

    average_char_size: function(parent, classname){
        var size = 1000;
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
