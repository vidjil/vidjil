/*
ScatterPlot object
*/

var sp = {
    nodes: null,
    allEdges: null,
};

/*
Test existing DBSCAN object
*/
test("existingDBSCANObject", function() {
    //Creation of nodes & edges objects
    var nodesTab = [0,1];
    var firstEdge = {
        source: 0,
        target: 1,
        len: 10
    };
    var edgesTab = new Array();
    edgesTab.push(firstEdge);
    //sp object
    sp.nodes = nodesTab;
    sp.allEdges = edgesTab;
    //DBSCAN object creation
    var dbscan = new DBSCAN(sp, 3, 0);
    notEqual(dbscan, null, "verification: dbscan is not null");
});

/*
Test good clustering
*/

/*
EPSILON
*/
test("goodClusteringTwoNodes-Epsilon", function() {
    //Creation of nodes & edges objects
    var nodesTab = [0,1];
    var firstEdge = {
        source: 0,
        target: 1,
        len: 3
    };
    var edgesTab = new Array();
    edgesTab.push(firstEdge);
    //sp object
    sp.nodes = nodesTab;
    sp.allEdges = edgesTab;
    //First testset
    var dbscan = new DBSCAN(sp, 3, 0);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 1, "verification[0-Epsilon]: good clustering for two nodes");
    //Second testset
    var dbscan = new DBSCAN(sp, 2, 0);
    dbscan.runAlgorithm();
    notEqual(dbscan.clusters.length, 1, "verification[1-Epsilon]: good clustering for two nodes");
    equal(dbscan.clusters.length, 2, "verification[2-Epsilon]: good clustering for two nodes");
});

/*
MINPTS
*/
test("goodClusteringTwoNodes-MinPts", function() {
    //Creation of nodes & edges objects
    var nodesTab = [0,1];
    var firstEdge = {
        source: 0,
        target: 1,
        len: 2
    };
    var edgesTab = new Array();
    edgesTab.push(firstEdge);
    //sp object
    sp.nodes = nodesTab;
    sp.allEdges = edgesTab;
    //First testset
    var dbscan = new DBSCAN(sp, 3, 10);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 2, "verification[0-MinPts]: good clustering for two nodes");
    //Second testset
    var dbscan = new DBSCAN(sp, 3, 2);
    dbscan.runAlgorithm();
    notEqual(dbscan.clusters.length, 2, "verification[1-MinPts]: good clustering for two nodes");
    equal(dbscan.clusters.length, 1, "verification[2-MinPts]: good clustering for two nodes");
});

/*
BOTH - WITH BIGGER NUMBER OF NODES
*/
test("goodClusteringMultipleNodes", function() {
    var nodesTab = [0,1,2,3,4];
    var edge1 = {
        source: 0,
        target: 1,
        len: 2
    };
    var edge2 = {
        source: 0,
        target: 2,
        len: 3
    };
    var edge3 = {
        source: 0,
        target: 3,
        len: 10
    };
    var edge4 = {
        source: 0,
        target: 4,
        len: 1
    };
    var edge5 = {
        source: 1,
        target: 2,
        len: 5
    };
    var edge6 = {
        source: 1,
        target: 3,
        len: 12
    };
    var edge7 = {
        source: 1,
        target: 4,
        len: 1
    };
    var edge8 = {
        source: 2,
        target: 3,
        len: 8
    };
    var edge9 = {
        source: 2,
        target: 4,
        len: 7
    };
    var edge10 = {
        source: 3,
        target: 4,
        len: 3
    };
    var edgesTab = new Array();
    edgesTab.push(edge1);
    edgesTab.push(edge2);
    edgesTab.push(edge3);
    edgesTab.push(edge4);
    edgesTab.push(edge5);
    edgesTab.push(edge6);
    edgesTab.push(edge7);
    edgesTab.push(edge8);
    edgesTab.push(edge9);
    edgesTab.push(edge10);
    //sp object
    sp.nodes = nodesTab;
    sp.allEdges = edgesTab;
    //First testset
    var dbscan = new DBSCAN(sp, 3, 4);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 2, "verification[0-Both]: good clustering for multiple nodes");
    ok(dbscan.clusters[0].indexOf(0), "verification[1-Both(0)]: good clustering for multiple nodes");
    ok(dbscan.clusters[0].indexOf(1), "verification[1-Both(1)]: good clustering for multiple nodes");
    ok(dbscan.clusters[0].indexOf(3), "verification[1-Both(3)]: good clustering for multiple nodes");
    ok(dbscan.clusters[0].indexOf(4), "verification[1-Both(4)]: good clustering for multiple nodes");
    ok(dbscan.clusters[1].indexOf(2), "verification[1-Both(2)]: good clustering for multiple nodes");
    //Second testset
    var dbscan = new DBSCAN(sp, 3, 2);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 1, "verification[2-Both]: good clustering for multiple nodes");
    //Third testset
    var dbscan = new DBSCAN(sp, 3, 10);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 5, "verification[3-Both]: good clustering for multiple nodes");
    //4th testset
    var dbscan = new DBSCAN(sp, 5, 6);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 5, "verification[3-Both]: good clustering for multiple nodes");
    //5th testset
    var dbscan = new DBSCAN(sp, 5, 2);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 1, "verification[4-Both]: good clustering for multiple nodes");
    //6th testset
    var dbscan = new DBSCAN(sp, 5, 3);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 1, "verification[4-Both]: good clustering for multiple nodes");
    //7th testset
    var dbscan = new DBSCAN(sp, 5, 4);
    dbscan.runAlgorithm();
    equal(dbscan.clusters.length, 2, "verification[4-Both]: good clustering for multiple nodes");
});
