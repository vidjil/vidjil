
// SCATTERPLOT

function ScatterPlot(id, model){
  this.id=id;			//ID de la div contenant le scatterPlot
  this.m=model;			//objet Model utilisé 
  this.resizeCoef=1;		//coef d'agrandissement a appliquer aux rayons des elements
  this.resizeW=1;		//coef d'agrandissement largeur
  this.resizeH=1;		//coef d'agrandissement hauteur
  
  this.w=1400;			//largeur avant resize
  this.h=700;			//hauteur avant resize
  
  this.marge_left=100;		//marge 
  this.marge_top=30;		//
  this.max_precision=9;		//precision max atteignable ( 10^-8 par defaut TODO compute)
  
  this.positionGene={};		//position
  this.positionAllele={};	//
  
  this.splitMethod="gene";	//methode de répartition actuelle(defaut: gene)
  
  this.m.view.push(this);	//synchronisation au Model
  
}

ScatterPlot.prototype = {
  
/* crée le cadre svg pour le scatterplot
 * 
 * */
  init :function() {
    console.log("ScatterPlot "+this.id+": init()");
    self = this;
    
    document.getElementById(this.id).innerHTML="";
    
    //création de la fenetre SVG
    this.vis = d3.select("#"+this.id).append("svg:svg")
    .attr("id", this.id+"_svg");

    //création de l'arriere plan
    d3.select("#"+this.id+"_svg").append("svg:rect")
      .attr("id", this.id+"_back")
      .attr("class", "background_sp")
      .attr("x", 0)
      .attr("y", 0)
      .on("click", function(){self.m.unselectAll();})
      .on("mouseover", function(){self.m.focusOut();})
      
      
    this.axis_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_axis_container")
      
    this.plot_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_plot_container")
    
    this.bar_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_bar_container")
      
    //initialisation des nodes
    this.nodes = d3.range(this.m.n_windows).map(Object);
    for(var i=0 ;i<this.m.n_windows; i++){
	this.nodes[i].id = i;
	this.nodes[i].r1 = 5;
	this.nodes[i].r2 = 5;
      }
    
    //initialisation moteur physique D3
    this.force = d3.layout.force()
      .gravity(0)
      .theta(0) //0.8
      .charge(0) //-1
      .friction(0.9)
      .nodes(this.nodes)
      .on("tick", this.tick.bind(this))
      .size([this.w, this.h]);
      
    //création d'un element SVG pour chaque nodes
    this.node = this.plot_container.selectAll("circle").data(this.nodes)
    this.node.enter().append("svg:circle");
    this.node.exit()    
      .remove()
    this.plot_container.selectAll("circle")
      .attr("stroke-width", 4) 
      .attr("stroke", "")
      .attr("id", function(d) { return "circle"+d.id; })
      .attr("class", function(p) { 
	if (!self.m.clones[p.id].active) return "circle_inactive";
	  if (self.m.clones[p.id].select) return "circle_select";
	  if (p.id==self.m.focus) return "circle_focus";
	  return "circle"; 
       })
      .call(this.force.drag)
      .on("mouseover",function(d) { self.m.focusIn(d.id); } )
      .on("click", function(d) { self.m.select(d.id);})
    
    this.initGridModel();
    this.resize();
  },
  
  initBar :function() {
    self = this;
   
    //création d'un element SVG pour chaque nodes
    this.bar = this.bar_container.selectAll("rect").data(this.nodes)
    this.bar.enter().append("svg:rect");
    this.bar.exit()    
      .remove()
    this.bar_container.selectAll("rect")
      .attr("id", function(d) { return "bar"+d.id; })
      .attr("width", 30)
      .attr("x", function(d) { 
	var geneV="undef";
	if ( typeof(self.m.windows[d.id].seg) != 'undefined' 
	&& typeof(self.m.windows[d.id].seg.V) != 'undefined' ){
	  var geneV=self.m.windows[d.id].seg.V[0];
	  return self.positionGene[geneV]*self.resizeW-15+self.marge_left;
	}else{
	  return self.positionGene["undefined V"]*self.resizeW-15+self.marge_left;
	}
      })
      .attr("height", 50 )
      .attr("y", (this.h*self.resizeH)+self.marge_top )
      .attr("fill", function(d) { return (self.m.clones[d].color); })
      .on("mouseover",function(d) { self.m.focusIn(d.id); } )
      .on("click", function(d) { self.m.select(d.id);})
  },
  
  updateBar :function(){
    self=this
    
    this.vKey = Object.keys(this.m.germline.vgene);
    this.vKey.push("undefined V");
    this.bar_v={};
    this.bar_max=0;
    
    this.bar_width = 0.5*((this.w) / (this.vKey.length))

    //init
    for ( var i=0 ; i< this.vKey.length; i++){
      this.bar_v[this.vKey[i]]={}
      this.bar_v[this.vKey[i]].clones=[];
      this.bar_v[this.vKey[i]].totalSize=0;
      this.bar_v[this.vKey[i]].currentSize=0;
    }
    
    //classement des clones suivant leurs gene V
    for ( var i=0 ; i< this.m.n_windows; i++){
      if (this.m.clones[i].active){
	var geneV= this.m.getV(i);
	var clone={id: i}
	this.bar_v[geneV].clones.push(clone);
	this.bar_v[geneV].totalSize+=this.m.getSize(i);
      }
    }
    
    //trie des clones par J
    for ( var i=0 ; i< this.vKey.length; i++){
      if (this.bar_v[this.vKey[i]].totalSize>this.bar_max)
	this.bar_max=this.bar_v[this.vKey[i]].totalSize;
      this.bar_v[this.vKey[i]].clones.sort(function(a,b){
	var ja=self.m.getJ(a.id);
	var jb=self.m.getJ(b.id);
	return jb-ja
      });
    }
    
    //calculs des positions 
    for ( var i=0 ; i< this.vKey.length; i++){
      var somme=0;
      for ( var j=0 ; j<this.bar_v[this.vKey[i]].clones.length ; j++){
	somme+=this.getBarHeight(this.bar_v[this.vKey[i]].clones[j].id);
	this.bar_v[this.vKey[i]].clones[j].pos=this.h-somme;
      }
    }
    
    //grid
    for ( var i=0 ; i< this.gridModel["bar"].length; i++){
      if (this.gridModel["bar"][i].orientation=="hori"){
	var value=this.gridModel["bar"][i].value/100;
	this.gridModel["bar"][i].pos=this.h-(this.h*(value/this.bar_max));
	if (value>this.bar_max){
	  this.gridModel["bar"][i].type = "subline";
	  this.gridModel["bar"][i].text = ""
	}else{
	  this.gridModel["bar"][i].type = "line";
	  this.gridModel["bar"][i].text = Math.floor(value*100) + " %"
	}
      }
    }
    
    //redraw
    this.bar = this.bar_container.selectAll("rect").data(this.nodes)
    this.bar_container.selectAll("rect")
      .transition()
      .duration(500)
      .attr("id", function(d) { return "bar"+d.id; })
      .attr("width", this.bar_width)
      .attr("x", function(d) { 
	var geneV="undef";
	if ( typeof(self.m.windows[d.id].seg) != 'undefined' 
	&& typeof(self.m.windows[d.id].seg.V) != 'undefined' ){
	  var geneV=self.m.windows[d.id].seg.V[0];
	  return self.positionGene[geneV]*self.resizeW-(self.bar_width/2)+self.marge_left; 
	}else{
	  return self.positionGene["undefined V"]*self.resizeW-(self.bar_width/2)+self.marge_left;
	}
      })
      .attr("height", function(d) { return self.getBarHeight(d)*self.resizeH; })
      .attr("y", function(d) { return (self.getBarPosition(d)*self.resizeH)+self.marge_top; })
      .attr("fill", function(d) { return (self.m.clones[d].color); })
      .attr("class", function(p) { 
	if (!self.m.clones[p.id].active) return "circle_hidden";
	if (self.m.clones[p.id].select) return "circle_select";
	if (p.id==self.m.focus) return "circle_focus";
	return "circle"; 
      })

  },
  
  getBarHeight : function(cloneID){
    var size= this.m.getSize(cloneID);
    return this.h*(size/this.bar_max);
  },
  
  getBarPosition : function(cloneID){
    for ( var i=0 ; i< this.vKey.length; i++){
      for ( var j=0 ; j<this.bar_v[this.vKey[i]].clones.length ;j++){
	if(this.bar_v[this.vKey[i]].clones[j].id==cloneID)
	return this.bar_v[this.vKey[i]].clones[j].pos;
      }
    }
  },
/* recalcul les coefs d'agrandissement/réduction en fonction de la taille de la div
 * 
 * */
  resize :function(){
    this.resizeW = (document.getElementById(this.id).offsetWidth-this.marge_left)/this.w;
    this.resizeH = (document.getElementById(this.id).offsetHeight-this.marge_top)/this.h;
    this.resizeCoef = Math.sqrt(this.resizeW*this.resizeH);
    
    this.vis = d3.select("#"+this.id+"_svg")
      .attr("width", document.getElementById(this.id).offsetWidth)	
      .attr("height", document.getElementById(this.id).offsetHeight)
    d3.select("#"+this.id+"_back")
      .attr("width", document.getElementById(this.id).offsetWidth)
      .attr("height", document.getElementById(this.id).offsetHeight);
    
    this.initGrid();
    this.update();
  },

/* précalcul les grilles de répartition du scatterPlot 
 * 
 * */
  initGridModel : function(){
    this.gridModel={};
    
    //VJ gridModel
    this.gridModel["allele"]=[];
    this.gridModel["gene"]=[];
    this.gridModel["Size"]=[];
    this.gridModel["nSize"]=[];
    this.gridModel["bar"]=[];
    
    var vKey = Object.keys(this.m.germline.v);
    var vKey2 = Object.keys(this.m.germline.vgene);
    var stepV = (this.w) / (vKey2.length+1)
    
    var jKey = Object.keys(this.m.germline.j);
    var jKey2 = Object.keys(this.m.germline.jgene);
    var stepJ = (this.h) / (jKey2.length+1)
    
    // V allele
    for (var i=0; i<vKey.length; i++){
      var d={},d2={};
      var elem=vKey[i].split('*');
      
      d.type = "subline";
      d.orientation = "vert";
      d.pos = (this.m.germline.v[vKey[i]].gene)*stepV +
	      (this.m.germline.v[vKey[i]].allele+0.5) * (stepV/(this.m.germline.vgene[elem[0]].n ));
      d.text="*"+elem[1];
      d.geneColor=this.m.germline.v[vKey[i]].color;
      
      d2.type = "subline";
      d2.orientation = "vert";
      d2.pos= (this.m.germline.v[vKey[i]].gene+0.5)*stepV;
      d2.text=" ";
      d2.geneColor=this.m.germline.v[vKey[i]].color;
      
      this.positionAllele[vKey[i]]=d.pos;
      this.positionGene[vKey[i]]=d2.pos
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d2);
      this.gridModel["Size"].push(d2);
      this.gridModel["nSize"].push(d2);
      this.gridModel["bar"].push(d2);
    }
    
    // V gene
    for (var i=0; i < vKey2.length; i++){
      var d={};
      d.type = "line";
      d.orientation = "vert";
      d.pos = (i+0.5)*stepV;
      d.text=vKey2[i];
      d.geneColor=this.m.germline.vgene[vKey2[i]].color;
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d);
      this.gridModel["Size"].push(d);
      this.gridModel["nSize"].push(d);
      this.gridModel["bar"].push(d);
    }
    var d={};
    d.type = "line";
    d.orientation = "vert";
    d.pos = (vKey2.length+0.5)*stepV;
    d.text="undefined V"
    
    this.gridModel["allele"].push(d);
    this.gridModel["gene"].push(d);
    this.gridModel["Size"].push(d);
    this.gridModel["nSize"].push(d);
    this.gridModel["bar"].push(d);
    this.positionGene["undefined V"]=d.pos;
    this.positionAllele["undefined V"]=d.pos
    
    
    //J allele
    for (var i=0; i<jKey.length; i++){
      var d={},d2={};
      var elem=jKey[i].split('*');
      d.type = "subline";
      d.orientation = "hori";
      d.pos = (this.m.germline.j[jKey[i]].gene)*stepJ +
	      (this.m.germline.j[jKey[i]].allele+0.5) * (stepJ/(this.m.germline.jgene[elem[0]].n ));
      d.text="*"+elem[1];
      d.geneColor=this.m.germline.j[jKey[i]].color;
      
      d2.type="subline";
      d2.orientation= "hori";
      d2.pos = (this.m.germline.j[jKey[i]].gene+0.5)*stepJ;
      d2.text=" ";
      d2.geneColor=this.m.germline.j[jKey[i]].color;
      
      this.positionAllele[jKey[i]]=d.pos;
      this.positionGene[jKey[i]]=d2.pos
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d2);
    }
    
    //J gene
    for (var i=0; i < jKey2.length; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = (i+0.5)*stepJ;
      d.text=jKey2[i];
      d.geneColor=this.m.germline.jgene[jKey2[i]].color;
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d);
    }
    d={};
    d.type = "line";
    d.orientation = "hori";
    d.pos = (jKey2.length+0.5)*stepJ;
    d.text="undefined J"
    
    this.gridModel["allele"].push(d);
    this.gridModel["gene"].push(d);
    this.positionGene["undefined J"]=d.pos
    this.positionAllele["undefined J"]=d.pos
    
    //N_size
    for (var i=0 ;i<=(Math.floor(this.m.n_max/5)) ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = (1-((i*5)/this.m.n_max))*(this.h-(2*this.marge_top));
      d.text=i*5;
      this.gridModel["nSize"].push(d);
    }
    
    //size 
    this.sizeScale = d3.scale.log()
      .domain([this.m.min_size,1])
      .range([(this.h-this.marge_top),this.marge_top]);
    var height=1;
    
    for (var i=0 ;i<this.max_precision ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = this.sizeScale(height); 
      d.text= height.toExponential(1);;
      this.gridModel["Size"].push(d);
      height=height/10;
    }
    
    //bar
    for (var i=0 ;i<20 ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = 0
      d.value=i*5;
      this.gridModel["bar"].push(d);
    }
 
  },
  
/* calcul d'une étape d'animation
 * 
 * */
  tick : function(){
    self=this;
    //mise a jour des rayons( maj progressive )
    this.node.each(this.updateRadius());
    //élimine les valeurs NaN ou infinity pouvant apparaitre
    this.node.each(this.debugNaN());
    //deplace le node vers son objectif
    this.node.each(this.move());
    //résolution des collisions
    this.node.each(this.collide());
    //élimine les valeurs NaN ou infinity pouvant apparaitre
    this.node.each(this.debugNaN())
    //attribution des nouvelles positions/tailles
      .attr("cx", function(d) { return (d.x+self.marge_left); })
      .attr("cy", function(d) { return (d.y+self.marge_top); })
      .attr("r" , function(d) { return (d.r2); })
  },

/* déplace les nodes en fonction de la méthode de répartition actuelle
 * 
 * */
  move : function(){
    self =this;
    return function(d) {
      var coef = 0.005;		//
      var coef2 = 0.01;		//force d'attraction
      var coef3 = 0.0015;	//
      var geneV="undefined V";
      var geneJ="undefined J";
      if ( typeof(self.m.windows[d.id].seg) != 'undefined' 
       && typeof(self.m.windows[d.id].seg.V) != 'undefined' ){
      var geneV=self.m.windows[d.id].seg.V[0];
      var geneJ=self.m.windows[d.id].seg.J[0];
      }

    switch(self.splitMethod){ 
    case "bar": 
      d.x+=coef*((self.positionGene[geneV]*self.resizeW)-d.x);
      d.y+=coef*((self.h)-d.y);
      break;
    case "gene": 
      d.x+=coef*((self.positionGene[geneV]*self.resizeW)-d.x);
      d.y+=coef*((self.positionGene[geneJ]*self.resizeH)-d.y);
      break;
    case "allele": 
      d.x+=coef*((self.positionAllele[geneV]*self.resizeW)-d.x);
      d.y+=coef*((self.positionAllele[geneJ]*self.resizeH)-d.y);
      break;
    case "Size": 
      d.x+=coef3*((self.positionGene[geneV]*self.resizeW)-d.x);
      if (d.r1!=0){
	d.y+=coef2*(self.sizeScale(self.m.getSize(d.id))*self.resizeH - d.y);
      }else{
	d.y+=coef2*(self.h*self.resizeH-d.y);
      }
    break; 
    case "nSize": 
      d.x+=coef3*((self.positionGene[geneV]*self.resizeW)-d.x);
      if ( typeof(self.m.windows[d.id].seg) != 'undefined' 
      && typeof(self.m.windows[d.id].seg.V) != 'undefined' ){
	if (self.m.windows[d.id].seg.N!=-1){
	  d.y+=coef2*((self.marge_top + (1-(self.m.windows[d.id].seg.Nsize/self.m.n_max))*(self.h-(2*self.marge_top)))*self.resizeH -d.y  );
	}else{
	  d.y+=coef2*((self.h*self.resizeH)-d.y);
	}
      }else{
	d.y+=coef2*((self.h*self.resizeH)-d.y);
      }
      break; 
      }
    }
  },
  
  
/* 
 * r2 = rayon affiché // r1 rayon a atteindre
 * */
  updateRadius : function(){
    return function(d) {
      if( d.r1 != d.r2){
	var delta = d.r1-d.r2;
	d.r2 +=0.03*delta;
      }
    }
  },
  
/* repositionne les nodes ayant des positions impossible a afficher
 * 
 * */
  debugNaN : function(){
    return function(d) {
      if (!isFinite(d.x)){
	d.x=Math.random()*500;
	console.log("debug NaN x circle"+ d.id );
      }
      if (!isFinite(d.y)){
	d.y=Math.random()*500;
	console.log("debug NaN y circle"+ d.id );
      }
    }
  },
  
/* résolution des collisions
 * 
 * */
  collide : function(){
    var quadtree = d3.geom.quadtree(this.nodes);
    self=this;
    return function(d) {
    if (d.drag != 1 && d.r1 !=0){
      var r = self.nodes[d.id].r2+1,
      nx1 = d.x - r,
      nx2 = d.x + r,
      ny1 = d.y - r,
      ny2 = d.y + r;
      quadtree.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d) && quad.point.r1!=0) {
	  var x = d.x - quad.point.x,
	  y = d.y - quad.point.y,
	  l = Math.sqrt(x * x + y * y),
	  r = self.nodes[d.id].r2 + self.nodes[quad.point].r2+1;
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
    }
    };
  },
  
/* retourne le rayon que devrait avoir le node nodeID
 * 
 * */
  getRadius : function(nodeID){
    var size=this.m.getSize(nodeID);
    if (size==0) return 0;
    return this.resizeCoef*Math.pow(80000*(size+0.002),(1/3) );
  },

/* update les données du scatterPlot et relance une sequence d'animation
 * 
 * */
  update : function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
    
    if (this.splitMethod=="bar"){
      this.updateBar();
    }else{
    
      for(var i=0; i < this.nodes.length; i++){
	this.nodes[i].r1=this.getRadius(i);
      }
      this.force.start();
      this.updateStyle();
    }
    
    this.initGrid();
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update sp: " +elapsedTime +"ms");  
  },


/* update les données liées au clones
 * (ne relance pas l'animation)
 * */
  updateElem : function(list){
    if (this.splitMethod=="bar"){
      this.updateBar();
    }else{
      for (var i = 0 ; i<list.length; i++){
	this.nodes[list[i]].r1=this.getRadius(list[i]);
      }
      this.updateStyle();
    }
  },
	
/* update l'apparence liée a l'état (focus/select/inactive) des nodes
 * (ne relance pas l'animation) 
 * */
  updateStyle : function(){	 
    var self=this;
    this.node
      .attr("class", function(p) { 
	if (!self.m.clones[p.id].active) return "circle_inactive";
	if (self.m.clones[p.id].select) return "circle_select";
	if (p.id==self.m.focus) return "circle_focus";
	return "circle"; 
      })
      .attr("fill", function(d) { return (self.m.clones[d].color); })
  },
  
/* applique la grille correspondant a la methode de répartition définit dans this.splitMethod
 * 
 * */
  initGrid : function(){
  self = this;

  //LEGENDE
  
  leg = this.axis_container.selectAll("text").data(this.gridModel[this.splitMethod]);
  leg.enter().append("text");
  leg.exit()
    .remove();
  leg
    .transition()
    .duration(1000)
    .attr("x", function(d) { 
      if (d.orientation=="vert") { return self.resizeW*d.pos+self.marge_left;
      }else{
	if ( d.type=="subline" ) return 80;
	else return 40; 
      }
    })
    .attr("y", function(d) { 
      if (d.orientation=="vert") { 
      if ( d.type=="subline" ) return 25
      else return 12;
      }else{ return self.resizeH*d.pos+3+self.marge_top;}
    })
    .text( function (d) { return d.text; })
    .attr("class", "sp_legend")
    .style("fill", function (d) { 
      if (self.m.colorMethod=="V" && d.orientation=="vert" && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && d.orientation=="hori" && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      return null;
    })
    ;
  
  //AXIS
  lines = this.axis_container.selectAll("line").data(this.gridModel[this.splitMethod]);
  lines.enter().append("line");
  lines.exit()    
    .remove();
  lines
    .transition()
    .duration(1000)
    .attr("x1", function(d) { 
      if (d.orientation=="vert") return self.resizeW*d.pos+self.marge_left;
      else return self.marge_left
    })
    .attr("x2", function(d) { 
      if (d.orientation=="vert") return self.resizeW*d.pos+self.marge_left;
      else return self.resizeW*self.w+self.marge_left;
    })
    .attr("y1", function(d) {      
      if (d.orientation=="vert") return self.marge_top;
      else return self.resizeH*d.pos+self.marge_top;
    })
    .attr("y2", function(d) { 
      if (d.orientation=="vert") return self.resizeH*self.h+self.marge_top;
      else return self.resizeH*d.pos+self.marge_top;
    })
    .style("stroke", function (d) { 
      return null ; 
    })
    .attr("class", function (d) { 
      if (d.type=="subline"){
	if (self.splitMethod!="allele") return "sp_subline_hidden";
	return "sp_subline"; 
      }
      return "sp_line"; 
    })
    .style("stroke", function (d) { 
      if (self.m.colorMethod=="V" && d.orientation=="vert" && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && d.orientation=="hori" && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      return null;
    });
  },

/* change la méthode de répartition du scatterPlot
 * 
 * */
  changeSplitMethod :function(splitM){
    if (splitM=="bar" && splitM!=this.splitMethod){
      this.endPlot();
      this.initBar();
    }
    
    if (splitM!="bar" && this.splitMethod=="bar"){
      this.endBar();
    }
    
    this.splitMethod=splitM;
    this.update();
  },

  endPlot : function(){
    var self=this;
    this.node
      .transition()
      .duration(500)
      .attr("class", function(p) { 
	return "circle_hidden"; 
      })
    this.force.start()
  },
  
  endBar : function(){
    this.initBar();
    var self=this;
    this.bar_container.selectAll("rect")
      .transition()
      .duration(500)
      .attr("class", function(p) { 
	return "circle_hidden"; 
      })
  }
  
}


