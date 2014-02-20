/*
 * Vidjil, V(D)J repertoire browsing and analysis
 * http://bioinfo.lifl.fr/vidjil
 * (c) 2013, Marc Duez and the Vidjil Team, Bonsai bioinfomatics (LIFL, UMR 8022 CNRS, Univ. Lille 1)
 * =====
 * This is a beta version, please use it only for test purposes.
 * This file is a part of Vidjil, and can not be copied, modified and/or distributed 
 * without the express permission of the Vidjil Team.
 */


// SCATTERPLOT

function ScatterPlot(id, model){
  this.id=id;			//ID de la div contenant le scatterPlot
  this.m=model;			//objet Model utilisé 
  this.resizeCoef=1;		//coef d'agrandissement a appliquer aux rayons des elements
  this.resizeW=1;		//coef d'agrandissement largeur
  this.resizeH=1;		//coef d'agrandissement hauteur
  
  this.marge_left=120;		//marge 
  this.marge_top=45;		//
  this.max_precision=9;		//precision max atteignable ( 10^-8 par defaut TODO compute)
  
  this.positionGene={};		//position
  this.positionUsedGene={};
  this.positionAllele={};	//
  this.positionUsedAllele={};
  
  this.splitY="gene_j"; 	//methode de répartition actuelle(defaut: gene v/j)
  this.splitX="gene_v";     
  
  this.m.view.push(this);	//synchronisation au Model
  
  this.time0 = Date.now(),
  this.time1= this.time0;
  this.fpsqueue = [];
  
  this.use_simple_v = false;
  
  this.active_selector = false
  
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
      .on("mouseover", function(){self.m.focusOut();})
      .on("mousedown", function(){self.activeSelector();})
      
      d3.select("body").on("mouseup", function(){self.stopSelector()})
      d3.select("body").on("mousemove", function(){self.updateSelector()})
      
    this.axis_x_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_axis_x_container")
      
    this.axis_y_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_axis_y_container")
      
    this.plot_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_plot_container")
      
    this.bar_container = d3.select("#"+this.id+"_svg").append("svg:g")
      .attr("id", this.id+"_bar_container")
      
    this.selector = d3.select("#"+this.id+"_svg").append("svg:rect")
      .attr("class", "sp_selector")
      .attr("id", this.id+"_selector")
      .attr("x", 0)
      .attr("y", 0)
      .attr("rx", 5)
      .attr("ry", 5)
      .on("mousemove", function(){self.updateSelector();})
      
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
      .size([1, 1]);
      
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
	if (!self.m.windows[p.id].active) return "circle_inactive";
	  if (self.m.windows[p.id].select) return "circle_select";
	  if (p.id==self.m.focus) return "circle_focus";
	  return "circle"; 
       })
      .call(this.force.drag)
      .on("mouseover",function(d) { self.m.focusIn(d.id); } )
      .on("click", function(d) { self.m.select(d.id);})
    
    this.initGridModel();
    this.changeSplitMethod(this.splitX, this.splitY);
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
	if ( typeof(self.m.windows[d.id].V) != 'undefined' ){
	  var geneV=self.m.windows[d.id].V[0];
	  return self.positionGene[geneV]*self.resizeW-15+self.marge_left;
	}else{
	  return self.positionGene["undefined V"]*self.resizeW-15+self.marge_left;
	}
      })
      .attr("height", 50 )
      .attr("y", self.resizeH+self.marge_top )
      .style("fill", function(d) { return (self.m.windows[d].color); })
      .on("mouseover",function(d) { self.m.focusIn(d.id); } )
      .on("click", function(d) { self.m.select(d.id);})
  },
  
  updateBar :function(){
    self=this
    
    this.vKey = Object.keys(this.m.germline.vgene);
    this.vKey.push("undefined V");
    this.bar_v={};
    this.bar_max=0;
    
	if (this.use_simple_v){
        this.bar_width = (0.5*( 1/Object.keys(this.m.usedV).length ))*this.resizeW
    }else{
        this.bar_width = (0.5*( 1/this.vKey.length ))*this.resizeW
    }

    //init
    for ( var i=0 ; i< this.vKey.length; i++){
      this.bar_v[this.vKey[i]]={}
      this.bar_v[this.vKey[i]].clones=[];
      this.bar_v[this.vKey[i]].totalSize=0;
      this.bar_v[this.vKey[i]].currentSize=0;
    }
    
    //classement des clones suivant leurs gene V
    for ( var i=0 ; i< this.m.n_windows; i++){
      if (this.m.windows[i].active){
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
	this.bar_v[this.vKey[i]].clones[j].pos=1-somme;
      }
    }
    
    //grid
    for ( var i=0 ; i< this.gridModel["bar"].length; i++){
      if (this.gridModel["bar"][i].orientation=="hori"){
	var value=this.gridModel["bar"][i].value/100;
	if (this.bar_max<0.1) value=value/5;
	this.gridModel["bar"][i].pos=1-(value/this.bar_max);
	if (value>this.bar_max){
	  this.gridModel["bar"][i].type = "subline";
	  this.gridModel["bar"][i].text = ""
	}else{
	  this.gridModel["bar"][i].type = "line";
	  this.gridModel["bar"][i].text = Math.round(value*100) + " %"
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
	if (typeof(self.m.windows[d.id].V) != 'undefined' ){
	  var geneV=self.m.windows[d.id].V[0];
	  return self.posG[geneV]*self.resizeW-(self.bar_width/2)+self.marge_left; 
	}else{
	  return self.posG["undefined V"]*self.resizeW-(self.bar_width/2)+self.marge_left;
	}
      })
      .attr("height", function(d) { return self.getBarHeight(d)*self.resizeH; })
      .attr("y", function(d) { 
	if (!self.m.windows[d.id].active) return self.resizeH+self.marge_top;
	return (self.getBarPosition(d)*self.resizeH)+self.marge_top; 
      })
      .style("fill", function(d) { return (self.m.windows[d].color); })
      .attr("class", function(p) { 
	if (!self.m.windows[p.id].active) return "circle_hidden";
	if (self.m.windows[p.id].select) return "circle_select";
	if (p.id==self.m.focus) return "circle_focus";
	return "circle"; 
      })

  },
  
  getBarHeight : function(cloneID){
    var size= this.m.getSize(cloneID);
    return size/this.bar_max;
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
    this.resizeW = document.getElementById(this.id).offsetWidth-this.marge_left;
    this.resizeH = document.getElementById(this.id).offsetHeight-this.marge_top;
    if (this.resizeW<0.1) this.resizeW=0.1;
    if (this.resizeH<0.1) this.resizeH=0.1;
    
    this.resizeCoef = Math.sqrt(this.resizeW*this.resizeH);
    if (this.resizeCoef<0.1) this.resizeCoef=0.1;
    
    this.vis = d3.select("#"+this.id+"_svg")
      .attr("width", document.getElementById(this.id).offsetWidth)	
      .attr("height", document.getElementById(this.id).offsetHeight)
    d3.select("#"+this.id+"_back")
      .attr("width", document.getElementById(this.id).offsetWidth)
      .attr("height", document.getElementById(this.id).offsetHeight);
    
    this.initGrid();
    this.update();
  },

/* 
 * 
 * */
  makeLineModel : function(type, ori, pos, text, color){
	  result={};
	  result.type = type;
	  result.orientation=ori;
	  result.pos=pos;
	  result.text=text;
	  result.geneColor=color;
	  
	  return result;
  },
  
/* précalcul les grilles de répartition du scatterPlot 
 * 
 * */
  initGridModel : function(){
    this.gridModel={};
    
    //VJ gridModel
    this.gridModel["allele_j"]=[];
    this.gridModel["gene_j"]=[];
	
    this.gridModel["allele_v"]=[];
    this.gridModel["gene_v"]=[];
	
    this.gridModel["allele_v_used"]=[];
    this.gridModel["gene_v_used"]=[];
	
    this.gridModel["Size"]=[];
    this.gridModel["nSize"]=[];
    this.gridModel["n"]=[];
    this.gridModel["bar"]=[];
    
    var vKey = Object.keys(this.m.germline.v);
    var vKey2 = Object.keys(this.m.germline.vgene);
	
    var stepV = 1/(vKey2.length+1)
	var stepV2 = 1/(Object.keys(this.m.usedV).length+1)
    
    var jKey = Object.keys(this.m.germline.j);
    var jKey2 = Object.keys(this.m.germline.jgene);
    var stepJ = 1 / (jKey2.length+1)

	
    // V allele
    for (var i=0; i<vKey.length; i++){
	  
      var elem=vKey[i].split('*');
	  var pos =(this.m.germline.v[vKey[i]].gene)*stepV +
	      (this.m.germline.v[vKey[i]].allele+0.5) * (stepV/(this.m.germline.vgene[elem[0]].n ));
	  var pos2= (this.m.germline.v[vKey[i]].gene+0.5)*stepV;
	  var color = this.m.germline.v[vKey[i]].color;
      
	  this.positionAllele[vKey[i]]=pos;
	  this.gridModel["allele_v"].push(this.makeLineModel("subline","vert",pos,"*"+elem[1],color));

      this.positionGene[vKey[i]]=pos2
      this.gridModel["gene_v"].push(this.makeLineModel("subline","vert",pos2,"",color));
      
      if (this.m.usedV[elem[0]]){
		  pos = stepV2*(this.m.usedV[elem[0]]-1) +
	      (this.m.germline.v[vKey[i]].allele+0.5) * (stepV2/(this.m.germline.vgene[elem[0]].n ));
		  pos2 = stepV2*(this.m.usedV[elem[0]]-0.5)
		  this.gridModel["allele_v_used"].push(this.makeLineModel("subline","vert",pos,"*"+elem[1],color));
          this.gridModel["gene_v_used"].push(this.makeLineModel("subline","vert",pos2,"",color));
	  }else{
		  this.gridModel["allele_v_used"].push(this.makeLineModel("subline","vert",0,"",color));
		  this.gridModel["gene_v_used"].push(this.makeLineModel("subline","vert",0,"",color));
	  }
      
	  this.positionUsedAllele[vKey[i]] = pos
	  this.positionUsedGene[vKey[i]] = pos2
    }
    
    // V gene
    for (var i=0; i < vKey2.length; i++){
      
      var pos = (i+0.5)*stepV;
      var color = this.m.germline.vgene[vKey2[i]].color;
	  
      
      this.gridModel["allele_v"].push(this.makeLineModel("line","vert",pos,vKey2[i],color));
      this.gridModel["gene_v"].push(this.makeLineModel("line","vert",pos,vKey2[i],color));
	  
	  if (this.m.usedV[vKey2[i]]){
		pos = stepV2*(this.m.usedV[vKey2[i]]-0.5)
		this.gridModel["allele_v_used"].push(this.makeLineModel("line","vert",pos,vKey2[i].split(this.m.system)[1],color));
		this.gridModel["gene_v_used"].push(this.makeLineModel("line","vert",pos,vKey2[i].split(this.m.system)[1],color));
	  }
      else{ 
		pos = 0
		this.gridModel["allele_v_used"].push(this.makeLineModel("","vert",pos,"",color));
		this.gridModel["gene_v_used"].push(this.makeLineModel("","vert",pos,"",color));
	  }
	  
    }

    // undefined gene
    var pos = (vKey2.length+0.5)*stepV;

    this.gridModel["allele_v"].push(this.makeLineModel("line","vert",pos,"?",""));
    this.gridModel["gene_v"].push(this.makeLineModel("line","vert",pos,"?",""));
    this.positionGene["undefined V"]=pos
	this.positionAllele["undefined V"]=pos
	
	var pos2 = (Object.keys(this.m.usedV).length+0.5)*stepV2;

    this.gridModel["allele_v_used"].push(this.makeLineModel("line","vert",pos2,"?",""));
    this.gridModel["gene_v_used"].push(this.makeLineModel("line","vert",pos2,"?",""));
	this.positionUsedGene["undefined V"]=pos2
    this.positionUsedAllele["undefined V"]=pos2

    
    
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
	  this.positionUsedAllele[jKey[i]]=d.pos;
      this.positionUsedGene[jKey[i]]=d2.pos
      
      this.gridModel["allele_j"].push(d);
      this.gridModel["gene_j"].push(d2);
    }
    
    //J gene
    for (var i=0; i < jKey2.length; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = (i+0.5)*stepJ;
      d.text=jKey2[i];
      d.geneColor=this.m.germline.jgene[jKey2[i]].color;
      
      this.gridModel["allele_j"].push(d);
      this.gridModel["gene_j"].push(d);
    }
    d={};
    d.type = "line";
    d.orientation = "hori";
    d.pos = (jKey2.length+0.5)*stepJ;
    d.text="?"
    
    this.gridModel["allele_j"].push(d);
    this.gridModel["gene_j"].push(d);
    this.positionGene["undefined J"]=d.pos
    this.positionAllele["undefined J"]=d.pos
	this.positionUsedGene["undefined J"]=d.pos
    this.positionUsedAllele["undefined J"]=d.pos
    
    //N_size
    for (var i=0 ;i<=(Math.floor(this.m.n_max/5)) ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = (1-((i*5)/this.m.n_max))*(1-(2*this.marge_top));
      d.text=i*5;
      this.gridModel["nSize"].push(d);
    }
    
    //n
    for (var i=0 ;i<=(Math.floor(this.m.n_max/5)) ; i++){
      var d={};
      d.type = "line";
      d.orientation = "hori";
      d.pos = (1-((i*5)/this.m.n_max));
      d.text=i*5;
      this.gridModel["n"].push(d);
    }
    
    //size 
    this.sizeScale = d3.scale.log()
      .domain([this.m.min_size,1])
      .range([1,0]);
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
 
	//choix du gridModel V a utiliser
	this.posG=this.positionGene
	this.posA=this.positionAllele
	if (Object.keys(m.germline.vgene).length > 20){
		this.use_simple_v = true;
		this.posG=this.positionUsedGene
		this.posA=this.positionUsedAllele
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
      .attr("title", function(d) { return (self.m.getName(d)); })
      
    //calcul fps
    this.time1 = Date.now();
    if (this.fpsqueue.length === 10) { 
      document.getElementById("fps").innerHTML=d3.mean(this.fpsqueue).toFixed(3);
      this.fpsqueue = []; 
    }
    this.fpsqueue.push(Math.round(1000 / (this.time1 - this.time0)));
    this.time0 = this.time1;
      
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
            if ( typeof(self.m.windows[d.id].V) != 'undefined'  && self.m.germline.v[self.m.windows[d.id].V[0]]){
                geneV=self.m.windows[d.id].V[0];
            }
            if ( typeof(self.m.windows[d.id].J) != 'undefined'  && self.m.germline.j[self.m.windows[d.id].J[0]] ){
                geneJ=self.m.windows[d.id].J[0];
            }
            
            switch(self.splitY){ 
                case "bar": 
                    d.y+=coef*(-d.y);
                    break;
                case "gene_j": 
                    d.y+=coef*((self.posG[geneJ]*self.resizeH)-d.y);
                    break;
                case "allele_j": 
                    d.y+=coef*((self.posA[geneJ]*self.resizeH)-d.y);
                    break;
                case "gene_v_used": 
                    d.y+=coef*((self.posG[geneV]*self.resizeH)-d.y);
                    break;
                case "gene_v": 
                    d.y+=coef*((self.posG[geneV]*self.resizeH)-d.y);
                    break;
                case "allele_v_used": 
                case "allele_v": 
                    d.y+=coef*((self.posA[geneV]*self.resizeH)-d.y);
                    break;
                case "Size": 
                    if (d.r1!=0){
                        d.y+=coef2*(self.sizeScale(self.m.getSize(d.id))*self.resizeH - d.y);
                    }else{
                        d.y+=coef2*(self.resizeH-d.y);
                    }
                    break; 
                case "nSize": 
                    if ( typeof(self.m.windows[d.id].V) != 'undefined' ){
                        if (self.m.windows[d.id].N!=-1){
                            d.y+=coef2*((self.marge_top + (1-(self.m.windows[d.id].Nlength/self.m.n_max))*(self.resizeH-(2*self.marge_top)))*self.resizeH -d.y  );
                        }else{
                            d.y+=coef2*(self.resizeH-d.y);
                        }
                    }else{
                        d.y+=coef2*(self.resizeH-d.y);
                    }
                    break; 
                case "n": 
                    d.y+=coef2*((1-(self.m.windows[d.id].Nlength/self.m.n_max))*self.resizeH -d.y  );
                    break; 
            }

            switch(self.splitX){
                case "bar": 
                    d.x+=coef*(-d.x);
                    break;
                case "gene_j": 
                    d.x+=coef*((self.posG[geneJ]*self.resizeW)-d.x);
                    break;
                case "allele_j": 
                    d.x+=coef*((self.posA[geneJ]*self.resizeW)-d.x);
                    break;
                case "gene_v_used": 
                case "gene_v": 
                    d.x+=coef*((self.posG[geneV]*self.resizeW)-d.x);
                    break;
                case "allele_v_used": 
                case "allele_v": 
                    d.x+=coef*((self.posA[geneV]*self.resizeW)-d.x);
                    break;
                case "Size": 
                    if (d.r1!=0){
                        d.x+=coef2*(self.sizeScale(self.m.getSize(d.id))*self.resizeW - d.x);
                    }else{
                        d.x+=coef2*(self.resizeW-d.x);
                    }
                    break; 
                case "nSize": 
                    if ( typeof(self.m.windows[d.id].V) != 'undefined' ){
                        if (self.m.windows[d.id].N!=-1){
                            d.x+=coef2*((self.marge_top + (1-(self.m.windows[d.id].Nlength/self.m.n_max))*(1-(2*self.marge_top)))*self.resizeW -d.x  );
                        }else{
                            d.x+=coef2*(self.resizeW-d.x);
                        }
                    }else{
                        d.x+=coef2*(self.resizeW-d.x);
                    }
                    break; 
                case "n": 
                    d.x+=coef2*((1-(self.m.windows[d.id].Nlength/self.m.n_max))*self.resizeW -d.x  );
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
	if (d.r2<0.01) d.r2=0;
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
	//console.log("debug NaN x circle"+ d.id );
      }
      if (!isFinite(d.y)){
	d.y=Math.random()*500;
	//console.log("debug NaN y circle"+ d.id );
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
    if (!this.m.windows[nodeID].active) return 0;
    var size=this.m.getSize(nodeID);
    if (size==0) return 0;
    return this.resizeCoef*Math.pow((size+0.001),(1/3))/25
  },

/* update les données du scatterPlot et relance une sequence d'animation
 * 
 * */
  update : function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
    
    if (this.splitY=="bar"){
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
    if (this.splitY=="bar"){
      this.updateBar();
    }else{
      var flag=false;
      for (var i = 0 ; i<list.length; i++){
	var current_r = this.nodes[list[i]].r1
	var new_r = this.getRadius(list[i]);
	this.nodes[list[i]].r1=this.getRadius(list[i]);
	if (current_r != new_r){
	  flag=true;
	  this.nodes[list[i]].r1=new_r;
	}
      }
      if (flag) this.update();
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
	if (!self.m.windows[p.id].active) return "circle_hidden";
	if (self.m.windows[p.id].select) return "circle_select";
	if (p.id==self.m.focus) return "circle_focus";
	return "circle"; 
      })
      .style("fill", function(d) { return (self.m.windows[d].color); })
  },
  
/* applique la grille correspondant a la methode de répartition définit dans this.splitX/Y
 * 
 * */
  initGrid : function(){
  self = this;

  var x_grid = this.gridModel[this.splitX]
  var y_grid = this.gridModel[this.splitY]

  this.axis_x_update(x_grid);
  this.axis_y_update(y_grid);
  },
  
  
  /* 
 * 
 * */
  changeXaxis : function(elem){
    this.changeSplitMethod(elem.value, this.splitY);
  },
  
  
  /* 
 * 
 * */
  changeYaxis : function(elem){
    this.changeSplitMethod(this.splitX, elem.value);
  },
  
/* 
 * 
 * */
  axis_x_update : function(data){
      
  self = this;
   
  //LEGENDE
  leg = this.axis_x_container.selectAll("text").data(data);
  leg.enter().append("text");
  leg.exit()
    .remove();
  leg
    .attr("x", function(d) { return self.resizeW*d.pos+self.marge_left;})
    .attr("y", function(d) { 
      if ( d.type=="subline" ) return 25
      else return 12;
    })
    .text( function (d) { return d.text; })
    .attr("class", "sp_legend")
    .style("fill", function (d) { 
      if (self.m.colorMethod=="V" && (self.splitX=="gene_v" || self.splitX=="gene_v_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && (self.splitX=="gene_j" || self.splitX=="gene_j_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ;
      return null;
    }) ;
    
  //AXIS
  lines = this.axis_x_container.selectAll("line").data(data);
  lines.enter().append("line");
  lines.exit()    
    .remove();
  lines
    .attr("x1", function(d) { return self.resizeW*d.pos+self.marge_left; })
    .attr("x2", function(d) { return self.resizeW*d.pos+self.marge_left; })
    .attr("y1", function(d) { return self.marge_top; })
    .attr("y2", function(d) { return self.resizeH+self.marge_top; })
    .style("stroke", function (d) { return null; })
    .attr("class", function (d) { 
        if (d.type=="subline"){
            if (self.splitX!="allele_j" && self.splitX!="allele_v" && self.splitX!="allele_v_used" ) return "sp_subline_hidden";
                return "sp_subline"; 
        }
        return "sp_line"; 
    })
    .style("stroke", function (d) { 
      if (self.m.colorMethod=="V" && (self.splitX=="gene_v" || self.splitX=="gene_v_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && (self.splitX=="gene_j" || self.splitX=="gene_j_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      return null;
    });
    
  },

/* 
 * 
 * */
  axis_y_update : function(data){
      
  self = this;
  
  //LEGENDE
  leg = this.axis_y_container.selectAll("text").data(data);
  leg.enter().append("text");
  leg.exit()
    .remove();
  leg
    .attr("x", function(d) { 
        if ( d.type=="subline" ) return 80;
        else return 40; 
    })
    .attr("y", function(d) { return self.resizeH*d.pos+3+self.marge_top; })
    .text( function (d) { return d.text; })
    .attr("class", "sp_legend")
    .style("fill", function (d) { 
      if (self.m.colorMethod=="V" && (self.splitY=="gene_v" || self.splitY=="gene_v_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && (self.splitY=="gene_j" || self.splitY=="gene_j_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ;
      return null;
    })
    ;
  
  //AXIS
  lines = this.axis_y_container.selectAll("line").data(data);
  lines.enter().append("line");
  lines.exit()    
    .remove();
  lines
    .attr("x1", function(d) { return self.marge_left; })
    .attr("x2", function(d) { return self.resizeW+self.marge_left; })
    .attr("y1", function(d) { return self.resizeH*d.pos+self.marge_top; })
    .attr("y2", function(d) { return self.resizeH*d.pos+self.marge_top; })
    .style("stroke", function (d) { return null; })
    .attr("class", function (d) { 
        if (d.type=="subline"){
            if (self.splitY!="allele_j" && self.splitY!="allele_v" && self.splitY!="allele_v_used" )return "sp_subline_hidden";
                return "sp_subline"; 
            }
        return "sp_line"; 
    })
    .style("stroke", function (d) { 
      if (self.m.colorMethod=="V" && (self.splitY=="gene_v" || self.splitY=="gene_v_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ; 
      if (self.m.colorMethod=="J" && (self.splitY=="gene_j" || self.splitY=="gene_j_used") && ( typeof(d.geneColor)!="undefined" )) return d.geneColor ;
      return null;
    });
  
  },
/* change la méthode de répartition du scatterPlot
 * 
 * */
  changeSplitMethod :function(splitX, splitY){
    if (splitY=="bar" && splitY!=this.splitY){
      this.endPlot();
      this.initBar();
    }
    
    if (splitY!="bar" && this.splitY=="bar"){
      this.endBar();
    }
    
    this.splitX=splitX;
    if (splitX=="gene_v" && this.use_simple_v) this.splitX="gene_v_used";
    if (splitX=="allele_v" && this.use_simple_v) this.splitX="allele_v_used";
    this.splitY=splitY;
    if (splitY=="gene_v" && this.use_simple_v) this.splitY="gene_v_used";
    if (splitY=="allele_v" && this.use_simple_v) this.splitY="allele_v_used";
    
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
  },
  
  activeSelector : function(e){
      var self=this;
      var coordinates = [0, 0];
      coordinates = d3.mouse(d3.select("#"+this.id+"_svg").node());
      this.selector
      .attr("originx", coordinates[0])
      .attr("originy", coordinates[1])
      .attr("x", coordinates[0])
      .attr("y", coordinates[1])
      .attr("width", 0)
      .attr("height", 0)
      
      console.log( "activeSelector " + coordinates[0] + "/" +coordinates[1] )
      
      this.active_selector = true;
  },
  
    updateSelector : function(){
      if (this.active_selector){
        var coordinates = [0, 0];
        coordinates = d3.mouse(d3.select("#"+this.id+"_svg").node());
        var x = this.selector.attr("originx")
        var y = this.selector.attr("originy")
        
        
            var width = coordinates[0]-x
            var height = coordinates[1]-y
            
            if (width > 5){
                this.selector.attr("width", width-3)
                .attr("x", x)
            }else if (width < -5){
                this.selector
                .attr("width",-width)
                .attr("x",coordinates[0]+3)
            }
            else{
                this.selector.attr("width", 0)
                .attr("x", x)
            }
            
            if (height >5 ){
                this.selector.attr("height", height-3)
                .attr("y", y)
            }else if (height <-5){
                this.selector
                .attr("height", -height)
                .attr("y", coordinates[1]+3)
            }
            else{
                this.selector.attr("height", 0)
                .attr("y", y)
            }

            //console.log( "updateSelector " + coordinates[0] + "/" +coordinates[1] )

      }
  },
  
    stopSelector : function(e){
        
        if (this.active_selector) {
        
            var coordinates = [0, 0];
            coordinates = d3.mouse(d3.select("#"+this.id+"_svg").node());
            
            if (coordinates[0] < 0
                || coordinates[1] < 0 
                || coordinates[0] > this.marge_left+this.resizeW
                || coordinates[1] > this.marge_top+this.resizeH ){
                
                this.cancelSelector()
                
            }else{
            
                var nodes_selected = []
                var x1 = parseInt(this.selector.attr("x"))
                var x2 = x1 + parseInt(this.selector.attr("width"))
                var y1 = parseInt(this.selector.attr("y"))
                var y2 = y1 + parseInt(this.selector.attr("height"))
                
                for (var i=0; i<this.nodes.length; i++){
                    
                    var node_x = this.nodes[i].x+this.marge_left
                    var node_y = this.nodes[i].y+this.marge_top
                    
                    if (this.m.windows[i].active
                        && this.m.windows[i].display
                        && !this.m.windows[i].select
                        && this.m.getSize(i)
                        && node_x > x1 
                        && node_x < x2
                        && node_y > y1
                        && node_y < y2  ){
                        nodes_selected.push(i)
                    }
                }
                
                this.selector
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0)
                .attr("height", 0)
                this.active_selector = false;
                console.log( "stopSelector : selectBox [x : "+x1+"/"+x2+", y : "+y1+"/"+y2+"]   nodes :"+ nodes_selected )
                
                this.m.unselectAll()
                for (var i=0; i<nodes_selected.length; i++){
                    this.m.select(nodes_selected[i])
                }
            }
        }
    },
    
    cancelSelector : function(){
        
            this.selector
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", 0)
            this.active_selector = false;
            console.log("cancel selector")
        
        if ( document.selection ) {
            document.selection.empty();
        } else if ( window.getSelection ) {
            window.getSelection().removeAllRanges();
        }
    },
  
}


