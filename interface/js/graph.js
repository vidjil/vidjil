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

var axis_x1 = 150,       //marge entre l'ordonnée et le bord du graph
    axis_x2 = 100,       //marge entre l'ordonnée et le bord du graph
    axis_y = 10,        //marge entre l'abscisse et le bord du graph
    g_w = 1400,         //largeur du graph (avant resize)
    g_h = 450;          //hauteur du graph (avant resize)

var vis2 = d3.select("#visu2").append("svg:svg")
    .attr("id", "svg2")

    d3.select("#svg2").append("svg:rect")
    .attr("id", "graph_back")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 2500)
    .attr("height", 2500)
    .on("click", function(){freeSelect();})

var axis_container = d3.select("#svg2").append("svg:g")
    .attr("id", "axis_container")
var polyline_container = d3.select("#svg2").append("svg:g")
    .attr("id", "polyline_container")
var reso_container = d3.select("#svg2").append("svg:g")
    .attr("id", "reso_container")
    
var g_axis;
var g_graph;
var g_res;
var data_axis=[];
var data_graph=[];
var data_res=[];

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
	graph_col[i]=axis_x1 + 5 + i*(( g_w-(axis_x1+axis_x2) )/(junctions[0].size.length-1) );
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
    data_graph[i]={id : i, name :"line"+i, path : constructPath(i)};
  }
  
  data_res[0]={id : totalClones, name :"resolution1", path :constructPathR(1) };
  data_res[1]={id : totalClones+1, name :"resolution5", path :constructPathR(5) };
  
  displayGraph(data_axis, data_graph, data_res);
}

function displayGraph(data, data_2, data_3){
  g_axis = axis_container.selectAll("line").data(data);
  g_axis.enter().append("line");
  g_axis.exit()    
    .remove();
    
  g_text = vis2.selectAll("text").data(data);
  g_text.enter().append("text");
  g_text.exit()    
    .remove();
    
  g_graph = polyline_container.selectAll("g").data(data_2);
  g_graph.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  g_graph.exit()    
    .remove();
    
  g_graph.append("polyline")
    .transition()
    .duration(500)
    .attr("points", function(p) {
      var che=(p.path[0][0]*resizeG_W)+','+(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=','+(p.path[i][0]*resizeG_W)+','+(p.path[i][1]*resizeG_H);
	}
	return che;
    } )
    .attr("class", function(p) { return g_class(p.id); })
  g_graph.exit().remove();

  g_res = reso_container.selectAll("g").data(data_3);
  g_res.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  g_res.exit()    
    .remove();
   
  g_res.append("polyline")
    .attr("points", function(p) {
      var che=(p.path[0][0]*resizeG_W)+','+(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=','+(p.path[i][0]*resizeG_W)+','+(p.path[i][1]*resizeG_H);
	}
	return che;
    } )
    g_res.exit().remove();
    
  updateGraph();
}

function constructPathR(res){
  var p;
  
  
  p=[ [0, (g_h+1000)] ];
  p.push([0, ( g_h - scale_x((res/jsonData.total_size[0])*(1/min_size)) ) ]);
  
  for (var i=0; i< graph_col.length; i++){
      p.push([( graph_col[i]), ( g_h - scale_x((res/jsonData.total_size[i])*(1/min_size)) ) ]);
  }
  p.push([g_w, ( g_h - scale_x((res/jsonData.total_size[graph_col.length-1])*(1/min_size)) ) ]);
  p.push([g_w, ( g_h+1000) ]);
  
  
  return p;
}

/*construit le tableau des points par laquelle la courbe d'un clone doit passer*/
function constructPath(cloneID){
  var tmp=t;
  t=0;
  var p;
  
  if (getSize(cloneID)==0){
    p = [ [( graph_col[0] ),(g_h + 50)] ]
  }else{
    p = [[ ( graph_col[0]+ (Math.random()*30)-15  ), ( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) ]];
  }
  
  for (var i=1; i< graph_col.length; i++){
    t++;
    
    if (getSize(cloneID)==0){
	p.push([( graph_col[i] ),(g_h + 50)]);
    }else{
      p.push([( graph_col[i] + (Math.random()*30)-15 ), ( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) ]);
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


function updateGraph(){
    document.getElementById("log").innerHTML+="<br>updateGraph";
  $("#log").scrollTop(100000000000000);
    
  scale_x = d3.scale.log()
    .domain([1,(1/min_size)])
    .range([30,(g_h)]);
    
    g_axis
    .transition()
    .duration(500)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
    .style("stroke", colorStyle.c06)
    .attr("class", function(d) { return d.class; })
    .attr("id", function(d) {
      if (d.class=="axis_f") return "timebar"
	return
    });
   
  g_text
    .transition()
    .duration(500)
    .text( function (d) { return d.text; })
    .attr("fill", colorStyle.c01)
    .attr("class", function(d) { if (d.class=="axis_v") return "axis_button"; })
    .attr("id", function(d) { if (d.class=="axis_v") return ("time"+d.time); })
    .attr("y", function(d) { 
      if (d.class=="axis") return Math.floor(resizeG_H*d.y1)+15;
      else return 15;
    })
    .attr("x", function(d) { 
      if (d.class=="axis") return 10;
      else return Math.floor(resizeG_W*d.x1);
    });
    
    vis2.selectAll("text")
    .on("click", function(d){
      if (d.class=="axis_v") return changeT(d.time);
    })
    
    g_graph.selectAll("polyline")
    .transition()
    .duration(500)
    .attr("points", function(p) {
      var che=(p.path[0][0]*resizeG_W)+','+(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=','+(p.path[i][0]*resizeG_W)+','+(p.path[i][1]*resizeG_H);
	}
	return che;
    } )
    .attr("class", function(p) { return g_class(p.id); })
    
    g_res.selectAll("polyline")
    .transition()
    .duration(500)
    .attr("points", function(p) {
      var che=(p.path[0][0]*resizeG_W)+','+(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=','+(p.path[i][0]*resizeG_W)+','+(p.path[i][1]*resizeG_H);
	}
	return che;
    } )

  polyline_container.selectAll("polyline")
    .on("mouseover", function(d){ focusIn(d.id);
    })
    .on("mouseout", function(d){ focusOut(d.id);
    })
    .on("click", function(d){ selectClone(d.id);})
    
    initStyle()
}

function resetGraph(){
  for (var i=0 ; i<totalClones; i++){
    data_graph[i].id = i;
  }
  updateGraph();
}

function updateAxis(){
    g_axis.data(data_axis)
    .transition()
    .duration(300)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
}
