var fs = require('fs');
var Nightmare = require('nightmare');       
var nightmare = Nightmare({ show: false });

var curdir = __dirname;
var uri = 'file://' + curdir;


nightmare
    .on('console', function(){ console.log(arguments[1]) })
    .goto(uri+"/test_Qunit.html")
    .wait(1000)
    .wait(function() {
        return $('.qunit-fail').length > 0 || $('.qunit-pass').length > 0;
        })
    .evaluate(function () {
        return tap_output;
    })
    .end()
    .then(function (result) {
        console.log(result);
        fs.writeFile(curdir+"/tap_output", result, function(err) {
            if (err)
                console.log(err)
        });
    })
    .catch(function (error) {
        console.error('Search failed:', error);
    });
