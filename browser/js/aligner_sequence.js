require(['./js/aligner_amino.js']);

/**
 * Sequence object contain a dna sequence and various functions to manipulate them
 * @param {integer/string} id - sequence id (same as clone id for clone sequence / same as gene name for gene sequence)
 * @param {Model} model 
 * @constructor
 * */
function Sequence(id, model, segmenter) {
    this.id = id;
    this.m = model;
    this.segmenter = segmenter;
    this.seq = [];
    this.pos = [];
    this.is_aligned = false;

    //build required dom element if missing
    if (typeof this.segmenter.index[id] == "undefined")
        this.segmenter.build_sequence(id)
    
    //retrieve parent dom element 
    this.div = this.segmenter.index[id].getElement("main");

    this.layers = LAYERS;
}

Sequence.prototype = {
    /**
     * load the clone sequence <br>
     * retrieve clone sequence in model or use the one given in parameter <br>
     * @param {string} str
     * */
    load: function (str, isAligned) {
        this.is_aligned = false;
        if (typeof isAligned !== 'undefined') this.is_aligned = isAligned;

        //str sequence is not provided, go search in model
        if (typeof str === 'undefined') {

            //this is a clone sequence
            if (!isNaN(this.id)){
                if (typeof this.m.clone(this.id).sequence == 'undefined' || this.m.clone(this.id).sequence === 0) 
                    str = this.m.clone(this.id).id;
                else
                    str = this.m.clone(this.id).sequence;
            }
            else{
                str = this.seq.join('').replace(/\–/g, "")
            }
        }
        str = str.replace(/\-/g, SYMBOL_VOID);
        this.seq = str.split("");
        this.seqAA = str.split("");
        this.computePos();

        return this;
    },

    /**
     * save the position of each nucleotide in an array <br>
     * return {array}
     * */
     computePos: function () {
        this.pos = [];
        var j = 0;
        for (var i = 0; i < this.seq.length; i++) {
            if (this.seq[i] != SYMBOL_VOID) {
                this.pos.push(i);
            }
        }
        this.pos.push(this.seq.length);
        return this;
    },

    /**
     * use the cdr3 (if available) to compute the amino acid sequence <br>
     * */
    aminoString: function () {
        var start = -1;
        var stop = -1;
        var cdr3aa = "";

        // custom sequence don't have cdr3 to anchor amino sequence
        // TODO check how to do it for germline sequence
        if (isNaN(this.id)) return ""
                
        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return "";
        var seq = clone.sequence;

        var cdr3;
        if (clone.hasSeg('cdr3')){
            //use cdr3 to find AA position if available
            cdr3 = clone.seg.cdr3;
        }else{
            //or use main clone in aligner as ref
            var clone2 = this.m.clone(this.segmenter.sequence[this.segmenter.sequence_order[0]].id);
            if (clone2.hasSeg('cdr3')){
                cdr3 = clone2.seg.cdr3;
            }
        }
        
        if (typeof cdr3 != "undefined" ){
            if (typeof cdr3.start != "undefined") {
                start = cdr3.start;
                stop = cdr3.stop;
                cdr3aa = cdr3.aa;
            }else if (cdr3.constructor === String){
                start = clone.sequence.indexOf(cdr3);
                stop = start + cdr3.length;
            }
        }
        
        
        for (var h=0; h<seq.length; h++) this.seqAA[h] = '\u00A0';
        
        var i = start%3;

        if (clone.hasSeg('5') && typeof clone.seg['5'].start != undefined)
            while (i+3 <= clone.seg['5'].start)
                i = i+3;

        var end = seq.length;
        if (cdr3aa != "" && cdr3aa.indexOf("#") != -1)
            end = start +3 *cdr3aa.indexOf("#") ;

        if (clone.hasSeg('3') && typeof clone.seg['3'].stop != undefined)
            while (end > clone.seg['3'].stop)
                end = end-3;

        var code;
        while (i<end){  
            code = seq[i]+seq[i+1]+seq[i+2];   
            this.seqAA[i] = '\u00A0';
            this.seqAA[i+1] = tableAAdefault(code.toUpperCase());
            this.seqAA[i+2] = '\u00A0';
            i=i+3;
        }

        if (cdr3aa != "" && cdr3aa.indexOf("#") != -1){
            start2 = stop +1 -((cdr3aa.length - cdr3aa.indexOf("#")-1)*3);
            end = seq.length;

            if (clone.hasSeg('3') && typeof clone.seg['3'].stop != undefined)
                while (end > clone.seg['3'].stop)
                    end = end-3;

            while (i<start2){
                this.seqAA[i] = '#';
                i++;
            } 

            while (i<end){  
                code = seq[i]+seq[i+1]+seq[i+2];   
                this.seqAA[i] = '\u00A0';
                this.seqAA[i+1] = tableAAdefault(code.toUpperCase());
                this.seqAA[i+2] = '\u00A0';      
                i=i+3;
            }
        }

        var aa = this.align(this.seqAA.join(''), SYMBOL_VOID);
        
        if (this.segmenter.use_dot && this.segmenter.aligned &&
            (typeof clone.sequence != 'undefined' && clone.sequence !== 0 ) &&
            (this.id != this.segmenter.sequence[this.segmenter.sequence_order[0]].id)){

            var ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].aminoString();

            this.seq_a = [];
            for (var a in aa){
                if (aa[a] == '\u00A0' ||
                   (aa[a] != ref[a] && aa[a] != SYMBOL_VOID && ref[a] != SYMBOL_VOID)){
                    this.seq_a[a] = aa[a];
                }else{
                    this.seq_a[a] = SYMBOL_MATCH;
                    if(aa[a] == SYMBOL_VOID || ref[a] == SYMBOL_VOID)
                        this.seq_a[a] = aa[a];
                }
            }
            return this.seq_a.join('');
        }else{
            return aa
        }
    },

    aminoSplitString: function () {
        var start = -1;
        var stop = -1;
        var cdr3aa = "";
        this.AAlink = [];

        if (isNaN(this.id)) return ""
                
        var clone = this.m.clone(this.id);
        if (!clone.hasSequence()) return "";
        var seq = clone.sequence;

        if (clone.hasSeg('cdr3')){
            if (typeof clone.seg.cdr3.start != "undefined") {
                start = clone.seg.cdr3.start;
                stop = clone.seg.cdr3.stop;
                cdr3aa = clone.seg.cdr3.aa;
            }else if (clone.seg.cdr3.constructor === String){
                start = clone.sequence.indexOf(clone.seg.cdr3);
                stop = start + clone.seg.cdr3.length;
            }
        }

        if (typeof start == "undefined" || start == -1){
            this.seqAAs = [];
            return "";
        }

        this.seqAAs = [];
        for (var h=0; h<seq.length; h++) this.seqAAs[h] = '\u00A0';
        
        var i = start%3;

        var end = seq.length;
        if (cdr3aa != "" && cdr3aa.indexOf("#") != -1)
            end = start +3 *cdr3aa.indexOf("#") ;

        while (i<end){
            code = seq[i]+seq[i+1]+seq[i+2];   
            this.AAlink[this.pos[i]] = {code : code, index : 0};
            this.AAlink[this.pos[i+1]] = {code : code, index : 1};
            this.AAlink[this.pos[i+2]] = {code : code, index : 2};  
            this.seqAAs[i+2] = '|';
            i=i+3;
        }

        if (cdr3aa != "" && cdr3aa.indexOf("#") != -1){
            start2 = stop +1 -((cdr3aa.length - cdr3aa.indexOf("#")-1)*3);
            end = seq.length;

            i = start2;
            this.seqAAs[i-1] = '|';

            while (i<end){ 
                code = seq[i]+seq[i+1]+seq[i+2];   
                this.AAlink[this.pos[i]] = {code : code, index : 0};
                this.AAlink[this.pos[i+1]] = {code : code, index : 1};
                this.AAlink[this.pos[i+2]] = {code : code, index : 2}; 
                this.seqAAs[i+2] = '|';      
                i=i+3;
            }
        }
    
        return this.align(this.seqAAs.join(''), '\u00A0');
    },

    align: function(str, char){
        result = [];
        for (var i in this.seq) result.push(char);
        for (var j in this.pos) result[this.pos[j]] = str[j];
        return result.join('');
    },

    toString: function(div) {
        if (typeof this.div == "undefined") this.div = div;
        this.updateLayers();
    },

    nucleoString: function(){
        if (this.segmenter.use_dot && this.segmenter.aligned &&
            (this.id != this.segmenter.sequence[this.segmenter.sequence_order[0]].id)){

            var ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;

            this.seq_a = [];
            for (var a in this.seq){
                if (this.seq[a] != ref[a] && this.seq[a] != SYMBOL_VOID && ref[a] != SYMBOL_VOID){
                    this.seq_a[a] = this.seq[a];
                }else{
                    this.seq_a[a] = SYMBOL_MATCH;
                    if(this.seq[a] == SYMBOL_VOID || ref[a] == SYMBOL_VOID)
                        this.seq_a[a] = this.seq[a];
                }
            }
            return this.seq_a.join('');
        }else{
            return this.seq.join('');
        }
    },

    qualityString: function(test){
        var max_quality_illumina = 40;
        var max_quality_sanger = 93;
        var max_quality = max_quality_illumina;
        var h = 6; // height in pixel

        if (isNaN(this.id)) return ""

        var clone = this.m.clone(this.id);
        var result = document.createElement('div');
        result.style.height = h+"px";
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
                    block.style.height = 3  + "px";
                }else{
                    var q = this.quality[k].charCodeAt(0)-33;
            
                    if (q == 0){
                        block.title = "quality : 0";
                        block.style.background = "white";
                    }
                    else{
                        block.title = "quality : '"+ this.quality[k] + "' ("+q+"/"+max_quality+")";
                        block.style.background = d3.interpolateTurbo( 1 - 0.6*((q)/max_quality));
                        //block.style.background = d3.interpolateSinebow( 0.4*((q)/max_quality)  );
                        //block.style.background = "linear-gradient(" + d3.interpolateTurbo( 1 - 0.6*((q)/max_quality)) +","+ 
                        //                            d3.interpolateTurbo( 1 - 0.6*((q+2*max_quality)/max_quality/3)) +","+
                        //                            d3.interpolateTurbo( 1 - 0.6*((q+2*max_quality)/max_quality/3)) +","+
                        //                            d3.interpolateTurbo( 1 - 0.6) +")";
                        block.style.position = "relative";
                        block.style.top = Math.floor((h-((q*h)/max_quality))) + "px";
                        block.style.height = 3  + "px";
                    }
                }
                result.appendChild(block);
                width = 0;
            }
        }

        if (typeof test != "undefined" && test) return this.quality.join("");

        return result;
    },

    muteSubstitutionString: function(){
        var seq,ref;
        seq = this.seq;
        ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;

        var sub = [];
        for (var a in seq)
            if (seq[a] != ref[a] && seq[a] != SYMBOL_VOID && ref[a] != SYMBOL_VOID &&
                seq[a] != '\u00A0' && ref[a] != '\u00A0'){
                    
                    var code = this.AAlink[a].code;
                    var split = this.AAlink[a].code.split('');
                    split[this.AAlink[a].index] = ref[a];
                    var code2 = split.join('');
                    if (tableAAdefault(code.toUpperCase()) == tableAAdefault(code2.toUpperCase()))
                        sub[a] = "_";
                    else
                        sub[a] = '\u00A0';
                }
            else
                sub[a] = '\u00A0';

        return sub.join('');
    },
    
    substitutionString: function(){
        var seq,ref;
        if (LAYERS.amino.enabled) {
            seq = this.align(this.seqAA.join(''), SYMBOL_VOID)
            var r = this.segmenter.sequence[this.segmenter.sequence_order[0]];
            ref = r.aminoString();
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var sub = [];
        for (var a in seq)
            if (seq[a] != ref[a] && seq[a] != SYMBOL_VOID && ref[a] != SYMBOL_VOID &&
                seq[a] != '\u00A0' && ref[a] != '\u00A0')
                sub[a] = seq[a];
            else
                sub[a] = '\u00A0';

        return sub.join('');
    },

    deletionString: function(){
        var seq,ref;
        if (LAYERS.amino.enabled) {
            seq = this.align(this.seqAA.join(''), SYMBOL_VOID)
            var r = this.segmenter.sequence[this.segmenter.sequence_order[0]];
            ref = r.align(r.seqAA.join(''), SYMBOL_VOID)
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var del = [];
        for (var a in this.seq)
            if (seq[a] != ref[a] && seq[a] == SYMBOL_VOID &&
            seq[a] != '\u00A0' && ref[a] != '\u00A0')
                del[a] = SYMBOL_VOID;
            else
                del[a] = '\u00A0';

        return del.join('');
    },   

    insertionString: function(){
        var seq,ref;
        if (LAYERS.amino.enabled) {
            seq = this.align(this.seqAA.join(''), SYMBOL_VOID)
            var r = this.segmenter.sequence[this.segmenter.sequence_order[0]];
            ref = r.align(r.seqAA.join(''), SYMBOL_VOID)
        } else {
            seq = this.seq;
            ref = this.segmenter.sequence[this.segmenter.sequence_order[0]].seq;
        }

        var ins = [];
        for (var a in this.seq)
            if (this.seq[a] != ref[a] && ref[a] == SYMBOL_VOID)
                ins[a] = seq[a];
            else
                ins[a] = '\u00A0';

        return ins.join('');
    },   

    searchString: function(){
        if (this.m.filter.check("Clone", "search") == -1) return "";

        var f = this.m.filter.filters[this.m.filter.check("Clone", "search")]
        var seq = this.seq;  

        var str = seq.filter(function(e){return e != SYMBOL_VOID;}).join('').toUpperCase();

        var search = [];
        search.push(f.value.toUpperCase());    //sequence
        search.push(f.value.toUpperCase().split("").reverse().join("")); //reverse sequence

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
        for (var i in this.layers){
            var l = this.layers[i];

            // check if layer condition are met
            var isOk = true;
            if (l.condition){   
                try{
                    isOk = l.condition(this,undefined);
                }catch(e){
                    isOk = false;
                }
            }

            this.updateLayerDiv(i, (isOk && l.enabled) );
        }
    },

    // create or update a 
    updateLayerDiv: function(layer, display){
        var l = this.layers[layer];

        //store anchor div dom pointer for next uses
        if (!this.div_nuc) 
        this.div_nuc = this.div.getElementsByClassName("seq_layer_nuc")[0];

        // create layer div in aligner if needed
        var div_layer = this.div.getElementsByClassName("seq_layer_"+layer)[0];
        if (!div_layer){
            div_layer = document.createElement('div');
            $(div_layer).addClass("seq_layer").addClass("seq_layer_"+layer).insertAfter(this.div_nuc);
        }

        if (display){
            div_layer.style.display = "block";
         } else {
            div_layer.style.display = "none";
            return div_layer;
         }

        //reset custom attributes
        div_layer.setAttribute("style", "");

        // set start / stop
        var start = this.segment_start(l.start);
        var stop = this.segment_stop(l.stop);
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
                    div_layer.title = layer;
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
                        div_layer.innerHTML = text.replace('\t','-');
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
        var className = "seq_layer seq_layer_"+layer;          
        if (l.className) className += " "+ l.className;
        div_layer.className = className;

        //set custom style
        for (var s in l.style) div_layer.style[s] = l.style[s]; 
        div_layer.style.letterSpacing = this.l_spacing + "px";

        return div_layer;
    },

    segment_start: function(fct){
        try{
            var clone = this.m.clone(this.id);
            return this.pos[fct(this,clone)];
        }catch(e){
            return undefined;
        }
    },
    segment_stop: function(fct){
        try{
            var clone = this.m.clone(this.id);
            return this.pos[fct(this,clone)]+1;
        }catch(e){
            return undefined;
        }
    },

    updateLetterSpacing: function(l_spacing){
        var div_nuc = this.div.getElementsByClassName("seq_layer_test")[0];
        
        if (typeof l_spacing == "undefined"){

            div_nuc.style.letterSpacing = "0px";

            var size = 1000;
            var text = "";
            for (var i = 0; i < size; i++) text+="A";
            var div = document.createElement("div");
            div.style.display = "block";
            div.textContent = text;
            div_nuc.appendChild(div);
            this.c_size = div.offsetWidth/size;
            div_nuc.removeChild(div);
            this.l_spacing = CHAR_WIDTH - this.c_size;

            div_nuc.style.letterSpacing = this.l_spacing+"px";
        }
        else{
            if (l_spacing == this.l_spacing) return this.l_spacing;
            this.l_spacing = l_spacing;
            div_nuc.style.letterSpacing = this.l_spacing+"px";
        }
        return this.l_spacing;
    },

    // return a list of external services (IMGT / CloneDB) data required to display enabled layers
    needRefresh: function(){
        var refreshList = []

        // check enabled layers
        for (var i in this.layers){
            var l = this.layers[i];
            var r = false
            if (l.enabled && typeof l.refresh != 'undefined')
                try{
                    r = l.refresh(this.m.clone(this.id));
                }catch(e){
                    r = false;
                }
            
            if (typeof r == 'string' && refreshList.indexOf(r) ==-1) 
                refreshList.push(r)
        
        }

        // check select axis info
        for (var j in this.segmenter.selectedAxis){
            var a = this.segmenter.selectedAxis[j];
            var r2 = false
            if (a.refresh != 'undefined')
                try{
                    r2 = a.refresh(this.m.clone(this.id));
                }catch(e){
                    r2 = false;
                }
            
            if (typeof r2 == 'string' && refreshList.indexOf(r2) ==-1) 
                refreshList.push(r2)
        
        }
        return refreshList
    },
};