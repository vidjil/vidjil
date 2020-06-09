
QUnit.module("Shortcut", {
});

function keyMock(d) {
    d.preventDefault = function() {}
    return d
};



QUnit.test("shortcuts on scatterplot", function(assert) {

    m = new Model()
    m.parseJsonData(json_data, 100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu", m)
    sp.init()

    var shortcut = new Shortcut(m)
    shortcut.init()
    
    assert.equal(sp.mode, "grid")
    shortcut.checkKey(keyMock({'key': '#'}))
    assert.equal(sp.mode, "bar")

    assert.equal(sp.splitX,"V/5' gene")
    shortcut.checkKey(keyMock({'keyCode': 52})) // Preset 4
    assert.equal(sp.splitX, "clone average read length")

    assert.equal(shortcut.system_shortcuts[76][0], "IGL", "System shortcut for IGL")
    assert.equal(m.system_selected.length, 2, "We have 2 systems, TRG and IGH")

    shortcut.checkKey(keyMock({'keyCode': 71, 'shiftKey': true})) // Locus 'g', only this one
    assert.equal(m.system_selected.length, 1, "We have only 1 system: " + m.system_selected)

    shortcut.checkKey(keyMock({'keyCode': 72, 'shiftKey': false})) // Locus 'h'
    assert.equal(m.system_selected.length, 2, "We have again 2 systems: " + m.system_selected)
})
