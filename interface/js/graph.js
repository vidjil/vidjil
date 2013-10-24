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

function Graph(id, model){
  this.id=id;
  this.m=model;
  this.resizeCoef=1;
  this.resizeW=1;
  this.resizeH=1;
  
  this.w=1400;
  this.h=450;
  this.marge1=150;
  this.marge2=100;
  this.marge3=100;
  
  this.m.view.push(this)
  
}

Graph.prototype = {
/* crée le cadre svg pour le graph
 * 
 * */
  init :function() {
    document.getElementById(this.id).innerHTML="";
    
    self=this;
    this.vis = d3.select("#"+this.id).append("svg:svg")
	.attr("id", this.id+"_svg");

    d3.select("#"+this.id+"_svg").append("svg:rect")
	.attr("id", this.id+"_back")
	.attr("x", 0)
	.attr("y", 0)
	.attr("width", 2500)
	.attr("height", 2500)
	.on("click", function(){self.m.unselectAll();})

    this.axis_container = d3.select("#"+this.id+"_svg").append("svg:g")
	.attr("id", "axis_container")
    this.polyline_container = d3.select("#"+this.id+"_svg").append("svg:g")
	.attr("id", "polyline_container")
    this.reso_container = d3.select("#"+this.id+"_svg").append("svg:g")
	.attr("id", "reso_container")
    this.date_container = d3.select("#"+this.id+"_svg").append("svg:g")
	.attr("id", "date_container")
    this.text_container = d3.select("#"+this.id+"_svg").append("svg:g")
	.attr("id", "text_container")
    
    this.data_axis=[];
    this.data_graph=[];
    this.data_res=[];

    this.graph_col=[];

    var count=this.m.min_size;
    this.precision=1;

    while (count<1){
      count=count*10;
      this.precision= this.precision*10;
    }
    
    this.scale_x = d3.scale.log()
      .domain([1,this.precision])
      .range([0,(this.h)]);
    
    this.scale_color = d3.scale.log()
      .domain([1,this.precision])
      .range([250,0]);
    
    //abscisse
    for (var i=0 ; i<this.m.windows[0].size.length; i++){
      this.graph_col[i]=this.marge1 + 5 + i*(( this.w-(this.marge1+this.marge2) )/(this.m.windows[0].size.length-1) );
    }
    if (this.m.windows[0].size.length==1){
      this.graph_col[0]=(this.w/2)
    }
    if (this.m.windows[0].size.length==2){
      this.graph_col[0]=300;
      this.graph_col[1]=1100;
    }
      
    for (var i=0 ; i<this.m.windows[0].size.length; i++){
	  var d={}
	  
	  var time_name = "fu"+(i+1);
	  if ( typeof this.m.time != "undefined" && typeof this.m.time[i] != "undefined" ){
	    time_name = this.m.time[i];
	  }
	  
	  d.type = "axis_v";
	  d.text = time_name;
	  d.orientation = "vert";
	  d.pos = this.graph_col[i];
	  d.time=i;
	  this.data_axis.push(d);
    }

    var height=1;
    var p=0;
    
    //ordonnée
    while((height*this.precision)>0.5){

	  var d={};
	  d.type = "axis_h";
	  d.text = -p;
	  d.orientation = "hori";
	  d.pos = this.h-this.scale_x(height*this.precision);
	  this.data_axis.push(d);
	  
	  height=height/10;
	  p++;
    }
			
    var d={};
    d.type = "axis_m";
    d.text = "";
    d.orientation = "vert";
    d.pos = this.graph_col[this.m.t];
    this.data_axis.push(d);
  
    
    for (var i=0 ; i<this.m.n_windows; i++){
      this.data_graph[i]={id : i, name :"line"+i, path : this.constructPath(i)};
    }
    
    this.data_res.push({id : this.m.n_windows, name :"resolution1", path : this.constructPathR(this.m.resolution1) });
    this.data_res.push({id : this.m.n_windows+1, name :"resolution5", path : this.constructPathR(this.m.resolution5) });

    
  this.g_axis = this.axis_container.selectAll("line").data(this.data_axis);
  this.g_axis.enter().append("line");
  this.g_axis.exit()    
    .remove();
    
  this.g_text = this.text_container.selectAll("text").data(this.data_axis);
  this.g_text.enter().append("text");
  this.g_text.exit()    
    .remove();
    
  this.g_graph = this.polyline_container.selectAll("path").data(this.data_graph);
  this.g_graph.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  this.g_graph.exit()    
    .remove();
    
  this.g_graph.append("path")
    .transition()
    .duration(500)
    .attr("fill","none")
    .attr("id", function(d) { return "poly"+d.name; })
//TODO
   // .attr("class", function(p) {  })
  this.g_graph.exit().remove();

  this.g_res = this.reso_container.selectAll("g").data(this.data_res);
  this.g_res.enter().append("svg:g")
  .attr("id", function(d) { return d.name; });
  this.g_res.exit()    
    .remove();
   
  this.g_res.append("path")
    this.g_res.exit().remove();
    
    this.resize();
  },
  
  resize : function(){
    this.resizeW = document.getElementById(this.id).offsetWidth/this.w;
    this.resizeH = document.getElementById(this.id).offsetHeight/this.h;
    
    this.vis = d3.select("#"+this.id+"_svg")
        .attr("width", document.getElementById(this.id).offsetWidth)
	.attr("height", document.getElementById(this.id).offsetHeight)
    d3.select("#"+this.id+"_back")
        .attr("width", document.getElementById(this.id).offsetWidth)
	.attr("height", document.getElementById(this.id).offsetHeight);

    this.update();
  },
  
  update : function(){
    
    this.data_res.push.path = this.constructPathR(this.m.resolution1);
    this.data_res.push.path = this.constructPathR(this.m.resolution5);
    
    for (var i=0 ; i<this.m.n_windows; i++){
      this.data_graph[i].path = this.constructPath(i);
    }
    this.draw();
  },
  
  updateElem: function (cloneID){
    this.data_graph[cloneID].path=this.constructPath(cloneID);
    this.draw();
  },
  
  draw : function(){
    self2=this;
    this.g_axis
      .transition()
      .duration(500)
      .attr("x1", function(d) { if (d.orientation=="vert") return self2.resizeW*d.pos; 
				else return 0; })
      .attr("x2", function(d) { if (d.orientation=="vert") return self2.resizeW*d.pos; 
				else return self2.resizeW*self2.w })
      .attr("y1", function(d) { if (d.orientation=="vert") return 0; 
				else return self2.resizeH*d.pos; })
      .attr("y2", function(d) { if (d.orientation=="vert") return self2.resizeH*(self2.h+20);
				else return self2.resizeH*d.pos; })
      
      .attr("stroke", colorStyle.c06)
      .attr("id", function(d) {
	if (d.class=="axis_m") return "timebar"
	  return
      });
    
    this.g_text
      .transition()
      .duration(500)
      .text( function (d) {return d.text;
      })
      .attr("fill", colorStyle.c01)
      .attr("class", function(d) { if (d.type=="axis_v") return "axis_button"; })
      .attr("id", function(d) { if (d.type=="axis_v") return ("time"+d.time); })
      .attr("y", function(d) { 
	if (d.type=="axis_h") return Math.floor(self2.resizeH*d.pos)+15;
	else return 15;
      })
      .attr("x", function(d) { 
	if (d.type=="axis_h") return 10;
	else return Math.floor(self2.resizeW*d.pos);
      });
    
    this.text_container.selectAll("text")
      .on("click", function(d){
	if (d.type=="axis_v") return self2.m.changeTime(d.time);
      })
      
    this.g_graph.selectAll("path")
    .attr("fill","none")
      .transition()
      .duration(500)
      .attr("d", function(p) {
	var che=' M '+Math.floor(p.path[0][0]*self2.resizeW)+','+Math.floor(p.path[0][1]*self2.resizeH);
	  for (var i=1; i<p.path.length; i++){
	    che+=' L '+Math.floor(p.path[i][0]*self2.resizeW)+','+Math.floor(p.path[i][1]*self2.resizeH);
	  }
	  return che;
      } )
      .attr("class", function(p) { return "graphLine2"; })//TODO change
      .attr("id", function(d) { return "poly"+d.name; })
      .attr("stroke-width","2px")
      .attr("stroke",colorStyle.c06);
      
  
    this.g_res.selectAll("path")
      .transition()
      .duration(500)
      .attr("d", function(p) {
	var che=' M '+Math.floor(p.path[0][0]*self2.resizeW)+','+Math.floor(p.path[0][1]*self2.resizeH);
	  for (var i=1; i<p.path.length; i++){
	    che+=' L '+Math.floor(p.path[i][0]*self2.resizeW)+','+Math.floor(p.path[i][1]*self2.resizeH);
	  }
	  che+=' Z ';
	  return che;
      } )
      
    this.polyline_container.selectAll("path")
    /*
      .attr("onmouseover",function(d) { return  "focusIn("+d.id+")"; } )
      .attr("onmouseout", function(d) { return  "focusOut("+d.id+")"; } )
      */
      .on("mouseover", function(d){ self2.m.focusIn(d.id); })
      .on("mouseout", function(d){ self2.m.focusOut(d.id); })
      .on("click", function(d){ self2.m.select(d.id); });
      
    initStyle();//TODO enlever
  },
  
  
/*
 * 
 */
  constructPathR : function(res){
    if (typeof res != "undefined" && res.length!=0){
      var p;
      p=[ [0, this.h] ];
      p.push([0, ( this.h - this.scale_x(res[0][this.m.r]*this.precision) ) ]);
      
      for (var i=0; i< this.graph_col.length; i++){
	  p.push([( this.graph_col[i]), ( this.h - this.scale_x(res[i][this.m.r]*this.precision))]);
      }
      p.push([this.w, ( this.h - this.scale_x(res[this.graph_col.length-1][this.m.r]*this.precision))]);
      p.push([this.w, this.h]);
      
      return p;
    }
    else return [[0,0]];
  },//fin constructPathR()

/*construit le tableau des points par laquelle la courbe d'un clone doit passer
 * 
 */
  constructPath: function(cloneID){
    t=0;
    var p;
    
    var x = this.graph_col[0];
    var y = this.scale_x(this.m.getSize(cloneID, 0)*this.precision)
    
    //cas avec un seul point de suivi
    if (this.graph_col.length==1){
      if (this.m.getSize(cloneID, 0)==0){
	p = [ ];
      }else{
	p = [[ ( x + (Math.random()*50)-125 ), ( this.h - y ) ]];
	p.push([ ( x + (Math.random()*50)+75 ), ( this.h - y ) ]);
      }
    }
    //plusieurs points de suivi
    else{
      
      //premier point de suivi 
      if (this.m.getSize(cloneID, 0)==0){
	p = [ ];
      }else{
	p =   [[ ( x - 30  ), ( this.h - y )]];
	p.push([ ( x )      , ( this.h - y )]);
      }
      
      //points suivants
      for (var i=1; i< this.graph_col.length; i++){
	x = this.graph_col[i];
	y = this.scale_x(this.m.getSize(cloneID, i)*this.precision)
	
	if (this.m.getSize(cloneID, i)==0){
	  if (p.length!=0){
	    p.push([( x ),(this.h + 30)]);
	  }
	}else{
	  //si premiere apparition du clone sur le graphique
	  if (p.length==0){
	    p.push([( x - 30 ), ( this.h - y )]);
	  }
	  p.push(  [( x ), ( this.h - y )]);
	  //si derniere apparition du clone sur le graphique
	  if (i==this.graph_col.length-1 ){
	    p.push([( x + 30 ), ( this.h - y )]);
	  }
	}
      }
    }
    return p;
  },//fin constructPath
  
}

var graph = new Graph("visu2",m);
var list = new List("listClones",m);

    
function resetGraph(){
  data_axis=[];
  data_graph=[];
  data_res=[];
  data_date=[];
  
  graph_col=[];
  precision=1;
  displayGraph(data_axis, data_graph, data_res, data_date);
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
