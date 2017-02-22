
QUnit.module("Graph", {
});

QUnit.test("svg path builder", function(assert) {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var graph = new Graph("visu",m)
    graph.max_ratio_between_deltas = 1.0
    graph.init()
    
    assert.equal(graph.constructPath(0), " M 70.02,40.565412010323904 L 70.05,40.565412010323904 L 70.35,40.434587989676096 L 70.65,40.488884864051364 L 70.95,40.35806084340355 L 70.98,40.35806084340355")
    assert.equal(graph.constructPathR(5), " M 70,41.1 L 70,40.69623603097172 L 70.05,40.69623603097172 L 70.35,40.565412010323904 L 70.65,40.69623603097172 L 70.95,40.565412010323904 L 71,40.565412010323904 L 71,41.1 Z ", "resolution curve 5 reads")
    var stack = new Stack(m)
    stack.compute();
    assert.equal(graph.constructStack(1, stack), " M 70.05,40.95 L 70.35,40.9 L 70.65,40.925 L 70.95,40.85 L 70.95,40.75 L 70.65,40.875 L 70.35,40.7 L 70.05,40.85 Z", "path stack clone 1") 
});

QUnit.test("init", function(assert) {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var graph = new Graph("visu",m)
    graph.max_ratio_between_deltas = 1.0
    graph.init()
    
    graph.initData()
    assert.deepEqual(graph.data_data[0], {"active": false,
                                    "color": "#cb4b16",
                                    "name": "dataTest1",
                                    "tab": [45,60,52,60]},
        "initData")
    
    graph.initClones()
    assert.deepEqual(graph.data_clone[0], {
                                      "id": 0,
                                      "name": "line0",
                                      "path": " M 70.02,40.565412010323904 L 70.05,40.565412010323904 L 70.35,40.434587989676096 L 70.65,40.488884864051364 L 70.95,40.35806084340355 L 70.98,40.35806084340355"
                                    },
        "initClones")
    
    graph.initRes()
    assert.deepEqual(graph.data_res[0], 	{
                                      "id": 7,
                                      "name": "resolution1",
                                      "path": " M 70,41.1 L 70,41 L 70.05,41 L 70.35,40.869175979352185 L 70.65,41 L 70.95,40.869175979352185 L 71,40.869175979352185 L 71,41.1 Z "
                                    },
        "initRes")
    
    graph.initAxis()
    assert.deepEqual(graph.data_axis[0],   {
                                      "class": "graph_time2",
                                      "orientation": "vert",
                                      "pos": 0.05,
                                      "text": "2014-10-20",
                                      "time": 0,
                                      "type": "axis_v2"
                                    },
        "initAxis")
});