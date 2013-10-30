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

/*pdf*/
var pdfStyle ={};
pdfStyle.c01 = "#000"; //base00
pdfStyle.c02 = "#e5e7e3"; //background
pdfStyle.c03 = "#ffffff"; //background highlight
pdfStyle.c04 = "#93a1a1";
pdfStyle.c05 = "#502325"; //focus 
pdfStyle.c06 = "#b3b5b1"; //graph legend
pdfStyle.c07 = "#e3e5e1"; //inactive 

pdfStyle.col_s = 0.8; //pureté
pdfStyle.col_v = 0.72; //brightness

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
//0=hidden  -  1=show  
var tagDisplay = [];
tagDisplay[0] = 1;
tagDisplay[1] = 1;
tagDisplay[2] = 1;
tagDisplay[3] = 1;
tagDisplay[4] = 1;
tagDisplay[5] = 1;
tagDisplay[6] = 1;
tagDisplay[7] = 1;
tagDisplay[8] = 1;

var default_tag=8;

  function changeDisplayTag(elem){
    var tag = elem.parentNode.id.substr(10);
    tagDisplay[tag]=elem.value;
    updateTagBox();
  }
  
  function nextDisplayTag(elem){
    var tag = elem.id.substr(7);
    var s =tagDisplay[tag]+1;
    if (s > 1) s=0;
    tagDisplay[tag]=s;
    $("#tagDisplay"+tag).find('input')[tagDisplay[tag]].checked=true
    updateTagBox();
		m.update();
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

      if (tagDisplay[i]==1){
	$(".tagColor"+i).css({
	  background : tagColor[i] 
	});
      }else{
	
	
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
  }
  

