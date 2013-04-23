
 /* ne marche pas en local (securité)
 * 
var req = new XMLHttpRequest();
  req.open("GET", "data.Json", true); 
  req.onreadystatechange = getData; 
  req.send(null); 
 
  function getData() 
  { 
    if (req.readyState == 4) 
    { 
      var jsonData = eval('(' + req.responseText + ')'); 
    }
  }
*/

oFReader = new FileReader();

var jsonData

function loadJson() {
  if (document.getElementById("upload").files.length === 0) { return; }
  var oFile = document.getElementById("upload").files[0];
  oFReader.readAsText(oFile);
}

oFReader.onload = function (oFREvent) {
  jsonDataText = oFREvent.target.result;
  jsonData = JSON.parse(jsonDataText);
  updateVis();
  document.getElementById("log").innerHTML+="<br>chargement fichier json";
  force.start();
};

var w = 960,
    h = 500,
    padding = 5,
    fill = d3.scale.category10(),
    nodes = d3.range(100).map(Object),
    t = 0;  

//la visu
var vis = d3.select("#visu").append("svg:svg")
    .attr("width", w)
    .attr("height", h);


var force = d3.layout.force()
    .gravity(0.01)
    .nodes(nodes)
    .on("tick", tick)
    .size([w, h]);
    
var node = vis.selectAll("circle.node")
    .data(nodes)
  .enter().append("svg:circle")
    .attr("class", "node")
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", function(i) { return radius(i); })
    .style("fill", function(i) { return color(i); })
    .call(force.drag)
    .on("click", function(d,i) { 
      jsonData[i].size[t].n=100;
	document.getElementById("log").innerHTML+=("<br>[element id "+i+" / "+jsonData[i].junction+"] change size n to 100");
	updateVis()
	$("#log").scrollTop(100000000000000),
	 force.start();
    })
    .on("mouseover", function(d,i){
      document.getElementById("log").innerHTML+="<br>[element id "+i+" / "+jsonData[i].junction+"] focus on // size = "+jsonData[i].size[t].n;
      $("#log").scrollTop(100000000000000);
    })
;



function tick(e) {
  node

      .each(sizeSplit())
      .each(collide())
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

function sizeSplit() {
    return function(d) {
      if (jsonData[d].size[t].n <50){
	d.x+=0.005*(150-d.x);
	d.y+=0.005*(100-d.y);
      }else{
	 if (jsonData[d].size[t].n <200){
	    d.x+=0.005*(400-d.x);
	    d.y+=0.005*(250-d.y);
	  }else{
	    d.x+=0.005*(650-d.x);
	    d.y+=0.005*(400-d.y);
	  }
      }
  };
}


function collide() {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
    var r = radius(d)+padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
	//document.getElementById("log").innerHTML+=radius(d)+"/";
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = radius(d) + radius(quad.point)+padding;
        if (l < r) {
          l = (l - r) / l*0.5;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2
          || x2 < nx1
          || y1 > ny2
          || y2 < ny1;
    });
  };
}

  
function changeT(nt){
  t=nt;
  document.getElementById("log").innerHTML+="<br>changement de point de suivi > "+nt;
  $("#log").scrollTop(100000000000000);
  updateVis();
}

function updateVis(){
  vis.selectAll("circle.node")
      .attr("r", function(i) { return radius(i); })
      .style("fill", function(i) { return color(i); })
  force.start()
}

function radius(i) {
  if (typeof jsonData != "undefined") {
    return Math.sqrt(jsonData[i].size[t].n);
  }
}
  
  function color(i) {
    if (typeof jsonData != "undefined") {
      if( jsonData[i].size[t].n <30) return 'blue'
      if( jsonData[i].size[t].n <50) return 'green'
      if( jsonData[i].size[t].n <100) return 'violet'
      if( jsonData[i].size[t].n <200) return 'yellow'
      if( jsonData[i].size[t].n <400) return 'orange'
      return 'red'
    }
  }

