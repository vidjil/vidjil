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
 * ∕
 
/*************************************************************************************************/
//////////////////////////
//	MODELS   	//
//////////////////////////

/* données brutes issues du chargement des fichiers json*/
var jsonData;          //fichier json
var windows;         //liste des jonctions du fichier json
var pref ={ custom :[], cluster :[], date :[]} ;              //fichier des preferences
 
/* initialisation fixé par defaut*/
var colorMethod="Tag"           //methode de colorisation ( Tag par defaut)
var splitMethod="begin";          //par defaut pas de method de split
var t = 0;                    //point de suivi courant ( par defaut t=0 )
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
var system="TRG";
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

//default 
var used_ratio=0;


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
  document.getElementById("svg2").setAttribute("width",document.getElementById("visu2").offsetWidth);
  document.getElementById("svg2").setAttribute("height",document.getElementById("visu2").offsetHeight);
  document.getElementById('visu_back').setAttribute("width",resizeW*w);
  document.getElementById('visu_back').setAttribute("height",resizeH*h);
  document.getElementById('graph_back').setAttribute("width",(resizeG_W*g_w)+1);
  document.getElementById('graph_back').setAttribute("height",(resizeG_H*g_h)+1);

  resizeCoef = Math.sqrt(resizeW*resizeH);
  
  $('#listClones').height((($('#left').height()-305))+"px");
  
  //recadrage des legendes si la methode de répartition utilisé a ce moment la en utilise
  if (splitMethod!="begin") updateLegend();
  
  setTimeout('updateGraph()',100);

  updateVis();
  setTimeout('force.alpha(.2)',1000);
  
  
  
  console.log("resize (new coef : "+resizeW+"/"+resizeH+"/"+resizeCoef+")<br>  graph coef ("+resizeG_W+"/"+resizeG_H+")");
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;


function switchVisu(hv1,hv2){
  
  $('#visu2').animate({height: hv1+"%"}, 400 , function(){
    console.log("plop");
  }); 
  $('#visu').animate({height: hv2+"%"}, 400 ); 
}



  



  
/*	MODEL
 * 
 * load
 * loadGermline
 * loadAnalysis
 * initClones
 * saveAnalysis
 * resetAnalysis
 * changeName
 * getName
 * getCode
 * getSize
 * changeRatio
 * changeTime
 * focusIn
 * focusOut
 * select
 * unselect
 * unselectAll
 * getSelected
 * merge
 * split
 * 
 * */
  
  
function Model(){
  console.log("creation Model")
  this.analysis ={ custom :[], cluster :[], date :[]} ;
  this.t=0;
  this.r=0;
}

Model.prototype = {

/* test
 * 
 * */
  test : function(){
  },
  
/* load the selected data/analysis file in the model
 * @data : id of the form (html element) linking to the data file
 * @analysis : id of the form (html element) linking to the analysis file
 * impossible to use direct path to input files, need a fakepath from input form 
 * @limit : minimum top value to keep a window*/
  load : function(data, analysis, limit){
    console.log("load()");
    if (document.getElementById(data).files.length === 0) { return; }
    
    self = this;
    var oFReader = new FileReader();
    var oFile = document.getElementById(data).files[0];
    self.dataFileName= document.getElementById(data).files[0].name;
    oFReader.readAsText(oFile);
    
    oFReader.onload = function (oFREvent) {
      var data =JSON.parse( oFREvent.target.result);
      if (typeof(data.timestamp) =='undefined'){
	//TODO message d'erreur
	return 0;
      }
      
      self.normalizations = data.normalizations;
      self.total_size = data.total_size;
      self.resolution1 = data.resolution1;
      self.resolution5 = data.resolution5;
      self.timestamp = data.timestamp;
      self.time = data.time;
      self.windows = [];
      
      var min_size = 1;
      var n_max=0;
      var l=0;
      for(var i=0; i < data.windows.length; i++){
	if (data.windows[i].top <= limit){
	  
	  //search for min_size
	  for(var j=0 ; j<data.windows[i].ratios.length; j++){
	    for(var k=0 ; k<data.windows[i].ratios[j].length; k++){
	      if (min_size > data.windows[i].ratios[j][k] && data.windows[i].ratios[j][k] != 0)
		min_size=data.windows[i].ratios[j][k];
	    }
	  }
	  //search for n_max
	  if ((typeof(data.windows[i].seg) != 'undefined') && 
	    (typeof(data.windows[i].seg.Nsize) != 'undefined') &&
	    (data.windows[i].seg.Nsize > n_max)){
	    n_max=data.windows[i].seg.Nsize;   
	  }
	  
	  self.windows[l] = data.windows[i];
	  l++;
	} 	
      }

      self.n_windows=self.windows.length;
      self.min_size=min_size;
      self.n_max=n_max;
      console.log("min_size: "+self.min_size);
      console.log("n_max:"+n_max);
      
      if (typeof data.germline !='undefined'){
	var t=data.germline.split('/');
	self.system=t[t.length-1];
      }else{
	self.system="TRG";
      }
      self.loadGermline();
      self.loadAnalysis(analysis);
    }

  },//fin load
  
  
/* 
 * 
 * */
  loadGermline: function(){
    console.log("loadGermline()");
    self.germline={};
    self.germline.v={}
    self.germline.d={}
    self.germline.j={}
    var v,j;
    
    //selection germline
    switch (self.system){
      case "IGH" :
	self.germline.v=germline.IGHV;
	self.germline.j=germline.IGHJ;
	break;
	default :
	self.germline.v=germline.TRGV;
	self.germline.j=germline.TRGJ;
	break;
      }
    self.germline.vgene={};
    self.germline.jgene={};
      
    // COLOR V
    key = Object.keys(self.germline.v);
    var n=0, n2=0;
    elem2=key[0].split('*')[0];
    for (var i=0; i<key.length; i++){
      var tmp=self.germline.v[key[i]];
      self.germline.v[key[i]]={};
      self.germline.v[key[i]].seq=tmp;
      self.germline.v[key[i]].color=colorGenerator( ( 30+(i/key.length)*290 ), 
						    colorStyle.col_s, colorStyle.col_v );
      
      var elem=key[i].split('*')[0];
      if (elem != elem2) {
	self.germline.vgene[elem2]=n2;
	n++;
	n2=0;
      }
      elem2=elem;
      self.germline.v[key[i]].gene=n
      self.germline.v[key[i]].allele=n2
      n2++;
    }
    self.germline.vgene[elem2]=n2;
    
    // COLOR J
    key = Object.keys(self.germline.j);
    n=0, n2=0;
    elem2=key[0].split('*')[0];
    for (var i=0; i<key.length; i++){
      var tmp=self.germline.j[key[i]];
      self.germline.j[key[i]]={};
      self.germline.j[key[i]].seq=tmp;
      self.germline.j[key[i]].color=colorGenerator( ( 30+(i/key.length)*290 ),
						    colorStyle.col_s, colorStyle.col_v );
      var elem=key[i].split('*')[0];
      if (elem != elem2) {
	self.germline.jgene[elem2]=n2;
	n++;
	n2=0;
      }
      elem2=elem;
      self.germline.j[key[i]].gene=n
      self.germline.j[key[i]].allele=n2
      n2++;
    }
    self.germline.jgene[elem2]=n2;
  },//fin loadGermline

  
/* load the selected analysis file in the model
 * @analysis : id of the form (html element) linking to the analysis file
 * */
  loadAnalysis: function(analysis){
    console.log("loadAnalysis()");
    if (document.getElementById(analysis).files.length != 0) { 
      var oFReader = new FileReader();
      var oFile = document.getElementById(analysis).files[0];
      self = this;
      
      self.analysisFileName=document.getElementById(analysis).files[0].name;
      oFReader.readAsText(oFile);
      
      oFReader.onload = function (oFREvent) {
	var text = oFREvent.target.result;
	self.analysis = JSON.parse(text);
	self.initClones();
      }
    }else{
      self.initClones();
    }
  },//fin loadAnalysis

  
/* 
 * 
 * */
  initClones: function(){
    console.log("initClones()");
    var maxNsize=0;
    var nsize;
    self.apID = [];
    this.clones =[];
    
    //		NSIZE
    for(var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].seg) != 'undefined' && typeof(this.windows[i].seg.Nsize) != 'undefined' ){
	nsize=this.windows[i].seg.Nsize;
	if (nsize>maxNsize){maxNsize=nsize;}
      }else{
	nsize=-1;
      }
      self.apID[this.windows[i].window]=i;
      this.clones[i]={display:true, Nsize:nsize, cluster :[i], tag: default_tag};
    }
    
    //		COLOR_N
    for (var i=0; i<this.n_windows; i++){
      this.clones[i].colorN=colorGenerator( ( ((i/maxNsize)-1)*(-250) )  ,  colorStyle.col_s  , colorStyle.col_v);
    }
    
    //		SHORTNAME
    for(var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].seg) != 'undefined' && typeof(this.windows[i].seg.name) != 'undefined' ){
	this.clones[i].shortName=this.windows[i].seg.name.replace(new RegExp('IGHV', 'g'), "VH");
	this.clones[i].shortName=this.clones[i].shortName.replace(new RegExp('IGHD', 'g'), "DH");
	this.clones[i].shortName=this.clones[i].shortName.replace(new RegExp('IGHJ', 'g'), "JH");
	this.clones[i].shortName=this.clones[i].shortName.replace(new RegExp('TRG', 'g'), "");
	this.clones[i].shortName=this.clones[i].shortName.replace(new RegExp('\\*..', 'g'), "");
      }
    }
    
    //		CUSTOM TAG / NAME
    //		EXPECTED VALUE
    var c=this.analysis.custom;
    for(var i=0 ;i<c.length; i++){
      if (typeof self.apID[c[i].window] != "undefined" ){
	var f=1;
	if (typeof c[i].expected  != "undefined" ){
	  var u= this.normalizations.indexOf("highest standard");
	  if (u!=-1){
	    f=getSize([self.apID[c[i].window]])/c[i].expected;
	  }else{
	    f=jsonData.windows[mapID[c[i].window]].ratios[u]/c[i].expected;
	  }
	}
	if (f<100 && f>0.01){
	  if (typeof( c[i].tag ) != "undefined" ) {
	    this.clones[mapID[c[i].window]].tag=c[i].tag;
	  }
	  
	  if (typeof( c[i].name ) != "undefined" ) {
	    this.clones[mapID[c[i].window]].c_name=c[i].name;
	  }
	}
      }
    }
    
    //		CUSTOM CLUSTER
    var cluster=this.analysis.cluster;
    for(var i=0 ;i<cluster.length; i++){
      if (typeof self.apID[cluster[i].l] != "undefined" 
       && typeof self.apID[cluster[i].f] != "undefined" ){
	
	var new_cluster = [];
	new_cluster= new_cluster.concat(this.clones[ self.apID[cluster[i].l] ].cluster);
	new_cluster= new_cluster.concat(this.clones[ self.apID[cluster[i].f] ].cluster);
	
	this.clones[ self.apID[cluster[i].l] ].cluster=new_cluster;
	this.clones[ self.apID[cluster[i].f] ].cluster=[];
	
      }
    }
  },//fin initClones
  
  
/* 
 * 
 * */
  saveAnalysis: function(){
    console.log("saveAnalysis()")
    var analysisData ={ custom :[], cluster :[]} 
    
    for(var i=0 ;i<this.n_windows; i++){
      
      if ( ( typeof this.clones[i].tag != "undefined" && table[i].tag != 8 ) || 
      typeof this.clones[i].c_name != "undefined" ){
	
	var elem = {};
	elem.window = windows[i].window;
	if ( typeof this.clones[i].tag != "undefined" && table[i].tag != 8)
	  elem.tag = this.clones[i].tag;
	if ( typeof this.clones[i].c_name != "undefined" ) 
	  elem.name = this.clones[i].c_name;
	
	analysisData.custom.push(elem);
      }
      
      if (this.clones[i].cluster.length > 1){
	
	for (var j=0; j<this.clones[i].cluster.length; j++){
	  
	  if (this.clones[i].cluster[j] !=i){
	    var elem ={};
	    elem.l = this.windows[i].window;
	    elem.f = this.windows[ this.clones[i].cluster[j] ].window ;
	    analysisData.cluster.push(elem);
	  } 
	}
      }
    }
    var textToWrite = JSON.stringify(analysisData, undefined, 2);
    var textFileAsBlob = new Blob([textToWrite], {type:'json'});

  saveAs(textFileAsBlob, "analysis.json");
  },//fin saveAnalysis
  
  
/* 
 * 
 * */
  resetAnalysis :function(){
    console.log("resetAnalysis()");
    this.analysis ={ custom :[], cluster :[], date :[]} ;
    this.initClones();
  },
  
  
/* 
 * 
 * */
  changeName : function(cloneID, newName){
    console.log("changeName() (clone "+cloneID+" <<"+newName+")");
    this.clones[cloneID].c_name = newName;
  },//fin changeName,
  
  
/* renvoye le nom attribué au clone par l'utilisateur,
 * si aucun nom attribué renvoye le code
 * 
 * */
  getName : function(cloneID){
    console.log("getName() (clone "+cloneID+")");
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if ( typeof(this.clones[cloneID].c_name)!='undefined' ){
      return this.clones[cloneID].c_name;
    }else{
      return this.getCode(cloneID);
    }
  },//fin getName

/* renvoye le code du clone format "geneV -x/y/-z geneJ",
 * si IGH renvoye un format réduit du code,
 * si clone non segmenté renvoye la window
 * 
 * */
  getCode : function(cloneID){
    console.log("getCode() (clone "+cloneID+")");
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if ( typeof(this.windows[cloneID].seg)!='undefined' && typeof(this.windows[cloneID].seg.name)!='undefined' ){
      if ( system=="IGH" && typeof(this.windows[cloneID].seg.shortName)!='undefined' ){
	return this.windows[cloneID].seg.shortName;
      }
      else{
	return this.windows[cloneID].seg.name;
      }
    }else{
      return this.windows[cloneID].window;
    }
  },//fin getCode
  
  
/* 
 * 
 * */
  getSize : function(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    var result=0;
      for(var j=0 ;j<this.clones[cloneID].cluster.length; j++){
	result += this.windows[this.clones[cloneID].cluster[j]].ratios[this.t][this.r];}
    return result
  },//fin getSize
  
  
/* 
 * 
 * */
  changeRatio : function(newR){
    console.log("changeRatio()")
    this.r=newR;
  },
  
  
/* 
 * 
 * */
  focusIn : function(cloneID){
    console.log("focusIn() (clone "+cloneID+")")
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    this.clones[cloneID].focus=true;
  },
  
  
/* 
 * 
 * */
  focusOut : function(cloneID){
    console.log("focusOut() (clone "+cloneID+")")
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    this.clones[cloneID].focus=false;
  },
  
/* 
 * 
 * */
  select : function(cloneID){
    console.log("select() (clone "+cloneID+")")
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if (this.clones[cloneID].select){
      this.unselect(cloneID); 
    }else{
      this.clones[cloneID].select=true;
    }
  },
  
/* 
 * 
 * */
  unselect :function(cloneID){
    console.log("unselect() (clone "+cloneID+")")
    if (this.clones[cloneID].select){
      this.clones[cloneID].select=false;
      this.clones[cloneID].focus=false;
    }
  },
  
/* 
 * 
 * */
  unselectAll :function(){
    console.log("unselectAll()")
    for (var i=0; i< this.n_windows ; i++){
      if(this.clones[i].select){
	this.clones[i].select=false; 
      }
    }
  },
  
/* 
 * 
 * */
  getSelected :function(){
    console.log("getSelected()")
    var result=[]
    for (var i=0; i< this.n_windows ; i++){
      if(this.clones[i].select){
	result.push(i);
      }
    }
    return result
  },
  
  
/* 
 * 
 * */
  merge :function(){
    console.log("merge()")
    var new_cluster = [];
    var list=this.getSelected()
    var leader;
    var top=200;
      
    for (var i = 0; i<list.length ; i++){
      if(this.windows[list[i]].top < top) {
	leader=list[i];
	top=this.windows[list[i]].top;
      }
      new_cluster= new_cluster.concat(this.clones[list[i]].cluster);
      this.clones[list[i]].cluster=[];
    }
      
    this.clones[leader].cluster=new_cluster;
    this.unselectAll()
    this.select(leader)
  },
  
  
/* 
 * 
 * */
  split :function(cloneIDa, cloneIDb){
    console.log("merge() (cloneA "+cloneIDa+" cloneB "+cloneIDb+")")
    if (cloneIDa==cloneIDb) return
     
    var nlist = this.clones[cloneIDa].cluster;
    var index = nlist.indexOf(cloneIDb);
    if (index == -1) return
      
    nlist.splice(index, 1);
    
    this.clones[cloneIDa].cluster=nlist;
    this.clones[cloneIDb].cluster=[cloneIDb];
    this.clones[cloneIDa].focus=false;
    this.clones[cloneIDb].focus=false;
    
  },
  
}//fin prototypage Model

var m = new Model();



  