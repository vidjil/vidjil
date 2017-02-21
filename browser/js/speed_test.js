

function dataWithManyClones(many) {

    // json_data from test/QUnit/testFiles/data_test

    json_data.clones = []

    // Fill some clones
    for (var i = 0; i < many; i += 1)
    {
        var seg5 = "V-" + (i % 10)
        var seg3 = "J-" + (Math.round(i/10) % 5)
        var clone =
            {
                "sequence" : "acgtacgtactgtacgt",
                "name" : "test-" + i + " " + seg5 + " " + seg3,
                "id" : "test-" + i,
                "reads" : [i, i*2, i, i*2],
                "top" : i,
                "germline" : "TRG",
                "seg" : {
                    "5" : seg5,
                    "3" : seg3,
                    "3start" : 5,
                    "5end" : 10,
                }
            }

        json_data['clones'].push(clone);
    }

    return json_data
}


function speedTest(m) {

    var startTime = new Date()
        .getTime();
    var elapsedTime = 0;
    
    var log = '';
    
    for (var i = 20; i < 101; i = i + 20) {

        log += "<br/> ==== .parseJsonData, " + i + " clones <br />"
        startTime = new Date()
            .getTime();
        elapsedTime = 0;
                
        m.parseJsonData(dataWithManyClones(100), i)
            .loadGermline();
        m.initClones()
        
        elapsedTime = new Date()
            .getTime() - startTime;
        log += "init+load time : " + elapsedTime + "ms</br>";
        
        for (var j = 20; j < i + 1; j = j + 20) {
            m.displayTop(j);
            startTime = new Date()
                .getTime();
            elapsedTime = 0;
            
            m.update();
            elapsedTime = new Date()
                .getTime() - startTime;
            log += "complete update time (display :" + j + ") : " + elapsedTime + "ms";
            
            startTime = new Date()
                .getTime();
            elapsedTime = 0;
            m.updateElem([1, 2, 3, 5, 8, 13, 14, 15, 16, 17]);
            elapsedTime = new Date()
                .getTime() - startTime;
            log += "  //10 clones update time (display :" + j + ") : " + elapsedTime + "ms</br>";
            
        }
    }

    console.dataBox(log)
}
