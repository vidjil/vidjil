

function dataWithManyClones(many) {

    var json_data = {
        "vidjil_json_version": ["2014.09"],
        "reads": {
            "segmented": [200,100,200,100],
            "total": [200,100,200,100],
            "germline": {
                "TRG": [100,50,100,50],
                "IGH": [100,50,100,50]
            },
        },
        "samples": {
            "number": 4,
            "commandline": ["a", "b", "c", "d"],
            "original_names": ["a", "b", "c", "d"],
            "log": [ "a", "b", "c", "d"],
            "producer": [ "a", "b", "c", "d"],
            "timestamp": ["2014-10-20 13:59:02", "2014-10-25 14:00:32", "2014-11-20 14:03:13", "2014-12-20 14:04:48"],
            "run_timestamp": ["2015-10-20 13:59:02", "2015-10-25 14:00:32", "2015-11-20 14:03:13", "2015-12-20 14:04:48"]
        },
        "clones": []
    }

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

        json_data.clones.push(clone);
    }

    return json_data
}


function speedTest(m) {

    var startTime = new Date()
        .getTime();
    var elapsedTime = 0;
    
    var log = '';
    
    for (var i = 20; i < 101; i = i + 20) {

        log += "\n==== .parseJsonData, " + i + " clones\n"
        startTime = new Date()
            .getTime();
        elapsedTime = 0;

        m.parseJsonData(dataWithManyClones(100), i)
            .loadGermline();
        m.initClones()
        
        elapsedTime = new Date()
            .getTime() - startTime;
        log += "init+load time : " + elapsedTime + "ms\n";
        
        for (var j = 20; j < i + 1; j = j + 20) {
            m.filter.add("Top",">",j);
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
            log += "  //10 clones update time (display :" + j + ") : " + elapsedTime + "ms\n";
            
        }
    }

    return log;
}
