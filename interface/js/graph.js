/* 
 * Vidjil, V(D)J repertoire browsing and analysis
 * http://bioinfo.lifl.fr/vidjil
 * (c) 2013, Marc Duez and the Vidjil Team, Bonsai bioinfomatics (LIFL, UMR 8022 CNRS, Univ. Lille 1)
 * =====
 * This is a beta version, please use it only for test purposes.
 * This file is a part of Vidjil, and can not be copied, modified and/or distributed 
 * without the express permission of the Vidjil Team.
 *
 *
 * graph.js
 * 
 * contains only graph function and graph element
 * 
 * content:
 * 
 */


/* constructor
 * 
 * */
function Graph(id, model){
  this.id=id;
  this.m=model;		
  this.resizeW=1;	//coeff d'agrandissement/réduction largeur				
  this.resizeH=1;	//coeff d'agrandissement/réduction hauteur		
  
  this.w=1400;		//largeur graph avant resize
  this.h=450;		//hauteur graph avant resize
  
  this.marge1=50;	//marge droite bord du graph/premiere colonne
  this.marge2=50;	//marge gauche derniere colonne/bord du graph
  this.marge4=80;	//marge droite/gauche (non influencé par le resize)
  this.marge5=25;	//marge top (non influencé par le resize)
  
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
      .attr("class", "background_graph")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 2500)
      .attr("height", 2500)
      .on("click", function(){self.m.unselectAll();})
      .on("mouseover", function(){self.m.focusOut();})

    d3.select("#"+this.id+"_svg").append("svg:rect")
      .attr("id", this.id+"_back2")
      .attr("class", "background_graph2")
      .attr("x", this.marge4)
      .attr("y", 0)
      .attr("width", 2500)
      .attr("height", 2500)
      .on("click", function(){self.m.unselectAll();})
      .on("mouseover", function(){self.m.focusOut();})
      
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
      .range([0,this.h]);
    
    //abscisse
    for (var i=0 ; i<this.m.windows[0].size.length; i++){
      this.graph_col[i]=this.marge1 + 5 + i*(( this.w-(this.marge1+this.marge2) )/(this.m.windows[0].size.length-1) );
    }
    if (this.m.windows[0].size.length==1){
      this.graph_col[0]=(this.w/2)
    }
    if (this.m.windows[0].size.length==2){
      this.graph_col[0]=(this.w/4);
      this.graph_col[1]=3*(this.w/4);
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

    
    //ordonnée
    while((height*this.precision)>0.5){

      var d={};
      d.type = "axis_h";
      d.text = height.toExponential(1);
      d.orientation = "hori";
      d.pos = this.h-this.scale_x(height*this.precision);
      this.data_axis.push(d);
      
      height=height/10;
    }
			
    this.mobil={};
    this.mobil.type = "axis_m";
    this.mobil.text = "";
    this.mobil.orientation = "vert";
    this.mobil.pos = this.graph_col[this.m.t];
    this.data_axis.push(this.mobil);
  
    
    for (var i=0 ; i<this.m.n_windows; i++){
      this.data_graph[i]={id : i, name :"line"+i, path : this.constructPath(i)};
    }
    
    this.resolution1=[]
    this.resolution5=[]
    
    for (i=0; i<this.m.normalization_factor.length; i++){
		this.resolution1.push([1/this.m.reads_segmented[i], (1/this.m.reads_segmented[i])*this.m.normalization_factor[i]])
		this.resolution5.push([5/this.m.reads_segmented[i], (5/this.m.reads_segmented[i])*this.m.normalization_factor[i]])
	}
    
    this.data_res.push({id : this.m.n_windows, name :"resolution1", path : this.constructPathR(this.resolution1) });
    this.data_res.push({id : this.m.n_windows+1, name :"resolution5", path : this.constructPathR(this.resolution5) });

    
    this.g_axis = this.axis_container.selectAll("line").data(this.data_axis);
    this.g_axis.enter().append("line");
    this.g_axis.exit()    
    .remove();
    
    this.g_text = this.text_container.selectAll("text").data(this.data_axis);
    this.g_text.enter().append("text");
    this.g_text.exit()    
    .remove();
    
    this.g_graph = this.polyline_container.selectAll("path").data(this.data_graph);
    this.g_graph.enter().append("path")
      .attr("id", function(d) { return d.name; })
      .transition()
      .duration(500)
      .attr("fill","none")
      .attr("id", function(d) { return "poly"+d.name; })
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
  
/* repositionne le graphique en fonction de la taille de la div le contenant
 * 
 * */
  resize : function(){
    this.resizeW = (document.getElementById(this.id).offsetWidth-(this.marge4))/this.w;
    this.resizeH = (document.getElementById(this.id).offsetHeight-this.marge5)/this.h;
    
    this.vis = d3.select("#"+this.id+"_svg")
      .attr("width", document.getElementById(this.id).offsetWidth)
      .attr("height", document.getElementById(this.id).offsetHeight)
    d3.select("#"+this.id+"_back")
      .attr("width", document.getElementById(this.id).offsetWidth)
      .attr("height", document.getElementById(this.id).offsetHeight);
    d3.select("#"+this.id+"_back2")
      .attr("width", document.getElementById(this.id).offsetWidth-(this.marge4))
      .attr("height", document.getElementById(this.id).offsetHeight);

    this.update();
  },
  
/* update l'intégralité du graphique
 * 
 * */
  update : function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
		
    if(this.m.focus!=-1){
      var line = document.getElementById("polyline"+this.m.focus);
      document.getElementById("polyline_container").appendChild(line);
    }
    this.data_res[0].path = this.constructPathR(this.resolution1);
    this.data_res[1].path = this.constructPathR(this.resolution5);
    
    for (var i=0 ; i<this.m.n_windows; i++){
      for (var j=0 ; j<this.m.clones[i].cluster.length; j++)
	this.data_graph[this.m.clones[i].cluster[j]].path = this.constructPath(i);
    }
    this.mobil.pos = this.graph_col[this.m.t];
    this.draw();
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update Graph: " +elapsedTime +"ms");  
  },

/*update la liste de clones passé en parametre
 * 
 * */  
  updateElem: function (list){
    if(this.m.focus!=-1){
      var line = document.getElementById("polyline"+this.m.focus);
      document.getElementById("polyline_container").appendChild(line);
    }
    for (var i=0; i<list.length ; i++){
      for (var j=0 ; j<this.m.clones[list[i]].cluster.length; j++)
	if (this.m.windows[list[i]].active)
      	this.data_graph[this.m.clones[list[i]].cluster[j]].path = this.constructPath(list[i]);
    }
    this.drawElem(list);
  },
  
/* 
 * 
 * */ 
  drawElem : function(list){

    for (var i=0; i<list.length ; i++){
      
      var che=' M '+Math.floor(this.data_graph[list[i]].path[0][0]*this.resizeW+this.marge4)+','+Math.floor(this.data_graph[list[i]].path[0][1]*this.resizeH+this.marge5);
      for (var j=1; j<this.data_graph[list[i]].path.length; j++){
	      che+=' L '+Math.floor(this.data_graph[list[i]].path[j][0]*this.resizeW+this.marge4)+','+Math.floor(this.data_graph[list[i]].path[j][1]*this.resizeH+this.marge5);
      }
      var name="poly"+this.data_graph[list[i]].name;
      
      var classname="graph_line";
      if (!this.m.windows[this.data_graph[list[i]].id].active) classname = "graph_inactive";
      //if (this.m.windows[this.data_graph[list[i]].id].top >10) classname = "graph_inactive";
      if (this.m.windows[this.data_graph[list[i]].id].select) classname = "graph_select";
      if (this.data_graph[list[i]].id==this.m.focus) classname = "graph_focus";
      
      d3.select("#polyline"+list[i])
      .attr("fill","none")
      .attr("stroke", this.m.windows[list[i]].color )
	.transition()
	.duration(500)
	.attr("d", che)
	.attr("class", classname)
	.attr("id", name)
    }
  },

/* reconstruit le graphique
 * 
 * */ 
  draw : function(){
    var self=this;
		
    //axes
    this.g_axis
      .transition()
      .duration(500)
      .attr("x1", function(d) { if (d.orientation=="vert") return self.resizeW*d.pos+self.marge4; 
				else return self.marge4; })
      .attr("x2", function(d) { if (d.orientation=="vert") return self.resizeW*d.pos+self.marge4; 
				else return (self.resizeW*self.w)+self.marge4 })
      .attr("y1", function(d) { if (d.orientation=="vert") return self.marge5; 
				else return (self.resizeH*d.pos)+self.marge5; })
      .attr("y2", function(d) { if (d.orientation=="vert") return (self.resizeH*self.h)+self.marge5; 
				else return (self.resizeH*d.pos)+self.marge5; })
      .attr("class", function(d) { return d.type })
      .attr("id", function(d) { if (d.type=="axis_m") return "timebar"
				return});

    //legendes
    this.g_text
      .transition()
      .duration(500)
      .text( function (d) {return d.text;
      })
      .attr("class", function(d) { 
	if (d.type=="axis_v") return "axis_button"; 
	if (d.type=="axis_h") return "axis_leg"; 
      })
      .attr("id", function(d) { if (d.type=="axis_v") return ("time"+d.time); })
      .attr("y", function(d) { 
	if (d.type=="axis_h") return Math.floor(self.resizeH*d.pos)+self.marge5;
	else return 15;
      })
      .attr("x", function(d) { 
	if (d.type=="axis_h") return 40;
	else return Math.floor(self.resizeW*d.pos+self.marge4);
      })
      .attr("class", function(d) { 
	if (d.type=="axis_v") return "graph_time"
	else return "graph_text";
      });
    
    this.text_container.selectAll("text")
      .on("click", function(d){
	if (d.type=="axis_v") return self.m.changeTime(d.time);
      })
      
    //courbes
    this.g_graph
    .attr("fill","none")
    .attr("stroke", function(d) { return self.m.windows[d.id].color; })
      .transition()
      .duration(500)
      .attr("d", function(p) {
	var che=' M '+Math.floor(p.path[0][0]*self.resizeW+self.marge4)+','+Math.floor(p.path[0][1]*self.resizeH+self.marge5);
	for (var i=1; i<p.path.length; i++){
		che+=' L '+Math.floor(p.path[i][0]*self.resizeW+self.marge4)+','+Math.floor(p.path[i][1]*self.resizeH+self.marge5);
	}
	return che;
      })
      .attr("class", function(p) { 
	if (!self.m.windows[p.id].active) return "graph_inactive";
	//if (self.m.windows[p.id].top > 10) return "graph_inactive";
	if (self.m.windows[p.id].select) return "graph_select";
	if (p.id==self.m.focus)return "graph_focus";
	return "graph_line"; 
       })
      .attr("id", function(d) { return "poly"+d.name; })
      
    //resolution
    this.g_res.selectAll("path")
      .transition()
      .duration(500)
      .attr("d", function(p) {
	var che=' M '+Math.floor(p.path[0][0]*self.resizeW+self.marge4)+','+Math.floor(p.path[0][1]*self.resizeH+self.marge5);
	for (var i=1; i<p.path.length; i++){
	che+=' L '+Math.floor(p.path[i][0]*self.resizeW+self.marge4)+','+Math.floor(p.path[i][1]*self.resizeH+self.marge5);
	}
	che+=' Z ';
	return che;
      })
      
    this.polyline_container.selectAll("path")
      .on("mouseover", function(d){ self.m.focusIn(d.id); })
      .on("click", function(d){ self.m.select(d.id); });
  },
  
  
/* construit le tableau des points par laquelle la courbe de résolution doit passer
 * 
 * */
  constructPathR : function(res){
    if (typeof res != "undefined" && res.length!=0){
      var p;
      p=[ [0, this.h+100] ];
	  
	  var r=0;
	  if (this.m.norm==true)
		  r=1;
      p.push([0, ( this.h - this.scale_x(res[0][r]*this.precision) ) ]);
      
      for (var i=0; i< this.graph_col.length; i++){
	  p.push([( this.graph_col[i]), ( this.h - this.scale_x(res[i][r]*this.precision))]);
      }
      p.push([this.w, ( this.h - this.scale_x(res[this.graph_col.length-1][r]*this.precision))]);
      p.push([this.w, this.h+100]);
      
      return p;
    }
    else return [[0,0]];
  },//fin constructPathR()

/* construit le tableau des points par laquelle la courbe d'un clone doit passer
 * 
 * */
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
  
}//fin Graph

  
