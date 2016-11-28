/**
* TODO: Implement this function
* Loads the .vidjil file produced by the program.
* @return {object} - the vidjil object
**/
function loadVidjilFile() {
  var vidjilObj = {
    "vidjil_json_version" : "2014.10",

    "samples" :  {
  	"number" : 1,
  	"original_names" :  [ "/some/file" ] ,
  	"run_timestamp" :  [ "2015-02-19 16:37:06" ] ,
  	"producer" :  [ "vidjil dev 0cf35de (2015-02-17)" ] ,
  	"log" :  [ "Some log" ],
  	"commandline" :  [ "Some commandline" ]
    } ,

    "reads" :  {
    	"total" :  [ 2000 ] ,
    	"segmented" :  [ 1000 ] ,
    	"germline" :  {
    	    "IGH" :  [ 950 ]
    	}
    },
      "clones" :  [{
  	    "id" : "id-1",
  	    "name": "name-1",
    "sequence": "ACGCTGGACGACTTGTATCTCTGTGCCAGCCGACCCGAAAAAGACAGTAGAAACTAATGAAAAACTGTTTTTTGGCAGT",

  	    "reads" :  [ 800 ] ,
  	    "top" : 1,
  	    "germline" : "IGH"
  	}, {
  	    "id" : "id-2",
  	    "name" : "name-2",
    "sequence" : "AGCTGGACGACTCGGCCCTGTATCTCTGTGCCAGCACCCGAGGGGACAGTAGAAACTAATGAAAAACTGTTTTTTGGCAGT",

  	    "reads" :  [ 100 ] ,
  	    "top" : 2,
  	    "germline" : "IGH"
  	}
    ] ,
      "germlines" :  {
  	     "custom" :  {
  	        "shortcut" : "X",
      	    "3" :  [ "/some/IGHV.fa" ],
      	    "4" :  [ "/some/IGHD.fa" ],
      	    "5" :  [ "/some/IGHJ.fa" ]
  	      }
        }
    };
    return vidjilObj;
}

function displayVidjilViews() {
  var views = document.getElementsByClassName('vidjil_view');

  for (var i = 0; i < views.length; i++) {
    var view = views[i];
    console.log(views.length);
    view.style.display = 'block';
  }

  var formPanel = document.getElementById('form_panel');
  formPanel.className = 'panel twopanels_left';
}

function main() {
  // Get DOM elements
  var submitNode = document.getElementById("form_submit");

  // Prepare Vidjil model
  var model = new Model();
  // model.loadGermline();
  var segmenter = new Segment("segmenter_panel", model);
  var scatter = new ScatterPlot("scatter_panel", model);

  // Parse sequences and add to segmenter
  submitNode.addEventListener("click", function () {
    displayVidjilViews();
    var vidjil = loadVidjilFile();
    model.parseJsonData(vidjil, 100);
    model.initClones();
    model.selectAll();
  });
}
