
QUnit.test("Axis : ", function(assert) {
    
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var axis = new Axis(m);

    /* Axis object give you label list(with position/color/...)
     * and a pos(cloneID) function to place a clone on it
     * */
    
    assert.deepEqual(axis.labels,  [], "default axis");
    
    //abundance
    axis.custom(function(clone){return clone.getSizeZero()},
                function(){return m.min_size},
                1,
                true,
                true
    )
    assert.deepEqual(axis.labels,  [
            {"geneColor": undefined,"pos": 1,"text": "100%", "type": "line"},
            {"geneColor": undefined,"pos": 0.5,"text": "10%", "type": "line"},
            {"geneColor": undefined,"pos": 0,"text": "1%", "type": "line"}
        ], "check size labels");
    
    assert.equal(axis.pos(0).toPrecision(3), 0.349, "clone 0 (5%) position -> 0.651")
    assert.equal(axis.pos(1).toPrecision(3), 0.500, "clone 1 (10%) position -> 0.5")
    assert.equal(axis.pos(2).toPrecision(3), 0.548, "clone 2 (12.5%) position -> 0.452")
    
    axis.m.changeGermline("TRG")
    //germline V
    axis.useGermline(axis.m.germlineV, "V")
    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(183,110,36)","pos": 0.16666666666666666,"text": "TRGV4","type": "line"},
            {"geneColor": "rgb(36,183,171)","pos": 0.5,"text": "TRGV5","type": "line"},
            {"geneColor": "","pos": 0.8333333333333334,"text": "?","type": "line"}
        ], "check germline V labels");
    
    assert.equal(axis.pos(0).toPrecision(3), 0.167, "clone 0 (v4) position -> 0.167")
    assert.equal(axis.pos(1).toPrecision(3), 0.500, "clone 1 (v5) position -> 0.5")
    assert.equal(axis.pos(2).toPrecision(3), 0.833, "clone 2 (?) position -> 0.833")
    
    
    
    //germline J
    axis.useGermline(axis.m.germlineJ, "J")
    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J labels");
    
    assert.equal(axis.pos(0).toPrecision(3), 0.250, "clone 0 (j2) position -> 0.25")
    assert.equal(axis.pos(2).toPrecision(3), 0.750, "clone 2 (?) position -> 0.75")
    
    
    
    //germline allele J
    axis.useGermline(axis.m.germlineJ, "J", true)
    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "rgb(183,110,36)","pos": 0.125,"text": "*02","type": "subline"},
            {"geneColor": "rgb(36,183,171)","pos": 0.375,"text": "*03","type": "subline"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J allele labels");
    
    assert.equal(axis.pos(0).toPrecision(3), 0.375, "clone 0 (j2*03) position -> 0.375")
    assert.equal(axis.pos(1).toPrecision(3), 0.125, "clone 1 (j2*04) position -> 0.125")
    
    
    
    //Nlength
    axis.custom(function(clone) {
                return clone.getNlength();
            },
            0,25)
    
    assert.equal(axis.pos(0).toPrecision(3), 0.143, "custom  : clone 0 (nlength = 0) position -> 0.00")
    assert.equal(axis.pos(1).toPrecision(3), 0.40, "custom  : clone 1 (nlength = 9) position -> 0.30")

    
    //gc
    axis.custom('GCContent', 0, 1, 'percent')
    
    assert.equal(axis.pos(0).toPrecision(3), 0.0476, "custom (percent) : clone 0 (gc = 1/21) position -> 0.0476")
    assert.equal(axis.pos(1).toPrecision(3), 0.778, "custom (percent) : clone 1 (gc = 14/18) position -> 0.944")
    assert.deepEqual(axis.labels[0].text,  "0.0%", "custom (percent) : check label 0.0%")
    
    //gc + log
    axis.custom('GCContent', 0.001, 1, 'percent', true)
    
    assert.equal(axis.pos(0).toPrecision(3), 0.559, "custom (percent+log) : clone 0 (gc = 1/21) position -> 0.559")
    assert.equal(axis.pos(1).toPrecision(3), 0.964, "custom (percent+log) : clone 1 (gc = 14/18) position -> 0.992")
    assert.deepEqual(axis.labels[0].text,  "100%", "custom (percent+log) : check label 100%")
    assert.deepEqual(axis.labels[1].text,  "10%", "custom (percent+log) : check label 10%")
    
    //output string
    axis.custom(function(clone) {
                return clone.getName();
            }, undefined, undefined, 'string')
    assert.equal(axis.pos(0).toPrecision(3), 0.0625, "custom (name : clone 0 ")
});
