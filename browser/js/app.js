var DEFAULT_DB_ADDRESS="https://db.vidjil.org/";

requirejs.config({
    baseUrl: '',
    paths: {
        app: '',
        jquery: './js/lib/jquery-3.3.1.min',
        d3: './js/lib/d3.v5.min',
    }
});

// Load required libraries first
require(['d3'], function(d3) {window.d3 = d3;});
require(["jquery",
         "js/lib/jquery.form",
         "js/lib/jquery-ui",
         "js/lib/file",
         "js/lib/tsne",
         "js/lib/jstree.min",
         "js/lib/jquery.caret",
         "js/lib/jquery.atwho",
         "js/lib/vmi",
         "js/lib/svgExport",
         "js/lib/bioseq",
         "js/lib/select2.min"], function() {
             // Then config file (needed by Vidjil)
             require(['js/conf'], function() {
                 loadAfterConf()
             },
                     function(err) {
                        // Never call even if conf.js is malformed (syntax error)
                        loadAfterConf()
                     })
         });


// Show git_sha1, when it exists
require(["js/git-sha1"], function () { console.log("Vidjil client " + git_sha1) }, function(err) { })


function loadAfterConf() {
    if (typeof config === "undefined") {
        config = {};
        config.db_address   = DEFAULT_DB_ADDRESS+"vidjil/";
        config.cgi_address  = DEFAULT_DB_ADDRESS+"cgi/";
        config.use_database = false;
        config.load_error   = true;
    } else {
        config.load_error   = false;
    }


    require(['doctips/tips'],
            function(){},
            function(err) {
                console.log("missing tips.js");
            })
    // Then load views (otherwise that could generate some errors if
    // some files are loaded before the views)
    require(["js/view"], function() {

        require(["js/germline",
                 "js/vidjil-style",
                 "js/aligner_layer"],
                function() {
                    require(["js/closeable",
                              "js/scatterPlot_menu",
                              "js/scatterPlot_selector",
                              "js/aligner_menu"],
                            function() {
                                require(["js/menu",
                                         "js/dbscan",
                                         "js/germline_builder",
                                         "js/aligner",
                                         "js/aligner_sequence",
                                         "js/model_loader",
                                         "js/color",
                                         "js/filter",
                                         "js/model",
                                         "js/clone",
                                         "js/dynprog",
                                         "js/list",
                                         "js/axis_conf",
                                         "js/axis",
                                         "js/graph",
                                         "js/scatterPlot",
                                         "js/builder",
                                         "js/info",
                                         "js/com",
                                         "js/crossDomain",
                                         "js/database",
                                         "js/shortcut",
                                         "js/notification",
                                         "js/export",
                                         "js/similarity",
                                         "js/tools",
                                         "js/url",
                                         "js/autocomplete",
                                         "js/tips",
                                         "js/tag",
                                         "js/tokeniser",
                                         "js/indexedDom",
                                         // Speed test
                                         "js/speed_test",
                                         "js/form_builder",
                                         "js/vidjil_menu_decorator",
                                         "js/vidjil_vmi",
                                         "test/QUnit/testFiles/data_test",
                                        ], function(){
                                            
                                            if (typeof main == "undefined"){
                                                require(["js/main"]);
                                            }else{
                                                main();
                                            }
                                            if (typeof config.addons !== "undefined") {
                                                require(config.addons);
                                            }
                                            require(["js/screen_MRD"]);
                                            
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
