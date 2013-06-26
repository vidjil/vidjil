/* VIDJIL
 * License blablabla
 * date: 29/05/2013
 * version :0.0.01-a
 * 
 * Model.js
 * 
 * contains data models and control function
 * data models are stocked here and can be accessed by the different views to be displayed
 * everytime a data model is modified by a control function the views are called to be updated
 * 
 * 
 * Content :
 * 
 * loadJson()
 * initCoef()
 * switchVisu()
 * changeT(time)
 * 
 * initClones(data)
 * 
 * makeVJclass()
 * initVJposition()
 * 
 * getName(cloneID)
 * getSize(cloneID)
 * radius(cloneID)
 * 
 * color(cloneID)
 * colorV(cloneID)
 * colorJ(cloneID)
 * changeColor(cloneID)
 * changeColorMethod(colorM)
 * toggleCustomColor()
 * stroke(cloneID);
 * 
 * changeSplitMethod(splitM)
 * 
 * focusIn(cloneID)
 * focusOut(cloneID)
 * selectClone(cloneID)
 * freeSelect(cloneID)
 * ∕
 
/*************************************************************************************************/
//////////////////////////
//	MODELS   	//
//////////////////////////

/* données brutes issues du chargement des fichiers json*/
var jsonData;          //fichier json
var junctions;         //liste des jonctions du fichier json
var pref ={ custom :[], cluster :[]} ;              //fichier des preferences
var customColor = [];  //table des couleurs personalisées (TODO save to prefs.json)
var customName = [];   //table des noms personalisées (TODO save to prefs.json)
var favorites = [];    //liste des favoris
 
/* initialisation fixé par defaut*/
var colorMethod="V"           //methode de colorisation ( V par defaut)
var splitMethod=" ";          //par defaut pas de method de split
var t = 0;                    //point de suivi courant ( par defaut t=0 )
var useCustomColor=true;      //utilisation des couleurs personalisées
var select=[];                //liste des clones selectionnés
limitClones=300;

var colorV_begin=[255,241,22];//dégradé de couleur germline V
var colorV_end=[193,17,118];
var colorJ_begin=[199,22,219];//dégradé de couleur germline J
var colorJ_end=[18,211,211];
 
var margeVJ_left=80;              //info quadrillage (vj1/vj2)
var margeVJ_top=50;
var stepVJ=140;

/* initialisation by init */
var totalClones;              //nombres de clones a gerer 
var mapID = [];               //map entre les jonctions et les cloneID correspondants
var clones = [];              //clusters

/* initialisation by initCoef */
var resizeCoef ;              //coefficient utilisé pour réajusté la visu dans l'espace disponible
var resizeG_W ;               //coefficients utilisés pour réajusté le graphique 
var resizeG_H ;
var min_size;

/* initialisation by initVJposition */
var positionV={};         //tables associative labels (V-J) <=> positions X-Y (vj1)
var positionJ={};	
var positionV2={};        //idem (vj2)
var positionJ2={};	

var vjData=[];            //contient les données pour le dessin du quadrillage/legende(vj1)
var vjData2=[];           //idem(vj2)

var colorVJ={};           //table associative labels (V ou J) <=> couleurs


/*fonction de chargement local*/
function loadJson() {
  
/* ne marche pas en local (securité) TODO : fonction de chargement distante
 * chargement Json
var req = new XMLHttpRequest();
  req.open("GET", "data.Json", true); 
  req.onreadystatechange = getData; 
  req.send(null); 
 
  function getData() 
  { 
    if (req.readyState == 4) 
    { 
      var junctions = eval('(' + req.responseText + ')'); 
    }
  }
*/

  oFReader = new FileReader();
  oFReader2 = new FileReader();
  
  if (document.getElementById("upload_pref").files.length != 0) { 
    var oFile = document.getElementById("upload_pref").files[0];
    oFReader2.readAsText(oFile);
    
    oFReader2.onload = function (oFREvent) {
      var text = oFREvent.target.result;
      pref = JSON.parse(text);
    }
  }
  
  if (document.getElementById("upload_json").files.length === 0) { return; }

  oFile = document.getElementById("upload_json").files[0];
  oFReader.readAsText(oFile);
  
  //fonction s'executant une fois le fichier json correctement chargé
  //initialise les modeles de données et les visualisations
  oFReader.onload = function (oFREvent) {
    jsonDataText = oFREvent.target.result;
    jsonData = JSON.parse(jsonDataText);
    junctions=jsonData.junctions;
    init();
    document.getElementById("log").innerHTML+="<br>chargement fichier json";
    loadPref();
    document.getElementById("log").innerHTML+="<br>chargement fichier de preference";
    initSize();
    initList(junctions);
    document.getElementById("log").innerHTML+="<br>génération des clones";
    initVJposition();
    initNodes();
    initVisu();
    document.getElementById("log").innerHTML+="<br>calcul des positions VJ";
    initGraph();
    document.getElementById("log").innerHTML+="<br>initialisation graph";
    initCoef();
    document.getElementById("log").innerHTML+="<br>initialisation coef";
    updateVis();
    force.start();
    updateLook();
    changeSplitMethod("vj2");
    document.getElementById("log").innerHTML+="<br>start visu";
    $("#log").scrollTop(100000000000000);
  };
  
  document.getElementById("file_menu").style.display="none";
}

function init(){
  totalClones=junctions.length;
  if ( totalClones > limitClones ) totalClones = limitClones;
  document.getElementById("log").innerHTML+="<br>nombre de jonctions"+totalClones;
  
  for(var i=0 ;i<totalClones; i++){
    mapID[junctions[i].junction]=i;
    
    clones[i]=[i];
  }
  
}

function loadPref(){
  for(var i=0 ;i<pref.custom.length; i++){
    if (typeof mapID[pref.custom[i].junction] != "undefined" ){
      if (typeof( pref.custom[i].color ) != "undefined" ) {
	customColor[mapID[pref.custom[i].junction]]=pref.custom[i].color;
      }
      
      if (typeof( pref.custom[i].name ) != "undefined" ) {
	customName[mapID[pref.custom[i].junction]]=pref.custom[i].name;
      }
      
      if (typeof( pref.custom[i].fav ) != "undefined" ) {
	favorites.push(mapID[pref.custom[i].junction]);
      }
    }
  }
}

  function editName(cloneID, elem){
    var divParent = elem;
    divParent.innerHTML="";
    
    var input = document.createElement('input');
    input.type="text";
    input.id= "new_name";
    input.value= getname(cloneID);
    input.style.width="200px";
    input.style.border="0px";
    input.style.margin="0px";
    divParent.appendChild(input);
    divParent.onclick="";
    
    var a = document.createElement('a');
    a.className="button";
    a.appendChild(document.createTextNode("save"));
    a.onclick=function(){ 
      var newName=document.getElementById("new_name").value;
      changeName(cloneID, newName);
    }
    divParent.appendChild(a);
    $('#new_name').select();
    
  }

  function changeName(cloneID, newName){
    tmpID = cloneID;
    customName[tmpID] = newName;
    $("#"+tmpID).find(".nameBox").html(newName);
    $("#select"+tmpID).find(".nameBox").html(newName);
    $("#clone_name").html(newName);
  }

  /*fonction de sauvegarde (local)*/
  function savePref(){
    
    var filePref ={ custom :[], cluster :[]} 
    
    for(var i=0 ;i<totalClones; i++){
      if ( typeof customColor[i] != "undefined" || 
      typeof customName[i] != "undefined" || 
      favorites.indexOf(i) != -1 ){
	
	var elem = {};
	elem.junction = junctions[i].junction;
	if ( typeof customColor[i] != "undefined" )
	  elem.color = customColor[i];
	if ( typeof customName[i] != "undefined" ) 
	  elem.name = customName[i];
	if ( favorites.indexOf(i) != -1 )
	  elem.fav = true;
	
	filePref.custom.push(elem);
      }
    }
	
    var textToWrite = JSON.stringify(filePref);
    var textFileAsBlob = new Blob([textToWrite], {type:'json'});
    var fileName = "pref.json";

    var downloadLink = document.createElement("a");
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    downloadLink.download = fileName;
    downloadLink.click();    
  }

/*************************************************************************************************/
//////////////////////////
//	RESIZE  	//
//////////////////////////

/* calcul les coefficients de resize des différentes vues
 * appel les vues pour appliquer les changements*/
function initCoef(){
  
  var resizeW = document.getElementById("visu").offsetWidth/w;
  var resizeH = document.getElementById("visu").offsetHeight/h;
  document.getElementById("svg").style.width=document.getElementById("visu").offsetWidth+"px";
  document.getElementById("svg").style.height=document.getElementById("visu").offsetHeight+"px";
  
  resizeG_W = document.getElementById("visu2").offsetWidth/g_w;
  resizeG_H = (document.getElementById("visu2").offsetHeight)/(g_h);
  document.getElementById("svg2").style.width=document.getElementById("visu2").offsetWidth+"px";
  document.getElementById("svg2").style.height=document.getElementById("visu2").offsetHeight+"px";
  
  if (resizeW>resizeH)
    resizeCoef = resizeH;
  else
    resizeCoef = resizeW;
  
  $('#listFav').height((($('#left').height()-315))+"px");
  $('#listClones').height((($('#left').height()-315))+"px");
  
  //recadrage des legendes si la methode de répartition utilisé a ce moment la en utilise
  if (splitMethod=="vj1" || splitMethod=="vj2") updateLegend();
  
  setTimeout('updateGraph()',500);
  
  //recadrage vue 1
  //stop les animations de la vue
  force.alpha(0);
  //utilisation d'une transition d3js pour replacer/resize les elements
  node
    .transition()
    .duration(1000)
      .attr("cx", function(d) { return (resizeCoef*d.x); })
      .attr("cy", function(d) { return (resizeCoef*d.y); })
      .attr("r" , function(d) { return (resizeCoef*d.r2); });
  //reprend l'animation apres la transition
  setTimeout(function() {force.alpha(.2);},1001);
  
  document.getElementById("log").innerHTML+="<br>resize (new coef : "+resizeCoef+")<br>  graph coef ("+resizeG_W+"/"+resizeG_H+")";
  $("#log").scrollTop(100000000000000);
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;


/*inverse les tailles du graphique et de la vue*/
function switchVisu(){
  var hv1 = $('#visu').height();
  var hv2 = $('#visu2').height();
  
  if (hv1<hv2){
    $('#visu2').animate({height: hv1+"px"}, 400 ); 
    $('#visu').animate({height: hv2+"px"}, 400 ); 
  }
  else{
    $('#visu').animate({height: hv2+"px"}, 400 ); 
    $('#visu2').animate({height: hv1+"px"}, 400 ); 
  }
  
  
setTimeout(function() {initCoef();},500);
}

  
/*changement de point de suivi*/
function changeT(time){
  t=time;
  document.getElementById("log").innerHTML+="<br>changement de point de suivi > "+time;
  $("#log").scrollTop(100000000000000);
  
  data_axis[8]={class : "axis_f" ,text : "", x1 : 0, x2 : g_w, 
			x1 : graph_col[t], x2 : graph_col[t], 
			y1 : g_h+20, y2 : 0, time: 0}
  
  for (var i = 0 ; i<jsonData.total_size.length; i++){
    document.getElementById("time"+i).style.fill="";
  }
  document.getElementById("time"+time).style.fill="white";
  
  updateAxis();
  updateList();
  updateVis();
  updateLook();
}
  

/*************************************************************************************************/
//////////////////////////
//	INIT   VJ	//
//////////////////////////


/*crée une donnée représentant un element du quadrillage (splitMethod vj1/vj2)
 * class : class css associé
 * x / y : position legende/ligne
 * color : couleur ...
 * name : nom du gene  	ex : trgv8
 * subname : variation	ex : *01 */
function makeVJclass(classname, x, y, color, name, subname){
  var result={}
  result.class=classname;
  result.cx=x;
  result.cy=y;
  result.color=color;
  result.name=name;
  result.subname=subname;
  return result;
}


/*initialise les variables liées aux labels V-J*/
function initVJposition(){
  
  var subsize={};
  var sizeV=0;
  var sizeJ=0;
  var vmap=[];
  var jmap=[];
  var n=0;
  
  //comptage du nombre de genes V et J ( et de sous-genes ) differents dans le fichier json
  for(var i=0 ;i<totalClones; i++){

    if ( typeof(junctions[i].seg) != 'undefined' && typeof(junctions[i].seg.V) != 'undefined' ){
      if (typeof( positionV[junctions[i].seg.V[0]] ) == 'undefined'){	
	vmap[sizeV]=junctions[i].seg.V[0];
	if (typeof( subsize[vmap[sizeV].split('*')[0]] ) == 'undefined') subsize[vmap[sizeV].split('*')[0]]=1;
	else subsize[vmap[sizeV].split('*')[0]]++;
	sizeV++;
	positionV[junctions[i].seg.V[0]]=0;
      }
       if (typeof( positionJ[junctions[i].seg.J[0]] ) == 'undefined'){
	jmap[sizeJ]=junctions[i].seg.J[0];
	if (typeof( subsize[jmap[sizeJ].split('*')[0]] ) == 'undefined') subsize[jmap[sizeJ].split('*')[0]]=1;
	else subsize[jmap[sizeJ].split('*')[0]]++;
	sizeJ++;
	positionJ[junctions[i].seg.J[0]]=0;
      }
    }
  }
  
  vmap.sort();
  jmap.sort();
 
  var t1, t2;
  var tmp="";
  var n2=-1;
  n=-1;

      
  //attribution d'une couleur et d'une colonne pour chaque genes V (et chaque sous-genes)
  for (var i=0; i<sizeV; i++){
    
        colorVJ[vmap[i]]="rgb("+Math.floor((colorV_begin[0]+(i/sizeV)*(colorV_end[0]-colorV_begin[0] )))+
			","+Math.floor((colorV_begin[1]+(i/sizeV)*(colorV_end[1]-colorV_begin[1] )))+
			","+Math.floor((colorV_begin[2]+(i/sizeV)*(colorV_end[2]-colorV_begin[2] )))+")";
			
    
    var elem = vmap[i].split('*')[0];

    if (elem!=tmp){
      t1=0;
      t2=subsize[elem];
      tmp=elem;
      n2++
      n++;
      vjData[n]=makeVJclass("vjline1", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], elem, "");
      vjData2[n]=makeVJclass("vjline1", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], elem, "");
    }
    t1++
    n++;
    vjData2[n]=makeVJclass("vjline2", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], elem, "");
    positionV2[vmap[i]]=margeVJ_left+(n2+0.5)*stepVJ;
    vjData[n]=makeVJclass("vjline2", margeVJ_left+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) ),
			  0, vmap[i], elem, '*' + vmap[i].split('*')[1]);
    positionV[vmap[i]]=margeVJ_left+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) );

  }
  
  n2=-1;
  //attribution d'une couleur et d'une ligne pour chaque genes J (et chaque sous-genes)
  for (var i=0; i<sizeJ; i++){
    
        colorVJ[jmap[i]]="rgb("+Math.floor((colorJ_begin[0]+(i/sizeJ)*(colorJ_end[0]-colorJ_begin[0] )))+
			","+Math.floor((colorJ_begin[1]+(i/sizeJ)*(colorJ_end[1]-colorJ_begin[1] )))+
			","+Math.floor((colorJ_begin[2]+(i/sizeJ)*(colorJ_end[2]-colorJ_begin[2] )))+")";
			
    var elem = jmap[i].split('*')[0];
    
    if (elem!=tmp){
      t1=0;
      t2=subsize[elem];
      tmp=elem;
      n2++
      n++;
      vjData[n]=makeVJclass("vjline1", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], elem, "");
      vjData2[n]=makeVJclass("vjline1", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], elem, "");
    }
    t1++;
    n++;
    vjData[n]=makeVJclass("vjline2", 0, margeVJ_top+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) )
			    , jmap[i], elem, '*' + jmap[i].split('*')[1]);
    
    positionJ[jmap[i]]=margeVJ_top+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) );		
    vjData2[n]=makeVJclass("vjline2", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], elem, "");
    positionJ2[jmap[i]]=margeVJ_top+(n2+0.5)*stepVJ;
  }
}


  /*retourne le label d'un clone ( s'il n'en possde pas retourne son code*/
  function getname(cloneID){
    if ( typeof(customName[cloneID])!='undefined' ){
      return customName[cloneID];
    }else{
      return getcode(cloneID);
    }
  }
  
  /*retourne le code d'un clone ( s'il n'en possde pas retourne sa jonction*/
  function getcode(cloneID){
      if ( typeof(junctions[cloneID].seg)!='undefined' && typeof(junctions[cloneID].seg.name)!='undefined' ){
	return junctions[cloneID].seg.name;
      }else{
	return junctions[cloneID].junction;
      }
    }
  
  
  /*renvoye la taille d'un clone( somme des tailles des jonctions qui le compose)*/
  function getSize(cloneID){
    var r=0;
    for(var j=0 ;j<clones[cloneID].length; j++){
      r += junctions[clones[cloneID][j]].size[t];}
    
    return (r)/(jsonData.total_size[t]);
  }
  
  
  /*retourne le rayon du clone passé en parametre*/
  function radius(cloneID) {
    if (typeof junctions != "undefined") {
      var r=getSize(cloneID);
      if (r==0) return 0;
      return 2+Math.pow(60000*r,(1/3) );
    }
  }
  
  
  
/*************************************************************************************************/
//////////////////////////
//	COLORMETHOD	//
//////////////////////////

  
  /*retourne la couleur du clone passé en parametre
   * verifie les variables de colorisation selectionnées pour déterminer la couleur a utiliser*/
  function color(cloneID) {
    if (typeof junctions != "undefined") {
      
      if( useCustomColor==true){
	if (typeof customColor[cloneID] != "undefined"){
	  return customColor[cloneID]
	}
      }
      if (colorMethod=='V'){
	return colorV(cloneID)
      }
      if (colorMethod=='J'){
	return colorJ(cloneID)
      }
      return '#839496';
    }
  }
  
  
  /*retourne la couleur correspondant au gene V du clone passé en parametre*/
  function colorV(cloneID){
    	if (typeof junctions[cloneID].seg !="undefined" ){
	  if (junctions[cloneID].seg !="0" ){
	    return colorVJ[junctions[cloneID].seg.V[0]];
	  }
	}	
	return "rgb(20,226,89)"
  }
  
  
  
  /*retourne la couleur correspondant au gene J du clone passé en parametre*/
  function colorJ(cloneID){
	if (typeof junctions[cloneID].seg !="undefined" ){
	  if (junctions[cloneID].seg !="0" ){
	    return colorVJ[junctions[cloneID].seg.J[0]];
	  }
	}	
	return "rgb(20,226,89)"
  }
  
  var tagID;
  var tmpID;
  
  function changeColor(cloneID){
    tagID=cloneID;
    $('#tagSelector').show("slow");
  document.getElementById("tagname").innerHTML=getname(cloneID);
  }
  
  var tagColor = [];
  tagColor[0]= "#dc322f";
  tagColor[1]= "#cb4b16";
  tagColor[2]= "#d33682";
  tagColor[3]= "#268bd2";
  tagColor[4]= "#6c71c4";
  tagColor[5]= "#2aa198";
  tagColor[6]= "#b58900";
  tagColor[7]= "#859900";
  tagColor[8]= "";
  
  function selectTag(tag){
    $('#tagSelector').hide("slow");
    customColor[tagID]=tagColor[tag];
    document.getElementById('color'+tagID).style.background=customColor[tagID];
    if(document.getElementById('select'+tagID) ){
      document.getElementById('select'+tagID).style.color=customColor[tagID];
    }
    if (tag==8) { removeKey(customColor, tagID) }
    updateLook();
    updateGraph();
  }
  
  
  /*change la methode de colorisation ( par V / par J/ par taille)*/
  function changeColorMethod(colorM){
    colorMethod=colorM;
    document.getElementById("log").innerHTML+="<br>change ColorMethod >> "+ colorM;
    $("#log").scrollTop(100000000000000);
    updateLook();
    updateGraph();
  }
  
  
  /*active/désactive les couleurs personalisées*/
  function toggleCustomColor(){
    if (useCustomColor==true) {
      useCustomColor=false;
      document.getElementById("log").innerHTML+="<br>stop customColor";
      $('#log').scrollTop(100000000000000);
    }else{
      useCustomColor=true;
      document.getElementById("log").innerHTML+="<br>active customColor";
      $('#log').scrollTop(100000000000000);
    }
    updateLook();
    updateGraph();
  }
  
  
  /*retourne la couleur de la bordure du clone passé en parametre*/
  function stroke(cloneID) {
    if (nodes[cloneID].focus==true) return "white";
    if (select.indexOf(cloneID)!=-1)return "#BBB";
    return '';
  }
  
/*************************************************************************************************/
//////////////////////////
//	SPLITMETHOD	  //
//////////////////////////
  
  
  /* change la methode de répartition des clones dans la visualisation
   * et déclenche l'affichage des legendes correspondant a la methode de split */
  function changeSplitMethod(splitM){
    
    splitMethod=splitM;
    if (splitMethod==" "){ 
      displayLegend([]);
      document.getElementById("log").innerHTML+="<br>active sizeSplit";
      $('#log').scrollTop(100000000000000);
    }
    if (splitMethod=="vj1"){ 
      displayLegend(vjData);
      document.getElementById("log").innerHTML+="<br>active vjSplit1";
      $('#log').scrollTop(100000000000000);
    }
    if (splitMethod=="vj2"){ 
      displayLegend(vjData2);
      document.getElementById("log").innerHTML+="<br>active vjSplit2";
      $('#log').scrollTop(100000000000000);
    }
    force.alpha(.2);
  }
  
  
/*************************************************************************************************/
//////////////////////////
//	FOCUS/SELECT 	  //
//////////////////////////
  
  /*positionne le focus un clone / déclenchement style mouseover
   * cloneID : ID du clone a focus
   * move : 1 => ajustement de la liste au dessus de l'element focus
   */
  function focusIn(cloneID){
    nodes[cloneID].focus = true;
    
    updateLook();
    
    document.getElementById("focus-sequence").innerHTML=getname(cloneID);
    
    var list = document.getElementById(cloneID);
    list.style.border='white';
    list.style.borderStyle='solid';
    list.style.padding='0px';
    list.style.color='white';
    
    var list2 = document.getElementById("select"+cloneID);
    if(list2){
      list2.style.border='white';
      list2.style.borderStyle='solid';
      list2.style.padding='0px';
      list2.style.color='white';
    }
    
    var line = document.getElementById("line"+cloneID);
    document.getElementById("svg2").appendChild(line);
    
    data_graph[cloneID].focus=true;

    updateGraphDisplay();
    
    $("#log").scrollTop(100000000000000);
  }
  
  
  /*libere un element du focus / déclenchement style mouseover*/
  function focusOut(cloneID){
    nodes[cloneID].focus = false;
    
    var list = document.getElementById(cloneID);
    list.style.border='';
    list.style.borderStyle='';
    list.style.padding='';
    list.style.color='';
    
    var list2 = document.getElementById("select"+cloneID);
    if(list2){
      list2.style.border='';
      list2.style.borderStyle='';
      list2.style.padding='';
      list2.style.color='';
    }
    
    data_graph[cloneID].focus=false;
    
    updateGraphDisplay();
    updateLook();
  }
  
  
  /*selectionne un element et déclenche l'affichage de ses informations */
  function selectClone(cloneID){
    var index = select.indexOf(cloneID);
    if (index == -1){
      select.push(cloneID);
      
      var div = document.createElement('div');
      div.id2=cloneID;
      div.id="select"+cloneID;
      div.className="listElem";
      div.onmouseover = function(){ focusIn(this.id2); }
      div.onmouseout= function(){ focusOut(this.id2); }
      
      var span0 = document.createElement('span');
      span0.className = "nameBox";
      span0.ondblclick = function(){ editName(cloneID, this); }
      span0.appendChild(document.createTextNode(getname(cloneID)));
      
      var span1 = document.createElement('span');
      span1.className = "colorBox";
      span1.id="colorselect"+cloneID;
      span1.onclick=function(){ changeColor(this.parentNode.id2); }
      
      var fav=document.createElement('img')
      fav.className = "favBox";
      fav.id="selectfav"+cloneID;
      if (favorites.indexOf(cloneID) != -1 ){
	fav.src="images/icon_fav_on.png";
	fav.onclick=function(){ 
	  addToList(cloneID); 
	}
      }else{
	fav.src="images/icon_fav_off.png";
	fav.onclick=function(){ 
	  addToFavorites(cloneID);
	}
      }
      
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="selectsize"+cloneID;
      span2.appendChild(document.createTextNode((100*getSize(cloneID)).toFixed(4)+"%"));
      
      	var img=document.createElement('img');
	img.onclick=function(){ deselectClone(this.parentNode.id2);
	}
	img.src="images/delete.png";
	img.className="delBox";
      
      div.appendChild(img);
      div.appendChild(span0);
      div.appendChild(span1);
      div.appendChild(fav);
      div.appendChild(span2);
      document.getElementById("listSelect").appendChild(div);
      
      data_graph[cloneID].select=true;
      
      addToSegmenter(cloneID);

      updateGraphDisplay();
      updateLook();
    }else{
      deselectClone(cloneID);
    }
  }
  
  function deselectClone(cloneID){
    tmpID=cloneID;
    var index = select.indexOf(tmpID);
    for (var i=0; i<select.length; i++){
      if (select[i]==tmpID) index=i;
    }
    if (index != -1){
      select.splice(index,1);
      var clone = document.getElementById("select"+tmpID);
      clone.parentNode.removeChild(clone);
      var listElem = document.getElementById("seq"+tmpID);
      listElem.parentNode.removeChild(listElem);
      data_graph[tmpID].select=false;
      nodes[tmpID].focus = false;
      
      focusOut(tmpID);
      updateGraphDisplay();
      updateLook();
    }
  }
  
  /*libere les elements selectionnées et vide la fenêtre d'information*/
  function freeSelect(){
    
    for (var i=0; i< select.length ; i++){
      data_graph[select[i]].select=false; 
    }
    
    select=[];
    document.getElementById("listSelect").innerHTML="";
    document.getElementById("listSeq").innerHTML="";
    
    updateGraphDisplay();
    updateLook();
  }

  function mergeSelection(){
    if (select.length !=0){
      var new_cluster = [];
      var leader = select[0]; 
      var copy_select=select;
      
      for (var i = 0; i < select.length ; i++){
	new_cluster= new_cluster.concat(clones[select[i]]);
	clones[select[i]]=[];
	data_graph[select[i]].id=leader;
      }
      
      document.getElementById("listSelect").innerHTML="";
      document.getElementById("listSeq").innerHTML="";
      
      select=[];
      selectClone(leader);
      clones[leader]=new_cluster;
      
      updateGraph();
      updateVis();
      
      for (var i = 0; i < copy_select.length ; i++){
	document.getElementById(copy_select[i]).style.display="none";
	data_graph[copy_select[i]].display=false;
	data_graph[copy_select[i]].select=false;
	data_graph[copy_select[i]].path=constructPath(leader);
	updateListElem(copy_select[i],false)
      }
      
      updateListElem(leader,true)
      document.getElementById(leader).style.display="";
      data_graph[leader].display=true;
      data_graph[leader].select=true;
      setTimeout('updateGraphDisplay()',1000);
    }
  }

  /*libere la jonction b du clone lead par a */
  function split(cloneIDa, cloneIDb){
    if (cloneIDa==cloneIDb) return
     
      
    var nlist = clones[cloneIDa];
    var index = nlist.indexOf(cloneIDb);
    if (index ==-1) return
      
    nlist.splice(index, 1);
    
    clones[cloneIDa]=nlist;
    clones[cloneIDb]=[cloneIDb];
    data_graph[cloneIDb].id=cloneIDb;
    data_graph[cloneIDb].display=true;
    data_graph[cloneIDa].path=constructPath(cloneIDa);
    data_graph[cloneIDb].path=constructPath(cloneIDb);
    document.getElementById(cloneIDb).style.display="";
    
    updateListElem(cloneIDa,true)
    updateListElem(cloneIDb,false)
    
    updateGraph();
    updateGraphDisplay();
    updateVis();
  }
  
  function removeKey(arrayName,key)
  {
    var x;
    var tmpArray = new Array();
    for(x in arrayName)
    {
      if(x!=key) { tmpArray[x] = arrayName[x]; }
    }
    return tmpArray;
  }
 
