
    var json_clone1 = {
        "sequence" : "abcdefghijklmnopqrstuvwxyz",
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
    equal(c1.getHtmlInfo(), "<h2>Cluster info : hello</h2><div id='info_window'><table><tr><th></th><td>Diag</td><td>Fu-1</td><td>Fu-2</td><td>Fu-3</td></tr><tr><td class='header' colspan='5'> clone </td></tr><tr><td> clone name </td><td colspan='4'>hello</td></tr><tr><td> clone size (n-reads (total reads) )</td><td>20  (200)</td><td>20  (100)</td><td>30  (200)</td><td>30  (100)</td></tr><tr><td> clone size (%)</td><td>10.000 % </td><td>20.000 % </td><td>15.000 % </td><td>30.000 % </td><tr><td class='header' colspan='5'> representative sequence</td></tr><tr><td> sequence name </td><td colspan='4'>hello</td></tr><tr><td> code </td><td colspan='4'>hello</td></tr><tr><td> length </td><td colspan='4'>26</td></tr><tr><td> size (n-reads (total reads) )</td><td>10  (200)</td><td>10  (100)</td><td>15  (200)</td><td>15  (100)</td></tr><tr><td> size (%)</td><td>5.000 % </td><td>10.000 % </td><td>7.500 % </td><td>15.000 % </td></tr><tr><td class='header' colspan='5'> segmentation</td></tr><tr><td> sequence </td><td colspan='4'>abcdefghijklmnopqrstuvwxyz</td></tr><tr><td> id </td><td colspan='4'>id1</td></tr><tr><td> 5 </td><td colspan='4'>undefined V</td></tr><tr><td> 4 </td><td colspan='4'>IGHD2*03</td></tr><tr><td> 3 </td><td colspan='4'>IGHV4*01</td></tr><tr><td class='header' colspan='5'> &nbsp; </td></tr></table></div>",          
              "getHtmlInfo"); 
    

});

test("clone : size", function() {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0)
    var c2 = new Clone(json_clone2, m, 1)
    var c3 = new Clone(json_clone3, m, 2)
    m.initClones()

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
