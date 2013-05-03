
 /* ne marche pas en local (securité)
 * chargement Json
var req = new XMLHttpRequest();
  req.open("GET", "data.Json", true); 
  req.onreadystatechange = getData; 
  req.send(null); 
 
  function getData() 
  { 
    if (req.readyState == 4) 
    { 
      var jsonData = eval('(' + req.responseText + ')'); 
    }
  }
*/

oFReader = new FileReader();

function loadJson() {
  if (document.getElementById("upload").files.length === 0) { return; }
  var oFile = document.getElementById("upload").files[0];
  oFReader.readAsText(oFile);
}

oFReader.onload = function (oFREvent) {
  jsonDataText = oFREvent.target.result;
  jsonData = JSON.parse(jsonDataText);
  document.getElementById("log").innerHTML+="<br>chargement fichier json";
  initClones(jsonData);
  document.getElementById("log").innerHTML+="<br>génération des clones";
  initVJposition();
  document.getElementById("log").innerHTML+="<br>calcul des position VJ";
  initTimeBar();
  document.getElementById("log").innerHTML+="<br>initialisation timebar";
  updateVis();
  force.start();
  document.getElementById("log").innerHTML+="<br>start visu";
  $("#log").scrollTop(100000000000000);
};

var jsonData
var sizeMap=100; 
var w = 1100,
    h = 600,
    padding = 5,
    fill = d3.scale.category10(),
    nodes = d3.range(sizeMap).map(Object),
    t = 0,
    drag=0;
    

//
function initClones(data) {
  var divParent   = document.getElementById("listJ");

   for(var i=0 ;i<sizeMap; i++){
      var n = [i]
      nodes[i].r1 = 5;
      nodes[i].r2 = 5;
      nodes[i].clones = n;
      nodes[i].focus = false;
      var div = document.createElement('div');
      div.id=i;
      div.onmouseover = function(){ focusIn(this.id); }
      div.onmouseout= function(){ focusOut(this.id); }
      divParent.appendChild(div);
      if ( typeof(jsonData[i].seg)!='undefined' && typeof(jsonData[i].seg.name)!='undefined' ){
	  document.getElementById(i).innerHTML=jsonData[i].seg.name
      }else{
	document.getElementById(i).innerHTML=jsonData[i].junction;
      }
    }
}

//ajoute les boutons de changement de point de suivi
function initTimeBar(){
    var divParent = document.getElementById("timebar");
    divParent.innerHTML="";
    for(var i=0 ;i<jsonData[0].size.length; i++){
      var a = document.createElement('a');
      a.time=i;
      a.id="test";
      a.className="button";
      a.onclick= function(){ changeT(this.time); }
      a.innerHTML="Time "+i;
      divParent.appendChild(a);
    }
}

var vjposition=false;
var positionV=new Array(150);
var positionJ=new Array(150);
for (var i = 0; i<150;  i++){
  positionV[i]=0;
  positionJ[i]=0;
}

function initVJposition(){
  
  var x=0;
  var y=0;
  for(var i=0 ;i<sizeMap; i++){

    
    if ( typeof(jsonData[i].seg) != 'undefined' && typeof(jsonData[i].seg.V) != 'undefined' ){
      if ( positionV[jsonData[i].seg.V[0]] == 0){
	x+=120;
	positionV[jsonData[i].seg.V[0]]=x;
      }
       if ( positionJ[jsonData[i].seg.J[0]] == 0){
	y+=120;
	positionJ[jsonData[i].seg.J[0]]=y;
      }
    }
  }
}

//renvoye la taille d'un clone ( somme des tailles des jonctions qui le compose
function getSize(cloneID){
  var r=0;
  for(var j=0 ;j<nodes[cloneID].clones.length; j++){
    r += jsonData[nodes[cloneID].clones[j]].size[t];}
  return r;
}

//libere le clone du focus
function focusIn(cloneID){
  nodes[cloneID].focus = true;
  document.getElementById(cloneID).style.background="#455565";
  node.style("fill", function(i) { return color(i); })
  document.getElementById("log").innerHTML+="<br>[element id "+cloneID+" / "+jsonData[cloneID].junction+"] focus on // size = "+getSize(cloneID);
  $("#log").scrollTop(100000000000000);
}

//poitionne le focus sur un clone
function focusOut(cloneID){
  nodes[cloneID].focus = false;
  document.getElementById(cloneID).style.background="";
  node.style("fill", function(i) { return color(i); })
}

//ajoute la jonction b (ou le clone lead par la jonction b) dans le clone lead par a// TODO(gerer les cas speciaux)
function merge(a, b){
  var nlist = nodes[a].clones+nodes[b].clones;
  nodes[a].clones = nlist;
  nodes[b].clones=[];
}

//libere la jonction b du clone lead par a TODO
function split(a, b){
  if (a==b) return
    
  for(var i=0 ;i<nodes[a].clones.length; i++){
    if (nodes[a].clones[i] == b) return
  }
  
}
/*
//custom drag
var node_drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);
 
    function dragstart(d, i) {
      d.drag=1;
    }
 
    function dragmove(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
	force.alpha(.2);
    }
 
    function dragend(d, i) {
      d.drag=0;
      force.alpha(.2);
    }
    */

//initialisation du cadre
var vis = d3.select("#visu").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

//initialisation du modele physique
var force = d3.layout.force()
    .gravity(0)
    .theta(0.8)
    .charge(-1)
    .friction(0.9)
    .nodes(nodes)
    .on("tick", tick)
    .size([w, h]);

//initialisation des nodes
var node = vis.selectAll("circle.node")
    .data(nodes)
    .enter().append("svg:circle")
    .attr("class", "node")
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", 5)
    .call(force.drag)
    //.call(node_drag)
    .on("click", function(d,i) { 
	merge(1,2);
	updateVis();
	$("#log").scrollTop(100000000000000)
    })
    .on("mouseover", function(d,i){
      focusIn(i);
    })
     .on("mouseout", function(d,i){
      focusOut(i);
    })
;

//fonction effectué 30x par seconde
function tick(e) {
    updateRadius()
    if (vjposition==true){
      node.each(vjSplit());
    }
    else {
      node.each(sizeSplit());
    }
    node
      .each(collide())
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r" , function(d) { return d.r2; })
}

//mise a jour progressive des radius (evite les problemes physiques liés a des changement de taille brutaux)
function updateRadius(){
    for(var i=0 ;i<nodes.length; i++){
      if( nodes[i].r1 != nodes[i].r2){
	var delta = nodes[i].r1-nodes[i].r2;
	nodes[i].r2 +=0.03*delta;
      }
    }
}

//méthode de répartition des clones en fonction des genes V et J
function vjSplit(){
    var coef = 0.005
    return function(d) {
      if (typeof jsonData != "undefined") {
      if ( typeof(jsonData[d].seg) != 'undefined' && typeof(jsonData[d].seg.V) != 'undefined' ){
	d.x+=coef*(positionV[jsonData[d].seg.V[0]]-d.x);
	d.y+=coef*(positionJ[jsonData[d].seg.J[0]]-d.y);
      }else{
	d.y+=coef*5*(20-d.y);
	d.x+=coef*(550-d.x);
      }
      }
    };
}

//méthode de répartition des clones en fonction du radius
function sizeSplit() {
  var coef = 0.006
    return function(d) {
      var r=getSize(d);
      if (d.drag != 1){
	if (r < 50){
	  d.x+=coef*(100-d.x);
	  d.y+=coef*(100-d.y);
	}else{
	  if (r < 200){
	      d.x+=coef*(550-d.x);
	      d.y+=coef*(250-d.y);
	  }else{
	      d.x+=coef*(950-d.x);
	      d.y+=coef*(400-d.y);
	  }
	}
      }
    };
}

//résolution des collisions
function collide() {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
   if (d.drag != 1){
    var r = nodes[d].r2+padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
	//document.getElementById("log").innerHTML+=radius(d)+"/";
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = nodes[d].r2 + nodes[quad.point].r2+padding;
        if (l < r) {
          l = (l - r) / l*0.5;
          d.x -= x *= l;
          d.y -= y *= l;
	  if(quad.point.drag!=1) {
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

//changement de point de suivi
function changeT(nt){
  t=nt;
  document.getElementById("log").innerHTML+="<br>changement de point de suivi > "+nt;
  $("#log").scrollTop(100000000000000);
  updateVis();
}

//mise a jour de la visualisation
function updateVis(){
  for(var i=0 ;i<sizeMap; i++){
    nodes[i].r1=radius(i);
  }
  vis.selectAll("circle.node")
      .style("fill", function(i) { return color(i); })
  force.alpha(.2);
}

//retourne le rayon du clone passé en parametre
function radius(cloneID) {
  if (typeof jsonData != "undefined") {
    var r=getSize(cloneID);
    return Math.sqrt(r);
  }
}
  
//retourne la couleur du clone passé en parametre
  function color(cloneID) {
    if (nodes[cloneID].focus==true)
      return 'grey'
    if (typeof jsonData != "undefined") {
      var r=getSize(cloneID);
      if( r <30) return 'blue'
      if( r <50) return 'green'
      if( r <100) return 'violet'
      if( r <200) return 'yellow'
      if( r <400) return 'orange'
      return 'red'
    }
  }
  

  function displayAlign(){
    $("#align").animate({ height: "show", display: "show"}, 200 ); 
  }
  
  function hideAlign(){
    $("#align").animate({ height: "hide", display: "none"}, 200 ); 
  }
  
//change la methode de répartition des clones dans la visualisation
  function changeSplitMethod(){
    if (vjposition==true){ 
      vjposition=false;
      document.getElementById("log").innerHTML+="<br>active sizeSplit";
      $("#log").scrollTop(100000000000000);
    }
    else{ 
      vjposition=true;
      document.getElementById("log").innerHTML+="<br>active vjSplit";
      $("#log").scrollTop(100000000000000);
    }
    force.alpha(.2);
  }
  
  
