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
 * initVJgrid()
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
var pref ={ custom :[], cluster :[], date :[]} ;              //fichier des preferences
 
/* initialisation fixé par defaut*/
var colorMethod="Tag"           //methode de colorisation ( Tag par defaut)
var splitMethod="begin";          //par defaut pas de method de split
var t = 0;                    //point de suivi courant ( par defaut t=0 )
limitClones=1000;
var top_limit=50;
var normalization=false;

 
var margeVJ_left=80;              //info quadrillage (vj1/vj2)
var margeVJ_top=50;
var stepV;

/* initialisation by init */
var totalClones;              //nombres de clones a gerer 
var maxNsize=1;
var mapID = [];               //map entre les jonctions et les cloneID correspondants
var table =[];

/* initialisation by initCoef */
var resizeCoef ;              //coefficient utilisé pour réajusté la visu dans l'espace disponible
var resizeG_W ;               //coefficients utilisés pour réajusté le graphique 
var resizeG_H ;
var min_size;

/* initialisation by initVJgrid */
var positionV={};         //tables associative labels (V-J) <=> positions X-Y (vj1)
var positionJ={};	
var positionV2={};        //idem (vj2)
var positionJ2={};	

var grid_vj1=[];            //contient les données pour le dessin du quadrillage/legende(vj1)
var grid_vj2=[];           //idem(vj2)
var grid_size=[];          
var grid_nsize=[]; 

var colorVJ={};           //table associative labels (V ou J) <=> couleurs
var colorN=[];		  


/*fonction de chargement local*/
function loadJson() {
  
  reset();

  oFReader = new FileReader();
  oFReader2 = new FileReader();
  
  top_limit=document.getElementById("limit_top").value;
  
  if (document.getElementById("upload_pref").files.length != 0) { 
    var oFile = document.getElementById("upload_pref").files[0];
    document.getElementById("analysis_file").innerHTML="analysis_file : "+document.getElementById("upload_pref").files[0].name;
  
    oFReader2.readAsText(oFile);
    
    oFReader2.onload = function (oFREvent) {
      var text = oFREvent.target.result;
      pref = JSON.parse(text);
    }
  }
  
  if (document.getElementById("upload_json").files.length === 0) { return; }

  oFile = document.getElementById("upload_json").files[0];
  document.getElementById("data_file").innerHTML="data_file : "+document.getElementById("upload_json").files[0].name;
  oFReader.readAsText(oFile);
  
  //fonction s'executant une fois le fichier json correctement chargé
  //initialise les modeles de données et les visualisations
  oFReader.onload = function (oFREvent) {
    jsonDataText = oFREvent.target.result;
    jsonData = load(JSON.parse(jsonDataText), top_limit);
    jsonDatatext = '0'; //récupération mémoire
    junctions=jsonData.junctions;
    init();
    initTag();
    document.getElementById("log").innerHTML+="<br>chargement fichier json";
    loadPref();
    document.getElementById("log").innerHTML+="<br>chargement fichier de preference";
    initSize();
    initList(junctions);
    document.getElementById("log").innerHTML+="<br>génération des clones";
    initVJgrid(TRGV,TRGJ);
    initNodes();
    initVisu();
    document.getElementById("log").innerHTML+="<br>calcul des positions VJ";
    initGraph();
    force.start();
    document.getElementById("log").innerHTML+="<br>initialisation graph";
    initCoef();
    document.getElementById("log").innerHTML+="<br>initialisation coef";
    setTimeout('changeSplitMethod("vj2");',2000);
    displayTop(5);
    document.getElementById("log").innerHTML+="<br>start visu";
    $("#log").scrollTop(100000000000000);
  };
  
  document.getElementById("file_menu").style.display="none";
}

function loadJsonAnalysis() {

  oFReader = new FileReader();

  if (document.getElementById("upload_analysis").files.length === 0) { return; }

  document.getElementById("analysis_file").innerHTML="analysis_file : "+document.getElementById("upload_analysis").files[0].name;
 
  oFile = document.getElementById("upload_analysis").files[0];
  oFReader.readAsText(oFile);
  
  oFReader.onload = function (oFREvent) {
    var text = oFREvent.target.result;
    pref = JSON.parse(text);
    loadPref();
    document.getElementById("log").innerHTML+="<br>chargement fichier de preference";
    initCoef();
    document.getElementById("log").innerHTML+="<br>initialisation coef";
    updateGraph();
    updateVis();
    updateStyle();
    initList();
    displayTop(5);
  };
  
  document.getElementById("analysis_menu").style.display="none";
}


function loadData(){
  document.getElementById("file_menu").style.display="block";
  document.getElementById("analysis_menu").style.display="none";
}

function loadAnalysis(){
  document.getElementById("analysis_menu").style.display="block";
  document.getElementById("file_menu").style.display="none";
}

function cancel(){
  document.getElementById("analysis_menu").style.display="none";
  document.getElementById("file_menu").style.display="none";
}

function reset(){
  table=[];
  jsonData={};
  junctions={};
  var pref ={ custom :[], cluster :[], date :[]} ;
  t = 0;
  totalClones=0;
  splitMethod="begin"; 
  initList();
  resetVisu();
  force.alpha(0);
  resetGraph();
}

function load(data, limit){
  var result={};
  result.total_size=data.total_size;
  result.resolution1=data.resolution1;
  result.resolution5=data.resolution5;
  result.norm_resolution1=data.norm_resolution1;    
  result.norm_resolution5=data.norm_resolution5;
    
  result.time=data.time;
  result.junctions=[];
  var ite=0;
  for(var i=0; i<data.junctions.length; i++){
   if (data.junctions[i].top<=limit){
     result.junctions[ite]=data.junctions[i];
     ite++;
   }
  }
  return result;
}

function init(){
  totalClones=junctions.length;
  if ( totalClones > limitClones ) totalClones = limitClones;
  document.getElementById("log").innerHTML+="<br>nombre de jonctions"+totalClones;
  
  for(var i=0 ;i<totalClones; i++){
    
    var nsize;
    
    if (typeof(junctions[i].seg) != 'undefined' && typeof(junctions[i].seg.Nsize) != 'undefined' ){
      
      nsize=junctions[i].seg.Nsize;
      
      if (nsize>maxNsize) maxNsize=nsize;
    }else{
      nsize=-1;
    }
    
    mapID[junctions[i].junction]=i;
    table[i]={display:true, Nsize:nsize, cluster :[i]};
  }
  initNcolor();
}

function initNcolor(){
  for (var i=0; i<maxNsize+1; i++){
    colorN[i]=colorGenerator( ( ((i/maxNsize)-1)*(-250) )  ,  colorStyle.col_s  , colorStyle.col_v);
  }
}

function loadPref(){
  
  for(var i=0 ;i<pref.custom.length; i++){
    if (typeof mapID[pref.custom[i].junction] != "undefined" ){
      if (typeof( pref.custom[i].tag ) != "undefined" ) {
	table[mapID[pref.custom[i].junction]].tag=pref.custom[i].tag;
      }
      
      if (typeof( pref.custom[i].name ) != "undefined" ) {
	table[mapID[pref.custom[i].junction]].c_name=pref.custom[i].name;
      }
      
    }
  }
      
  for (var i = 0; i < totalClones ; i++){
	if (table[i].select){
	  new_cluster= new_cluster.concat(table[i].cluster);
	  table[i].cluster=[];
	  data_graph[i].id=leader;
	}
      }
  
  for(var i=0 ;i<pref.cluster.length; i++){
    if (typeof mapID[pref.cluster[i].l] != "undefined" && typeof mapID[pref.cluster[i].f] != "undefined" ){
      
      var new_cluster = [];
      new_cluster= new_cluster.concat(table[ mapID[pref.cluster[i].l] ].cluster);
      new_cluster= new_cluster.concat(table[ mapID[pref.cluster[i].f] ].cluster);
      
      table[ mapID[pref.cluster[i].l] ].cluster=new_cluster;
      table[ mapID[pref.cluster[i].f] ].cluster=[];
      
    }
  }
  
}

  function editName(cloneID, elem){
    var divParent = elem;
    divParent.innerHTML="";
    
    if (cloneID[0]=='s')
      cloneID=cloneID.substr(3);
    
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
    table[tmpID].c_name = newName;
    updateListElem(cloneID, false);
  }

  /*fonction de sauvegarde (local)*/
  function savePref(){
    
    var filePref ={ custom :[], cluster :[]} 
    
    for(var i=0 ;i<totalClones; i++){
      
      if ( typeof table[i].tag != "undefined" || 
      typeof table[i].c_name != "undefined" ){
	
	var elem = {};
	elem.junction = junctions[i].junction;
	if ( typeof table[i].tag != "undefined" )
	  elem.tag = table[i].tag;
	if ( typeof table[i].c_name != "undefined" ) 
	  elem.name = table[i].c_name;
	
	filePref.custom.push(elem);
      }
      
      if (table[i].cluster.length > 1){
	
	for (var j=0; j<table[i].cluster.length; j++){
	  
	  if (table[i].cluster[j] !=i){
	    var elem ={};
	    elem.l = junctions[i].junction;
	    elem.f = junctions[ table[i].cluster[j] ].junction ;
	    filePref.cluster.push(elem);
	  } 
	}
      }
    }
	
    var textToWrite = JSON.stringify(filePref, undefined, 2);
    var textFileAsBlob = new Blob([textToWrite], {type:'json'});

  saveAs(textFileAsBlob, "analysis.json");
  }

/*************************************************************************************************/
//////////////////////////
//	RESIZE  	//
//////////////////////////
  var resizeW;
  var resizeH;

/* calcul les coefficients de resize des différentes vues
 * appel les vues pour appliquer les changements*/
function initCoef(){
  initStyle();
  resizeW = document.getElementById("visu").offsetWidth/w;
  resizeH = document.getElementById("visu").offsetHeight/h;
  document.getElementById("svg").style.width=document.getElementById("visu").offsetWidth+"px";
  document.getElementById("svg").style.height=document.getElementById("visu").offsetHeight+"px";
  
  resizeG_W = document.getElementById("visu2").offsetWidth/g_w;
  resizeG_H = (document.getElementById("visu2").offsetHeight)/(g_h);
  document.getElementById("svg2").style.width=document.getElementById("visu2").offsetWidth+"px";
  document.getElementById("svg2").style.height=document.getElementById("visu2").offsetHeight+"px";
  

  resizeCoef = Math.sqrt(resizeW*resizeH);
  
  $('#listClones').height((($('#left').height()-305))+"px");
  
  //recadrage des legendes si la methode de répartition utilisé a ce moment la en utilise
  if (splitMethod!="begin") updateLegend();
  
  setTimeout('updateGraph()',100);

  updateVis();
  setTimeout('force.alpha(.2)',1000);
  
  
  document.getElementById("log").innerHTML+="<br>resize (new coef : "+resizeW+"/"+resizeH+"/"+resizeCoef+")<br>  graph coef ("+resizeG_W+"/"+resizeG_H+")";
  $("#log").scrollTop(100000000000000);
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;


function switchVisu(hv1,hv2){
  
  $('#visu2').animate({height: hv1+"%"}, 400 ); 
  $('#visu').animate({height: hv2+"%"}, 400 ); 
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
  
  force.alpha(0);
  setTimeout('force.alpha(0.2)',300);
  updateAxis();
  updateList();
  updateVis();
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
function makeVJclass(classname, x, y, color, type, name, subname){
  var result={}
  result.class=classname;
  result.cx=x;
  result.cy=y;
  result.color=color;
  result.type=type;
  result.name=name;
  result.subname=subname;
  return result;
}

  var vmap=[];
  var jmap=[];

function initVJcolor(col_s, col_v){
  colorVJ=[];
  for (var i=0; i<vmap.length; i++){
    colorVJ[vmap[i]]=colorGenerator( ( 30+(i/vmap.length)*290 ), colorStyle.col_s, colorStyle.col_v );
  }
  for (var i=0; i<jmap.length; i++){
    colorVJ[jmap[i]]=colorGenerator( ( 30+(i/jmap.length)*290 ), colorStyle.col_s, colorStyle.col_v );
  }
  
}
  
/*initialise les variables liées aux labels V-J*/
function initVJgrid(germlineV, germlineJ){
  
  var subsize={};
  var sizeV=0;
  var sizeJ=0;
  var n=0;
  //reset des tables
  positionV={};       
  positionJ={};	
  positionV2={};    
  positionJ2={};	
  grid_vj1=[];            
  grid_vj2=[];           
  grid_size=[];
  grid_nsize=[];
  vmap=[];
  jmap=[];

  
  
  for(var i=0 ;i<germlineV.length; i++){
    for(var j=0 ;j<germlineV[i].sub.length; j++){
      vmap[sizeV]=germlineV[i].name+germlineV[i].sub[j].name;
      sizeV++;
    }
    subsize[germlineV[i].name]=germlineV[i].sub.length;;
  }
  
  for(var i=0 ;i<germlineJ.length; i++){
    for(var j=0 ;j<germlineJ[i].sub.length; j++){
      jmap[sizeJ]=germlineJ[i].name+germlineJ[i].sub[j].name;
      sizeJ++;
    }
    subsize[germlineJ[i].name]=germlineJ[i].sub.length;;
  }
 
  var t1, t2;
  var tmp="";
  var n2=-1;
  n=-1;

      
  //attribution d'une colonne pour chaque genes V (et chaque sous-genes)
  for (var i=0; i<sizeV; i++){
    
    var elem = vmap[i].split('*')[0];

    var stepVJ=stepV = (w-margeVJ_left)/germlineV.length
    
    if (elem!=tmp){
      t1=0;
      t2=subsize[elem];
      tmp=elem;
      n2++
      n++;
      grid_vj1[n]=makeVJclass("vjline1", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], "V" , elem, "");
      grid_size[n]=grid_nsize[n]=grid_vj2[n]=makeVJclass("vjline1", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], "V" , elem, "");
    }
    t1++
    n++;
    grid_vj2[n]=makeVJclass("vjline2", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], "V" , elem, "");
    grid_size[n]=grid_nsize[n]=makeVJclass("", margeVJ_left+(n2+0.5)*stepVJ, 0, vmap[i], "V" , "", "");
    positionV2[vmap[i]]=margeVJ_left+(n2+0.5)*stepVJ;
    grid_vj1[n]=makeVJclass("vjline2", margeVJ_left+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) ),
			  0, vmap[i], "V" , elem, '*' + vmap[i].split('*')[1]);
    positionV[vmap[i]]=margeVJ_left+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) );

  }
  
  n2=-1;
  
  //attribution d'une ligne pour chaque genes J (et chaque sous-genes)
  for (var i=0; i<sizeJ; i++){

    var elem = jmap[i].split('*')[0];
    
    stepVJ = (h-margeVJ_top)/germlineJ.length
    
    if (elem!=tmp){
      t1=0;
      t2=subsize[elem];
      tmp=elem;
      n2++
      n++;
      grid_vj1[n]=makeVJclass("vjline1", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], "J" , elem, "");
      grid_vj2[n]=makeVJclass("vjline1", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], "J" , elem, "");
    }
    t1++;
    n++;
    grid_vj1[n]=makeVJclass("vjline2", 0, margeVJ_top+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) )
			    , jmap[i], "J" , elem, '*' + jmap[i].split('*')[1]);
    
    positionJ[jmap[i]]=margeVJ_top+ (n2*stepVJ) -( 0.5*stepVJ/(t2+1) ) + 
			  ( (t1/(t2+1))*(stepVJ+stepVJ/(t2+1)) );		
    grid_vj2[n]=makeVJclass("vjline2", 0, margeVJ_top+(n2+0.5)*stepVJ, jmap[i], "J" , elem, "");
    positionJ2[jmap[i]]=margeVJ_top+(n2+0.5)*stepVJ;
  }
  
  n=grid_size.length;
  var scale = d3.scale.log()
    .domain([1,(1/min_size)])
    .range([(h-30),30]);
  var height=100;
  
  for (var i=n ;i<(n+8) ; i++){
    grid_size[i]=makeVJclass("vjline1", 0, (scale((height/100)*(1/min_size))) ,"#fff" , "S", (height+"%"), "");
    height=height/10;
  }
  
  n=grid_nsize.length;
  var size=0
  for (var i=n ;i<=(n+Math.floor(maxNsize/5)) ; i++){
    grid_nsize[i]=makeVJclass("vjline1", 0, (50+(1-size/maxNsize)*600) ,"#fff" , "S", size, "");
    size=size+5;
  }
  
  initVJcolor();
}


  /*retourne le label d'un clone ( s'il n'en possde pas retourne son code*/
  function getname(cloneID){
    
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if ( typeof(table[cloneID].c_name)!='undefined' ){
      return table[cloneID].c_name;
    }else{
      return getcode(cloneID);
    }
  }
  
  /*retourne le code d'un clone ( s'il n'en possde pas retourne sa jonction*/
  function getcode(cloneID){
    
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
      if ( typeof(junctions[cloneID].seg)!='undefined' && typeof(junctions[cloneID].seg.name)!='undefined' ){
	return junctions[cloneID].seg.name;
      }else{
	return junctions[cloneID].junction;
      }
    }
  
  
  /*renvoye la taille d'un clone( somme des tailles des jonctions qui le compose)*/
  function getSize(cloneID){
    
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    var r=0;
    if (normalization==false ){
      for(var j=0 ;j<table[cloneID].cluster.length; j++){
	r += junctions[table[cloneID].cluster[j]].ratio[t];}
    }else{
      for(var j=0 ;j<table[cloneID].cluster.length; j++){
	r += junctions[table[cloneID].cluster[j]].norm_ratio[t];}
    }
    return r
  }
  
  
  /*retourne le rayon du clone passé en parametre*/
  function radius(cloneID) {
    if (typeof junctions != "undefined") {
      var r=getSize(cloneID);
      if (r==0) return 0;
      return resizeCoef*Math.pow(80000*(r+0.002),(1/3) );
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
      if (colorMethod=='Tag'){
	return colorTag(cloneID)
      }
      if (colorMethod=='V'){
	return colorV(cloneID)
      }
      if (colorMethod=='J'){
	return colorJ(cloneID)
      }
      if (colorMethod=='N'){
	return colorNsize(cloneID)
      }
      return colorStyle.c01;
    }
  }
  
  /*retourne la couleur du tag correspondant au clone passé en parametre*/
  function colorTag(cloneID){
	if (typeof table[cloneID].tag != "undefined"){
	  return tagColor[table[cloneID].tag]
	}
	return colorStyle.c01;
  }
  
  /*retourne la couleur correspondant au gene V du clone passé en parametre*/
  function colorV(cloneID){
    	if (typeof junctions[cloneID].seg !="undefined" ){
	  if (junctions[cloneID].seg !="0" ){
	    return colorVJ[junctions[cloneID].seg.V[0]];
	  }
	}	
	return colorStyle.c01;
  }
  
  /*retourne la couleur correspondant au gene J du clone passé en parametre*/
  function colorJ(cloneID){
	if (typeof junctions[cloneID].seg !="undefined" ){
	  if (junctions[cloneID].seg !="0" ){
	    return colorVJ[junctions[cloneID].seg.J[0]];
	  }
	}	
	return colorStyle.c01;
  }
  
  function colorNsize(cloneID){
	if (table[cloneID].Nsize!=-1 ){
	    return colorN[table[cloneID].Nsize];
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
  
  function selectTag(tag){
    $('#tagSelector').hide("slow");
    table[tagID].tag=tag;
    if (tag==8) { 
      delete(table[tagID].tag)
    }
    updateStyleElem(tagID)
    updateGraph();
  }
  
  
  /*change la methode de colorisation ( par V / par J/ par taille)*/
  function changeColorMethod(colorM){
    colorMethod=colorM;
    document.getElementById("log").innerHTML+="<br>change ColorMethod >> "+ colorM;
    $("#log").scrollTop(100000000000000);
    updateGraph();
    updateLegend()
    updateStyle();
  }
  
  
  /*retourne la couleur de la bordure du clone passé en parametre*/
  function stroke(cloneID) {

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
      displayLegend(grid_size);
      document.getElementById("log").innerHTML+="<br>active sizeSplit";
      $('#log').scrollTop(100000000000000);
    }
    if (splitMethod=="vj1"){ 
      displayLegend(grid_vj1);
      document.getElementById("log").innerHTML+="<br>active vjSplit1";
      $('#log').scrollTop(100000000000000);
    }
    if (splitMethod=="vj2"){ 
      displayLegend(grid_vj2);
      document.getElementById("log").innerHTML+="<br>active vjSplit2";
      $('#log').scrollTop(100000000000000);
    }
    if (splitMethod=="Nsize"){ 
      displayLegend(grid_nsize);
      document.getElementById("log").innerHTML+="<br>active split by N size";
      $('#log').scrollTop(100000000000000);
    }
    force.alpha(.5);
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
    
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    table[cloneID].focus=true;
    updateStyleElem(cloneID);
    //document.getElementById("focus-sequence").innerHTML=getname(cloneID);
    
    var line = document.getElementById("line"+cloneID);
    document.getElementById("polyline_container").appendChild(line);
    
  }
  
  
  /*libere un element du focus / déclenchement style mouseover*/
  function focusOut(cloneID){
    
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    table[cloneID].focus=false;
    updateStyleElem(cloneID);
  }
  
  
  /*selectionne un element et déclenche l'affichage de ses informations */
  function selectClone(cloneID){
   
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if (table[cloneID].select){
     deselectClone(cloneID); 
    }else{
      table[cloneID].select=true;
      updateStyleElem(cloneID);
      
      addToSegmenter(cloneID);
    }
  }
  
  function deselectClone(cloneID){
    if (table[cloneID].select){
      table[cloneID].select=false;
      table[cloneID].focus=false;
      var listElem = document.getElementById("seq"+cloneID);
      listElem.parentNode.removeChild(listElem);
      focusOut(cloneID);
      force.alpha(.2)
    }
  }
  
  /*libere les elements selectionnées et vide la fenêtre d'information*/
  function freeSelect(){
    
    for (var i=0; i< totalClones ; i++){
      if(table[i].select){
	table[i].select=false; 
	updateStyleElem(i);
      }
    }
    document.getElementById("listSelect").innerHTML="";
    document.getElementById("listSeq").innerHTML="";
  }

  function mergeSelection(){
    
      var new_cluster = [];
      var leader;
      
      for (var i = totalClones-1; i >=0 ; i--){
	if(table[i].select) leader=i;
      }
      
      for (var i = 0; i < totalClones ; i++){
	if (table[i].select){
	  new_cluster= new_cluster.concat(table[i].cluster);
	  table[i].cluster=[];
	  data_graph[i].id=leader;
	}
      }
      table[leader].cluster=new_cluster;
      var path=constructPath(leader);
      
      for (var i = 0; i < totalClones ; i++){
	if (table[i].select){
	  data_graph[i].path=path;
	  updateListElem(i, false);
	}
      }
      
      updateGraph();
      updateVis();
      
      setTimeout('freeSelect();',500);
      setTimeout("selectClone("+leader+");",600);
      setTimeout("showCluster("+leader+");",700);
      force.alpha(.2)
  }
  
  function resetAnalysis(){
    table=[];
    customColor = [];
    init();
    updateStyle();
    updateList();
    displayTop(5);
    resetGraphCluster();
    updateGraph();
    updateVis();
    setTimeout('updateStyle()',1000);
    force.alpha(.2)
  }

  /*libere la jonction b du clone lead par a */
  function split(cloneIDa, cloneIDb){
    if (cloneIDa==cloneIDb) return
     
      
    var nlist = table[cloneIDa].cluster;
    var index = nlist.indexOf(cloneIDb);
    if (index ==-1) return
      
    nlist.splice(index, 1);
    
    table[cloneIDa].cluster=nlist;
    table[cloneIDb].cluster=[cloneIDb];
    data_graph[cloneIDb].id=cloneIDb;
    table[cloneIDa].focus=false;
    data_graph[cloneIDa].path=constructPath(cloneIDa);
    data_graph[cloneIDb].path=constructPath(cloneIDb);
    
    updateListElem(cloneIDa,true),
    updateListElem(cloneIDb,false),
    
    updateStyleElem(cloneIDa);
    updateStyleElem(cloneIDb);
    updateGraph();
    updateVis();
    force.alpha(.2)
  }
  
  function toggleNormalize(){
    if (normalization==true){
      normalization=false;
      document.getElementById("norm").innerHTML="normalize off"
      data_res[0].path=constructPathR(jsonData.resolution1);
      data_res[1].path=constructPathR(jsonData.resolution5);
    }
    else{ 
      normalization=true;
      document.getElementById("norm").innerHTML="normalize on"
      data_res[0].path = constructPathR(jsonData.norm_resolution1);
      data_res[1].path = constructPathR(jsonData.norm_resolution5);
    }
    
    updateList()

      for (var i = 0; i < totalClones ; i++){
	for (var j=0; j<table[i].cluster.length; j++){
	  data_graph[table[i].cluster[j]].path=constructPath(i);
	}
      }
      
    updateGraph();
    updateVis();
    force.alpha(.2)
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
 
  function changeDate(time){
    document.getElementById("dateSelector").style.display="block";
    document.getElementById("dateSelected").innerHTML=time;
  }
  
  function saveDate(){
    var myDate=new Date();
    myDate.setFullYear(2010,0,14);
    
    
    data_date[document.getElementById("dateSelected").innerHTML].date=myDate;
    updateGraph();
    document.getElementById("dateSelector").style.display="none";
  }
  
  function cancelChangeDate(){
    document.getElementById("dateSelector").style.display="none";
  }
