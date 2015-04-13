requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: '',
        jquery: 'jquery-2.1.1.min'
    }
});

require(['../conf'], function () {}, function(err) {});

require(["d3.v3",
        "jquery.form",
        "StackBlur",
        "jspdf",
        "jspdf.plugin.addimage",
        "jspdf.plugin.svgToPdf",
        "jspdf.plugin.split_text_to_size",
        "jspdf.plugin.standard_fonts_metrics",
        "underscore",
        "rgbcolor",
        "file",
        "../compare", 
        "../menu", 
        "../dbscan", 
        "../germline", 
        "../germline_builder", 
        "../segmenter",
        "../model_loader",
        "../model",
        "../clone",
        "../list",
        "../axis",
        "../graph",
        "../scatterPlot",
        "../builder",
        "../com",
        "../vidjil-style",
        "../crossDomain",
        "../pdf",
        "../database",
        "../stats",
        "../shortcut",
        "../export"
        ], function(){
            if (typeof main == "undefined"){
                require(["../main"]);
            }else{
                main();
            }
        })
