
/**
 * Update checkbox all indeterminate and checked status from sample checkboxes states.
 */
function updateCheckboxAllIndeterminateState() {
    var sampleCheckboxes = document.querySelectorAll('[id^="checkbox_sample_"');
    document.querySelectorAll(".checkbox_all").forEach((checkboxAll) => {
        updateIndeterminateState(checkboxAll, sampleCheckboxes);
    });
}

/**
 * Get the ID of sample checkbox from a sample ID
 * @param {int} sample_id 
 * @returns ID of the corresponding checkbox
 */
function getSampleCheckboxID(sample_id) {
    return `checkbox_sample_${sample_id}`;
}

/**
 * Change checked status of sample checkboxes
 * @param {Array<int>} sample_ids : sample IDs corresponding to the checkboxes to modify
 * @param {boolean} checked : checked status to set
 */
function checkSampleCheckboxes(sample_ids, checked) {
    sample_ids.forEach(
        (sample_id) =>
        (document.getElementById(getSampleCheckboxID(sample_id)).checked =
            checked)
    );
}

/**
 * Reverse the checked status of the checkbox correponding to a sample ID
 * @param {int} sample_id 
 */
function reverseSampleCheckboxChecked(sample_id) {
    checkbox = document.getElementById(getSampleCheckboxID(sample_id));
    checkbox.checked = !checkbox.checked;
}
