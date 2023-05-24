

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

QUnit.test("axis size related to locus", function(assert) {

    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    m.reads.germline["IGH+"] = [25, 0, 0, 0] // Vitualy add some IGH+ for "Size in locus (+inc)" axis testing

    var c1 = m.clones[0]
    var c2 = m.clones[1]
    var c3 = m.clones[2]

    // Two locus, TRD and IGH, with 100 reads each
    // C1 and C2 are TRD, C1 have 10 reads, c2 have 20 reads; C3 is IGH with 25 reads

    // Default value of size; all clonotype
    assert.equal(AXIS_DEFAULT["Size"].fct(c1), 0.05, `axis 'Size', correct for clone 0 (get ${AXIS_DEFAULT["Size"].fct(c1)})` )
    assert.equal(AXIS_DEFAULT["Size"].fct(c2), 0.1,  `axis 'Size', correct for clone 1 (get ${AXIS_DEFAULT["Size"].fct(c2)})` )
    assert.equal(AXIS_DEFAULT["Size"].fct(c3), 0.125,  `axis 'Size', correct for clone 1 (get ${AXIS_DEFAULT["Size"].fct(c2)})` )

    // Size relative to locus
    assert.equal(AXIS_DEFAULT["Size in locus"].fct(c1), 0.1, `axis 'Size in locus', correct for clone 0 (get ${AXIS_DEFAULT["Size in locus"].fct(c1)})` )
    assert.equal(AXIS_DEFAULT["Size in locus"].fct(c2), 0.2, `axis 'Size in locus', correct for clone 1 (get ${AXIS_DEFAULT["Size in locus"].fct(c2)})` )
    assert.equal(AXIS_DEFAULT["Size in locus"].fct(c3), 0.25, `axis 'Size in locus', correct for clone 1 (get ${AXIS_DEFAULT["Size in locus"].fct(c2)})` )

    // Size relative to group of locus (locus+incomplete)
    assert.equal(AXIS_DEFAULT["Size in locus (+inc)"].fct(c1), 0.1, `axis 'Size in locus (+inc)', correct for clone 0 (get ${AXIS_DEFAULT["Size in locus (+inc)"].fct(c1)})` )
    assert.equal(AXIS_DEFAULT["Size in locus (+inc)"].fct(c2), 0.2, `axis 'Size in locus (+inc)', correct for clone 1 (get ${AXIS_DEFAULT["Size in locus (+inc)"].fct(c2)})` )
    assert.equal(AXIS_DEFAULT["Size in locus (+inc)"].fct(c3), 0.20, `axis 'Size in locus (+inc)', correct for clone 1 (get ${AXIS_DEFAULT["Size in locus (+inc)"].fct(c2)})` )

});

QUnit.test("Test axis getter name/description", function(assert) {

    var axis = new Axis("V/5' gene")
    var name = "V/5' gene"
    var doc  = "V gene (or 5' segment), gathering all alleles"

    assert.equal( axis.getAxisName(), name, "Axis, get correct name")
    assert.equal( axis.getAxisDescrition(), doc, "Axis, get correct description")

});

