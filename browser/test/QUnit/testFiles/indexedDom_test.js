QUnit.module("IndexedDom", {
});

QUnit.test("get/set", function(assert) {

    //init model
    var m = new Model()
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    //init list view
    var list = new List("list","data",m)
    list.init()

    //create indexedDom for clones 1/2/3 in list
    var indexedDom1 = new IndexedDom(document.getElementById("1"))
    var indexedDom2 = new IndexedDom(document.getElementById("2"))
    var indexedDom3 = new IndexedDom(document.getElementById("3"))


    //content
    //set a custom content using indexedDom
    indexedDom1.content("nameBox", "hello")
    //check if custom content is really in dom using native js
    assert.equal(document.getElementById("1").getElementsByClassName("nameBox")[0].innerHTML,
                 "hello", 
                 "update dom content using indexedDom")

    //adding classname
    indexedDom1.classname("nameBox", "nameBox customClassname")
    assert.notEqual(document.getElementById("1").getElementsByClassName("customClassname")[0], 
                    undefined, 
                    "add a classname using indexedDom")
    
    //removing classname
    indexedDom1.classname("nameBox", "nameBox")
    assert.equal(document.getElementById("1").getElementsByClassName("customClassname")[0], 
                 undefined, 
                 "removing a classname using indexedDom")

    //display hide
    indexedDom2.display("systemBox", "none")
    assert.equal(document.getElementById("2").getElementsByClassName("systemBox")[0].style.display, 
                 "none", 
                 "hide a dom element using indexedDom")
    
    //display show
    indexedDom2.display("systemBox", "block")
    assert.equal(document.getElementById("2").getElementsByClassName("systemBox")[0].style.display, 
                "block", 
                "hide a dom element using indexedDom")
    
    //color
    indexedDom3.color("systemBox", "blue")
    assert.equal(document.getElementById("3").getElementsByClassName("systemBox")[0].style.color, 
                 "blue", 
                 "change style color using indexedDom")

    //title
    indexedDom3.title("systemBox", "popipo")
    assert.equal(document.getElementById("3").getElementsByClassName("systemBox")[0].title, 
                 "popipo", 
                 "change title using indexedDom")

    //getElementByclassname 
    assert.equal(document.getElementById("3").getElementsByClassName("systemBox")[0], 
                 indexedDom3.getElement("systemBox"), 
                 "access dom using indexedDom")

});

QUnit.test("speed", function(assert) {

    //init model
    var m = new Model()
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    //init list view
    var list = new List("list","data",m)
    list.init()

    //create indexedDom for clone 1 in list
    var indexedDom1 = new IndexedDom(document.getElementById("1"))

    accessTime1 = []
    accessTime2 = []
    accessTime3 = []

    for (i = 0; i<10000; i++){
        startTime = window.performance.now()
        indexedDom1.content("nameBox", "hello")     // first access to nameBox(not indexed yet) + update (high cost)
        accessTime1.push(window.performance.now()- startTime)

        startTime = window.performance.now()
        indexedDom1.content("nameBox", "hola")      // second access to nameBox(already indexed) + update (moderate cost)
        accessTime2.push(window.performance.now()- startTime)

        startTime = window.performance.now()
        indexedDom1.content("nameBox", "hola")      // third access to nameBox(already indexed) + update not needed (no cost)
        accessTime3.push(window.performance.now()- startTime)

        indexedDom1.clear("main") //drop all indexed stuff 
    }

    //sort times
    accessTime1.sort(function(a,b) { return a - b;})
    accessTime2.sort(function(a,b) { return a - b;})
    accessTime3.sort(function(a,b) { return a - b;})

    //median
    mAccessTime1 = (accessTime1[Math.floor(accessTime1.length/2)]*1000).toFixed(4)
    mAccessTime2 = (accessTime2[Math.floor(accessTime2.length/2)]*1000).toFixed(4)
    mAccessTime3 = (accessTime3[Math.floor(accessTime3.length/2)]*1000).toFixed(4)

    //average
    aAccessTime1 = 0
    for (i = 0; i<accessTime1.length; i++) aAccessTime1+=accessTime1[i]
    aAccessTime1 = (aAccessTime1*1000/accessTime1.length)

    aAccessTime2 = 0
    for (i = 0; i<accessTime2.length; i++) aAccessTime2+=accessTime2[i]
    aAccessTime2 = (aAccessTime2*1000/accessTime2.length)

    aAccessTime3 = 0
    for (i = 0; i<accessTime3.length; i++) aAccessTime3+=accessTime3[i]
    aAccessTime3 = (aAccessTime3*1000/accessTime3.length)

    assert.ok(aAccessTime1 > aAccessTime2, "dom access using indexed dom after first use are faster "+aAccessTime1.toFixed(5)+"ns > "+aAccessTime2.toFixed(5)+"ns"+
                                            "  ("+(((aAccessTime1/aAccessTime2)-1)*100).toFixed(0)+"% faster)" );
    assert.ok(aAccessTime2 > aAccessTime3, "avoid dom access for unneccesary update "+aAccessTime2.toFixed(5)+"ns > "+aAccessTime3.toFixed(5)+"ns"+
                                            "  ("+(((aAccessTime2/aAccessTime3)-1)*100).toFixed(0)+"% faster)" );

});