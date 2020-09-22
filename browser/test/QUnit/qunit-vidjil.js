console = new Com(console)

QUnit.assert.includes = function(result, pattern, message ) {
    // Checks that the result includes the pattern
    // TODO: see and use qunit-regexp !
    var res = result.indexOf(pattern) > -1

    this.push(res, result, "{includes} " + pattern, message);
}

QUnit.assert.approx = function(result, expected, margin, message ) {
    // Checks that two floats are about the same
    var res = Math.abs(result-expected) <= margin

    this.push(res, result, expected + "±" + margin, message);
}
