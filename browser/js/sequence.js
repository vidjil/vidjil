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
        //this.computeAAseq();

        return this;
    },

    /**
     * use the cdr3 (if available) to compute the amino acid sequence <br>
     * */
    aminoString: function () {
        var start = -1;
        
        this.segmenter.amino = true;

        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return "";

        if (clone.hasSeg('cdr3')){
            if (typeof clone.seg.cdr3.start != "undefined") {
                start = this.pos[clone.seg.cdr3.start];
            }else if (clone.seg.cdr3.constructor === String){
                start = this.pos[clone.sequence.indexOf(clone.seg.cdr3)];
            }
        }
        if (typeof start == "undefined" || start == -1){
            this.seqAA = [];
            return "";
        }
        
        for (var h=0; h<this.seq.length; h++) this.seqAA[h] = '\u00A0';
        
        var i = start%3;

        while (i<this.seq.length){
                
            var code = "";
            var pos;
            
            while (code.length<3){
                if (this.seq[i] != "-") {
                    code += this.seq[i];
                    this.seqAA[i] = '\u00A0';
                }else{
                    this.seqAA[i] = '-';
                }
                if(code.length == 2) pos = i;
                i++;
            }

            if (code.length == 3)
                this.seqAA[pos] = tableAAdefault(code);
        }

        return this.seqAA.join('');
    },

    aminoSplitString: function () {
        var start = -1;
                
        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return "";

        if (clone.hasSeg('cdr3')){
            if (typeof clone.seg.cdr3.start != "undefined") {
                start = this.pos[clone.seg.cdr3.start];
            }else if (clone.seg.cdr3.constructor === String){
                start = this.pos[clone.sequence.indexOf(clone.seg.cdr3)];
            }
        }
        if (typeof start == "undefined" || start == -1){
            this.seqAAs = [];
            return "";
        }
        
        this.seqAAs = [];
        for (var h=0; h<this.seq.length; h++) this.seqAAs[h] = '\u00A0';
        
        var i = start%3;
        while (i<this.seq.length){
                
            var code = "";
            
            while (code.length<3){
                if (this.seq[i] != "-") code += this.seq[i];
                
                if(code.length == 3) this.seqAAs[i] = '|';

                i++;
            }
        }

        return this.seqAAs.join('');
    },

    toString: function(div) {
        this.div = div;
        this.updateLetterSpacing();
        this.updateLayers();
    },

    nucleoString: function(){
        var clone = this.m.clone(this.id);
        
        if (this.segmenter.use_dot && this.segmenter.aligned &&
            (typeof clone.sequence != 'undefined' && clone.sequence !== 0 ) &&
            (this.id != this.segmenter.sequence[this.segmenter.sequence_order[0]].id)){

            var ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;

            this.seq_a = [];
            for (var a in this.seq){
                if (this.seq[a] != ref[a] && this.seq[a] != '-' && ref[a] != '-'){
                    this.seq_a[a] = this.seq[a];
                }else{
                    this.seq_a[a] = '*';
                    if(this.seq[a] == '-' || ref[a] == '-')
                        this.seq_a[a] = this.seq[a];
                }
            }
            return this.seq_a.join('');
        }else{
            return this.seq.join('');
        }
    },

    qualityString: function(){
        var max_quality_illumina = 40;
        var max_quality_sanger = 93;

        var max_quality = max_quality_illumina;

        var clone = this.m.clone(this.id);
        var result = document.createElement('div');
        result.style.height = "100%";
        result.style.width = "max-content";
        result.style.display = "table";

        this.quality = [];
        for (var j=0; j<this.seq.length; j++) this.quality[j] = -1;

        for (var i=0; i<this.pos.length; i++){
            var p = this.pos[i];
            this.quality[p] = clone.seg.quality.seq[i];
        }

        var width = 0;
        for (var k=0; k<this.quality.length-1; k++){
            width += CHAR_WIDTH;

            if (k+1 == this.quality.length || 
                (this.quality[k+1] != this.quality[k])){
                var block = document.createElement("span");
                block.style.width = width+"px";
                block.className = "seq_quality_block";

                if (this.quality[k] == -1){
                    block.title = "quality : xxx";
                    block.style.background = "grey";
                }
                else{
                    var q = this.quality[k].charCodeAt(0)-33;
                    block.title = "quality : '"+ this.quality[k] + "' ("+q+"/"+max_quality+")";
                    //block.style.background = d3.interpolateTurbo( 1 - 0.6*((quality)/max_quality));
                    block.style.background = d3.interpolateSinebow( 0.4*((q)/max_quality)  );
                }
                result.appendChild(block);
                width = 0;
            }
        }

        return result;
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
        for (var a in seq)
            if (seq[a] != ref[a] && seq[a] != '-' && ref[a] != '-' && 
                seq[a] != '\u00A0' && ref[a] != '\u00A0')
                sub[a] = seq[a];
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
            if (seq[a] != ref[a] && seq[a] == '-' && 
            seq[a] != '\u00A0' && ref[a] != '\u00A0')
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
                ins[a] = seq[a];
            else
                ins[a] = '\u00A0';

        return ins.join('');
    },   

    searchString: function(){
        if (typeof this.m.filter_string == 'undefined') return "";

        var seq = this.seq;  

        var str = seq.filter(function(e){return e != '-';}).join('');

        var search = [];
        search.push(this.m.filter_string.toUpperCase());    //sequence
        search.push(this.m.filter_string.toUpperCase().split("").reverse().join("")); //reverse sequence

        var hitmap = [];
        for (var i in seq) hitmap.push(false);

        for (var s in search){
        var pointer = str.indexOf(search[s], pointer);
            while ( pointer != -1 ){
                for (var h = pointer; h< pointer+search[s].length; h++)
                    hitmap[h] = true;
                pointer = str.indexOf(search[s], pointer+1);
            }
        }

        var result = [];
        for (var j in seq) result[j] = '\u00A0';
        for (var k in hitmap)
            if (hitmap[k])
                result[this.pos[k]] = seq[this.pos[k]];
        
        return result.join('');
    },

    updateLayers: function(){

        var clone = this.m.clone(this.id);
        var div_nuc = this.div.getElementsByClassName("seq_layer_nuc")[0];

        if (typeof clone.sequence != 'undefined' && clone.sequence !== 0) {
            for (var i in this.layers){
                var l = this.layers[i];

                // create layer if needed
                var div_layer = this.div.getElementsByClassName("seq_layer_"+i)[0];
                if (!div_layer){
                    div_layer = document.createElement('div');
                    $(div_layer).addClass("seq_layer").addClass("seq_layer_"+i).insertAfter(div_nuc);
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
                            text = l.text(this, this.m.clone(this.id));
                            if (typeof text == "string") { 
                                div_layer.innerHTML = l.text(this, this.m.clone(this.id));
                            }else {
                                div_layer.innerHTML = "";
                                div_layer.append(text);
                            }
                        }catch(e){
                            div_layer.innerHTML = "";
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
