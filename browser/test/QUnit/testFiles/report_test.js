

QUnit.module("Report", {
});


QUnit.test("Report: save/load under analysis", function(assert) {
    
    localStorage.removeItem("report_templates")
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    // save
    assert.notOk(m.analysisHasChanged, ".analysis should be unchanged")
    report.addClones([1])
    assert.equal(report.clones.length, 1, "report should have 1 clone(s) selected, got "  + report.clones.length);
    report.save("new_save_1", overwrite=true, as_template=false)

    assert.equal(report.settings.name, "new_save_1", "save report settings under new_save_1 got " + report.settings.name);
    assert.ok(m.analysisHasChanged, ".analysis should have been modified")
    // load default settings
    report.load("Full report", "default")
    assert.equal(report.settings.name, "Full report", "loaded report should be named 'Full report', got " + report.settings.name);
    assert.equal(report.clones.length, 1, "Full report should still have 1 clone(s) selected, got "  + report.clones.length);

    // load saved settings 
    report.load("new_save_1", "analysis")
    assert.equal(report.settings.name, "new_save_1", "loaded report should be named 'new_save_1', got " + report.settings.name);
    assert.equal(report.clones.length, 1, "default report should still have 1 clone(s) selected, got "  + report.clones.length);

    // overwrite existing file (overwrite false)
    report.addClones([2])
    assert.equal(report.clones.length, 2, "test !overwriting: default report should now have 2 clone(s) selected, got " + report.clones.length);
    report.save("new_save_1", overwrite=false, as_template=false)
    report.load("new_save_1", "analysis")
    assert.equal(report.clones.length, 1, "test !overwriting: default report should still have 1 clone(s) selected, got " + report.clones.length);

    // For the moment, clone list in no more stocked inside analysis (issue #4996)
    // overwrite existing file (overwrite true)
    report.addClones([2])
    assert.equal(report.clones.length, 2, "test overwriting: current report should now have 2 clone(s) selected, got " + report.clones.length);
    report.save("new_save_1", overwrite=true, as_template=false)
    report.load("new_save_1", "analysis")
    assert.equal(report.clones.length, 2, "test overwriting: default report should now have 2 clone(s) selected, got " + report.clones.length);
    
});


QUnit.test("Report: save/load under template", function(assert) {
    
    localStorage.removeItem("report_templates")
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    // save
    assert.notOk(m.analysisHasChanged, ".analysis should be unchanged")
    report.addClones([1])
    assert.equal(report.clones.length, 1, "report should have 1 clone(s) selected, got "  + report.clones.length);
    report.save("new_template_1", true, as_template=true)
    assert.equal(report.settings.name, "new_template_1", "save report settings under new_template_1 got " + report.settings.name);
    assert.notOk(m.analysisHasChanged, ".analysis should have been modified")

    // load default settings
    report.load("Full report", source="template")
    assert.equal(report.settings.name, "Full report", "loaded report should be named 'Full report', got " + report.settings.name);
    assert.equal(report.clones.length, 1, "Full report should still have 1 clone(s) selected, got "  + report.clones.length);

    // reset model
    var m = new Model(m); 
    var report = new Report(m)
    m.parseJsonData(json_data,100)
    
    // load saved settings 
    report.load("new_template_1", source="template")
    assert.equal(report.settings.name, "new_template_1", "loaded report should be named 'new_template_1', got " + report.settings.name);
    assert.equal(report.clones.length, 0, "default report should still have 0 clone(s) selected, got "  + report.clones.length);

    // overwrite existing file (overwrite true)
    report.addClones([1, 2])
    assert.equal(report.clones.length, 2, "default report should now have 2 clone(s) selected, got " + report.clones.length);
    report.save("new_template_1", true)
    report.load("new_template_1", source="template")
    assert.equal(report.clones.length, 2, "test overwriting: default report should still have 2 clone(s) selected, got " + report.clones.length);

})

QUnit.test("Report: delete report/template", function(assert) {

    localStorage.removeItem("report_templates")
    var m = new Model(m);
    var report = new Report(m)
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    // Create fake template & report
    report.save("new_save_1", overwrite=true, as_template=false)
    report.save("new_template_1", overwrite=true, as_template=true)


    // Delete saved user template
    assert.equal(report.settings.name, "new_template_1", "loaded report should be named 'new_template_1', got " + report.settings.name);
    report.delete(skipConfirm=false)
    assert.notEqual(report.local_settings.new_template_1, undefined, "Report still present as deletion not confimred")
    report.delete(skipConfirm=true)
    assert.equal(report.local_settings.new_template_1, undefined, "Report removed as deletion COMFIRMED")


    // Delete saved report
    report.load("new_save_1", source="analysis")
    assert.equal(report.settings.name, "new_save_1", "loaded report should be named 'new_save_1', got " + report.settings.name);
    report.delete(skipConfirm=false)
    assert.notEqual(report.m.report_save.new_save_1, undefined, "Report still present as deletion not confimred")
    report.delete(skipConfirm=true)
    assert.equal(report.m.report_save.new_save_1, undefined, "Report removed as deletion COMFIRMED")


    // Try delete defualt template
    report.load("Full report")
    assert.equal(report.settings.name, "Full report", "loaded report should be named 'new_template_1', got " + report.settings.name);
    report.delete(skipConfirm=false)
    assert.notEqual(report.default_settings["Full report"], undefined, "Default template still present as deletion not confimred")
    report.delete(skipConfirm=true)
    assert.notEqual(report.default_settings["Full report"], undefined, "Default template still present even if deletion IS confimred")
})


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
    assert.equal(axis_color, m.color.axis.name)

});

QUnit.test("Report: blocks", function(assert) {
    
    var m = new Model(m);
    var report = new Report(m)
    var sp = new ScatterPlot("visu", m);
    if (!console.build)
        console = new Com(console)
    m.parseJsonData(json_data,100)

    var default_blockCount = report.settings.blocks.length;

    //add scatterplot block to report
    report.addScatterplot(sp)
    assert.equal(report.settings.blocks.length, default_blockCount+1)
    assert.equal(report.settings.blocks[report.settings.blocks.length-1].blockType , "scatterplot", "scatterplot block added")

    //add generic block
    report.addBlock({blockType : "comments", text: "test"}) // duplicable
    assert.equal(report.settings.blocks.length, default_blockCount+2)
    assert.equal(report.settings.blocks[report.settings.blocks.length-1].blockType , "comments", "comments block added")

    //try add an already existing block (blockcount does not increase)
    console.default.log( report.settings.blocks)
    report.addBlock({blockType: 'reads_stats'}) // unique block
    assert.equal(report.settings.blocks.length, default_blockCount+2, "Reads stats block already added") //
    report.addBlock({blockType : "comments", text: "test"}) // not unique block
    assert.equal(report.settings.blocks.length, default_blockCount+3, "comments block added") //

    //find block 
    assert.equal(report.indexOfBlock({blockType : "comments", text: "test"}), default_blockCount+1, "find block")

    //remove block by index 
    report.removeBlock(1)
    assert.equal(report.settings.blocks.length, default_blockCount+2, "remove block using index")

    //remove block
    report.removeBlock({blockType : "comments", text: "test"})
    assert.equal(report.indexOfBlock({blockType : "comments", text: "test"}), 8, "remove block using object descriptor, still second comment block")
    report.removeBlock({blockType : "comments", text: "test"})
    assert.equal(report.indexOfBlock({blockType : "comments", text: "test"}), -1, "remove second comment block using object descriptor")

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

