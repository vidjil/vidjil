
var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")

    var m = new Model();
    m.parseJsonData(json_data)
    
test("model : load", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    equal(m.samples.number, 4, "timepoint : number==4");
    equal(m.samples.number, m.samples.original_names.length, "timepoint : check if array have the expected length");
});

test("model : time control", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    
    equal(m.t, 0, "default timepoint = 0");                     // [0,1,2,3] => 0
    deepEqual(m.samples.order, [0,1,2,3], "default order = [0,1,2,3]")
    equal(m.nextTime(), 1, "next timepoint = 1");               // [0,1,2,3] => 1
    equal(m.changeTime(3) , 3, "changeTime to 3");              // [0,1,2,3] => 3
    equal(m.previousTime(), 2, "previous timepoint = 2");       // [0,1,2,3] => 2
    m.switchTimeOrder(0,3)                                      // [3,1,2,0] => 2
    deepEqual(m.samples.order, [3,1,2,0], "switch time order, exchange position of time 0 and 3 => [3,1,2,0]")
    equal(m.nextTime(), 0, "next timepoint = 0");               // [3,1,2,0] => 0
    equal(m.nextTime(), 3, "loop end to start");                // [3,1,2,0] => 3
    equal(m.previousTime(), 0, "loop start to end");            // [3,1,2,0] => 0
    m.changeTimeOrder([3,2,1])                                  // [3,2,1] => 0
    deepEqual(m.samples.order, [3,2,1], "change time order to [3,2,1]")
    
    
    equal(m.getStrTime(0, "sampling_date"), "2014-10-20", "get sampling date")
    equal(m.getStrTime(0, "name"), "Leu+0_BCD", "get time original name")
    equal(m.dateDiffInDays("2014-10-05", "2014-10-10"), "+5", "datediffindays")
    equal(m.getStrTime(1, "delta_date"), "+5", "get day since diag")
    
});

test("model : select/focus", function() {
    var m = new Model();
    m.parseJsonData(json_data,100)
    
    m.select(0)
    equal(m.clone(0).isSelected(), true, "select clone : check if clone has been selected");
    deepEqual(m.getSelected(), [0], "select clone : check selection");
    m.select(2)
    deepEqual(m.getSelected(), [0,2], "select a second clone : check selection");
    m.unselectAll()
    deepEqual(m.getSelected(), [], "unselect all");
    m.multiSelect([0,2,3])
    deepEqual(m.getSelected(), [0,2,3], "multi-select");
    m.unselectAll()
    
    m.focusIn(0)
});

test("model : cluster", function() {
    var m = new Model();
    m.parseJsonData(json_data,100)
    
    equal(m.clone(0).getSize(), 0.05, "clone 0 : getsize = 0.05");
    equal(m.clone(1).getSize(), 0.1, "clone 1 : getsize = 0.1");
    equal(m.clone(2).getSize(), 0.125, "clone 2 : getsize = 0.125");

    m.select(0)
    m.select(1)
    m.merge()
    deepEqual(m.clusters[0], [0,1], "merge 0 and 1: build cluster [0,1]");
    equal(m.clone(0).getSize(), 0.15, "cluster [0,1] : getsize = 0.15");
    
    m.unselectAll()
    m.select(0)
    m.select(2)
    m.merge()
    deepEqual(m.clusters[0], [0,1,2], "merge [0,1] and 2: build cluster [0,1,2]");
    equal(m.clone(0).getSize(), 0.275, "cluster [0,1,2] : getsize = 0.275");
    
    m.split(0,1)
    deepEqual(m.clusters[0], [0,2], "remove clone 1 from cluster [0,1,2]: build cluster [0,2]");
    equal(m.clone(0).getSize(), 0.175, "cluster [0,2] : getsize = 0.175");
    
    m.clusterBy(function(id){return m.clone(id).germline})
    deepEqual(m.clusters[0], [0,1], "clusterBy germline");
    
    m.restoreClusters()
    deepEqual(m.clusters[0], [0,2], "restore previous clusters (made by user with merge whithout using clusterby function)");
    
    m.resetClusters()
    deepEqual(m.clusters, [[0],[1],[2],[3]], "resetClusters");
});













