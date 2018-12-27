QUnit.module("Clone", {
});

    var json_clone1 = {
        "sequence" : "aaaaaaaaaattttttttt",
        "name" : "hello",
        "id" : "id1",
        "reads" : [10,10,0,30] ,
        "top" : 1,
        "germline" : "TRG",
        "seg" : {
            "3" : "IGHV4*01",
            "4" : "IGHD2*03",
            '_evalue': 1e-2,
            "3start" : 15,
            "5" : {'start': 1, 'end': 5}, // 0-based (old format, with 'end')
            "cdr3": {
                "start": 11,
                "stop": 16,
                "aa": "ABCDE"
            },
            "junction": {
                "start": 10,
                "stop": 12,
                "productive": true
            }
        }
    }

    var some_name = "IGHV3-23*01 6/ACGTG/4 IGHD1-1*01 5/CCCACGTGGGGG/4 IGHJ5*02"

    var json_clone2 = {
        "sequence" : "AACGTACCAGG",
        "id" : "id2",
        "name" : some_name,
        "reads" : [10,10,30,0] ,
        "top" : 2,
        "germline" : "IGH",
        "warn": [{
            "code": "Wxx",
            "msg": "a warning that is only an information",
            "level": "info"
        }],
        "seg" : {
            "5" : {'start': 2, 'stop': 6, 'delRight': 18}, // 1-based (current format)
        }
    }
    
    var json_clone3 = {
        "sequence" : "aaaaaaaaaattttttttt",
        "c_name" : "custom name",
        "name": "",
        "id" : "id3",
        "reads" : [10,10,15,15] ,
        "top" : 3,
        "germline" : "TRG",
        "warn": "a warning, old style",
        "seg" : {
            "3" : "IGHV4*01",
            "4" : "IGHD2*03",
            "3start" : 15,
            "5end" : 5,
            "junction": {
                "aa" : "WKIC",
                "start": 3,
                "stop": 14,
                "productive": false
            },
            "somefeature":
            {
                "seq": "aaaattt"
            },
        }
    }

    var json_clone4 = {
        "sequence" : "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGTATTACC",
        "c_name" : "custom name",
        "name": "",
        "id" : "id4",
        "reads" : [10,10,15,15] ,
        "top" : 4,
        "germline" : "TRG",
        "warn": [{
            "code": "Wyy",
            "msg": "a normal warning",
            "level": "warn"
        },{
            "code": "Wzz",
            "msg": "a severe warning",
            "level": "error"
        }],
        "seg" : {
            "3" : "IGHV4*01",
            "4" : "IGHD2*03",
            "3start" : 25,
            "5end" : 15,
	    "primer5": {
	      "start": 2,
	      "stop": 10
	    },
	    "primer3": {
	      "start": 26,
	      "stop": 34
	    }
        }
    }

// Clone with undefined sequence
var json_clone5 = {
    "sequence": 0,
    "name": "undefined clone",
    reads: [1, 5, 2, 0],
    "top": 5,
};

// Clone with normalized_reads
var json_clone6 = {
        "id" : "id6",
        "reads" : [10,10,0,30],
        "normalized_reads" : [20,20,0,30],
    }

QUnit.test("name, informations, getHtmlInfo", function(assert) {
    
    assert.equal(json_clone1.seg.junction.start, 10, "Start junction is 10 in JSON for clone 1");
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    assert.equal(c1.seg.junction.start, 9, "Start junction is now 9 for clone 1 as positions start at 0 in the code");
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    var c4 = new Clone(json_clone4, m, 3)
    var c5 = new Clone(json_clone5, m, 4)
    m.initClones()
    
    assert.equal(c1.getSequenceName(), "hello", "get name clone1 : hello");
    assert.equal(c1.getCode(), "hello", "get code clone1 : hello");

    assert.equal(c1.getSequenceLength(), 19, "clone1 sequence: 19nt");
    assert.equal(c2.getSequenceLength(), 11, "clone2 sequence: 11nt");
    assert.equal(c5.getSequenceLength(), 0, "clone5 sequence: 0nt");

    assert.equal(c2.getSequenceName(), some_name, "clone2, .getSequenceName()");
    assert.equal(c2.getCode(), some_name, "clone2, .getCode()");
    assert.equal(c2.getName(), some_name, "clone2, .getName()");
    assert.equal(c2.getShortName(), "IGHV3-23 6/ACGTG/4 D1-1 5/12/4 J5*02", "clone2, .getShortName()");

    assert.equal(c1.getLocus(), "TRG")
    assert.equal(c2.getLocus(), "IGH")

    assert.equal(c1.isWarned(), 'warn', "clone1 is warned (client, bad e-value)")
    assert.equal(c2.isWarned(), false, "clone2 is not warned (only 'info')")
    assert.equal(c3.isWarned(), 'warn', "clone3 is warned with 'warn'")
    assert.equal(c4.isWarned(), 'error', "clone4 is warned with 'error'")
    assert.equal(c5.isWarned(), false, "clone5 is not warned")

    assert.equal(c3.getSequenceName(), "custom name", "get name clone3 : custom name");
    assert.equal(c3.getCode(), "id3", "get code clone3 : id3");
    
    c3.changeName("plop")
    assert.equal(c3.getName(), "plop", "changename clone3 : plop");
    assert.equal(c3.getSequenceName(), "plop", "changename clone3 : plop");
    assert.equal(c1.getNumberNonZeroSamples(), 3, "clone c1, getNumberNonZeroSamples");
    
    assert.equal(c2.getNameAndCode(), some_name, "clone2, .getNameAndCode()");
    assert.equal(c3.getNameAndCode(), "plop (id3)", "clone3, .getNameAndCode()");

    assert.equal(c1.GCContent, 0, "clone1 0% GC content");
    assert.equal(typeof(c5.GCContent), 'undefined', "clone5, no GC content for c5: no consensus sequence");
    assert.equal(typeof(c5.coverage), 'undefined', "clone5, no GC content for c5: no consensus sequence");
    
    m.select(0)
    m.select(1)
    m.merge()
    
    assert.equal(c1.getReads(), 20, "cluster c1+c2 reads : 20");
    assert.equal(c1.getSize(), 0.10, "cluster c1+c2 size : 0.10");
    assert.equal(c1.getStrSize(), "10.00%", "cluster c1+c2 size (%) : 10%");
    
    assert.equal(c1.get('reads'), 10, "clone c1 reads : 10");
    assert.equal(c1.getSequenceSize(), "0.05", "clone c1 size : 0.05");
    assert.equal(c1.getNumberNonZeroSamples(), 4, "clustered clone c1, getNumberNonZeroSamples");

    assert.deepEqual(c1.getReadsAllSamples(), [20, 20, 30, 30], "cluster c1+c2 reads on all samples");

    console.log(m.samples.order);

    html = m.clones[0].getHtmlInfo();
    assert.includes(html, "<h2>Cluster info : hello</h2>")
    assert.includes(html, "<div id='info_window'><table><tr><th></th><td>Diag</td><td>Fu-1</td><td>Fu-2</td><td>Fu-3</td></tr>",
             "getHtmlInfo: cluster info");

    assert.includes(html, "<tr><td>clone name</td><td colspan='4'>hello</td></tr><tr><td>clone short name</td><td colspan='4'>hello</td></tr>",
             "getHtmlInfo: clone names")

    assert.includes(html, "<tr><td>clone size (n-reads (total reads))</td><td>20  (200)</td><td>20  (100)</td><td>30  (200)</td><td>30  (100)</td></tr><tr><td>clone size (%)</td><td>10.00%</td><td>20.00%</td><td>15.00%</td><td>30.00%</td>",
             "getHtmlInfo: clone information");
    
    assert.includes(html, "<tr><td class='header' colspan='5'>representative sequence</td></tr><tr><td>sequence name</td><td colspan='4'>hello</td></tr><tr><td>code</td><td colspan='4'>hello</td></tr><tr><td>length</td><td colspan='4'>19</td></tr><tr><td>e-value</td><td colspan='4'><span class='warning'>0.01</span></td></tr><tr><td>size (n-reads (total reads))</td><td>10  (200)</td><td>10  (100)</td><td>0  (200)</td><td>30  (100)</td></tr><tr><td>size (%)</td><td>5.000%</td><td>10.00%</td><td>−</td><td>30.00%</td></tr>",
        "getHtmlInfo: representative sequence information");

    assert.includes(html, "<tr><td class='header' colspan='5'>segmentation <button type='button' onclick='m.clones[0].toggle()'>edit</button></td></tr><tr><td>sequence</td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td>id</td><td colspan='4'>id1</td></tr>",
        "getHtmlInfo: segmentation information + modification button");
    // Test icon 
    m.clones[0].segEdited = true;
    html = m.clones[0].getHtmlInfo();
    assert.includes(html, "<tr><td class='header' colspan='5'>segmentation <button type='button' onclick='m.clones[0].toggle()'>edit</button> <img src='images/icon_fav_on.png' alt='This clone has been edited by a user'></td></tr><tr><td>sequence</td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td>id</td><td colspan='4'>id1</td></tr>",
        "getHtmlInfo: segmentation information + modification button + manuallyChanged icon");
    
    // <tr><td>locus</td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG</td></tr> // not tested (order of title/class)
    

    // locus/genes content tests
    // TODO correct this locus test/function for chromium/firefox (inversion des balises)
    /*assert.includes(html, "<tr><td>locus</td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG<div class='div-menu-selector' id='listLocus' style='display: none'>",
        "getHtmlInfo: segmentation information (Locus)");*/

    assert.includes(html, "<tr><td>V gene (or 5')</td><td colspan='4'>undefined V<div class='div-menu-selector' id='listVsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (V gene)");
    assert.includes(html, "<tr><td>(D gene)</td><td colspan='4'>IGHD2*03<div class='div-menu-selector' id='listDsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (D gene)");
    assert.includes(html, "<tr><td>J gene (or 3')</td><td colspan='4'>IGHV4*01<div class='div-menu-selector' id='listJsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (J gene)");

    // forms tests
    assert.includes(html, 
        "<form name='germ'><select class='menu-selector' NAME='LocusForm' id='germSelector', onChange='m.clones[0].changeLocus(this.form.LocusForm.value);'  style='width: 80px' >",
        "getHtmlInfo: Locus form");
    assert.includes(html, 
        "<form name=Vsegment><select class='menu-selector' NAME=Vsegment onChange='m.clones[0].changeSegment(this.form.Vsegment.value, 5);'  style='width: 100px' >",
        "getHtmlInfo: V gene form");

    // first options tests
    assert.includes(html, "<option value=TRG>TRG</option><option value=TRA>TRA</option>","getHtmlInfo: first options in select Locus");
    assert.includes(html, "<option value=undefined V>undefined V</option><option value=TRGV1*01>TRGV1*01</option>",  "getHtmlInfo:  first options in select Vgene");
       
    // Test after germline/segment manual changement
    m.clones[0].changeLocus("IGH"); 
    m.clones[0].changeSegment("testV5", "5");
    html = m.clones[0].getHtmlInfo();
    assert.includes(html, 
        "<option value=IGH>IGH</option><option value=TRA>TRA</option>",
        "getHtmlInfo:  first options in select locus (after changment)"); // after germline changment
    assert.includes(html, 
        "<tr><td>V gene (or 5')</td><td colspan='4'>testV5<div class='div-menu-selector' id='listVsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (V gene) after changment");

    // Test junction in html export
    assert.includes(html, "<tr><td>junction</td><td colspan='4'>aat</td></tr>",
                 "getHtmlInfo c1: junction info for productive clone");   
    html = c3.getHtmlInfo();
    assert.includes(html, "<tr><td>junction</td><td colspan='4'>aaaaaaaaattt</td></tr>",
                 "getHtmlInfo c3: junction info for non productive clone");   
    assert.includes(html, "<tr><td>junction (AA seq)</td><td colspan='4'>WKIC</td></tr>",
                 "getHtmlInfo c3: junction (AAseq) info for non productive clone"); 

});

QUnit.test('clone: get info from seg', function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    assert.ok(c1.hasSeg('cdr3'), "clone1 has CDR3")
    assert.ok(c1.hasSeg('junction'), "clone1 has juction")
    assert.ok(c1.hasSeg('cdr3', 'junction'), "clone1 has both CDR3 and junction")
    assert.notOk(c1.hasSeg('toto'), "clone1 doesn't have toto")
    assert.notOk(c1.hasSeg('junction', 'toto'), "clone1 has junction but doesn't have toto")

    assert.equal(c1.getSegLength('cdr3'), 6, "CDR3 length");
    assert.equal(c2.getSegLength('cdr3'), 'undefined', "no cdr3 in c2");
    var pos_cdr3 = c1.getSegStartStop('cdr3')
    assert.equal(pos_cdr3['start'], 10, "CDR3 length")
    assert.equal(pos_cdr3['stop'], 15, "CDR3 length")
    assert.equal(c1.getSegStartStop('toto'), null, "no toto record")
    var pos_junction = c3.getSegStartStop('junction')
    assert.equal(pos_junction['start'], 2, "junction of c3")
    assert.equal(pos_junction['stop'], 13, "junction of c3")

    pos_junction = c1.getSegStartStop('junction')
    assert.equal(pos_junction['start'], 9, "start junction of c1")
    assert.equal(pos_junction['stop'], 11, "stop junction of c1")

    assert.equal(c1.eValue, 1e-2, 'Evalue of clone 1 should be 1e-2')
    assert.equal(c2.eValue, undefined, 'e-value of clone should not be defined')

    c1.computeEValue()
    assert.equal(c1.eValue, 1e-2, 'Recomputing e-value should not change its value')

    assert.equal(c1.getSegNtSequence('junction'), 'aat', 'junction c1')
    assert.equal(c1.getSegAASequence('junction'), '', 'no AA junction for c1')
    assert.equal(c1.getSegAASequence('cdr3'), 'ABCDE', 'AA CDR3 for c1')

    assert.equal(c1.getDeletion('5', 'delRight'), undefined, 'return -1, no deletion informed for c1')
    assert.equal(c2.getDeletion('5', 'delRight'), 18, 'return length of the deletion for c2')
});

QUnit.test("clone : feature defined by a nucleotide sequence", function(assert) {
    var m = new Model()
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    assert.deepEqual(c3.getSegStartStop('somefeature'), null, "start/stop positions are not present")
    c3.computeSegFeatureFromSeq('somefeature')
    assert.deepEqual(c3.getSegStartStop('somefeature'), {"start": 7, "stop": 13}, "start/stop positions, computed from sequence")
    assert.equal(c3.getSegLength('somefeature'), 7, "length of the feature");
});

QUnit.test("getSequence/RevComp", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    //fix test sequence et revcomp
    assert.equal(c2.getSequence(), "AACGTACCAGG", "C2 getSequence()");
    assert.equal(c2.getRevCompSequence(), "CCTGGTACGTT", "C2 getRevCompSequence()");
    assert.equal(c3.getSequence(), "AAAAAAAAAATTTTTTTTT", "C3 (min case) getSequence()");
    assert.equal(c3.getRevCompSequence(), "AAAAAAAAATTTTTTTTTT", "C3 (min case) getRevCompSequence()");
});


QUnit.test("size", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    assert.equal(c1.getSystemSize(), "0.1", "clone c1 system size : 0.1");
    sizes = c1.getStrAllSystemSize(m.t, true);
    assert.equal(m.getStrAnySize(0, c1.getSystemSize()), "10.00%", "clone c1 system size : 10%");
    assert.equal(sizes.system, "10.00% of TRG", "clone c1 system size: 10%")
    assert.equal(sizes.systemGroup, undefined, "clone c1 system group size: undefined")
    m.select(0)
    m.select(1)
    m.merge()
    
    assert.equal(c1.getReads(), 20, "cluster c1+c2 reads : 20");
    assert.equal(c1.getSize(), 0.10, "cluster c1+c2 size : 0.10");
    assert.equal(c1.getStrSize(), "10.00%", "cluster c1+c2 size (%) : 10%");
    
    assert.equal(c1.get('reads'), 10, "clone c1 reads : 10");
    assert.equal(c1.getSequenceSize(), "0.05", "clone c1 size : 0.05");
    
    
});

QUnit.test("system", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c3 = new Clone(json_clone3, m, 0)
    m.initClones()


    assert.equal(c3.get('germline'), "TRG", "getSystem() >> clone system : TRG");
    assert.equal(c3.getGene('5'), "undefined V", "getV() >> V : undefined");
    assert.equal(c3.getGene('4'), "IGHD2*03", "getD()  >> D (+allele): IGHD2*03");
    assert.equal(c3.getGene('3'), "IGHV4*01", "getJ() >> J (+alelele): IGHV4*01");
    assert.equal(c3.getGene('4', false), "IGHD2", "getD() >> D : IGHD2");
    assert.equal(c3.getGene('3', false), "IGHV4", "getJ() >>J : IGHV4");
    assert.equal(c3.getGene("4"), "IGHD2*03", "getGene() >> D (+allele): IGHD2*03");
    assert.equal(c3.getNlength(), 9, "getNlength() >> 9");
    
});

QUnit.test("tag / color", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    m.initClones()

    assert.equal(c1.getTag(), 8, "getTag() >> default tag : 8");
    c1.updateColor()
    assert.equal(c1.getColor(), "", "getColor() >> default tag color : ");
    
    c1.changeTag(5)
    c1.updateColor()
    assert.equal(c1.getTag(), 5, "changeTag() >> tag : 5");
    assert.equal(c1.getColor(), "#2aa198", "getColor() >> default tag color : ");
    
    m.changeColorMethod("abundance")
    c1.updateColor()
    assert.equal(c1.getColor(), "rgb(36,183,88)", "getColor() >> abundance color : ");
    
});

QUnit.test("color by CDR3", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data);
    var c1 = new Clone(json_clone1, m, 0);
    var c2 = new Clone(json_clone2, m, 0);
    m.initClones();
    var color = c1.getCDR3Color();
    c1.seg.junction.aa = "AZERTY";
    var color2 = c1.getCDR3Color();

    // Actually it could happen that some different CDR3s have the same colours
    assert.equal(color != color2, true, "two CDR3 should have different"
                 + " colors");

    assert.equal(c2.getCDR3Color(), '');
});

QUnit.test("export", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c3 = new Clone(json_clone3, m, 0)
    var c4 = new Clone(json_clone4, m, 1)
    m.initClones()

    assert.equal(c3.getPrintableSegSequence(), "aaaaaa\naaaattttt\ntttt", "c3.getPrintableSegSequence() : Ok");
    assert.equal(c4.getPrintableSegSequence(), "ATGGGTCCAGTCGTGA\nACTGTGCAT\nGCCGATAGACGAGTACGATGCCAGGTATTACC", "c4.getPrintableSegSequence() : Ok");
    console.log(c3.getFasta())
    assert.equal(c3.getFasta(), ">id3    19 nt, 10 reads (5.000%)\naaaaaa\naaaattttt\ntttt\n", "getFasta() : Ok");

    var res3 = [
        "0", "custom name", "id3",
        "TRG", "-/-",
        "undefined V", "IGHD2*03", "IGHV4*01",
        "not productive",
        "aaaaaaaaattt",
        "WKIC",
        "AAAAAAAAAATTTTTTTTT",
        10, 10, 15, 15,
        0.05, 0.1, 0.075, 0.15,
        "19 nt; 10 reads (5.000%)", "19 nt; 10 reads (10.00%)", "19 nt; 15 reads (7.500%)", "19 nt; 15 reads (15.00%)"
    ]
    assert.deepEqual(c3.toCSV(), res3, ".toCSV()")
    assert.equal(c3.toCSVheader(m).length, c3.toCSV().length, ".toCSVheader() length")

    var res4 = [
        "1", "custom name", "id4",
        "TRG", "-/-",
        "undefined V", "IGHD2*03", "IGHV4*01",
        "no CDR3 detected",
        "",
        "",
        "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGTATTACC",
        10, 10, 15, 15,
        0.05, 0.1, 0.075, 0.15,
        "57 nt; 10 reads (5.000%)", "57 nt; 10 reads (10.00%)", "57 nt; 15 reads (7.500%)", "57 nt; 15 reads (15.00%)"
    ]
    assert.deepEqual(c4.toCSV(), res4, "c4.toCSV() - no junctionAA")



    m.select(0)
    m.select(1)
    m.merge()

    assert.equal(c3.toCSV()[0], "0+1", ".toCSV(), merged clone")
});


QUnit.test("changeLocus/Segment", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    // Test after germline manual changement
    m.clones[0].reads = [25,25,25,25]; 
    console.log(m.reads.germline.IGH);
    
    assert.equal(m.reads.germline.IGH.toString(), "100,50,100,50", "m.reads.IGH adaptation (init state)");
    m.clones[0].changeLocus("IGH"); 
    //console.log(m.reads.germline.TRG);
    
    assert.equal(m.reads.germline.IGH.toString(), "125,75,125,75", "m.reads.IGH adaptation (TRG -> IGH)");
    assert.equal(m.reads.germline.TRG.toString(), "75,25,75,25",   "m.reads.TRG adaptation (TRG -> IGH)");
    
    m.clones[0].changeLocus("IGH"); 
    assert.equal(m.reads.germline.IGH.toString(), "125,75,125,75", "m.reads.IGH adaptation (IGH -> IGH)");
    m.clones[0].changeLocus("TRG"); 
    assert.equal(m.reads.germline.IGH.toString(), "100,50,100,50", "m.reads.IGH adaptation (IGH -> TRG)");
    // TODO tests : reads, system_available, 
    
});

QUnit.test("changeNameNotation", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()
    m.changeCloneNotation('short_sequence')
    assert.equal(c2.getShortName(), "IGHV3-23 6/ACGTG/4 D1-1 5/12/4 J5*02", "clone2, .getShortName()");

    m.changeCloneNotation('full_sequence')
    assert.equal(c2.getShortName(), "IGHV3-23 6/ACGTG/4 D1-1 5/CCCACGTGGGGG/4 J5*02", "clone2, .getShortName()");
    m.changeCloneNotation('nucleotide_number')
    assert.equal(c2.getShortName(), "IGHV3-23 6/5/4 D1-1 5/12/4 J5*02", "clone2, .getShortName()");
});


QUnit.test("getLengthDoubleFeature", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    var c4 = new Clone(json_clone4, m, 3)
    m.initClones()

    assert.equal(c2.getSegLengthDoubleFeature('primer5','primer3'), "undefined", "C2 getSegLengthDoubleFeature('primer5','primer3')");
    assert.equal(c4.getSegLengthDoubleFeature('primer5','primer3'), "33", "C4 'getSegLengthDoubleFeature'('primer5','primer3')");
});


QUnit.test("changealleleNotation", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)

    m.initClones()
    m.changeAlleleNotation('always')
    assert.equal(c2.getShortName(), "IGHV3-23*01 6/ACGTG/4 D1-1*01 5/12/4 J5*02", "clone2, .getShortName()");

    m.changeAlleleNotation('when_not_01')
    assert.equal(c2.getShortName(), "IGHV3-23 6/ACGTG/4 D1-1 5/12/4 J5*02", "clone2, .getShortName()");
    m.changeAlleleNotation('never')
    assert.equal(c2.getShortName(), "IGHV3-23 6/ACGTG/4 D1-1 5/12/4 J5", "clone2, .getShortName()");
});

QUnit.test("productivity", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data);
    var c1 = new Clone(json_clone1, m, 0);
    var c2 = new Clone(json_clone2, m, 1);
    var c3 = new Clone(json_clone3, m, 2);
    m.initClones();

    assert.equal(c1.getProductivityName(), "productive", "clone 1 should be productive");
    assert.equal(c1.isProductive(), true, "clone 1 should be productive");
    assert.equal(c1.getPhase(), 0, "Phase of clone 1 should be 0");

    c1.seg.junction.start = 8;
    assert.equal(c1.getPhase(), 2, "Phase of modified clone 1 should be 2");
    c1.seg.junction.start = 7;
    assert.equal(c1.getPhase(), 1, "Phase of modified clone 1 should be 1");
    c1.seg.junction.start = 6;
    assert.equal(c1.getPhase(), 0, "Phase of modified clone 1 should be 0");

    assert.equal(c2.getProductivityName(), "no CDR3 detected", "clone 2 doesn't have information about productivity");
    assert.equal(c2.isProductive(), false, "clone 2 doesn't have information about productivity");
    assert.equal(c2.getPhase(), 'undefined', "No phase for clone 2");

    assert.equal(c3.getProductivityName(), "not productive", "clone 3 should not be productive");
    assert.equal(c3.isProductive(), false, "clone 3 should not be productive");
    assert.equal(c3.getPhase(), 'undefined', "No phase for clone 3");

});
