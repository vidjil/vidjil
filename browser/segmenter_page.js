/**
 * Naively extracts the sequences from fasta formated text
 * @param {string} rawData - the text in fasta format
 * @return {string[]} - list of sequences
 **/
function extractSequences(rawData) {
  var sequences = [];
  var seqBlocks = rawData.split('>');

  for (var i = 0; i < seqBlocks.length; i++) {
    var seq = seqBlocks[i].split('\n')[1];
    sequences.push(seq);
  }

  return sequences;
}

/**
 * Naively creates a vidjil object from sequences
 * @param {string[]} sequences - the list of sequences
 * @return {object} - the vidjil object containing the sequences
 **/
function toVidjilStr(sequences) {
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
        "original_names": ["Diag.fa", "Fu-1.fa"]
    },
    "clones": []
  };

  for (var i = 0; i < sequences.length; i++) {
    var seqObj = {
      "sequence": sequences[i],
      "name": "test"+i,
      "id": i,
    };
    vidjilObj.clones.push(seqObj);
  }

  return vidjilObj;
}

function main() {
  // Get DOM elements
  var submitNode = document.getElementById("form_submit");

  // Prepare Vidjil model
  var model = new Model();
  var segmenter;


  // Parse sequences and add to segmenter
  submitNode.addEventListener("click", function () {
    var rawData = submitNode.value;
    var vidjil = toVidjilStr(extractSequences(rawData));
    model.parseJsonData(vidjil);
    model.loadGermline();
    model.initClones();
    var segmenter = new Segment("segmenter_panel", model);
    segmenter.init();
    model.selectAll();
  });
}
