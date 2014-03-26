var startTime = new Date()
    .getTime();
var elapsedTime = 0;

var m = new Model();

var graph = new Graph("visu2", m);
var list = new List("listClones", m);
var sp = new ScatterPlot("visu", m);
var segment = new Segment("bot_container", m);


for (var i = 20; i < 101; i = i + 20) {

    document.getElementById("test_result")
        .innerHTML += "</br> load top " + i + "</br>";

    startTime = new Date()
        .getTime();
    elapsedTime = 0;

    m.parseJsonData(dataTest, i)
        .loadGermline();
    m.initClones()

    elapsedTime = new Date()
        .getTime() - startTime;
    document.getElementById("test_result")
        .innerHTML += "init+load time : " + elapsedTime + "ms</br>";

    for (var j = 20; j < i + 1; j = j + 20) {
        m.displayTop(j);
        startTime = new Date()
            .getTime();
        elapsedTime = 0;

        m.update();
        elapsedTime = new Date()
            .getTime() - startTime;
        document.getElementById("test_result")
            .innerHTML += "complete update time (display :" + j + ") : " + elapsedTime + "ms";

        startTime = new Date()
            .getTime();
        elapsedTime = 0;
        m.updateElem([0, 2, 3, 5, 8, 12]);
        elapsedTime = new Date()
            .getTime() - startTime;
        document.getElementById("test_result")
            .innerHTML += "  // 5 clones update time (display :" + j + ") : " + elapsedTime + "ms</br>";

    }

}