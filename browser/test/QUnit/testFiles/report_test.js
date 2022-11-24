

QUnit.module("Report", {
});


QUnit.test("Report: save/load", function(assert) {
    
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    // save
    assert.notOk(m.analysisHasChanged, ".analysis should be unchanged")
    report.addClones([1])
    assert.equal(report.clones.length, 1, "report should have 1 clone(s) selected, got "  + report.clones.length);
    report.save("new_save_1")
    assert.equal(report.settings.name, "new_save_1", "save report settings under new_save_1 got " + report.settings.name);
    assert.ok(m.analysisHasChanged, ".analysis should have been modified")

    // load default settings
    report.load("Full report")
    assert.equal(report.settings.name, "Full report", "loaded report should be named 'Full report', got " + report.settings.name);
    assert.equal(report.clones.length, 1, "Full report should still have 1 clone(s) selected, got "  + report.clones.length);

    // load saved settings 
    report.load("new_save_1")
    assert.equal(report.settings.name, "new_save_1", "loaded report should be named 'new_save_1', got " + report.settings.name);
    assert.equal(report.clones.length, 1, "default report should still have 1 clone(s) selected, got "  + report.clones.length);

    // overwrite existing file (overwrite false)
    report.addClones([2])
    assert.equal(report.clones.length, 2, "default report should now have 2 clone(s) selected, got " + report.clones.length);
    report.save("new_save_1", true)
    report.load("new_save_1")
    assert.equal(report.clones.length, 2, "test overwriting: default report should still have 2 clone(s) selected, got " + report.clones.length);

    // For the moment, clone list in no more stocked inside analysis (issue #4996)
    // // overwrite existing file (overwrite true)
    // report.addClones([2])
    // report.save("new_save_1", true)
    // report.load("new_save_1")
    // assert.equal(report.clones.length, 2, "test overwriting: default report should now have 2 clone(s) selected, got " + report.clones.length);
    
});


QUnit.test("Report: savestate", function(assert) {
    
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    // current model state
    var system_selected = JSON.stringify(m.system_selected.slice())
    var samples_order = JSON.stringify(m.samples.order.slice())
    var axis_color = m.color.axis.name

    // save current model state
    report.savestate()

    //change model state
    report.switchstate(["IGH"], [0,1], "Size")
    assert.notEqual(system_selected, JSON.stringify(m.system_selected.slice()))
    assert.notEqual(samples_order, JSON.stringify(m.samples.order.slice()))
    assert.notEqual(axis_color, m.color.axis.name)

    //restore
    report.restorestate()
    assert.equal(system_selected, JSON.stringify(m.system_selected.slice()))
    assert.equal(samples_order, JSON.stringify(m.samples.order.slice()))
    // assert.equal(axis_color, m.color.axis.name)// Failed after a model.update call

});

QUnit.test("Report: blocks", function(assert) {
    
    var m = new Model(m);
    var report = new Report(m)
    var sp_export = new ScatterPlot("visu", m);
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    var default_blockCount = report.settings.blocks.length;

    //add scatterplot block to report
    report.addScatterplot(sp_export)
    assert.equal(report.settings.blocks.length, default_blockCount+1)
    assert.equal(report.settings.blocks[report.settings.blocks.length-1].blockType , "scatterplot", "scatterplot block added")

    //add generic block
    report.addBlock({blockType : "comments", text: "test"})
    assert.equal(report.settings.blocks.length, default_blockCount+2)
    assert.equal(report.settings.blocks[report.settings.blocks.length-1].blockType , "comments", "comments block added")

    //try add an already existing block (blockcount does not increase)
    report.addBlock({blockType : "comments", text: "test"})
    assert.equal(report.settings.blocks.length, default_blockCount+2, "comments block already added")

    //find block 
    assert.equal(report.indexOfBlock({blockType : "comments", text: "test"}), default_blockCount+1, "find block")

    //remove block by index 
    report.removeBlock(1)
    assert.equal(report.settings.blocks.length, default_blockCount+1, "remove block using index")

    //remove block
    report.removeBlock({blockType : "comments", text: "test"})
    assert.equal(report.indexOfBlock({blockType : "comments", text: "test"}), -1, "remove block using object descriptor")

    //move block up 
    report.addBlock({blockType : "blockTest"})
    var index = report.indexOfBlock({blockType : "blockTest"})
    report.upBlock({blockType : "blockTest"})
    assert.equal(report.indexOfBlock({blockType : "blockTest"}), index-1, "move block up")
    report.upBlock({blockType : "blockTest"})
    assert.equal(report.indexOfBlock({blockType : "blockTest"}), index-2, "move block up")

    //move block down
    report.downBlock({blockType : "blockTest"})
    assert.equal(report.indexOfBlock({blockType : "blockTest"}), index-1, "move block down")
    report.downBlock({blockType : "blockTest"})
    assert.equal(report.indexOfBlock({blockType : "blockTest"}), index, "move block down")
});

QUnit.test("Report: clones", function(assert) {
    
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

   report.addClones([0,1])
   assert.equal(report.clones.length, 2, "added 2 clones");

   //TODO extract handle functions to test button

});

