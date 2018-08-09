

QUnit.module("Axis", {
});


QUnit.test("axis", function(assert) {
    
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var axis = new NumericalAxis(m);

    /* Axis object give you label list(with position/color/...)
     * and a pos(cloneID) function to place a clone on it
     * */
    
    assert.deepEqual(axis.labels,  [], "default axis");
    
    //abundance
    axis.init(m.clones,
                function(clone){return clone.getSizeZero()},
                undefined,
                false,
                function(){return m.min_size},
                1,
                true
    )
    assert.deepEqual(axis.labels,  [
            {"pos": 1,"text": "100%", "type": "line"},
            {"pos": 0.5,"text": "10%", "type": "line"},
            {"pos": 0,"text": "1%", "type": "line"}
        ], "check size labels");

    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.349, "clone 0 (5%) position -> 0.651")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.500, "clone 1 (10%) position -> 0.5")
    assert.equal(axis.pos(m.clone(2)).pos.toPrecision(3), 0.548, "clone 2 (12.5%) position -> 0.452")

    m.changeGermline("TRG")

    //germline V
    axis = new GermlineAxis(m, false, true, "5", false);
    axis.init(m.clones, function(clone) {return clone.getGene("5", false)})
    console.log(axis.germline)

    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(183,110,36)","pos": 0.16666666666666666,"text": "TRGV4","type": "line"},
            {"geneColor": "rgb(36,183,171)","pos": 0.5,"text": "TRGV5","type": "line"},
            {"geneColor": "","pos": 0.8333333333333334,"text": "?","type": "line"}
        ], "check germline V labels");
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.167, "clone 0 (v4) position -> 0.167")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.500, "clone 1 (v5) position -> 0.5")
    assert.equal(axis.pos(m.clone(2)).pos.toPrecision(3), 0.833, "clone 2 (?) position -> 0.833")
    
    
    
    //germline J
    axis = new GermlineAxis(m, false, true, "3", false);
    axis.init(m.clones, function(clone) {return clone.getGene("3", false)})

    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J labels");
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.250, "clone 0 (j2) position -> 0.25")
    assert.equal(axis.pos(m.clone(2)).pos.toPrecision(3), 0.750, "clone 2 (?) position -> 0.75")
    
    
    //germline allele J
    axis = new GermlineAxis(m, false, true, "3", true);
    axis.init(m.clones, function(clone) {return clone.getGene("3", true)})

    assert.deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "rgb(183,110,36)","pos": 0.125,"text": "*02","type": "subline"},
            {"geneColor": "rgb(36,183,171)","pos": 0.375,"text": "*03","type": "subline"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J allele labels");
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.375, "clone 0 (j2*03) position -> 0.375")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.125, "clone 1 (j2*04) position -> 0.125")
    
    
    
    //Nlength
    axis = new NumericalAxis(m)
    axis.init(m.clones,
            function(clone) {
                return clone.getNlength();
            },
            undefined,
            false,
            0,25)
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.00, "custom  : clone 0 (nlength = 0) position -> 0.00")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.321, "custom  : clone 1 (nlength = 9) position")
  
    //sequenceLength
    axis = new NumericalAxis(m)
    axis.MAX_NB_STEPS_IN_AXIS = 8
    axis.init(m.clones,
            function(clone) {
                return clone.getSequenceLength();
            },
            undefined,
            false)

    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.0700, "custom 2 : clone 0 (sequenceLength = 21)  position")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.0600, "custom 2 : clone 1 (sequenceLength = 18)  position")
    assert.equal(axis.pos(m.clone(3)).pos.toPrecision(3), 0.803, "custom 2 : clone 3 (sequenceLength = 241) position")
    assert.equal(axis.label_mapping.hasOwnProperty('0'),  true, "axis has label 0")
    assert.equal(axis.label_mapping.hasOwnProperty('10'), false,  "axis does not have label 10")
    assert.equal(axis.label_mapping.hasOwnProperty('250'), true, "axis has label 250")
    assert.equal(axis.label_mapping['0'].pos.toPrecision(3), 0, "pos of axis.label 0 is 0")
    assert.equal(axis.label_mapping['150'].pos.toPrecision(3), 0.500, "pos of axis.label 150 is 0.500")
    assert.equal(axis.labels[0].pos, 1, "pos of axis label 0 ('?' value) is 1")
    assert.approx(axis.labels[axis.labels.length-1].pos, 0.833, 0.01, "pos of last axis label is about 0.833")
    assert.equal((axis.labels.length != axis.label_mapping.length), true, "axis.labels length != axis.label_mapping length (du to '?')")

    // sequenceLength with undefined
    axis = new NumericalAxis(m)
    axis.init(m.clones,
            function(clone) {
                return clone.getSequenceLength();
            },
            undefined,
            true)
    assert.notEqual(axis.labels[axis.labels.length-2].pos, 1, "pos of last axis label is not 1")
    assert.equal( (axis.labels.length != axis.label_mapping.length), true, "axis.labels length != axis.label_mapping length (du to '?')")

    //gc
    axis = new PercentAxis(m, false, false);
    axis.init(m.clones, 'GCContent', undefined, false, 0, 1)
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.0476, "custom (percent) : clone 0 (gc = 1/21) position -> 0.0476")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.778, "custom (percent) : clone 1 (gc = 14/18) position -> 0.944")
    assert.deepEqual(axis.labels[0].text,  "0%", "custom (percent) : check label 0%")
    
    //gc + log
    axis.init(m.clones, 'GCContent', undefined, false, 0.001, 1, true)
    
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.559, "custom (percent+log) : clone 0 (gc = 1/21) position -> 0.559")
    assert.equal(axis.pos(m.clone(1)).pos.toPrecision(3), 0.964, "custom (percent+log) : clone 1 (gc = 14/18) position -> 0.992")
    assert.deepEqual(axis.labels[0].text,  "100%", "custom (percent+log) : check label 100%")
    assert.deepEqual(axis.labels[1].text,  "10%", "custom (percent+log) : check label 10%")
    
    // generic
    axis = new GenericAxis(m);
    axis.init(m.clones,
            function(clone) {
                return clone.getName();
            })
    assert.equal(axis.pos(m.clone(0)).pos.toPrecision(3), 0.0625, "generic (name : clone 0 ")

    // undefined values
    axis = new NumericalAxis(m);
    axis.init(m.clones,
              function(clone) {
                  return undefined;
              }, "V", true, 0, 0);
    assert.equal(axis.labels.length, 2, "Just two labels: 0, undefined");

    // undefined values
    axis = new NumericalAxis(m);
    axis.init(m.clones,
              function(clone) {
                  return 'undefined';
              });
    assert.equal(axis.labels[0].pos, 1, "Just two labels: undefined, 0");
    assert.equal(axis.labels[1].pos, 0, "Just two labels: undefined, 0");
});
