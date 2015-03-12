requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: '',
        jquery: 'jquery-2.1.1.min'
    }
});
    
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
        "../conf",
        "../stats",
        "../shortcut",
        "../export"
        ], function(){
    require(["../main"]);
});
