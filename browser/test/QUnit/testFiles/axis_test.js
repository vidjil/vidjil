

QUnit.module("Axis", {
});


QUnit.test("axis gene length", function(assert) {
    
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    //TODO
    var c1 = m.clones[0]
    var c2 = m.clones[1]
    var c3 = m.clones[2]

    AXIS_DEFAULT["V/5' length"].fct(c1)
    assert.equal(AXIS_DEFAULT["V/5' length"].fct(c1), 5, "axis 'v/5 length', correct for clone 0" )
    assert.equal(AXIS_DEFAULT["V/5' length"].fct(c2), 5, "axis 'v/5 length', correct for clone 1" )


    assert.equal(AXIS_DEFAULT["J/3' length"].fct(c1), 15, "axis 'j/3 length', correct for clone 0" )
    assert.equal(AXIS_DEFAULT["J/3' length"].fct(c2),  3, "axis 'j/3 length', correct for clone 1" )

    // Modify c0 genes positions values; add start/stop for 5 and 3 genes
    c1.seg["5"].start = 2
    c1.seg["3"].start = 18
    assert.equal(AXIS_DEFAULT["V/5' length"].fct(c1), 3, "axis 'v/5 length', correct for clone 0 after resize" )
    assert.equal(AXIS_DEFAULT["J/3' length"].fct(c2), 3, "axis 'j/3 length', correct for clone 1 after resize" )
});

