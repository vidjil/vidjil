
test("List : edit", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    

    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild
    equal(clone_list.childNodes.length, 4, "clone list length = 4 ('other' + 3 clones) : Ok")


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
    
    list.sortListBySize()
    notEqual(clone_list[1].innerHTML.indexOf("test1"), -1, "sortBySize: Ok")
    notEqual(clone_list[2].innerHTML.indexOf("test2"), -1, "sortBySize: Ok")
    notEqual(clone_list[3].innerHTML.indexOf("test3"), -1, "sortBySize: Ok")
    
    list.sortListByV()
    notEqual(clone_list[1].innerHTML.indexOf("test3"), -1, "sortByV: Ok")
    notEqual(clone_list[2].innerHTML.indexOf("test1"), -1, "sortByV: Ok")
    notEqual(clone_list[3].innerHTML.indexOf("test2"), -1, "sortByV: Ok")
    
    list.sortListByJ()
    notEqual(clone_list[1].innerHTML.indexOf("test3"), -1, "sortByJ: Ok")
    notEqual(clone_list[2].innerHTML.indexOf("test2"), -1, "sortByJ: Ok")
    notEqual(clone_list[3].innerHTML.indexOf("test1"), -1, "sortByJ: Ok")
    
    list.sortListByTop()
    notEqual(clone_list[1].innerHTML.indexOf("test1"), -1, "sortByTop: Ok")
    notEqual(clone_list[2].innerHTML.indexOf("test2"), -1, "sortByTop: Ok")
    notEqual(clone_list[3].innerHTML.indexOf("test3"), -1, "sortByTop: Ok")
    
});

test("List : filter", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    m.updateElemStyle([0,1,2,3]);
    
    stop()
    list.filter("test2");
    setTimeout( function() {
        start()
        ok( !$(clone_list[3]).is(':visible'), "test2 is not filtered : Ok");
        ok( $(clone_list[2]).is(':visible'), "test1 is filtered : Ok");
        list.filter("test1");
        stop()
    }, 100)
    
    
    setTimeout( function() {
        start()
        ok( $(clone_list[3]).is(':visible'), "test2 is filtered : Ok");
        ok( !$(clone_list[2]).is(':visible'), "test1 is not filtered : Ok");
        list.reset_filter(false);
        m.update();
        stop()
    }, 200)

    setTimeout( function() {
        start()
        ok($(clone_list[3]).is(':visible'), "resetFilter : Ok");
        ok($(clone_list[2]).is(':visible'), "resetFilter : Ok");
    }, 300)
    
});

test("List : filter", function() {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var list = new List("list","data",m);
    list.init();
    
    var clone_list = document.getElementById('list').lastChild.childNodes
    m.updateElemStyle([0,1,2,3]);
    
    stop()
    list.filter("test2");
    setTimeout( function() {
        start()
        ok( !$(clone_list[3]).is(':visible'), "test2 is not filtered : Ok");
        ok( $(clone_list[2]).is(':visible'), "test1 is filtered : Ok");
        list.filter("test1");
        stop()
    }, 100)
    
    
    setTimeout( function() {
        start()
        ok( $(clone_list[3]).is(':visible'), "test2 is filtered : Ok");
        ok( !$(clone_list[2]).is(':visible'), "test1 is not filtered : Ok");
        list.reset_filter(false);
        m.update();
        stop()
    }, 200)

    setTimeout( function() {
        start()
        ok($(clone_list[3]).is(':visible'), "resetFilter : Ok");
        ok($(clone_list[2]).is(':visible'), "resetFilter : Ok");
    }, 300)
    
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
    $(clone_list[3]).find($(".starBox"))[0].click()

    equal(m.clone(1).getSize(), 0.1, "size before norm : Ok")
    equal(m.clone(2).getSize(), 0.125, "size before norm : Ok")
    
    m.norm_input.value = 0.25;
    m.norm_button.click();
    
    equal(m.clone(1).getSize(), 0.5, "size after norm : Ok")
    equal(m.clone(2).getSize(), 0.625, "size after norm : Ok")
});



