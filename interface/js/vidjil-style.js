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


/*light solarize*/
var solarizeL = {};
solarizeL.c01 = "#657b83"; //base00
solarizeL.c02 = "#eee8d5"; //base2
solarizeL.c03 = "#fdf6e3"; //base3
solarizeL.c04 = "#586e75"; //base01
solarizeL.c05 = "#002b36"; //base03
solarizeL.c06 = "#93a1a1"; //base1

/*dark*/
var blackStyle ={};
blackStyle.c01 = "#839496"; //default text color
blackStyle.c02 = "#232024"; //background
blackStyle.c03 = "#333034"; //background highlight
blackStyle.c04 = "#93a1a1";
blackStyle.c05 = "#fdf6e3"; //focus 
blackStyle.c06 = "#716362";

/*white*/
var whiteStyle ={};
whiteStyle.c01 = "#434044"; //base00
whiteStyle.c02 = "#e5e7e3"; //background
whiteStyle.c03 = "#ffffff"; //background highlight
whiteStyle.c04 = "#93a1a1";
whiteStyle.c05 = "#502325"; //focus 
whiteStyle.c06 = "#b3b5b1"; //inactive / graph legend

var colorStyle = {};

colorStyle=solarizeD;

var style =[];

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
    if (style[cloneID].active){
      if(style[cloneID].display){
	document.getElementById(cloneID).style.display="block";
      }else{
	document.getElementById(cloneID).style.display="none";
      }
      document.getElementById("circle"+cloneID).style.opacity=1;
      document.getElementById("line"+cloneID).style.opacity=1;
    }else{
      document.getElementById(cloneID).style.display="none"
      if (style[cloneID].focus || style[cloneID].select){
	document.getElementById("circle"+cloneID).style.opacity=1;
	document.getElementById("line"+cloneID).style.opacity=1;
      }else{
	document.getElementById("circle"+cloneID).style.opacity=0.75;
	document.getElementById("line"+cloneID).style.opacity=0.4;
      }
    }
    if(style[cloneID].display){
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
    if (style[cloneID].focus){
      document.getElementById(cloneID).style.background=colorStyle.c03;
      document.getElementById("circle"+cloneID).style.fill=colorStyle.c05;
      document.getElementById("line"+cloneID).style.stroke=colorStyle.c05;
      document.getElementById("line"+cloneID).firstChild.style.strokeWidth="4px";
    }else{
      document.getElementById("circle"+cloneID).style.stroke="";
      document.getElementById(cloneID).style.background=colorStyle.c02;
      if (style[cloneID].active){
	  document.getElementById("line"+cloneID).firstChild.style.strokeWidth="2px";
	  document.getElementById(cloneID).style.color=color(cloneID);
	  document.getElementById("circle"+cloneID).style.fill=color(cloneID);
	  document.getElementById("line"+cloneID).style.stroke=color(cloneID);
      }else{
	  document.getElementById("line"+cloneID).firstChild.style.strokeWidth="1.2px";
	  document.getElementById(cloneID).style.color=colorStyle.c06;
	  document.getElementById("circle"+cloneID).style.fill=colorStyle.c06;
	  document.getElementById("line"+cloneID).style.stroke=colorStyle.c06;
      }   
    }
    if (style[cloneID].select){
      document.getElementById(cloneID).style.background=colorStyle.c03;
      document.getElementById("circle"+cloneID).style.stroke=colorStyle.c05;
      document.getElementById("line"+cloneID).style.stroke=colorStyle.c05;
    }
  }

  /*ressort une couleur format RGB*/
  function colorGenerator(c){
    var deltaR=c-70;
    if (deltaR<0) deltaR=-deltaR;
    if ( (170-c) < deltaR) deltaR = 170-c;
    var r=Math.floor(255-deltaR*10);
    if(r<0)r=0;
   
    var deltaG=c-35;
    if (deltaG<0) deltaG=-deltaG;
    if ( (135-c) < deltaG) deltaG = 135-c
    var g=Math.floor(255-deltaG*10)
    if(g<0) g=0;
    

    var deltaB=c;
    if (deltaB<0) deltaB=-deltaB;
    if ( (100-c) < deltaB) deltaB = 100-c
    var b=Math.floor(255-deltaB*10)
    if(b<0) b=0;

    document.getElementById('circle0').style.fill= "RGB("+r+","+g+","+b+")";
    
    return "RGB("+r+","+g+","+b+")"
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
  }
  
  function showStyleSelector(){
    document.getElementById('styleSelector').style.display="block";
  }
  
  function changeStyle(newStyle){
    colorStyle=newStyle;
    initStyle();
    updateStyle();
    updateGraph();
    document.getElementById("styleSelector").style.display="none";
  }
  
  function test(bob){
    colorGenerator(bob);
    setTimeout('test('+(bob+1)+')', 100);
  }