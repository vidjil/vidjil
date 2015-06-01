
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
        "sequence" : "aaaaaaaaaaaaaaaaaaaaa",
        "id" : "id2",
        "reads" : [10,10,15,15] ,
        "top" : 2,
        "germline" : "TRG",
    }
    
    var json_clone3 = {
        "sequence" : "aaaaaaaaaaaaaaaaaaaaa",
        "c_name" : "custom name",
        "id" : "id3",
        "reads" : [10,10,15,15] ,
        "top" : 3,
        "germline" : "TRG",
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
    console.log(m.samples.order)

    html = c1.getHtmlInfo()
    includes(html, "<h2>Cluster info : hello</h2><div id='info_window'><table><tr><th></th><td>Diag</td><td>Fu-1</td><td>Fu-2</td><td>Fu-3</td></tr>",
             "getHtmlInfo: cluster info");

    includes(html, "<tr><td class='header' colspan='5'> clone </td></tr><tr><td> clone name </td><td colspan='4'>hello</td></tr><tr><td> clone size (n-reads (total reads) )</td><td>20  (200)</td><td>20  (100)</td><td>30  (200)</td><td>30  (100)</td></tr><tr><td> clone size (%)</td><td>10.000 % </td><td>20.000 % </td><td>15.000 % </td><td>30.000 % </td>",
             "getHtmlInfo: clone information");
    
    includes(html, "<tr><td class='header' colspan='5'> representative sequence</td></tr><tr><td> sequence name </td><td colspan='4'>hello</td></tr><tr><td> code </td><td colspan='4'>hello</td></tr><tr><td> length </td><td colspan='4'>19</td></tr><tr><td> size (n-reads (total reads) )</td><td>10  (200)</td><td>10  (100)</td><td>15  (200)</td><td>15  (100)</td></tr><tr><td> size (%)</td><td>5.000 % </td><td>10.000 % </td><td>7.500 % </td><td>15.000 % </td></tr>",
             "getHtmlInfo: representative sequence information");

    includes(html, "<tr><td class='header' colspan='5'> segmentation  <button type='button' onclick='m.clones[0].toggle()'>manual edit</button> </td></tr><tr><td> sequence </td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td> id </td><td colspan='4'>id1</td></tr>", "getHtmlInfo: segmentation information + modification button");
    // Test icon 
    c1.manuallyChanged = true;
    html = c1.getHtmlInfo()
    includes(html, "<tr><td class='header' colspan='5'> segmentation  <button type='button' onclick='m.clones[0].toggle()'>manual edit</button>  <img src='images/icon_fav_on.png' alt='This clone has been manually changed'></td></tr><tr><td> sequence </td><td colspan='4'>aaaaaaaaaattttttttt</td></tr><tr><td> id </td><td colspan='4'>id1</td></tr>", "getHtmlInfo: segmentation information + modification button + icon");
    
    // <tr><td> locus </td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG</td></tr> // not tested (order of title/class)
    
    // TODO : Corrections after germline.js correction
    includes(html, "<tr><td> V gene (or 5') </td><td colspan='4'>undefined V<div id='listVsegment' style='display: none'><form name=Vsegment><select NAME=Vsegment onChange='m.clones[0].changeSegment(this.form.Vsegment.value, 5);'><option value=undefined V>undefined V</option><option value=TRGJP2*01>TRGJP2*01</option><option value=TRGV1*01>TRGV1*01</option><option value=TRGV10*01>TRGV10*01</option><option value=TRGV10*02>TRGV10*02</option><option value=TRGV11*01>TRGV11*01</option><option value=TRGV11*02>TRGV11*02</option><option value=TRGV2*01>TRGV2*01</option><option value=TRGV2*02>TRGV2*02</option><option value=TRGV3*01>TRGV3*01</option><option value=TRGV3*02>TRGV3*02</option><option value=TRGV4*01>TRGV4*01</option><option value=TRGV4*02>TRGV4*02</option><option value=TRGV5*01>TRGV5*01</option><option value=TRGV5P*01>TRGV5P*01</option><option value=TRGV5P*02>TRGV5P*02</option><option value=TRGV8*01>TRGV8*01</option><option value=TRGV9*01>TRGV9*01</option><option value=TRGV9*02>TRGV9*02</option><option value=TRGVA*01>TRGVA*01</option></select></form></div></td></tr>", "getHtmlInfo: segmentation information (V gene)");
    includes(html, "<tr><td> (D gene) </td><td colspan='4'>IGHD2*03<div id='listDsegment' style='display: none'><form name=Dsegment><select NAME=Dsegment onChange='m.clones[0].changeSegment(this.form.Dsegment.value, 4);'><option value=IGHD2*03>IGHD2*03</option></select></form></div></td></tr>", "getHtmlInfo: segmentation information (D gene)");
    includes(html, "<tr><td> J gene (or 3') </td><td colspan='4'>IGHV4*01<div id='listJsegment' style='display: none'><form name=Jsegment><select NAME=Jsegment onChange='m.clones[0].changeSegment(this.form.Jsegment.value, 3);'><option value=IGHV4*01>IGHV4*01</option><option value=TRDV3*02>TRDV3*02</option><option value=TRGJ1*01>TRGJ1*01</option><option value=TRGJ1*02>TRGJ1*02</option><option value=TRGJ2*01>TRGJ2*01</option><option value=TRGJP*01>TRGJP*01</option><option value=TRGJP1*01>TRGJP1*01</option><option value=TRGJP2*01>TRGJP2*01</option><option value=TRDJ4*01>TRDJ4*01</option><option value=TRGJ1*01>TRGJ1*01</option><option value=TRGJ1*02>TRGJ1*02</option><option value=TRGJ2*01>TRGJ2*01</option><option value=TRGJP*01>TRGJP*01</option><option value=TRGJP1*01>TRGJP1*01</option><option value=TRGJP2*01>TRGJP2*01</option></select></form></div></td></tr>", "getHtmlInfo: segmentation information (J gene)");
    
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
    var c1 = new Clone(json_clone1, m, 0)
    m.initClones()


    equal(c1.get('germline'), "TRG", "getSystem() >> clone system : TRG");
    equal(c1.getGene('5'), "undefined V", "getV() >> V : undefined");
    equal(c1.getGene('4'), "IGHD2*03", "getD()  >> D (+allele): IGHD2*03");
    equal(c1.getGene('3'), "IGHV4*01", "getJ() >> J (+alelele): IGHV4*01");
    equal(c1.getGene('4', false), "IGHD2", "getD() >> D : IGHD2");
    equal(c1.getGene('3', false), "IGHV4", "getJ() >>J : IGHV4");
    equal(c1.getGene("4"), "IGHD2*03", "getGene() >> D (+allele): IGHD2*03");
    equal(c1.getNlength(), 9, "getNlength() >> 9");
    
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
