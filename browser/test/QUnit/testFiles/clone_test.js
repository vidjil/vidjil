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
                "start": 8,
                "stop": 16,
                "aa": "ABCDE"
            },
            "junction": {
                "start": 10,
                "stop": 12,
                "productive": true
            },
            "clonedb": {
                "–": "No occurrence of this clonotype in CloneDB",
                "original": [],
                "clones_names": {}
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
                "productive": false,
                "unproductive": "out-of-frame"
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
        "germline" : "TRG",
        "reads" : [10,10,0,30],
        "normalized_reads" : [20,20,0,null],
    }

// Cmone with seg start and stop position
var json_clone7 = {
      "germline": "IGH",
      "id": "id7",
      "name": "clone with exact position",
      "reads": [0,0,0,0],
      "seg": {
        "3": {
          "delLeft": 1,
          "delRight": 40,
          "name": "IGHJ6*02",
          "start": 16,
          "stop": 25
        },
        "4": {
          "delLeft": 4,
          "delRight": 9,
          "name": "IGHD3-3*01",
          "start": 13,
          "stop": 15
        },
        "5": {
          "delLeft": 0,
          "delRight": 2,
          "name": "IGHV1-69*06",
          "start": 6,
          "stop": 10
        },
        "N1": 15,
        "N2": 0,
        "junction": {
                "aa" : "WKIC",
                "start": 3,
                "stop": 14,
                "productive": false,
                "unproductive": "stop-codon"
            },
      },
      "sequence": "bbbbbVVVVVnnDDDJJJJJJJJJJaaaaaa",
      "top": 7
    }


QUnit.test("name, informations, getHtmlInfo", function(assert) {
    
    assert.equal(json_clone1.seg.junction.start, 10, "Start junction is 10 in JSON for clone 1");
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    data_copy.clones = []
    m.parseJsonData(data_copy)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    assert.equal(c1.seg.junction.start, 9, "Start junction is now 9 for clone 1 as positions start at 0 in the code");
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    var c5 = new Clone(json_clone5, m, 4, c_attributes)
    m.initClones()
    localStorage.clear()
    
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

    assert.equal(c1.warnLevel(), 1, "clone1 is warned (client, bad e-value, but level undef)")
    assert.equal(c2.warnLevel(), 1, "clone2 is not warned (only 'info')")
    assert.equal(c3.warnLevel(), 1, "clone3 is warned with 'warn'")
    assert.equal(c4.warnLevel(), 2, "clone4 is warned with 'error'")
    assert.equal(c5.warnLevel(), 0, "clone5 is not warned")

    assert.equal(c1.isWarned(), 'warn', "clone1 is warned (client, bad e-value)")
    assert.equal(c2.isWarned(), "warn", "clone2 is not warned (level 'info', but warning data level at 'warn')")
    assert.equal(c3.isWarned(), 'warn', "clone3 is warned with 'warn', 'a warning, old style' (code & level undef")
    assert.equal(c4.isWarned(), 'alert', "clone4 is warned with 'error', but max level is 'alert'")
    assert.equal(c5.isWarned(), false, "clone5 is not warned")

    assert.equal(c3.getSequenceName(), "custom name", "get name clone3 : custom name");
    assert.equal(c3.getCode(), "id3", "get code clone3 : id3");
    
    c3.changeName("plop")
    assert.equal(c3.getName(), "plop", "changename clone3 : plop");
    assert.equal(c3.getSequenceName(), "plop", "changename clone3 : plop");
    assert.equal(c1.getNumberNonZeroSamples(), 3, "clone c1, getNumberNonZeroSamples");
    
    assert.equal(c2.getNameAndCode(), some_name, "clone2, .getNameAndCode()");
    assert.equal(c3.getNameAndCode(), "plop (id3)", "clone3, .getNameAndCode()");

    assert.equal(c1.getGCContent(), 0, "clone1 0% GC content");
    assert.equal(typeof(c5.getGCContent()), 'undefined', "clone5, no GC content for c5: no consensus sequence");
    assert.equal(typeof(c5.getCoverage()), 'undefined', "clone5, no GC content for c5: no consensus sequence");
    
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


    html = m.clones[0].getHtmlInfo();
    assert.includes(html, "<h2>Cluster info : hello</h2>")
    assert.includes(html, "<a class='button' id='download_info_0_airr' onclick='m.exportCloneAs(\"airr\", [0])'>AIRR</a>",
             "download buttons (AIRR)")
    assert.includes(html, "<a class='button devel-mode' id='download_info_0_json' onclick='m.exportCloneAs(\"json\", [0])'>JSON</a>",
             "download buttons (JSON)")
    assert.includes(html, "<table id='clone_info_table_0'><tr><th>Samples names</th><td>Diag</td><td>Fu-1</td><td>Fu-2</td><td>Fu-3</td></tr>",
             "getHtmlInfo: cluster info");


    assert.regexp_includes(html, "tr id='modal_line_clonotype_name' ><td  id='modal_line_title_clonotype_name'>clonotype name.*clipboard.*</td><td  colspan='4' id='modal_line_value_clonotype_name'>hello</td></tr>",
             "getHtmlInfo: clone names") // use regexp for clipboard

    assert.includes(html, "<tr><td>clonotype size (n-reads (total reads))</td><td>20  (200)</td><td>20  (100)</td><td>30  (200)</td><td>30  (100)</td></tr><tr><td>clonotype size (%)</td><td>10.00%</td><td>20.00%</td><td>15.00%</td><td>30.00%</td>",
             "getHtmlInfo: clone information");
    assert.regexp_includes(html, "tr id='modal_line_code' ><td  id='modal_line_title_code'>code.*clipboard.*</td><td  colspan='4' id='modal_line_value_code'>hello</td></tr>",
        "getHtmlInfo: representative sequence information; code + clipboard");
    assert.includes(html, "<tr id='modal_line_length' ><td  id='modal_line_title_length'>length</td><td  colspan='4' id='modal_line_value_length'>19</td></tr><tr id='modal_line_e-value' ><td  id='modal_line_title_e-value'>e-value</td><td  colspan='4' id='modal_line_value_e-value'><span class='warning'>0.01</span></td></tr>",
        "getHtmlInfo: representative sequence information; length");
    assert.includes(html, "<tr id='modal_line_e-value' ><td  id='modal_line_title_e-value'>e-value</td><td  colspan='4' id='modal_line_value_e-value'><span class='warning'>0.01</span></td></tr>",
        "getHtmlInfo: representative sequence information; evalue");
    assert.includes(html, "<tr><td>size (n-reads (total reads))</td><td>10  (200)</td><td>10  (100)</td><td>0  (200)</td><td>30  (100)</td></tr><tr><td>size (%)</td><td>5.000%</td><td>10.00%</td><td>−</td><td>30.00%</td></tr>",
        "getHtmlInfo: representative sequence information; size total");
    assert.includes(html, "<tr><td>size (%)</td><td>5.000%</td><td>10.00%</td><td>−</td><td>30.00%</td></tr>",
        "getHtmlInfo: representative sequence information; size %");

    assert.includes(html, "<tr id='modal_header_segmentation' ><td class='header' colspan='5'>segmentation <button type='button' onclick='m.clones[0].toggle()'>edit</button></td></tr>",
        "getHtmlInfo: segmentation information + modification button; header");
    assert.regexp_includes(html, "<tr id='modal_line_sequence' ><td  id='modal_line_title_sequence'>sequence.*clipboard.*</td><td  colspan='4' id='modal_line_value_sequence'>aaaaaaaaaattttttttt</td></tr>",
        "getHtmlInfo: segmentation information + modification button; content");

    // Test on download reads button
    // m.samples.sequence_file_id and m.db_key are undefined, so no getReads should be present
    assert.notIncludes(html, "icon-down", "getReads; icon NOT present if no sequence file given")
    assert.notIncludes(html, "db.get_read", "getReads; db call NOT present if no sequence file given")
    m.samples.sequence_file_id = []

    // Test on download reads button; if correct model values are setted
    // m.samples.sequence_file_id = [1, 2, 3, 4]
    m.db_key = { sample_set_id: "7", config: 2 }
    html_getReads = m.clones[0].getHtmlInfo();
    assert.includes(html_getReads, "icon-down", "getReads; icon PRESENT if sequence_file given")
    assert.includes(html_getReads, "db.get_read", "getReads; db call PRESENT if sequence_file given")

    // Test icon 
    m.clones[0].segEdited = true;
    html = m.clones[0].getHtmlInfo();
    assert.includes(html, "<tr id='modal_header_segmentation' ><td class='header' colspan='5'>segmentation <button type='button' onclick='m.clones[0].toggle()'>edit</button> <img src='images/icon_fav_on.png' alt='This clone has been edited by a user'></td></tr>",
        "getHtmlInfo: segmentation information + modification button + manuallyChanged icon");
    
    // <tr><td>locus</td><td colspan='4'><span title=\"TRG\" class=\"systemBoxMenu\">G</span>TRG</td></tr> // not tested (order of title/class)
    assert.includes(html, "<tr id='modal_line_Productivity' ><td  id='modal_line_title_Productivity'>Productivity</td><td  colspan='4' id='modal_line_value_Productivity'>productive</div></td></tr>",
        "getHtmlInfo: productivity information (if exist)");
    // locus/genes content tests
    // TODO correct this locus test/function for chromium/firefox (inversion des balises)
    assert.includes(html, "<tr id='modal_line_locus' ><td  id='modal_line_title_locus'>locus</td><td  colspan='4' id='modal_line_value_locus'><span class=\"systemBoxMenu\" title=\"TRG\"",
        "getHtmlInfo: segmentation information (Locus)");

    assert.includes(html, "tr id='modal_line_V_gene_or_5_' ><td  id='modal_line_title_V_gene_or_5_'>V gene (or 5')</td><td  colspan='4' id='modal_line_value_V_gene_or_5_'>undefined V<div class='div-menu-selector' id='listVsegment' style='display: none'><form name=Vsegment>",
        "getHtmlInfo: segmentation information (V gene)");
    assert.includes(html, "<tr id='modal_line__D_gene_' ><td  id='modal_line_title__D_gene_'>(D gene)</td><td  colspan='4' id='modal_line_value__D_gene_'>IGHD2*03<div class='div-menu-selector' id='listDsegment' style='display: none'><form name=Dsegment><select class='menu-selector' NAME=Dsegment onChange='m.clones[0].changeSegment(this.form.Dsegment.value, 4);'  style='width: 100px' >",
        "getHtmlInfo: segmentation information (D gene)");
    assert.includes(html, "<tr id='modal_line_J_gene_or_3_' ><td  id='modal_line_title_J_gene_or_3_'>J gene (or 3')</td><td  colspan='4' id='modal_line_value_J_gene_or_3_'>IGHV4*01<div class='div-menu-selector' id='listJsegment' style='display: none'><form name=Jsegment>",
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
        "<tr id='modal_line_V_gene_or_5_' ><td  id='modal_line_title_V_gene_or_5_'>V gene (or 5')</td><td  colspan='4' id='modal_line_value_V_gene_or_5_'>testV5<div class='div-menu-selector' id='listVsegment' style='display: none'><form name=Vsegment>",
        "getHtmlInfo: segmentation information (V gene) after changment");

    // Test external seg key (cloneDB) in html report
    assert.includes(html, "No occurrence of this clonotype in CloneDB");

    // Test junction in html export
    assert.includes(html, "<tr id='modal_line_junction' ><td  id='modal_line_title_junction'>junction</td><td  colspan='4' id='modal_line_value_junction'>att</td></tr>",
                 "getHtmlInfo c1: junction info for productive clone");   
    html = c3.getHtmlInfo();
    assert.includes(html, "<tr id='modal_line_junction' ><td  id='modal_line_title_junction'>junction</td><td  colspan='4' id='modal_line_value_junction'>aaaaaaaatttt</td></tr>",
                 "getHtmlInfo c3: junction info for non productive clone");   
    assert.includes(html, "<tr id='modal_line_junction_AA_seq_' ><td  id='modal_line_title_junction_AA_seq_'>junction (AA seq)<i class='icon-docs' style='cursor: copy' id='modal_line_title_junction_AA_seq__clipboard' onclick='copyTextToClipboard(\"WKIC\", \"junction (AA seq)\", this)' title='Copy to clipboard'></i></td><td  colspan='4' id='modal_line_value_junction_AA_seq_'>WKIC</td></tr>",
                 "getHtmlInfo c3: junction (AAseq) info for non productive clone"); 
    // test sequence if not prsent
    html = c5.getHtmlInfo();
    var notinclude = html.includes("<td>sequence</td>")
    assert.notOk(notinclude, "getHtmlInfo: if no sequence, no field sequence (even if real clone)");

    ////////////////////////////////////////////
    // Test getHTMLinfo getted for distrib clone 
    // ("axes": ["lenSeqAverage", "seg5"])
    m.t = 0
    var raw_data     = {
        "id": "distrib_5", "top":0, "germline": "distrib", 
        "seg":{}, "sequence":0, 
        "reads": [100, 100, 100, 100], 
        "axes": ["lenSeqAverage", "seg5"], "clone_number": [20, 20, 20, 20],
        "distrib_content": ["162", "segV"]
    }
    m = new Model();
    m.samples = {"number":0, "order":[0], "original_names": ["file"]}
    m.reads = {
        "segmented": [200,100,200,100],
        "total": [200,100,200,100],
        "germline": {
          "TRG": [100,50,100,50],
          "IGH": [100,50,100,50]
        }
      }
    dclone = new Clone(raw_data, m, 0, C_INTERACTABLE | C_IN_SCATTERPLOT | C_SIZE_DISTRIB)
    dclone.augmentedDistribCloneData(raw_data.axes, raw_data.distrib_content )
    dclone.axes          = raw_data.axes
    dclone.reads         = raw_data.reads
    dclone.clone_number  = raw_data.clone_number
    dclone.top           = 0
    dclone.active        = true
    dclone.current_reads = JSON.parse(JSON.stringify(raw_data.reads))
    dclone.defineCompatibleClones()
    dclone.updateReadsDistribClones()
    html = m.clones[0].getHtmlInfo();
    // Representative
    var include = html.includes("<td class='header' colspan='2'>representative sequence</td>")
    assert.ok(include, "getHtmlInfo: if clone distrib, keep field 'representative sequence'");
    // Representative
    include = html.includes("total clonotypes size")
    assert.ok(include, "getHtmlInfo: if clone distrib, other line name; 'clonotype size'");
    // Representative
    include = html.includes("current clonotype size")
    assert.ok(include, "getHtmlInfo: if no sequence, field 'current clonotype size'");
    // gene V
    assert.includes(html, "<tr id='modal_line_V_gene_or_5_' ><td  id='modal_line_title_V_gene_or_5_'>V gene (or 5')</td>",
        "getHtmlInfo: distrib clone with seg5 have field segment V");
    
    // Sequence
    var notinclude = html.includes("<td>sequence</td>")
    assert.notOk(notinclude, "getHtmlInfo: if no sequence, no field sequence");
    // gene J
    notinclude = html.includes("<td>J gene (or 3')</td>")
    assert.notOk(notinclude, "getHtmlInfo: if no seg3, no field segment J");
    // Edit button
    notinclude = html.includes("<td class='header' colspan='2'>segmentation <button type='button' onclick='m.clones[0].toggle()'>edit</button></td>")
    assert.notOk(notinclude, "getHtmlInfo: if clone distrib, no edit button");
    // clone short name
    notinclude = html.includes("clone short name")
    assert.notOk(notinclude, "getHtmlInfo: if clone distrib, no 'clone short name'");
    // clone short name
    notinclude = html.includes("db.get_read")
    assert.notOk(notinclude, "getHtmlInfo: if clone distrib, no download reads buttons");
});


QUnit.test("warnText and getHTMLwarning", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)

    c1.warn = [
        {"code": "Wxx", "msg": "a warning that is only an information", "level": "info"},
        {"code": undefined, "msg": undefined, "level": "info"},
        {"code": "W69", "msg": "Several genes with equal probability: IGKV1-39*01 IGKV1D-39*01", "level": "warn"}
    ]

    var text = c1.warnText()
    var expected_text = "Wxx: a warning that is only an information\nW69: Several genes with equal probability: IGKV1-39*01 IGKV1D-39*01"
    assert.includes(text, expected_text, "warnText don't include 'undefined' warning")


    html = c1.getHtmlInfo()
    var expected = "<tr id='modal_line_Wxx' ><td  id='modal_line_title_Wxx'>Wxx</td><td  colspan='4' id='modal_line_value_Wxx'>a warning that is only an information</td></tr><tr id='modal_line_W69' ><td  id='modal_line_title_W69'>W69</td><td  colspan='4' id='modal_line_value_W69'>Several genes with equal probability: IGKV1-39*01 IGKV1D-39*01</td></tr><tr id='modal_header_clonotype' ><td class='header' colspan='5'>clonotype</td></tr>"
    assert.includes(html, expected, "gethmlinfo don't include 'undefined' warning")
});


QUnit.test("getHtmlInfo; feature from script", function(assert) {

    assert.equal(json_clone1.seg.junction.start, 10, "Start junction is 10 in JSON for clone 1");
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    m.initClones()

    m.clones[0].seg_AAA = {
        "5": {"stop": 99, "name": "IGHV3-11*01", "delRight": 3 },
        "evalue_right": {"val": "7.79e-111"}
    }
    m.clones[0].seg_BBB = {
        "feature_val": {"val": "7.79e-111"},
        "feature_str": {"info": "a feature value"},
        "feature_seq": {"seq": "CARLY" },
    }
    
    html_script = m.clones[0].getHtmlInfo();
    console.log( html_script)
    console.log( m.clones[0].sequence)


    // Feature_aaa
    var part_script_aaa_header  = "<tr id='modal_header_Results_of_script_AAA_' ><td class='header' colspan='5'>Results of script 'AAA'</td></tr>"
    assert.includes(html_script, part_script_aaa_header, "Correct row for feature script: header_aaa")
    var part_script_aaa_content_name = "<tr id='modal_line_5' ><td  id='modal_line_title_5'>5</td><td  colspan='4' id='modal_line_value_5'>IGHV3-11*01</td></tr>"
    assert.includes(html_script, part_script_aaa_content_name, "Correct row for feature script: aaa/name")
    var part_script_aaa_content_val = "<tr id='modal_line_evalue_right' ><td  id='modal_line_title_evalue_right'>evalue_right</td><td  colspan='4' id='modal_line_value_evalue_right'>7.79e-111</td></tr>"
    assert.includes(html_script, part_script_aaa_content_val, "Correct row for feature script: aaa/val")

    // Feature_bbb
    var part_script_bbb_header  = "<tr id='modal_header_Results_of_script_BBB_' ><td class='header' colspan='5'>Results of script 'BBB'</td></tr>"
    assert.includes(html_script, part_script_bbb_header, "Correct row for feature script: header bbb")
    var part_script_bbb_content_info = "<tr id='modal_line_feature_val' ><td  id='modal_line_title_feature_val'>feature_val</td><td  colspan='4' id='modal_line_value_feature_val'>7.79e-111</td></tr>"
    assert.includes(html_script, part_script_bbb_content_info, "Correct row for feature script: bbb/info")
    var part_script_bbb_content_val = "<tr id='modal_line_feature_str' ><td  id='modal_line_title_feature_str'>feature_str</td><td  colspan='4' id='modal_line_value_feature_str'>a feature value</td></tr>"
    assert.includes(html_script, part_script_bbb_content_val, "Correct row for feature script: bbb/val")
    var part_script_bbb_content_seq = "<tr id='modal_line_feature_seq' ><td  id='modal_line_title_feature_seq'>feature_seq</td><td  colspan='4' id='modal_line_value_feature_seq'>CARLY</td></tr>"
    assert.includes(html_script, part_script_bbb_content_seq, "Correct row for feature script: bbb/seq")

});

QUnit.test('clone: get info from seg', function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    m.initClones()

    assert.ok(c1.hasSeg('cdr3'), "clone1 has CDR3")
    assert.ok(c1.hasSeg('junction'), "clone1 has juction")
    assert.ok(c1.hasSeg('cdr3', 'junction'), "clone1 has both CDR3 and junction")
    assert.notOk(c1.hasSeg('toto'), "clone1 doesn't have toto")
    assert.notOk(c1.hasSeg('junction', 'toto'), "clone1 has junction but doesn't have toto")

    assert.equal(c1.getSegLength('cdr3'), 9, "CDR3 length");
    assert.equal(c2.getSegLength('cdr3'), 'undefined', "no cdr3 in c2");
    var pos_cdr3 = c1.getSegStartStop('cdr3')
    assert.equal(pos_cdr3['start'], 7, "CDR3 length")
    assert.equal(pos_cdr3['stop'], 15, "CDR3 length")
    assert.equal(c1.getSegStartStop('toto'), null, "no toto record")
    var pos_junction = c3.getSegStartStop('junction')
    assert.equal(pos_junction['start'], 2, "junction of c3")
    assert.equal(pos_junction['stop'], 13, "junction of c3")

    pos_junction = c1.getSegStartStop('junction')
    assert.equal(pos_junction['start'], 9, "start junction of c1")
    assert.equal(pos_junction['stop'], 11, "stop junction of c1")

    assert.equal(c1.getEValue(), 1e-2, 'Evalue of clone 1 should be 1e-2')
    assert.equal(c2.getEValue(), undefined, 'e-value of clone should not be defined')

    assert.equal(c1.getSegNtSequence('junction'), 'att', 'junction c1')
    assert.equal(c1.getSegNtSequence('cdr3'), 'aaatttttt', 'sequence cdr3 c1 (by getSegNtSequence)')
    assert.equal(c1.getSegAASequence('junction'), '', 'no AA junction for c1')
    assert.equal(c1.getSegAASequence('cdr3'), 'ABCDE', 'AA CDR3 for c1')

    assert.equal(c1.getDeletion('5', 'delRight'), undefined, 'return -1, no deletion informed for c1')
    assert.equal(c2.getDeletion('5', 'delRight'), 18, 'return length of the deletion for c2')
});


QUnit.test("getSequence/RevComp", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
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
    c1 = new Clone(json_clone1, m, 0, c_attributes)
    c2 = new Clone(json_clone2, m, 1, c_attributes)
    c3 = new Clone(json_clone3, m, 2, c_attributes)
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
    
    // testgetSize with no norm for scatterplot usage
    m.set_normalization(m.NORM_EXPECTED)
    m.compute_normalization(0,0.20)
    assert.equal(c1.getSize().toFixed(2), 0.20, "c1 get correct size after normalisation");
    assert.equal(c1.getSize(undefined, true), 0.10, "c1 return size with no norm if parameter is setted for");
    
});

QUnit.test("system", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c3 = new Clone(json_clone3, m, 0, c_attributes)
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


QUnit.test("export", function(assert) {
    
    var m = new Model();
    var data_copy = JSON.parse(JSON.stringify(json_data));
    data_copy.clones = []
    m.parseJsonData(data_copy)
    // console.debug(json_data)
    var c3 = new Clone(json_clone3, m, 0, c_attributes)
    var c4 = new Clone(json_clone4, m, 1, c_attributes)
    m.initClones()

    assert.equal(c3.getPrintableSegSequence(), "aaaaaa\naaaattttt\ntttt", "c3.getPrintableSegSequence() : Ok");
    assert.equal(c4.getPrintableSegSequence(), "ATGGGTCCAGTCGTGA\nACTGTGCAT\nGCCGATAGACGAGTACGATGCCAGGTATTACC", "c4.getPrintableSegSequence() : Ok");
    console.log(c3.getFasta())
    assert.equal(c3.getFasta(), ">id3    19 nt, 10 reads (5.000%)\naaaaaa\naaaattttt\ntttt\n", "getFasta() : Ok");

    var res3 = [
        "0", "custom name", "id3",
        "TRG", "none",
        "undefined V", "IGHD2*03", "IGHV4*01",
        "not productive",
        "aaaaaaaatttt",
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
        "TRG", "none",
        "undefined V", "IGHD2*03", "IGHV4*01",
        "no CDR3",
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
    
    // Fasta output for clone with preV and postJ
    var c7 = new Clone(json_clone7, m, 1, c_attributes)
    assert.equal(c7.getFasta(), ">clone with exact position    31 nt, 0 read \nbbbbb\nVVVVV\nnnDDD\nJJJJJJJJJJ\naaaaaa\n", "getFasta() with preV and postJ: Ok");
    // Test if preV and postJ are empty (no empty line waited)
    c7.seg["5"].start = 0
    c7.seg["3"].stop  = c7.sequence.length 
    assert.equal(c7.getFasta(), ">clone with exact position    31 nt, 0 read \nbbbbbVVVVV\nnnDDD\nJJJJJJJJJJaaaaaa\n", "getFasta() with preV and postJ: Ok");

})



QUnit.test("changeLocus/Segment", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
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
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
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
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    m.initClones()

    assert.equal(c2.getSegLengthDoubleFeature('primer5','primer3'), "undefined", "C2 getSegLengthDoubleFeature('primer5','primer3')");
    assert.equal(c4.getSegLengthDoubleFeature('primer5','primer3'), "33", "C4 'getSegLengthDoubleFeature'('primer5','primer3')");
});


QUnit.test("changealleleNotation", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)

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
    var c1 = new Clone(json_clone1, m, 0, c_attributes);
    var c2 = new Clone(json_clone2, m, 1, c_attributes);
    var c3 = new Clone(json_clone3, m, 2, c_attributes);
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

    assert.equal(c2.getProductivityName(), "no CDR3", "clone 2 doesn't have information about productivity");
    assert.equal(c2.isProductive(), false, "clone 2 doesn't have information about productivity");
    assert.equal(c2.getPhase(), 'undefined', "No phase for clone 2");

    assert.equal(c3.getProductivityName(), "not productive", "clone 3 should not be productive");
    assert.equal(c3.isProductive(), false, "clone 3 should not be productive");
    assert.equal(c3.getPhase(), 'undefined', "No phase for clone 3");

});



QUnit.test("attributes", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data);
    var c1 = new Clone(json_clone1, m, 0, c_attributes);
    var c2 = new Clone(json_clone2, m, 1, c_attributes);
    var c3 = new Clone(json_clone3, m, 2, c_attributes);
    m.initClones();



    var clone;
    clone = new Clone(json_clone1, m, 0, C_INTERACTABLE)
    assert.equal(clone.isInteractable(),  true, "clone should be seen as isInteractable");
    assert.equal(clone.hasSizeOther(),  false, "clone should NOT be seen as hasSizeOther");
    
    clone = new Clone(json_clone1, m, 0, C_SIZE_OTHER)
    assert.equal(clone.isInteractable(), false, "clone should NOT be seen as isInteractable");
    assert.equal(clone.hasSizeOther(),   true, "clone should be seen as hasSizeOther");
        
    clone = new Clone(json_clone1, m, 0, C_INTERACTABLE | C_SIZE_OTHER)
    assert.equal(clone.isInteractable(),  true, "clone should NOT be seen as isInteractable");
    assert.equal(clone.hasSizeOther(),   true, "clone should be seen as hasSizeOther");
});

QUnit.test("clonedb", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();

    assert.equal(m.clones[0].numberInCloneDB(), 126, "We should have 126 clone occurrences in CloneDB");
    assert.equal(m.clones[0].numberSampleSetInCloneDB(), 2, "We should have two matching sample sets in CloneDB");

    assert.equal(m.clones[1].numberInCloneDB(), undefined, "");
    assert.equal(m.clones[1].numberSampleSetInCloneDB(), undefined, "");
});


QUnit.test("productivity detailed", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data_productivity, 100);
    m.initClones();
    console.log( json_data_productivity )
    console.log( m.clones )

    var c1 = m.clones[0]
    var c2 = m.clones[1]
    var c3 = m.clones[2]
    var c4 = m.clones[3]
    var c5 = m.clones[4]
    var c6 = m.clones[5]

    assert.equal(c1.getProductivityNameDetailed(), "out-of-frame",     "detailed productivity; out-of-frame");
    assert.equal(c2.getProductivityNameDetailed(), "stop-codon",       "detailed productivity; stop-codon");
    assert.equal(c3.getProductivityNameDetailed(), "not-productive",   "detailed productivity; unproductive simple");
    assert.equal(c4.getProductivityNameDetailed(), "no CDR3", "detailed productivity; without junction");
    assert.equal(c5.getProductivityNameDetailed(), "productive",       "detailed productivity; productive");
    assert.equal(c6.getProductivityNameDetailed(), "no-WPGxG-pattern", "detailed productivity; no-WPGxG-pattern");
});


QUnit.test("isWarnedBool", function(assert) {
    
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    var c5 = new Clone(json_clone5, m, 4, c_attributes)
    m.initClones()
    console.log( c2.warn)
    assert.equal(c1.isWarnedBool(), true,  "clone1 is warned")
    assert.equal(c2.isWarnedBool(), true, "clone2 is not warned")
    assert.equal(c3.isWarnedBool(), true,  "clone3 is warned")
    assert.equal(c4.isWarnedBool(), true,  "clone4 is warned")
    assert.equal(c5.isWarnedBool(), false, "clone5 is not warned")
});


QUnit.test("haveWarning", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data_productivity, 100);
    m.initClones();

    m.clones[0].warn  = [{"code": "W69", "msg": "", "level": "warn"}]
    m.clones[1].warn  = [{"code": "W82", "msg": "", "level": "warn"}]
    m.clones[5].warn  = [{"code": "W69", "msg": "", "level": "warn"}, {"code": "W82", "msg": "", "level": "warn"}]
    
    assert.ok(m.clones[0].haveWarning("W69"), "clone 0, haveWarning(W69)")
    assert.notOk(m.clones[0].haveWarning("W82"), "clone 0, haveWarning(W69)")
    assert.notOk(m.clones[0].haveWarning("Wxx"), "clone 0, haveWarning(W69)")

    assert.notOk(m.clones[1].haveWarning("W69"), "clone 1, haveWarning(W82)")
    assert.ok(m.clones[1].haveWarning("W82"), "clone 1, haveWarning(W82)")
    assert.notOk(m.clones[1].haveWarning("Wxx"), "clone 1, haveWarning(W82)")

    assert.ok(m.clones[5].haveWarning("W69"), "clone 5, haveWarning(Wxx)")
    assert.ok(m.clones[5].haveWarning("W82"), "clone 5, haveWarning(Wxx)")
    assert.notOk(m.clones[5].haveWarning("Wxx"), "clone 5, haveWarning(Wxx)")
});


QUnit.test("clone : feature defined by a nucleotide sequence", function(assert) {
    // Test with sequence already in a feature inside clone
    var m = new Model()
    m.parseJsonData(json_data)
    var c3 = new Clone(json_clone3, m, 0, c_attributes)
    m.initClones()

    assert.deepEqual(c3.getSegStartStop('somefeature'), null, "start/stop positions are not present")
    c3.addSegFeatureFromSeq('somefeature')
    assert.deepEqual(c3.getSegStartStop('somefeature'), {"start": 6, "stop": 12}, "start/stop positions, computed from sequence")
    assert.equal(c3.getSegLength('somefeature'), 7, "length of the feature");
    assert.equal(c3.getSegNtSequence('somefeature'), "aaaattt" , "Seq of the feature");

    // Test with given sequence for new feature
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.populatePrimerSet()

    m.germline.IGH = {
        "IGH5seg":"ACTGAAGTCATTGGAAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAATTTTTAAAAA", 
        "IGH4seg":"gtgtgtgtgtgtgtgtgtgt", 
        "IGH3seg":"GGGGGCCCCCGGGGGCCCCCGGGGGCTATCATATGCATACGGGGGCCCCC"
    }

    // Clone with seg start and stop position
    var clone8 = {
      "germline": "IGH",
      "id": "id7",
      "name": "clone with exact position",
      "reads": [0,0,0,0],
      "seg": {
        "3": {
          "delLeft": 0,
          "name": "IGH3seg",
          "start": -1
        },
        "5": {
          "delRight": 0,
          "name": "IGH5seg",
          "stop": -1,
          "start": 0
        }
      },
      "sequence": "init",
    }
    var clone = new Clone(clone8, m, 0, c_attributes);
    m.initClones();

    primer5_fictif = ["ACTGAAGTCATTGGA", "ttggttggtgttggttggtgttggttggtgttggttggtg","aaccaaccaaaaccaaccaaaaccaaccaaaaccaaccaa","atgcggatgcatgcggatgcatgcggatgcatgcggatgc"]
    primer3_fictif = ["CTATCATATGCATAT", "ttaattaatattaattaatattaattaatattaattaata","aaccaaccaaaaccaaccaaaaccaaccaaaaccaaccaa"]


    //"IGHV1-2*01 // IGHJ1*01",
    // var igh_V1_2_J1_full
    clone.sequence     = m.germline.IGH.IGH5seg + m.germline.IGH.IGH3seg
    clone.seg[5].stop  = 99
    clone.seg[3].start = 100
    assert.deepEqual( clone.getBestMatchingSequence(primer5_fictif, false), [primer5_fictif[0], false], "seq full; BestMatching; primer5, no extend" )
    assert.deepEqual( clone.getBestMatchingSequence(primer5_fictif, [5]),   [primer5_fictif[0], false], "seq full; BestMatching; primer5, extend 5" )

    // not full match, but if extend, have bas_align call
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, []),  [undefined, false],"seq full; BestMatching; primer3, no extend")
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, [5]), [undefined, false],"seq full; BestMatching; primer3, extend 5" )
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, [3]), [primer3_fictif[0], true],"seq full; BestMatching; primer3, extend 3" )
    clone.addSegFeatureFromSeq("primer5", primer5_fictif[0], true)
    clone.addSegFeatureFromSeq("primer3", primer3_fictif[0], true)
    assert.deepEqual( clone.seg["primer5"], {"seq":primer5_fictif[0], "start":0, "stop":14}, "seq full; addSegFeatureFromSeq; Primer5 value")
    assert.deepEqual( clone.seg["primer3"], {"seq":primer3_fictif[0], "start":125, "stop":139}, "seq full; addSegFeatureFromSeq; Primer3 value")
    assert.equal( clone.getSegLengthDoubleFeature('primer5', 'primer3'), 140, "seq full; Correct length for genescan ecngs" ) // ~245
    delete clone.seg["primer5"] // delete for next addSegFeatureFromSeq call
    delete clone.seg["primer3"]


    // Sequence with 5' and 3' deletion
    clone.sequence     = m.germline.IGH.IGH5seg.substr(20, 80) + m.germline.IGH.IGH3seg.substr(0, 25)
    clone.seg[5].stop  = 79
    clone.seg[3].start = 80
    assert.deepEqual( clone.getBestMatchingSequence(primer5_fictif, false), [undefined, false],       "seq short; primer5, no extend" )
    assert.deepEqual( clone.getBestMatchingSequence(primer5_fictif, [5]),  [primer5_fictif[0], true], "seq short; primer5, extend 5" )

    // not full match, but if extend, have bas_align call
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, []),   [undefined, false], "seq short; primer3, no extend")
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, [5]),  [undefined, false], "seq short; primer3, extend 5" )
    assert.deepEqual( clone.getBestMatchingSequence(primer3_fictif, [3]),  [primer3_fictif[0], true], "seq short; primer3, extend 3" )
    
    clone.addSegFeatureFromSeq("primer5", primer5_fictif[0], true)
    clone.addSegFeatureFromSeq("primer3", primer3_fictif[0], true)
    
    assert.deepEqual( clone.seg["primer5"], {"seq":primer5_fictif[0], "start":-20, "stop":-6},  "seq short; addSegFeatureFromSeq; Primer5 value")
    assert.deepEqual( clone.seg["primer3"], {"seq":primer3_fictif[0], "start":105, "stop":119}, "seq short; addSegFeatureFromSeq; Primer3 value")
    assert.equal( clone.getSegLengthDoubleFeature('primer5', 'primer3'), 140, "seq short; Correct length for genescan ecngs" )
    
    delete clone.seg["primer5"]
    delete clone.seg["primer3"]

    // Sequence with 5'(-10) and 3'(-5) deletion, and D insertion (20nt)
    clone.sequence = m.germline.IGH.IGH5seg.substr(20, 70) + m.germline.IGH.IGH4seg + m.germline.IGH.IGH3seg.substr(5, 25)
    clone.seg[5].stop     = 69
    clone.seg[3].start    = 90
    clone.seg[5].delRight = 10
    clone.seg[3].delLeft  = 5
    clone.seg[4]   = {"delLeft": 0, "delRight": 0, "name": "IGH4seg", "start": 70, "stop": 89 }

    clone.addSegFeatureFromSeq("primer5", primer5_fictif[0], true)
    clone.addSegFeatureFromSeq("primer3", primer3_fictif[0], true)
    assert.deepEqual( clone.seg["primer5"], {"seq":primer5_fictif[0], "start":-20, "stop":-6}, "Seq with D; Primer5 value")
    assert.deepEqual( clone.seg["primer3"], {"seq":primer3_fictif[0], "start":110, "stop":124}, "Seq with D; Primer3 value")
    assert.equal( clone.getSegLengthDoubleFeature('primer5', 'primer3'), 145, "Seq with D; Correct length for genescan ecngs (-10+20-5)" ) // ~245
    delete clone.seg["primer5"]
    delete clone.seg["primer3"]

    
});


QUnit.test("export_airr", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    m.initClones();
    var c1 = new Clone(json_clone1, m, 0, c_attributes);
    var c3 = new Clone(json_clone3, m, 1, c_attributes);
    var c7 = new Clone(json_clone7, m, 2, c_attributes);
    
    m.clone(0).reads = [0]  // As it, getAsAirr should return undefined
    m.clone(1).reads = [1]  // else airr will return undefined
    m.clone(2).reads = [10] // else airr will return undefined

    var airr_c1_getted =  c1.getAsAirr(0)
    var airr_c3_getted =  c3.getAsAirr(0)
    var airr_c7_getted =  c7.getAsAirr(0)

    assert.deepEqual(undefined, airr_c1_getted, "getAsAirr return undefined as clone size is null for this time point")
    
    // If reads is not well fill
    airr_c1_getted =  c1.getAsAirr(10) // Pos 10 not exist, so reads should return Nan, and airr undefined
    assert.deepEqual(undefined, airr_c1_getted, "getAsAirr return undefined as clone size is null for this time point")
    
    var airr_c1 = {
      "sample": 0,
      "duplicate_count": 1,
      "locus": "TRG",
      "v_call": "undefined V",
      "d_call": "IGHD2*03",
      "j_call": "IGHV4*01",
      "sequence_id": "id1",
      "sequence": "aaaaaaaaaattttttttt",
      "productive": true,
      "vj_in_frame": "T",
      "stop_codon": "F",
      "_evalue": 0.01,
      "_cdr3": "aaatttttt",
      "_junction": "att"
    }


    m.clone(0).reads = [1] // set a positive value again
    airr_c1_getted =  c1.getAsAirr(0) // update values
    var keys = Object.keys(airr_c1)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        assert.equal(airr_c1_getted[key], airr_c1[key], "Correct airr field getted for c1; key "+ key);
    }


    var airr_c7 = {
      "sample": 0,
      "duplicate_count": 10,
      "locus": "IGH",
      "v_call": "IGHV1-69*06",
      "d_call": "IGHD3-3*01",
      "j_call": "IGHJ6*02",
      "sequence_id": "id7",
      "sequence": "bbbbbVVVVVnnDDDJJJJJJJJJJaaaaaa",
      "productive": false,
      "vj_in_frame": "",
      "stop_codon": "T",
      "_N1": 15,
      "_N2": 0
    }
    var keys = Object.keys(airr_c7)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        assert.equal(airr_c7_getted[key], airr_c7[key], "Correct airr field getted for c7; key "+ key);
    }

    // case of productive
    var airr_c3 = {
      "productive": false,
      "vj_in_frame": "F",
      "stop_codon": "F",
    }
    var keys = Object.keys(airr_c3)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        assert.equal(airr_c3_getted[key], airr_c3[key], "Correct airr field getted for c3; key "+ key);
    }
});


QUnit.test("export_json", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    var c7 = new Clone(json_clone7, m, 0, c_attributes);
    m.initClones();

    var json_c7_getted =  c7.getAsJson(0)
    var expected_json7 = {
      "seg": {
        "3": {
          "delLeft": 1, "delRight": 40,
          "name": "IGHJ6*02",
          "start": 15, "stop": 24
        },
        "4": {
          "delLeft": 4, "delRight": 9,
          "name": "IGHD3-3*01",
          "start": 12, "stop": 14
        },
        "5": {
          "delLeft": 0, "delRight": 2,
          "name": "IGHV1-69*06",
          "start": 5, "stop": 9
        },
        "N1": {"val": 15 },
        "N2": {"val": 0 },
        "junction": {
          "aa": "WKIC",
          "start": 2, "stop": 13,
          "productive": false,
          "unproductive": "stop-codon"
        }
      },
      "id": "id7",
      "index": 0,
      "sequence": "bbbbbVVVVVnnDDDJJJJJJJJJJaaaaaa",
      "reads": [0, 0, 0, 0 ],
      "top": 7,
      "sample": ["Diag.fa", "Fu-1.fa", "Fu-2.fa", "Fu-3.fa"]
    }

    assert.deepEqual(json_c7_getted.seg, expected_json7.seg,           "correct json values getted; seg" )
    assert.deepEqual(json_c7_getted.sequence, expected_json7.sequence, "correct json values getted; sequence" )
    assert.deepEqual(json_c7_getted.top, expected_json7.top,           "correct json values getted; top" )
    assert.deepEqual(json_c7_getted.id, expected_json7.id,             "correct json values getted; id" )
    assert.deepEqual(json_c7_getted.sample, m.samples.original_names,  "correct json values getted; sample original_names" )

});

QUnit.test("Use IMGT getter", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data, 100);
    var c7 = new Clone(json_clone7, m, 0, c_attributes);
    m.initClones();

    c7.seg.imgt = {
      "V-REGION identity %": "100.00",
      "V-REGION identity nt": "111/111 nt",
      "V-REGION identity % (with ins/del events)": "99.10",
      "V-REGION identity nt (with ins/del events)": "110/111 nt"
    }

    assert.deepEqual(c7.getVIdentityIMGT(), "99.10",           "correct values getted if Videntity (with ins/del events)" )

    c7.seg.imgt = {
      "V-REGION identity %": "100.00",
      "V-REGION identity nt": "111/111 nt",
      "V-REGION identity % (with ins/del events)": "",
      "V-REGION identity nt (with ins/del events)": ""
    }

    assert.deepEqual(c7.getVIdentityIMGT(), "100.00",           "correct values getted; if NO Videntity (with ins/del events)" )

});


QUnit.test("deletion_feature", function(assert) {
    var m = new Model();
    m.parseJsonData(json_data)
    var c1 = new Clone(json_clone1, m, 0, c_attributes)
    var c2 = new Clone(json_clone2, m, 1, c_attributes)
    var c3 = new Clone(json_clone3, m, 2, c_attributes)
    var c4 = new Clone(json_clone4, m, 3, c_attributes)
    m.initClones()


    // Give feature name 5/3, without inclusion
    // "primer5": {"start": 2, "stop": 10 }, // 1based state
    // "primer3": {"start": 26, "stop": 34 } // last nt of the real sequence
    //                   primer5                 primer3 
    var c4_init_seq = "ATgggtccagTCGTGAACTGTGCATGccgatagaCGAGTACGATGCCAGGTATTACC"
    var c4_expected_trim53 = "TCGTGAACTGTGCATG"
    var c4_expected_trim5  = "TCGTGAACTGTGCATgccgatagaCGAGTACGATGCCAGGTATTACC".toUpperCase()
    var c4_expected_trim3  = "ATgggtccaGTCGTGAACTGTGCATG".toUpperCase()

    var trimmed_seq_c2 = c2.trimmingFeature("primer5", "primer3", include=false)
    assert.equal(trimmed_seq_c2, c2.sequence, "correct sequence after trimming (c2; no primer feature; return raw sequence)")

    var trimmed_seq_c4_trim53 = c4.trimmingFeature("primer5", "primer3", include=false)
    var trimmed_seq_c4_trim5  = c4.trimmingFeature("primer5", undefined, include=false)
    var trimmed_seq_c4_trim3  = c4.trimmingFeature(undefined, "primer3", include=false)
    assert.equal(trimmed_seq_c4_trim53, c4_expected_trim53, "correct sequence after trimming (c4; primers 5 & 3)")
    assert.equal(trimmed_seq_c4_trim5,  c4_expected_trim5,  "correct sequence after trimming (c4; primers 5 only)")
    assert.equal(trimmed_seq_c4_trim3,  c4_expected_trim3,  "correct sequence after trimming (c4; primers 3 only)")


    // with include of features
    var c4_expected_trim53_include = "gggtccagTCGTGAACTGTGCATgccgataga".toUpperCase()
    var c4_expected_trim5_include  = "gggtccagTCGTGAACTGTGCATgccgatagACGAGTACGATGCCAGGTATTACC".toUpperCase()
    var c4_expected_trim3_include  = "ATgggtccaGTCGTGAACTGTGCATgccgataga".toUpperCase()


    var trimmed_seq_c4_trim53_include = c4.trimmingFeature("primer5", "primer3", include=true)
    var trimmed_seq_c4_trim5_include  = c4.trimmingFeature("primer5", undefined, include=true)
    var trimmed_seq_c4_trim3_include  = c4.trimmingFeature(undefined, "primer3", include=true)
    assert.equal(trimmed_seq_c4_trim53_include, c4_expected_trim53_include, "correct sequence after trimming (c4; primers 5 & 3, include feature)")
    assert.equal(trimmed_seq_c4_trim5_include,  c4_expected_trim5_include,  "correct sequence after trimming (c4; primers 5 only, include feature)")
    assert.equal(trimmed_seq_c4_trim3_include,  c4_expected_trim3_include,  "correct sequence after trimming (c4; primers 3 only, include feature)")


    // with feature outside or partially present in sequence
    c4.seg.primer5 = {"start": -20, "stop": -10 } // outside of sequence
    c4.seg.primer3 = {"start": 50, "stop": 66 } // partially on the sequence
    //                          primer5                                                     primer3 
    var c4_modprimer_init_seq =          "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGTattacc" // length 57
    var c4_modprimer_expected_trim53 =   "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGT"
    var c4_modprimer_expected_trim5  =   "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGTattacc".toUpperCase()
    var c4_modprimer_expected_trim3  =   "ATGGGTCCAGTCGTGAACTGTGCATGCCGATAGACGAGTACGATGCCAGGT".toUpperCase()
    
    var trimmed_seq_c4_modprimer_trim53 = c4.trimmingFeature("primer5", "primer3", include=false)
    var trimmed_seq_c4_modprimer_trim5  = c4.trimmingFeature("primer5", undefined, include=false)
    var trimmed_seq_c4_modprimer_trim3  = c4.trimmingFeature(undefined, "primer3", include=false)
    assert.equal(trimmed_seq_c4_modprimer_trim53, c4_modprimer_expected_trim53, "correct sequence after trimming (c4 outside/partially primer; primers 5 & 3)")
    assert.equal(trimmed_seq_c4_modprimer_trim5,  c4_modprimer_expected_trim5,  "correct sequence after trimming (c4 outside/partially primer; primers 5 only)")
    assert.equal(trimmed_seq_c4_modprimer_trim3,  c4_modprimer_expected_trim3,  "correct sequence after trimming (c4 outside/partially primer; primers 3 only)")
    
}); 


QUnit.test("segment coverage", function(assert) {
    
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    //TODO
    var c1 = m.clones[0]
    var c2 = m.clones[1]
    var c3 = m.clones[2]
    
    // C1 germline V length => 300
    assert.equal(6/300, c1.getGermlineRatio("5"), "getGermlineRatio; 5/V; NO start value")
    c1.seg["5"].start=2
    assert.equal(4/300, c1.getGermlineRatio("5"), "getGermlineRatio; 5/V; WITH start value")

    return
});
