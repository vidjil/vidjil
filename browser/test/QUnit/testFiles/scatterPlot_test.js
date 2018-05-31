
QUnit.module("Scatterplot", {
});

QUnit.test("grid", function(assert) {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    
    assert.equal(sp.returnActiveclones(), 5, "returnActiveClones -> 5");
    
    sp.buildSystemGrid()
    assert.deepEqual(sp.systemGrid,  {"IGH": {"x": 0.92,"y": 0.75},
                                "TRG": {"x": 0.92,"y": 0.25}, 
                                "label": [
                                    {"enabled": true,"text": "TRG","x": 0.81,"y": 0.25 },
                                    {"enabled": true,"text": "IGH","x": 0.80,"y": 0.75}]}, 
            "buildSystemGrid()");
    
    assert.equal(sp.nodes.length, 7 , "check nodes");
    assert.equal(sp.select_preset.selectedIndex, 1, "check whether the default preset is selectionned")

    sp.changeSplitMethod(sp.AXIS_GENE_V, sp.AXIS_GENE_V, sp.MODE_GRID);
    sp.update()
    assert.equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    assert.equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    assert.equal(document.getElementById("visu_circle1").className.baseVal, "circle", "check splitMethod V/V /plot : check if plot are displayed")
    
    sp.switchMode()
    assert.equal(sp.select_preset.selectedIndex, 0, "check whether no preset is selectionned")
    assert.equal(sp.mode, sp.MODE_BAR)
    sp.update()

    assert.equal(document.getElementById("visu_bar1").className.baseVal, "", "check splitMethod V/V /plot : check if bar are displayed")

    assert.equal(sp.axisX.labels[0].text, "IGHV1-2", "first label for 'v' axis is 'IGHV1-2'")
    assert.equal(sp.axisX.labels[1].text, "?", "second label for 'v' axis is '?'")

    assert.equal(m.clone(2).getGene('5'), "IGHV1-2*01", "clone 2 is 'IGHV1-2*01'")
    assert.equal(sp.nodes[2].bar_x, sp.axisX.labels[0].pos, "node 2, bar x position is on 'IGVH4'")


    $(document.getElementsByClassName("sp_legend")[0]).d3Click() //click label ighv4
    assert.deepEqual(m.getSelected(), [2], "check click label");
    
    
    sp.changeSplitMethod("nLength", "size", sp.MODE_BAR);
    sp.update()
    
    assert.equal(sp.nodes[1].bar_h , 0.3333333333333333, "node 1, bar h position")
    assert.equal(sp.nodes[1].bar_x , sp.axisX.labels[9].pos ,"node 1, bar x position is on '9'")
    assert.equal(sp.axisX.labels[9].text, "9", "10th label for 'n' axis' is '9'")
    assert.equal(sp.nodes[1].bar_y , 0.3333333333333333, "node 1, bar y position")

    assert.approx(sp.nodes[2].bar_h, 0.40, 0.05, "node 2, bar h is about 0.40")
    m.clone(0).reads = [10000,1,1,1]
    m.update()
    assert.equal(sp.nodes[2].bar_h, 0.01, "node 2, bar h is small, but not too much")
});



QUnit.test("node sizes", function(assert) {

    var m = new Model(m);
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


QUnit.test("multiple selection", function(assert) {

    var m = new Model(m);
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
    });

    function test1() {
        sp.activeSelectorAt([sp_width*0.5, sp_height*0.5]);
        sp.updateSelectorAt([sp_width*0.8, sp_height]);
        sp.stopSelectorAt([sp_width*0.8, sp_height]);

        assert.equal(m.getSelected().length, 1, "only one clone is selected");
        assert.equal(m.clone(m.getSelected()[0]).name, "unseg sequence", "the selected clone is 'unseg sequence' (test5)");
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
