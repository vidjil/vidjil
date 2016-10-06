//Framework assertion example
module("tools", {
//	setup:function(){alert("setup money individual test");},
//	teardown:function(){alert("teardown money individual test");}
});

test("test nth_ocurrence", function () {
        var str = "needle needle needle needle";
        var m = nth_ocurrence(str, 'n', 3);
        ok(m === 14, "Looking for the 3rd occurence of n in " + str);
        var m = nth_ocurrence(str, 'E', 3);
        ok(m === false, "search is casesensitive: no E in " + str);
        var m = nth_ocurrence(str, 'z', 3);
        ok(m === false, "No z in " + str);
    }
);

test("test tsvToArray", function () {
        var tabstring = "head1\thead2\thead3\thead4\nLine 1 data1\tLine 1 data2\tLine 1 data3\tLine 1 data4\n";
        tabstring += "Line 2 data1\tLine 2 data2\tLine 2 data3\tLine 2 data4";
        var aTest = tsvToArray(tabstring);
        ok(aTest[0].head3 === "Line 1 data3", "Array[0].head3 =='Line 1 data3'");
        ok(aTest[1].head2 === "Line 2 data2", "Array[1].head2=='Line 2 head2'");
        ok(aTest[5] == null, "This is only a 2 lines array, no line #5");
    }
    );

test("test rounding functions", function () {
    equal(nice_ceil(0.072), 0.08, "rounding 0.08");
    equal(nice_ceil(1.2), 1.5, "rounding 1.2");
    equal(nice_ceil(18), 20, "rounding 1.2");
    equal(nice_ceil(100), 100, "rounding 100");

    equal(nice_floor(0.072), 0.07, "rounding 0.072");
    equal(nice_floor(100), 100, "rounding 100");
    equal(nice_floor(451), 400, "rounding 451");
    }
);

asyncTest("processImgtContents", function () {
        expect(5);

        var xhr = $.ajax({
                url: 'testFiles/vquest_imgt.html',
                dataType: 'html'
            })
            .done(function (html, status) {
                ok(html.length > 0, "Test file was injected, html code received");
                var imgtArray = processImgtContents(html, "pre");
                ok(imgtArray[0]["Sequence number"] == "1", "first line is sequence 1");
                ok(imgtArray[0]["CDR3-IMGT"] == "gcggcggaaactc", "CDR3-IMGT's seq 1 is gcggcggaaactc");
                ok(imgtArray[3]["Sequence number"] == "4", "4th ligne is seq 4");
                ok(imgtArray.length == 5, "5 sequences were identified");
                QUnit.start();  // ...tell QUnit you're ready to go
            });


    }
);

test("endsWith", function() {
    equal(endsWith("toto", "o"), true, "toto finishes with o")
    equal(endsWith("tota", "o"), false, "tota doesn't finish with o")
    equal(endsWith("o", "toto"), false, "o doesn't finish with toto")
    equal(endsWith("toto", ""), true, "toto finishes with empty string")
    equal(endsWith("tota", "to"), false, "tota doesn't finish with to")
})

test("correctIMGTPositionsForInsertions", function() {
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
    equal(data["V-REGION end"], "13", "V-REGION end should not change")
    equal(data["CDR1-IMGT start"], "17", "CDR1-IMGT should be 17 ("+data["CDR1-IMGT start"]+")")
    equal(data["CDR1-IMGT end"], "24", "CDR1-IMGT should be 24 ("+data["CDR1-IMGT end"]+")")
    equal(data["CDR2-IMGT start"], "27", "CDR2-IMGT should be 27 ("+data["CDR2-IMGT start"]+")")
    equal(data["CDR2-IMGT end"], "29", "CDR2-IMGT should be 29 ("+data["CDR2-IMGT end"]+")")
});

test("computeStartStop(arrayToProcess,sequence)", function () {

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
                "start": 124,
                "stop": 111
            }

        };


        var imgt2display = computeStartStop(json_data.clones[3].seg.imgt, json_data.clones[3].sequence);
        ok( null != imgt2display, "function returned a not null array");
        deepEqual(imgt2display, imgt2displayCheck, "Processed array is similar to expected array");

    }
);
