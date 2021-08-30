
QUnit.module("Scatterplot", {
});

QUnit.test("grid", function(assert) {
    m = new Model();
    assert.expect(21);

    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    
    assert.equal(sp.returnActiveclones(), 5, "returnActiveClones -> 5");
    
    sp.buildSystemGrid()
    assert.deepEqual(sp.systemGrid, {   
                                        "IGH": {"x": 0.92,"y": 0.75},
                                        "TRG": {"x": 0.92,"y": 0.25}, 
                                        "label": [
                                                    {"enabled": true,"text": "TRG","x": 0.81,"y": 0.25 },
                                                    {"enabled": true,"text": "IGH","x": 0.80,"y": 0.75}
                                                 ]
                                    }, 
                                    "buildSystemGrid()");
    
    assert.equal(sp.nodes.length, 7 , "check nodes");

    sp.changeSplitMethod("V/5' gene", "V/5' gene", "grid");
    sp.update()
    assert.equal(sp.axisX.getPos(m.clone(1)), sp.axisY.getPos(m.clone(1)), "check splitMethod V/V /plot : xpos = ypos");
    assert.equal(document.getElementById("visu_circle1").className.baseVal, "circle", "check splitMethod V/V /plot : check if plot are displayed")
    assert.equal(document.getElementById("visu_circle2").className.baseVal, "circle", "check splitMethod V/V /plot : check if plot are displayed")

    sp.switchMode()
    assert.equal(sp.mode, "bar")
    sp.update()

    assert.equal(document.getElementById("visu_bar1").className.baseVal, "circle_hidden", "in 'bar' we hide unused system ")
    assert.equal(document.getElementById("visu_bar2").className.baseVal, "circle", "check splitMethod V/V /plot : check if bar are displayed")

    var keys = Object.keys(sp.axisX.labels)
    assert.equal(sp.axisX.labels[keys[0]].text, "IGHV1-2", "first label for 'v' axis is 'IGHV1-2'")
    assert.equal(sp.axisX.labels[keys[1]].text, "undefined V", "second label for 'v' axis is '?'")

    assert.equal(m.clone(2).getGene('5'), "IGHV1-2*01", "clone 2 is 'IGHV1-2*01'")
    assert.equal(sp.axisX.getPos(m.clone(2)), sp.axisX.getValuePos('IGHV1-2'), "node 2, bar x position is on 'IGHV1-2'")

    var done = assert.async(2); 
    var delay = 0;
    var step = 500;
    $(document.getElementsByClassName("sp_legend")[0]).d3Click() //click label ighv4

    setTimeout(function() {
        assert.deepEqual(m.getSelected(), [2], "check click label");
        sp.changeSplitMethod("N length", "Size", "bar");
        sp.update()

        assert.equal(   sp.select_x.selectedIndex,      9,                      'select_x index')
        assert.equal(   sp.select_y.selectedIndex,      6,                      'select_y index')
        assert.approx(  sp.nodes[1].bar_h/sp.resizeH,   0.40, 0.05,             "node 1, bar h position " + m.clone(1).getSize())
        assert.equal(   sp.axisX.getPos(m.clone(1)),    sp.axisX.getValuePos(9),"node 1, bar x position " + m.clone(1).getNlength())
        assert.approx(  sp.nodes[1].bar_y/sp.resizeW,   0.40, 0.05,             "node 1, bar y position")
        assert.approx(  sp.nodes[2].bar_h/sp.resizeH,   0.50, 0.05,             "node 2, bar h position")

        m.clone(0).reads = [10000,1,1,1]
        m.update()
        done();
    }, delay+=step);

    setTimeout(function() {
        assert.approx(  sp.nodes[2].bar_h/sp.resizeH,      0.01, 0.001,         "node 2, bar h is small, but not too much " +m.clone(2).getSize())
        done();
    }, delay+=step);
    
});



QUnit.test("node sizes", function(assert) {

    m = new Model()
    m.parseJsonData(json_data, 100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu", m);
    sp.init();
    sp.update();

    assert.equal(sp.nodes[0].s, 0.05, "node 0, size")

    m.clone(0).quantifiable = false;
    sp.updateClone(0)

    assert.equal(sp.nodes[0].s, 0.001, "node 0 (not quantifiable), size")
})


QUnit.test("other plot", function(assert) {

    m = new Model()
    m.parseJsonData(json_data, 100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu", m);
    sp.init();
    sp.update();

    assert.equal(sp.otherVisibility, false)
    assert.equal(sp.nodes[2].s, 0.125, "node 0, size (main sample time 0)")

    m.tOther = 1
    var preset = sp.preset["compare two samples"]
    sp.changeSplitMethod(preset.x, preset.y, "grid")

    assert.equal(sp.splitY, "Size (other)")
    assert.equal(sp.otherVisibility, true)

    assert.equal(sp.nodes[2].s, 0.25, "node 0, size (other sample time 1)")

    m.tOther = 3
    sp.updateClone(2)
    assert.equal(sp.nodes[2].s, 0.125, "node 0, size (other sample time 3)")
})


QUnit.test("multiple selection", function(assert) {

    m = new Model()
    m.parseJsonData(json_data, 100);
    m.loadGermline();
    m.initClones();

    var sp = new ScatterPlot("visu", m);
    sp.shouldRefresh();

    /* Expected clones distribution in the scatterplot (numbers are ratios for width en height) :

                0-0.5     0.5-0.8                   0.8-1
        0-0.5   test3       x                         test{1,2,4}
        0.5-1     x         unseg sequence            x
    */

    var done = assert.async();

    var sp_svg;
    var sp_width;
    var sp_height;

    setTimeout(function() {
        /*
            NB: .getComputedStyle() is not the way used by the actual selection functions.
            If one (ever) gets different values, causing the tests to fail,
            it may come frome here.
        */
        sp_style = window.getComputedStyle(d3.select("#"+ sp.id).node());
        sp_width = parseInt(sp_style.width);
        sp_height = parseInt(sp_style.height);

        // This 'event' is created to save m.unselectAllUnlessKey from failing (called by .stopSelectorAt)
        // There might be a better solution
        d3.event = new Event("");

        test1();
        test2();

        done();
    }, 1000);

    function test1() {
        sp.activeSelectorAt([sp_width*0.5, sp_height*0.5]);
        sp.updateSelectorAt([sp_width*0.8, sp_height]);
        sp.stopSelectorAt([sp_width*0.8, sp_height]);

        assert.equal(m.getSelected().length, 1, "only one clone is selected");
        assert.equal(m.clone(m.getSelected()[0]).name, "test5; unseg sequence", "the selected clone is 'unseg sequence' (test5)");
    }

    function test2() {
        sp.activeSelectorAt([sp_width*0.8, 0]);
        sp.updateSelectorAt([sp_width, sp_height*0.5]);
        sp.stopSelectorAt([sp_width, sp_height*0.5]);

        assert.equal(m.getSelected().length, 3, "three clones are selected");

        var expected_cloneIDs = [];
        for (var index in m.clones) {
            if (["test1","test2","test4"].includes(m.clone(index).name))
            expected_cloneIDs.push(parseInt(index));
        }

        assert.deepEqual(m.getSelected().sort(), expected_cloneIDs.sort(), "the selected clones are test{1,2,4}");
    }
})

QUnit.test("axes productivity detailed", function(assert) {

    assert.expect(16);
    var ready = assert.async(2);

    m = new Model();
    m.parseJsonData(json_data_productivity,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();

    assert.equal(sp.returnActiveclones(), 6, "returnActiveClones -> 6");
    sp.changeSplitMethod("Productivity+", "Productivity+", "grid");

    var axes_legend = document.getElementById("visu_axis_x_container").childNodes
    setTimeout( function() {
        assert.equal( axes_legend.length, 12, "Correct number of availabel axis (6*2)" )
        assert.equal( axes_legend[0].__data__.text, "productive",       "sp legend productivity; productive")
        assert.equal( axes_legend[1].__data__.text, "not productive",   "sp legend productivity; not productive")
        assert.equal( axes_legend[2].__data__.text, "out-of-frame",     "sp legend productivity; out of frame")
        assert.equal( axes_legend[3].__data__.text, "stop-codon",       "sp legend productivity; stop codon")
        assert.equal( axes_legend[4].__data__.text, "no CDR3",          "sp legend productivity; no cdr3 detected")
        assert.equal( axes_legend[5].__data__.text, "no-WPGxG-pattern", "sp legend productivity; no-WPGxG-pattern")
        m.clone(0).seg.junction.productive   = false
        m.clone(0).seg.junction.unproductive = "new_label_of_unproductivity"
        m.update()
        ready()
    }, 150);

    setTimeout( function() {
        // New label should be present at the end
        // Previous label has no occurence and should not be present
        assert.equal( axes_legend.length, 12, "Correct number of availabel axis (still 6*2)" )
        assert.equal( axes_legend[0].__data__.text, "productive", "sp legend productivity; productive")
        assert.equal( axes_legend[1].__data__.text, "not productive",       "sp legend productivity; not productive")
        assert.equal( axes_legend[2].__data__.text, "new_label_of_unproductivity", "new label present")
        assert.equal( axes_legend[3].__data__.text, "stop-codon",   "label have new position; stop codon")
        assert.equal( axes_legend[4].__data__.text, "no CDR3 detected",   "label have new position; no cdr3 detected")
        assert.equal( axes_legend[5].__data__.text, "no-WPGxG-pattern",   "label have new position; no-WPGxG-pattern")
        assert.ok(  parseFloat(axes_legend[2].getAttribute("x")) >  parseFloat(axes_legend[5].getAttribute("x")),   "verify position of new label, at the end (by X position)")
        ready()
    }, 300);
})

QUnit.test("Sort axes alphabetical with numeric value", function(assert) {
    // Use localeCompare to sort values
    // See https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare for more information

    assert.expect(11);
    var ready = assert.async(1);

    m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    // Update clone segment for testing
    // Vgene
    m.clones[0].seg["5"].name = "TRGV4*01"
    m.clones[1].seg["5"].name = "TRGV10*01"
    m.clones[2].germline = "TRG"
    m.clones[2].seg["5"].name = "TRGV5-2*01"
    m.clones[3].seg["5"].name = "TRGV5-11*01"
    // Jgene
    m.clones[0].seg["3"].name = "TRGJ1*02"
    m.clones[1].seg["3"].name = "TRGJ1*01"
    m.clones[2].seg["3"].name = "TRGJ1*11"
    m.changeGermline("TRG", false)


    var sp = new ScatterPlot("visu",m);
    sp.init();

    assert.equal(sp.returnActiveclones(), 5, "returnActiveClones -> 6");
    sp.changeSplitMethod("V/5' gene", "J/3 allele", "grid");

    var axes_legend_x = document.getElementById("visu_axis_x_container").childNodes
    var axes_legend_y = document.getElementById("visu_axis_y_container").childNodes

    setTimeout( function() {
        // V gene; "TRGV4*01" "TRGV5-2*01" "TRGV5-11*01" "TRGV10*01" undefinedV
        assert.equal( axes_legend_x[0].__data__.text, "TRGV4",    "sp legend V/5' gene sort; pos 0")
        assert.equal( axes_legend_x[1].__data__.text, "TRGV5-2",  "sp legend V/5' gene sort; pos 1")
        assert.equal( axes_legend_x[2].__data__.text, "TRGV5-11", "sp legend V/5' gene sort; pos 2")
        assert.equal( axes_legend_x[3].__data__.text, "TRGV10",   "sp legend V/5' gene sort; pos 3")
        assert.equal( axes_legend_x[4].__data__.text, "undefined V", "sp legend V/5' gene sort; undefined")
        // J allele; "TRGJ1*01" "TRGJ1*02" "TRGJ1*11"
        //     first level (without allele)
        assert.equal( axes_legend_y[0].__data__.text, "TRGJ1",      "sp legend J/3 allele sort; first level (without allele) 0")
        assert.equal( axes_legend_y[1].__data__.text, "undefined J", "sp legend J/3 allele sort; first level (without allele) 1")
        //     second level (only allele)
        assert.equal( axes_legend_y[2].__data__.text, "01", "sp legend J/3 allele sort; second level (only allele) 0")
        assert.equal( axes_legend_y[3].__data__.text, "02", "sp legend J/3 allele sort; second level (only allele) 1")
        assert.equal( axes_legend_y[4].__data__.text, "11", "sp legend J/3 allele sort; second level (only allele) 2")
        ready()
    }, 150);
})


QUnit.test("Axis scale", function(assert) {

    var ready = assert.async(1);
    
    m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    sp.setPreset(4);
    

    var delay = 0;
    var step = 200;
    setTimeout( function() {
        assert.equal( sp.axisX.scale.nice_min, 0,  "min value of axisX")
        assert.equal( sp.axisX.scale.nice_max, 260, "max value of axisX")
        assert.equal( sp.axisX.fct(m.clone(3)), 241, "axis value of clone 3")

        var minPos = sp.axisX.getValuePos(0);
        var maxPos = sp.axisX.getValuePos(260);
        var delta = maxPos-minPos;
        var clonePos = sp.axisX.getPos(m.clone(3));
        assert.equal( clonePos.toPrecision(3), (minPos+delta*(241/260)).toPrecision(3), "axis position of clone 3")
        
        sp.updateScaleX([100,300]);
    }, delay+=step);

    setTimeout( function() {
        assert.equal( sp.axisX.scale.nice_min, 100,  "min value of axisX after rescale")
        assert.equal( sp.axisX.scale.nice_max, 300, "max value of axisX after rescale")
        assert.equal( sp.axisX.fct(m.clone(3)), 241, "axis value of clone 3")

        var minPos = sp.axisX.getValuePos(100);
        var maxPos = sp.axisX.getValuePos(300);
        var delta = maxPos-minPos;
        var clonePos = sp.axisX.getPos(m.clone(3));
        assert.equal( clonePos.toPrecision(3), (minPos+delta*(141/200)).toPrecision(3), "position of clone 1 after rescale")
    
        ready()
    }, delay+=step);

})

QUnit.test("Axis scale Log", function(assert) {

    var ready = assert.async(1);

    m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    sp.changeSplitMethod("Size", "Size", "grid");
    

    var delay = 0;
    var step = 200;
    setTimeout( function() {
        assert.equal( sp.axisX.scale.nice_min,  0.01,   "min value of axisX")
        assert.equal( sp.axisX.scale.nice_max,  1,      "max value of axisX")
        assert.equal( sp.axisX.fct(m.clone(3)), 0.025,  "axis value of clone 3")

        assert.equal( sp.convertLoopToLog(sp.axisX, 3),     1,      "convert slider value to log")
        assert.equal( sp.convertLoopToLog(sp.axisX, 2),     0.1,    "convert slider value to log")
        assert.equal( sp.convertLoopToLog(sp.axisX, 1),     0.01,   "convert slider value to log")

        assert.equal( sp.convertLogToLoop(sp.axisX, 0.01),  1,      "convert log to slider value")
        assert.equal( sp.convertLogToLoop(sp.axisX, 0.0999),2,      "convert log to slider value")
        assert.equal( sp.convertLogToLoop(sp.axisX, 0.1),   2,      "convert log to slider value")
        assert.equal( sp.convertLogToLoop(sp.axisX, 0.1001),3,      "convert log to slider value")
        assert.equal( sp.convertLogToLoop(sp.axisX, 1),     3,      "convert log to slider value")

        sp.updateScaleX([2, 3])
        
    }, delay+=step);

    setTimeout( function() {
        assert.equal( sp.axisX.scale.nice_custom_min, 0.1,  "updated min value of axisX ")
        assert.equal( sp.axisX.scale.nice_custom_max, 1,    "unchanged max value of axisX")

        ready()
    }, delay+=step);

})

QUnit.test("Axis scale Float", function(assert) {

    var ready = assert.async(1);

    m = new Model();
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    sp.changeSplitMethod("size", "GC content", "grid");
    

    var delay = 0;
    var step = 200;
    setTimeout( function() {
        assert.equal( sp.axisY.scale.nice_min,  0,  "min value of axisX")
        assert.equal( sp.axisY.scale.nice_max,  1,  "max value of axisX")
        assert.equal( sp.axisY.fct(m.clone(3)).toPrecision(2), 0.48,  "axis value of clone 3")

        //nice step == 0.1  , so we expect each slider notch to increase the value by 0.1
        assert.equal( sp.convertLoopToFloat(sp.axisY, 1).toPrecision(2),     0.1.toPrecision(2),      "convert slider value to Float")
        assert.equal( sp.convertLoopToFloat(sp.axisY, 3).toPrecision(2),     0.3.toPrecision(2),      "convert slider value to Float")
        assert.equal( sp.convertLoopToFloat(sp.axisY, 6).toPrecision(2),     0.6.toPrecision(2),      "convert slider value to Float")

        assert.equal( sp.convertFloatToLoop(sp.axisY, 0.2),     2,      "convert log to slider value")
        assert.equal( sp.convertFloatToLoop(sp.axisY, 0.4999),  5,      "convert log to slider value")
        assert.equal( sp.convertFloatToLoop(sp.axisY, 0.5),     5,      "convert log to slider value")
        assert.equal( sp.convertFloatToLoop(sp.axisY, 0.5001),  5,      "convert log to slider value")
        assert.equal( sp.convertFloatToLoop(sp.axisY, 0.7),     7,      "convert log to slider value")

        sp.updateScaleY([0, 9])
        
    }, delay+=step);

    setTimeout( function() {
        assert.equal( sp.axisY.scale.nice_min, 0,   "unchanged min value of axisY")
        assert.equal( sp.axisY.scale.nice_max, 0.9, "updated max value of axisY")

        ready()
    }, delay+=step);
})