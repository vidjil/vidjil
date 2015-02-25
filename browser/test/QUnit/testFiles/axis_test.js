var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")


var m = new Model(m);
m.parseJsonData(json_data,100)
m.loadGermline()
m.initClones()

var axis = new Axis(m);

test("Axis : ", function() {

    /* Axis object give you label list(with position/color/...)
     * and a pos(cloneID) function to place a clone on it
     * */
    
    deepEqual(axis.labels,  [], "default axis");
    
    
    
    //abundance
    axis.useSize()
    deepEqual(axis.labels,  [
            {"geneColor": undefined,"pos": 0,"text": "100%", "type": "line"},
            {"geneColor": undefined,"pos": 0.5,"text": "10%", "type": "line"},
            {"geneColor": undefined,"pos": 1,"text": "1%", "type": "line"}
        ], "check size labels");
    
    equal(axis.pos(0).toPrecision(3), 0.651, "clone 0 (5%) position -> 0.651")
    equal(axis.pos(1).toPrecision(3), 0.500, "clone 1 (10%) position -> 0.5")
    equal(axis.pos(2).toPrecision(3), 0.452, "clone 2 (12.5%) position -> 0.452")
    
    axis.m.changeGermline("TRG")
    //germline V
    axis.useGermline(axis.m.germlineV, "V")
    deepEqual(axis.labels,  [
            {"geneColor": "rgb(183,110,36)","pos": 0.16666666666666666,"text": "TRGV4","type": "line"},
            {"geneColor": "rgb(36,183,171)","pos": 0.5,"text": "TRGV5","type": "line"},
            {"geneColor": "","pos": 0.8333333333333334,"text": "?","type": "line"}
        ], "check germline V labels");
    
    equal(axis.pos(0).toPrecision(3), 0.167, "clone 0 (v4) position -> 0.167")
    equal(axis.pos(1).toPrecision(3), 0.500, "clone 1 (v5) position -> 0.5")
    equal(axis.pos(2).toPrecision(3), 0.833, "clone 2 (?) position -> 0.833")
    
    
    
    //germline J
    axis.useGermline(axis.m.germlineJ, "J")
    deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J labels");
    
    equal(axis.pos(0).toPrecision(3), 0.250, "clone 0 (j2) position -> 0.25")
    equal(axis.pos(2).toPrecision(3), 0.750, "clone 2 (?) position -> 0.75")
    
    
    
    //germline allele J
    axis.useGermline(axis.m.germlineJ, "J", true)
    deepEqual(axis.labels,  [
            {"geneColor": "rgb(36,183,171)","pos": 0.25,"text": "TRGJ2","type": "line"},
            {"geneColor": "rgb(183,110,36)","pos": 0.125,"text": "*03","type": "subline"},
            {"geneColor": "rgb(36,183,171)","pos": 0.375,"text": "*04","type": "subline"},
            {"geneColor": "","pos": 0.75,"text": "?","type": "line"}
        ], "check germline J allele labels");
    
    equal(axis.pos(0).toPrecision(3), 0.125, "clone 0 (j2*03) position -> 0.125")
    equal(axis.pos(1).toPrecision(3), 0.375, "clone 1 (j2*04) position -> 0.375")
    
    
    
    //Nlength
    axis.custom(function(cloneID) {
                var value = m.clone(cloneID)
                    .getNlength()
                if (typeof value != "undefined" && value != 0) return value;
                return undefined;
            })
    deepEqual(axis.labels,  [
            {"geneColor": undefined,"pos": 1,"text": 9,"type": "line"},
            {"geneColor": undefined,"pos": 0.8,"text": 9,"type": "line"},
            {"geneColor": undefined,"pos": 0.6,"text": 9,"type": "line"},
            {"geneColor": undefined,"pos": 0.3999999999999999,"text": 10,"type": "line"},
            {"geneColor": undefined,"pos": 0.19999999999999996,"text": 10,"type": "line"},
            {"geneColor": undefined,"pos": 0,"text": 10,"type": "line"}
        ], "check N length labels");
    
    equal(axis.pos(0).toPrecision(3), "9.00", "clone 0 (n=0) position -> 1")
    equal(axis.pos(1).toPrecision(3), "1.00", "clone 1 (n=9) position -> 0.1")
    
    
    
    //custom (labels between 50 and 200)
    axis.computeCustomLabels(50, 200)
    deepEqual(axis.labels,  [
            {"geneColor": undefined,"pos": 0,"text": 50,"type": "line"},
            {"geneColor": undefined,"pos": 0.2,"text": 80,"type": "line"},
            {"geneColor": undefined,"pos": 0.4,"text": 110,"type": "line"},
            {"geneColor": undefined,"pos": 0.6000000000000001,"text": 140,"type": "line"},
            {"geneColor": undefined,"pos": 0.8,"text": 170,"type": "line"},
            {"geneColor": undefined,"pos": 1,"text": 200,"type": "line"}
        ], "check custom labels");
    
});