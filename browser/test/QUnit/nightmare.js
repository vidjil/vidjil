var fs = require('fs');
var Nightmare = require('nightmare');       
var nightmare = Nightmare({ show: false });

var curdir = __dirname;
var uri = 'file://' + curdir;



function checkload(){
    require([]);
    require.config({
        baseUrl: ''});

    var libs = ["js/lib/jquery-3.3.1.min",
            "js/aligner",
            "testFiles/form_test",
            "testFiles/dbscan_test"];

    result = true;
    for (var l in libs){
        if (require.specified(libs[l])){
            //console.log("module '"+libs[l]+"' loaded");
        }else{
            result = false;
        }
    }
    return result;
}


nightmare
    .on('console', function(){ console.log(arguments[1]) })
    .goto(uri+"/test_Qunit.html")
    .wait(typeof require != "undefined")
    .wait(checkload)
    .wait(function() {
        return document.getElementsByClassName('qunit-fail').length > 0 || 
               document.getElementsByClassName('qunit-pass').length > 0;
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
