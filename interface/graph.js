var axis_x = 100,
    axis_y = 50,
    g_w = 1400,
    g_h = 500;

var vis2 = d3.select("#visu2").append("svg:svg")
    .attr("id", "svg2")
		
    
var g_axis;
var g_graph;
var data_axis=[];
var data_graph=[];
var graph_col=[];

function initGraph(){
  data_axis[0]={x1 : axis_x, x2 : g_w-axis_x, y1: (g_h-axis_y), y2 : (g_h-axis_y) }
  data_axis[1]={x1 : axis_x, x2 : axis_x, y1: axis_y, y2 : (g_h-axis_y)}
  
  for (var i=0 ; i<junctions[0].size.length; i++){
    graph_col[i]=axis_x + 5 + i*(( g_w-(2*axis_x) )/(junctions[0].size.length-1) );
  }
  
  for (var i=0 ; i<sizeMap; i++){
    data_graph[i]={id : i};
  }
  
  displayGraph(data_axis, data_graph);
}

function displayGraph(data, data_2){
  g_axis = vis2.selectAll("line").data(data);
  g_axis.enter().append("line");
  g_axis.exit()    
    .remove();
    
    g_graph = vis2.selectAll("path").data(data_2);
    g_graph.enter().append("path");
    g_graph.exit()    
      .remove();
      
  updateGraph();
}

function constructPath(cloneID){
  var tmp=t;
  t=0;
  var path = "M" + graph_col[0]*resizeG_W +", "
	    + ( (g_h-axis_y) - scale_x(getSize(cloneID)*1000) ) * resizeG_H +" ";

      
  for (var i=1; i< graph_col.length; i++){
    t++;

    path += "L" + graph_col[i]*resizeG_W +", "
	    + ( (g_h-axis_y) - scale_x(getSize(cloneID)*1000) ) * resizeG_H +" ";
  }
  t=tmp;
  return path;
}

var scale_x;


function updateGraph(){
    document.getElementById("log").innerHTML+="<br>updateGraph";
  $("#log").scrollTop(100000000000000);
  
  scale_x = d3.scale.log()
    .domain([1,1000])
    .range([0,(g_h-2*axis_y)]);
    
  g_axis
    .transition()
    .duration(200)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
    .style("stroke", 'white')
    .attr("class", "axis");
    

  g_graph
    .transition()
    .duration(1000)
    .attr("d", function(d) {return constructPath(d.id); } )
    .attr("class", "graphLine")
    .style("stroke", function(d) { return color(d.id); });
    
  vis2.selectAll("path")
    .on("mouseover", function(d){
      focusIn(d.id, 1);
    })
    .on("mouseout", function(d){
      focusOut(d.id);
    })

}
