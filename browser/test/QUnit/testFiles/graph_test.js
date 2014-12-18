
var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")

test("graph: svg path builder", function() {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var graph = new Graph("visu",m)
    graph.max_ratio_between_deltas = 1.0
    graph.init()
    
    equal(graph.constructPath(0), " M 83.2,295.74364485223595 L 103,295.74364485223595 L 301,234.25635514776397 L 499,259.7758861041419 L 697,198.2885963996698 L 716.8,198.2885963996698", "path curve clone 0")
    equal(graph.constructPathR(5), " M 70,547 L 70,357.23093455670795 L 103,357.23093455670795 L 301,295.74364485223595 L 499,357.23093455670795 L 697,295.74364485223595 L 730,295.74364485223595 L 730,547 Z ", "resolution curve 5 reads")
    var stack = new Stack(m)
    stack.compute();
    equal(graph.constructStack(1, stack), " M 103,476.5 L 301,453 L 499,464.75 L 697,429.5 L 697,382.5 L 499,441.25 L 301,359 L 103,429.5 Z", "path stack clone 1") 
});

test("graph: init", function() {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var graph = new Graph("visu",m)
    graph.max_ratio_between_deltas = 1.0
    graph.init()
    
    graph.initData()
    deepEqual(graph.data_data[0], {"active": false,
                                    "color": "#cb4b16",
                                    "name": "dataTest1",
                                    "tab": [45,60,52,60]},
        "initData")
    
    graph.initClones()
    deepEqual(graph.data_clone[0], {
                                    "id": 0,
                                    "name": "line0",
                                    "path": " M 83.2,295.74364485223595 L 103,295.74364485223595 L 301,234.25635514776397 L 499,259.7758861041419 L 697,198.2885963996698 L 716.8,198.2885963996698"
                                    },
        "initClones")
    
    graph.initRes()
    deepEqual(graph.data_res[0], {
                                    "id": 4,
                                    "name": "resolution1",
                                    "path": " M 70,547 L 70,500 L 103,500 L 301,438.512710295528 L 499,500 L 697,438.512710295528 L 730,438.512710295528 L 730,547 Z "
                                    },
        "initRes")
    
    graph.initAxis()
    deepEqual(graph.data_axis[0], {
                                    "orientation": "vert",
                                    "pos": 0.05,
                                    "text": "2014-10-20",
                                    "time": 0,
                                    "type": "axis_v"
                                    },
        "initAxis")
});