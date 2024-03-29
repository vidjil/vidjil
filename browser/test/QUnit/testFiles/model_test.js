
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

    assert.deepEqual(m.convertSeg(json_clone3.seg), {"5": {"stop": 5}, "4": {"name": "IGHD2*03"}, "3": {"name": "IGHV4*01", "start": 15}, "junction": {"aa": "WKIC", "productive": false, "unproductive": "out-of-frame", "start": 2, "stop": 13}, "somefeature": { "seq": "aaaattt" }}, "convertSeg: Ok");
    assert.deepEqual(m.convertSeg(seg), {"3": {"name": "J", "start": 3}, "4": {"name": "D", "start": 1, "stop": 2}, "5": {"name": "V", "stop": 0}, "score": {"val": 42}, "cdr3": {"start": 0, "stop": 3}, "foo": {"start": 17, "stop": 42}}, "convertSeg: Ok");

    assert.deepEqual(m.convertSeg(json_clone1.seg)['5'], {"start": 1, "stop": 5}, "convertSeg on old 0-based 5/4/3 fields");
    assert.deepEqual(m.convertSeg(json_clone2.seg)['5'], {"start": 1, "stop": 5, 'delRight':18}, "convertSeg on current 1-based fields");
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


QUnit.test("load with new order && stock_order", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100) //[ "Diag.fa", "Fu-1.fa", "Fu-2.fa", "Fu-3.fa" ]
    m.initClones()
    m.parseJsonAnalysis(JSON.parse(JSON.stringify(analysis_data_stock_order)))  // [ "Diag.fa", "Fu-0.fa", "Fu-1.fa", "Fu-2.fa" ]
    m.initClones()
    // fu-3 is replaced with fu-0
    // "order": [ 3, 0, 1 ],
    // "stock_order": [2, 3, 0, 1 ]
    // become ==> "order": [ 2, 0, 3 ] and "stock_order": [1, 2, 0, 3 ]

    assert.deepEqual(m.samples.order,         [ 2, 0, 3], "Correct order after loading" )
    assert.deepEqual(m.samples.stock_order, [1, 2, 0, 3], "Correct stock_order after loading" )
    assert.equal(m.t, 2, "Correct time selected after analysis loading")

    // Note, respective clone 0 size: 0.05, 0.1, 0.075, 0.15
    assert.equal( m.clones[0].getSize(), m.clones[0].getSize(2), "clone 0 hve size corresponding to timepoint 2 (loading order)")

    // Test loading file with duplicate sample present in order field of analysis
    var m = new Model();
    m.parseJsonData(json_data, 100)
    m.initClones()
    // Copy and modify
    analysis_data_stock_order_with_error =  JSON.parse(JSON.stringify(analysis_data_stock_order))
    analysis_data_stock_order_with_error.samples.order = [3, 3, 0, 1] // become [2, 0]
    m.parseJsonAnalysis(analysis_data_stock_order_with_error)
    m.initClones()

    assert.deepEqual(m.samples.order,          [2, 0, 3], "Correct order after loading analysis with dusplicate sample in order" )
    assert.deepEqual(m.samples.stock_order, [1, 2, 0, 3], "Correct stock_order after loading analysis with dusplicate sample in order" )
    
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
    m.unselect(2);
    assert.deepEqual(m.getSelected(), [0, 3], "unselect");
    m.unselect(5);
    assert.deepEqual(m.getSelected(), [0, 3], "unselect");
    m.unselectAll()
    assert.equal(m.findWindow("aaaaaaaaaaaid1aaaaaaa"), 0, "findWindow : Ok")
    assert.equal(m.findWindow("aaaaaaaaaaaplopaaaaaaa"), -1, "findWindow : Ok")
    
    m.focusIn(0)
});



QUnit.test("correlate", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    assert.equal(m.clone(0).id, 'id1')
    assert.equal(m.clone(1).id, 'id2')
    assert.equal(m.clone(2).id, 'id3')
    assert.equal(m.clone(3).id, 'id4')
    assert.equal(m.clone(4).id, 'id5')

    m.selectCorrelated(4, 0.99)
    assert.deepEqual(m.getSelected(), [3, 4], "Clone 3 is strongly correlated to clone 4");

    m.selectCorrelated(4)
    assert.deepEqual(m.getSelected(), [2, 3, 4], "Clones 2 and 3 are correlated to clone 4");

    m.selectCorrelated(0, 0.99)
    assert.deepEqual(m.getSelected(), [0, 1], "Clone 1 strongly (negatively) correlated to clone 0");
})


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
    assert.ok(! m.clones[1].isSelected(), "Merged clone should not be selected");
    assert.ok(m.clones[0].isSelected(), "Main merged clone should not be selected");

    
    m.unselectAll()
    m.select(0)
    m.select(2)
    m.merge()
    assert.deepEqual(m.clusters[0], [0,1,2], "merge [0,1] and 2: build cluster [0,1,2]");
    assert.equal(m.clone(0).getSize(), 0.275, "cluster [0,1,2] : getsize = 0.275");

    m.merge([0,4])
    assert.deepEqual(m.clusters[0], [0,1,2,4], "merge [0,1,2] and 4 -> [0,1,2,4]");

    m.restoreClusters()
    assert.deepEqual(m.clusters[0], [0,1,2], "restore previous clusters -> [0,1,2]");
    
    m.split(0,1)
    assert.deepEqual(m.clusters[0], [0,2], "remove clone 1 from cluster [0,1,2]: build cluster [0,2]");
    assert.equal(m.clone(0).getSize(), 0.175, "cluster [0,2] : getsize = 0.175");
    
    m.clusterBy(function(id){return m.clone(id).germline})
    assert.deepEqual(m.clusters[0], [0,1,3], "clusterBy germline");

    m.break([0])
    assert.deepEqual(m.clusters[1], [1], "break [0] -> [1] is alone");

    m.restoreClusters()
    m.restoreClusters()
    assert.deepEqual(m.clusters[0], [0,2], "restore previous clusters -> [0,2]");
    
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

QUnit.test("model: analysis sample data application", function(assert) {
    m = new Model();
    var sp = new ScatterPlot("visu", m);


    var ff = m.getFilteredFields({'log':[], 'producer':[], 'foobar':[], 'id': [], 'barfoo':[]});
    var bool = ff.indexOf('log') == -1 && ff.indexOf('producer') == -1 && ff.indexOf('id') == -1;
    assert.equal(bool, true, "sample fields filtered");
    assert.equal(ff.length, 2, "remaining sample fields");

    var dict = m.buildDict(["1", "3", "4", "6"], ["1", "3", "4", "5"]);
    assert.deepEqual(dict, {"1":{}, "3":{}, "4":{}, "5":{}, "6":{}}, "build a dict of all present ids");

    var dest = {"1": {}, "2": {}};
    var src = {"id": ["1", "2", "3"], "val": ["f", "o", "o"]};
    var field = m.copyField(dest, src, "val");
    assert.deepEqual(field, {"1": {"val": "f"}, "2": {"val": "o"}}, "copy the contents of analysis sample fields");

    // Here sample "3" is deleted as it is not present, and sample "4" is added.
    // It take position of 3
    dest = {"original_names": ["1", "4", "2"], "val": ["a", "b", "c"], "lav": ["c", "b", "a"]};
    src = {"id": ["1", "2", "3"], "val": ["f", "o", "o"]};
    var res = m.copySampleFields(dest, src);
    var expected = {"original_names": ["1", "4", "2"], "val": ["f", "b", "o"], "lav": ["c", "b", "a"],"order": [0, 2, 1],"stock_order": [0, 2, 1]};
    assert.deepEqual(res, expected, "copy all relevant fields from analysis to samples");

    m.parseJsonData(json_data, 100);
    m.parseJsonAnalysis(analysis_data);

    assert.notEqual(m.samples.names[1], "fu0", "missing sample successfully ignored");
    assert.equal(m.samples.names[1], "fu1", "correctly shifted samples");

    assert.deepEqual(m.samples.order, [0,1,2,3], "order converted");
});



QUnit.test("model: primer detection", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)

    // primer set loading
    assert.equal(typeof m.primersSetData, 'object', "primers are loaded inside model")

    // model primer setting
    // assert.equal(m.switchPrimersSet("no set"), 1, "primer set doesn't exist")
    assert.equal(m.switchPrimersSet("ecngs"), 0, "primer set 'ecngs' exist & are set")

    // Test switch to a Qunit dataset
    m.primersSetData = primersSetData // no primer for IGH, One primer for TRG
    assert.equal(m.switchPrimersSet("primer_test"), 0, "primer set 'primer_test' exist & are set")
    var ready = assert.async(2)

    setTimeout( function(){
        // primer found inside clones
        assert.equal(m.clones[2]["seg"]["primer5"], undefined, "Control neg primer 5 not in sequence")
        assert.equal(m.clones[2]["seg"]["primer3"], undefined, "Control neg primer 3 not in sequence")
        assert.deepEqual(m.clones[3]["seg"]["primer5"], { seq: "GGAAGGCCCCACAGCG", start: 0, stop: 15 },    "Found primer 5")
        assert.deepEqual(m.clones[3]["seg"]["primer3"], { seq: "AACTTCGCCTGGTAA",  start: 226, stop: 240 }, "Found primer 3")
        m.cleanPreviousFeature("primer3")
        ready()
    }, 200)
    setTimeout( function(){
        assert.equal(typeof m.clones[3]["seg"]["primer3"], "undefined", "Feature has been deleted before new attribution")
        ready()
    }, 300)

});



QUnit.test("normalization", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    var c5 = new Clone(json_clone5, m, 5, c_attributes)
    var c6 = new Clone(json_clone6, m, 6, c_attributes)
    m.initClones()
    m.set_normalization(m.NORM_FALSE)
    assert.equal(c2.getSize(),0.05,"clone3 size")
    m.set_normalization(m.NORM_EXPECTED)
    m.compute_normalization(0,0.20)
    assert.deepEqual(m.normalization.expected_size, 0.20, "expected value")
    assert.equal(c1.getSize().toFixed(2),m.normalization.expected_size,"clone1 normalized size")
    assert.equal(c1.getSize(1).toFixed(2),m.normalization.expected_size,"clone1 normalized size")
    assert.equal(c1.getSize(2),0,"clone1 normalized size")

    assert.equal(m.normalize(c2.getSize(),0),0.8000000000000002,"normalize")
    m.set_normalization(m.NORM_FALSE)
    m.compute_normalization(-1,0)

    assert.equal(c6.getSize(), 0.05, "no normalization: 10 / 200")
    assert.includes(c6.getPrintableSize(), "10 reads (5.000%", "no normalization: 10 / 200")
    assert.equal(c2.getSize(), 0.05, "clone3 size ")

    // Switch normalization to external (field normalized_reads)
    m.set_normalization(m.NORM_EXTERNAL)
    assert.equal(c6.getSize(), 0.1, "external normalization: 20 / 200")
    assert.includes(c6.getPrintableSize(), "10 reads [20 normalized] (10.00%", "external normalization: 10 / 200, getPrintableSize")
    assert.equal(c6.getSize(2), 0, "external normalization: 0 / 100")
    assert.equal(c6.getSize(3), 0.3, "external normalization: 30 / 100")
    assert.equal(c2.getSize(), 0.05, "external normalization have no effect on clone without field")

    // Disable normalization
    m.set_normalization(m.NORM_FALSE)
    assert.equal(c2.getSize(), 0.05, "Clone 2 has correct size after disble normalization")

    // Switch normalization again to NORM_EXPECTED
    m.set_normalization(m.NORM_EXPECTED)
    assert.equal(c6.getSize().toFixed(2), 0.2, "Clone 1 has correct size after switching again normalization to NORM_EXPECTED")


    // Test detection of external normalization inside clones
    var m = new Model();
    m.parseJsonData(json_data, 100)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    m.initClones()
    assert.equal(m.have_external_normalization, false, "Model don't show clone with normalized_reads")
    
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c6 = new Clone(json_clone6, m, 4, c_attributes)
    m.initClones()
    assert.equal(m.have_external_normalization, true, "model have detected normalized_reads of clones")

    m.parseJsonData(json_data, 100)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    m.initClones()
    assert.equal(m.have_external_normalization, false, "Model have_external_normalization is correctly resetted")


    m.set_normalization(m.NORM_EXTERNAL)
    assert.equal(m.normalize_reads(c6, 0, undefined), 20, "normalize_reads; get normalized value if present")
    assert.equal(m.normalize_reads(c6, 0, false),     10, "normalize_reads; get raw value if specified" )
    assert.equal(m.normalize_reads(c6, 2, undefined),  0, "normalize_reads; get value at 0 as computed by external normalization" )
    assert.equal(m.normalize_reads(c6, 3, undefined), 30, "normalize_reads; get raw value if normalization equal null")
})

QUnit.test("findGermlineFromGene", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)
    gene5_name = "IGHV1-18*01"
    gene5_seq  = "caggttcagctggtgcagtctggagct...gaggtgaagaagcctggggcctcagtgaaggtctcctgcaaggcttctggttacaccttt............accagctatggtatcagctgggtgcgacaggcccctggacaagggcttgagtggatgggatggatcagcgcttac......aatggtaacacaaactatgcacagaagctccag...ggcagagtcaccatgaccacagacacatccacgagcacagcctacatggagctgaggagcctgagatctgacgacacggccgtgtattactgtgcgagaga"
    gene3a_name = "IGHJ6*01"
    gene3a_seq  = "......attactactactactacggtatggacgtctgggggcaagggaccacggtcaccgtctcctcag"
    gene3b_name = "TRGJ1*02"
    gene3b_seq  = "................gaattattataagaaactctttggcagtggaacaacacttgttgtcacag"
    var getted = m.findGermlineFromGene(gene5_name)
    assert.equal(getted, gene5_seq, 'function return the correct sequence for the gene V: IGHV1-18*01')

    // As gene3 contain the upstream, the test verify if the sequence getted includes the original sequence
    var getted = m.findGermlineFromGene(gene3a_name).includes(gene3a_seq)
    assert.equal(getted, true, 'function return the correct sequence for the gene J: IGHJ6*01')
    // another 3 gene, from another locus
    var getted = m.findGermlineFromGene(gene3b_name).includes(gene3b_seq)
    assert.equal(getted, true, 'function return the correct sequence for the gene J: TRGJ1*02')

    var getted = m.findGermlineFromGene("unknown_gene")
    assert.equal(getted, undefined, 'function return undefined value for the gene J: unknown_gene')

})

QUnit.test("getFasta", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    var c5 = new Clone(json_clone5, m, 4, c_attributes)
    var c6 = new Clone(json_clone6, m, 4, c_attributes)
    m.initClones()


    m.select(0)
    m.select(1)
    var fasta = m.getFasta()
    console.log( fasta )
    clone = m.clone(0)

    fasta_to_get = ">hello    19 nt, 10 reads (5.000%, 10.00% of TRG)\na\naaaaa\naaaattttt\ntttt\n\n>IGHV3-23*01 6/ACGTG/4 IGHD1-1*01 5/CCCACGTGGGGG/4 IGHJ5*02    11 nt, 10 reads (5.000%, 10.00% of IGH)\nAACGTACCAGG\n\n"
    assert.equal(fasta, fasta_to_get, "getFasta return the correct content")

});




QUnit.test("tag / color", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    var c5 = new Clone(json_clone5, m, 4, c_attributes)
    var c6 = new Clone(json_clone6, m, 5, c_attributes)
    m.initClones()

    assert.equal(m.getColorSelectedClone(), false, "Color of selected clones (empty selection) is correct")
    // select 2 clones without tag
    m.select(0)
    m.select(1)

    assert.equal(m.getColorSelectedClone(), "", "Color of selected clones (without tags) is correct")

    // Change tag of clones
    assert.equal(c1.getTag(), "none", "getTag() >> default tag : none");  
    c1.changeTag("custom_1")
    c2.changeTag("custom_1")
    c1.updateColor()
    c2.updateColor()
    assert.equal(c1.getTag(), "custom_1", "changeTag() >> tag : custom_1");

    // tag 8 color: ''
    // tag 5 color: #2aa198
    assert.equal(m.getColorSelectedClone(), "#2aa198", "Color of selected clones (same tag) is correct")
    
    // select another clone, without tag
    m.select(2)
    assert.equal(m.getColorSelectedClone(), "", "Color of selected clones (mix of clones) is false")
    
});


QUnit.test("distribution_load", function(assert) {

    countRealClones = function(m) {
        var sum = 0;
        for (var i = 0; i < m.clones.length; i++)
            if (m.clones[i].hasSizeConstant())
                sum++
            
        return sum
    }

    var m1 = new Model();
    m1.parseJsonData(json_data, 100)
    m1.initClones()

    assert.equal(m1.clones.length, 7, 'Correct number of clones WITHOUT distributions clones')
    assert.equal(countRealClones(m1), 5, 'Correct number of real clones WITHOUT distributions clones')

    m1.distributions = data_distributions
    m1.loadAllDistribClones()
    assert.equal(m1.clones.length, 12, 'Correct number of clones WITH distributions clones')
    assert.equal(countRealClones(m1), 5, 'Correct number of real clones WITH distributions clones')
   
    // Add distrib values directly into json data
    var json_data_bis = JSON.parse(JSON.stringify(json_data)) // hard copy
    json_data_bis.distributions = data_distributions
    
    var m2 = new Model();
    m2.parseJsonData(json_data_bis, 100)

    assert.equal(m2.clones.length, 12, 'Correct number of clones WITH distributions clones (directly from json_data)')
    assert.equal(countRealClones(m2), 5, 'Correct number of real clones WITH distributions clones (directly from json_data)')
   
});


QUnit.test("computeOrderWithStock", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data, 100)
    m.initClones()

    // Only hidden sample
    m.samples.order       = ["a", "c", "e"] // hide B & D
    m.samples.stock_order = ["a", "b", "c", "d", "e"]
    var waited    = ["a", "b", "c", "d", "e"]
    m.computeOrderWithStock()
    assert.deepEqual( m.samples.stock_order, waited, "result of computeOrderWithStock is correct (case with only hidden samples)")

    // Only hidden sample (but with number)
    m.samples.order       = [0, 2, 4] // hide B & D
    m.samples.stock_order = [0, 1, 2, 3, 4]
    var waited    = [0, 1, 2, 3, 4]
    m.computeOrderWithStock()
    assert.deepEqual( m.samples.stock_order, waited, "result of computeOrderWithStock is correct (case with only hidden samples as number)")

    // only one move
    m.samples.order       = ["a", "d", "b", "c", "e"] // D between A & B
    m.samples.stock_order = ["a", "b", "c", "d", "e"]
    waited        = ["a", "d", "b", "c", "e"]
    m.computeOrderWithStock()
    assert.deepEqual( m.samples.stock_order, waited, "result of computeOrderWithStock is correct (case with one move)")

    // only one move + hidden
    m.samples.order       = ["a", "d", "c", "e"] // D before C; B hidden
    m.samples.stock_order = ["a", "b", "c", "d", "e"]
    waited        = ["a", "b", "d", "c", "e"]
    m.computeOrderWithStock()
    assert.deepEqual( m.samples.stock_order, waited, "result of computeOrderWithStock is correct (case with moved+hidden samples)")

    // Various 
    m.samples.order       = ["a", "i", "b", "e", "c", "g", "f"] // I before B; G before F; D & H hidden
    m.samples.stock_order = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
    waited        = ["a", "i", "b", "e", "c", "d", "g", "f", "h"]
    m.computeOrderWithStock()
    assert.deepEqual( m.samples.stock_order, waited, "result of computeOrderWithStock is correct (case with multiple move/hide)")

    // Test with manual change of sample order
    m.parseJsonData(json_data, 100)
    m.initClones()
    console.log( m.samples.order)       //[0, 1, 2, 3]
    console.log( m.samples.stock_order) //[0, 1, 2, 3]

    m.changeTimeOrder([0,3,1]) // should automaticaly apply change to stock_order (3 before 1)
    waited  = [0, 3, 1, 2]
    assert.deepEqual( m.samples.stock_order, waited, "correct stock_order if apply m.changeTimeOrder")

    m.switchTimeOrder(1,2) // Use index and not value! Should automaticaly apply change to stock_order (1 before 3); 
    waited  = [0, 1, 3, 2]
    assert.deepEqual( m.samples.stock_order, waited, "Correct stock_order if apply m.switchTimeOrder")


});

QUnit.test("getSampleWithSelectedClones", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()

    // clone 1 present only in sample 1 and 2
    m.clones[1].reads[2] = 0
    m.clones[1].reads[3] = 0

    // clone 2 present only in sample 2 and 3
    m.clones[2].reads[0] = 0
    m.clones[2].reads[3] = 0

    assert.deepEqual( m.getSampleWithSelectedClones(), [0,1,2,3], "no selection, should return list of all actives samples")
    m.select(1)
    assert.deepEqual( m.getSampleWithSelectedClones(), [0,1], "clone 1, should return samples 1 and 2")
    m.select(2)
    assert.deepEqual( m.getSampleWithSelectedClones(), [0,1,2], "clone 1 and 2, should return samples 1 and 2 and 3")

    // Test order 
    // clone 1 present only in sample 1 and 3
    m.clones[1].reads[1] = 0
    m.clones[1].reads[2] = 10

    // clone 2 present only in sample 1 and 2
    m.clones[2].reads[0] = 10
    m.clones[2].reads[2] = 0
    assert.deepEqual( m.getSampleWithSelectedClones(), [0,1,2], "clone 1 and 2, should return samples 1 and 2 and 3 in the correct order")
  
});


QUnit.test("getSampleName", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data, 100)
    m.initClones()

    assert.equal( m.getSampleName(0), "Diag.fa", "Correct name getted as no values for m.samples.names (values from server)")

    // Simulate data from server opening
    m.samples.names = ["f0", "f1", "f2", "f3"]
    assert.equal( m.getSampleName(0), "f0", "Correct name getted if values from server")

});


QUnit.test("export clone informations", function(assert) {

    // Create and populate model
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()

    // select some clones
    m.multiSelect([0,2,3])

    // Test on AIRR export format
    var airr = m.getClonesAsAIRR([0,2,3])
    var airr_splitted = airr.split("\n")
    assert.equal(1+(3*4), airr_splitted.length, "correct number of lines in airr export")

    var line_title = "sample,sample_name,duplicate_count,locus,v_call,d_call,j_call,sequence_id,sequence,productive,vj_in_frame,stop_codon,junction_aa,cdr3_aa,warnings,_cdr3,_N"
    var line_c0_1  = "0,Diag.fa,10,TRG,TRGV4*01,undefined D,TRGJ2*01,id1,aaaaaaaaaaaaaaaaaaaAG,false,,F,,AG,,aa,"
    var line_c0_2  = "1,Fu-1.fa,10,TRG,TRGV4*01,undefined D,TRGJ2*01,id1,aaaaaaaaaaaaaaaaaaaAG,false,,F,,AG,,aa,"
    var line_c2_1  = "0,Diag.fa,25,IGH,IGHV1-2*01,IGHD2-2*02,IGHJ6*01,id3,cccccccccccccccccccc,false,,F,,,,,"
    var line_c3_1  = "0,Diag.fa,5,TRG,TRGV4*01,undefined D,TRGJ1*01,id4,GGAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGACAGGCTGAAGGATTGGATCAAGACGTTTGCAAAAGGGACTAGGCTCATAGTAACTTCGCCTGGTAA,false,,F,,,,,4"
    assert.deepEqual(airr_splitted[0], line_title, "correct value for line title in airr export")
    assert.deepEqual(airr_splitted[1], line_c0_1, "correct value for line 1 of clone0 in airr export")
    assert.deepEqual(airr_splitted[2], line_c0_2, "correct value for line 2 of clone0 in airr export")
    assert.deepEqual(airr_splitted[5], line_c2_1, "correct value for line 1 of clone2 in airr export")
    assert.deepEqual(airr_splitted[9], line_c3_1, "correct value for line 1 of clone3 in airr export")

    // test on JOSN export format
    var json = m.exportAsJson([0, 2, 3])
    console.log( json )
    assert.deepEqual(3, json.length, "correct number of elements in json export")
    var json_value_0 = {
        "seg":{
            "3":{"name":"TRGJ2*01","start":6},"5":{"name":"TRGV4*01","stop":5},
            "cdr3":{"start":4,"stop":5,"aa":"AG"},
            "clonedb":{"clones_names":{"A":[2,0.25],"B":[124,0.01]}}
        },
        "id":"id1","index":0,
        "sequence":"aaaaaaaaaaaaaaaaaaaAG","reads":[10,10,15,15],"top":1,
        "sample":["Diag.fa","Fu-1.fa","Fu-2.fa","Fu-3.fa"],"_average_read_length":[21]
    }
    assert.deepEqual(json_value_0.seg, json[0].seg, "correct value for element 0 in json export; seg")
    assert.deepEqual(json_value_0.sequence, json[0].sequence, "correct value for element 0 in json export; sequence")
    assert.deepEqual(json_value_0.sample, json[0].sample, "correct value for element 0 in json export; sample")

    // select some clones
    m.multiSelect([0,2,3])
    // ** Don't call, open a download file popup ** //
    // var airr_without_list = m.exportCloneAs("airr")
    // assert.deepEqual(airr, airr_without_list, "Get export informations by model exportCloneAs function")

});


QUnit.test("getLocusPresentInTop", function(assert) {
    // Create and populate model
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()

    var locus = m.getLocusPresentInTop(0)
    assert.deepEqual( locus, ["IGH", "TRG"] )

    locus = m.getLocusPresentInTop(1)
    assert.deepEqual( locus, ["IGH", "TRG"] )
});


QUnit.test("getWarningsClonotypeInfo", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()

    m.clones[0].warn  = [{"code": "W69", "msg": "Several genes with equal probability", "level": "warn"}]
    m.clones[5].warn  = [{"code": "W82", "msg": "Merged clone has different productivities in some samples", "level": "warn"}]
    m.clones[5].reads = [10,10, 0, 10]
    // m.clones.forEach( (c) => {console.log(`${c.index}; ${c.reads}: ==> ${c.warn}`)})


    var warns_undef = m.getWarningsClonotypeInfo()
    assert.notEqual( warns_undef["W69"], undefined, "warns_undef, error W69 exist")
    assert.notEqual( warns_undef["W82"], undefined, "warns_undef, error W82 exist")
    assert.equal( warns_undef["W69"].reads, 50, "warns_undef")
    assert.equal( warns_undef["W82"].reads, 30, "warns_undef")

    var warns_all   = m.getWarningsClonotypeInfo(-1)
    assert.notEqual( warns_all["W69"], undefined, "warns_all, error W69 exist")
    assert.notEqual( warns_all["W82"], undefined, "warns_all, error W82 exist")
    assert.equal( warns_all["W69"].reads, 50, "warns_all")
    assert.equal( warns_all["W82"].reads, 30, "warns_all")

    var warns_time0 = m.getWarningsClonotypeInfo(0)
    assert.notEqual( warns_time0["W69"], undefined, "warns_time0, error W69 exist")
    assert.notEqual( warns_time0["W82"], undefined, "warns_time0, error W82 exist")
    assert.equal( warns_time0["W69"].reads, 10, "warns_time0")
    assert.equal( warns_time0["W82"].reads, 10, "warns_time0")

    var warns_time3 = m.getWarningsClonotypeInfo(2)
    assert.notEqual( warns_time3["W69"], undefined, "warns_time3, error W69 exist")
    assert.equal( warns_time3["W82"],    undefined, "warns_time3, error W82 exist")
    assert.equal( warns_time3["W69"].reads, 15, "warns_time3")

});


QUnit.test("getWarningLevelFromCode", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    localStorage.clear()

    var warn_1 = "W69" // level 0
    var warn_2 = "W82" // level 2
    var warn_3 = "Wxx" // level 1
    var warn_undef = undefined
    var warn_empty = {}
    
    assert.equal( m.getWarningLevelFromCode(warn_1), 0, "getWarningLevelFromCode; before local change, 'warn")
    assert.equal( m.getWarningLevelFromCode(warn_2), 2, "getWarningLevelFromCode; before local change, 'alert'")
    assert.equal( m.getWarningLevelFromCode(warn_3), 1, "getWarningLevelFromCode; before local change, 'error'")
    assert.equal( m.getWarningLevelFromCode(warn_undef), 2, "getWarningLevelFromCode; before local change, 'undef'")

    localStorage.setItem(`warn_W69`, 2)
    localStorage.setItem(`warn_W82`, 3)
    localStorage.setItem(`warn_Wxx`, 2)

    assert.equal( m.getWarningLevelFromCode(warn_1), 2, "getWarningLevelFromCode; after local change, 'warn")
    assert.equal( m.getWarningLevelFromCode(warn_2), 3, "getWarningLevelFromCode; after local change, 'alert'")
    assert.equal( m.getWarningLevelFromCode(warn_3), 2, "getWarningLevelFromCode; after local change, 'error'")
    assert.equal( m.getWarningLevelFromCode(warn_undef), 2, "getWarningLevelFromCode; after local change, 'undef'")

});

QUnit.test("getWarningLevelFromWarn", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    localStorage.clear()

    var warn_1 = {"code": "W69", "level": "warn"}  // level 0
    var warn_2 = {"code": "W82", "level": "alert"} // level 2
    var warn_3 = {"code": "Wxx", "level": "error"} // level 1
    var warn_undef = {"code": "Wyy", "level": undefined} // old style warnings; level 2
    var warn_empty = {}

    assert.equal( m.getWarningLevelFromWarn(warn_1), 0, "getWarningLevelFromWarn; before local change, 'warn")
    assert.equal( m.getWarningLevelFromWarn(warn_2), 2, "getWarningLevelFromWarn; before local change, 'alert'")
    assert.equal( m.getWarningLevelFromWarn(warn_3), 1, "getWarningLevelFromWarn; before local change, 'error'")
    assert.equal( m.getWarningLevelFromWarn(warn_undef), 2, "getWarningLevelFromWarn; before local change, 'undef'")
    assert.equal( m.getWarningLevelFromWarn(warn_empty), 0, "getWarningLevelFromWarn; before local change, empty warn")

    localStorage.setItem(`warn_W69`, 2)
    localStorage.setItem(`warn_W82`, 3)
    localStorage.setItem(`warn_Wxx`, 2)

    assert.equal( m.getWarningLevelFromWarn(warn_1), 2, "getWarningLevelFromWarn; after local change, 'warn")
    assert.equal( m.getWarningLevelFromWarn(warn_2), 3, "getWarningLevelFromWarn; after local change, 'alert'")
    assert.equal( m.getWarningLevelFromWarn(warn_3), 2, "getWarningLevelFromWarn; after local change, 'error'")
    assert.equal( m.getWarningLevelFromWarn(warn_undef), 2, "getWarningLevelFromWarn; after local change, 'undef'")

});

QUnit.test("getWarningLevelFromList", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    // m.resetWarnings()
    localStorage.clear()
    // Will use warnings data to set level; so level present here will not be used
    var warn_1 = {"code": "W69", "level": "warn"}
    var warn_2 = {"code": "W82", "level": "alert"}
    var warn_3 = {"code": "Wxx", "level": "error"}
    var warn_undef = {"code": "Wyy", "level": undefined} // old style warnings, alert by default
    
    assert.equal( m.getWarningLevelFromList([warn_1]), 0, "getWarningLevelFromList; before local change, only 'warn")
    assert.equal( m.getWarningLevelFromList([warn_2]), 2, "getWarningLevelFromList; before local change, only 'alert'")
    assert.equal( m.getWarningLevelFromList([warn_3]), 1, "getWarningLevelFromList; before local change, only 'error'")
    assert.equal( m.getWarningLevelFromList([warn_undef]), 2, "getWarningLevelFromList; before local change, only 'undef'")
    assert.equal( m.getWarningLevelFromList([warn_undef, warn_3]), 2, "getWarningLevelFromList; before local change, [undef, error]")
    assert.equal( m.getWarningLevelFromList([warn_1, warn_2]), 2, "getWarningLevelFromList; before local change, [warn, alert]")

    localStorage.setItem(`warn_W69`, 2)
    localStorage.setItem(`warn_W82`, 3)
    localStorage.setItem(`warn_Wxx`, 2)

    assert.equal( m.getWarningLevelFromList([warn_1]), 2, "getWarningLevelFromList; after local change, only 'warn")
    assert.equal( m.getWarningLevelFromList([warn_2]), 3, "getWarningLevelFromList; after local change, only 'alert'")
    assert.equal( m.getWarningLevelFromList([warn_3]), 2, "getWarningLevelFromList; after local change, only 'error'")
    assert.equal( m.getWarningLevelFromList([warn_undef]), 2, "getWarningLevelFromList; after local change, only 'undef'")
    assert.equal( m.getWarningLevelFromList([warn_undef, warn_3]), 2, "getWarningLevelFromList; after local change, [undef, error]")
    assert.equal( m.getWarningLevelFromList([warn_1, warn_2]), 3, "getWarningLevelFromList; after local change, [warn, alert]")

});


QUnit.test("getClonesWithWarningCode", function(assert) {
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    localStorage.clear()

    m.clones[0].warn  = [{"code": "W69", "msg": "Several genes with equal probability", "level": "warn"}]
    m.clones[1].warn  = [{"code": "W82", "msg": "Merged clone has different productivities in some samples", "level": "warn"}]
    m.clones[2].warn  = [{"code": "Wdouble", "level": "warn"}, {"code": "Wdouble", "level": "warn"}]
    m.clones[5].warn  = [{"code": "W69", "msg": "Several genes with equal probability", "level": "warn"}, {"code": "W82", "msg": "Merged clone has different productivities in some samples", "level": "warn"}]
    m.clones[5].reads = [10,10, 0, 10]
    m.clones.forEach( (c) => {console.log(`${c.index}; ${c.reads}: ==> ${c.warn.map((w)=>{return w.code})}`)})

    assert.deepEqual( m.getClonesWithWarningCode("W69"), [0, 5], "Select clones with warn code W69, current sample (0) with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("W82"), [1, 5], "Select clones with warn code W82, current sample (0) with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("Wxx"), [], "Select clones with warn code Wxx (not present), current sample (0) with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("Wdouble"), [2], "Select clones with 2x the same warnings" )

    m.changeTime(2)
    m.update()

    m.clones[5].reads = [10,10, 0, 10]
    assert.deepEqual( m.getClonesWithWarningCode("W69", only_present=false), [0, 5], "Select clones with warn code W69, only_present=false, sample 2 with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("W82", only_present=false), [1, 5], "Select clones with warn code W82, only_present=false, sample 2 with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("W69", only_present=true), [0], "Select clones with warn code W69, only_present=true, sample 2 with reads" )
    assert.deepEqual( m.getClonesWithWarningCode("W82", only_present=true), [1], "Select clones with warn code W82, only_present=true, sample 2 with reads" )
}); 


QUnit.test("getDiversity", function(assert) {
    // 1 - old not fused => {index : "na"}
    // 1 - old not fused => {index : value}
    // 2 - old fused     => {index : [values]}
    // 3 - new not fused => {index : {locus: value}}
    // 4 - new fused     => {index : [{locus: values}]}

    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    var diversity_0 = { "index": "na" }
    var diversity_1 = { "index": 5.68 }
    var diversity_2 = { "index": [5.68] }
    var diversity_3 = { "index": { "all": 5.68, "TRG": 5.25 }}
    var diversity_4 = { "index": [{ "all": 5.68, "TRG": 5.25 }] }

    m.diversity = diversity_0
    assert.equal(m.getDiversity("index", 0), undefined, "Correct diversity returned in case 0 (na)")

    m.diversity = diversity_1
    assert.equal(m.getDiversity("index", 0), 5.68, "Correct diversity returned in case 1 (old, not fused)")

    m.diversity = diversity_2
    assert.equal(m.getDiversity("index", 0), 5.68, "Correct diversity returned in case 2 (old, fused)")

    m.diversity = diversity_3
    assert.deepEqual(m.getDiversity("index", 0), { "all": "5.680", "TRG": "5.250" }, "Correct diversity returned in case 3 (new, not fused)")

    m.diversity = diversity_4
    assert.deepEqual(m.getDiversity("index", 0), { "all": "5.680", "TRG": "5.250" }, "Correct diversity returned in case 4 (new, fused)")
});


QUnit.test("getPointHtmlInfo", function(assert) {

    // Create and populate model
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    m.parseJsonData(data_copy, 100)
    m.initClones()
    m.clones[0].warn = [{"code": "W69", "msg": "Several genes with equal probability", "level": "warn"}]

    m.diversity = {
        "index_H_entropy": [
          5.688690639121887,
          {
            "all": 5.685521833966959,
            "TRG": 5.251430198730304,
            "IGH": 4.6659245018527145
          }
        ],
        "index_E_equitability": [
          0.39255398511886597,
          {
            "all": 0.39234431286307087,
            "TRG": 0.3710257284862601,
            "IGH": 0.3524275802230387
          }
        ],
        "index_Ds_diversity": [
          0.9644120931625366,
          {
            "all": 0.9643881817723228,
            "TRG": 0.9505217377100443,
            "IGH": 0.8727130704274034
          }
        ]
      }

    // first sample has old fashion diversity
    var html_info = m.getPointHtmlInfo(0)
    assert.includes(html_info, "Diversity indices", "htmlInfo get diversity header")
    assert.includes(html_info, "<tr id='modal_line_index_H_entropy' ><td  id='modal_line_title_index_H_entropy'>Shannon's diversity</td><td  colspan='1' id='modal_line_value_index_H_entropy'>5.689</td></tr>", "An index is correctly present and formated")
    assert.notIncludes(html_info, '<tr><td colspan=\'5\'>Shannon\'s diversity</td></tr><tr><td> <span class="systemBoxMenu" title="all">x</span> all</td>', "")

    assert.includes(html_info, "modal_header_reads_by_locus", "htmlInfo get reads by locus header")
    assert.includes(html_info, "modal_line_title_reads_by_locus_IGH", "htmlInfo get reads by locus line IGH")
    assert.includes(html_info, "id='info_warnings'", "table info_warnings present")
    assert.includes(html_info, "id='modal_line_title_W69;_Several_genes_with_equal_probability'", "line in info_warnings present")


    // second sample has diversity by locus
    html_info = m.getPointHtmlInfo(1)
    // each diversity indices has header
    assert.includes(html_info, "<tr id='modal_header_index_H_entropy' ><td class='header' colspan='5'>Shannon's diversity</td></tr>")
    assert.includes(html_info, "<tr id='modal_header_index_E_equitability' ><td class='header' colspan='5'>Pielou's evenness</td></tr>")
    assert.includes(html_info, "<tr id='modal_header_index_Ds_diversity' ><td class='header' colspan='5'>Simpson's diversity</td></tr>")
    // each present locus id visible
    assert.includes(html_info, "<tr id='modal_line_index_Ds_diversity_all' ><td  id='modal_line_title_index_Ds_diversity_all'><span class=\"systemBoxMenu\" title=\"all\">x</span> locus</td><td  colspan='1' id='modal_line_value_index_Ds_diversity_all'>0.964</td></tr>")
    assert.includes(html_info, "<tr id='modal_line_index_H_entropy_TRG' ><td  id='modal_line_title_index_H_entropy_TRG'><span class=\"systemBoxMenu\" title=\"TRG\" style=\"background: rgb(220, 50, 47);\">G</span> locus</td><td  colspan='1' id='modal_line_value_index_H_entropy_TRG'>5.251</td></tr>")
    assert.includes(html_info, "<tr id='modal_line_index_H_entropy_IGH' ><td  id='modal_line_title_index_H_entropy_IGH'><span class=\"systemBoxMenu\" title=\"IGH\" style=\"background: rgb(108, 113, 196);\">H</span> locus</td><td  colspan='1' id='modal_line_value_index_H_entropy_IGH'>4.666</td></tr>")
});
