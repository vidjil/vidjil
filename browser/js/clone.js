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


// Clone attributes
// See "Clone attributes" in doc/dev-client.md

C_CLUSTERIZABLE      = 1
C_INTERACTABLE       = 4
C_IN_SCATTERPLOT     = 32
C_SIZE_DISTRIB       = 64
C_SIZE_CONSTANT      = 128
C_SIZE_OTHER         = 256



/**
 * Clone object, store clone information and provide useful access function.
 *
 * BEWARE! Positions inside the seg field start at 0
 *
 * @constructor Clone
 * @param {object} data - json style object, come directly from .vidjil file
 * @param {Model} model
 * @param {integer} index - clone index, it's just the clone position in the model's clone array
 * */
function Clone(data, model, index, attributes) {
    this.m = model
    this.index = index
    this.split = false
    this.seg = {};
    this.segEdited = false
    // Link to another clone that include this one in his cluster (after merge)
    this.mergedId = undefined 

    this.attributes = attributes
    var key = Object.keys(data)

    //// Attributes specific for distribution clones
    // list of compatible real clones that share the same values for available axis
    this.lst_compatible_clones = undefined
    // Number of reads and clones, currently. 
    // Updated at real clone manipualtion, (change filter values, top, ...)
    this.current_clones = undefined
    this.current_reads  = undefined

    for (var i=0; i<key.length; i++ ){
        this[key[i]]=data[key[i]]
    }

    // Default value just in case
    if (this.quantifiable === undefined) {
        this.quantifiable = true;
    }

    this.seg = this.m.convertSeg(this.seg)

    // .warn, handle old formats
    if (typeof this.warn === 'undefined')
        this.warn = []
    
    if (typeof this.warn === 'string')
        this.warn = [ {'code': '', 'level': warnLevels[WARN], 'msg': this.warn } ]

    // .shortName
    if (typeof (this.getSequence()) != 'undefined' && typeof (this.name) != 'undefined') {
        this.shortName = this.name.replace(new RegExp('IGHV', 'g'), "VH");
        this.shortName = this.shortName.replace(new RegExp('IGHD', 'g'), "DH");
        this.shortName = this.shortName.replace(new RegExp('IGHJ', 'g'), "JH");
        this.shortName = this.shortName.replace(new RegExp('TRG', 'g'), "");
        this.shortName = this.shortName.replace(new RegExp('\\*..', 'g'), "");
    }
    
    this.m.clusters[index]=[index]
    this.m.clones[index]=this
    this.tag = this.getTag();

    // .warn, client computed warnings
    this.computeWarnings()
}

function nullIfZero(x) { return (x === 0 || x === '0') ? '' : x }

Clone.prototype = {

    NOT_QUANTIFIABLE_SIZE: -1, // should be < 0 to behave correcty with getMaxSize() and other comparisons
    COVERAGE_WARN: 0.5,
    EVALUE_WARN: 0.001,
    
    isWarned: function () {
    /**
     * @return {string} a warning class is set on this clone
     */
        var wL = this.warnLevel()

        if (wL >= WARN) {
            return warnTextOf(wL)
        }

        if (this.hasSeg('clonedb')) {
            if (typeof(this.seg.clonedb['–']) != 'undefined') // TODO: use a stored number of occurrences
                return 'ok'
            else
                return 'info'
        }

        return false
    },

    computeWarnings: function() {

        if (this.getCoverage() < this.COVERAGE_WARN)
            this.warn.push({'code': 'W51', 'level': warnLevels[WARN], 'msg': 'Low coverage (' + this.coverage.toFixed(3) + ')'}) ;

        if (typeof(this.getEValue()) != 'undefined' && this.eValue > this.EVALUE_WARN)
            this.warn.push({'code': 'Wxx', 'level': warnLevels[WARN], 'msg': 'Bad e-value (' + this.eValue + ')' });
    },

    warnLevel: function () {
        var level = 0

        for (var i = 0; i < this.warn.length; i++) {
            level = Math.max(level, warnLevelOf(this.warn[i].level))
        }

        return level
    },

    warnText: function () {
        var items = []

        for (var i = 0; i < this.warn.length; i++) {
            items.push(this.warn[i].code + ': ' + this.warn[i].msg)
        }

        return items.join('\n')
    },

    /**
     * return clone's most important name, shortened
     * @return {string} name
     * */

    REGEX_N: /^(-?\d*)\/([ACGT]*)\/(-?\d*)$/,                                    // 6/ACCAT/
    REGEX_N_SIZE: /^(-?\d*)\/(\d*)\/(-?\d*)$/,                                   // 6/5/
    REGEX_GENE: /(IGH|IGK|IGL|TRA|TRB|TRG|TRD|IKZF1-|ERG-)([\w-*]*)$/,                       // IGHV3-11*03
    REGEX_GENE_IGNORE_ALLELE: /(IGH|IGK|IGL|TRA|TRB|TRG|TRD|IKZF1-|ERG-)([\w-]*)([\w-*]*)$/,   // IGHV3-11*03  (ignore *03)

    getAverageReadLength: function(time) {
        if (typeof this._average_read_length == 'undefined')
            return 'undefined';
        time = this.m.getTime(time);
        var size = this._average_read_length[time];
        if (size === 0)
            return 'undefined';
        return parseFloat(size);
    },

    getShortName: function () {

        if ( this.hasSizeDistrib() ){
            return this.getName()
        } else {
            name_items = this.getName().split(' ')
        }
        short_name_items = []

        last_locus = ''

        for (var i = 0; i < name_items.length; i++) {

            s = name_items[i]

            // Shorten IGHV3-11*03 ... IGHD6-13*01 ... IGHJ4*02 into IGHV3-11*03 ... D6-13*01 ... J4*02
            // z = s.match(this.REGEX_GENE);
            z = s.match(this.REGEX_GENE_IGNORE_ALLELE);
            if (z)
            {
                if ((this.m.alleleNotation == 'always')||((this.m.alleleNotation == 'when_not_01')&&(z[3]!='*01'))){
                    locus = (z[1] == last_locus) ? '' : z[1]
                    short_name_items.push(locus + z[2]+z[3])
                    last_locus = z[1]
                     continue
                }
                else{
                    locus = (z[1] == last_locus) ? '' : z[1]
                    short_name_items.push(locus + z[2])
                    last_locus = z[1]
                     continue
                }
            }

            // Shorten -6/ACCAT/ into 6/5/0
            z = s.match(this.REGEX_N);
            if (z)
            {
                if (this.m.cloneNotationType == 'nucleotide_number'){
                    short_name_items.push(Math.abs(z[1]) + '/' + nullIfZero(z[2].length) + '/' + Math.abs(z[3]));
                }
                else if(this.m.cloneNotationType == 'short_sequence'){
                    if (z[2].length <= 6){
                         short_name_items.push(s);
                    } else{
                        short_name_items.push(Math.abs(z[1]) + '/' + nullIfZero(z[2].length) + '/' + Math.abs(z[3]));
                    }
                }
                else{
                     short_name_items.push(s);
                }

                continue
            }

            // Shorten -6/0/ into 6//0
            z = s.match(this.REGEX_N_SIZE);
            if (z)
            {
                short_name_items.push(Math.abs(z[1]) + '/' + nullIfZero(z[2]) + '/' + Math.abs(z[3]))
                continue
            }

            short_name_items.push(s)
        }

        return short_name_items.join(' ')
    },

    /**
     * Add a new feature from a nucleotide sequence
     */

    addSegFeatureFromSeq: function(field_name, seq)
    {
        this.seg[field_name] = {};
        this.seg[field_name].seq = seq;
        this.computeSegFeatureFromSeq(field_name);
    },

    /**
     * Compute feature positions (start/stop) from its sequence, unless they are already present
     * Computed positions are converted to start from 0 and can be used without manipualtions
     */
    computeSegFeatureFromSeq: function(field_name)
    {
        positions = this.getSegStartStop(field_name)

	if (positions !== null)
            // Start/stop do already exist
            return ;

        seq = this.seg[field_name].seq

        var pos = this.sequence.indexOf(seq)

        if (pos < 0)
            // No feature here
            return;

        this.seg[field_name].start = pos
        this.seg[field_name].stop  = pos + seq.length -1
    },


    /**
     * Get the amino-acid sequence of the provided field (in the seg part)
     */
    getSegAASequence: function(field_name) {
        if (this.hasSeg(field_name) &&
            typeof this.seg[field_name].aa !== 'undefined') {
            return this.seg[field_name].aa;
        }
        return '';
    },

    /**
     * Get the nucleotide sequence  (extracted from the start and stop fields)
     */
    getSegNtSequence: function(field_name) {
        positions = this.getSegStartStop(field_name)
        if (positions !== null) {
            return this.sequence.substr(positions.start, positions.stop - positions.start+1)
        }
        return '';
    },

    /**
     * Return the length of the given field_name in seg
     * (difference between the stop and the start).
     * If no start and stop are given, return 0
     */
    getSegLength: function(field_name) {
        positions = this.getSegStartStop(field_name)
        if (positions !== null) {
            return positions.stop - positions.start + 1
        } else {
            return 'undefined';
        }
    },

    /**
     * Return the length between two features
     * (difference between the start of the first feature and the end of the second).
     * Feature1 must be placed before feature2
     * If no start and stop are given, return 0
     */
    getSegLengthDoubleFeature: function(field_name1, field_name2) {
	positions1 = this.getSegStartStop(field_name1)
	positions2 = this.getSegStartStop(field_name2)

	if (positions1 !== null && positions2 !== null) {
	    return positions2.stop - positions1.start + 1
	} else {
	    return 'undefined';
        }
    },

    /**
     * Get the start and stop position of a given field (e.g. cdr3)
     * Getted positions are 0 based.
     * If it does not exist return null
     */
    getSegStartStop: function(field_name) {
        if (this.hasSequence() && this.hasSeg(field_name) &&
            typeof this.seg[field_name].start !== 'undefined' &&
            typeof this.seg[field_name].stop !== 'undefined') {
            return {'start': this.seg[field_name].start,
                    'stop': this.seg[field_name].stop}
        }
        return null;
    },

    /**
     * Return a SegFeature given a field name
     * Can all these magic things be removed and replaced by a simple this.seg[field_name] ?
     */
    getSegFeature: function(field_name) {

        var p ;

        // Find the good object p
        if (typeof this[field_name] != 'undefined'){
            p = this[field_name];                    // check clone meta-data
        } else if (this.hasSeg() && typeof this.seg[field_name] != 'undefined'){
            p = this.seg[field_name];                // check clone seg data
        } else if (typeof this.m[field_name] != 'undefined'){
            p = this.m[field_name];                  // check model
        } else if (typeof this.seg.imgt2display != 'undefined' && typeof this.seg.imgt2display[field_name] != 'undefined') {
            p = this.seg.imgt2display[field_name];
        } else {
            return { }
        }

        // Process p
        if (p.constructor === Array ) {
            p = p[this.m.t];
        }

        if (p.constructor === String) {
            // string-based fields ('id', ...).
            // Should not exist anymore in the json, but populated by findPotentialField()
            p = { 'seq': p }
        }

        if ((typeof p.seq != 'undefined') && (typeof p.start == 'undefined')) {
            // sequence, we compute the start position
            this.addSegFeatureFromSeq(field_name, p.seq)
            p = this.seg[field_name]
        }

        return p
    },

    /** 
     * return clone's most important name <br>
     * cluster name > custom_name > segmentation name > window
     * @return {string} name
     * */
    getName: function () {
        if (this.hasSizeDistrib()){
            // TODO: move this function into an update function and store result into an attribute of this clone
            var t = this.m.t
            //if (this.current_clones == undefined) return "bob"
            var n = this.current_clones[t]
            var name = this.getDistributionsValues().toString() + " (" + n + " clone" + (n>1 ? "s" : "") + ")"
            return name
        }
        if (this.getCluster().name){
            return this.getCluster().name;
        }else if (this.c_name) {
            return this.c_name;
        } else if (this.name) {
            return this.name;
        } else {
            return this.getSequenceName();
        }
    }, 
    
    /**
     * return custom name <br>
     * or segmentation name
     * @return {string} name
     * */
    getSequenceName: function () {
        if (typeof (this.c_name) != 'undefined') {
            return this.c_name;
        } else if (this.hasSizeDistrib()){
            return ""
        } else {
            return this.getCode();
        }
    }, //end getName

    /**
     * return segmentation name "geneV -x/y/-z geneJ", <br>
     * return a short segmentation name if default segmentation name is too long
     * @return {string} segmentation name
     * */
    getCode: function () {
        if (typeof (this.sequence) !== 'undefined' && typeof (this.name) !== 'undefined' && this.name !== "") {
            if (this.length > 100 && typeof (this.shortName) != 'undefined') {
                return this.shortName;
            } else {
                return this.name;
            }
        } else {
            return this.id;
        }
    }, //end getCode

    /**
     * return custom name and segmentation name "<c_name> ( <seg name> )" <br>
     * return segmentation name only if there is no custom name
     * @return {string} custom name and segmentation name
     * */
    getNameAndCode: function () {
        if (this.c_name) {
            return this.c_name + " (" + this.getCode() + ")";
        } else {
            return this.getCode();
        }
    }, //end getNameAndCode

    /**
     * change/add custom name
     * @param {string} name
     * */
    changeName: function (newName) {
        console.log("changeName() (clone " + this.index + " <<" + newName + ")");
        this.c_name = newName;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true
    }, //fin changeName,

    
    /**
     * @return {integer} cluster number
     */
    getCluster: function () {
        return this.m.clusters[this.index]
    },

    /**
    * @return {string} locus (at least the locus of the 5' gene)cluster number
    */
    getLocus: function () {

        var locus = this.get('germline')

        if (typeof this.m.germline[locus] === "undefined") {
            var loci = [this.getGene("5").substring(0,3), this.getGene("3").substring(0,3) ]
            locus = loci[0]
            if (loci[0] != loci[1]) {
                console.log("Clone " + this.getName() + "recombines sequences from two separate loci. Using: " + locus)
            }
        }

        return locus
    },


    /**
     * compute the clone size ( ratio of all clones clustered ) at a given time
     * @param {integer} time - tracking point (default value : current tracking point)
     * @param {boolean} ignore_expected_normalisation - Return size with no normalisation for scatterplot usage
     * @return {float} size
     * */
    getSize: function (time, ignore_expected_normalisation) {
        if (ignore_expected_normalisation == undefined) { ignore_expected_normalisation=false}

        if (!this.quantifiable)
            return this.NOT_QUANTIFIABLE_SIZE

        time = this.m.getTime(time);
        
        if (this.m.reads.segmented[time] === 0 ) return 0;
        var result     = this.getReads(time) / this.m.reads.segmented[time];
        if ( (ignore_expected_normalisation == true && this.m.normalization_mode == this.m.NORM_EXPECTED) || this.hasSizeDistrib()){
            // special getSize for scatterplot (ignore constant/expected normalization)
            return result
        }
        return this.m.normalize(result, time) 
    }, //end getSize
    
    /**
     * compute the clone size (ratio of all clones clustered) at a given time <br>
     * return 'undefined' in case of empty clone <br>
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSizeZero: function (time) {
        time = this.m.getTime(time);
        
        result = this.getSize(time);
        if (result === 0) return undefined;
        return result;
    }, 

    /**
     * compute the number of (displayed) samples in which this clone has a non-zero size
     * @return {integer} number
     * */
    getNumberNonZeroSamples: function () {

        var nb = 0;

        for (var i in this.m.samples.order)
            if (this.getReads(this.m.samples.order[i]) > 0)
                nb += 1

        return nb;

    },
    
    /**
     * return the biggest size a clone can reach in the current samples
     * */
    getMaxSize: function () {
        var max=0;
        for (var i in this.m.samples.order){
            var tmp=this.getSize(this.m.samples.order[i]);
            if (tmp>max) max=tmp;
        }
        return max;
    },
    

    /**
     * @return {string} the global size ratio of the clone at the given time
     */
    getStrSize: function(time) {
        return this.m.getStrAnySize(time, this.getSize(time));
    },
    
    /**
     * return the clone's system size ratio
     * use notation defined in model
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSystemSize: function (time) {
        time = this.m.getTime(time)
        
        var system_reads = this.m.reads.segmented[time]
        if (this.germline in this.m.reads.germline) system_reads = this.m.reads.germline[this.germline][time]
        
        if (system_reads === 0 ) return 0
        var result     = this.getReads(time) / system_reads
        return this.m.normalize(result, time)
    },

    /**
     * Return the size ratios of the current clone at a given time.
     * Return the size globally, for the clone's system and for the clone's
     * system group.
     */
    getAllSystemSize: function(time) {
        return {global: this.getSize(time),
                system: this.getSystemSize(time),
                systemGroup: this.getSystemGroupSize(time)};
    },

    /**
     * return the clone's ratio sizes with a fixed number of character
     * use notation defined in model
     * @param {integer} time - tracking point (default value : current tracking point)
     * @param {boolean} extra_info - true iff we add information in the system strings
     * to the system they refer to.
     * @return {object} with three fields: global, system and systemGroup whose
     * values are sizes as formatted strings.
     * For systemGroup the value may be undefined if there is no system group.
     * */
    getStrAllSystemSize: function (time, extra_info) {
        if (this.hasSizeDistrib()){
            return {global: undefined, system: undefined, systemGroup: undefined}
        }

        extra_info = extra_info || false

        sizes = this.getAllSystemSize(time)

        if (sizes.systemGroup === 0 ||
            this.m.systemGroup(this.germline) == this.germline)
            systemGroupStr = undefined
        else
            systemGroupStr = this.m.getStrAnySize(time, sizes.systemGroup) +
            (extra_info ? ' of ' + this.m.systemGroup(this.germline) : '')

        systemStr = this.m.getStrAnySize(time, sizes.system)
        if (systemStr != "+")
            systemStr = this.m.getStrAnySize(time, sizes.system) +
            (extra_info ? ' of ' + this.germline : '')
        else
            systemStr = undefined

        return {global: this.m.getStrAnySize(time, sizes.global),
                system: systemStr,
                systemGroup: systemGroupStr}
    },

    /**
       Ratio relative to the system group (if it exists) */
    getSystemGroupSize: function (time) {
        var group_reads = this.m.systemGroupSize(this.germline, this.m.getTime(time))

        if (group_reads === 0 ) return 0 ;
        var result = this.getReads(time) / group_reads
        return this.m.normalize(result, time)
    },

    /* return a printable information: length, number of reads, and ratios
       The ratios may be '26.32%', or, when there are several (pseudo-)locus,
       '26.32%, 33.66% of IGH' or even '0.273%, 4.043% of IGK+/IGK, 4.060% of IGK+'

       --> "286 nt, 1418 reads (0.273%, 4.043% of IGK+/IGK, 4.060% of IGK+)"
    */

    getPrintableSize: function (time) {
        time = this.m.getTime(time)

        var reads = this.getRawReads(time)
        s = this.getSequenceLength() + ' nt'

        if (!this.quantifiable)
            return s

        s += ', '
        s += this.m.toStringThousands(reads) + ' read' + (reads > 1 ? 's' : '') + ' '

        reads = this.getReads(time)

        if (this.normalized_reads && this.m.normalization_mode == this.m.NORM_EXTERNAL)
            s += "[" + this.m.toStringThousands(Math.floor(reads * 100) / 100) + " normalized] "

        if (reads < this.m.NB_READS_THRESHOLD_QUANTIFIABLE)
            return s

        sizes = this.getStrAllSystemSize(time, true)

        s += '('
        s += sizes.global

        if (this.m.system_available.length>1) {
            if (sizes.systemGroup !== undefined) // if the system group has more than one germline
            {
                s += ', '
                s += sizes.systemGroup
            }
            if (sizes.system !== undefined) {
                s += ', '
                s += sizes.system
            }
        }

        s += ')'
        return s
    },

    getFasta: function() {
        fasta = ''
        fasta += '>' + this.getCode() + '    ' + this.getPrintableSize() + '\n'
        fasta += this.getPrintableSegSequence() + '\n'

        return fasta
    },

    /**
     * compute the clone size (**only the main sequence, without merging**) at a given time
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */

    getSequenceSize: function (time) {
        time = this.m.getTime(time)
        
        if (this.m.reads.segmented[time] === 0 ) return 0
        var result = this.get('reads',time) / this.m.reads.segmented[time]
        return this.m.normalize(result, time)
    }, //end getSequenceSize

    getStrSequenceSize: function (time) {
        time = this.m.getTime(time)
        var size = this.getSequenceSize(time)
        var sizeQ = this.m.getSizeThresholdQ(time);
        return this.m.formatSize(size, true, sizeQ)
    },
    

    /**
     * Define a list of compatible real clones that share the same values for available axis
     * The list is sample dependant and differ for each sample
     * This list is called at the creation of the clone
     */
    defineCompatibleClones: function(){
        var nb_sample = this.m.samples.number
        this.lst_compatible_clones = new Array(nb_sample)

        if (this.hasSizeDistrib()){
            var axes       = this.axes
            var dvalues    = this.getDistributionsValues(axes, 0, round=true)
            for (var timepoint = 0; timepoint < nb_sample; timepoint++) {
                if (this.m.distribs_compatible_clones[axes][timepoint][dvalues] != undefined){
                    this.lst_compatible_clones[timepoint] = this.m.distribs_compatible_clones[axes][timepoint][dvalues]
                } else {
                    this.lst_compatible_clones[timepoint] = []
                }
            }
        }
    },


    /**
     * Compute the current size of a distrib clone. Substract active clone that share same distribution values
     * This allow to get the current number of reads or clones that are represented by a distribution clone
     * Use the list of compatible clones, define for each sample/timepoint to look at if they are filtered or not at the moment
     * Will be call at each change top, filter or search action
     * @return {[type]} [description]
     */
    updateReadsDistribClones: function(){
        if (this.hasSizeDistrib()){
            var nb_sample = this.m.samples.number

            this.current_reads  = JSON.parse(JSON.stringify(this.reads))
            this.current_clones = JSON.parse(JSON.stringify(this.clone_number))
            var axes       = this.axes
            var dvalues    = this.getDistributionsValues(axes, 0)
            for (var timepoint = 0; timepoint < nb_sample; timepoint++) {
                for (var pos = 0; pos < this.lst_compatible_clones[timepoint].length; pos++) {
                    var c_index = this.lst_compatible_clones[timepoint][pos]
                    var clone   = this.m.clones[c_index]
                    var cluster = this.m.clusters[c_index]
                    if (clone.hasSizeConstant()) {
                        if (cluster.length){
                            if (clone.active || clone.isFiltered) { // cluster ?
                                this.current_reads[timepoint]  -= clone.reads[timepoint]
                                this.current_clones[timepoint] -= 1
                            }
                        } else if (cluster.length == 0) {
                            // Look for cluster that include this clone
                            var cluster_clone    = this.m.clone(clone.mergedId)
                            if (cluster_clone.active || cluster_clone.isFiltered) { // cluster ?
                                this.current_reads[timepoint]  -= clone.reads[timepoint]
                                this.current_clones[timepoint] -= 1
                            }
                            // Attention , un clone cluster + split sera vu comme actif...
                        }
                    }
                }
            }
        }
    },


    /* compute the clone reads number ( sum of all reads of clones clustered )
     * @time : tracking point (default value : current tracking point)
     * @raw: do not normalize
     * */
    getReads: function (time, raw) {
        time = this.m.getTime(time)
        var result = 0;

        var cluster = this.getCluster()
        for (var j = 0; j < cluster.length; j++) {
            result += this.m.normalize_reads(this.m.clone(cluster[j]), time, raw);
        }

        return result
    },


    getRawReads: function (time) {
      return this.getReads(time, true)
    },

    /* return a list of read numbers (sum of all reads of clustered clones) for all samples
     * */

    getReadsAllSamples: function (f) {
        if (typeof(f) == 'undefined')
            f = function (x) { return x }

        var time_length = this.m.samples.order.length
        var reads = []
        for (var t = 0; t < time_length; t++) reads.push(f(this.getReads(t))) ;
        return reads;
    },

    /**
     * @param: A variable number of arguments which consists of property names that should be found in seg.
     * @return true iff all of the property are found in seg.
     */ 
    hasSeg: function(/* some arguments */) {
        for (i = 0; i < arguments.length; i++)
            if (typeof(this.seg[arguments[i]]) == 'undefined')
                return false
        return true
    },

    getEValue: function () {
        if (this.eValue) return this.eValue

        var e = this.seg.evalue;
        if (typeof(e) != 'undefined')
            this.eValue = parseFloat(e.val)
        else
            this.eValue = undefined

        return this.eValue
    },

    getGene: function (type, withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (this.hasSeg(type) && typeof this.seg[type].name !== 'undefined') {
            if (withAllele) {
                return this.seg[type].name;
            }else{
                return this.seg[type].name.split('*')[0];
            }
        }
        switch (type) {
            case "5" :
                return "undefined V";
            case "4" :
                return "undefined D";
            case "3" :
                return "undefined J";
        }
        return undefined;
    },
    
    getNlength: function () {
        if (this.hasSeg('3', '5')){
            return this.seg['3'].start-this.seg['5'].stop-1
        }else{
            return '?'
        }
    },
    
    getSequence : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence !== 0){
            return this.sequence.toUpperCase()
        }else{
            return "0";
        }
    },

    getRevCompSequence : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence !== 0){
            var dict_comp  = {
          'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
          'Y': 'R', 'R': 'Y', // pyrimidine (CT) / purine (AG)
          'W': 'S', 'S': 'W', // weak (AT) / strong (GC)
          'K': 'M', 'M': 'K', // keto (TG) / amino (AC)
          'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D',
          'N': 'N'
          }
            var revcompSeq = ""
            for (var i = this.sequence.length -1 ; i > -1; i--) { // test -1
                revcompSeq += dict_comp[this.sequence[i].toUpperCase()]
            }
            return revcompSeq
        }else{
            return "0";
        }
    },
    
    getPrintableSegSequence: function () {
        if (! this.hasSeg('3', '5')) {
            return this.getSequence()
        }

        var s = ''
        if (this.seg['5'].start != undefined && this.seg['5'].start != 0){
            s += this.sequence.substring(0,  this.seg['5'].start) + '\n'
            s += this.sequence.substring(this.seg['5'].start,  this.seg['5'].stop+1) + '\n'
        } else {
            s += this.sequence.substring(0,  this.seg['5'].stop+1) + '\n'
        }

        if (this.seg['5'].stop+1 < this.seg['3'].start ) {
            s += this.sequence.substring(this.seg['5'].stop+1, this.seg['3'].start)
            s += '\n'
        }
        if (this.seg['3'].stop != undefined && this.seg['3'].stop != this.sequence.length){
            s += this.sequence.substring(this.seg['3'].start, this.seg['3'].stop+1) +'\n'
            s += this.sequence.substring(this.seg['3'].stop+1)
        } else {
            s += this.sequence.substring(this.seg['3'].start)
        }
        return s
    },

    /*
     * Compute coverage as the average value of non-zero coverages
     */
    getCoverage: function () {
        if (this.coverage) return this.coverage

        if (typeof (this._coverage) == 'undefined') {
            this.coverage = undefined
            return
        }

        var sum = 0.0
        var nb = 0

        for (var i=0; i<this._coverage.length; i++) {
            if (this._coverage[i] > 0) {
                sum += parseFloat(this._coverage[i])
                nb += 1
            }
        }
        this.coverage = sum/nb

        return this.coverage
    },

    getGCContent: function() {
        if (this.GCContent) return this.GCContent

        if (this.getSequenceLength() === 0) {
            this.GCContent = undefined
            return
        }

        var gc = 0
        for (var i in this.sequence) {
            if ("GgCc".indexOf(this.sequence[i]) > -1)
                gc++ }

        this.GCContent = gc / this.sequence.length

        return this.GCContent
    },    

    getSequenceLength : function () {
        if (typeof (this.sequence) != 'undefined' &&
            this.hasSequence() &&
            typeof (this.sequence.length) != 'undefined'){
            return this.sequence.length
        }else{
            return 0;
        }
    },    
    
    
    /**
     * Give th length of the deletion if clone have segment and corresponding deletion
     */
    getDeletion: function(field_name, deletion_name)
    {
        if (this.hasSeg(field_name) ) {
            if ( typeof (this.seg[field_name][deletion_name]) !== 'undefined' )
            {
                return this.seg[field_name][deletion_name]
            } else {
                // has segment, but no deletion field
                return undefined
            }
        } else {
            // haven't the segment
            return undefined
        }
    },


    /* give a new custom tag to a clone
     *
     * */
    changeTag: function (newTag) {
        newTag = "" + newTag
        newTag = newTag.replace("tag", "");
        console.log("changeTag() (clone " + this.index + " <<" + newTag + ")");
        this.tag = newTag;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true;
    },
    
    getColor: function () {
        if (typeof this.color != "undefined") {
            return this.color;
        } else {
            return "";
        }
    }, 
    
    getTag: function () {
        if (this.hasSizeDistrib()) {
            return this.m.distrib_tag;
        } else if (this.tag) {
            return this.tag;
        } else {
            return this.m.default_tag;
        }
    }, 
    
    getTagName: function () {
        return this.m.tag[this.getTag()].name
    }, 
    
    getProductivityName: function () {
        if (typeof this.seg.junction == "undefined")
            return "no CDR3 detected"

        return (this.seg.junction.productive ? "productive" : "not productive")
    },

    getProductivityIMGT: function () {
        if (typeof this.seg.imgt !== 'undefined' &&
            this.seg.imgt !== null &&
            typeof this.seg.imgt['V-DOMAIN Functionality'] != 'undefined') {
            var pro = this.seg.imgt["V-DOMAIN Functionality"].toLowerCase().split(" ")[0]

            return pro === "unproductive" ? "not productive" : pro
        }
        return "unknown"
    },

    /**
     * @return the  phase for the sequence.
     * The phase is computed according to the CDR3. For the phase to be returned
     * we need to have isProductive() (otherwise we return "undefined").
     * The returned phase is an integer between 0 and 2. 0 meaning that
     * the first codon should start at the first nucleotide of the sequence.
     */
    getPhase: function() {
        if (this.isProductive()) {
            return this.seg.junction.start % 3;
        }
        return 'undefined';
    },

    getVIdentityIMGT: function () {
        if (typeof this.seg.imgt !== 'undefined' &&
            this.seg.imgt !== null) {

            if (typeof this.seg.imgt['V-REGION identity %'] != 'undefined')
                return this.seg.imgt["V-REGION identity %"];

            if (typeof this.seg.imgt['V-REGION identity % (with ins/del events)'] != 'undefined')
                return this.seg.imgt["V-REGION identity % (with ins/del events)"];
        }
        return "unknown"
    },

    /**
     * @return true iff the clone is productive, false otherwise.
     * Thus the function doesn't differentiate between a non-productive
     * clone and a clone for which we don't know. For more information
     * see getProductivityName() function.
     */
    isProductive: function() {
        return this.getProductivityName() == "productive";
    },
    
    /* compute clone color
     *
     * */
    updateColor: function () {

        var allele;
        if (!this.hasSizeConstant()){
            this.color = "rgba(150, 150, 150, 0.65)"
            return
        }

        switch (this.m.colorMethod){
            
            case "abundance":
                var size = this.getSize()
                if (this.getCluster().length===0)
                    size = this.getSequenceSize()
                if (size === 0)
                    this.color = ""
                else
                    this.color = colorGenerator(this.m.scale_color(size * this.m.precision))

                break;
        
            case "clone":
                this.color = colorGeneratorIndex(this.index)
                break;
        
            case "cdr3":
                this.color = this.getCDR3Color()
                break;
        
            case "Tag":
                this.color =  this.m.tag[this.getTag()].color
                if (this.color == "default") this.color = ""
                break;

            case "dbscan":
                this.color =  this.colorDBSCAN
                break;

            case "system":
                this.color = this.m.germlineList.getColor(this.germline)
                break;

            case "productive":
                this.color = ""
                if (this.hasSeg('junction') &&
                    typeof this.seg.junction.productive != 'undefined') 
                    this.color = colorProductivity(this.seg.junction.productive)
                break;

            case "N":
                this.color =  this.colorN
                break;

            case "V":
                this.color = ""
                if (this.getGene("5") != "undefined V"){
                    var alleleV = this.m.germlineV.allele[this.getGene("5")]
                    if (typeof alleleV != 'undefined' ) this.color = alleleV.color
                }
                break;

            case "D":
                this.color = ""
                if (this.getGene("4") != "undefined D"){
                    var alleleD = this.m.germlineD.allele[this.getGene("4")]
                    if (typeof alleleD != 'undefined' ) this.color = alleleD.color
                }
                break;

            case "J":
                this.color = ""
                if (this.getGene("3") != "undefined J"){
                    var alleleJ = this.m.germlineJ.allele[this.getGene("3")]
                    if (typeof alleleJ != 'undefined' ) this.color = alleleJ.color
                }
                break;
        
            default:
                this.color = ""
        }

        this.true_color = this.color

        if (this.m.focus == this.index)
            this.color = ""
    },
    
    /**
     * Create a list of possibles locus to manually assign to a clone
     * @return {string} content - an HTML  code of form
     */    
    createLocusList: function () {
        var content = "<form name='germ'><select class='menu-selector' NAME='LocusForm' id='germSelector', onChange='m.clones["+ this.index +"].changeLocus(this.form.LocusForm.value);'  style='width: 80px' >";
        content += "<option value="+ this.germline + ">" + this.germline + "</option>";
        
        for (var germline in germline_data.systems) {
            if (germline.indexOf("_") ==-1 ){
                content += "<option value=" + germline +">" + germline + "</option>";
            }
        }
        content += "</select></form>";
        return content;
    },
    
    /**
     * Apply a locus changment made by user to a clone
     * Change *Changed params to true and update the view with new param 
     * @param {string} formValue - the value of selection made by user
     */
    changeLocus: function(formValue) {
        if (typeof this.germline == 'undefined') {
            this.germline = "custom";
        }
        var oldGermline = this.germline;
        var newGermline = formValue;
        console.log("Changement of locus : "+oldGermline +" to "+ newGermline)
        this.germline = newGermline;

        // change reads segmented/germline values in model
        try {
            for (var i =0; i< this.m.reads.segmented.length; i++) {
                if(oldGermline != "custom") {this.m.reads.germline[oldGermline][i] -= this.reads[i]}
                if(newGermline != "custom") {this.m.reads.germline[newGermline][i] += this.reads[i]}
                if (newGermline == "custom" && newGermline != oldGermline) {
                    this.m.reads.segmented_all[i] -= this.reads[i]
                } else if (oldGermline == "custom" && newGermline != "custom"){
                    this.m.reads.segmented_all[i] += this.reads[i]
                }
            }
        }
        catch (e) {
            console.log("Erreur : unable to get 'this.m.reads.segmented'"); 
        }

        var segments  = ["Vsegment", "Dsegment", "Jsegment"];

        for (var j = 0; j < segments.length; j++) {
            if (document.getElementById('list'+segments[j])) {
                var myDiv = document.getElementById('list'+segments[j]);
                var content = this.createSegmentList(segments[j], formValue);
                myDiv.innerHTML = content;
            }
        }
        this.m.analysisHasChanged = true;
        this.segEdited = true;

        // if newGerline wasn't in system_available
        if (jQuery.inArray( newGermline, this.m.system_available ) == -1) {
            this.m.system_available.push(newGermline);
        }
        this.m.toggle_all_systems(true);
        this.m.update();
    },

    /**
     * Create a list of possibles segments to manually assign to a clone
     * @return {string} content - an HTML  code of form
     * @param {string} locus - the locus of the clone
     * @param {string} segment - the segment concerned( "Vsegment", "Dsegment" or "Jsegment")
     */
    createSegmentList: function (segment, locus) {
        var segments = {"Vsegment": ["5", "V"], "Dsegment": ["4", "D"], "Jsegment": ["3", "J"]};
        var nLocus = locus + segments[segment][1];
        var content = "<form name="+ segment  +"><select class='menu-selector' NAME="+segment+" onChange='m.clones["+ this.index +"].changeSegment(this.form." + segment + ".value, " + segments[segment][0] + ");'  style='width: 100px' >";
        content += "<option value="+ this.getGene(segments[segment][0]) + ">" + this.getGene(segments[segment][0]) + "</option>";        

        if( typeof(locus) == 'undefined' ){
            nLocus = this.germline + segments[segment][1];
        }
        for (var i in germline) {
            if (i.indexOf(nLocus) !=-1 ){
                for (var seg in germline[i]) {
                    content += "<option value=" + seg +">" + seg + "</option>";
                }
            }
        }
        content += "</select></form>";
        return content;
    },
    
    /**
     * Apply a segment changment made by user to a clone
     * Change *Changed params to true and update the view with new param 
     * @param {string} formValue - the value of selection made by user
     * @param {string} segment - the segment who will be change( "5", "4" or "3")
     */
    changeSegment: function (formValue, segment) {
        // TODO add chgmt of germline in data analysis

        delete this.seg[segment];
        delete this.seg[segment+"start"]
        delete this.seg[segment+"end"]

        this.seg[segment] = {}
        this.seg[segment].name  = formValue
        this.seg[segment].start = 0
        this.seg[segment].stop  = 0

        // TODO : insert real value for stats (start, end, evalue, ...)
        this.seg.evalue       = 0
        this.seg.evalue_left  = 0
        this.seg.evalue_right = 0
        this.m.analysisHasChanged = true;
        this.segEdited = true;
        this.m.update();

    },
    
    /**
     * Use the .segEdited value to insert an icon in the html information
     */
    getHTMLModifState: function () {
        var content = ""
        if (this.segEdited) {
            // TODO find a better icon
            content += " <img src='images/icon_fav_on.png' alt='This clone has been edited by a user'>"
            
        }
        return content;
    },
    /**
     * Use to switch the display value of manual changment lists between "none" or "inline"
     */
    toggle: function() {
        var listDiv = ["#listLocus", "#listVsegment", "#listDsegment", "#listJsegment"]
        for (var elt in listDiv) {
            $( listDiv[elt] ).toggle();
        }
    },
    
    /* return info about a sequence/clone in html 
     *
     * */
    getHtmlInfo: function () {
        var isCluster = this.getCluster().length
        var time_length = this.m.samples.order.length
        var html = ""

        // Functions to format html row
        var clean_title = function(title){ return title.replace(/[&\/\\#,+()$~%.'":*?<>{} ]/gi,'_').replace(/__/gi,'_')}
        var header = function(content, title) { 
            title = (title == undefined) ? clean_title(content) : clean_title(title)
            return "<tr id='modal_header_"+title+"'><td class='header' colspan='" + (time_length + 1) + "'>" + content + "</td></tr>" ; 
        }
        var row_1  = function(item, content, title) { 
            title = (title == undefined) ? clean_title(item) : clean_title(title)
            return "<tr id='modal_line_"+title+"'><td id='modal_line_title_"+title+"'>" + item + "</td><td colspan='" + time_length + "' id='modal_line_value_"+title+"'>" + content + "</td></tr>" ; 
        }
        var row_from_list  = function(item, content, title) { 
            title = (title == undefined) ?clean_title(item) : clean_title(title)
            var div = "<tr id='modal_line_"+title+"'><td id='modal_line_title_"+title+"'>"+ item + "</td>"
            for (var i = 0; i < content.length; i++) {
                col  = content[i]
                div += "<td id='modal_line_value_"+title+"_"+i+"'>" + col + "</td>"
            }
            div += "</tr>" ;
            return div;
        }

        if (isCluster) {
            html = "<h2>Cluster info : " + this.getName() + "</h2>"
        } else {
            html = "<h2>Sequence info : " + this.getSequenceName() + "</h2>"
        }

        html += "<p>select <a class='button' onclick='m.selectCorrelated(" + this.index + ", 0.90); m.closeInfoBox();'>correlated</a> clones</p>"
        html += "<p>select <a class='button' onclick='m.selectCorrelated(" + this.index + ", 0.99); m.closeInfoBox();'>strongly correlated</a> clones</p>"
        html += "<p>Download clone information as "
        html += "<a class='button' id='download_info_"+ this.index +"_airr' onclick='m.export_as_airr([" + this.index + "])'>AIRR</a>"
        html += "</p>"

        //column
        html += "<div id='info_window'><table id='clone_download_info_"+this.index+"'><tr><th>Files names</th>"

        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.m.getStrTime(this.m.samples.order[i], "name") + "</td>"
        }
        html += "</tr>"

        //warnings
        if (this.isWarned()) {
            html += header("warnings")
            var warnings = {}
            // Create a dict of all warning present, and add each sample with it
            // One warning msg by entrie, without duplication.
            for (i = 0; i < this.warn.length; i++) {
                if (this.warn[i] != 0 && this.warn[i] != undefined){
                    if (warnings[this.warn[i].msg] == undefined){
                        warnings[this.warn[i].msg] = {"code":this.warn[i].code, "msg": this.warn[i].msg, "samples":[i]}
                    } else {
                        warnings[this.warn[i].msg].samples.push(i)
                    }
                }
            }
            // put warning html content, with list of concerned sample, without duplication
            for (var warn in warnings) {
                var pluriel = warnings[warn].samples.length > 1 ? "s" : ""
                html += row_1(warnings[warn].code, warnings[warn].msg);
            }
        }

        //cluster info
        if (isCluster) {
            html += header("clone")
            html += row_1("clone name", this.getName())
            if (this.hasSizeConstant()){
                html += row_1("clone short name", this.getShortName())
                html += "<tr><td>clone size (n-reads (total reads))"
            } else if (this.hasSizeDistrib()) {
                html += "<tr><td title='Current size; depending of the number of clones curently not filtered'>current clone size<br/>(n-reads (total reads))"
            }
            if (this.normalized_reads && this.m.normalization_mode == this.m.NORM_EXTERNAL) {
                html += "<br />[normalized]"
            }
            html += "</td>"
            for (var j = 0; j < time_length; j++) {
                html += "<td>"
                html += this.getRawReads(this.m.samples.order[j]) + "  (" + this.m.reads.segmented[this.m.samples.order[j]] + ")"
                if (this.normalized_reads && this.m.normalization_mode == this.m.NORM_EXTERNAL) {
                  html += "<br />[" + this.getReads(this.m.samples.order[j]).toFixed(2) + "]"
                }
                if (typeof this.m.db_key.config != 'undefined' && this.hasSizeConstant()) {
                    html += "&emsp;"
                    var sample_set_id = this.m.samples.sequence_file_id[this.m.samples.order[j]];
                    call_reads = "db.get_read('" + this.id + "', "+ this.index +", " + sample_set_id + ')';
                    html += '<i onclick="' + call_reads + '; m.closeInfoBox()" class="icon-down" title="Download reads from this clone"></i>';
                }
                html += "</td>"
            }
            html += "</tr><tr><td>clone size (%)</td>"
            for (var k = 0; k < time_length; k++) {
                html += "<td>" + this.getStrSize(this.m.samples.order[k]) + "</td>"
            }

            // Specific part for MRD script
            if ('mrd' in this && this.getHtmlInfo_prevalent != undefined){
                values = this.getHtmlInfo_prevalent()
                for (var mrd_val = 0; mrd_val < values.length; mrd_val++) {
                    html += row_from_list(values[mrd_val][0], values[mrd_val][1], values[mrd_val][2])
                }
            }

            html += header("representative sequence")
        }else{
            html += header("sequence")
        }

        
        //sequence info (or cluster main sequence info)
        if (this.hasSequence()){
            html += row_1("sequence name", this.getSequenceName())
            html += row_1("code", this.getCode())
            html += row_1("length", this.getSequenceLength())
        }

        //coverage info
        if (typeof this.getCoverage() != 'undefined') {
            html += row_1("average coverage",
                          "<span " +
                          (this.coverage < this.COVERAGE_WARN ? "class='warning'" : "") +
                          ">" +
                          this.coverage.toFixed(3) + "</span>")
        }

        // e-value
        if (typeof this.getEValue() != 'undefined') {
            html += row_1("e-value",
                          "<span " +
                          (this.eValue > this.EVALUE_WARN ? "class='warning'" : "") +
                          ">" +
                          this.eValue + "</span>")
        }

        // abundance info
        if (this.hasSizeConstant()) {
            html += "<tr><td>size (n-reads (total reads))</td>"
        } else {
            html += "<tr><td>total clones size<br/>(n-reads (total reads))</td>"
        }
        for (var l = 0; l < time_length; l++) {
            html += "<td>" + this.get('reads',this.m.samples.order[l]) + 
                    "  (" + this.m.reads.segmented[this.m.samples.order[l]] + ")</td>"
        }
        html += "</tr>"
        if (this.hasSizeConstant()) {
            html += "<tr><td>size (%)</td>"
        } else {
            html += "<tr><td>total size (%)</td>"
        }
        for (var m = 0; m < time_length; m++) {
            html += "<td>" + this.getStrSequenceSize(this.m.samples.order[m]) + "</td>"
        }
        html += "</tr>"

        
        //segmentation info
        if (this.hasSizeConstant()) {
            html += header("segmentation" +
                " <button type='button' onclick='m.clones["+ this.index +"].toggle()'>edit</button>" + //Use to hide/display lists 
                this.getHTMLModifState(), "segmentation") // icon if manual changement
        } else {
            html += header("segmentation")
        }

        if (typeof this.stats != 'undefined'){
            var total_stat = [];
            for (var n=0; n<this.stats.length; n++) total_stat[n] = 0
            for (var o=0; o<this.stats.length; o++){
                for (var key in this.stats[o]) total_stat[o] +=  this.stats[o][key]
            }
            
            for (var idx in this.stats[0]){
                html += "<tr><td> "+this.m.segmented_mesg[idx]+"</td>"
                for (var p = 0; p < time_length; p++) {
                html += "<td>"+this.stats[p][idx] +
                    " (" + ((this.stats[p][idx]/total_stat[p]) * 100).toFixed(1) + " %)</td>"
                }
            }
        }
        
        if (this.hasSequence()){
            html += row_1("sequence", this.sequence)
        }
        if (this.id != undefined){
            html += row_1("id", this.id)
        }
        if (this.id != undefined){
            html += row_1("locus", this.m.systemBox(this.germline).outerHTML + this.germline +
                "<div class='div-menu-selector' id='listLocus' style='display: none'>" + this.createLocusList() + "</div>")
        }
        if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("5") != "undefined V")){
            html += row_1("V gene (or 5')", this.getGene("5") +
                "<div class='div-menu-selector' id='listVsegment' style='display: none'>" + this.createSegmentList("Vsegment") + "</div>")
        }
        if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("4") != "undefined D")){
            html += row_1("(D gene)", this.getGene("4") +
                "<div class='div-menu-selector' id='listDsegment' style='display: none'>" + this.createSegmentList("Dsegment") + "</div>")
        }
        if (this.hasSizeConstant() || (this.hasSizeDistrib() && this.getGene("3") != "undefined J")){
            html += row_1("J gene (or 3')", this.getGene("3") +
                "<div class='div-menu-selector' id='listJsegment' style='display: none'>" + this.createSegmentList("Jsegment") + "</div>")
        }

        // Other seg info
        var exclude_seg_info = ['affectSigns', 'affectValues', '5', '4', '3']
        for (var s in this.seg) {
            if (exclude_seg_info.indexOf(s) == -1 && this.seg[s] instanceof Object) {
		if ("info" in this.seg[s]) {
		    // Textual field
		    html += row_1(s, this.seg[s].info)
		} else if ("val" in this.seg[s]) {
		    // Numerical field
		    html += row_1(s, this.seg[s].val)
		} else {
		    // Sequence field
		    var nt_seq = this.getSegNtSequence(s);
		    if (nt_seq !== '') {
			html += row_1(s, this.getSegNtSequence(s))
		    }
		}
            }
        }
        if (typeof this.seg.junction != 'undefined' &&
            typeof this.seg.junction.aa != "undefined") {
            html += row_1("junction (AA seq)", this.getSegAASequence('junction'))
        }

        
        //other info (clntab)
        html += header("&nbsp")
        for (var t in this) {
            if (t[0] == "_") {
                html += "<tr><td>" + t + "</td>"
                if (this[t] instanceof Array) {
                    for (var q = 0; q < time_length; q++) {
                        html += "<td>" + this[t][this.m.samples.order[q]] + "</td>"
                    }
                } else {
                    html += "<td>" + this[t] + "</td>"
                }
                html += "</tr>"
            }
        }
        
        //IMGT info
        var other_infos = {"imgt": "<a target='_blank' href='http://www.imgt.org/IMGT_vquest/share/textes/'>IMGT/V-QUEST</a>",
                           "clonedb": "<a target='_blank' href='http://ecngs.vidjil.org/clonedb'>CloneDB</a> "+ (this.numberSampleSetInCloneDB() > 0 ? "<br /> A similar clone exists in "+this.numberSampleSetInCloneDB()+" other patients/runs/sets" : "")};
        for (var external_tool in other_infos) {
            if (typeof this.seg[external_tool] != 'undefined' &&
                this.seg[external_tool] !== null) {
                html += header("Results of "+other_infos[external_tool])
                for (var item in this.seg[external_tool]) {
                    if (! (this.seg[external_tool][item] instanceof Object) &&
                        ! (this.seg[external_tool][item] instanceof Array)) {
                        html += row_1(item, this.seg[external_tool][item])
                    }
                }
            }
        }

        html += "</table></div>"
        return html
    },
/*
    axisOptions: function() {
        return [
            "clone consensus length", "clone average read length", "GC content", "N length",
            "CDR3 length (nt)", "productivity", "productivity-IMGT",
            "VIdentity-IMGT", "clone consensus coverage",
            "tag", "coverage", "size", "number of samples", "primers"
        ];
    },
*/
    /**
      * start to fill a node with clone informations common between segmenter and list
      * @param {dom_object} div_elem - html element to complete
      * */
    div_elem: function (div_elem) {

        div_elem.removeAllChildren();
        
        var self = this;

        // Tag/Star
        var span_star = document.createElement('span')
        span_star.setAttribute('class', 'starBox');
        span_star.onclick = function (e) {
            self.m.openTagSelector([self.index], e);
        }
        span_star.id = self.index
        var tag_icon = document.createElement('i')
        tag_icon.id  = "tag_icon_"+self.index
        tag_icon.title = "clone_tag"
        if ((self.m.normalization_mode == self.m.NORM_EXPECTED)&&(self.index==self.m.normalization.id)){
            tag_icon.classList.add('icon-lock-1')
        }else{
            tag_icon.classList.add('icon-star-2')
        }
        span_star.appendChild(tag_icon)
        span_star.setAttribute('id', 'color' + this.index);
        if (typeof this.tag != 'undefined')
            span_star.style.color = this.m.tag[this.getTag()].color

        // Axis
        var span_axis = document.createElement('span');
        span_axis.className = "axisBox";

        // Info
        var span_info = document.createElement('span')
        span_info.className = "infoBox";
        span_info.id = "clone_infoBox_"+this.index;
        if (!this.hasSizeOther()) {
            span_info.onclick = function () {
                self.m.displayInfoBox(self.index);
            }

            if (this.isWarned()) {
                span_info.className += " " + this.isWarned() ;
                span_info.appendChild(icon('icon-warning-1', this.warnText()));
            } else {
                span_info.appendChild(icon('icon-info', 'clone information'));
            }
        }

        // Gather all elements
        div_elem.appendChild(span_axis);
        div_elem.appendChild(span_star);
        div_elem.appendChild(span_info);
    },

    toCSVheader: function (m) {
        var csv = [
            "cluster", "name", "id",
            "system", "tag",
            "v", "d", "j",
            "productivity",
            "junction", "junction(AA)",
            "sequence"
        ]

        for (var i=0; i<m.samples.order.length; i++) csv.push("reads_"+i)
        for (var j=0; j<m.samples.order.length; j++) csv.push("ratio_"+j)
        for (var k=0; k<m.samples.order.length; k++) csv.push("ratios_"+k)

        return csv
    },

    toCSV: function () {
        var csv = [
            this.getCluster().join("+"), this.getName(), this.id,
            this.get('germline'), this.getTagName(),
            this.getGene("5"), this.getGene("4"), this.getGene("3"),
            this.getProductivityName(),
            this.getSegNtSequence("junction"),
            this.getSegAASequence('junction'),
            this.getSequence()
        ]

        for (var i=0; i<this.m.samples.order.length; i++) csv.push(this.getReads(this.m.samples.order[i]))
        for (var j=0; j<this.m.samples.order.length; j++) csv.push(this.getSize(this.m.samples.order[j]))
        for (var k=0; k<this.m.samples.order.length; k++) csv.push(this.getPrintableSize(this.m.samples.order[k]).replace(/,/g, ';'))

        return csv
    },

    enable: function (top) {
        if (this.top > top || this.hasSizeOther()){
            return; 
        }

        if (this.m.tag[this.getTag()].display){
            this.active = true;
        }
        else {
            this.m.someClonesFiltered = true
        }
    },

    disable: function () {
        if (!this.hasSizeConstant() && !this.hasSizeDistrib()) return
        if (this.hasSizeDistrib() && this.m.tag[this.getTag()].display) return
        this.active = false;
    },

    unselect: function () {
        console.log("unselect() (clone " + this.index + ")")
        if (this.select) {
            this.select = false;
            this.m.removeFromOrderedSelectedClones(this.index);
        }
        this.m.updateElemStyle([this.index]);
    },

    isSelected: function () {
        return this.select
    },

    /**
     * @return true iff the clone is not filtered
     */
    isActive: function () {
        return this.active
    },

    isQuantifiable: function() {
        return this.quantifiable;
    },

    isFocus: function () {
        return this.index == this.m.focus
    },
    
    get: function (field_name, time) {
        var field;
        if (typeof this[field_name] != 'undefined'){
            field = this[field_name]
        }else if (typeof this.seg[field_name] != 'undefined'){
            field = this.seg[field_name]
        }
        
        if (typeof field != 'object'){
            return field;
        }else{
            time = this.m.getTime(time)
            return field[time]
        }
    },

    /**
     * Deterministically return a color associated with the CDR3 (if any)
     */
    getCDR3Color: function() {
        var junction = this.getSegAASequence('junction');
        if (junction.length == 0)
            return '';
        // Convert CDR3 to int
        var intcdr3 = 0;
        junction = junction.toUpperCase();
        for (var i = 0; i < junction.length; i++) {
            intcdr3 += (junction.charCodeAt(i)-65) * (Math.pow(26, i));
        }
        return colorGeneratorIndex(intcdr3);
    },

    /**
    * Get the number of occurrences of the clone in cloneDB
    * @return {int} res - the number of occurrences, undefined if cloneDB wasn't called
    */
    numberInCloneDB: function () {
      var res = 0;
      var clonedb = this.seg.clonedb;
      if (typeof clonedb == 'undefined'){
        return undefined;
      }else{
        for (var c in clonedb.clones_names){
          res += clonedb.clones_names[c][0];
        }
        return res;
      }
    },

    /**
    * Get the number of sample sets with some occurrences of the clone in cloneDB
    * @return {int} res - the number of occurrences, undefined if cloneDB wasn't called
     */
    numberSampleSetInCloneDB: function() {
      var res = 0;
      var clonedb = this.seg.clonedb;
      if (typeof clonedb == 'undefined'){
        return undefined;
      }else{
        for (var c in clonedb.clones_names){
            res += 1;
        }
        return res;
      }        
    },

    /**
    * Update the clone tag icon
    */
    updateCloneTagIcon: function () {
        // get the icon tag element
        icon_tag = document.getElementById("tag_icon_"+this.index)
        if (icon_tag != null){
            icon_tag.classList.remove("icon-star-2")
            icon_tag.classList.remove("icon-lock-1")
            icon_tag.classList.remove("icon-star-empty-1")

            // change class in function of model.normalization method
            if (this.m.normalization_mode == this.m.NORM_EXPECTED){
                var expected_clone_index = this.m.normalization.id
                if (expected_clone_index == this.index){
                    icon_tag.classList.add("icon-lock-1")
                } else {
                    icon_tag.classList.add("icon-star-2")
                }
            } else if (this.m.normalization_mode == this.m.NORM_EXTERNAL){
                if (this.normalized_reads != undefined){
                    icon_tag.classList.add("icon-star-empty-1")
                } else {
                    icon_tag.classList.add("icon-star-2")
                }
            } else {
                icon_tag.classList.add("icon-star-2")
            }
        }
         return
    },


    /**
     * This function return the value of the clone for the list of axis asked. 
     * @param  {Array} axes Array of axis name to get
     * @return {array}      Array of value for given axis array
     */
    getDistributionsValues: function(axes, timepoint, round){
        if (axes == undefined && this.axes != undefined){
            axes = this.axes
        }
        if (timepoint == undefined){
            timepoint = 0
        }
        if (round == undefined){
            round = true
        }
        var values = []

        for (var a = 0; a < axes.length; a++) {
            var axe  = axes[a]
            var naxe = this.m.distrib_convertion[axe]
            if (axe == undefined || naxe == undefined){
                console.default.error("Getter: not axis " + axe + "; ("+naxe+")")
            }
            if (this.m.available_axes.indexOf(naxe) != -1 ) {
                var axis_p = AXIS_DEFAULT[naxe]
                var value = axis_p.fct(this, timepoint)
                values.push( value )
            } else {
                console.default.error("Getter: not axis " + axe + "; ("+naxe+")")
                if (axe == "lenSeq")        { values.push( this.getSequence().length ) }
                else { values.push( "axis_unknow__"+axe )}
            }
        }
        return values
    },


    isClusterizable: function() {
        var comp = (C_CLUSTERIZABLE == (this.attributes & C_CLUSTERIZABLE))
        return comp
    },

    isInteractable: function() {
        var comp = (C_INTERACTABLE == (this.attributes & C_INTERACTABLE))
        return comp
    },
 
    hasUnsetcolor : function() {
        var comp = (C_UNSETCOLOR == (this.attributes & C_UNSETCOLOR))
        return comp
    },
  
    isInScatterplot: function() {
        var comp = (C_IN_SCATTERPLOT == (this.attributes & C_IN_SCATTERPLOT))
        return comp
    },
   
    hasSizeDistrib: function(){
        var comp = (C_SIZE_DISTRIB == (this.attributes & C_SIZE_DISTRIB))
        return comp  
    },
    hasSizeConstant: function(){
        var comp = (C_SIZE_CONSTANT == (this.attributes & C_SIZE_CONSTANT))
        return comp  
    },
    hasSizeOther: function(){
        var comp = (C_SIZE_OTHER == (this.attributes & C_SIZE_OTHER))
        return comp  
    },


    hasSequence: function(){
        if (this.sequence == 0 || this.sequence == undefined){
            return false
        } else if (typeof this.sequence !== 'string' ) {
            console.default.error("sequence != 0/undefined, et pourtant pas string")
            return false
        } else {
            return true
        }
    },
    

    /**
     * Increase a default data for distrib clone creation with the correct values at the correct location
     * @param  {Array}   axes    List of axes name to set
     * @param  {Array}   content The values to include into data
     */
    augmentedDistribCloneData: function(axes, content){
        for (var i = 0; i < axes.length; i++) {
            var axe = axes[i]
            var value = content[i]
            this.increaseData(axe, value)
        }
    },
     
    /**
     * Add to a distrib clone the value at the correct place
     * @param  {String}  axe   Axe to set
     * @param  {various} value Value to set
     */
    increaseData: function( axe, value){

        // List of axe that must be in an array format
        var distrib_axe_is_timmed = {
            "lenSeqConsensus": true,
            "lenSeqAverage":   true,
            "coverage":        true,
        }
        // List of axe that must be returned as number
        var distrib_axe_as_number = {
            "GCContent": true

        }

        // Convert as number if needed
        if (distrib_axe_as_number[axe]){ value = Number(value)}
        // Convert as a list if needed
        if (distrib_axe_is_timmed[axe]) {
            var timepoint  = this.m.samples.order.indexOf(this.t)
            var tmpValue   = Array(this.m.samples.number)
            tmpValue.fill(value)
            value          = tmpValue
        }
/*
        var naxe = this.m.distrib_convertion[axe]
        var available_axes = this.m.available_axes
        if (available_axes[naxe] != undefined) {
            if (available_axes[naxe].set != undefined) {
                available_axes[naxe].set(this, value)
            } else {
                console.default.warn( "Axe present and NOT settable: " + axe + ";" + naxe)
            }
        } else {
            console.default.error( "Axe not present in obj: " + axe + ";" + naxe)
*/
            // Each content should be hardcoded. Not optimal
            if (axe == "GCContent")             { this.GCContent            = value}
            else if (axe == "lenSeqAverage")    { this._average_read_length = value}
            else if (axe == "lenSeqConsensus")  { this.consensusLength      = value}
            else if (axe == "seg5")             { this.seg[5] =       { name: value}}
            else if (axe == "seg4")             { this.seg[4] =       { name: value}}
            else if (axe == "seg3")             { this.seg[3] =       { name: value}}
            else if (axe == "lenCDR3")          { this.seg.cdr3 =     { start: 0, 
                                                                        stop: value}} 
    },

    sameAxesAsScatter: function(scatterplot){
        var axes = [scatterplot.splitX, scatterplot.splitY]
        var mode = scatterplot.mode
        var x = this.axes

        // convert name of axes
        for (var i = 0; i < axes.length; i++) {
            var axe  = axes[i]
            var naxe = this.m.distrib_convertion[axe]
            if (naxe != undefined){
                axes[i] = naxe
            }
        }


        if (mode == "bar"){
            return (x.indexOf(axes[0]) != -1)
        } else {
            // if scatterplot is in "one_system" mode
            if (this.m.system != "multi" || typeof this.m.system != 'undefined'){
                var locus = this.getLocus()
                var same_locus = (this.m.getCurrentSystem() == locus)
                return (x.equals(axes) && same_locus)
            } else {
                return x.equals(axes)
            }
        }
    },


    getUnproductivityCause: function(){
        if (this.seg.junction != undefined && !this.isProductive()){
            if (this.seg.junction.unproductive != undefined) { 
                return this.seg.junction.unproductive
            } else {
                return undefined
            }
        }
        return ""
    },

    isInFrame: function(){
        if (this.isProductive()){
            return true
        } else {
            var unproductivity_cause = this.getUnproductivityCause()
            if (unproductivity_cause != undefined && unproductivity_cause == "out-of-frame"){
                return false
            }
        }
        return undefined
    },

    hasStopCodon: function(){
        if (this.isProductive()){
            return false
        } else {
            var unproductivity_cause = this.getUnproductivityCause()
            if (unproductivity_cause != undefined) {
                if (unproductivity_cause == "stop-codon"){
                    return true
                } else {
                    return false
                }
            }
        }
        return undefined
    },

    get_airr_values: function(time){
        values = {
            "sample": time,
            "duplicate_count":    this.getRawReads(this.m.samples.order[time]),
            "locus": this.germline,
            "v_call":     this.getGene("5"),
            "d_call":     this.getGene("4"),
            "j_call":     this.getGene("3"),
            "sequence_id":       this.id,
            "sequence": this.sequence,
            "productive":   this.isProductive(), //["seg","junction","productive"],
            "vj_in_frame":  this.isInFrame() == true ? "T" : (this.isInFrame() == false ? "F": ""), //["seg","junction","unproductive"], // les deux ne sont pas compatible
            "stop_codon":  this.hasStopCodon() == true ? "T" : (this.hasStopCodon() == false ? "F": ""), //["seg","junction","unproductive"], // les deux ne sont pas compatible
            "junction_aa":  "todo", //["seg","junction","aa"],
            "cdr3_aa":      "todo", //["seg","cdr3","aa"],
            "warnings":     "todo" //["warn"],
        }

        // Other seg info
        var exclude_seg_info = ['affectSigns', 'affectValues', '5', '4', '3']
        for (var s in this.seg) {
            if (exclude_seg_info.indexOf(s) == -1 && this.seg[s] instanceof Object) {
                if ("info" in this.seg[s]) {
                    // Textual field
                    values["_"+s] = this.seg[s].info
                } else if ("val" in this.seg[s]) {
                    // Numerical field
                    values["_"+s] = this.seg[s].val
                } else {
                    // Sequence field
                    var nt_seq = this.getSegNtSequence(s);
                    if (nt_seq !== '') {
                        values["_"+s] = this.getSegNtSequence(s)
                    }
                }
            }
        }        

        return values

    }


};



