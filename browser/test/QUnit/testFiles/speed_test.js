
QUnit.module("Speed", {
});


QUnit.test("many clones", function(assert) {
    
    var data = dataWithManyClones(42);
    assert.equal(data["clones"].length, 42, "dataWithManyClones -> 42");
});


QUnit.test("without views", function(assert) {
    
    var m = new Model();

    console.log(speedTest(m));
    assert.equal(m.clones.length, 101, "");
});

QUnit.test("with views", function(assert) {

    var m = new Model();
    
    var sp = new ScatterPlot("visu", m);
    var segment = new Aligner("segment", m);   
    var list = new List("list", "data", m);
    
    console.log(speedTest(m));
    assert.equal(m.clones.length, 101, "");
});
