

QUnit.assert.includes = function(result, pattern, message ) {
    // Checks that the result includes the pattern
    // TODO: see and use qunit-regexp !
    var res = result.indexOf(pattern) > -1

    this.push(res, res, "{includes} " + pattern, message);
}

