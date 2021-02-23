//
require(['js/lib/d3.v5.min'], function(d3) {window.d3 = d3;});


var lib = [         "js/lib/jquery-3.3.1.min",
                    "js/lib/blanket.1.1.9",
                    "js/lib/file"
          ];

var lib_plugin = [  "js/lib/jquery.form",
                    "js/lib/jquery.zclip"
                 ];

var lib_vidjil = [  //"js/conf",
                    "js/view",
                    "js/compare",
                    "js/menu",
                    "js/dbscan",
                    "js/germline",
                    "js/germline_builder",
                    "js/model_loader",
                    "js/model",
                    "js/clone",
                    "js/info",
                    "js/list",
                    "js/axis",
                    "js/axes",
                    "js/graph",
                    "js/scatterPlot_menu",
                    "js/scatterPlot_selector",
                    "js/scatterPlot",
                    "js/builder",
                    "js/com",
                    "js/vidjil-style",
                    "js/crossDomain",
                    //"js/pdf",
                    "js/database",
                    "js/notification",
                    "js/tools",
                    "js/url",
                    "js/shortcut",
                    "js/speed_test",
                    "js/closeable",
                    "js/tokeniser",
                    "js/indexedDom",
                    "js/form_builder",
                    "js/sequence",
                    "js/aligner",
                ];

var test_files = [  "testFiles/form_test",
                    "testFiles/dbscan_test",
                    "testFiles/model_test",
                    "testFiles/model_loader_test",
                    "testFiles/clone_test",
                    "testFiles/scatterPlot_test",
                    //"testFiles/axis_test",
                    "testFiles/graph_test",
                    "testFiles/com_test",
                    "testFiles/info_test",
                    "testFiles/list_test",
                    "testFiles/indexedDom_test",
                    "testFiles/segmenter_test",
                    "testFiles/tools_test",
                    "testFiles/germline_test",
                    "testFiles/url_test",
                    "testFiles/shortcut_test",
                    "testFiles/speed_test",
                    "testFiles/tokeniser_test",
                    "testFiles/compare_test"
                ];



var tap_output;
function startQunitTap(){
    qunitTap(QUnit, function() { 
            if (typeof arguments != "undefined"){
                tap_output+=arguments[0]+"\n";
            }
        });
}

function startQunit(){

    QUnit.assert.includes = function(result, pattern, message ) {
        // Checks that the result includes the pattern
        // TODO: see and use qunit-regexp !
        var res = result.indexOf(pattern) > -1;
    
        this.push(res, result, "{includes} " + pattern, message);
    };
    
    QUnit.assert.approx = function(result, expected, margin, message ) {
        // Checks that two floats are about the same
        var res = Math.abs(result-expected) <= margin;
    
        this.push(res, result, expected + "±" + margin, message);
    };

    
    QUnit.start();
}

function startTests(){
    
    jQuery.fn.d3Click = function () {
        this.each(function (i, e) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            e.dispatchEvent(evt);
        });
    };

    c_attributes = C_CLUSTERIZABLE
       | C_INTERACTABLE
       | C_IN_SCATTERPLOT
       | C_SIZE_CONSTANT;

    startQunit();
}

startQunitTap();
require(lib,
    function(){     
        require(lib_plugin, function(){
            require(lib_vidjil,
                function(){
                require(test_files, startTests);
            });
        });
    });
    

