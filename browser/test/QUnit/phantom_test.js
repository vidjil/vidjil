var fs = require('fs');

var page = require('webpage').create();
var curdir = phantom.args[0] || fs.workingDirectory;

page.open(curdir+"/test_Qunit.html", function() {
    setTimeout(function(){
        
        var tap = page.evaluate(function() {
            return tap_output;
        });
        
        try {
            fs.write("tap_output", tap, 'w');
        } catch(e) {
            console.log(e);
        }
        
        page.render('example.png');
        phantom.exit();
        
    }, 5000);

});