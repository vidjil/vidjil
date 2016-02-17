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
    var headers = allTextLines[0].split('	');
    var lines = [];

    for (var i = 1; i < allTextLines.length; i++) {
        var data = allTextLines[i].split('	');
        if (data.length == headers.length) {
            var tarr = {};
            for (var j = 0; j < headers.length; j++) {
                if (headers[j] != "") {
                    tarr[headers[j]] = data[j];
                }
            }
            lines.push(tarr);
        }
    }
    return lines;
}

/**
 * extract information from htlm page
 *
 * @param HTML code for a complete webpage
 */
function processImgtContents(IMGTresponse,tag) {

    var impl = document.implementation;
    var htmlDoc = (new DOMParser).parseFromString(IMGTresponse, "text/html");
    var allpretext = htmlDoc.getElementsByTagName(tag)[0].innerHTML;
    var idxFirst = allpretext.indexOf('Sequence number');
    var textlikecsv = allpretext.substr(idxFirst);
    var imgArray = tsvToArray(textlikecsv);
    return imgArray;
}

/**
 * Add start stop position for fields given in array according to
 * clone's sequence.
 *
 * @param seuence
 * @param arrayToProcess
 * @returns {object}
 */
 function computeStartStop(arrayToProcess,sequence){

    var tpVal=0;
    var fldVal="";
    var result={};

    for(var i in arrayToProcess){

        switch (i){
            case "V-GENE and allele":
                fldVal=arrayToProcess["3'V-REGION"].toUpperCase();
                tpVal = sequence.indexOf(fldVal);
                if (tpVal>0){
                    result["3'V-REGION"] = {seq:"", tooltip:arrayToProcess["V-GENE and allele"],start: tpVal, stop: tpVal+fldVal.length};
                }
                break;

            case "J-GENE and allele":
                fldVal=arrayToProcess["5'J-REGION"].toUpperCase();
                tpVal = sequence.indexOf(fldVal);
                if (tpVal>0){
                    result["5'J-REGION"] = {seq:"", tooltip:arrayToProcess["J-GENE and allele"],start: tpVal, stop: tpVal+fldVal.length};
                }
                break;

            case "D-GENE and allele":
                fldVal=arrayToProcess["D-REGION"].toUpperCase();
                tpVal = sequence.indexOf(fldVal);
                if (tpVal>0){
                    result["D-REGION"] = {seq:"", tooltip:arrayToProcess["D-GENE and allele"],start: tpVal, stop: tpVal+fldVal.length};
                }
                break;

            case "CDR3-IMGT":
                fldVal=arrayToProcess["CDR3-IMGT"].toUpperCase();
                tpVal = sequence.indexOf(fldVal);
                if (tpVal>0){
                    result["CDR3-IMGT"] = {seq:"", tooltip:"CDR3-IMGT",start: tpVal, stop: tpVal+fldVal.length};
                }
                break;
        }
    }
    return result;
}