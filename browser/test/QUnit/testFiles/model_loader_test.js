
QUnit.module("Model_loader", {
});

QUnit.test("getConvertedBoundary", function(assert) {
    model_loader = new Model_loader()
    seg = {'a': {'toto': 13, 'bla': 2}}
    assert.equal(model_loader.getConvertedBoundary(seg['a'], 'bl', 'a'), 2, "convertSeg")
});
