var DEFAULT_DB_ADDRESS="https://db.vidjil.org/vidjil/";

requirejs.config({
    baseUrl: '/js/lib',
    paths: {
        app: '',
        jquery: 'jquery-3.3.1.min',
        d3: 'd3.v5.min',
    }
});

// Load required libraries first
require(['d3'], function(d3) {window.d3 = d3;});
require(["jquery",
         "jquery.form",
         "file",
         "tsne",
         "jstree.min",
         "jquery.caret",
         "jquery.atwho",
         "vmi",
         "svgExport"], function() {
             // Then config file (needed by Vidjil)
             require(['../conf'], function() {
                 loadAfterConf()
             },
                     function(err) {loadAfterConf()})
         });


// Show git_sha1, when it exists
require(["../git-sha1"], function () { console.log("Vidjil client " + git_sha1) }, function(err) { })


function loadAfterConf() {
    if (typeof config === "undefined") {
        config = {};
        config.db_address = DEFAULT_DB_ADDRESS;
        config.use_database = false;
    }

    require(['../../doctips/tips'],
            function(){},
            function(err) {
                console.log("missing tips.js");
            })
    // Then load views (otherwise that could generate some errors if
    // some files are loaded before the views)
    require(["../view"], function() {

        require(["../germline"],
                function() {
                    require(["../closeable"],
                            function() {
                                require(["../compare",
                                         "../menu",
                                         "../dbscan",
                                         "../germline_builder",
                                         "../segmenter",
                                         "../model_loader",
                                         "../model",
                                         "../clone",
                                         "../dynprog",
                                         "../list",
                                         "../axes",
                                         "../axis",
                                         "../graph",
                                         "../scatterPlot_menu",
                                         "../scatterPlot_selector",
                                         "../scatterPlot",
                                         "../builder",
                                         "../info",
                                         "../com",
                                         "../vidjil-style",
                                         "../crossDomain",
                                         "../database",
                                         "../shortcut",
                                         "../notification",
                                         "../export",
                                         "../similarity",
                                         "../tools",
                                         "../url",
                                         "../autocomplete",
                                         "../tips",
                                         "../tokeniser",
                                         "../indexedDom",
                                         // Speed test
                                         "../speed_test",
                                         "../form_builder",
                                         "../vidjil_menu_decorator",
                                         "../../test/QUnit/testFiles/data_test",
                                        ], function(){
                                            if (typeof main == "undefined"){
                                                require(["../main"]);
                                            }else{
                                                main();
                                            }
                                            if (typeof config.addons !== "undefined") {
                                                require(config.addons);
                                            }
                                        })
                            })
                },
                function(err)
                {
                    alert("The Vidjil web application client may not be properly installed: 'germline.js' is not found. Please run 'make browser'.");
                    exit()
                }
               )

    })
}
