
    var json_clone1 = {
        "sequence" : "aaaaaaaaaattttttttt",
        "name" : "hello",
        "id" : "id1",
        "reads" : [10,10,15,15] ,
        "top" : 1,
        "germline" : "TRG",
        "seg" : {
            "3" : "IGHV4*01",
            "4" : "IGHD2*03",
            "3start" : 15,
            "5end" : 5
        }
    }
    
    var json_clone2 = {
        "sequence" : "AACGTACCAGG",
        "id" : "id2",
        "reads" : [10,10,15,15] ,
        "top" : 2,
        "germline" : "TRG",
    }
    
    var json_clone3 = {
        "sequence" : "aacgtaccagg",
        "c_name" : "custom name",
        "id" : "id3",
        "reads" : [10,10,15,15] ,
        "top" : 3,
        "germline" : "TRG",
        "seg" : {
            "3" : "IGHV4*01",
            "4" : "IGHD2*03",
            "3start" : 15,
            "5end" : 5
        }
    }


function includes(result, pattern, message) {
    // Checks that the result includes the pattern
    // TODO: see and use qunit-regexp !
    var res = result.indexOf(pattern) > -1

    if (res) {
        ok(res, message)
    }
    else { // Only for easy debug
        equal(result, "{includes} " + pattern, message)
    }
}

test("clone : name", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()
    
    equal(c1.getSequenceName(), "hello", "get name clone1 : hello");
    equal(c1.getCode(), "hello", "get code clone1 : hello");
    
    equal(c2.getSequenceName(), "id2", "get name clone2 : id2");
    equal(c2.getCode(), "id2", "get code clone2 : id2");
    
    equal(c3.getSequenceName(), "custom name", "get name clone3 : custom name");
    equal(c3.getCode(), "id3", "get code clone3 : id3");
    
    c3.changeName("plop")
    equal(c3.getName(), "plop", "changename clone3 : plop");
    equal(c3.getSequenceName(), "plop", "changename clone3 : plop");
    
    m.select(0)
    m.select(1)
    m.merge()
    
    equal(c1.getReads(), 20, "cluster c1+c2 reads : 20");
    equal(c1.getSize(), 0.10, "cluster c1+c2 size : 0.10");
    equal(c1.getStrSize(), "10.000%", "cluster c1+c2 size (%) : 10%");
    
    equal(c1.get('reads'), 10, "clone c1 reads : 10");
    equal(c1.getSequenceSize(), "0.05", "clone c1 size : 0.05");
    console.log(m.samples.order);

    html = m.clones[0].getHtmlInfo();
    includes(html, "<h2>Cluster info : hello</h2><div id='info_window'><table><tr><th></th><td>Diag</td><td>Fu-1</td><td>Fu-2</td><td>Fu-3</td></tr>",
             "getHtmlInfo: cluster info");

    includes(html, "<tr><td class='header' colspan='5'> clone </td></tr><tr><td> clone name </td><td colspan='4'>hello</td></tr><tr><td> clone size (n-reads (total reads) )</td><td>20  (200)</td><td>20  (100)</td><td>30  (200)</td><td>30  (100)</td></tr><tr><td> clone size (%)</td><td>10.000 % </td><td>20.000 % </td><td>15.000 % </td><td>30.000 % </td>",
             "getHtmlInfo: clone information");
    
    includes(html, "<tr><td class='header' colspan='5'> representative sequence</td></tr><tr><td> sequence name </td><td colspan='4'>hello</td></tr><tr><td> code </td><td colspan='4'>hello</td></tr><tr><td> length </td><td colspan='4'>19</td></tr><tr><td> size (n-reads (total reads) )</td><td>10  (200)</td><td>10  (100)</td><td>15  (200)</td><td>15  (100)</td></tr><tr><td> size (%)</td><td>5.000 % </td><td>10.000 % </td><td>7.500 % </td><td>15.000 % </td></tr>",
             "getHtmlInfo: representative sequence information");

    includes(html, "<tr><td class='header' colspan='5'> segmentation  <button type='button' class='devel-mode' onclick='m.clones[0].toggle()'>edit</button> </td></tr><tr><td> sequence </td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td> id </td><td colspan='4'>id1</td></tr>", 
        "getHtmlInfo: segmentation information + modification button");
    // Test icon 
    m.clones[0].manuallyChanged = true;
    html = m.clones[0].getHtmlInfo();
    includes(html, "<tr><td class='header' colspan='5'> segmentation  <button type='button' class='devel-mode' onclick='m.clones[0].toggle()'>edit</button>  <img src='images/icon_fav_on.png' alt='This clone has been manually changed'></td></tr><tr><td> sequence </td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td> id </td><td colspan='4'>id1</td></tr>", 
        "getHtmlInfo: segmentation information + modification button + manuallyChanged icon");
    
    // <tr><td> locus </td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG</td></tr> // not tested (order of title/class)
    
    // locus/genes content tests
    includes(html, "<tr><td> locus </td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG<div class='div-menu-selector' id='listLocus' style='display: none'>",
        "getHtmlInfo: segmentation information (Locus)");
    includes(html, "<tr><td> V gene (or 5') </td><td colspan='4'>undefined V<div class='div-menu-selector' id='listVsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (V gene)");
    includes(html, "<tr><td> (D gene) </td><td colspan='4'>IGHD2*03<div class='div-menu-selector' id='listDsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (D gene)");
    includes(html, "<tr><td> J gene (or 3') </td><td colspan='4'>IGHV4*01<div class='div-menu-selector' id='listJsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (J gene)");

    // forms tests
    includes(html, 
        "<form name='germ'><select class='menu-selector' NAME='LocusForm' id='germSelector', onChange='m.clones[0].changeLocus(this.form.LocusForm.value);'  style='width: 80px' >",
        "getHtmlInfo: Locus form");
    includes(html, 
        "<form name=Vsegment><select class='menu-selector' NAME=Vsegment onChange='m.clones[0].changeSegment(this.form.Vsegment.value, 5);'  style='width: 100px' >",
        "getHtmlInfo: V gene form");

    // first options tests
    includes(html, "<option value=TRG>TRG</option><option value=TRA>TRA</option>","getHtmlInfo: first options in select Locus");
    includes(html, "<option value=undefined V>undefined V</option><option value=TRGJP2*01>TRGJP2*01</option>",  "getHtmlInfo:  first options in select Vgene");
       
    // Test after germline/segment manual changement
    m.clones[0].changeLocus("IGH"); 
    m.clones[0].changeSegment("testV5", "5");
    html = m.clones[0].getHtmlInfo();
    includes(html, 
        "<option value=IGH>IGH</option><option value=TRA>TRA</option>",
        "getHtmlInfo:  first options in select locus (after changment)"); // after germline changment
    includes(html, 
        "<tr><td> V gene (or 5') </td><td colspan='4'>testV5<div class='div-menu-selector' id='listVsegment' style='display: none'>",
        "getHtmlInfo: segmentation information (V gene) after changment");

});

test("clone : getSequence/RevComp", function() {

    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    //fix test sequence et revcomp
    equal(c2.getSequence(), "AACGTACCAGG", "C2 getSequence()");
    equal(c2.getRevCompSequence(), "CCTGGTACGTT", "C2 getRevCompSequence()");
    equal(c3.getSequence(), "AACGTACCAGG", "C3 (min case) getSequence()");
    equal(c3.getRevCompSequence(), "CCTGGTACGTT", "C3 (min case) getRevCompSequence()");
});


test("clone : size", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    equal(c1.getSystemSize(), "0.1", "clone c1 system size : 0.1");
    equal(c1.getStrSystemSize(), "10.000%", "clone c1 system size : 10%");
    m.select(0)
    m.select(1)
    m.merge()
    
    equal(c1.getReads(), 20, "cluster c1+c2 reads : 20");
    equal(c1.getSize(), 0.10, "cluster c1+c2 size : 0.10");
    equal(c1.getStrSize(), "10.000%", "cluster c1+c2 size (%) : 10%");
    
    equal(c1.get('reads'), 10, "clone c1 reads : 10");
    equal(c1.getSequenceSize(), "0.05", "clone c1 size : 0.05");
    
    
});

test("clone : system", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c3 = new Clone(json_clone3, m, 0)
    m.initClones()


    equal(c3.get('germline'), "TRG", "getSystem() >> clone system : TRG");
    equal(c3.getGene('5'), "undefined V", "getV() >> V : undefined");
    equal(c3.getGene('4'), "IGHD2*03", "getD()  >> D (+allele): IGHD2*03");
    equal(c3.getGene('3'), "IGHV4*01", "getJ() >> J (+alelele): IGHV4*01");
    equal(c3.getGene('4', false), "IGHD2", "getD() >> D : IGHD2");
    equal(c3.getGene('3', false), "IGHV4", "getJ() >>J : IGHV4");
    equal(c3.getGene("4"), "IGHD2*03", "getGene() >> D (+allele): IGHD2*03");
    equal(c3.getNlength(), 9, "getNlength() >> 9");
    
});


test("clone : tag / color", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    m.initClones()

    equal(c1.getTag(), 8, "getTag() >> default tag : 8");
    c1.updateColor()
    equal(c1.getColor(), undefined, "getColor() >> default tag color : ");
    
    c1.changeTag(5)
    c1.updateColor()
    equal(c1.getTag(), 5, "changeTag() >> tag : 5");
    equal(c1.getColor(), "#2aa198", "getColor() >> default tag color : ");
    
    m.changeColorMethod("abundance")
    c1.updateColor()
    equal(c1.getColor(), "rgb(183,36,36)", "getColor() >> abundance color : ");
    
});

test("clone : export", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    m.initClones()

    equal(c1.getPrintableSegSequence(), "aaaaa\naaaaatttt\nttttt", "getPrintableSegSequence() : Ok");
    console.log(c1.getFasta())
    equal(c1.getFasta(), ">hello    200 reads (100.00%)\naaaaa\naaaaatttt\nttttt\n", "getFasta() : Ok");

    
});


test("clone : changeLocus/Segment", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

    // Test after germline manual changement
    m.clones[0].reads = [25,25,25,25]; 
    console.log(m.reads.germline.IGH);
    
    equal(m.reads.germline.IGH.toString(), "100,50,100,50", "m.reads.IGH adaptation (init state)");
    m.clones[0].changeLocus("IGH"); 
    //console.log(m.reads.germline.TRG);
    
    equal(m.reads.germline.IGH.toString(), "125,75,125,75", "m.reads.IGH adaptation (TRG -> IGH)");
    equal(m.reads.germline.TRG.toString(), "75,25,75,25",   "m.reads.TRG adaptation (TRG -> IGH)");
    
    m.clones[0].changeLocus("IGH"); 
    equal(m.reads.germline.IGH.toString(), "125,75,125,75", "m.reads.IGH adaptation (IGH -> IGH)");
    m.clones[0].changeLocus("TRG"); 
    equal(m.reads.germline.IGH.toString(), "100,50,100,50", "m.reads.IGH adaptation (IGH -> TRG)");
    // TODO tests : reads, system_available, 
    
});