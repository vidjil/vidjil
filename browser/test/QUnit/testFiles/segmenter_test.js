
QUnit.module("Segmenter", {
});


QUnit.test("segmenter", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    
    var segment = new Aligner("segment", m);
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
    m.loadGermline()
    m.initClones()

    var segment = new Aligner("segment", m);
    segment.init()
    segment.update()

    segment.addToSegmenter(1);
    segment.addToSegmenter(2);
    segment.addToSegmenter(3);
    segment.addToSegmenter(4);

    var seq1 = segment.sequence[1];
    var seq2 = segment.sequence[2];
    var seq3 = segment.sequence[3];
    var seq4 = segment.sequence[4];


    //test string functions that can be used by layers
    var nucleic4 = seq4.nucleoString();
    assert.equal(nucleic4,    "catcatcatgatgctacgatcttac",  nucleic4.toUpperCase() + " nucleic sequence");

    var amino4 = seq4.aminoString().replace(/(?=\s)[^\r\n\t]/g, '_');
    assert.equal(amino4,      "__I_##_H__D__A__T__I__L__?", amino4 + " amino sequence");

    var aminoSplit4 = seq4.aminoSplitString().replace(/(?=\s)[^\r\n\t]/g, '_');
    assert.equal(aminoSplit4, "___|_|__|__|__|__|__|__|_|", aminoSplit4 + " aminoSplit sequence ");

    m.filter("cat")
    var search4 = seq4.searchString().replace(/(?=\s)[^\r\n\t]/g, '_');
    assert.equal(search4,     "catcatcat_____tac_____tac", search4 + " search 'cat' in sequence");

    //check highlight box position for one default layer
    seq3.updateLetterSpacing();
    var seq3_cdr3 = seq3.updateLayerDiv('IMGT_CDR3', true);
    assert.equal(seq3_cdr3.style.width, "162px",   "div cdr3 width => 162px    // cdr_length*CHAR_WIDTH + 6 // CHAR_WIDTH = 12; cdr3_length = 13")
    assert.equal(seq3_cdr3.style.left, "1329.5px", "div cdr3 start => 1329.5px // cdr_start*CHAR_WIDTH - letterspacing")

});

QUnit.test("segt", function (assert) {
       var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();
    var segment = new Aligner("segment",m);
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
    var segment = new Aligner("segment",m);
    segment.init();
    segment.update();

    if (segment.cgi_address == "") segment.cgi_address = "https://db.vidjil.org/cgi/"
    
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
        var seq1 = segment.sequence[0];
        var seq2 = segment.sequence[1];
        var aligned_sequence1 = seq1.nucleoString();
        assert.ok(aligned_sequence1.includes("–"), "aligned sequence should contains '–' " + aligned_sequence1 )

        var aligned_sequence2 = seq2.nucleoString()
        assert.ok(aligned_sequence2.includes("–"), "aligned sequence should contains '–'" + aligned_sequence2 )

        var nucleo2 = seq2.nucleoString();
        assert.equal( nucleo2, "ATGCATGCATGCATGCCCCCCCCCCCCCCCCCCAAA–––––––––––TTTTTTTTGATCGAT–CGATCGATCGAT",
                      nucleo2.toUpperCase() + " reference sequence spaced");

        var nucleo1 = seq1.nucleoString();
        assert.equal( nucleo1, "ATCCATGTATGCATG–––––CCCCCCCCCCCCCAAATTTTTTTTTTTTTTTTTTTGATCGATCCGATCGAT–GAT",
                      nucleo1.toUpperCase() + " aligned sequence");

        var delet1 = seq1.deletionString();
        assert.equal( delet1.replace(/(?=\s)[^\r\n\t]/g, ' '), "               –––––                                                   –   ",
                      delet1.toUpperCase().replace(/(?=\s)[^\r\n\t]/g, '_') + " deleted nuclotide");

        var sub1 = seq1.substitutionString();
        assert.equal( sub1.replace(/(?=\s)[^\r\n\t]/g, ' '), "  C    T                                                                   ",
                      sub1.toUpperCase().replace(/(?=\s)[^\r\n\t]/g, '_') + " substituted nucleotide");

        var insert1 = seq1.insertionString();
        assert.equal( insert1.replace(/(?=\s)[^\r\n\t]/g, ' '),  "                                    TTTTTTTTTTT               C            ", 
                      insert1.toUpperCase().replace(/(?=\s)[^\r\n\t]/g, '_') + " inserted nucleotide");

        segment.resetAlign()
        done()
    }, delay+=step)

    //test resetAlign
    setTimeout( function() {
        aligned_sequence1 = segment.index[0].getElement("seq-mobil").innerText
        assert.ok(!aligned_sequence1.includes("–"), "sequence should not contains '–' " + aligned_sequence1 )
    
        aligned_sequence2 = segment.index[1].getElement("seq-mobil").innerText
        assert.ok(!aligned_sequence2.includes("–"), "sequence should not contains '–' " + aligned_sequence2 )
        done()
    }, delay+=step)
})

QUnit.test("reset", function (assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();

    var segment = new Aligner("segment",m);
    segment.init();

    m.select(0)

    var done = assert.async(4);
    var delay = 0;
    var step = 500;

    setTimeout( function() {
        assert.ok((segment.index[0].getElement("seq-mobil").innerText != ""), "sequence 0 is in segmenter ")
        done()
    }, delay+=step)

    setTimeout( function() {
        segment.reset()
        segment.init()
        m.unselectAll()
        done()
    }, delay+=step)

    setTimeout( function() {
        assert.ok((document.getElementById("listSeq").innerText == ""), "segmenter should be empty after reset ")
        m.select(0)
        done()
    }, delay+=step)

    setTimeout( function() {
        assert.ok((segment.index[0].getElement("seq-mobil").innerText != ""), "sequence 0 is back in segmenter ")
        done()
    }, delay+=step)
 
})

