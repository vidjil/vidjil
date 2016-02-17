
test("Segmenter : ", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var segment = new Segment("segment", m);   
    segment.init()
    
    //select test
    m.select(0)
    var div0 = document.getElementById("f0");
    notEqual(div0.innerHTML.indexOf("test1"), -1, "select : Ok")

    m.select(1)
    var div1 = document.getElementById("f1");
    notEqual(div1.innerHTML.indexOf("test2"), -1, "select : Ok")
    
    m.select(2)
    var div2 = document.getElementById("f2");
    notEqual(div2.innerHTML.indexOf("test3"), -1, "select : Ok")
    
    m.unselectAll()
    equal(document.getElementById("f0"), null, "unselect : Ok")
    equal(document.getElementById("f1"), null, "unselect : Ok")
    equal(document.getElementById("f2"), null, "unselect : Ok")
    
    //
    deepEqual(segment.findPotentialField(), ["","m","cdr3","fr1","3'V-REGION","5'J-REGION","D Region","CDR3-IMGT"], "potentialField : Ok")
    

    m.select(0)
    deepEqual(segment.toFasta(), "> test1 // 5.000%\naaaaaaaaaaaaaaaaaaaAG\n","toFasta :Ok")
    
    
    m.focusIn(0)
    m.updateElem([0])
    equal($("#f0").css("background-color"), "rgb(204, 204, 204)", "focus : Ok")

    m.focusOut()
    m.updateElem([0])
    notEqual($("#f0").css("background-color"), "rgb(204, 204, 204)", "focusOut : Ok")
    
    //stats
    m.unselectAll()
    equal(document.getElementsByClassName("stats_content")[0].innerHTML, "", "stats (empty) : Ok")

    m.select(0)
    equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 10 reads (5.000%) ", "stats (1 clone) : Ok")

    m.multiSelect([0,1])
    equal(document.getElementsByClassName("stats_content")[0].innerHTML, "2 clones, 30 reads (15.00%) ", "stats (several clones) : Ok")

    m.unselectAll()
    m.select(2)
    m.changeTime(3)
    equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 3 reads ", "stats (1 clone with few reads) : Ok")
});
