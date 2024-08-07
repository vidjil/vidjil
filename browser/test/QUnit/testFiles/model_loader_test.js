
QUnit.module("Model_loader", {
});

QUnit.test("getConvertedBoundary", function(assert) {
    model_loader = new Model_loader()
    seg = {'a': {'toto': 13, 'bla': 2}}
    assert.equal(model_loader.getConvertedBoundary(seg['a'], 'bl', 'a'), 2, "convertSeg")
});


QUnit.test("loadCluster", function(assert) {

    var m = new Model();
    m.parseJsonData(json_data, 100)
    m.initClones()
    m.parseJsonAnalysis(analysis_data_clusters)

    // Controle fake clusters
    assert.deepEqual(m.analysis_clusters.length,  2, "Correct number of non found clusters" )
    assert.deepEqual(m.analysis_clusters[0],  ["id_fake_1", "id_fake_2"], "Correct values for first non found cluster" )
    assert.deepEqual(m.analysis_clusters[1],  ["id_fake_1b", "id_fake_2b"], "Correct values for second non found cluster (don't get real clone Id)" )

    // Control real clusters
    assert.deepEqual(m.clone(0).mergedId,  undefined, "Correct mergedId for cluster support clone (0)" )
    assert.deepEqual(m.clone(1).mergedId,          0, "Correct mergedId value for supported clustered clone (1)" )
    assert.deepEqual(m.clone(2).mergedId,          0, "Correct mergedId value for supported clustered clone (2)" )
    assert.deepEqual(m.clone(3).mergedId,  undefined, "Correct mergedId for cluster support clone (3, alone clone of loaded cluster)" )

    assert.deepEqual(m.clusters[0],  [1, 2, 0], "Correct cluster for clone 0" )
    assert.deepEqual(m.clusters[1],         [], "Correct cluster for clone 1" )
    assert.deepEqual(m.clusters[2],         [], "Correct cluster for clone 2" )
    assert.deepEqual(m.clusters[3],        [3], "Correct cluster for clone 3" )

    // Same tests but with another top order
    var m = new Model();
    var json_data_bis = JSON.parse(JSON.stringify(json_data)) // hard copy
    json_data_bis.clones[0].top = 3 // cluster support clone is now the clone 1 (id:"id2")
    m.parseJsonData(json_data_bis, 100)
    m.initClones()
    m.parseJsonAnalysis(analysis_data_clusters)

    // Control real clusters; change support cluster clone
    assert.deepEqual(m.clone(0).mergedId,  undefined, "another top order; Correct mergedId for cluster support clone (0)" )
    assert.deepEqual(m.clone(1).mergedId,          0, "another top order; Correct mergedId value for supported clustered clone (1)" )
    assert.deepEqual(m.clone(2).mergedId,          0, "another top order; Correct mergedId value for supported clustered clone (2)" )
    assert.deepEqual(m.clone(3).mergedId,  undefined, "another top order; Correct mergedId value for supported clustered clone (2)" )

    assert.deepEqual(m.clusters[0],  [0, 2, 1], "another top order; Correct cluster for clone 0" )
    assert.deepEqual(m.clusters[1],         [], "another top order; Correct cluster for clone 1" )
    assert.deepEqual(m.clusters[2],         [], "another top order; Correct cluster for clone 2" )

});


QUnit.test("copySampleFields", function(assert) {
    model_loader = new Model_loader()

    var samples  = {"original_names": ["f0", "f1", "f3", "f4", "f5", "f7"], "order": [0,1,2,3,4,5] , "stock_order": [0,1,2,3,4,5] }
    var analysis = {"id": ["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7"], "order": [0,2,6,4], "stock_order": [0,1,2,3,7,6,5,4] }
    
    var loaded = model_loader.copySampleFields(samples, analysis)
    console.log(loaded)
    assert.deepEqual(loaded.original_names,  ["f0", "f1", "f3", "f4", "f5", "f7"], "original_names" )
    assert.deepEqual(loaded.order,           [0,3], "order" )
    assert.deepEqual(loaded.stock_order,     [0,1,2,5,4,3], "stock_order" )
});



QUnit.test("limit loaded clonotype", function(assert) {
    console.log( json_data_min_per_locus )
    assert.deepEqual(json_data_min_per_locus.clones.length,  110, "Correct number of clonotype in raw data" )

    CLONOTYPE_TOP_LIMIT = 100
    // No min per locus, so limit to CLONOTYPE_TOP_LIMIT value (100) +1 smaller (only TRG locus)
    var m = new Model();
    m.parseJsonData(json_data_min_per_locus)
    m.initClones()
    assert.deepEqual(m.clones.length,  101, "clones loaded limited to clonotype_top_limit" )


    // min per locus to 10, so should load top 100 + 10 clonotype + 2 smaller (both locus)
    json_data_min_per_locus.samples.commandline[0] += "--min-clones-per-locus 10"
    var m = new Model();
    m.parseJsonData(json_data_min_per_locus)
    m.initClones()
    assert.deepEqual(m.clones.length,  112, "clones loaded over limit due to min per locus" )


    // min per locus to 5, so should load top 100 + only 5 (even if more is present in sample) + 2 smaller (both locus)
    json_data_min_per_locus.samples.commandline[0] = json_data_min_per_locus.samples.commandline[0].replace("--min-clones-per-locus 10", "--min-clones-per-locus 5")
    var m = new Model();
    m.parseJsonData(json_data_min_per_locus)
    m.initClones()
    assert.deepEqual(m.clones.length,  107, "clones loaded over limit due to min per locus, with min per locus value" )

});
