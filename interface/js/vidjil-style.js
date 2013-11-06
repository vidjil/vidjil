/* VIDJIL
 * License blablabla
 * date: 28/06/2013
 * version :0.0.01
 * 
 * vidjil-style.js
 * 
 * content:
 */
  

var scale_color;

var solarizeD = {};
solarizeD.c01 = "#839496"; //base0
solarizeD.c02 = "#002b36"; //base03
solarizeD.c03 = "#073642"; //base02
solarizeD.c04 = "#93a1a1"; //base1
solarizeD.c05 = "#fdf6e3"; //base3
solarizeD.c06 = "#586e75"; //base01
solarizeD.c07 = "#284e55"; //inactive 

var color_s = 0.8; //pureté
var color_v = 0.72; //brightness

var default_color = "#839496";
var focus_color = "#fdf6e3";
var background_color ="#002b36";

var tagColor = [];
tagColor[0] = "#dc322f";
tagColor[1] = "#cb4b16";
tagColor[2] = "#b58900";
tagColor[3] = "#268bd2";
tagColor[4] = "#6c71c4";
tagColor[5] = "#2aa198";
tagColor[6] = "#d33682";
tagColor[7] = "#859900";
tagColor[8] = default_color;

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
            "background-image" : 'linear-gradient(45deg, transparent -25%, '+background_color+' 100%, '+background_color+' 100%, transparent 0%)',
            "background" : '-moz-linear-gradient(45deg, transparent -25%, '+background_color+' 100%, '+background_color+' 100%, transparent 0%) repeat scroll 0 0 '+tagColor[i], //firefox
            "background-image" : '-webkit-linear-gradient(45deg, transparent -25%, '+background_color+' 100%, '+background_color+' 100%, transparent 0%)'  //chrome
	  })
	}
	
      }
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
  
  
  function changeStyle(newStyle){
    if (newStyle=="solarizeD"){
      document.getElementById('palette').href='css/palette/solarizeD.css';
      default_color = "#839496";
      focus_color = "#fdf6e3";
      background_color ="#002b36";
    }
      
    if (newStyle=="solarizeL"){
      document.getElementById('palette').href='css/palette/solarizeL.css';
      default_color = "#839496";
      focus_color = "#002b36";
      background_color ="#eee8d5";
    }
  }
  

