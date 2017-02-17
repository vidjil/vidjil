test("model_loader: getConvertedBoundary", function () {
    model_loader = new Model_loader()
    seg = {'a': {'toto': 13, 'bla': 2}}
    equal(model_loader.getConvertedBoundary(seg['a'], 'bl', 'a'), 2, "convertSeg")
});
