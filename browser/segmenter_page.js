var model;
// model.loadGermline();
var segmenter;
var scatter;

/**
 * Validates the form, and returns the data if it was successfully validated.
 * Display errors if the form is invalid.
 * @param {object} form - the form DOM object containing the data.
 * @return {string} data - the sequences from the form if the form was successfully validated.
 * @return {undefined} if the form is invalid.
 */
function validateForm(form) {
  var data = form['sequences'].value;
  if (!data) {
    data = form['sequences_file'].files[0];
    if (!data) {
      data = undefined;
      displayError('No sequences provided.');
    }
  }

  return data;
}

/**
 * TODO implement this function
 * Display the specified error message on the page.
 * @param {string} error - the error message to display.
 * @param {string} rawError - (optional) the raw error text.
 * @param {exception} exc - (optional) the exception that caused the error.
 */
function displayError(error, rawError, exc) {
  console.log(error);
  console.log(rawError);
  console.log(exc);
}

/**
 * Requests the .vidjil file to the controller.
 * @param {string} sequences - the sequences to send to the controller.
 * @param {function} callback - the function to call upon request's successful return.
 * @param {function} error - the function to call when an error occurs.
 **/
function requestVidjilFile(sequences, callback, error) {
  var urlController = 'https://dev.vidjil.org/vidjil/segmenter';
  var dataToSend = new FormData();
  dataToSend.append('sequences', sequences);

  // Prepare request
  var xhr = new XMLHttpRequest();
  xhr.overrideMimeType("application/json");
  xhr.addEventListener('readystatechange', function() {
    if (this.readyState == 4 && this.status == 200) {
      callback(this.responseText);
    }
  });

  xhr.addEventListener('error', function() {
    displayError('We had a problem processing your request.', this.stateText);
  });

  xhr.open('POST', urlController, true);
  xhr.send(dataToSend);
}

/**
 * Processes the resulting data from the request, and sets up the Vidjil views.
 * @param {string} data - the data from the request.
 */
function processResult(data) {
  console.log(data);
  displayVidjilViews();
  model.parseJsonData(data, 100);
  model.loadGermline();
  model.initClones();

  // Do not select virtual clones
  var cloneIds = [];
  for (var i = 0; i < model.clones.length - 1; i++) {
    cloneIds.push(i);
  }
  model.multiSelect(cloneIds);

  // Delete merge button
  var menuSegmenter = document.getElementsByClassName('menu-segmenter')[0];
  var mergeButt = document.getElementById('merge');
  menuSegmenter.removeChild(mergeButt);
}

function displayVidjilViews(visible) {
  var views = document.getElementsByClassName('vidjil_view');

  for (var i = 0; i < views.length; i++) {
    var view = views[i];
    view.style.display = 'block';
    view.style.visibility = 'visible';
  }

  var formPanel = document.getElementById('form_panel');
  formPanel.className = 'panel twopanels_left';
}

/**
 * Main function called by Vidjil.
 */
function main() {
  // Get DOM elements
  var submitNode = document.getElementById('form_submit');
  var formNode = document.forms['form_sequences'];

  // Prepare Vidjil model
  model = new Model();
  segmenter = new Segment('segmenter_panel', model);
  scatter = new ScatterPlot('scatter_panel', model);
  setCrossDomainModel(model);

  // Parse sequences and add to segmenter
  submitNode.addEventListener('click', function () {
    var data = validateForm(formNode);
    if (data) {
      requestVidjilFile(data, processResult, function(xhr, textStatus, exc) {
        displayError('We had a problem processing your request.', textStatus, exc);
      });
    }
  });
}
