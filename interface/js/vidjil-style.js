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
tagColor[2] = "#b58900";
tagColor[3] = "#268bd2";
tagColor[4] = "#6c71c4";
tagColor[5] = "#2aa198";
tagColor[6] = "#d33682";
tagColor[7] = "#859900";
tagColor[8] = "";

var tagName = [];
tagName[0] = "pathologique 1";
tagName[1] = "pathologique 2";
tagName[2] = "pathologique 3";
tagName[3] = "standard";
tagName[4] = "standard (noise)";
tagName[5] = "custom 1";
tagName[6] = "custom 2";
tagName[7] = "custom 3";
tagName[8] = "-/-";

/* dark solarize*/

var scale_color;

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



var tagColor = [];
tagColor[0] = "#dc322f";
tagColor[1] = "#cb4b16";
tagColor[2] = "#b58900";
tagColor[3] = "#268bd2";
tagColor[4] = "#6c71c4";
tagColor[5] = "#2aa198";
tagColor[6] = "#d33682";
tagColor[7] = "#859900";
tagColor[8] = colorStyle.c01;

var tagName = [];
tagName[0] = "clone 1";
tagName[1] = "clone 2";
tagName[2] = "clone 3";
tagName[3] = "standard";
tagName[4] = "standard (noise)";
tagName[5] = "custom 1";
tagName[6] = "custom 2";
tagName[7] = "custom 3";
tagName[8] = "-/-";

//default tag display 
//0=hidden  -  1=show  -  2=show+color
var tagDisplay = [];
tagDisplay[0] = 2;
tagDisplay[1] = 2;
tagDisplay[2] = 2;
tagDisplay[3] = 2;
tagDisplay[4] = 2;
tagDisplay[5] = 2;
tagDisplay[6] = 2;
tagDisplay[7] = 2;
tagDisplay[8] = 2;

var default_tag=8;


  function showDisplayMenu(){
    $('#display-menu').stop
    $('#display-menu').toggle("fast");
  }

/*met a jour le style de tout les elements*/
  function updateStyle(){
    for (var i = 0; i < totalClones; i++){      
      updateStyleElem(i);
    }  
  }
  
  function changeDisplayTag(elem){
    var tag = elem.parentNode.id.substr(10);
    tagDisplay[tag]=elem.value;
    updateStyle();
    updateTagBox();
  }
  
  function nextDisplayTag(elem){
    var tag = elem.id.substr(7);
    var s =tagDisplay[tag]+1;
    if (s > 2) s=0;
    tagDisplay[tag]=s;
    $("#tagDisplay"+tag).find('input')[tagDisplay[tag]].checked=true
    updateStyle();
    updateTagBox();
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
    var clone=table[cloneID].link
    
    if (table[cloneID].active){
      if(table[cloneID].cluster.length !=0){
	clone.listElemStyle.display="block";
      }else{
	clone.listElemStyle.display="none";
      }
    }else{
      clone.listElemStyle.display="none"
    }
    
    if(table[cloneID].cluster.length !=0){
      clone.polylineElem.style.display="block";
    }else{
      clone.polylineElem.style.display="none";
    }
    
    if (tagDisplay[table[cloneID].tag]==0){
      clone.listElemStyle.display="none";
      clone.polylineElem.style.display="none";
      clone.circleElemStyle.display="none";
    }else{
      clone.circleElemStyle.display="inline";
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
    var clone=table[cloneID].link
    var selectElem=document.getElementById("f"+cloneID);
    
    if (table[cloneID].focus){
      if (selectElem){selectElem.style.background=colorStyle.c07;}
      clone.listElemStyle.background=colorStyle.c07;
      clone.listElemStyle.color=colorStyle.c05;
      clone.circleElemStyle.fill=colorStyle.c05;
      clone.polylineElem.style.setProperty('stroke',colorStyle.c05, null); 
      clone.polylineElem.style.stroke=colorStyle.c05;
      clone.polylineElem.style.strokeWidth="5px";
    }else{
      if (selectElem){selectElem.style.background=colorStyle.c02;}
      clone.circleElemStyle.stroke="";
      clone.listElemStyle.background=colorStyle.c02;
      if (table[cloneID].active){
	clone.polylineElem.style.strokeWidth="1.5px";
	if (
	    (typeof(table[cloneID].tag) != 'undefined')
	    && (tagDisplay[table[cloneID].tag]==2)
	    && (table[cloneID].tag != 8)
	    && (table[cloneID].tag != 4)
	){ 
	  // if tagged, but not standard 
	  clone.polylineElem.style.strokeWidth="5px";
        }
	clone.listElemStyle.color=color(cloneID);
	clone.circleElemStyle.fill=color(cloneID);
	clone.polylineElem.style.setProperty('stroke',color(cloneID), null); 
	clone.polylineElem.style.stroke=color(cloneID);
      }else{
	clone.polylineElem.style.strokeWidth="1.2px";
	clone.listElemStyle.color=colorStyle.c06;
	clone.circleElemStyle.fill=colorStyle.c07;
	clone.polylineElem.style.setProperty('stroke',colorStyle.c07, null); 
	clone.polylineElem.style.stroke=colorStyle.c07;
      }   
    }
   
    if (table[cloneID].select){
      clone.polylineElem.style.strokeWidth="6px";
      clone.listElemStyle.background=colorStyle.c07;
      clone.circleElemStyle.stroke=colorStyle.c05;
      clone.polylineElem.setAttribute("stroke-dasharray","20px,5px");
      
    }else{
      clone.polylineElem.removeAttribute("stroke-dasharray");
    }
    //TODO update star/tag uniquement avec le selectTag
    if (typeof table[cloneID].tag != 'undefined'){
      if (selectElem){document.getElementById("scolor"+cloneID).setAttribute("fill", tagColor[table[cloneID].tag]);}
      document.getElementById("color"+cloneID).setAttribute("fill", tagColor[table[cloneID].tag]);
    }
    else{ 
      if (selectElem){document.getElementById("scolor"+cloneID).setAttribute("fill", colorStyle.c01);}
      document.getElementById("color"+cloneID).setAttribute("fill", colorStyle.c01);
    }
    
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
    document.getElementById('bot-container').style.background=colorStyle.c02;
    document.getElementById('menu').style.background=colorStyle.c02;
    document.getElementById('listClones').style.background=colorStyle.c02;
    document.getElementById('listSelect').style.background=colorStyle.c02;
    document.getElementById('tagSelector').style.background=colorStyle.c02;
    document.getElementById('display-menu').style.background=colorStyle.c02;
    
    var button = document.getElementsByClassName("buttonSelector");

    for(var i = 0; i<button.length; i++){
      button[i].addEventListener("mouseover", function(){ this.style.background=colorStyle.c03; });
      button[i].addEventListener("mouseout", function(){ this.style.background=colorStyle.c02; });
      button[i].style.background=colorStyle.c02;
    }
  }
  
  function initTag(){
    for (var i =0; i<tagColor.length; i++){
      $(".tagName"+i).html(tagName[i]);
      $("#tagDisplay"+i).find("input")[tagDisplay[i]].checked=true;
    }
    updateTagBox();
  }
  function updateTagBox(){
    for (var i =0; i<tagColor.length; i++){
      if (tagDisplay[i]==2){
	$(".tagColor"+i).css({
	  background : tagColor[i] 
	});
      }else{
	
	if (tagDisplay[i]==1){
	  $(".tagColor"+i).css({
            "background-color" : tagColor[i],
            "background-image" : 'linear-gradient(45deg, transparent -25%, '+colorStyle.c01+' 60%, '+colorStyle.c01+' 100%, transparent 0%)',
            "background" : '-moz-linear-gradient(45deg, transparent -25%, '+colorStyle.c01+' 60%, '+colorStyle.c01+' 100%, transparent 0%) repeat scroll 0 0 '+tagColor[i], //firefox
            "background-image" : '-webkit-linear-gradient(45deg, transparent -25%, '+colorStyle.c01+' 60%, '+colorStyle.c01+' 100%, transparent 0%)'  //chrome
	  })
	}
	
	if (tagDisplay[i]==0){
	  $(".tagColor"+i).css({
            "background-color" : tagColor[i],
            "background-image" : 'linear-gradient(45deg, transparent -25%, '+colorStyle.c02+' 100%, '+colorStyle.c02+' 100%, transparent 0%)',
            "background" : '-moz-linear-gradient(45deg, transparent -25%, '+colorStyle.c02+' 100%, '+colorStyle.c02+' 100%, transparent 0%) repeat scroll 0 0 '+tagColor[i], //firefox
            "background-image" : '-webkit-linear-gradient(45deg, transparent -25%, '+colorStyle.c02+' 100%, '+colorStyle.c02+' 100%, transparent 0%)'  //chrome
	  })
	}
	
      }
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
