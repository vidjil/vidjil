
QUnit.module("Model", {
});

QUnit.test("convert", function(assert) {
    var m = new Model();
    var seg = {
        "4start": 1,  // old format, 0-based
        "4end": 2,
        "3start": 3,
        "3": "J",
        "4": "D",
        "score": 42,
        "5": {"name": "V", "end": 0}, // getConvertedSeg knows that this is an old json (0-based for 5/4/3) by the presence of seg['5']['end']
        "cdr3": {"start": 1, "end": 4}, // 1-based
        "foo": {"start": 18, "stop": 43}
    };
    assert.equal(m.getConvertedBoundary(json_clone3.seg, "5", "end"), 5, "getConvertedBoundary existant: Ok");
    assert.equal(typeof m.getConvertedBoundary(json_clone3.seg, "5", "start"), 'undefined', "getConvertedBoundary non existant: Ok");
    assert.deepEqual(m.getConvertedSegNames(seg['cdr3']), {"start": 1, "stop": 4}, "getConvertedSegNames (before 0-based conversion)")

    assert.deepEqual(m.getConvertedSeg(seg, "3"), {"name": "J", "start": 3}, "getConvertedSeg: Ok");

    assert.deepEqual(m.convertSeg(json_clone3.seg), {"5": {"stop": 5}, "4": {"name": "IGHD2*03"}, "3": {"name": "IGHV4*01", "start": 15}, "junction": {"productive": false, "start": 2, "stop": 13}}, "convertSeg: Ok");
    assert.deepEqual(m.convertSeg(seg), {"3": {"name": "J", "start": 3}, "4": {"name": "D", "start": 1, "stop": 2}, "5": {"name": "V", "stop": 0}, "score": {"val": 42}, "cdr3": {"start": 0, "stop": 3}, "foo": {"start": 17, "stop": 42}}, "convertSeg: Ok");

    assert.deepEqual(m.convertSeg(json_clone1.seg)['5'], {"start": 1, "stop": 5}, "convertSeg on old 0-based 5/4/3 fields");
    assert.deepEqual(m.convertSeg(json_clone2.seg)['5'], {"start": 1, "stop": 5}, "convertSeg on current 1-based fields");
});

QUnit.test("load", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    
    assert.equal(m.samples.number, 4, "parse_json > timepoint : number==4");
    assert.equal(m.samples.number, m.samples.original_names.length, "parse_json > timepoint : check if array have the expected length");

    return

    var ready = assert.async(2)
    // TODO: not working with phantomjs without localhost server
    curdir = "http://localhost/browser/test/QUnit"

    m.loadDataUrl(curdir + "/testFiles/test.vidjil")
    setTimeout( function() {
        assert.equal(m.samples.number, 3, "loadDataUrl from " + curdir + " > timepoint : number==3")
        ready()
    }, 100)
    
    
    
    stop()
    m.loadAnalysisUrl(curdir + "/testFiles/test.analysis")
    setTimeout( function() {
        assert.equal(m.clone(0).tag, 0, "loadAnalysisUrl() : OK")
        assert.equal(m.getPrintableAnalysisName() , "test", "getPrintableAnalysisName : Ok")
        assert.deepEqual(jQuery.parseJSON(m.strAnalysis()).producer, "browser" , "strAnalysis() : OK")
        m.resetAnalysis();
        assert.equal(m.clone(0).tag, 8, "resetAnalysis() : OK")
        ready()
    }, 100)
    
});

QUnit.test("time control", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    
    assert.equal(m.getSampleTime(), "2014-10-20 13:59:02", "getSampleTime : Ok")
    assert.equal(m.getSampleTime(2), "2014-11-20 14:03:13", "getSampleTime : Ok")
    
    assert.equal(m.getSoftVersionTime(), "ha", "getSoftVersionTime : Ok")
    assert.equal(m.getSoftVersionTime(2), "ho", "getSoftVersionTime : Ok")
    
    assert.equal(m.getCommandTime(), "./vidjil -c clones -g germline/ -r 1 -o ./out0 -z 200 -n 5 Diag.fa ", "getCommandTime : Ok")
    assert.equal(m.getCommandTime(2), "./vidjil -c clones -g germline/ -r 1 -o ./out2 -z 200 -n 5 Fu-2.fa ", "getCommandTime : Ok")

    assert.equal(m.getTimestampTime(), "2015-10-20 13:59:02", "getTimestampTime : Ok")
    assert.equal(m.getTimestampTime(2), "2015-11-20 14:03:13", "getTimestampTime : Ok")
    
    assert.equal(m.t, 0, "default timepoint = 0");                     // [0,1,2,3] => 0
    assert.deepEqual(m.samples.order, [0,1,2,3], "default order = [0,1,2,3]")
    assert.equal(m.nextTime(), 1, "next timepoint = 1");               // [0,1,2,3] => 1
    assert.equal(m.changeTime(3) , 3, "changeTime to 3");              // [0,1,2,3] => 3
    assert.equal(m.previousTime(), 2, "previous timepoint = 2");       // [0,1,2,3] => 2
    m.switchTimeOrder(0,3)                                      // [3,1,2,0] => 2
    assert.deepEqual(m.samples.order, [3,1,2,0], "switch time order, exchange position of time 0 and 3 => [3,1,2,0]")
    assert.equal(m.nextTime(), 0, "next timepoint = 0");               // [3,1,2,0] => 0
    assert.equal(m.nextTime(), 3, "loop end to start");                // [3,1,2,0] => 3
    assert.equal(m.previousTime(), 0, "loop start to end");            // [3,1,2,0] => 0
    m.changeTimeOrder([3,2,1])                                  // [3,2,1] => 0
    assert.deepEqual(m.samples.order, [3,2,1], "change time order to [3,2,1]")
    m.changeTimeOrder([0,1,2,3])     
    
    assert.equal(m.getStrTime(0, "sampling_date"), "2014-10-20", "get sampling date")
    assert.equal(m.getStrTime(0, "name"), "Diag", "get time original name")
    assert.equal(m.dateDiffInDays("2014-10-05", "2014-10-10"), "+5", "datediffindays")
    assert.ok(isNaN(m.dateDiffInDays("2014-10-05", "toto")), "datediffindays with a string")
    assert.deepEqual(m.dateDiffMinMax(), {'min': 5 , 'max': 30}, "dateDiffMinMax (min = " + m.dateDiffMinMax()['min']+", max = " + m.dateDiffMinMax()['max']+")")

    var second_timestamp = m.samples.timestamp[1]
    m.samples.timestamp[1] = 'toto'
    assert.deepEqual(m.dateDiffMinMax(), {'min': -1, 'max': -1}, 'dateDiffMinMax with undefined timestamp')
    m.samples.timestamp[1] = second_timestamp

    assert.equal(m.getStrTime(1, "delta_date"), "+5", "get day since diag")
    
});

QUnit.test("top clones", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.initClones()

    assert.equal(m.countRealClones(), 5, "Real clones, expected 5")
    m.displayTop(-10)
    assert.equal(m.top, 0, "Top cannot be negative")
    m.displayTop(m.countRealClones() * 2 + 10)
    assert.equal(m.top, m.countRealClones(), "Top cannot be greater than the number of real clones")

    m.displayTop(1)

    function count_active() {
        var nb_active = 0
        for (i = 0; i < m.clones.length; i++)
            if (m.clones[i].isActive())
                nb_active += 1
        return nb_active
    }
    
    assert.equal(count_active(), 1, "With top 1, there should be one active clone")
    m.changeTime(2)
    assert.equal(count_active(), 1, "With top 1, there should be one active clone")
    m.displayTop(2)
    assert.equal(count_active(), 2, "With top 2, there should be two active clones")
    
});

QUnit.test("select/focus", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    
    m.select(0)
    assert.equal(m.clone(0).isSelected(), true, "select clone : check if clone has been selected");
    assert.deepEqual(m.getSelected(), [0], "select clone : check selection");
    m.select(2)
    assert.deepEqual(m.getSelected(), [0,2], "select a second clone : check selection");
    m.unselectAll()
    assert.deepEqual(m.getSelected(), [], "unselect all");
    m.multiSelect([0,2,3])
    assert.deepEqual(m.getSelected(), [0,2,3], "multi-select");
    m.unselectAll()
    assert.equal(m.findWindow("aaaaaaaaaaaid1aaaaaaa"), 0, "findWindow : Ok")
    assert.equal(m.findWindow("aaaaaaaaaaaplopaaaaaaa"), -1, "findWindow : Ok")
    
    m.focusIn(0)
});

QUnit.test("cluster", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)

    assert.equal(m.clone(0).getSize(), 0.05, "clone 0 : getsize = 0.05");
    assert.equal(m.clone(1).getSize(), 0.1, "clone 1 : getsize = 0.1");
    assert.equal(m.clone(2).getSize(), 0.125, "clone 2 : getsize = 0.125");

    m.select(0)
    m.select(1)
    m.merge()
    assert.deepEqual(m.clusters[0], [0,1], "merge 0 and 1: build cluster [0,1]");
    assert.equal(m.clone(0).getSize(), 0.15, "cluster [0,1] : getsize = 0.15");
    
    m.unselectAll()
    m.select(0)
    m.select(2)
    m.merge()
    assert.deepEqual(m.clusters[0], [0,1,2], "merge [0,1] and 2: build cluster [0,1,2]");
    assert.equal(m.clone(0).getSize(), 0.275, "cluster [0,1,2] : getsize = 0.275");
    
    m.split(0,1)
    assert.deepEqual(m.clusters[0], [0,2], "remove clone 1 from cluster [0,1,2]: build cluster [0,2]");
    assert.equal(m.clone(0).getSize(), 0.175, "cluster [0,2] : getsize = 0.175");
    
    m.clusterBy(function(id){return m.clone(id).germline})
    assert.deepEqual(m.clusters[0], [0,1,3], "clusterBy germline");
    
    m.restoreClusters()
    assert.deepEqual(m.clusters[0], [0,2], "restore previous clusters (made by user with merge whithout using clusterby function)");
    
    m.resetClusters()
    assert.deepEqual(m.clusters, [[0],[1],[2],[3],[4],[5],[6]], "resetClusters");
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadCluster([["id1", "id2"]])
    assert.deepEqual(m.clusters[0], [0,1], "loadCluster() : Ok");
    
});

QUnit.test("system selection", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)

    assert.notEqual(m.system_available.indexOf("IGH"), -1, "IGH system is available")
    assert.notEqual(m.system_available.indexOf("TRG"), -1, "TRG system is available")
    assert.equal(m.system_selected.length, 2, "We just have 2 systems: TRG and IGH")

    assert.deepEqual(m.system_selected, m.system_available, "All systems should be selected by default")

    m.toggle_all_systems(false)
    assert.equal(m.system_selected.length, 0, "unselect all systems")
    assert.equal(m.reads.segmented[0], 0, "no read segmented (no system selected)")

    m.toggle_all_systems(true)
    assert.equal(m.system_selected.length, 2, "select all systems")

    m.toggle_all_systems(false)
    m.toggle_system("toto")
    assert.equal(m.system_selected.length, 0, "no such system -> not added to the list")
    m.toggle_system("IGH")
    assert.equal(m.system_selected.length, 1, "one system selected (IGH)")
    assert.equal(m.reads.segmented[0], 100, "100 reads segmented on IGH")
    assert.notEqual(m.system_selected.indexOf("IGH"), 1, "IGH selected")
});

test("model: analysis sample data application", function() {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.parseJsonAnalysis(analysis_data);
    console.log("###############################################");
    console.log("samples: " + m.samples.names);
    notEqual(m.samples.names[1], "fu0", "missing sample successfully ignored");
    equal(m.samples.names[1], "fu1", "correctly shifted samples");
});











