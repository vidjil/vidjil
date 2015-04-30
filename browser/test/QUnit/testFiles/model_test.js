
   
test("model : load", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    equal(m.samples.number, 4, "parse_json > timepoint : number==4");
    equal(m.samples.number, m.samples.original_names.length, "parse_json > timepoint : check if array have the expected length");
    
    
    
    stop()
    m.loadDataUrl("http://localhost/browser/test/QUnit/testFiles/test.vidjil")
    setTimeout( function() {
        start()
        equal(m.samples.number, 3, "loadDataUrl > timepoint : number==3")
    }, 100)
    
    
    
    stop()
    m.loadAnalysisUrl("http://localhost/browser/test/QUnit/testFiles/test.analysis")
    setTimeout( function() {
        start()
        equal(m.clone(0).tag, 0, "loadAnalysisUrl() : OK")
        equal(m.getPrintableAnalysisName() , "test", "getPrintableAnalysisName : Ok")
        deepEqual(jQuery.parseJSON(m.strAnalysis()).producer, "browser" , "strAnalysis() : OK")
        m.resetAnalysis();
        equal(m.clone(0).tag, 8, "resetAnalysis() : OK")
    }, 100)
    
});

test("model : time control", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    equal(m.getSampleTime(), "2014-10-20 13:59:02", "getSampleTime : Ok")
    equal(m.getSampleTime(2), "2014-11-20 14:03:13", "getSampleTime : Ok")
    
    equal(m.getSoftVersionTime(), "ha", "getSoftVersionTime : Ok")
    equal(m.getSoftVersionTime(2), "ho", "getSoftVersionTime : Ok")
    
    equal(m.getCommandTime(), "./vidjil -c clones -g germline/ -r 1 -o ./out0 -z 200 -n 5 Diag.fa ", "getCommandTime : Ok")
    equal(m.getCommandTime(2), "./vidjil -c clones -g germline/ -r 1 -o ./out2 -z 200 -n 5 Fu-2.fa ", "getCommandTime : Ok")

    equal(m.getTimestampTime(), "2015-10-20 13:59:02", "getTimestampTime : Ok")
    equal(m.getTimestampTime(2), "2015-11-20 14:03:13", "getTimestampTime : Ok")
    
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
    m.changeTimeOrder([0,1,2,3])     
    
    equal(m.getStrTime(0, "sampling_date"), "2014-10-20", "get sampling date")
    equal(m.getStrTime(0, "name"), "Diag", "get time original name")
    equal(m.dateDiffInDays("2014-10-05", "2014-10-10"), "+5", "datediffindays")
    equal(m.getStrTime(1, "delta_date"), "+5", "get day since diag")
    
});

test("model : top clones", function() {
    var m = new Model();
    m.parseJsonData(json_data,100)

    equal(m.countRealClones(), 3, "Real clones, expected 3")
    m.displayTop(-10)
    equal(m.top, 0, "Top cannot be negative")
    m.displayTop(m.countRealClones() * 2 + 10)
    equal(m.top, m.countRealClones(), "Top cannot be greater than the number of real clones")
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
    equal(m.findWindow("aaaaaaaaaaaid1aaaaaaa"), 0, "findWindow : Ok")
    equal(m.findWindow("aaaaaaaaaaaplopaaaaaaa"), -1, "findWindow : Ok")
    
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
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadCluster([["id1", "id2"]])
    deepEqual(m.clusters[0], [0,1], "loadCluster() : Ok");
    
});

test("model: system selection", function() {
    var m = new Model();
    m.parseJsonData(json_data, 100)

    notEqual(m.system_available.indexOf("IGH"), -1, "IGH system is available")
    notEqual(m.system_available.indexOf("TRG"), -1, "TRG system is available")
    equal(m.system_selected.length, 2, "We just have 2 systems: TRG and IGH")

    deepEqual(m.system_selected, m.system_available, "All systems should be selected by default")

    m.toggle_all_systems(false)
    equal(m.system_selected.length, 0, "unselect all systems")
    equal(m.reads.segmented[0], 0, "no read segmented (no system selected)")

    m.toggle_all_systems(true)
    equal(m.system_selected.length, 2, "select all systems")

    m.toggle_all_systems(false)
    m.toggle_system("toto")
    equal(m.system_selected.length, 0, "no such system -> not added to the list")
    m.toggle_system("IGH")
    equal(m.system_selected.length, 1, "one system selected (IGH)")
    equal(m.reads.segmented[0], 100, "100 reads segmented on IGH")
    notEqual(m.system_selected.indexOf("IGH"), 1, "IGH selected")
});











