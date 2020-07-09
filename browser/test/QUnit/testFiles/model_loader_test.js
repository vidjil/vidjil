
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
    assert.deepEqual(m.clone(0).mergedId,          1, "another top order; Correct mergedId for cluster support clone (0)" )
    assert.deepEqual(m.clone(1).mergedId,  undefined, "another top order; Correct mergedId value for supported clustered clone (1)" )
    assert.deepEqual(m.clone(2).mergedId,          1, "another top order; Correct mergedId value for supported clustered clone (2)" )

    assert.deepEqual(m.clusters[0],         [], "another top order; Correct cluster for clone 0" )
    assert.deepEqual(m.clusters[1],  [1, 2, 0], "another top order; Correct cluster for clone 1" )
    assert.deepEqual(m.clusters[2],         [], "another top order; Correct cluster for clone 2" )

});
