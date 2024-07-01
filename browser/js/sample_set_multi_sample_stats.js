
const statsColumnLocalStorageName = "statColumnsToHide"
const statsTableId = "db_table_container"

var hideColumn = function(element) {
  if (element.style.display != "none") {
    element.style.display = "none"
  }
}

var showDisplay = function (element) {
  if (element.style.display != "") {
    element.style.display = ""
  }
}

/**
 * Function that allow to call `toggleDisplay` on each cells of a table for a given column
 *  @param {string} tableId - Specific id of the table to use
 *  @param {integer} columnToToggle - Specific position of the column to switch
 *  @param {Storage} localStorage - Storage to use for saving config
 */
function toggleColumn(columnToToggle, localStorage) {
  // Get stored values
  let columnsToHide = getStoredColumnsToHide()

  positionInArray = columnsToHide.indexOf(columnToToggle)
  if (positionInArray > -1) {
    // Already hidden, show
    showIthColumn(columnToToggle)
    columnsToHide.splice(positionInArray, 1)
  } else {
    // Not hidden, hide
    hideIthColumn(columnToToggle)
    columnsToHide.push(columnToToggle)
  }

  if (localStorage != undefined) {
    localStorage.setItem(statsColumnLocalStorageName, JSON.stringify(columnsToHide))
  }
}

function getStoredColumnsToHide(defaultConfig = []) {
  let columnsToHide = defaultConfig
  if (localStorage != undefined) {
    if (localStorage.getItem(statsColumnLocalStorageName)) {
      // Get stored config
      columnsToHide = JSON.parse(localStorage.getItem(statsColumnLocalStorageName))
    } else {
      // store default config
      localStorage.setItem(statsColumnLocalStorageName, JSON.stringify(columnsToHide))
    }
  }
  return columnsToHide
}

function updateDisplayAccordingToConfig(defaultConfig = []) {
  let columnsToHide = getStoredColumnsToHide(defaultConfig)
  let numberOfColumns = $(`#${statsTableId} thead:first th`).length

  for (let i = 1; i <= numberOfColumns; i++) {
    if (columnsToHide.indexOf(i) > -1) {
      hideIthColumn(i)
    } else {
      showIthColumn(i)
    }
  }
}

function hideIthColumn(i) {
  document.querySelectorAll(`#${statsTableId} th:nth-child(${i})`).forEach(hideColumn)
  document.querySelectorAll(`#${statsTableId} td:nth-child(${i})`).forEach(hideColumn)
  let checkbox = getIthCheckbox(i)
  checkbox.checked = false
}

function showIthColumn(i) {
  document.querySelectorAll(`#${statsTableId} th:nth-child(${i})`).forEach(showDisplay)
  document.querySelectorAll(`#${statsTableId} td:nth-child(${i})`).forEach(showDisplay)
  let checkbox = getIthCheckbox(i)
  checkbox.checked = true
}

function getIthCheckbox(i) {
  let checkbox = document.getElementById("checkbox_header_" + i);
  return checkbox
}