/**
* TODO: Implement this function
* Loads the .vidjil file produced by the program.
* @return {object} - the vidjil object
**/
function loadVidjilFile() {
  var vidjilObj = {
    "vidjil_json_version": ["2014.09"],
    "reads": {
      "segmented": [105, 32],
      "total": [110, 40],
      "germline": {"TRG": [100, 30], "IGH": [10, 7]}
    },
    "samples": {
      "timestamp": ["2014-10-20 13:59:02", "2014-10-25 14:00:32"],
      "number": 2,
      "original_names": ["Diag.fa", "Fu-1.fa"]},
      "clones": [
        { "id" : "clone-001",
        "sequence" : "AGCTGGACGACTCGGCCCTGTATCTCTGTGCCAGCACCCGAGGGGACAGTAGAAACTAATGAAAAACTGTTTTTTGGCAGT",
        "name" : "CASTRGDSRN**KTVF TRBV5-4 TRBJ1-4",
        "reads" : [10, 5],
        "top" : 1,
        "germline" : "TRB",
        "seg" : { "5" : "TRBV5-4", "3" : "TRBJ1-4" }
        },
        { "id" : "clone-002",
        "sequence" : "GATACAGATCAGATCAGTACAGATACAGATACAGATACA",
        "name" : "Test 2",
        "reads" : [20, 20],
        "top" : 2,
        "germline" : "TRG"
        },
        { "id": "clone-003",
        "sequence": "CTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGCCTTATTATAAGAAACTCTTTGGCAGTGGAAC",
        "reads" : [ 75, 5],
        "germline": "TRG",
        "top": 3,
        "seg": {
            "5": "TRGV5*01",  "5start": 0,   "5end": 86,
            "3": "TRGJ1*02",  "3start": 89,  "3end": 118,
            "cdr3": { "start": 77, "stop": 104, "seq": "gccacctgggccttattataagaaactc" }
          }
        }
      ]
    };
    return vidjilObj;
}

function main() {
  // Get DOM elements
  var submitNode = document.getElementById("form_submit");

  // Prepare Vidjil model
  var model = new Model();
  // model.loadGermline();
  var segmenter = new ScatterPlot("segmenter_panel", model);


  // Parse sequences and add to segmenter
  submitNode.addEventListener("click", function () {
    var vidjil = loadVidjilFile();
    model.parseJsonData(vidjil);
    model.initClones();
    // segmenter.init();
    model.selectAll();
  });
}
