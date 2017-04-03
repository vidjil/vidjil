
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
    
    sp.changeSplitMethod("gene_v", "gene_v", sp.MODE_GRID);
    sp.update()
    assert.equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    assert.equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    assert.equal(document.getElementById("circle1").className.baseVal, "circle", "check splitMethod V/V /plot : check if plot are displayed")
    
    
    sp.changeSplitMethod("gene_v", "gene_v", sp.MODE_BAR);
    sp.update()

    assert.equal(document.getElementById("bar1").className.baseVal, "", "check splitMethod V/V /plot : check if bar are displayed")

    assert.equal(sp.axisX.labels[0].text, "IGHV4", "first label for 'gene_v' axis is 'IGVH4'")
    assert.equal(sp.axisX.labels[1].text, "?", "second label for 'gene_v' axis is '?'")

    assert.equal(m.clone(2).getGene('5'), "IGHV4*01", "clone 2 is 'IGVH4*01'")
    assert.equal(sp.nodes[2].bar_x, sp.axisX.labels[0].pos, "node 2, bar x position is on 'IGVH4'")


    $(document.getElementsByClassName("sp_legend")[0]).d3Click() //click label ighv4
    assert.deepEqual(m.getSelected(), [2], "check click label");
    
    
    sp.changeSplitMethod("n", "Size", sp.MODE_BAR);
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

    assert.equal(sp.nodes[0].s, 0.05, "node 0, size")

    m.clone(0).quantifiable = false;
    sp.updateClone(0)

    assert.equal(sp.nodes[0].s, 0.10, "node 0 (not quantifiable), size")
})
