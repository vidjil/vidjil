var SYMBOL_VOID = "–";
var SYMBOL_MATCH = "·";

var SILENT="silent";
var SUBST="substitution";
var INS="insertion";
var DEL="deletion";
var END_CODON = "end-codon ";
var END_CODON_NOT_FIRST = "end-codon-not-first ";
var LOCUS_ORDER = [ "TRA", "TRB", "TRB+", "TRG", "TRD", "TRA+D", "TRD+", "IGH", "IGH+", "IGK", "IGK+", "IGL"]

var BIOSEQ_MATRIX = [ 2, -2]
var BIOSEQ_GAPS   = [-2, -2]
/**
 * Get codons from two aligned sequences
 * @pre both sequences are aligned together ref.length == seq.length
 * @param ref: reference the sequence
 * @param seq: the sequence aligned to ref
 * @param frame: the frame in the reference sequence
 *               0: first codon starts at first position, etc.
 * @return an object containing a property ref and a property seq whose values
 * are a list of codons. Some “codons” from seq may have a length ≠ 3.
 * All codons from ref have 0 or 3 nucleotides (apart from the first/last codons), but may
 * contain dashes.
 * The total number of characters in both lists are equal and are also
 * equal to the number of characters in the original sequences.
 */
function get_codons(ref, seq, frame) {
    var codons_ref = [];
    var codons_seq = [];
    var current_codon_ref = '';
    var current_codon_seq = '';

    var pos = 0;

    if (frame == undefined) {
        return {ref: [ref], seq: [seq]};
    }

    // Search first nucleotide pos
    for (pos; pos < ref.length; pos++) {
        if (ref[pos] != SYMBOL_VOID) {
            if (frame == 0)
                break;
            frame--;
        }
        current_codon_seq += seq[pos];
        current_codon_ref += ref[pos];
    }

    if (current_codon_seq != '' || current_codon_ref != '') {
        codons_ref.push(current_codon_ref);
        codons_seq.push(current_codon_seq);
        current_codon_ref = '';
        current_codon_seq = '';
    }

    var nb_nuc = 0;
    for (; pos < ref.length; pos++) {
        if (nb_nuc == 3 ||
            (ref[pos] != SYMBOL_VOID && current_codon_seq.length > 0 &&
             nb_nuc == 0)) {
            codons_ref.push(current_codon_ref);
            codons_seq.push(current_codon_seq);
            current_codon_ref = '';
            current_codon_seq = '';
            nb_nuc = 0;
        }

        if (ref[pos] == SYMBOL_VOID) {
            current_codon_seq += seq[pos];
            current_codon_ref += SYMBOL_VOID;
        } else {
            current_codon_ref += ref[pos];
            current_codon_seq += seq[pos];
            nb_nuc ++;
        }
    }
    if (current_codon_ref.length > 0)
        codons_ref.push(current_codon_ref);
    if (current_codon_seq.length > 0)
        codons_seq.push(current_codon_seq);
    return {ref : codons_ref, seq : codons_seq};
}

/**
 * Get positions of mutations and their type, as well as end position of codons, between two aligned sequences
 * @pre both sequences are aligned together
 * @param ref: reference the sequence
 * @param seq: the sequence aligned to ref
 * @param frame: the frame in the reference sequence
 *               0: first codon starts at first position, etc.
 * @return a dictionary whose keys are positions of mutations / end of codons in the alignment
 * and whose values are a combinations of SUBST/SILENT/INS/DEL/END_CODON
 */
function get_mutations(ref, seq, frame, with_end_codon) {
    var codons = get_codons(ref, seq, frame);
    var mutations = {};
    var nb_pos = 0;
    console.log(codons);
    for (var i = 0; i < codons.ref.length ; i++) {
        for (var p = 0; p < codons.ref[i].length; p++) {
            if (codons.ref[i][p] != codons.seq[i][p]) {
                if (codons.ref[i][p] == SYMBOL_VOID) {
                    mutations[nb_pos] = INS;
                } else if (codons.seq[i][p] == SYMBOL_VOID) {
                    mutations[nb_pos] = DEL;
                } else {
                    var codon1 = codons.ref[i];
                    var codon2 = codons.seq[i];
                    if (codon1.length > 3 && codon1.length == codon2.length) {
                        codon1 = '';
                        codon2 = '';
                        // We may have common gaps (due to alignment with
                        // other sequences) that need to be ignored
                        for (var j = 0; j < codons.ref[i].length; j++) {
                            if (codons.ref[i][j] != codons.seq[i][j] ||
                                codons.ref[i][j] != SYMBOL_VOID) {
                                codon1 += codons.ref[i][j];
                                codon2 += codons.seq[i][j];
                            }
                        }
                    }
                    if (codon1.length == 3 &&
                        codon2.length == 3 &&
                        frame != undefined &&
                        tableAA.hasOwnProperty(codon2) &&
                        tableAA[codon1] == tableAA[codon2]) {
                        mutations[nb_pos] = SILENT;
                    } else {
                        mutations[nb_pos] = SUBST;
                    }
                }
            }
            nb_pos++;
        }
        if (typeof with_end_codon !== undefined && with_end_codon && (i < codons.ref.length - 1 || codons.ref[i].length >= 3))
            mutations[nb_pos-1] = END_CODON + (typeof mutations[nb_pos-1] === 'undefined' ? '' :  mutations[nb_pos-1])
    }
    return mutations;
}

/**
 * @return the common name of a species. Or the original name if the common
 * name has not been set. The common names are given so that they are
 * compatible with IMGT/V-QUEST®
 */
function getSpeciesCommonName(species) {
    var lower_species = species.toLowerCase();
    switch(lower_species) {
    case "homo sapiens":
        return "human";
    case "mus musculus":
        return "house mouse";
    case "gallus gallus":
        return "chicken";
    default:
        return species;
    }
}

/**
 * Find the position of the nth occurence of needle
 *
 * @param str string to analyze
 * @param needle char to find
 * @param nth but only the Nth occurence
 * @returns false of not found, or the position of the nth occurence.
 */
function nth_ocurrence(str, needle, nth) {
    for (i=0;i<str.length;i++) {
        if (str.charAt(i) == needle) {
            if (!--nth) {
                return i;
            }
        }
    }
    return false;
}

/**
 * transform a tab separated text into an associative js array
 *
 * @param allText
 * @returns {Array}
 */
function tsvToArray(allText) {
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = $.trim(allTextLines[0]).split('	');
    var lines = [];

    for (var i = 1; i < allTextLines.length; i++) {
        var data = $.trim(allTextLines[i]).split('	');
        var tarr = {};
        switch (data.length) {
            case headers.length:
                // imgt prodcuced a complete results -> copy each columns
                for (var j = 0; j < headers.length; j++) {
                    if (headers[j] !== "") {
                        tarr[headers[j]] = data[j];
                    }
                }
                lines.push(tarr);
                break;
            case 1:
                // empty data line -> do nothing
                break;
            default:
                // imgt returned no results or incomplete results for a sequence 
                // -> copy only first two column (Sequence number + ID)
                tarr[headers[0]] = data[0];
                tarr[headers[1]] = data[1];
                lines.push(tarr);
                break;
        }
    }
    return lines;
}

function endsWith(sequence, end) {
    if (sequence.length < end.length)
        return false;
    return sequence.substr(sequence.length - end.length, end.length) == end
}



/**
 * format float
 * @param {float} value
 * @param {bool} fixed - use a fixed total size
 * @returns {string}
 */

function floatToFixed(val, fixed) {
    var result = val.toFixed(10).slice(0, fixed)

    // Remove the last character when it is a '.'
    return result.slice(-1) !== "." ? result : result.slice(0, -1)
}


/**
 * With insertions, IMGT positions must be understood with the insertions
 * removed. As we display the original sequence and not the corrected one, we
 * have to correct the positions so that they reflect the displayed sequence
 * rather than the corrected one.
 */
function correctIMGTPositionsForInsertions(data) {
    if (typeof data == 'undefined')
        return;
    if (typeof data['V-REGION identity % (with ins/del events)'] != 'undefined' &&
        data['V-REGION identity % (with ins/del events)'].length > 0 &&
        typeof data['V-REGION end'] != 'undefined') {

        // Ok we may have insertions and we have positions.

        // 1. Find position of insertions
        var positions_of_insertion = []
        // Insertions are capital letters in the sequence
        var ins_regexp = /[A-Z]/g;
        while ((match = ins_regexp.exec(data.Sequence)) !== null) {
            positions_of_insertion.push(match.index + 1) // +1 to take into
                                                         // account positions
                                                         // starting at 1 for
                                                         // IMGT
        }

        if (positions_of_insertion.length === 0)
            return;

        // Shift all positions that are after insertions
        for (var item in data) {
            if (endsWith(item, ' end') || endsWith(item, ' start')) {
                var seq_position = parseInt(data[item])
                var after_insertions = 0;
                var i = 0
                while (after_insertions < positions_of_insertion.length &&
                        positions_of_insertion[after_insertions] <= seq_position + after_insertions)
                    after_insertions += 1
                data[item] = (seq_position + after_insertions).toString()
            }
        }
    }
}

/**
 * Prepend a path before a filepath if that filepath is not a web path.
 * @param file: a path to a file may be relative, absolute or web path
 * @param path: a directory path
 * @return file iff it is a web path (ie. starting with http or ftp)
 *         path + file otherwise
 */
function prepend_path_if_not_web(file, path) {
    if (file.startsWith('http') || file.startsWith('ftp')) {
        return file;
    }
    return path + file;
}

/**
 * Take in parameter the JSON result of CloneDB for one clone
 * Return a hash whose keys are URLs to sample sets and configs.
 * An additional key (termed 'original') corresponds to the original
 * results as returned by CloneDB.
 * An additional key (termed 'clones_names') stores sample set names
 * (keys) and a list of two elements (as values) containing the number
 * of clones matching the requested clone and the corresponding percentage
 * of those matching clones in the sample set.
 */
function processCloneDBContents(results,model) {
    var existing_urls = {};
    var final_results = {};
    var clones_results = {};
    var count_non_viewable = 0;
    for (var clone in results) {
        if (typeof results[clone].tags != 'undefined' &&
            typeof results[clone].tags.sample_set != 'undefined' &&
            typeof results[clone].tags.sample_set_viewable !== 'undefined') {
            var nb_samples = results[clone].tags.sample_set.length;
            for (var i = 0; i < nb_samples; i++) {
                if (results[clone].tags.sample_set_viewable[i]) {
                    var name = results[clone].tags.sample_set_name[i];
                    if (name === null)
                        name = results[clone].tags.sample_set[i];
                    var config_name = results[clone].tags.config_name;
                    if (typeof config_name !== 'undefined' &&
                        typeof config_name[0] !== 'undefined')
                        config_name = config_name[0];
                    else
                        config_name = 'unknown';
		    var url = '?sample_set_id='+results[clone].tags.sample_set[i]+'&config='+results[clone].tags.config_id[0];
		    var msg = '<a href="'+url+'">'+name+'</a> ('+config_name+')';
                    if (typeof results[clone].tags.sample_tags !== 'undefined' &&
                       results[clone].tags.sample_tags[i].length > 0) {
                        msg += '<br/><span class="sample-tag">'+results[clone].tags.sample_tags[i].join('</span> <span class="sample-tag">')+'</span>';
                    }
		    if (! (url in existing_urls)) {
                       clones_results[name] = [results[clone].occ,parseFloat(results[clone].tags.percentage[0])];
			existing_urls[url] = true;
			final_results[msg] = [results[clone].occ,parseFloat(results[clone].tags.percentage[0])];
		    } else{
			final_results[msg][0] += results[clone].occ;
                       clones_results[name][0] += results[clone].occ;
                       final_results[msg][1] += parseFloat(results[clone].tags.percentage[0]);
                       clones_results[name][1] += parseFloat(results[clone].tags.percentage[0]);
		    }

                } else {
                    count_non_viewable += 1;
                }
            }
        } else {
            count_non_viewable += 1;
        }
    }
    for (var fr in final_results) {
	final_results[fr] = final_results[fr][0]+' clone'+((final_results[fr][0] === 1) ? '' : 's') + ' (' + model.formatSize(final_results[fr][1],true,model.getSizeThresholdQ(model.t)) + ')';
    }
    if (count_non_viewable > 0)
        final_results['Non viewable samples'] = count_non_viewable;

    if (Object.keys(final_results).length === 0)
        final_results['–'] = "No occurrence of this clonotype in CloneDB"

    final_results.original = results;
    final_results.clones_names = clones_results;
    return final_results;
}

/**
 * extract information from htlm page
 *
 * @param HTML code for a complete webpage
 */
function processImgtContents(IMGTresponse,tag) {

    var impl = document.implementation;
    //var htmlDoc = (new DOMParser).parseFromString(IMGTresponse, "text/html");
    var htmlDoc = document.implementation.createHTMLDocument("example");
    htmlDoc.documentElement.innerHTML= IMGTresponse;

    if (htmlDoc.length<10){
        console.log({
            "type": "log",
            "msg": "Error, Javascript engine does not supprt the parseFromString method..."});
    }
    var allpretext = ((htmlDoc.getElementsByTagName(tag))[0]).innerHTML;
    var idxFirst = allpretext.indexOf('Sequence number');
    var textlikecsv = allpretext.substr(idxFirst);
    var imgArray = tsvToArray(textlikecsv);
    return imgArray;
}

/**
 * Add start stop position for fields given in array according to
 * clone's sequence.
 * Used in IMGT/V-QUEST post-processing.
 *
 * @param seuence
 * @param arrayToProcess
 * @returns {object}
 */
function computeStartStop(arrayToProcess,sequence){

    var tpVal=0;
    var fldVal="";
    var result={};
    var junction = sequence;//arrayToProcess["JUNCTION"].toUpperCase();
    var junction_pos = 0; //sequence.indexOf(junction);

    var fields = [{field: "V-REGION", tooltip:arrayToProcess["V-GENE and allele"]},
                  {field: "J-REGION", tooltip:arrayToProcess["J-GENE and allele"]},
                  {field: "D-REGION", tooltip:arrayToProcess["D-GENE and allele"]},
                  {field: "CDR3-IMGT"}]

    var start;
    var stop;

    for (var i = 0; i < fields.length; i++) {
        start = -1;
        // Search using the sequence or just get the start and end positions?
        if (typeof arrayToProcess[fields[i].field+' start'] !== 'undefined' &&
            typeof arrayToProcess[fields[i].field+' end'] !== 'undefined') {
            // IMGT positions start at 1
            start = arrayToProcess[fields[i].field+' start'] - 1;
            stop = arrayToProcess[fields[i].field+' end'] - 1;
        } else if (typeof arrayToProcess[fields[i].field] != 'undefined') {
            sequence_to_search = arrayToProcess[fields[i].field].toUpperCase();
            position = junction.indexOf(sequence_to_search);
            if (position > -1 && sequence_to_search.length > 0) {
                position += junction_pos;
                start = position;
                stop = position + sequence_to_search.length - 1;
            }
        }
        if (start != -1) {
            var tooltip = fields[i].tooltip
            if (typeof fields[i].tooltip == 'undefined') {
                tooltip = fields[i].field;
            }
            result[fields[i].field] = {seq: "", tooltip: tooltip, start: start, stop: stop };
        }
    }

    return result;
}

/**
 * Append (or overwrite) the data in array data into the array append_to.
 */
function append_to_object(data, append_to) {
    for (var key in data) {
        append_to[key] = data[key];
    }
}

/**
 * Allow to copy passed content into the clipboard
 */
function copyTextToClipboard(text, field, elem) {
    if (!navigator.clipboard) {
        console.log({ msg: "Unable to copy content into clipboard. Maybe cause by an old browser", type: "flash", priority: 3 });
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        var msg_field = (field != undefined) ? ` field: <B>${field}</B>` : ""
        console.log({ msg: 'Copied '+msg_field, type: "flash", priority: 1 });
        elem.title = 'Copied!'
        setTimeout(function() { elem.title = "Copy to clipboard"}, 3000);

    }, function(err) {
        console.log({ msg: 'Could not copy to clipboard: '+ err, type: "flash", priority: 2 });
    });
}


/**
 * Floor the given number to a power of 10
 */

function floor_pow10(x)
{
  try {
      return Math.pow(10, Math.floor(Math.log10(x)))
  }
  catch(e) {
      // Always return something
      return 1+x;
  }
}


/**
 * Give a nice decimal number above the given number
 * nice_ceil(0.14) -> 0.2
 * nice_ceil(0.14, 0.05) -> 0.15
 * nice_ceil(23.4) -> 30
 **/

function nice_ceil(x, force_pow10)
{
    if (x == 0) return 0
    if (x <  0) return -nice_floor(-x, force_pow10)

    try {
        var floor_power10 = (typeof force_pow10 == 'undefined') ? floor_pow10(x) : force_pow10
 
        return Math.ceil(x / floor_power10) * floor_power10
    }
    catch(e) {
        // Always return something
        return x;
    }
}



/**
 * Give a nice decimal number (to 1/2/5) above the given number
 **/

function nice_1_2_5_ceil(x)
{
    if (x <= 0) return x

    try {
        var floor_power10 = floor_pow10(x)
        var xx = x / floor_power10
        return (xx == 1 ? 1 : xx <= 2 ? 2 : xx <= 5 ? 5 : 10) * floor_power10
    }
    catch(e) {
        // Always return something
        return x;
    }
}


/**
 * Give a nice decimal number under the given number
 * nice_floor(0.14) -> 0.1
 * nice_floor(23.4) -> 20
 * nice_floor(23.4, 1) -> 23
 * nice_floor(23.4, 100) -> 0
 **/

function nice_floor(x, force_pow10)
{
    if (x == 0) return 0
    if (x <  0) return -nice_ceil(-x, force_pow10)

    try {
        var floor_power10 = (typeof force_pow10 == 'undefined') ? floor_pow10(x) : force_pow10
        return Math.floor(x / floor_power10) * floor_power10
    }
    catch(e) {
        // Always return something
        return x;
    }
}





/**
 * Give nice min/max/step numbers including the given [min, max] interval in order that steps are also nice,
 * See examples in tools_test.js
 * nice_min_max_steps(0.03, 19.24, 5) -> {min: 0, max: 20, step: 4}
 * nice_min_max_steps(0, 7, 4) -> {min: 0, max:8, step: 2}
 **/

function nice_min_max_steps(min, max, nb_max_steps)
{
    if (min == max)
    {
        min = nice_floor(min)
        max = nice_ceil(max + 1)
        nb_max_steps = 1
    }

    var basic_step = nice_1_2_5_ceil((max - min) / nb_max_steps)

    var n_min = nice_floor(min, basic_step)
    var n_max = nice_ceil(max, basic_step)

    var step = nice_1_2_5_ceil((n_max - n_min) / nb_max_steps)
    var nb_steps = Math.ceil((n_max - n_min) / step)

    // In some rare cases, we try another loop of rounding
    var overlength = nb_steps * step - (n_max - n_min)
    if (overlength)
    {
        n_min = nice_floor(min, step)
        n_max = nice_ceil(max, step)
        nb_steps = Math.ceil((n_max - n_min) / step)
    }

    return {min: n_min, max: n_max, step: step, nb_steps: nb_steps}
}



/**
 * Give a minimial number of digits to represent 'x' with at least 'sd' significant digits
 * nice_number_digits(14.5, 2) -> 1
 * nice_number_digits(0.145, 2) -> 2
 * nice_number_digits(0.0145, 2) -> 3
 **/

function nice_number_digits(x, sd)
{
    if (x <= 0) return sd

    try {
        var nd = Math.floor(Math.log10(x))
        return Math.max(0, sd - nd - 1)
    }
    catch(e) {
        // Always return something
        return sd
    }
}


/**
 * Sends error to the specified database reference.
 * If database is undefined, throws the specified error.
 * @param {Error} err - the error to send
 * @param {Database} db - the database reference
 */
function sendErrorToDb(err, db) {
    if (db) {
        db.error(err.stack);
    } else {
        throw err;
    }
}

/*
 * Removes all children from the specified node.
 * This function should be more efficient and faster than `innerHTML = ''`.
 * @param {Node} node - the node to clean from its children.
 */
function remove_all_children(node)
{
    while (node.lastChild) {
      node.removeChild(node.lastChild);
    }
}

// Add the clean_nodes function to the Node prototype
Node.prototype.removeAllChildren = function removeAllChildren() {
    remove_all_children(this);
}



FATAL = 50
ERROR = 40
WARN = 30
INFO = 20
DEBUG = 10

warnLevels = {
    'fatal': FATAL,
    'error': ERROR,
    'warn': WARN,
    'info': INFO,
    'debug': DEBUG
}

warnTexts = { }

for (var key in warnLevels) {
    warnTexts[warnLevels[key]] = key ;
}

function warnLevelOf(key)
{
    return (key in warnLevels) ? warnLevels[key] : WARN
}

function warnTextOf(key)
{
    return (key in warnTexts) ? warnTexts[key] : '?'
}


/**
 *  Pearson correlation coefficient
 */

function sum(l) {
    return l.reduce(function(a, b) { return a + b; }, 0);
}

function square(x) { return x*x ; }

function pearsonCoeff(l1, l2) {

    var sum1 = sum(l1);
    var sum2 = sum(l2);
    var sum1sq = sum(l1.map(square))
    var sum2sq = sum(l2.map(square))

    var sum12 = 0;
    for (var i=0, n=l1.length; i < n; i++) { sum12 += l1[i] * l2[i] ; }

    var d = (n*sum1sq - sum1*sum1) * (n*sum2sq - sum2*sum2)

    if (d == 0) return 0

    return (n*sum12 - sum1*sum2) / Math.sqrt(d)
}

function logadd1(x) { return Math.log(x + 1) ; }



/**
 * Compare two locus to sort them.
 * The list is ordered on a preordered list of locus (LOCUS_ORDER).
 * By this way, locus that are not in this list will be added at the end of it.
 * @param  {String} valA One locus value
 * @param  {String} valB Another locus value to compare
 * @return {Number}      A number -1 if A before B, else 1
 */
function locus_cmp(valA, valB){
    // Ordered list of all  generic locus 
    var index_A = LOCUS_ORDER.indexOf(valA)
    var index_B = LOCUS_ORDER.indexOf(valB)

    if (index_A == -1 && index_B == -1){
        // Neither A or B are present in LOCUS_ORDER
        return valA.localeCompare(valB)
    } else if (index_A != -1 && index_B == -1){
        // Only A is present in LOCUS_ORDER
        return -1
    } else if (index_A == -1 && index_B != -1){
        // Only B is present in LOCUS_ORDER
        return 1
    } else if (index_A != -1 && index_B != -1){
        // A & B are present in LOCUS_ORDER
        return index_A - index_B
    }
    return 0
}



/**
 * Compare two labels to sort them against a predefined list of labels.
 * The list is ordered on a preordered list of labels).
 * By this way, labels that are not in this list will be added at the end of it.
 * @param  {String} valA   One label value
 * @param  {String} valB   Another label value to compare
 * @param  {Array}  labels List of predefined labels
 * @return {Number}        A number -1 if A before B, else 1
 */
function sortFromList(valA, valB, labels){
    // Ordered list of all generic label
    var index_A = labels.indexOf(valA)
    var index_B = labels.indexOf(valB)

    if (index_A == -1 && index_B == -1){
        // Neither A or B are present in labels
        return valA < valB
    } else if (index_A != -1 && index_B == -1){
        // Only A is present in labels
        return -1
    } else if (index_A == -1 && index_B != -1){
        // Only B is present in labels
        return 1
    } else if (index_A != -1 && index_B != -1){
        // A & B are present in labels
        return index_A - index_B
    }
    return 0
}

function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}


/**
 * Fix error when a same file is analysed multiple time
 * In this case, order will fail or graph will not be clear, so rename original_names
 * @param  {[type]} clone [description]
 * @return {[type]}       [description]
 */
function fixDuplicateNames(names){
    var copy = JSON.parse(JSON.stringify(names))
    copy = removeDuplicate(names)
    if (copy.length != names.length){
        for (var i = 0; i < names.length; i++) {
            var name = names[i]
            var idx  = getAllIndexes(names, name)
            var start = 1
            for (var j = 1; j < idx.length; j++) {
                var new_name = name + "("+start+")"
                while ( (names.indexOf(new_name, idx[j]) != -1) || start > names.length ){
                    start += 1
                }
                names[idx[j]] = new_name
                start += 1
            }
        }
    }
    return names
} 


/**
 * Open a new tab and put content in it.
 * This function is use to show fasta export
 * @param  {String} content Clones as fasta format
 */
function openAndFillNewTab (content){
    var w = window.open("", postTarget(), "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
    
    var result = $('<div/>', {
        html: content
    }).appendTo(w.document.body);
    return
}

/**
 * Function that allow to make comparison between two arrays.
 */
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});


/**
 * @param {data} a string containing a multi-FASTA
 * @param {n} the number of sequences to keep
 * @return return a string containing at most {n} FASTA sequences.
 *         if {n} is negative or null return {data} itself
 */
function getNFirstSequences(data, n) {
    var pos = nth_ocurrence(data, '>', n+1);
    if (pos) {
        return data.substr(0, pos);
    } else {
        return data;
    }    
}

/**
 * @return a proxy URL if one can be obtained in the config (ending with /) or
 * throws an exception and logs the error.
 */
function getProxy() {
    if (typeof config != 'undefined') {
        if (typeof config.proxy != 'undefined') {
            return config.proxy+"/";
        } else if (typeof config.db_address != 'undefined') {
            return config.db_address+"/proxy/";
        }
    }
    console.log({
        "type": "flash",
        "msg": "Your installation doesn't seem to have an associated proxy.",
        "priority": 2
    });
    throw "No proxy";
}

/**
 * @return an array without duplication
 */
function removeDuplicate(array) {
    clean_array = array.filter(function(item, pos) {
        return array.indexOf(item) == pos;
    })
    return clean_array
}

/**
 * Filter value given of an array and decrease greater values
 */
function removeEltAndDecrease(array, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] > value) {
            array[i] = array[i] - 1 
        } else if (array[i] == value) {
            array.splice(i, 1)
            i = i-1
        }
    }
    return array
}



/**
 * Return the number of match from an alignment cigar
 * Cigar is given by function bsa_align of bioseq library
 */
function bsa_cigar2match(cigar)
{
    var sum = 0

    for (var k = 0; k < cigar.length; ++k){
        var match = (cigar[k]>>4 )
        var type  = (cigar[k]&0xf)
        if (type == 0){
            sum += match
        }
    }
    return sum
}

function download_csv(csv, filename) {
    var csvFile;
    var downloadLink;

    // CSV FILE
    csvFile = new Blob([csv], {type: "text/csv"});

    // Download link
    downloadLink = document.createElement("a");

    // File name
    downloadLink.download = filename;

    // We have to create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile);

    // Make sure that the link is not displayed
    downloadLink.style.display = "none";

    // Add the link to your DOM
    document.body.appendChild(downloadLink);

    // Lanzamos
    downloadLink.click();
}


function translate_key_diversity(key_diversity){
    var table = {
        "index_H_entropy" :      "Shannon's diversity",
        "index_E_equitability" : "Pielou's evenness",
        "index_Ds_diversity" :   "Simpson's diversity"
    }
    return table[key_diversity]
}


///////////////////////////
/// Fct to fill info table
///////////////////
var clean_title = function(title){ return title.replace(/[&\/\\#,+()$~%.'":*?<>{} ]/gi,'_').replace(/__/gi,'_')}
        
/**
 * Create a header line for info table
 *  @param {String} content - String to show in the header
 *  @param {string} title - Specific DOM id to give to the line
 *  @param {integer} time_length - Length of time point to fill (and so on number of informations cells of the line)
 */
var header = function(content, title, time_length, class_line, class_cell) {
    class_line = class_line != undefined ? `class='${class_line}'` : ""
    class_cell = class_cell != undefined ? `class='${class_cell} header'` : "class='header'"
    title = (title == undefined) ? clean_title(content) : clean_title(title)
    return `<tr id='modal_header_${title}' ${class_line}><td ${class_cell} colspan='${(time_length + 1)}'>${content}</td></tr>` ; 
}

/**
 * Create a table row with given content
 *  @param {} item - Content of the first cell of the line
 *  @param {} content - content to show on the second cell of the line (value)
 *  @param {string} title - Specific title id to give as extension of the DOM id of the line; can be undefined
 *  @param {integer} time_length - Length of time point to fill (and so on number of informations cells of the line)
 */
var row_1  = function(item, content, title, time_length, class_line, class_cell_first, class_cell_other, allow_copy=false) {
    class_line = class_line != undefined ? `class='${class_line}'` : ""
    class_cell_first = class_cell_first != undefined ? `class='${class_cell_first}'` : ""
    class_cell_other = class_cell_other != undefined ? `class='${class_cell_other}'` : ""
    title = (title != undefined) ? clean_title(title) : ( (item == undefined) ? "": clean_title(item) )
    var copy = ""
    if (allow_copy == true) {
        copy = "<i class='icon-docs' style='cursor: copy' "+
                   `id='modal_line_title_${title}_clipboard' `+
                   `onclick='copyTextToClipboard("${content}", "${item}", this)' `+
                   "title='Copy to clipboard'>"+
               "</i>"
    }
    return `<tr id='modal_line_${title}' ${class_line}><td ${class_cell_first} id='modal_line_title_${title}'>${item}${copy}</td><td ${class_cell_other} colspan='${time_length}' id='modal_line_value_${title}'>${content}</td></tr>`;
}

/**
 * Create a html row element from given item and list of values
 *  @param {String} item - Content of first row of the line
 *  @param {} content - Array of value to put on each other cells of the line
 *  @param {string} title - Specific title id to give to the line
 *  @param {integer} time_length - Length of time point to fill (and so on number of informations cells of the line)
 */
var row_from_list  = function(item, content, title, time_length, class_line, class_cell_first, class_cell_other) { 
    class_line = class_line != undefined ? `class='${class_line}'` : ""
    class_cell_first = class_cell_first != undefined ? `class='${class_cell_first}'` : ""
    class_cell_other = class_cell_other != undefined ? `class='${class_cell_other}'` : ""
    title = (title == undefined) ?clean_title(item) : clean_title(title)
    var div = `<tr id='modal_line_${title}' ${class_line}><td ${class_cell_first} id='modal_line_title_${title}'>${item}</td>`
    for (var i = 0; i < content.length; i++) {
        col  = content[i]
        div += `<td ${class_cell_other} id='modal_line_value_${title}_${i}'>${col}</td>`
    }
    div += "</tr>" ;
    return div;
}


/**
 * Create cell content by casting given parameter to be showable in table
 *  @param {string} title - Specific title id to give to the line
 *  @param {} content - Content that will be automatically casted
 *  @param {integer} time_length - Length of time point to fill (and so on number of informations cells of the line)
 *  @param {} clone 
 */
var row_cast_content = function(title, content, time_length, clone) {
    if (content == undefined) {
        return ""
    } else if (typeof(content) != "object") {
        return row_1(title, content.toString(), undefined, time_length)
    } else if (Object.keys(content).indexOf("info") != -1) {
        // Textual field
        return row_1(title, content.info, undefined, time_length)
    } else if (Object.keys(content).indexOf("name") != -1) {
        // Textual field
        return row_1(title, content.name, undefined, time_length)
    } else if (Object.keys(content).indexOf("val") != -1) {
        // Numerical field
        return row_1(title, content.val, undefined, time_length)
    } else if (Object.keys(content).indexOf("seq") != -1) {
        // Sequence field with pos
        return row_1(title, content.seq, undefined, time_length)
    } else {
        // Sequence field
        var nt_seq = clone.getSegNtSequence(title);
        if (nt_seq !== '') {
            return row_1(title, clone.getSegNtSequence(title), undefined, time_length)
        }
    }
}