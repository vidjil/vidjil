

QUnit.test("Speed: many clones", function(assert) {
    
    var data = dataWithManyClones(42);
    assert.equal(data["clones"].length, 42, "dataWithManyClones -> 42");
});


QUnit.test("Speed: without views", function(assert) {
    
    var m = new Model();

    console.log(speedTest(m));
    assert.equal(m.clones.length, 101, "");
});

QUnit.test("Speed: with views", function(assert) {

    var m = new Model();
    
    var sp = new ScatterPlot("visu", m);
    var segment = new Segment("segment", m);   
    var list = new List("list", "data", m);
    
    console.log(speedTest(m));
    assert.equal(m.clones.length, 101, "");
});
