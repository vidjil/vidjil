
test("List : edit", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    

    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild
    equal(clone_list.childNodes.length, 5, "clone list length = 5 -> 3 clones+ 2 others (TRG & IGH) : Ok")


    list.editName(1, list.index[1])
    notEqual(list.index[1].innerHTML.indexOf("save"), -1, "open edit clone name : Ok")
    
    stop()
    setTimeout( function() {
        $("#new_name").val("editName");
    }, 100)
    setTimeout( function() {
        start()
        var e = $.Event('keydown');
        e.which = 13; // enter
        e.keyCode = 13; // enter
        $("#new_name").trigger(e);
        notEqual(list.index[1].innerHTML.indexOf("editName"), -1, "edited clone name : Ok")
    }, 150)
    
    
});

test("List : sort", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    m.changeTime(3)
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    
    list.sortListBySize();
    notEqual(clone_list[0].innerHTML.indexOf("IGH smaller"), -1, "sortBySize: Ok");
    notEqual(clone_list[1].innerHTML.indexOf("TRG smaller"), -1, "sortBySize: Ok");
    notEqual(clone_list[2].innerHTML.indexOf("test1"),       -1, "sortBySize: Ok");
    notEqual(clone_list[3].innerHTML.indexOf("test2"),       -1, "sortBySize: Ok");
    notEqual(clone_list[4].innerHTML.indexOf("test3"),       -1, "sortBySize: Ok");

    list.sortListByV();
    notEqual(clone_list[0].innerHTML.indexOf("test3"),       -1, "sortByV: Ok");
    notEqual(clone_list[1].innerHTML.indexOf("IGH smaller"), -1, "sortByV: Ok");
    notEqual(clone_list[2].innerHTML.indexOf("test1"),       -1, "sortByV: Ok");
    notEqual(clone_list[3].innerHTML.indexOf("test2"),       -1, "sortByV: Ok");
    notEqual(clone_list[4].innerHTML.indexOf("TRG smaller"), -1, "sortByV: Ok");

    list.sortListByJ();
    notEqual(clone_list[0].innerHTML.indexOf("test3"),       -1, "sortByJ: Ok");
    notEqual(clone_list[1].innerHTML.indexOf("IGH smaller"), -1, "sortByJ: Ok");
    notEqual(clone_list[2].innerHTML.indexOf("test2"),       -1, "sortByJ: Ok");
    notEqual(clone_list[3].innerHTML.indexOf("test1"),       -1, "sortByJ: Ok");
    notEqual(clone_list[4].innerHTML.indexOf("TRG smaller"), -1, "sortByJ: Ok");

    list.sortListByTop();
    notEqual(clone_list[0].innerHTML.indexOf("smaller"), -1, "sortByTop: Ok"); // TRG or IGH
    notEqual(clone_list[1].innerHTML.indexOf("smaller"), -1, "sortByTop: Ok"); // TRG or IGH
    notEqual(clone_list[2].innerHTML.indexOf("test1"),       -1, "sortByTop: Ok");
    notEqual(clone_list[3].innerHTML.indexOf("test2"),       -1, "sortByTop: Ok");
    notEqual(clone_list[4].innerHTML.indexOf("test3"),       -1, "sortByTop: Ok");
});

test("List : filters", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var list = new List("list","data",m);
    list.init();

    var clone_list = document.getElementById('list').lastChild.childNodes
    m.updateElemStyle([0,1,2,3]);

    stop()
    list.filter("test1");
    setTimeout( function() {
        start()
        ok(  $(clone_list[4]).is(':visible'), "filter id ('test1') : test1 is visible : Ok");
        ok( !$(clone_list[3]).is(':visible'), "filter id ('test1') : test2 is not visible : Ok");
        list.filter("aAaaaAAA");
        stop()
    }, 100);
    setTimeout( function() {
        start()
        ok(  $(clone_list[4]).is(':visible'), "filter seq ('aAaaaAAA') : test1 is  visible : Ok");
        ok( !$(clone_list[3]).is(':visible'), "filter seq ('aAaaaAAA') : test2 is not visible : Ok");
        list.filter("TGGGGGGg");
        stop()
    }, 200);
    setTimeout( function() {
        start()
        ok( !$(clone_list[4]).is(':visible'), "filter revComp ('TGGGGGGg') : test1 is not visible : Ok");
        ok(  $(clone_list[3]).is(':visible'), "filter revComp ('TGGGGGGg') : test2 is visible : Ok");
        list.filter("CCCCa");
        stop()
    }, 300);
    setTimeout( function() {
        start()
        ok( !$(clone_list[4]).is(':visible'), "filter seq ('CCCCa') : test1 is not visible : Ok");
        ok(  $(clone_list[3]).is(':visible'), "filter seq ('CCCCa') : test2 is visible : Ok");
        list.reset_filter(false);
        m.update();
        stop()
    }, 400);
    setTimeout( function() {
        start()
        ok( $(clone_list[4]).is(':visible'), "reset_filter : test1 is visible : Ok");
        ok( $(clone_list[3]).is(':visible'), "reset_filter : test2 is visible : Ok");
    }, 500);

});

test("List : tag/norm", function() {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    
    ok(true,"ok")
    $(clone_list[3]).find($(".starBox")).click()

    equal(m.clone(1).getSize(), 0.1, "size before norm : Ok")
    equal(m.clone(2).getSize(), 0.125, "size before norm : Ok")
    
    m.norm_input.value = 0.25;
    m.norm_button.click();
    
    equal(m.clone(1).getSize(), 0.25, "size after norm : Ok")
    equal(m.clone(2).getSize(), 0.3125, "size after norm : Ok")
});



