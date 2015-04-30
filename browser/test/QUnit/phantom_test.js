var fs = require('fs');

var page = require('webpage').create();
page.onConsoleMessage = function(msg) { console.log(msg); };

var curdir = phantom.args[0] || fs.workingDirectory;

page.open("http://localhost/browser/test/QUnit/test_Qunit.html", function() {
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