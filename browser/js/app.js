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
         "StackBlur",
         "underscore",
         "rgbcolor",
         "file",
         "tsne"], function() {
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
        require(["../compare",
                 "../menu",
                 "../dbscan",
                 "../germline",
                 "../germline_builder",
                 "../segmenter",
                 "../model_loader",
                 "../model",
                 "../clone",
                 "../dynprog",
                 "../list",
                 "../axis",
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
                 "../tools"
                ], function(){
                    if (typeof main == "undefined"){
                        require(["../main"]);
                    }else{
                        main();
                    }
                })
    })
}
