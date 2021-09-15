QUnit.module("Color", {
});

QUnit.test("Clone color", function(assert) {
    /* check clone color is correctly updated either AxisColor or clone value is modified */
    
    var m = new Model()
    m.parseJsonData(json_data,100)
    var c1 = m.clone(0)
    m.initClones()

    // check default color // colorAxis = "Tag"  // clone tag = 8
    assert.equal(c1.getTag(), 8, "getTag() >> default tag : 8");
    c1.updateColor()
    assert.equal(c1.getColor(), "", "getColor() >> default tag color : ");
    
    // change clone tag -> 5
    c1.changeTag(5)
    c1.updateColor()
    assert.equal(c1.getTag(), 5, "changeTag() >> tag : 5");
    assert.equal(c1.getColor(), "#2aa198", "getColor() >> default tag color : ");
    
    // change color axis -> "Size"
    m.color.set("Size")
    c1.updateColor()
    assert.equal(c1.getColor(), "rgb(0, 236, 58)", "getColor() >> abundance color : ");
    
});

QUnit.test("basic function", function(assert) {
    /* test basic function used to generate color (used in some axis_conf.js) */

    assert.equal(colorGeneratorBool(), '', "colorGeneratorBool: undefined");

    assert.equal(colorGeneratorBool(true), colorGeneratorBool("TRUE"), "colorGeneratorBool: str input TRUE");
    assert.equal(colorGeneratorBool(true), colorGeneratorBool("true"), "colorGeneratorBool: str input true");
    assert.equal(colorGeneratorBool(true), "#2aa198", "colorGeneratorBool: default color for true");

    assert.equal(colorGeneratorBool(false), colorGeneratorBool("FALSE"), "colorGeneratorBool: str input FALSE");
    assert.equal(colorGeneratorBool(false), colorGeneratorBool("false"), "colorGeneratorBool: str input false");
    assert.equal(colorGeneratorBool(false), "#d33682", "colorGeneratorBool: default color for false");
 

    assert.equal(colorGeneratorString() , '', "colorGeneratorStr: undefined");
    assert.notEqual(colorGeneratorString("AAAA") , colorGeneratorString("BBBB") , "colorGeneratorStr: generate a different color for each str");

});

QUnit.test("Axis function", function(assert) {
    /* test function used to generate color (defined in axis_conf.js) */
    var m = new Model()
    m.parseJsonData(json_data,100)
    var c1 = m.clone(0)
    m.initClones()

    var a = new Axis("Sequence length").compute(100)
    assert.equal(a.getColor(0) ,   "rgb(0, 170, 255)",  "Sequence length color: min");
    assert.equal(a.getColor(0.5) , "rgb(0, 238, 0)",    "Sequence length color: middle");
    assert.equal(a.getColor(1) ,   "rgb(255, 0, 0)",    "Sequence length color: max");
    assert.equal(a.getColor(undefined), undefined,      "Sequence length color: undefined");

    var c1_axis_pos = a.getPos(c1)
    assert.equal(a.getColor(undefined, c1) ,   "rgb(0, 174, 249)",     "Sequence length color: clone 1");
    assert.equal(a.getColor(undefined, c1) ,   a.getColor(c1_axis_pos),"Sequence length color: clone 1 by axis position ");
    
});