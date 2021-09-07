QUnit.module("Filter", {
});

QUnit.test("basic functions", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)

    assert.equal(m.filter.filters.length, 1, "filter list must contain a single filter, found "+ m.filter.filters.length)

    //check
    assert.ok(m.filter.check("Size", ">", 0.5) == -1 , "check: filter does not exist")

    //add
    m.filter.add("Size", ">", 0.5)
    assert.ok(m.filter.check("Size", ">", 0.2) == -1 , "check: similar filter does not exist")
    assert.ok(m.filter.check("Size", ">", 0.5) != -1 , "check: exact filter does exist")
    assert.ok(m.filter.check("Size", ">", undefined) != -1 , "check: filter does exist")

    //remove
    m.filter.remove("Size", ">", undefined)
    assert.ok(m.filter.check("Size", ">", undefined) == -1 , "remove : filter has been removed")

    //toggle
    m.filter.toggle("Size", ">", 0.5)
    assert.ok(m.filter.check("Size", ">", undefined) != -1 , "toggle : filter has been toggled on")
    m.filter.toggle("Size", ">", 0.5)
    assert.ok(m.filter.check("Size", ">", undefined) == -1 , "toggle : filter has been toggld off")
    m.filter.toggle("Size", ">", 0.5)

    //increase
    m.filter.increase("Size", ">", 0.1)
    assert.ok(m.filter.check("Size", ">", 0.6) != -1 , "increase : filter limit value has been increased")

    //decrease
    m.filter.decrease("Size", ">", 0.3)
    assert.ok(m.filter.check("Size", ">", 0.3) != -1 , "decrease : filter limit value has been decreased")

    //all operation should have been done on a single added filter 
    assert.equal(m.filter.filters.length, 2, "filter list must contain 2 filters, found "+ m.filter.filters.length)

    //reset
    m.filter.reset()
    assert.equal(m.filter.filters.length, 1, "reset : filter list must contain a single filter after reset, found "+ m.filter.filters.length)

});

QUnit.test("= / > / <", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.initClones()
    assert.equal(m.filter.filters.length, 1, "filter list must contain a single filter, found "+ m.filter.filters.length)
    
    assert.deepEqual(m.filter.visible(), [0,1,2,3,4],   "default top>50, expect clones 0,1,2,3,4 to be visible, found " + m.filter.visible())

    m.filter.add("Top", ">", 0)
    assert.deepEqual(m.filter.visible(), [],            "Top>0, expect no clones to be visible, found " + m.filter.visible())

    m.filter.add("Top", ">", 1)
    assert.deepEqual(m.filter.visible(), [0],           "Top>1, expect clone 0 to be visible, found " + m.filter.visible())

    m.filter.add("Top", ">", 4)
    assert.deepEqual(m.filter.visible(), [0,1,2,3],     "Top>4 ,expect clone 0,1,2,3 to be visible, found " + m.filter.visible())

    m.filter.add("Top", "<", 2)
    assert.deepEqual(m.filter.visible(), [1,2,3],       "Top>4 && Top<2 ,expect clone 1,2,3 to be visible, found " + m.filter.visible())

    m.filter.add("Top", "=", 3)
    assert.deepEqual(m.filter.visible(), [1,3],         "Top>4 && Top<2 && top=3 ,expect clone 1,3 to be visible, found " + m.filter.visible())

    assert.equal(m.filter.filters.length, 3, "filter list must contain 3 filters, found "+ m.filter.filters.length)

});

QUnit.test("focus/hide", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data,100)
    
    // test focus filter 
    m.multiSelect([0,2,3])
    m.filter.add("Clone", "focus", m.getSelected())
    assert.deepEqual(m.filter.filtered(), [1,4,5,6],    "focus, expect clone 1,4,5,6 to be filtered out, found " + m.filter.filtered())

    // test hide filter
    m.unselectAll()
    m.select(2)
    m.filter.add("Clone", "hide", m.getSelected())
    assert.deepEqual(m.filter.filtered(), [1,2,4,5,6],  "hide, expect clone 1,2,4,5,6 to be filtered out, found " + m.filter.filtered())

    // reset filter
    m.filter.remove("Clone", "focus", undefined)
    m.filter.remove("Clone", "hide", undefined)
    assert.deepEqual(m.filter.filtered(), [5,6],        "reset, expect clone 5,6(distrib) to be filtered out, found " + m.filter.filtered())

    // check filter list content
    assert.equal(m.filter.filters.length, 1, "filter list must contain a single filter, found "+ m.filter.filters.length)

});

QUnit.test("search", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()

    // search for "test1" should filter all clone except 0
    m.filter.add("Clone","search","test1")
    assert.deepEqual(m.filter.visible(), [0],    "expect clone 0 to be visible, found " + m.filter.visible())

    // search for "TGGGGGGg" should filter all clone except 1 and 2
    m.filter.add("Clone","search","TGGGGGGg")
    assert.deepEqual(m.filter.visible(), [1,2],  "expect clones 1,2 to be visible, found " + m.filter.visible())

    // search for "aAaaaAAA" should filter all clone except 0
    m.filter.add("Clone","search","aAaaaAAA")
    assert.deepEqual(m.filter.visible(), [0],    "expect clone 0 to be visible, found " + m.filter.visible())

    // search for "CCCCa" should filter all clone except 1,2,3
    m.filter.add("Clone","search","CCCCa")
    assert.deepEqual(m.filter.visible(), [1,2,3],"expect clones 1,2,3 to be visible, found " + m.filter.visible())
    assert.equal(m.filter.filters.length, 2, "filter list must still contain 2 filters, found "+ m.filter.filters.length)
    
    //reset
    m.filter.remove("Clone", "search", undefined) 
    assert.deepEqual(m.filter.filtered(), [5,6], "expect clones 5,6(distrib) to be filtered out , found " + m.filter.filtered())
    assert.equal(m.filter.filters.length, 1, "filter list must contain 1 filters, found "+ m.filter.filters.length)

});


QUnit.test("search degenerated", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()

    var subseq   = "catcatcatgatgctacg" // clone test5;
    var mismatch = "cattatcatgttgctacg" // 3x mismatch
    var revcomp  = "cgtagcatcatgatgatg"
    var degen    = "catcwwcatgatgctacg"
    var ext5     = "gaagtcagtcatcaggca" // TRGV4; clone test1

    m.filter.add("Clone","search",subseq)
    assert.deepEqual(m.filter.visible(), [4], "subseq, expect clone 4 to be visible, found " + m.filter.visible())

    m.filter.add("Clone","search",degen)
    assert.deepEqual(m.filter.visible(), [4], "degen, expect clone 4 to be visible, found " + m.filter.visible())

    m.search_extend = true
    m.search_ratio_limit = 0.7
    m.filter.add("Clone","search",mismatch)
    assert.deepEqual(m.filter.visible(), [4], "mismatch0.7, expect clone 4 to be visible, found " + m.filter.visible())

    m.search_ratio_limit = 1
    m.update()
    assert.deepEqual(m.filter.visible(), [], "mismatch1.0, expect no clones to be visible, found " + m.filter.visible())

    m.filter.add("Clone","search",revcomp)
    assert.deepEqual(m.filter.visible(), [4], "revcomp, expect clone 4 to be visible, found " + m.filter.visible())

    m.filter.add("Clone","search",ext5)
    assert.deepEqual(m.filter.visible(), [], "ext5, expect no clones to be visible, found " + m.filter.visible())

});