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
    .range([0,(g_h)]);
    
  var height=100;
  
  for (var i=0 ; i<8; i++){
    data_axis[i]={class : "axis" ,text : (height+"%"), x1 : 0, x2 : g_w, 
		    y1 : (g_h- scale_x((height/100)*(1/min_size))), 
		    y2 : (g_h- scale_x((height/100)*(1/min_size)))}
		    
    height=height/10;
  }
  if (junctions[0].size.length==1){
    graph_col[0]=700;
    data_axis[7]={class : "axis_v" ,text : "time"+0 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h, y2 : 0, time: 0}
    }else{
      if (junctions[0].size.length==2){
	graph_col[0]=300;
	graph_col[1]=1100;
	data_axis[7]={class : "axis_v" ,text : "time"+0 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h, y2 : 0, time: 0}
	data_axis[8]={class : "axis_v" ,text : "time"+1 ,
			x1 : graph_col[1], x2 : graph_col[1], 
			y1 : g_h, y2 : 0, time: 1}
      }else{
	for (var i=0 ; i<junctions[0].size.length; i++){
	graph_col[i]=axis_x + 5 + i*(( g_w-(2*axis_x) )/(junctions[0].size.length-1) );
	data_axis[7+i]={class : "axis_v" ,text : "time"+i ,
			x1 : graph_col[i], x2 : graph_col[i], 
			y1 : g_h, y2 : 0, time: i}
      }
    }
  }
  
  for (var i=0 ; i<totalClones; i++){
    data_graph[i]={id : i, display: true, name :"line"+i, select : false, focus : false};
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
  var path;
  
  if (getSize(cloneID)==0){
    path = Math.floor( graph_col[0] * resizeG_W ) + ", "
	      +Math.floor(( g_h - 0 ) * resizeG_H );
  }else{
    path = Math.floor( graph_col[0] * resizeG_W ) + ", "
	      +Math.floor(( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) * resizeG_H );
  }
  
  for (var i=1; i< graph_col.length; i++){
    t++;
    
    if (getSize(cloneID)==0){
      path += ", "+Math.floor( graph_col[i] * resizeG_W ) + ", "
		+Math.floor(( g_h + 450 ) * resizeG_H );
    }else{
      path += ", "+Math.floor( graph_col[i] * resizeG_W ) + ", "
		+Math.floor(( g_h - scale_x(getSize(cloneID)*(1/min_size)) ) * resizeG_H );
    }

  }
  t=tmp;
  return path;
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
    .style("display", function(d) { if (d.display==true) return "";
				    else return "none";
    })
    .style("stroke-dasharray", function(d) { if (d.select==true) return "8,1";
				    else return "";
    })
    .style("stroke-width", function(d) { 
      if ( d.focus==true ) return "3";
      if ( d.select==true ) return "2";
      return "";
    })
    .style("opacity", function(d) { if (d.select==true || d.focus==true) return "1";
				    else return "";
    })
    .style("stroke", function(d) { if (d.focus==true) return "white";
				    else return color(d.id);
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
    .range([0,(g_h)]);
    
  g_axis
    .transition()
    .duration(800)
    .attr("x1", function(d) { return resizeG_W*d.x1; })
    .attr("x2", function(d) { return resizeG_W*d.x2; })
    .attr("y1", function(d) { return resizeG_H*d.y1; })
    .attr("y2", function(d) { return resizeG_H*d.y2; })
    .style("stroke", 'white')
    .attr("class", function(d) { return d.class; })
   
  g_text
    .transition()
    .duration(800)
    .text( function (d) { return d.text; })
    .attr("fill", "white")
    .attr("class", function(d) { if (d.class=="axis_v") return "axis_button"; })
    .attr("y", function(d) { 
      if (d.class=="axis") return Math.floor(resizeG_H*d.y1);
      else return Math.floor(resizeG_H*(g_h) + 15);
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
    .duration(1000)
    .attr("points", function(d) {
	return constructPath(d.id); 
    } )
    .attr("class", function(d) { return g_class(d.id); })
    .style("stroke", function(d) { return color(d.id); })
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

}
