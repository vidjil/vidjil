
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

    assert.deepEqual(m.convertSeg(json_clone3.seg), {"5": {"stop": 5}, "4": {"name": "IGHD2*03"}, "3": {"name": "IGHV4*01", "start": 15}, "junction": {"aa": "WKIC", "productive": false, "start": 2, "stop": 13}, "somefeature": { "seq": "aaaattt" }}, "convertSeg: Ok");
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
    
    function count_active() {
        var nb_active = 0
        for (i = 0; i < m.clones.length; i++)
            if (m.clones[i].isActive())
                nb_active += 1
        return nb_active
    }
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.initClones()

    assert.equal(m.countRealClones(), 5, "Real clones, expected 5")
    m.displayTop(-10)
    assert.equal(m.top, 0, "Top cannot be negative")
    m.displayTop(m.countRealClones() * 2 + 10)
    
    assert.equal(m.top, m.countRealClones() * 2 + 10, "Model top can be greater than the number of real clones")
    assert.equal(m.current_top, m.countRealClones(), "Current Top cannot be greater than the number of real clones")

    c = m
    assert.equal(m.clones.length, 7, "m.clones.length")
    assert.equal(count_active(), 5, "Without top modification, there should be one active clone")

    // 0-4; clone reel; 5-6, clone virtuel    
    m.displayTop(1)

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


QUnit.test("focus/hide/reset_filter", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data,100)
    
    m.multiSelect([0,2,3])
    assert.equal(m.someClonesFiltered, false, "no clones are filtered")

    m.focusSelected()
    assert.equal(m.someClonesFiltered, true, "some clones are filtered")
    assert.equal(m.clone(0).isFiltered, false, "clone 0 is not filtered")
    assert.equal(m.clone(1).isFiltered, true, "clone 1 is filtered")

    m.unselectAll()
    m.select(2)
    assert.equal(m.clone(2).isFiltered, false, "clone 2 is not filtered")

    m.hideSelected()
    assert.equal(m.clone(2).isFiltered, true, "clone 2 is filtered")

    assert.equal(m.clone(0).isFiltered, false, "clone 0 is not filtered")
    assert.equal(m.clone(1).isFiltered, true, "clone 1 is filtered")

    m.reset_filter(false)
    assert.equal(m.clone(2).isFiltered, false, "clone 2 is not filtered")
    m.update()
    assert.equal(m.someClonesFiltered, false, "no clones are filtered")

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
    var m = new Model();
    var sp = new ScatterPlot("visu", m);
    var myUrl = new Url(m);
    m.url_manager = myUrl;

    var ff = m.getFilteredFields({'log':[], 'producer':[], 'foobar':[], 'id': [], 'barfoo':[]});
    var bool = ff.indexOf('log') == -1 && ff.indexOf('producer') == -1 && ff.indexOf('id') == -1;
    assert.equal(bool, true, "sample fields filtered");
    assert.equal(ff.length, 2, "remaining sample fields");

    var order = m.calculateOrder([0, 1, 5, 2, 3]);
    assert.deepEqual(order, [0, 1, 4, 2, 3], "reorder array of order values");

    var dict = m.buildDict(["1", "3", "4", "6"], ["1", "3", "4", "5"]);
    assert.deepEqual(dict, {"1":{}, "3":{}, "4":{}, "5":{}, "6":{}}, "build a dict of all present ids");

    var dest = {"1": {}, "2": {}};
    var src = {"id": ["1", "2", "3"], "val": ["f", "o", "o"]};
    var field = m.copyField(dest, src, "val");
    assert.deepEqual(field, {"1": {"val": "f"}, "2": {"val": "o"}}, "copy the contents of analysis sample fields");

    dest = {"original_names": ["1", "4", "2"], "val": ["a", "b", "c"], "lav": ["c", "b", "a"]};
    src = {"id": ["1", "2", "3"], "val": ["f", "o", "o"]};
    var res = m.copySampleFields(dest, src);
    var expected = {"original_names": ["1", "4", "2"], "val": ["f", "b", "o"], "lav": ["c", "b", "a"]};
    assert.deepEqual(res, expected, "copy all relevant fields from analysis to samples");

    m.parseJsonData(json_data, 100);
    m.parseJsonAnalysis(analysis_data);

    assert.notEqual(m.samples.names[1], "fu0", "missing sample successfully ignored");
    assert.equal(m.samples.names[1], "fu1", "correctly shifted samples");

    assert.deepEqual(m.samples.order, [0,3,1,2], "order converted");
});



QUnit.test("model: primer detection", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100)

    // primer set loading
    assert.equal(typeof m.primersSetData, "undefined", "primers sets are initialy unset")
    m.populatePrimerSet();
    assert.equal(typeof m.primersSetData, 'object', "primers are loaded inside model")

    // model primer setting
    assert.equal(m.switchPrimersSet("no set"), 1, "primer set doesn't exist")
    assert.equal(m.switchPrimersSet("primer_test"), 0, "primer set exist & are set")

    // primer found inside clones
    assert.equal(typeof m.clones[2]["seg"]["primer5"], "undefined", "Control neg primer 5 not in sequence")
    assert.equal(typeof m.clones[2]["seg"]["primer3"], "undefined", "Control neg primer 3 not in sequence")
    assert.deepEqual(m.clones[3]["seg"]["primer5"], { seq: "GGAAGGCCCCACAGCG", start: 0, stop: 15 },    "Found primer 5")
    assert.deepEqual(m.clones[3]["seg"]["primer3"], { seq: "AACTTCGCCTGGTAA",  start: 226, stop: 240 }, "Found primer 3")


    m.cleanPreviousFeature("primer3")
    assert.equal(typeof m.clones[3]["seg"]["primer3"], "undefined", "Feature has been deleted before new attribution")
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
    gene3b_seq  = "...................ttattataagaaactctttggcagtggaacaacacttgttgtcacag"
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

    fasta_to_get = ">hello    19 nt, 10 reads (5.000%, 10.00% of TRG)\naaaaaa\naaaattttt\ntttt\n\n>IGHV3-23*01 6/ACGTG/4 IGHD1-1*01 5/CCCACGTGGGGG/4 IGHJ5*02    11 nt, 10 reads (5.000%, 10.00% of IGH)\nAACGTACCAGG\n\n"
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
    assert.equal(c1.getTag(), 8, "getTag() >> default tag : 8");  
    c1.changeTag(5)
    c2.changeTag(5)
    c1.updateColor()
    c2.updateColor()
    assert.equal(c1.getTag(), 5, "changeTag() >> tag : 5");

    // tag 8 color: ''
    // tag 5 color: #2aa198
    assert.equal(m.getColorSelectedClone(), "#2aa198", "Color of selected clones (same tag) is correct")
    
    // select another clone, without tag
    m.select(2)
    assert.equal(m.getColorSelectedClone(), "", "Color of selected clones (mix of clones) is false")
    
});


QUnit.test("distribution_load", function(assert) {

    var m1 = new Model();
    m1.parseJsonData(json_data, 100)
    m1.initClones()

    assert.equal(m1.clones.length, 7, 'Correct number of clones WITHOUT distributions clones')
    assert.equal(m1.countRealClones(), 5, 'Correct number of real clones WITHOUT distributions clones')

    m1.distributions = data_distributions
    m1.loadAllDistribClones()
    assert.equal(m1.clones.length, 12, 'Correct number of clones WITH distributions clones')
    assert.equal(m1.countRealClones(), 5, 'Correct number of real clones WITH distributions clones')
   
    // Add distrib values directly into json data
    var json_data_bis = JSON.parse(JSON.stringify(json_data)) // hard copy
    json_data_bis.distributions = data_distributions
    
    var m2 = new Model();
    m2.parseJsonData(json_data_bis, 100)

    assert.equal(m2.clones.length, 12, 'Correct number of clones WITH distributions clones (directly from json_data)')
    assert.equal(m2.countRealClones(), 5, 'Correct number of real clones WITH distributions clones (directly from json_data)')
   
});
