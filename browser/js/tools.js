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
        if (data.length == headers.length) {
            var tarr = {};
            for (var j = 0; j < headers.length; j++) {
                if (headers[j] !== "") {
                    tarr[headers[j]] = data[j];
                }
            }
            lines.push(tarr);
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
 * Take in parameter the JSON result of CloneDB for one clone
 * Return a hash whose keys are URLs to sample sets and configs.
 * An additional key (termed 'original') corresponds to the original
 * results as returned by CloneDB.
 */
function processCloneDBContents(results) {
    var existing_urls = {};
    var final_results = {};
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
		    url = '?sample_set_id='+results[clone].tags.sample_set[i]+'&config='+results[clone].tags.config_id[0];
		    var msg = '<a href="'+url+'">'+name+'</a> ('+config_name+')';
		    if (! (url in existing_urls)) {
			existing_urls[url] = true;
			final_results[msg] = results[clone].occ;
		    } else{
			final_results[msg] += results[clone].occ;
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
	final_results[fr] = final_results[fr]+' clone'+((final_results[fr] === 1) ? '' : 's');
    }
    if (count_non_viewable > 0)
        final_results['Non viewable samples'] = count_non_viewable;

    if (Object.keys(final_results).length === 0)
        final_results['–'] = "No occurrence of this clone in CloneDB"

    final_results.original = results;
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
 * nice_ceil(0.14) -> 0.15
 * nice_ceil(23.4) -> 30
 **/

function nice_ceil(x)
{
    if (x <= 0) return x

    try {
        var floor_power10 = floor_pow10(x)

        var xx = x / floor_power10
        return (xx == 1 ? 1 : xx <= 1.5 ? 1.5 : Math.ceil(xx)) * floor_power10
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
 **/

function nice_floor(x)
{
    if (x <= 0) return x

    try {
        var floor_power10 = floor_pow10(x)
        return Math.floor(x / floor_power10) * floor_power10
    }
    catch(e) {
        // Always return something
        return x;
    }
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
