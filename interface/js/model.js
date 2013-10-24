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
 */


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
  

/*Model constructor
 * 
 * */
function Model(){
  console.log("creation Model")
  this.analysis ={ custom :[], cluster :[], date :[]} ;
  this.t=0;
  this.r=0;
  this.view=[];
}


Model.prototype = {


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
    var min_size = 1;
    var n_max=0;
    var l=0;
    self.windows = [];
    self.dataFileName= document.getElementById(data).files[0].name;
    oFReader.readAsText(oFile);
    
    oFReader.onload = function (oFREvent) {
      var data =JSON.parse( oFREvent.target.result);
      if (typeof(data.timestamp) =='undefined'){
	//TODO message d'erreur
	return 0;
      }
      
      //keep best top value
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
      self.normalizations = data.normalizations;
      self.total_size = data.total_size;
      self.resolution1 = data.resolution1;
      self.resolution5 = data.resolution5;
      self.timestamp = data.timestamp;
      self.time = data.time;

      
      //extract germline
      if (typeof data.germline !='undefined'){
	var t=data.germline.split('/');
	self.system=t[t.length-1];
      }else{
	self.system="TRG";
      }
      
      self.loadGermline();
      self.loadAnalysis(analysis);
    }

  },//end load
  
  
/* charge le germline définit a l'initialisation dans le modele
 * détermine le nombre d'allele pour chaque gene et y attribue une couleur
 * */
  loadGermline: function(){
    console.log("loadGermline()");
    self.germline={};
    self.germline.v={}
    self.germline.d={}
    self.germline.j={}
    var v,j;
    
    //select germline (default TRG)
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
  },//end loadGermline

  
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
  },//end loadAnalysis

  
/* initializes clones with analysis file data
 * and store some info about them (N color / shortName /...)
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
  },//end initClones
  
  
/* generate à json file from user analysis currently applied
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
  },//end saveAnalysis
  
  
/* erase all changes 
 * 
 * */
  resetAnalysis :function(){
    console.log("resetAnalysis()");
    this.analysis ={ custom :[], cluster :[], date :[]} ;
    this.initClones();
  },
  
  
/* give a new custom name to a clone
 * 
 * */
  changeName : function(cloneID, newName){
    console.log("changeName() (clone "+cloneID+" <<"+newName+")");
    this.clones[cloneID].c_name = newName;
    this.updateElem(cloneID);
  },//fin changeName,
  
/* give a new custom name to a clone
 * 
 * */
  changeTag : function(cloneID, newTag){
    console.log("changeTag() (clone "+cloneID+" <<"+newTag+")");
    this.clones[cloneID].tag=newTag;
    if (newTag==8) { 
      delete(this.clones[cloneID].tag)
    }
    this.updateElem(cloneID);
  },
  
/* renvoye le nom attribué au clone par l'utilisateur,
 * si aucun nom attribué renvoye le code
 * 
 * */
  getName : function(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    
    if ( typeof(this.clones[cloneID].c_name)!='undefined' ){
      return this.clones[cloneID].c_name;
    }else{
      return this.getCode(cloneID);
    }
  },//end getName

/* renvoye le code du clone format "geneV -x/y/-z geneJ",
 * si IGH renvoye un format réduit du code,
 * si clone non segmenté renvoye la window
 * 
 * */
  getCode : function(cloneID){
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
  },//end getCode
  
  
/* compute the size of a clone ( sum of all windows clustered )
 * @t : tracking point (default value : current tracking point)
 * */
  getSize : function(cloneID, time){
    time = typeof time !== 'undefined' ? time : this.t; 
    
    var result=0;
      for(var j=0 ;j<this.clones[cloneID].cluster.length; j++){
	result += this.windows[this.clones[cloneID].cluster[j]].ratios[time][this.r];}
    return result
  },//end getSize

/* 
 * 
 * */
  getStrSize : function(cloneID){
	var size = this.getSize(cloneID);
        var result;
        if (size==0){
	  result="-∕-";
	}else{
	  if (size<0.0001){
	    result=(size).toExponential(1);
	  }else{
	    result=(100*size).toFixed(3)+"%";
	  }
	}
    return result
  },
  
/* use another ratio to compute clone size
 * 
 * */
  changeRatio : function(newR){
    console.log("changeRatio()")
    this.r=newR;
    this.update();
  },
  
  
/* change the current tracking point used
 * 
 * */
  changeTime : function(newT){
    console.log("changeTime()")
    this.t=newT;
    this.update();
  },
  
  
/* put a marker on a specific clone
 * 
 * */
  focusIn : function(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    this.clones[cloneID].focus=true;
  },
  
  
/* 
 * 
 * */
  focusOut : function(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    this.clones[cloneID].focus=false;
  },
  
/* put a clone in the selection
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
  
/* kick a clone from the selection
 * 
 * */
  unselect :function(cloneID){
    console.log("unselect() (clone "+cloneID+")")
    if (this.clones[cloneID].select){
      this.clones[cloneID].select=false;
      this.clones[cloneID].focus=false;
    }
  },
  
/* kick all clones from the selection
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
  
/* return clones currently in the selection
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
  
  
/*resize toute les vues associées 
 * 
 * */
  resize :function(){
    for (var i=0; i<this.view.length; i++){
      this.view[i].resize();
    }
    initStyle();
  },
  
  
/*update toute les vues associées 
 * 
 * */
  update :function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
    for (var i=0; i<this.view.length; i++){
      this.view[i].update();
    }
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update() : " +elapsedTime);  
  },
  
/*update l'element cloneID dans toute les vues associées 
 * 
 * */
  updateElem :function(cloneID){
    for (var i=0; i<this.view.length; i++){
      this.view[i].updateElem(cloneID);
    }
  },

/*init toute les vues associées 
 * 
 * */
  init :function(){
    for (var i=0; i<this.view.length; i++){
      this.view[i].init();
    }
  },
  
}//fin prototypage Model

var m = new Model();
























//TODO a deplacer

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


function initCoef(){
  initStyle();//TODO a supprimer
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;


function switchVisu(hv1,hv2){
  
  $('#visu2').animate({height: hv1+"%"}, 400 , function(){
    m.resize();
  }); 
  $('#visu').animate({height: hv2+"%"}, 400 ); 
}


  