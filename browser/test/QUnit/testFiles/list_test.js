
QUnit.module("List", {
});

QUnit.test("edit", function(assert) {

    assert.expect(2)
    var ready = assert.async()

    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    

    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild
    assert.equal(clone_list.childNodes.length, 7, "clone list length = 7 -> 5 clones+ 2 others (TRG & IGH) : Ok")


    list.editName(1)
    assert.notEqual(list.index[1].getElement("main").innerHTML.indexOf("save"), -1, "open edit clone name : Ok")
    
    setTimeout( function() {
        $("#new_name").val("editName");
    }, 100)
    setTimeout( function() {
        var e = $.Event('keydown');
        e.which = 13; // enter
        e.keyCode = 13; // enter
        $("#new_name").trigger(e);
        //TODO
        //equal(list.index[1].innerHTML, -1, "edited clone name : Ok")
        ready()
    }, 150)
    
    
});

QUnit.test("sort", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    m.changeTime(3)
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    
    list.sortListBy(function(id){return m.clone(id).getSize()});
    assert.notEqual(clone_list[4].innerHTML.indexOf("IGH smaller"), -1, "sortBySize, pos 4; IGH smaller");
    assert.notEqual(clone_list[6].innerHTML.indexOf("TRG smaller"), -1, "sortBySize, pos 6; TRG smaller");
    assert.notEqual(clone_list[2].innerHTML.indexOf("test1"),       -1, "sortBySize, pos 2; test1");
    assert.notEqual(clone_list[3].innerHTML.indexOf("test2"),       -1, "sortBySize, pos 3; test2");
    assert.notEqual(clone_list[0].innerHTML.indexOf("test4"),       -1, "sortBySize, pos 0; test4");
    assert.notEqual(clone_list[1].innerHTML.indexOf("unseg sequence"), -1, "sortBySize, pos 1; unseg sequence");
    assert.notEqual(clone_list[5].innerHTML.indexOf("test3"),       -1, "sortBySize, pos 5; test3");

    list.sortListByV();
    assert.notEqual(clone_list[0].innerHTML.indexOf("test3"),          -1, "sortByV: pos 0; test3");
    assert.notEqual(clone_list[1].innerHTML.indexOf("unseg sequence"), -1, "sortByV: pos 1; unseg sequence");
    assert.notEqual(clone_list[2].innerHTML.indexOf("IGH smaller"),    -1, "sortByV: pos 2; IGH smaller");
    // test1 and test4 both have the same V
    assert.ok(clone_list[3].innerHTML.indexOf("test1")   != -1
             || clone_list[3].innerHTML.indexOf("test4") != -1, "sortByV: pos 3; test2 or test4 present (1/2)");
    assert.ok(clone_list[4].innerHTML.indexOf("test1")   != -1
             || clone_list[4].innerHTML.indexOf("test4") != -1, "sortByV: pos 4; test2 or test4 present (2/2)");
    assert.notEqual(clone_list[5].innerHTML.indexOf("test2"),       -1, "sortByV: pos 5; test2");
    assert.notEqual(clone_list[6].innerHTML.indexOf("TRG smaller"), -1, "sortByV: pos 6; TRG smaller");

    list.sortListByJ();
    assert.notEqual(clone_list[0].innerHTML.indexOf("test3"),          -1, "sortByJ: pos 0; test3");
    assert.notEqual(clone_list[1].innerHTML.indexOf("unseg sequence"), -1, "sortByJ: pos 1; unseg sequence");
    assert.notEqual(clone_list[2].innerHTML.indexOf("IGH smaller"),    -1, "sortByJ: pos 2; IGH smaller");
    // test2 and test4 both have the same J
    assert.ok(clone_list[3].innerHTML.indexOf("test2")   != -1
             || clone_list[3].innerHTML.indexOf("test4") != -1,            "sortByJ: pos 3; test2 or test4 (1/2)");
    assert.ok(clone_list[4].innerHTML.indexOf("test2")   != -1
             || clone_list[4].innerHTML.indexOf("test4") != -1,            "sortByJ: pos 4; test2 or test4 (2/2)");
    assert.notEqual(clone_list[5].innerHTML.indexOf("test1"),       -1,    "sortByJ: pos 5; test1");
    assert.notEqual(clone_list[6].innerHTML.indexOf("TRG smaller"), -1,    "sortByJ: pos 6; TRG smaller");

    list.sortListBy(function(id){return -m.clone(id).top});
    assert.notEqual(clone_list[0].innerHTML.indexOf("smaller"), -1, "sortByTop: pos 0; smaller present (TRG or IGH)");
    assert.notEqual(clone_list[1].innerHTML.indexOf("smaller"), -1, "sortByTop: pos 1; smaller present (TRG or IGH)");
    assert.notEqual(clone_list[2].innerHTML.indexOf("test1"),   -1, "sortByTop: pos 2; test1");
    assert.notEqual(clone_list[3].innerHTML.indexOf("test2"),   -1, "sortByTop: pos 3; test2");
    assert.notEqual(clone_list[4].innerHTML.indexOf("test3"),   -1, "sortByTop: pos 4; test3");
    assert.notEqual(clone_list[5].innerHTML.indexOf("test4"),   -1, "sortByTop: pos 5; test4");
    assert.notEqual(clone_list[6].innerHTML.indexOf("test5"),   -1, "sortByTop: pos 6; test4");
});


QUnit.test("tag/norm", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    
    assert.ok(true,"ok")
    $(clone_list[3]).find($(".starBox")).click()

    assert.equal(m.clone(1).getSize(), 0.1, "size before norm : Ok")
    assert.equal(m.clone(2).getSize(), 0.125, "size before norm : Ok")
    
    m.norm_input.value = 0.25;
    m.norm_button.click();
    
    assert.equal(m.clone(1).getSize(), 0.25, "size after norm : Ok")
    assert.equal(m.clone(2).getSize(), 0.3125, "size after norm : Ok")
});

