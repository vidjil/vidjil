requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: '',
        jquery: 'jquery-2.1.1.min'
    }
});

// Load required libraries first
require(["jquery",
         "d3.v3",
         "jquery.form",
         "file",
         "tsne",
         "jstree.min"], function() {
             // Then config file (needed by Vidjil)
             require(['../conf'], function() {
                 loadAfterConf()
             },
                     function(err) {loadAfterConf()})
         });


function loadAfterConf() {
    // Then load views (otherwise that could generate some errors if
    // some files are loaded before the views)
    require(["../view"], function() {

        require(["../germline"],
                function() {
                    require(["../generic_axis"],
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
                                         "../germline_axis",
                                         "../numerical_axis",
                                         "../axes",
                                         "../graph",
                                         "../scatterPlot",
                                         "../builder",
                                         "../com",
                                         "../vidjil-style",
                                         "../crossDomain",
                                         "../database",
                                         "../shortcut",
                                         "../export",
                                         "../similarity",
                                         "../tools",
                                         "../url",
                                         // Speed test
                                         "../speed_test",
                                         "../../test/QUnit/testFiles/data_test",
                                        ], function(){
                                            if (typeof main == "undefined"){
                                                require(["../main"]);
                                            }else{
                                                main();
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
