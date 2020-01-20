
QUnit.module("Segmenter", {
});


QUnit.test("segmenter", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var segment = new Segment("segment", m);
    assert.equal(segment.sequence_order.length, 0, "no clones in segmenter at init")
    segment.init() 
    segment.update()
    segment.useSmartUpdateElemStyle = false;

    var done = assert.async(15);
    var delay = 0;
    var step = 200;

    //select test
    m.select(0)
    setTimeout( function() {
        var div0 = document.getElementById("seq0").getElementsByClassName("seq-fixed")[0];
        assert.notEqual(div0.innerHTML.indexOf("test1"), -1, "select : Ok")

        m.select(1)
        done()
    }, delay+=step);
 
    setTimeout( function() {
        var div1 = document.getElementById("seq1").getElementsByClassName("seq-fixed")[0];;
        assert.notEqual(div1.innerHTML.indexOf("test2"), -1, "select : Ok")
        assert.equal(segment.sequence_order[0], 0, "segment.first_clone still set to 0 if clones 0 and 1 are selected")
        
        m.unselect(0)
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(segment.sequence_order[0], 1, "segment.first_clone is set to 1 if clones 0 is unselected")
        
        m.select(2)
        done()
    }, delay+=step);
  
    setTimeout( function() {
        var div2 = document.getElementById("seq2").getElementsByClassName("seq-fixed")[0];
        assert.notEqual(div2.innerHTML.indexOf("test3"), -1, "select : Ok")
       
        m.unselectAll()
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(document.getElementById("seq0").style.display, "none", "unselect : Ok")
        assert.equal(document.getElementById("seq1").style.display, "none", "unselect : Ok")
        assert.equal(document.getElementById("seq2").style.display, "none", "unselect : Ok")
        assert.equal(segment.sequence_order.length, 0, "segment.first_clone is set to -1 when no clones are selected")
        
        m.select(0);
        m.select(2);
        m.unselect(2);
        done()
    }, delay+=step);

    setTimeout( function() {
        var div0 = document.getElementById("seq0").getElementsByClassName("seq-fixed")[0];
        assert.notEqual(div0.innerHTML.indexOf("test1"), -1, "select : Ok")
        assert.equal(document.getElementById("seq2").style.display, "none" , "unselect : Ok")

        m.unselectAll();
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.deepEqual(segment.findPotentialField(), ["","cdr3","fr1", "5", "f1", "V-REGION","J-REGION","D-REGION","CDR3-IMGT"], "potentialField : Ok")

        m.select(0)
        m.focusIn(0)
        m.updateElem([0])
        done()
    }, delay+=step);
    // assert.deepEqual(segment.toFasta(), "> test1 // 5.000%\naaaaaaaaaaaaaaaaaaaAG\n","toFasta :Ok")
    
    setTimeout( function() {
        assert.equal(document.getElementById("seq0").getElementsByClassName("seq-fixed")[0].className.includes("list_focus"), true, "focus : Ok")

        m.focusOut()
        m.updateElem([0])
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.notEqual($("#f0").css("background-color"), "rgb(204, 204, 204)", "focusOut : Ok")
    
        //stats
        m.unselectAll()
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "", "stats (empty) : Ok")

        m.select(0)
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 10 reads (5.000%) ", "stats (1 clone) : Ok")

        m.multiSelect([0,1])
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "2 clones, 30 reads (15.00%) ", "stats (several clones) : Ok")

        // Select multiple clones and check they are ordered.
        m.unselectAll()
        m.multiSelect([0, 1, 2]);
        done()
    }, delay+=step);

    setTimeout( function() {
        var list_html = document.getElementById('listSeq').innerHTML;
        var clone0_pos = list_html.search('"seq0"');
        var clone1_pos = list_html.search('"seq1"');
        var clone2_pos = list_html.search('"seq2"');
        // Clone 2 is more abundant than clone 1 more abundant than clone 0
        assert.ok(clone2_pos < clone1_pos);
        assert.ok(clone1_pos < clone0_pos);
        var fasta = segment.toFasta();
        assert.ok(fasta.indexOf('> test3') < fasta.indexOf('> test2'));
        assert.ok(fasta.indexOf('> test2') < fasta.indexOf('> test1'));
        
        m.unselectAll()
        m.select(2)
        m.changeTime(3)
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(document.getElementsByClassName("stats_content")[0].innerHTML, "1 clone, 3 reads ", "stats (1 clone with few reads) : Ok")
        
        m.unselectAll()
        m.select(2)
        m.select(0)
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(segment.sequence_order[0], 2, "segment.first_clone is set to 2, even if bigger clone is selected")
        done()
    }, delay+=step);

});

QUnit.test("sequence", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.initClones()
    var segment = new Segment("segment", m);
    segment.init()
    segment.update()

    segment.addToSegmenter(4)
    seq1 = new Sequence(4, m, segment)
    seq1.load()
    assert.notEqual(seq1.toString().indexOf("catcatcatgatgctacgatcttac"),-1, "unsegmented sequence")

    h = seq1.get_positionned_highlight('f1', '')
    assert.equal(h.start, 3, '"f1" feature, start')
    assert.equal(h.stop, 6, '"f1" feature, stop')

    h = seq1.get_positionned_highlight('f2', '')
    assert.equal(h.start, 14, '"f2" feature, start')
    assert.equal(h.stop, 19, '"f2" feature, stop')

    segment.updateElemStyle([4]) /* Will remove sequence 4 from the segmenter
                                  * as it is not really selected
                                  */
    segment.addToSegmenter(1)
    seq1 = new Sequence(1, m, segment)
    seq1.load()
    seq1_string = seq1.toString()
    assert.notEqual(seq1.toString().indexOf("cccccg"), -1, "v part of segmented sequence")
    assert.notEqual(seq1_string.indexOf("tccccccca"), -1, "n part of segmented sequence")
    assert.notEqual(seq1_string.indexOf("tca"), -1, "j part of segmented sequence")
});

QUnit.test("segt", function (assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();

    var segment = new Segment("segment",m)
    segment.init();
    segment.update()

    var done = assert.async(3);
    var delay = 0;
    var step = 200;

    m.select(3);
    m.select(1);
    setTimeout( function() {
        assert.equal(m.clone(3).getSequenceName(), "test4", "clone");
        assert.equal(m.clone(3).getSequence(),"GGAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGACAGGCTGAAGGATTGGATCAAGACGTTTGCAAAAGGGACTAGGCTCATAGTAACTTCGCCTGGTAA","sequence")
        m.clone(3).addSegFeatureFromSeq('test_feature','CACCCAGGAGGTGGAGCTGGATATTGAGACT');
        f1 = segment.sequence[3].get_positionned_highlight('test_feature','');
        assert.equal(f1.start, 93 , "feature start");
        assert.equal(f1.stop, 123, "feature stop");
        assert.equal(f1.seq,'CACCCAGGAGGTGGAGCTGGATATTGAGACT', "feature sequence");
        assert.equal(m.clone(3).getSegNtSequence("test_feature"), "CACCCAGGAGGTGGAGCTGGATATTGAGACT", "feature sequence 3");
        assert.deepEqual(m.clone(3).getSegFeature("test_feature"),{"seq": "CACCCAGGAGGTGGAGCTGGATATTGAGACT", "start": 93, "stop": 123}, "feature sequence 4");
        // segment.sequence[3].computeAAseq()
        // assert.equal(m.clone(3).getSegAASequence("cdr3"),"AKDILKSLKQQLATPNWFDP","feature sequence 2")
        // assert.deepEqual(m.clone(3).getSegFeature("cdr3"),{"seq": "CACCCAGGAGGTGGAGCTGGATATTGAGACT", "start": 94, "stop": 124}, "feature sequence 4")
        assert.notEqual(segment.sequence[3].toString(),"ATCCT", "unsegmented sequence");
        assert.equal(segment.sequence[3].toString().indexOf(">cattcta<"),-1, "part of segmented seq");
        assert.equal(segment.sequence[3].is_clone, true);
        assert.equal(segment.sequence[1].is_clone, true);
        var clone3 = m.clone(3);
        assert.deepEqual(segment.sequence[3].getVdjStartEnd(clone3), {"3": {"start": 183,"stop": 241}, "4": {}, "4a": {}, "4b": {}, "5": {"start": 0, "stop": 179}}, "vdj start end");
        var h = segment.sequence[3].get_positionned_highlight('f1','');
        assert.equal(h.start,-1, " start feature value");
        assert.equal(h.stop, -1, "stop feature value");
        assert.deepEqual(segment.sequence[3].get_positionned_highlight("test_feature",""),{"color": "", "css": "highlight_seq", "seq": "CACCCAGGAGGTGGAGCTGGATATTGAGACT", "start": 93, "stop": 123, "tooltip": ""}, "test feature value")
        assert.equal(m.clone(3).getSegLength('test_feature'),31, "feature length");

        m.unselectAll();
        done()
    }, delay+=step);
    

    setTimeout( function() {
        assert.equal(segment.toFasta(), "");

        m.select(3);
        done()
    }, delay+=step);
    
    setTimeout( function() {
        var h = segment.sequence[3].get_positionned_highlight('f1','');
        assert.equal(segment.toFasta(), "> test4 // 2.500%\nGGAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGACAGGCTGAAGGATTGGATCAAGACGTTTGCAAAAGGGACTAGGCTCATAGTAACTTCGCCTGGTAA\n", "fasta seq ")
        assert.ok(segment.isDNA('CACCCAGGAGGTGGAGCTGGATATTGAGACT'), "test dna")
        assert.ok(segment.isAA('CACCCAGGAGGTGGAGCTGGATATTGAGACT'), "test AA")
        assert.ok(segment.isPos(h), "test if an object contain pos")
        assert.deepEqual(segment.findPotentialField(),["", "cdr3", "fr1", "5", "test_feature", "f1", "V-REGION", "J-REGION",  "D-REGION", "CDR3-IMGT"], "find field to highlight")
    
        done()
    }, delay+=step);
})

QUnit.test("segt", function (assert) {
       var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();
    var segment = new Segment("segment",m);
    segment.init();
    segment.update();
    m.select(2)
    segment.addGermlineToSegmenter("IGHD1-1*01","IGH");
    assert.equal(segment.sequence["IGHD1-1*01"].seq.join("").toUpperCase(), "GGGCGCCGGGGCAGATTCTGAACAGCCCCGAGTCACGGTGGGTACAACTGGAACGAC")
    assert.equal(segment.sequence["IGHD1-1*01"].is_clone, false);
    segment.addToSegmenter(2);
    segment.add_all_germline_to_segmenter();
    // segment.updateElem()
    assert.equal(segment.sequence[2].seq.join(" "),"c c c c c c c c c c c c c c c c c c c c", "clone 3 sequence")
    assert.equal(segment.sequence["IGHV1-2*01"].seq.join("").toLowerCase(),"caggtgcagctggtgcagtctggggctgaggtgaagaagcctggggcctcagtgaaggtctcctgcaaggcttctggatacaccttcaccggctactatatgcactgggtgcgacaggcccctggacaagggcttgagtggatgggacggatcaaccctaacagtggtggcacaaactatgcacagaagtttcagggcagggtcaccagtaccagggacacgtccatcagcacagcctacatggagctgagcaggctgagatctgacgacacggtcgtgtattactgtgcgagaga","5 germline")
    assert.equal(segment.sequence["IGHD2-2*02"].seq.join("").toUpperCase(),"GCGGGGACAGGAGGATTTTGTGGGGGCTCGTGTCACTGTGAGGATATTGTAGTAGTACCAGCTGCTATACC","4 germline")
    assert.equal(segment.sequence["IGHJ6*01"].seq.join("").toLowerCase(),"attactactactactacggtatggacgtctgggggcaagggaccacggtcaccgtctcctcagaagaatggccactctagggcctttgttttctgctactgcc","3 germline")

    segment.addSequenceTosegmenter("test","igh", "accccccgtgtagtagtcc")
    assert.equal(segment.sequence["test"].seq.join("").toLowerCase(),"accccccgtgtagtagtcc"," test sequence ")
    assert.equal(segment.sequence["test"].is_clone, false);
  })

QUnit.test("align", function (assert) {
    var m = new Model();
    m.parseJsonData(json_data_align, 100);
    m.initClones();
    var segment = new Segment("segment",m);
    segment.init();
    segment.update();

    //select 2 clones
    m.select(0)
    m.select(1)

    var done = assert.async(3);
    var delay = 0;
    var step = 500;

    setTimeout( function() {
        segment.align()
        done()
    }, delay+=step)

    //test align
    setTimeout( function() {
        var aligned_sequence1 = segment.index[0].getElement("seq-mobil").innerText
        assert.ok(aligned_sequence1.includes("-"), "aligned sequence should contains '-' " + aligned_sequence1 )

        var aligned_sequence2 = segment.index[1].getElement("seq-mobil").innerText
        assert.ok(aligned_sequence2.includes("-"), "aligned sequence should contains '-'" + aligned_sequence2 )

        segment.resetAlign()
        done()
    }, delay+=step)

    //test resetAlign
    setTimeout( function() {
        aligned_sequence1 = segment.index[0].getElement("seq-mobil").innerText
        assert.ok(!aligned_sequence1.includes("-"), "sequence should not contains '-' " + aligned_sequence1 )
    
        aligned_sequence2 = segment.index[1].getElement("seq-mobil").innerText
        assert.ok(!aligned_sequence2.includes("-"), "sequence should not contains '-' " + aligned_sequence2 )
        done()
    }, delay+=step)
})
