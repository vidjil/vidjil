

function speedTest(m) {

    var startTime = new Date()
        .getTime();
    var elapsedTime = 0;
    
    var log = '';
    
    for (var i = 20; i < 101; i = i + 20) {
                
        log += "</br> load top " + i + "</br>";
        
        startTime = new Date()
            .getTime();
        elapsedTime = 0;
                
        m.parseJsonData(json_data, i)
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
            m.updateElem([0, 2, 3]); // , 5, 8, 12]);
            elapsedTime = new Date()
                .getTime() - startTime;
            log += "  // 5 clones update time (display :" + j + ") : " + elapsedTime + "ms</br>";
            
        }
    }

    console.dataBox(log)
}
