/**
 * Update all intermediate state for the custom page
 * @param {Dictionary<string, Array<int>>} configSamples
 */
function updateSampleSetCustomIntermediateStates(configSamples) {
  updateCheckboxAllIndeterminateState();
  const mapIdToCheckboxSelector = (id) => "#" + getSampleCheckboxID(id);
  for (const [name, ids] of Object.entries(configSamples)) {
    let configCheckbox = document.getElementById(`checkbox_config_${name}`);
    let sampleCheckboxIds = ids.map(mapIdToCheckboxSelector).join(",");
    let sampleCheckboxes = document.querySelectorAll(sampleCheckboxIds);
    updateIndeterminateState(configCheckbox, sampleCheckboxes);
  }
}

/**
 * Update checkbox all indeterminate and checked status from sample checkboxes states.
 */
function updateCheckboxAllIndeterminateState() {
  let sampleCheckboxes = document.querySelectorAll('[id^="checkbox_sample_"');
  document.querySelectorAll(".checkbox_all").forEach((checkboxAll) => {
    updateIndeterminateState(checkboxAll, sampleCheckboxes);
  });
}

/**
 * Get the ID of sample checkbox from a sample ID
 * @param {int} sample_id
 * @returns ID of the corresponding checkbox
 */
let getSampleCheckboxID = function (sample_id) {
  return `checkbox_sample_${sample_id}`;
};

/**
 * Change checked status of sample checkboxes
 * @param {Array<int>} sample_ids : sample IDs corresponding to the checkboxes to modify
 * @param {boolean} checked : checked status to set
 * @param {Dictionary<string, Array<int>>} configSamples
 */
function checkSampleCheckboxes(sample_ids, checked, configSamples) {
  sample_ids.forEach(
    (sample_id) =>
      (document.getElementById(getSampleCheckboxID(sample_id)).checked =
        checked)
  );
  updateSampleSetCustomIntermediateStates(configSamples);
}

/**
 * Reverse the checked status of the checkbox correponding to a sample ID
 * @param {int} sample_id
 * @param {Dictionary<string, Array<int>>} configSamples
 */
function reverseSampleCheckboxChecked(sample_id, configSamples) {
  checkbox = document.getElementById(getSampleCheckboxID(sample_id));
  checkbox.checked = !checkbox.checked;
  updateSampleSetCustomIntermediateStates(configSamples);
}
