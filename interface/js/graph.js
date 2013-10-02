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
var date_container = d3.select("#svg2").append("svg:g")
    .attr("id", "date_container")
var text_container = d3.select("#svg2").append("svg:g")
    .attr("id", "text_container")

    
var g_axis;
var g_graph;
var g_text;
var g_leg;
var g_date;

var data_axis=[];
var data_graph=[];
var data_res=[];
var data_date=[];

var graph_col=[];
var precision=1;
var scale_x;
    
function resetGraph(){
  data_axis=[];
  data_graph=[];
  data_res=[];
  data_date=[];
  
  graph_col=[];
  precision=1;
  displayGraph(data_axis, data_graph, data_res, data_date);
}

function initGraph(){
  
  var count=min_size;


  while (count<1){
    count=count*10;
    precision= precision*10;
  }
    
  scale_x = d3.scale.log()
    .domain([1,precision])
    .range([0,(g_h)]);
    
  scale_color = d3.scale.log()
    .domain([1,precision])
    .range([250,0]);
    
  
  //abscisse
  if (windows[0].size.length==1){
    graph_col[0]=700;
    data_axis[0]={class : "axis_v" ,text : "fu"+1 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h+20, y2 : 0, time: 0}
    }else{
      if (windows[0].size.length==2){
	graph_col[0]=300;
	graph_col[1]=1100;
	data_axis[0]={class : "axis_v" ,text : "fu"+1 ,
			x1 : graph_col[0], x2 : graph_col[0], 
			y1 : g_h+20, y2 : 0, time: 0}
	data_axis[1]={class : "axis_v" ,text : "fu"+2 ,
			x1 : graph_col[1], x2 : graph_col[1], 
			y1 : g_h+20, y2 : 0, time: 1}
      }else{
	for (var i=0 ; i<windows[0].size.length; i++){
	graph_col[i]=axis_x1 + 5 + i*(( g_w-(axis_x1+axis_x2) )/(windows[0].size.length-1) );
	
	var time_name = "fu"+(i+1);
	if ( typeof jsonData.time != "undefined" ){
	  if ( typeof jsonData.time[i] != "undefined" ){
	    time_name = jsonData.time[i];
	  }
	}
	
	data_axis[i]={class : "axis_v" ,text : time_name ,
			x1 : graph_col[i], x2 : graph_col[i], 
			y1 : g_h+20, y2 : 0, time: i}
      }
    }
  }
  
  var height=1;
  var p=data_axis.length;
  var p2=0;
  
  //ordonnée
  while((height*precision)>0.5){
    data_axis[p]={class : "axis" ,text : -p2, x1 : 0, x2 : g_w, 
		    y1 : (g_h- scale_x(height*precision)), 
		    y2 : (g_h- scale_x(height*precision))}
		    
    height=height/10;
    p=p+1;
    p2=p2+1;
  }
  
  //mobile
  data_axis[data_axis.length]={class : "axis_f" ,text : "",
			x1 : graph_col[t], x2 : graph_col[t], 
			y1 : g_h+20, y2 : 0, time: 0}
  
  for (var i=0 ; i<totalClones; i++){
    data_graph[i]={id : i, name :"line"+i, path : constructPath(i)};
  }
    data_res[0]={id : totalClones, name :"resolution1", path :constructPathR(jsonData.resolution1) };
    data_res[1]={id : totalClones+1, name :"resolution5", path :constructPathR(jsonData.resolution5) };

  for (var i=0 ; i <windows[0].size.length ; i++){
    

    data_date[i]={class : "date" ,date : 'undefined' ,
			x1 : graph_col[i], x2 : graph_col[i], 
			y1 : g_h+40, y2 : 0, time: i}
  }
  
  displayGraph(data_axis, data_graph, data_res, data_date);
  
}

function displayGraph(data, data_2, data_3, data_4){
  g_axis = axis_container.selectAll("line").data(data);
  g_axis.enter().append("line");
  g_axis.exit()    
    .remove();
    
  g_text = text_container.selectAll("text").data(data);
  g_text.enter().append("text");
  g_text.exit()    
    .remove();
    
  g_graph = polyline_container.selectAll("path").data(data_2);
  g_graph.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  g_graph.exit()    
    .remove();
    
  g_graph.append("path")
    .transition()
    .duration(500)
    .style("fill","none")
    .attr("id", function(d) { return "poly"+d.name; })

    .attr("class", function(p) { return g_class(p.id); })
  g_graph.exit().remove();

  g_res = reso_container.selectAll("g").data(data_3);
  g_res.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  g_res.exit()    
    .remove();
   
  g_res.append("path")
    g_res.exit().remove();
    
  g_date= date_container.selectAll("text").data(data_4);
  g_date.enter().append("text");
  g_date.exit()    
    .remove();
    
  updateGraph();
}

function constructPathR(res){
  if (typeof res != "undefined" && res.length!=0){
    
    var p;
    
    p=[ [0, g_h] ];
    p.push([0, ( g_h - scale_x(res[0][used_ratio]*precision) ) ]);
    
    for (var i=0; i< graph_col.length; i++){
	p.push([( graph_col[i]), ( g_h - scale_x(res[i][used_ratio]*precision))]);
    }
    p.push([g_w, ( g_h - scale_x(res[graph_col.length-1][used_ratio]*precision) ) ]);
    p.push([g_w, g_h]);
    
    return p;
    
  }
  else return [[0,0]];
}

/*construit le tableau des points par laquelle la courbe d'un clone doit passer*/
function constructPath(cloneID){
  var tmp=t;
  t=0;
  var p;
  
  var x = graph_col[0];
  var y = scale_x(getSize(cloneID)*precision)
  
  //cas avec un seul point de suivi
  if (graph_col.length==1){
    if (getSize(cloneID)==0){
      p = [ ];
    }else{
      p = [[ ( x + (Math.random()*50)-125 ), ( g_h - y ) ]];
      p.push([ ( x + (Math.random()*50)+75 ), ( g_h - y ) ]);
    }
  }
  //plusieurs points de suivi
  else{
    
    //premier point de suivi 
    if (getSize(cloneID)==0){
      p = [ ];
    }else{
      p =   [[ ( x - 30  ), ( g_h - y )]];
      p.push([ ( x )      , ( g_h - y )]);
    }
    
    //points suivants
    for (var i=1; i< graph_col.length; i++){
      t++;
      x = graph_col[i];
      y = scale_x(getSize(cloneID)*precision)
      
      if (getSize(cloneID)==0){
	if (p.length!=0){
	  p.push([( x ),(g_h + 30)]);
	}else{

	}
      }else{
	
	//si premiere apparition du clone sur le graphique
	if (p.length==0){
	  p.push([( x - 30 ), ( g_h - y )]);
	}
	
	p.push(  [( x ), ( g_h - y )]);
	
	//si derniere apparition du clone sur le graphique
	if (i==graph_col.length-1 ){
	  p.push([( x + 30 ), ( g_h - y )]);
	}
	
      }
    }
    
  }
  t=tmp;
  return p;
}

function g_class(cloneID){
  if (colorMethod=="Tag" && typeof table[cloneID].tag != "undefined"){
    return "graphLine2";
  }else{ return "graphLine";}
}


function updateGraph(){
    console.log("updateGraph");
    
  scale_x = d3.scale.log()
    .domain([1,precision])
    .range([0,(g_h)]);
    
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
    .text( function (d) {return d.text;
    })
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
    
  text_container.selectAll("text")
    .on("click", function(d){
      if (d.class=="axis_v") return changeT(d.time);
    })
    
  g_graph.selectAll("path")
  .style("fill","none")
    .transition()
    .duration(500)
    .attr("d", function(p) {
      var che=' M '+Math.floor(p.path[0][0]*resizeG_W)+','+Math.floor(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=' L '+Math.floor(p.path[i][0]*resizeG_W)+','+Math.floor(p.path[i][1]*resizeG_H);
	}
	return che;
    } )
    .attr("class", function(p) { return g_class(p.id); })
    .attr("id", function(d) { return "poly"+d.name; })
    
  g_res.selectAll("path")
    .transition()
    .duration(500)
    .attr("d", function(p) {
      var che=' M '+Math.floor(p.path[0][0]*resizeG_W)+','+Math.floor(p.path[0][1]*resizeG_H);
	for (var i=1; i<p.path.length; i++){
	  che+=' L '+Math.floor(p.path[i][0]*resizeG_W)+','+Math.floor(p.path[i][1]*resizeG_H);
	}
	che+=' Z ';
	return che;
    } )
    
  g_date
    .transition()
    .duration(500)
    .text( function (d) {
      if ( d.date != "undefined" ){
	return d.date.toLocaleDateString();
      }else{
	return "  /  /  ";
      }
    })
    .attr("class", "date")
    .attr("fill", colorStyle.c01)
    .attr("y", function(d) { return 30;
    })
    .attr("x", function(d) { return Math.floor(resizeG_W*d.x1);
    });
    
  date_container.selectAll("text")
    .on("dblclick", function(d){ return changeDate(d.time);
    })

  polyline_container.selectAll("path")
    .attr("onmouseover",function(d) { return  "focusIn("+d.id+")"; } )
    .attr("onmouseout", function(d) { return  "focusOut("+d.id+")"; } )
    .on("click", function(d){ selectClone(d.id);})
    initStyle()
}
function lineFocusIn(elem){
  var cloneID=elem.parentNode.id.substr(4)
  focusIn(cloneID);
}
function lineFocusOut(elem){
  var cloneID=elem.parentNode.id.substr(4)
  focusOut(cloneID);
}

function resetGraphCluster(){
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
