/* VIDJIL
 * License blablabla
 * date: 28/06/2013
 * version :0.0.01
 * 
 * vidjil-style.js
 * 
 * content:
 */
  
var tagColor = [];
tagColor[0] = "#dc322f";
tagColor[1] = "#cb4b16";
tagColor[2] = "#d33682";
tagColor[3] = "#268bd2";
tagColor[4] = "#6c71c4";
tagColor[5] = "#2aa198";
tagColor[6] = "#b58900";
tagColor[7] = "#859900";
tagColor[8] = "";

/* dark solarize*/
var solarizeD = {};
solarizeD.c01 = "#839496"; //base0
solarizeD.c02 = "#002b36"; //base03
solarizeD.c03 = "#073642"; //base02
solarizeD.c04 = "#93a1a1"; //base1
solarizeD.c05 = "#fdf6e3"; //base3
solarizeD.c06 = "#586e75"; //base01
solarizeD.c07 = "#284e55"; //inactive 

solarizeD.col_s = 0.8; //pureté
solarizeD.col_v = 0.72; //brightness


/*light solarize*/
var solarizeL = {};
solarizeL.c01 = "#657b83"; //base00
solarizeL.c02 = "#eee8d5"; //base2
solarizeL.c03 = "#fdf6e3"; //base3
solarizeL.c04 = "#586e75"; //base01
solarizeL.c05 = "#002b36"; //base03
solarizeL.c06 = "#93a1a1"; //base1
solarizeL.c07 = "#b3c1c1"; //inactive 

solarizeL.col_s = 0.8; //pureté
solarizeL.col_v = 0.72; //brightness

/*dark*/
var blackStyle ={};
blackStyle.c01 = "#839496"; //default text color
blackStyle.c02 = "#232024"; //background
blackStyle.c03 = "#333034"; //background highlight
blackStyle.c04 = "#93a1a1";
blackStyle.c05 = "#fdf6e3"; //focus 
blackStyle.c06 = "#716362";
blackStyle.c07 = "#514142"; //inactive 

blackStyle.col_s = 0.8; //pureté
blackStyle.col_v = 0.72; //brightness

/*white*/
var whiteStyle ={};
whiteStyle.c01 = "#434044"; //base00
whiteStyle.c02 = "#e5e7e3"; //background
whiteStyle.c03 = "#ffffff"; //background highlight
whiteStyle.c04 = "#93a1a1";
whiteStyle.c05 = "#502325"; //focus 
whiteStyle.c06 = "#b3b5b1"; //graph legend
whiteStyle.c07 = "#d3d5d1"; //inactive 

whiteStyle.col_s = 0.8; //pureté
whiteStyle.col_v = 0.72; //brightness

var colorStyle = {};

colorStyle=solarizeD;


/*met a jour le style de tout les elements*/
  function updateStyle(){
    for (var i = 0; i < totalClones; i++){      
      updateStyleElem(i);
    }  
  }
  
/*met a jour le style de l'element cloneID*/
  function updateStyleElem(cloneID){
    updateColorElem(cloneID);
    updateDisplayElem(cloneID);
  }
  
/*met a jour l'affichage de tout les elements*/
  function updateDisplay(){
    for (var i = 0; i < totalClones; i++){      
      updateDisplayElem(i);
    }  
  }
  
/*met a jour l'affichage de l'element cloneID*/
  function updateDisplayElem(cloneID){
    if (table[cloneID].active){
      if(table[cloneID].cluster.length !=0){
	document.getElementById(cloneID).style.display="block";
      }else{
	document.getElementById(cloneID).style.display="none";
      }
    }else{
      document.getElementById(cloneID).style.display="none"
    }
    if(table[cloneID].cluster.length !=0){
      document.getElementById("line"+cloneID).style.display="block";
    }else{
      document.getElementById("line"+cloneID).style.display="none";
    }
  }
  
/*met a jour la couleur de tout les elements*/
  function updateColor(){
    for (var i = 0; i < totalClones; i++){
      updateColorElem(i)
    }
  }

/*met a jour la couleur de l'element cloneID*/
  function updateColorElem(cloneID){
    if (table[cloneID].focus){
      document.getElementById(cloneID).style.background=colorStyle.c07;
      document.getElementById("circle"+cloneID).style.stroke=colorStyle.c05;
      document.getElementById("circle"+cloneID).style.fill=color(cloneID);
      document.getElementById("line"+cloneID).style.stroke=color(cloneID);
      document.getElementById("line"+cloneID).firstChild.style.strokeWidth="6px";
    }else{
      document.getElementById("circle"+cloneID).style.stroke="";
      document.getElementById(cloneID).style.background=colorStyle.c02;
      if (table[cloneID].active){
	  document.getElementById("line"+cloneID).firstChild.style.strokeWidth="1.5px";
	  if ((typeof(table[cloneID].tag) != 'undefined') && (table[cloneID].tag != 8) && (table[cloneID].tag != 3)) { 
	  // if tagged, but not standard 		  
		  document.getElementById("line"+cloneID).firstChild.style.strokeWidth="4px";
	      }
	  document.getElementById(cloneID).style.color=color(cloneID);
	  document.getElementById("circle"+cloneID).style.fill=color(cloneID);
	  document.getElementById("line"+cloneID).style.stroke=color(cloneID);
      }else{
	  document.getElementById("line"+cloneID).firstChild.style.strokeWidth="1px";
	  document.getElementById(cloneID).style.color=colorStyle.c06;
	  document.getElementById("circle"+cloneID).style.fill=colorStyle.c07;
	  document.getElementById("line"+cloneID).style.stroke=colorStyle.c07;
      }   
    }
    if (table[cloneID].select){
      document.getElementById("line"+cloneID).firstChild.style.strokeWidth="3px";
      document.getElementById(cloneID).style.background=colorStyle.c07;
      document.getElementById("circle"+cloneID).style.stroke=colorStyle.c05;
      document.getElementById("line"+cloneID).style.stroke=colorStyle.c05;
    }
    if (table[cloneID].tag) document.getElementById("color"+cloneID).style.backgroundColor=tagColor[table[cloneID].tag];
  }

  /*ressort une couleur format RGB*/
  function colorGenerator(h,s,v){
  h=h/60;
  var i=Math.floor(h);
  var f=h-i;
  var p =Math.floor(( v * ( 1 - s ) )*255);
  var q =Math.floor(( v * ( 1 - ( s * f) ) )*255);
  var t =Math.floor(( v * ( 1 - ( s * (1-f) ) ) )*255);
  v=Math.floor(v*255);
  
  if (i==0){
    return "rgb("+v+","+t+","+p+")";
  }
  if (i==1){
    return "rgb("+q+","+v+","+p+")";
  }
  if (i==2){
    return "rgb("+p+","+v+","+t+")";
  }
  if (i==3){
    return "rgb("+p+","+q+","+v+")";
  }
  if (i==4){
    return "rgb("+t+","+p+","+v+")";
  }
  if (i==5){
    return "rgb("+v+","+p+","+q+")";
  }
  
  }
  
  function initStyle(){
    if (document.getElementById("resolution1")){
      document.getElementById("resolution1").firstChild.style.fill=colorStyle.c02;
      document.getElementById("resolution1").style.opacity=1;
      document.getElementById("resolution5").firstChild.style.fill=colorStyle.c02;
      document.getElementById("resolution5").style.opacity=0.75;
    }
    
    document.getElementsByTagName('body')[0].style.color=colorStyle.c01;
    document.getElementsByTagName('body')[0].style.background=colorStyle.c02;
    document.getElementById('graph_back').style.fill=colorStyle.c03;
    document.getElementById('visu_back').style.fill=colorStyle.c02;
    document.getElementById('file_menu').style.background=colorStyle.c02;
    document.getElementById('menu').style.background=colorStyle.c02;
    document.getElementById('listClones').style.background=colorStyle.c02;
    document.getElementById('listSelect').style.background=colorStyle.c02;
    document.getElementById('tagSelector').style.background=colorStyle.c02;
    document.getElementById('tagSelector').style.border=colorStyle.c03;
    
    var button = document.getElementsByClassName("buttonSelector");

    for(var i = 0; i<button.length; i++){
      button[i].addEventListener("mouseover", function(){ this.style.background=colorStyle.c03; });
      button[i].addEventListener("mouseout", function(){ this.style.background=colorStyle.c02; });
      button[i].style.background=colorStyle.c02;
    }
    

  }
  
  function changeStyle(newStyle){
    colorStyle=newStyle;
    initStyle();
    initVJcolor();
    initNcolor();
    updateStyle();
    updateLegend();
    updateGraph();
  }
  
  function test(bob){
    document.getElementById('visu_back').style.fill=colorGenerator(bob,colorStyle.col_s, colorStyle.col_v);
    setTimeout('test('+(bob+1)+')', 20);
  }
  
  function test2(s,v){
    colorStyle.col_s=s;
    colorStyle.col_v=v;
    initVJcolor();
    updateStyle();
  }
