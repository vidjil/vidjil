
QUnit.module("Segmenter", {
});


QUnit.test("segmenter", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var segment = new Segment("segment", m);   
    segment.init()
    
    //select test
    m.select(0)
    var div0 = document.getElementById("f0");
    assert.notEqual(div0.innerHTML.indexOf("test1"), -1, "select : Ok")

    m.select(1)
    var div1 = document.getElementById("f1");
    assert.notEqual(div1.innerHTML.indexOf("test2"), -1, "select : Ok")
    
    m.select(2)
    var div2 = document.getElementById("f2");
    assert.notEqual(div2.innerHTML.indexOf("test3"), -1, "select : Ok")
    
    m.unselectAll()
    assert.equal(document.getElementById("f0"), null, "unselect : Ok")
    assert.equal(document.getElementById("f1"), null, "unselect : Ok")
    assert.equal(document.getElementById("f2"), null, "unselect : Ok")
    
    //
    assert.deepEqual(segment.findPotentialField(), ["","cdr3","fr1", "5", "id","V-REGION","J-REGION","D-REGION","CDR3-IMGT"], "potentialField : Ok")
    

    m.select(0)
    assert.deepEqual(segment.toFasta(), "> test1 // 5.000%\naaaaaaaaaaaaaaaaaaaAG\n","toFasta :Ok")
    
    
    m.focusIn(0)
    m.updateElem([0])
    assert.equal($("#f0").css("background-color"), "rgb(204, 204, 204)", "focus : Ok")

    m.focusOut()
    m.updateElem([0])
    assert.notEqual($("#f0").css("background-color"), "rgb(204, 204, 204)", "focusOut : Ok")
    
    //stats
    m.unselectAll()
    assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "", "stats (empty) : Ok")

    m.select(0)
    assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 10 reads (5.000%) ", "stats (1 clone) : Ok")

    m.multiSelect([0,1])
    assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "2 clones, 30 reads (15.00%) ", "stats (several clones) : Ok")

    m.unselectAll()
    m.select(2)
    m.changeTime(3)
    assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 3 reads ", "stats (1 clone with few reads) : Ok")
});

QUnit.test("sequence", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.initClones()
    var segment = new Segment("segment", m);
    segment.init()

    segment.addToSegmenter(4)
    seq1 = new Sequence(4, m, segment)
    seq1.load()
    assert.notEqual(seq1.toString().indexOf("catcatcatgatgctacgatcttac"),-1, "unsegmented sequence")

    segment.updateElemStyle([4]) /* Will remove sequence 4 from the segmenter
                                  * as it is not really selected
                                  */
    segment.addToSegmenter(1)
    seq1 = new Sequence(1, m, segment)
    seq1.load()
    seq1_string = seq1.toString()
    assert.notEqual(seq1_string.indexOf(">cccccg<"), -1, "v part of segmented sequence")
    assert.notEqual(seq1_string.indexOf(">tccccccca<"), -1, "n part of segmented sequence")
    assert.notEqual(seq1_string.indexOf(">tca<"), -1, "j part of segmented sequence")
});
