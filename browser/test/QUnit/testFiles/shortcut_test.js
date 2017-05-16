
QUnit.module("Shortcut", {
});

function keyMock(d) {
    d.preventDefault = function() {}
    return d
};



QUnit.test("shortcuts on scatterplot", function(assert) {

    var m = new Model(m)
    m.parseJsonData(json_data, 100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu", m)
    sp.init()

    var shortcut = new Shortcut(m)
    
    assert.equal(sp.mode, sp.MODE_GRID)
    shortcut.checkKey(keyMock({'key': '#'}))
    assert.equal(sp.mode, sp.MODE_BAR)
})
           

    
