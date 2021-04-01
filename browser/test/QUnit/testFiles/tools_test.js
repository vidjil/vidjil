QUnit.module("Tools", {
});

QUnit.test("test get_codons", function(assert) {
    SYMBOL_VOID = "-"; // overwrite default "–"
    var r = 'ATGATAGAC';
    var s = 'AAACCCGGG';
    var codons = get_codons(r, s, 0);
    assert.deepEqual(codons, {ref : ['ATG', 'ATA', 'GAC'], seq : ['AAA', 'CCC', 'GGG']});

    codons = get_codons(r, s, 1);
    assert.deepEqual(codons, {ref : ['A', 'TGA', 'TAG', 'AC'], seq : ['A', 'AAC', 'CCG', 'GG']});

    codons = get_codons(r, s, 2);
    assert.deepEqual(codons, {ref : ['AT', 'GAT', 'AGA', 'C'], seq : ['AA', 'ACC', 'CGG', 'G']});

    r = 'ATG--ATAGACAG';
    s = 'AAACCCG-GGGTT';

    codons = get_codons(r, s, 0);
    assert.deepEqual(codons, {ref : ['ATG', '--', 'ATA', 'GAC', 'AG'],
                              seq : ['AAA', 'CC', 'CG-', 'GGG', 'TT']});

    codons = get_codons(r, s, 1);
    assert.deepEqual(codons, {ref : ['A', 'TG--A', 'TAG', 'ACA', 'G'],
                              seq : ['A', 'AACCC', 'G-G', 'GGT', 'T']});

    codons = get_codons(r, s, 2);
    assert.deepEqual(codons, {ref : ['AT', 'G--AT', 'AGA', 'CAG'],
                              seq : ['AA', 'ACCCG', '-GG', 'GTT']});

    r = '-----ATG--ATAGA--CAG';
    s = '--GACAAACCCG-GG--GTT';

    codons = get_codons(r, s, 0);
    assert.deepEqual(codons, {ref : ['-----', 'ATG', '--', 'ATA', 'GA--C', 'AG'],
                              seq : ['--GAC', 'AAA', 'CC', 'CG-', 'GG--G', 'TT']});

    codons = get_codons(r, s, 1);
    assert.deepEqual(codons, {ref : ['-----A', 'TG--A', 'TAG', 'A--CA', 'G'],
                              seq : ['--GACA', 'AACCC', 'G-G', 'G--GT', 'T']});

    codons = get_codons(r, s, 2);
    assert.deepEqual(codons, {ref : ['-----AT', 'G--AT', 'AGA', '--', 'CAG'],
                              seq : ['--GACAA', 'ACCCG', '-GG', '--', 'GTT']});

});

QUnit.test("test get_mutations", function(assert) {
    var r = 'ATAGATAGATAG';
    var mutations = get_mutations(r, r, 0);
    assert.equal (Object.keys(mutations).length, 0, "No mutation");
    mutations = get_mutations(r, r, 1);
    assert.equal (Object.keys(mutations).length, 0, "No mutation");
    mutations = get_mutations(r, r, 2);
    assert.equal (Object.keys(mutations).length, 0, "No mutation");

    // GAT > GAc (give same D AA)
    var s = 'ATAGACAGATAG';
    //       0123456789
    mutations = get_mutations(r, s, 0);
    assert.equal (Object.keys(mutations).length, 1, "Single mutation");
    assert.equal (mutations[5], SILENT, "Silent mutation");

    // ATA > AcA (I > T)
    mutations = get_mutations(r, s, 1);
    assert.equal (Object.keys(mutations).length, 1, "Single mutation");
    assert.equal (mutations[5], SUBST, "Silent mutation");

    // TAG > cAG (* > Q)
    mutations = get_mutations(r, s, 2);
    assert.equal (Object.keys(mutations).length, 1, "Single mutation");
    assert.equal (mutations[5], SUBST, "Silent mutation");

    r = 'ATAGATAG-TAG';
    s = 'ATA-ATCGATAG';
    //   012345678901

    // AG-T > cGAT (no base in the reference → can't tell if the mutation is silent)
    mutations = get_mutations(r, s, 0);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations");
    assert.deepEqual(mutations, {3 : DEL, 6 : SUBST, 8 : INS});

    // ATA > ATc (I)
    mutations = get_mutations(r, s, 1);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations (including a SILENT)");
    assert.deepEqual(mutations, {3 : DEL, 6 : SILENT, 8 : INS});

    // TAG > TcG (* > S)
    mutations = get_mutations(r, s, 2);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations");
    assert.deepEqual(mutations, {3 : DEL, 6 : SUBST, 8 : INS});

    // Same example, with end codons
    mutations = get_mutations(r, s, 0, true);
    assert.equal(Object.keys(mutations).length, 6, "Six mutations + end codons");
    assert.deepEqual(mutations, {2 : END_CODON, 3 : DEL, 5 : END_CODON, 6 : SUBST, 8 : INS, 9 : END_CODON});

    mutations = get_mutations(r, s, 1, true);
    assert.equal(Object.keys(mutations).length, 5, "Five mutations + end codons (including a SILENT)");
    assert.deepEqual(mutations, {0 : END_CODON, 3 : END_CODON + DEL, 6 : END_CODON + SILENT, 8 : INS, 10: END_CODON});

    mutations = get_mutations(r, s, 2, true);
    assert.equal(Object.keys(mutations).length, 7, "Seven mutations + end codons");
    assert.deepEqual(mutations, {1 : END_CODON, 3 : DEL, 4 : END_CODON, 6 : SUBST, 7 : END_CODON, 8 : END_CODON + INS, 11 : END_CODON});

    // Same example as before but with common indels to check that they are ignored
    r = 'ATAGAT-AG-TA--G';
    s = 'ATA-AT-CGATA--G';
    //   0123456789

    // AG-T > cGAT
    mutations = get_mutations(r, s, 0);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations");
    assert.deepEqual(mutations, {3 : DEL, 7 : SUBST, 9 : INS});

    // ATA > ATC (I)
    mutations = get_mutations(r, s, 1);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations");
    assert.deepEqual(mutations, {3 : DEL, 7 : SILENT, 9 : INS});

    // TAG > TcG (* > S)
    mutations = get_mutations(r, s, 2);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations");
    assert.deepEqual(mutations, {3 : DEL, 7 : SUBST, 9 : INS});

    mutations = get_mutations(r, s);
    assert.equal(Object.keys(mutations).length, 3, "Three mutations without phase");
    assert.deepEqual(mutations, {3 : DEL, 7 : SUBST, 9 : INS});
});

QUnit.test("test nth_ocurrence", function(assert) {
        var str = "needle needle needle needle";
        var m = nth_ocurrence(str, 'n', 3);
        assert.ok(m === 14, "Looking for the 3rd occurence of n in " + str);
        var m = nth_ocurrence(str, 'E', 3);
        assert.ok(m === false, "search is casesensitive: no E in " + str);
        var m = nth_ocurrence(str, 'z', 3);
        assert.ok(m === false, "No z in " + str);
    }
);

QUnit.test("test getSpeciesCommonName", function(assert) {
    assert.equal(getSpeciesCommonName("homo sapiens"), "human");
    assert.equal(getSpeciesCommonName("Homo sapiens"), "human");
    assert.equal(getSpeciesCommonName("mus musculus"), "house mouse");
    assert.equal(getSpeciesCommonName("gallus gallus"), "chicken");
});

QUnit.test("test tsvToArray", function(assert) {
        var tabstring = "head1\thead2\thead3\thead4\nLine 1 data1\tLine 1 data2\tLine 1 data3\tLine 1 data4\n";
        tabstring += "Line 2 data1\tLine 2 data2\tLine 2 data3\tLine 2 data4";
        var aTest = tsvToArray(tabstring);
        assert.ok(aTest[0].head3 === "Line 1 data3", "Array[0].head3 =='Line 1 data3'");
        assert.ok(aTest[1].head2 === "Line 2 data2", "Array[1].head2=='Line 2 head2'");
        assert.ok(aTest[5] == null, "This is only a 2 lines array, no line #5");
    }
    );


QUnit.test("floatToFixed", function(assert) {
    assert.equal(floatToFixed(0, 4), "0.00");
    assert.equal(floatToFixed(0.1, 4), "0.10");
    assert.equal(floatToFixed(0.1234, 5), "0.123");
    assert.equal(floatToFixed(12.345, 3), "12");
    assert.equal(floatToFixed(12.345, 4), "12.3");
});


QUnit.test("test rounding functions", function(assert) {
    assert.equal(floor_pow10(0.072), 0.01, "nice_floor_pow10 0.072");

    assert.equal(nice_ceil(0), 0, "rounding 0");
    assert.equal(nice_ceil(0.072), 0.08, "rounding 0.08");
    assert.equal(nice_ceil(1.2, 0.5), 1.5, "rounding 1.2");
    assert.equal(nice_ceil(18), 20, "rounding 1.2");
    assert.equal(nice_ceil(100), 100, "rounding 100");

    assert.equal(nice_floor(0), 0, "rounding 0");
    assert.equal(nice_floor(0.072), 0.07, "rounding 0.072");
    assert.equal(nice_floor(100), 100, "rounding 100");
    assert.equal(nice_floor(451), 400, "rounding 451");

    assert.equal(nice_floor(23.4), 20, "rounding 23.4");
    assert.equal(nice_floor(23.4, 1), 23, "rounding 23.4 (base 1)");
    assert.equal(nice_floor(23.4, 100), 0, "rounding 23.4 (base 100)");
    
    assert.equal(nice_number_digits(42, 1), 0, "nice_number_digits 42");
    assert.equal(nice_number_digits(45.1, 2), 0, "nice_number_digits 45.1");
    assert.equal(nice_number_digits(4.51, 2), 1, "nice_number_digits 4.51");
    assert.equal(nice_number_digits(0.4, 2), 2, "nice_number_digits 0.4");
    assert.equal(nice_number_digits(0.045, 2), 3, "nice_number_digits 0.045");
    }
);

QUnit.test("test nice_min_max_steps", function(assert) {
    assert.deepEqual(nice_min_max_steps(347.34, 354.23, 10), {min: 347, max: 355, step: 1, nb_steps: 8}, "347.34..354.23 (10)");
    assert.deepEqual(nice_min_max_steps(17, 305, 20), {min: 0, max: 320, step: 20, nb_steps: 16}, "17..305 (20)");
    assert.deepEqual(nice_min_max_steps(17, 305, 10), {min: 0, max: 350, step: 50, nb_steps: 7}, "17..305 (10)");
    assert.deepEqual(nice_min_max_steps(17, 305, 4), {min: 0, max: 400, step: 100, nb_steps: 4}, "17..305 (4)");

    assert.deepEqual(nice_min_max_steps(190, 310, 15), {min: 190, max: 310, step: 10, nb_steps: 12}, "190..310 (15)");
    assert.deepEqual(nice_min_max_steps(190, 310, 3), {min: 150, max: 350, step: 100, nb_steps: 2}, "190..310 (3)");

    assert.deepEqual(nice_min_max_steps(0.54, 1.05, 7), {min: 0.5, max: 1.1, step: 0.1, nb_steps: 7}, "0.54..1.05 (7)");

    assert.deepEqual(nice_min_max_steps(0.03, 19.24, 5), {min: 0, max: 20, step: 5, nb_steps: 4}, "0.03..19.24 (5)");
    assert.deepEqual(nice_min_max_steps(0, 7, 4), {min: 0, max: 8, step: 2, nb_steps: 4}, "0..7 (4)");

    assert.deepEqual(nice_min_max_steps(43, 103, 5), {min: 40, max: 120, step: 20, nb_steps: 4}, "43..103 (5)");
    assert.deepEqual(nice_min_max_steps(43, 103, 3), {min: 0, max: 150, step: 50, nb_steps: 3}, "43..103 (3)");

    assert.deepEqual(nice_min_max_steps(42, 42, 20), {min: 40, max: 50, step: 10, nb_steps: 1}, "42..42 (20)");
});

QUnit.test("prepend_path_if_not_web", function(assert) {
    assert.equal(prepend_path_if_not_web('/tata', 'toto'), 'toto/tata');
    assert.equal(prepend_path_if_not_web('http://toto', 'toto'), 'http://toto');
    assert.equal(prepend_path_if_not_web('ftp://toto', 'toto'), 'ftp://toto');
});

QUnit.test("processCloneDBContents", function(assert) {
    var emptyResult = [];
    var m = new Model();
    m.parseJsonData(json_data, 100);

    assert.deepEqual(processCloneDBContents(emptyResult, m), {'original': [],
                                                           'clones_names': {},
                                                           '–': 'No occurrence of this clone in CloneDB'},
                     "processing empty result");
    
    var singleResult = [{'tags': {'sample_set_viewable': [true, true],
                                  'sample_set_name': ['patient', null],
                                  'sample_set': ["15", "152"],
                                  'config_id': ['1024'],
                                  'config_name': ['config'],
                                  'sample_name': ['toto'],
                                  'percentage' : [.1242]
                                 },
                         'occ': 3,
                         'V' : 'IGHV1*02',
                         'J' : 'IGHJ3*01'}];
    assert.deepEqual(processCloneDBContents(singleResult, m),
                     {'<a href="?sample_set_id=15&config=1024">patient</a> (config)': "3 clones (12.42%)",
                      '<a href="?sample_set_id=152&config=1024">152</a> (config)': "3 clones (12.42%)",
                      'clones_names': {
                          '152' : [3, .1242],
                          'patient' : [3, .1242]
                      },
                      'original': singleResult}, "processing one result");

    var multipleResults = [{'tags': {'sample_set_viewable': [true, true],
                                  'sample_set_name': ['patient', null],
                                  'sample_set': ["15", "152"],
                                  'config_id': ['1024'],
                                  'config_name': ['config'],
                                  'percentage': [.15],
                                  'sample_name': ['toto']},
                         'occ': 3,
                         'V' : 'IGHV1*02',
                         'J' : 'IGHJ3*01'},
                        // Different clone from the previous one but a common sample set
                        {'tags': {'sample_set_viewable': [true],
                                  'sample_set_name': [null],
                                  'sample_set': ["152"],
                                  'config_id': ['1024'],
                                  'config_name': ['config'],
                                  'percentage': [.1],
                                  'sample_name': ['toto']},
                         'occ': 2,
                         'V' : 'IGHV1*01',
                         'J' : 'IGHJ2*01'},
                           // Test that the not viewable are not taken into account
                       {'tags': {'sample_set_viewable': [false],
                                  'sample_set_name': ['secret'],
                                  'sample_set': ["666"],
                                  'config_id': ['10'],
                                  'config_name': ['[old] config'],
                                  'percentage': [.05],
                                  'sample_name': ['toto']},
                         'occ': 100,
                         'V' : 'IGHV1*02',
                        'J' : 'IGHJ3*01'}];
    var results = processCloneDBContents(multipleResults, m);
    assert.equal(results['<a href="?sample_set_id=152&config=1024">152</a> (config)'], '5 clones (25.00%)', "multiple results");
    assert.equal(results['<a href="?sample_set_id=15&config=1024">patient</a> (config)'], '3 clones (15.00%)', "multiple results, one entry");
    assert.equal(results['Non viewable samples'], 1, "One non viewable sample");
    var count = 0;
    for (var item in results) {
        count += 1;
    }
    assert.equal(count, 5, "Two results plus one non-viewable plus original entry plus clone names");

    // Test missing viewable property
    var missingViewable = [{'tags': {'sample_set_name': ['patient', null],
                                  'sample_set': ["15", "152"],
                                  'config_id': ['1024'],
                                  'config_name': ['config'],
                                  'sample_name': ['toto']},
                         'occ': 3,
                         'V' : 'IGHV1*02',
                         'J' : 'IGHJ3*01'}];
    assert.deepEqual(processCloneDBContents(missingViewable, m),
                     {'Non viewable samples': 1,
                      'original': missingViewable,
                      'clones_names' : {}   // Empty as the sample can't be viewed
                     },
                     "processing missingViewable");

});

QUnit.test("processImgtContents", function(assert) {
    var ready = assert.async();
    assert.expect(5);

    var xhr = $.ajax({
            url: 'testFiles/vquest_imgt.html',
            dataType: 'html'
        })
        .done(function (html, status) {
            assert.ok(html.length > 0, "Test file was injected, html code received");
            var imgtArray = processImgtContents(html, "pre");
            assert.ok(imgtArray[0]["Sequence number"] == "1", "first line is sequence 1");
            assert.ok(imgtArray[0]["CDR3-IMGT"] == "gcggcggaaactc", "CDR3-IMGT's seq 1 is gcggcggaaactc");
            assert.ok(imgtArray[3]["Sequence number"] == "4", "4th ligne is seq 4");
            assert.ok(imgtArray.length == 5, "5 sequences were identified");
            ready();
        });
}
);

QUnit.test("endsWith", function(assert) {
    assert.equal(endsWith("toto", "o"), true, "toto finishes with o")
    assert.equal(endsWith("tota", "o"), false, "tota doesn't finish with o")
    assert.equal(endsWith("o", "toto"), false, "o doesn't finish with toto")
    assert.equal(endsWith("toto", ""), true, "toto finishes with empty string")
    assert.equal(endsWith("tota", "to"), false, "tota doesn't finish with to")
})

QUnit.test("correctIMGTPositionsForInsertions", function(assert) {
    data = {
        'V-REGION identity % (with ins/del events)': "98.2%",
        "Sequence": "taggctagctagctaAgcgctaTcgcaTcagcagAagcagcat",
        // "taggctagctagctagcgctacgcacagcagagcagcat",
                "V-REGION end": "13",
                "CDR1-IMGT start": "16", // 17 when accounting for insertion
                "CDR1-IMGT end": "22", // 24 when accounting for insertion
                "CDR2-IMGT start": "25", // 27 when accounting for insertion
                "CDR2-IMGT end": "26" // 29 when accounting for insertion
    }
    correctIMGTPositionsForInsertions(data)
    assert.equal(data["V-REGION end"], "13", "V-REGION end should not change")
    assert.equal(data["CDR1-IMGT start"], "17", "CDR1-IMGT should be 17 ("+data["CDR1-IMGT start"]+")")
    assert.equal(data["CDR1-IMGT end"], "24", "CDR1-IMGT should be 24 ("+data["CDR1-IMGT end"]+")")
    assert.equal(data["CDR2-IMGT start"], "27", "CDR2-IMGT should be 27 ("+data["CDR2-IMGT start"]+")")
    assert.equal(data["CDR2-IMGT end"], "29", "CDR2-IMGT should be 29 ("+data["CDR2-IMGT end"]+")")
});

QUnit.test("computeStartStop(arrayToProcess,sequence)", function(assert) {

        var imgt2displayCheck = {
            "V-REGION": {
                "seq": "",
                "tooltip": "Homsap TRGV3*01 F",
                "start": 161,
                "stop": 178
            },
            "J-REGION": {
                "seq": "",
                "tooltip": "Homsap TRGJP2*01 F",
                "start": 185,
                "stop": 202
            },
            "CDR3-IMGT": {
                "seq": "",
                "tooltip": "CDR3-IMGT",
                "start": 111,
                "stop": 124
            }

        };


        var imgt2display = computeStartStop(json_data.clones[3].seg.imgt, json_data.clones[3].sequence);
        assert.ok( null != imgt2display, "function returned a not null array");
        assert.deepEqual(imgt2display, imgt2displayCheck, "Processed array is similar to expected array");

    }
);


QUnit.test("Pearson coefficient", function(assert) {

    assert.equal(pearsonCoeff([0, 1, 2, 3], [0, 1, 2, 3]), 1)
    assert.equal(pearsonCoeff([0, 1, 2, 3], [40, 50, 60, 70]), 1)

    assert.ok(pearsonCoeff([0, 1, 2, 3], [41, 49, 68, 69]) > .9)
    assert.ok(pearsonCoeff([0, 1, 2, 3], [49, 30, 1, 102]) < .5)

    assert.equal(pearsonCoeff([3, 2, 1], [1, 2, 3]), -1)
    assert.equal(pearsonCoeff([3, 2, 1], [10, 20, 30]), -1)
    }
);


QUnit.test("Sort list locus", function(assert) {

    list_test_1 = [ "TRA", "TRB", "TRG", "TRD", "testlocus", "IGH", "IGK", "IGL"]
    wait_test_1 = [ "TRA", "TRB", "TRG", "TRD", "IGH", "IGK", "IGL", "testlocus"]
    list_test_2 = [ "IGH", "IGH+", "unknow_locus", "IGK+", "IGL", "testlocus", "TRA", "TRB", "TRB+", "TRG", "TRD"]
    wait_test_2 = [ "TRA", "TRB", "TRB+", "TRG", "TRD", "IGH", "IGH+", "IGK+", "IGL", "testlocus", "unknow_locus"]
    
    list_test_1.sort(locus_cmp)
    list_test_2.sort(locus_cmp)

    assert.deepEqual(list_test_1, wait_test_1, "list2 is correctly sorted")
    assert.deepEqual(list_test_2, wait_test_2, "list2 is correctly sorted")
    }
);

QUnit.test("Get n first sequences", function(assert) {
    seqs=">seq1\nAT\n>seq2\nTC\n>seq3\nCC\n";
    assert.equal(getNFirstSequences(seqs, 1), ">seq1\nAT\n");
    assert.equal(getNFirstSequences(seqs, 0), seqs);
    assert.equal(getNFirstSequences(seqs, -1), seqs);
    assert.equal(getNFirstSequences(seqs, 2), ">seq1\nAT\n>seq2\nTC\n");
});

QUnit.test("remove duplicates", function(assert) {

  var array = [1,2,3,4]
  assert.deepEqual(removeDuplicate(array), [1,2,3,4], "correct array after removeDuplicate (1)")
  var array = [4,3,2,1]
  assert.deepEqual(removeDuplicate(array), [4,3,2,1], "correct array after removeDuplicate (2)")
  var array = [0,1,2,3,6,7]
  assert.deepEqual(removeDuplicate(array), [0,1,2,3,6,7], "correct array after removeDuplicate (3)")
  var array = [0,1,2,3,3,3,4,0]
  assert.deepEqual(removeDuplicate(array), [0,1,2,3,4], "correct array after removeDuplicate (4)")
});

QUnit.test("remove elt in decrease", function(assert) {

  var listel = [0,1,2,4,5,7,8]
  assert.deepEqual(removeEltAndDecrease(listel, 3), [0,1,2,3,4,6,7], "correct array after removeEltAndDecrease (3)")
});
