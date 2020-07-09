var DEFAULT_SEGMENTER_ADDRESS = 'https://db.vidjil.org/vidjil/segmenter';
var model;
var segmenter;
var scatter;
var console;

/**
 * Validates the form, and returns the data if it was successfully validated.
 * Display errors if the form is invalid.
 * @param {object} form - the form DOM object containing the data.
 * @return {string} data - the sequences from the form if the form was successfully validated.
 * @return {undefined} if the form is invalid.
 */
function validateForm(form) {
    var data = form.sequences.value;
    if (!data) {
        data = form.sequences_file.files[0];
        if (!data) {
            data = undefined;
            displayError('No sequences provided.');
        }
    }

    return data;
}

/**
 * Display the specified error message on the page.
 * @param {string} error - the error message to display.
 * @param {string} rawError - (optional) the raw error text.
 * @param {exception} exc - (optional) the exception that caused the error.
 */
function displayError(error, rawError, exc) {
    console.log({msg: error, type: 'flash', priority: 2});
    if (rawError) {
        console.log({msg: rawError, type: 'flash', priority: 2});
    }
}

/**
 * Requests the .vidjil file to the controller.
 * @param {string} sequences - the sequences to send to the controller.
 * @param {function} callback - the function to call upon request's successful return.
 * @param {function} error - the function to call when an error occurs.
 **/
function requestVidjilFile(sequences, callback, error) {
    var urlController = (typeof config != 'undefined' && typeof config.segmenter_address != 'undefined')?
                        config.segmenter_address :
                        DEFAULT_SEGMENTER_ADDRESS;
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
    model.parseJsonData(data, 100);
    model.loadGermline();
    model.initClones();

    // Do not select virtual clones
    var cloneIds = [];
    for (var i = 0; i < model.clones.length; i++) {
        if (model.clones[i].isInteractable()) {
            cloneIds.push(i);
        }
    }
    model.multiSelect(cloneIds);

    // Delete merge button
    var menuSegmenter = document.getElementsByClassName('menu-segmenter')[0];
    var mergeButt = document.getElementById('merge');
    menuSegmenter.removeChild(mergeButt);
}

/**
 * Displays or hides the Vidjil views with a nice transition.
 * @param {bool} visible - 'true' to display, 'false' to hide.
 */
function displayVidjilViews(visible) {
    var views = document.getElementsByClassName('vidjil_view');
    for (var i = 0; i < views.length; i++) {
        var view = views[i];
        if (visible) {
            view.classList.add('visible');
            view.classList.remove('invisible');
        } else {
            view.classList.add('invisible');
            view.classList.remove('visible');
        }
    }
}

/**
 * Enables or disables the display of a waiting for callback feedback.
 * @param {bool} waiting - 'true' to enable, 'false' to disable.
 */
function displayWaitingForCallback(waiting) {
    var views = document.getElementsByClassName('vidjil_view');

    for (var i = 0; i < views.length; i++) {
        var view = views[i];
        var imgLoading
        // Update class depending on whether the page is waiting for response or not
        if (waiting) {
            view.classList.add('waitingResponse');
            view.classList.remove('notWaitingResponse');

            // Create loader image
            imgLoading = icon('icon-spin4 animate-spin imgAjaxLoading big-icon', '');
            view.appendChild(imgLoading);
        } else {
            imgLoading = view.getElementsByClassName('imgAjaxLoading');
            if (imgLoading.length !== 0) {
              view.removeChild(imgLoading[0]);
            }
            view.classList.add('notWaitingResponse');
            view.classList.remove('waitingResponse');
        }
    }

    var body = document.getElementById('body');
    body.style.cursor = waiting ?
                        'wait' :
                        'auto';

}

/**
 * Enables or disables the submit button.
 * @param {bool} disabled - 'true' to disable, 'false' to enable.
 */
function disableSubmitButt(disabled) {
    var submitButt = document.getElementById('form_submit');
    submitButt.disabled = disabled;
}

/**
 * Enables or disables the feature buttons.
 * @param {bool} disabled - 'true' to disable, 'false' to enable.
 */
function disableFeatures(disabled) {
    var featuresBtn = document.getElementsByClassName('btn_feature');

    for (var i = 0; i < featuresBtn.length; i++) {
        featuresBtn[i].disabled = disabled;
    }
}

/**
 * Prepares the button listeners.
 */
function prepareButtons() {
    var exportFastaBtn = document.getElementById('btn_exportfasta');
    var form = document.getElementById('form_block');

    exportFastaBtn.addEventListener('click', function () {
        model.exportFasta();
    });

    // Prevent submitting form
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
}

/**
 * Removes all children from Vidjil views.
 */
function cleanVidjilViews() {
    var views = document.getElementsByClassName('vidjil_view');
    for (var i = 0; i < views.length; i++) {
        while (views[i].lastChild) {
            views[i].removeChild(views[i].lastChild);
        }
    }
}

/**
 * Main function called by Vidjil.
 */
function main() {
    // Get DOM elements
    var submitNode = document.getElementById('form_submit');
    var formNode = document.forms.form_sequences;

    // Prepare Vidjil model
    model = new Model();
    segmenter = new Segment('segmenter_container', model);
    scatter = new ScatterPlot('scatter_container', model);
    console = new Com(window.console);
    shortcut = new Shortcut(model)
    setCrossDomainModel(model);

    prepareButtons();
    disableFeatures(true);

    // Parse sequences and add to segmenter
    // displayVidjilViews(false);
    submitNode.addEventListener('click', function () {
        var data = validateForm(formNode);
        if (data) {
            disableSubmitButt(true);
            // Clean views with transition
            var segContainer = document.getElementById(segmenter.id);
            displayVidjilViews(false);
            var funct = function () {
                removePrefixedEvent(segContainer, 'TransitionEnd', funct);
                cleanVidjilViews();
                displayVidjilViews(true);

                var error_callback =  function (xhr, textStatus, exc) { // On error return
                    displayError('We had a problem processing your request.', textStatus, exc);
                    displayWaitingForCallback(false);
                    disableSubmitButt(false);
                };
                
                requestVidjilFile(data,
                    function (response) { // On success return
                        // Hide the views to load them, then display them.
                        var json_response;
                        try {
                            json_response = jQuery.parseJSON(response);
                        } catch(e) {}
                        if (json_response === undefined || "error" in json_response) {
                            error_callback(undefined, json_response.error);
                        } else {
                            displayVidjilViews(false);
                            var funct = function () {
                                removePrefixedEvent(segContainer, 'TransitionEnd', funct);
                                processResult(json_response);
                                displayVidjilViews(true);
                            };
                            addPrefixedEvent(segContainer, 'TransitionEnd', funct);
                        }
                        displayWaitingForCallback(false);
                        disableSubmitButt(false);
                        disableFeatures(false);
                    },
                    error_callback);
                displayWaitingForCallback(true);
            };
            addPrefixedEvent(segContainer, 'TransitionEnd', funct);
        }
    });
}
