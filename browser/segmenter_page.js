/**




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
    // model.selectAll();
    var cloneIds = [];
    for (var i = 0; i < model.clones.length - 1; i++) {
      cloneIds.push(i);
    }
    model.multiSelect(cloneIds);
  });
}
