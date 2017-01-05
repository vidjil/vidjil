var pfx = ["webkit", "moz", "MS", "o", ""];

/**
 * Adds a retrocompatible event listener.
 * @param {object} element - the element to add the event to.
 * @param {string} type - the type of event to listen to.
 * @param {function} callback - the function to call when the event is fired.
 */
function addPrefixedEvent(element, type, callback) {
	for (var p = 0; p < pfx.length; p++) {
		if (!pfx[p]) {
            type = type.toLowerCase();
        }

		element.addEventListener(pfx[p]+type, callback, false);
	}
}

/**
 * Removes a retrocompatible event listener.
 * @param {object} element - the element to remove the event from.
 * @param {string} type - the type of event to listen to.
 * @param {function} callback - the function to call when the event is fired.
 */
function removePrefixedEvent(element, type, callback) {
	for (var p = 0; p < pfx.length; p++) {
		if (!pfx[p]) {
            type = type.toLowerCase();
        }

		element.removeEventListener(pfx[p]+type, callback, false);
	}
}
