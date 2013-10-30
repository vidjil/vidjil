
// SCATTERPLOT

function ScatterPlot(id, model){
  this.id=id;			//ID de la div contenant le scatterPlot
  this.m=model;			//objet Model utilisé 
  this.resizeCoef=1;		//coef d'agrandissement a appliquer aux rayons des elements
  this.resizeW=1;		//coef d'agrandissement largeur
  this.resizeH=1;		//coef d'agrandissement hauteur
  
  this.w=1400;			//largeur avant resize
  this.h=700;			//hauteur avant resize
  
  this.marge_left=80;		//marge 
  this.marge_top=50;		//
  this.max_precision=8;		//precision max atteignable ( 10^-8 par defaut TODO compute)
  
  this.positionGene={};		//position
  this.positionAllele={};	//
  
  this.splitMethod="gene";	//methode de répartition actuelle(defaut: gene)
  
  this.m.view.push(this);	//synchronisation au Model
  
}

ScatterPlot.prototype = {
  
/* crée le cadre svg pour le scatterplot
 * l
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
    this.node = this.vis.selectAll("circle").data(this.nodes)
    this.node.enter().append("svg:circle");
    this.node.exit()    
      .remove()
    this.vis.selectAll("circle")
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
    this.update()
  },
  
/* recalcul les coefs d'agrandissement/réduction en fonction de la taille de la div
 * 
 * */
  resize :function(){
    this.resizeW = document.getElementById(this.id).offsetWidth/this.w;
    this.resizeH = document.getElementById(this.id).offsetHeight/this.h;
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
    
    var vKey = Object.keys(this.m.germline.v);
    var vKey2 = Object.keys(this.m.germline.vgene);
    var stepV = (this.w-this.marge_left) / vKey2.length
    
    var jKey = Object.keys(this.m.germline.j);
    var jKey2 = Object.keys(this.m.germline.jgene);
    var stepJ = (this.h-this.marge_top) / jKey2.length
    
    // V allele
    for (var i=0; i<vKey.length; i++){
      var d={},d2={};
      var elem=vKey[i].split('*');
      
      d.type = "subline";
      d.orientation = "vert";
      d.pos = this.marge_left + 
	      (this.m.germline.v[vKey[i]].gene)*stepV +
	      (this.m.germline.v[vKey[i]].allele+0.5) * (stepV/(this.m.germline.vgene[elem[0]]));
      d.text=elem[1];
      
      d2.type = "subline";
      d2.orientation = "vert";
      d2.pos= this.marge_left + 
	      (this.m.germline.v[vKey[i]].gene+0.5)*stepV;
      d2.text=" ";
      
      this.positionAllele[vKey[i]]=d.pos;
      this.positionGene[vKey[i]]=d2.pos
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d2);
      this.gridModel["Size"].push(d2);
      this.gridModel["nSize"].push(d2);
    }
    
    // V gene
    for (var i=0; i < vKey2.length; i++){
      var d={};
      d.type = "line";
      d.orientation = "vert";
      d.pos = this.marge_left + (i+0.5)*stepV;
      d.text=vKey2[i];
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d);
      this.gridModel["Size"].push(d);
      this.gridModel["nSize"].push(d);
    }
    
    //J allele
    for (var i=0; i<jKey.length; i++){
      var d={},d2={};
      var elem=jKey[i].split('*');
      d.type = "subline";
      d.orientation = "hori";
      d.pos = this.marge_top + 
	      (this.m.germline.j[jKey[i]].gene)*stepJ +
	      (this.m.germline.j[jKey[i]].allele+0.5) * (stepJ/(this.m.germline.jgene[elem[0]]));
      d.text=elem[1];
      
      d2.type="subline";
      d2.orientation= "hori";
      d2.pos = this.marge_top + 
	      (this.m.germline.j[jKey[i]].gene+0.5)*stepJ;
      d2.text=" ";
      
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
      d.pos = this.marge_top + (i+0.5)*stepJ;
      d.text=jKey2[i];
      
      this.gridModel["allele"].push(d);
      this.gridModel["gene"].push(d);
    }
    
    //N_size
    for (var i=0 ;i<=(Math.floor(this.m.n_max/5)) ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = this.marge_top + (1-((i*5)/this.m.n_max))*(this.h-(2*this.marge_top));
      d.text=i*5;
      this.gridModel["nSize"].push(d);
    }
    
    //size 
    this.sizeScale = d3.scale.log()
      .domain([this.m.min_size,1])
      .range([(this.h-this.marge_top),this.marge_top]);
    var height=100;
    
    for (var i=0 ;i<this.max_precision ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = this.sizeScale(height/100); 
      d.text= height+"%";
      this.gridModel["Size"].push(d);
      height=height/10;
    }
 
  },
  
/* calcul d'une étape d'animation
 * 
 * */
  tick : function(){
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
      .attr("cx", function(d) { return (d.x); })
      .attr("cy", function(d) { return (d.y); })
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
      var coef3 = 0.001;	//
      if ( typeof(self.m.windows[d.id].seg) != 'undefined' 
       && typeof(self.m.windows[d.id].seg.V) != 'undefined' ){
      var geneV=self.m.windows[d.id].seg.V[0];
      var geneJ=self.m.windows[d.id].seg.J[0];

      switch(self.splitMethod){ 
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
	if (self.m.windows[d.id].seg.N!=-1){
	  d.y+=coef2*((self.marge_top + (1-(self.m.windows[d.id].seg.Nsize/self.m.n_max))*(self.h-(2*self.marge_top)))*self.resizeH -d.y  );
	}else{
	  d.y+=coef2*((h*resizeH)-d.y);
	}
      break; 
      }

      }else{
	d.x+=coef*((50)-d.x);
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
    for(var i=0; i < this.nodes.length; i++){
      this.nodes[i].r1=this.getRadius(i);
    }
    this.force.start();
		this.updateStyle();
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update sp: " +elapsedTime +"ms");  
  },


/* update les données liées au clones
 * (ne relance pas l'animation)
 * */
  updateElem : function(list){
    for (var i = 0 ; i<list.length; i++){
      this.nodes[list[i]].r1=this.getRadius(list[i]);
    }
    this.updateStyle();
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
  leg = this.vis.selectAll("text").data(this.gridModel[this.splitMethod]);
  leg.enter().append("text");
  leg.exit()
    .remove();
  leg
    .transition()
    .duration(1000)
    .attr("x", function(d) { 
      if (d.orientation=="vert") { return self.resizeW*d.pos;
      }else{
	if ( d.type=="subline" ) return self.resizeW*75;
	else return self.resizeW*30; 
      }
    })
    .attr("y", function(d) { 
      if (d.orientation=="vert") { 
      if ( d.type=="subline" ) return self.resizeH*40
      else return self.resizeH*20;
      }else{ return self.resizeH*d.pos;}
    })
    .text( function (d) { return d.text; })
    .attr("class", "sp_legend")
    /*.style("fill", function (d) { 
      if (self.m.colorMethod=="V" && d.orientation=="vert") return "" ; 
      return null;
    })*///TODO
    ;
  
  //AXIS
  lines = this.vis.selectAll("line").data(this.gridModel[this.splitMethod]);
  lines.enter().append("line");
  lines.exit()    
    .remove();
  lines
    .transition()
    .duration(1000)
    .attr("x1", function(d) { 
      if (d.orientation=="vert") return self.resizeW*d.pos;
      else return self.resizeW*80;
    })
    .attr("x2", function(d) { 
      if (d.orientation=="vert") return self.resizeW*d.pos;
      else return self.resizeW*self.w;
    })
    .attr("y1", function(d) {      
      if (d.orientation=="vert") return 0;
      else return self.resizeH*d.pos;
    })
    .attr("y2", function(d) { 
      if (d.orientation=="vert") return self.resizeH*self.h;
      else return self.resizeH*d.pos;
    })
    .style("stroke", function (d) { 
      return null ; 
    })
    .attr("class", function (d) { 
      if (d.type=="subline") return "sp_subline"; 
      return "sp_line"; 
    });
  },

/* change la méthode de répartition du scatterPlot
 * 
 * */
  changeSplitMethod :function(splitM){
    this.splitMethod=splitM;
    this.initGrid();
    this.update();
  },
  

}


