var fs = require('fs');
var system = require('system');

var page = require('webpage').create();
page.onConsoleMessage = function(msg) { console.log(msg); };

var curdir = system.args[1] || fs.workingDirectory;
// curdir = "http://localhost/browser/test/QUnit"

page.onInitialized = function(){
    page.evaluate(function(){
        Math.log10 = Math.log10 || function(x) {
                        return Math.log(x) / Math.LN10;
        };
    });

};

page.open(curdir+"/test_Qunit.html", function() {
    setTimeout(function(){
        
        var tap = page.evaluate(function() {
            return tap_output;
        });

        console.log(tap);
        
        try {
            fs.write("tap_output", tap, 'w');
        } catch(e) {
            console.log(e);
        }

        // Some error ?
        if (tap.indexOf("not ok") > -1)
            phantom.exit(1);

        phantom.exit();
        
    }, 5000);

});