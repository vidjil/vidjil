
var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")


var m = new Model(m);
m.parseJsonData(json_data,100)
m.loadGermline()
m.initClones()

var builder = new Builder(m);
builder.init = function(){}
builder.update = function(){}

var sp = new ScatterPlot("visu",m);
sp.init()

test("scatterplot : grid", function() {

    equal(sp.returnActiveclones(), 3, "returnActiveClones -> 3");
    
    sp.buildSystemGrid()
    deepEqual(sp.systemGrid,  {"IGH": {"x": 0.92,"y": 0.75},
                                "TRG": {"x": 0.92,"y": 0.25}, 
                                "label": [
                                    {"enabled": true,"text": "TRG","x": 0.8,"y": 0.25 },
                                    {"enabled": true,"text": "IGH","x": 0.81,"y": 0.75}]}, 
            "buildSystemGrid()");
    
    //deepEqual(sp.nodes[0], "","") 
              
});