/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */

var scale_color;

var solarizeD = {
      '@default':'#839496',
      '@background':'#002b36', 
      '@highlight':'#073642', 
      '@select':'#fdf6e3', 
      '@secondary':'#586e75', 
      '@border':'#284e55'    
    };
    
var solarizeL = {
      '@default':'#657b83', 
      '@background':'#eee8d5', 
      '@highlight':'#fdf6e3', 
      '@select':'#002b36', 
      '@secondary':'#93a1a1', 
      '@border':'#b3c1c1'    
    };
    
var color=solarizeL;

var color_s = 0.8; //pureté
var color_v = 0.72; //brightness

var tagColor = [];
tagColor[0] = "#dc322f";
tagColor[1] = "#cb4b16";
tagColor[2] = "#b58900";
tagColor[3] = "#268bd2";
tagColor[4] = "#6c71c4";
tagColor[5] = "#2aa198";
tagColor[6] = "#d33682";
tagColor[7] = "#859900";
tagColor[8] = color['@default'];

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
    var tag = elem.id.charAt( elem.id.length-1 ) 
    var s =tagDisplay[tag]+1;
    if (s > 1) s=0;
    tagDisplay[tag]=s;
    updateTagBox();
    m.update();
  }
 
  function initTag(){
    for (var i =0; i<tagColor.length; i++){
      $(".tagColor"+i).prop("title", tagName[i]);
      $(".tagName"+i).html(tagName[i]);
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
            "background-image" : 'linear-gradient(45deg, transparent -25%, '+color['@background']+' 100%, '+color['@background']+' 100%, transparent 0%)',
            "background" : '-moz-linear-gradient(45deg, transparent -25%, '+color['@background']+' 100%, '+color['@background']+' 100%, transparent 0%) repeat scroll 0 0 '+tagColor[i], //firefox
            "background-image" : '-webkit-linear-gradient(45deg, transparent -25%, '+color['@background']+' 100%, '+color['@background']+' 100%, transparent 0%)'  //chrome
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
    color=newStyle
    //less.modifyVars(color);
    tagColor[default_tag] = color['@default'];
	
	if (newStyle==solarizeD) document.getElementById("palette").href="css/dark.css";
	if (newStyle==solarizeL) document.getElementById("palette").href="css/light.css";
    m.update()
	
  }
  

