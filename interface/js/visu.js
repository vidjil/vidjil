/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
 * 
 * visu.js
 * 
 * 
 * content:
 * 
 * initClones(data)
 * displayLegend(data)
 * updateLegend()
 * updateVis()
 * 
 * tick(e)
 * collide()
 * updateRadius()
 * 
 * vjSplit(posV, posJ)
 * sizeSplit() 
 * 
 */

var nodes ;             //container pour les circles 
var force ;             //moteur physique
var node ;              //
var leg, lines;		//container pour les legendes / quadrillages
var w = 1400,		//largeur visu (avant resize)
    h = 700,		//hauteur visu (avant resize)
    padding = 1;	//espacement minimum entre les circles
    
var vis = d3.select("#visu").append("svg:svg")
    .attr("id", "svg");

   d3.select("#svg").append("svg:rect")
    .attr("id", "visu_back")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 2500)
    .attr("height", 2500)
    .on("click", function(){freeSelect();})

    
function resetVisu(){
  initNodes();
  initVisu();
  displayLegend([]);
}

function initVisu(){
  force = d3.layout.force()
    .gravity(0)
    .theta(0) //0.8
    .charge(0) //-1
    .friction(0.9)
    .nodes(nodes)
    .on("tick", tick)
    .size([w, h]);

  node = vis.selectAll("circle").data(nodes)
    node.enter().append("svg:circle");
    node.exit()    
    .remove()
    vis.selectAll("circle")
    .attr("stroke-width", 4) 
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("stroke", "")
    .attr("r", 5)
    .attr("id", function(d) { return "circle"+d.id; })
    .attr("class", "circle")
    .call(force.drag)
    .on("click", function(d,i) { 
      selectClone(i);
    })
    .on("mouseover", function(d,i){
      focusIn(i);
    })
     .on("mouseout", function(d,i){
      focusOut(i);
    })
;
}

/* initialise les elements avec les données du modele
 * nodes[] pour la fenetre de visu*/
function initNodes() {
  nodes = d3.range(totalClones).map(Object);
   for(var i=0 ;i<totalClones; i++){
      nodes[i].id = i;
      nodes[i].r1 = 5;
      nodes[i].r2 = 5;
    }
}

function initSize() {
  min_size = 1;
  tmp=normalization;
   for(var i=0 ;i<totalClones; i++){
      for (t=0 ; t<junctions[i].size.length; t++){
	normalization=true;
	if (getSize(i)<min_size && getSize(i)!=0) {
	  min_size=getSize(i);
	}
	normalization=false
	if (getSize(i)<min_size && getSize(i)!=0) {
	  min_size=getSize(i);
	}
      }
      t=0;
    }
  normalization=tmp;
}

/* attribue une data issue du modele aux legendes/quadrillages de la visualisation*/
function displayLegend(data){
  leg = vis.selectAll("text").data(data);
  leg.enter().append("text");
  leg.exit()
    .remove();
  leg
    .transition()
    .duration(1000)
    .attr("x", function(d) { 
      if (d.cx<5) { 
	if (d.class=="vjline1") return resizeW*(d.cx)+30;
	  else return resizeW*(d.cx)+70;
      }else return resizeW*d.cx;
    })
    .attr("y", function(d) { 
      if (d.cy<5) {
	if (d.class=="vjline1") return resizeH*(d.cy)+10;
	else return resizeH*(d.cy)+25;
      }else return resizeH*d.cy+5;
    })
    .text( function (d) { 
      if (d.class=="vjline2") return d.subname;
      else return d.name;
    })
    .attr("class", "vjLegend")
    .attr("fill", function (d) { 
      if (colorMethod==d.type) return colorVJ[d.color] ; 
      return colorStyle.c01;
    });
    
  lines = vis.selectAll("line").data(data);
  lines.enter().append("line");
  lines.exit()    
    .remove();
  lines
    .transition()
    .duration(1000)
    .attr("x1", function(d) { 
      if (d.cx<5) return resizeW*80;
      else return resizeW*d.cx;
    })
    .attr("x2", function(d) { 
      if (d.cx<5) return 5000;
      else return resizeW*d.cx;
    })
    .attr("y1", function(d) { return resizeH*d.cy; })
    .attr("y2", function(d) { 
      if (d.cy<5) return 5000;
      else return resizeH*d.cy;
    })
    .style("stroke", function (d) { 
      if (colorMethod==d.type) return colorVJ[d.color] ; 
      return colorStyle.c06;
    })
    .attr("class", function (d) { return d.class; });
}

/*ne change pas les données associé a la légende 
 mais repositionne en cas de resize de la fenêtre */
function updateLegend(){
  leg
    .transition()
    .duration(1000)
    .attr("x", function(d) { 
      if (d.cx<5) { 
	if (d.class=="vjline1") return resizeW*(d.cx)+30;
	  else return resizeW*(d.cx)+70;
      }else return resizeW*d.cx;
    })
    .attr("y", function(d) { 
      if (d.cy<5) {
	if (d.class=="vjline1") return resizeH*(d.cy)+10;
	else return resizeH*(d.cy)+25;
      }else return resizeH*d.cy;
    })  
    .attr("fill", function (d) { 
      if (colorMethod==d.type) return colorVJ[d.color] ; 
      return colorStyle.c01;
    });
  lines
    .transition()
    .duration(1000)
    .attr("x1", function(d) { return resizeW*d.cx; })
    .attr("x2", function(d) { 
      if (d.cx==0) return 5000;
      else return resizeW*d.cx;
    })
    .attr("y1", function(d) { return resizeH*d.cy; })
    .attr("y2", function(d) { 
      if (d.cy==0) return 5000;
      else return resizeH*d.cy;
    })
    .style("stroke", function (d) { 
      if (colorMethod==d.type) return colorVJ[d.color] ; 
      return colorStyle.c06;
    });
}

/*mise a jour de la visualisation*/
function updateVis(){
  
  for(var i=0 ;i<totalClones; i++){
    nodes[i].r1=radius(i);
  }
  
}

/* update position frame by frame pour la gestion des collisions*/
function tick(e) {
    updateRadius()
    if (splitMethod=="vj1"){
      node.each(vjSplit(positionV, positionJ));
    }
    if (splitMethod=="vj2"){
      node.each(vjSplit(positionV2, positionJ2));
    }
    if (splitMethod=="Nsize"){
      node.each(nSizeSplit(positionV2));
    }
    if (splitMethod==" "){
      node.each(sizeSplit(positionV2));
    }
    node
      .each(collide())
      .attr("cx", function(d) { return (d.x); })
      .attr("cy", function(d) { return (d.y); })
      .attr("r" , function(d) { return (d.r2); })
}


/*résolution des collisions*/
function collide() {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
   if (d.drag != 1 && d.r1 !=0){
    var r = nodes[d.id].r2+padding,
    nx1 = d.x - r,
    nx2 = d.x + r,
    ny1 = d.y - r,
    ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = nodes[d.id].r2 + nodes[quad.point].r2+padding;
        if (l < r) {
          l = (l - r) / l*0.5;
	  if (quad.point.r1!=0){
	    d.x -= x *= l;
	    d.y -= y *= l;
	    quad.point.x += x;
	    quad.point.y += y;
	  }
        }
    }
      return x1 > nx2
          || x2 < nx1
          || y1 > ny2
          || y2 < ny1;
    });
   }
  };
}


/*mise a jour progressive des radius (evite les problemes physiques liés a des changements de taille brutaux)*/
function updateRadius(){
    for(var i=0 ;i<nodes.length; i++){
      if( nodes[i].r1 != nodes[i].r2){
	var delta = nodes[i].r1-nodes[i].r2;
	nodes[i].r2 +=0.03*delta;
      }
    }
}


/*méthode de répartition des clones en fonction des genes V et J*/
function vjSplit(posV, posJ){
    var coef = 0.005
    return function(d) {
	if (typeof junctions != "undefined") {
	  if ( typeof(junctions[d.id].seg) != 'undefined' && typeof(junctions[d.id].seg.V) != 'undefined' ){
	    d.x+=coef*((posV[junctions[d.id].seg.V[0]]*resizeW)-d.x);
	    d.y+=coef*((posJ[junctions[d.id].seg.J[0]]*resizeH)-d.y);
	  }else{
	    d.y+=coef*((50*resizeH)-d.y);
	    d.x+=coef*((50*resizeW)-d.x);
	  }
	} 
      else{
	d.y+=coef*(g_h+20-d.y);
	if ( typeof(junctions[d.id].seg) != 'undefined' && typeof(junctions[d.id].seg.V) != 'undefined' ){
	  d.x+=coef*((posV[junctions[d.id].seg.V[0]]*resizeW)-d.x);
	}else{
	  d.x+=coef*((50*resizeW)-d.x);
	}
      }
    };
}


/*méthode de répartition des clones en fonction de la taille*/
function sizeSplit(posV) {
  var coef = 0.01;
  var coef2= 0.0005;
  
  var scale_y= d3.scale.log()
    .domain([1,(1/min_size)])
    .range([(h-30),30]);
    
    return function(d) {
      var r=radius(d.id)/resizeCoef;
      if (d.r1!=0){
	d.y+=coef*( (scale_y(getSize(d.id)*(1/min_size))*resizeH ) -d.y);
      }else{
	d.y+=coef*((h*resizeH)-d.y);
      }
	    if ( typeof(junctions[d.id].seg) != 'undefined' && typeof(junctions[d.id].seg.V) != 'undefined' ){
	      if ( d.x > (  (posV[junctions[d.id].seg.V[0]]+(stepV/2.2) ) *resizeW)) d.x=d.x-Math.random();
	      if ( d.x < (  (posV[junctions[d.id].seg.V[0]]-(stepV/2.2) ) *resizeW)) d.x=d.x+Math.random();
	      d.x+=coef2*((posV[junctions[d.id].seg.V[0]]*resizeW)-d.x);
	    }else{
	      if ( d.x > (50*resizeW)) d.x=d.x-Math.random();
	      if ( d.x < (0*resizeW)) d.x=d.x+Math.random();
	    }
    }
}

function nSizeSplit(posV) {
  var coef = 0.01;
  var coef2 =0.0005;
  
    return function(d) {
      if (junctions[d.id].seg.N!=-1){
	d.y+=coef*( ((50+(1-table[d.id].Nsize/maxNsize)*600)*resizeH) -d.y  );
      }else{
	d.y+=coef*((h*resizeH)-d.y);
      }
	  
	    if ( typeof(junctions[d.id].seg) != 'undefined' && typeof(junctions[d.id].seg.V) != 'undefined' ){
	      if ( d.x > (  (posV[junctions[d.id].seg.V[0]]+(stepV/2) ) *resizeW)) d.x=d.x-Math.random();
	      if ( d.x < (  (posV[junctions[d.id].seg.V[0]]-(stepV/2) ) *resizeW)) d.x=d.x+Math.random();
	      d.x+=coef2*((posV[junctions[d.id].seg.V[0]]*resizeW)-d.x);
	    }else{
	      if ( d.x > (50*resizeW)) d.x=d.x-Math.random();
	      if ( d.x < (0*resizeW)) d.x=d.x+Math.random();
	    }
      }
}


