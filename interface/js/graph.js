/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
 * 
 * graph.js
 * 
 * contains only graph function and graph element
 * 
 * content:
 * 
 */

var axis_x = 100,       //marge entre l'ordonnée et le bord du graph
    axis_y = 50,        //marge entre l'abscisse et le bord du graph
    g_w = 1400,         //largeur du graph (avant resize)
    g_h = 450;          //hauteur du graph (avant resize)

var vis2 = d3.select("#visu2").append("svg:svg")
    .attr("id", "svg2")
		
    
var g_axis;
var g_graph;
var data_axis=[];
var data_graph=[];
var graph_col=[];

var scale_x;
    
    
function initGraph(){
  
  scale_x = d3.scale.log()
    .domain([1,(1/min_size)])
    .range([30,(g_h)]);
    
  var height=100;
  
  //ordonnée
  for (var i=0 ; i<8; i++){
    data_axis[i]={class : "axis" ,text : (height+"%"), x1 : 0, x2 : g_w, 
		    y1 : (g_h- scale_x((height/100)*(1/min_size))), 
		    y2 : (g_h- scale_x((height/100)*(1/min_size)))}
		    
    height=height/10;
  }
  
  //abscisse
  if (junctions[0].size.length==1){
    graph_col[0]=700;
    data_axis[9]={class : "axis_v" ,text : "fu"+1 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h+20, y2 : 0, time: 0}
    }else{
      if (junctions[0].size.length==2){
	graph_col[0]=300;
	graph_col[1]=1100;
	data_axis[9]={class : "axis_v" ,text : "fu"+1 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h+20, y2 : 0, time: 0}
	data_axis[10]={class : "axis_v" ,text : "fu"+2 ,
			x1 : graph_col[1], x2 : graph_col[1], 
			y1 : g_h+20, y2 : 0, time: 1}
      }else{
	for (var i=0 ; i<junctions[0].size.length; i++){
	graph_col[i]=axis_x + 5 + i*(( g_w-(2*axis_x) )/(junctions[0].size.length-1) );
	data_axis[9+i]={class : "axis_v" ,text : "fu"+(i+1) ,
			x1 : graph_col[i], x2 : graph_col[i], 
			y1 : g_h+20, y2 : 0, time: i}
      }
    }
  }
  
  //mobile
  data_axis[8]={class : "axis_f" ,text : "",
			x1 : graph_col[t], x2 : graph_col[t], 
			y1 : g_h+20, y2 : 0, time: 0}
  
  for (var i=0 ; i<totalClones; i++){
    data_graph[i]={id : i, display: true, name :"line"+i, select : false, focus : false, path : constructPath(i)};
  }
  
  displayGraph(data_axis, data_graph);
}

function displayGraph(data, data_2){
  g_axis = vis2.selectAll("line").data(data);
  g_axis.enter().append("line");
  g_axis.exit()    
    .remove();
    
  g_text = vis2.selectAll("text").data(data);
  g_text.enter().append("text");
  g_text.exit()    
    .remove();
    
  g_graph = vis2.selectAll("polyline").data(data_2);
  g_graph.enter().append("polyline");
  g_graph.exit()    
    .remove();
      
  updateGraph();
}


function constructPath(cloneID){
  var tmp=t;
  t=0;
  var p;
  
  if (getSize(cloneID)==0){
    p = [[ ( graph_col[0] ),( g_h + 50 ) ]];
  }else{
    p = [[ ( graph_col[0] ), ( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) ]];
  }
  
  for (var i=1; i< graph_col.length; i++){
    t++;
    
    if (getSize(cloneID)==0){
      p.push([( graph_col[i] ),( g_h + 50 ) ]);
    }else{
      p.push([ ( graph_col[i] ), ( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) ]);
    }

  }
  t=tmp;
  return p;
}

function g_class(cloneID){
  if (useCustomColor && typeof customColor[cloneID] != "undefined"){
    return "graphLine2";
  }else{ return "graphLine";}
}

function updateGraphColor(){
    g_graph
    .style("stroke", function(d) { return color(d.id); })
    .attr("class", function(d) { return g_class(d.id); })
}

function updateGraphDisplay(){
    g_graph
    .style("display", function(d) { if (d.display) return "";
				    else return "none";
    })
    .style("stroke-dasharray", function(d) { if (d.select) return "8,1";
				    else return "";
    })
    .style("stroke-width", function(d) { 
      if ( d.focus==true ) return "3";
      if ( d.select==true ) return "3";
      return "";
    })
    .style("stroke", function(d) { if (d.focus) return "#93a1a1";
				   
				    return color(d.id);
    })

    vis2.selectAll("polyline")
    .on("mouseover", function(d){
     if (d.display==true) focusIn(d.id, 1);
    })
    .on("mouseout", function(d){
     if (d.display==true) focusOut(d.id);
    })
    .on("click", function(d){
     if (d.display==true) selectClone(d.id);
    })
}


function updateGraph(){
    document.getElementById("log").innerHTML+="<br>updateGraph";
  $("#log").scrollTop(100000000000000);
    
  scale_x = d3.scale.log()
    .domain([1,(1/min_size)])
    .range([30,(g_h)]);
    
    g_axis
    .transition()
    .duration(800)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
    .style("stroke", '#586e75')
    .attr("class", function(d) { return d.class; })
    .attr("id", function(d) {
      if (d.class=="axis_f") return "timebar"
	return
    });
   
  g_text
    .transition()
    .duration(800)
    .text( function (d) { return d.text; })
    .attr("fill", "#586e75")
    .attr("class", function(d) { if (d.class=="axis_v") return "axis_button"; })
    .attr("y", function(d) { 
      if (d.class=="axis") return Math.floor(resizeG_H*d.y1);
      else return Math.floor(resizeG_H*(g_h));
    })
    .attr("x", function(d) { 
      if (d.class=="axis") return Math.floor(resizeG_W*20);
      else return Math.floor(resizeG_W*d.x1);
    });
    
    vis2.selectAll("text")
    .on("click", function(d){
      if (d.class=="axis_v") return changeT(d.time);
    })
    
  g_graph
    .transition()
    .duration(800)
    .attr("points", function(d) {
      var p=(d.path[0][0]*resizeG_W)+','+(d.path[0][1]*resizeG_H);
	for (var i=1; i<d.path.length; i++){
	  p+=','+(d.path[i][0]*resizeG_W)+','+(d.path[i][1]*resizeG_H);
	}
	return p;
    } )
    .attr("class", function(d) { return g_class(d.id); })
    .attr("id", function(d) { return d.name; });
    
  vis2.selectAll("polyline")
    .on("mouseover", function(d){
     if (d.display==true) focusIn(d.id, 1);
    })
    .on("mouseout", function(d){
     if (d.display==true) focusOut(d.id);
    })
    .on("click", function(d){
     if (d.display==true) selectClone(d.id);
    })
  
    updateGraphDisplay()
}

function updateAxis(){
    g_axis.data(data_axis)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
}
