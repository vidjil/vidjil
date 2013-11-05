/* VIDJIL
 * License blablabla
 * date: 28/10/2013
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
  this.focus=-1;
  this.colorMethod="Tag";
  this.view=[];
  this.mapID={};
  this.top=10;
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
    self.windows = [];
    self.mapID={}
    self.dataFileName= document.getElementById(data).files[0].name;
    oFReader.readAsText(oFile);
    
    oFReader.onload = function (oFREvent) {
      var data =JSON.parse( oFREvent.target.result);
      if (typeof(data.timestamp) =='undefined'){
	popupMsg(msg.version_error);
	return 0;
      }
      
      //keep best top value
      for(var i=0; i < data.windows.length; i++){
	if (data.windows[i].top <= limit){

	  //search for min_size
	  for(var j=0 ; j<data.windows[i].ratios.length; j=j+2){
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
	  self.windows.push(data.windows[i]);
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

      for (var i=0; i< self.n_windows; i++){
	self.mapID[self.windows[i].window]=i;
      }
      
      self.loadGermline();
      self.loadAnalysis(analysis);
    }

  },//end load
  
  
/* charge le germline définit a l'initialisation dans le model
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
						    color_s, color_v );
      
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
						    color_s, color_v );
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
    self.mapID = [];
    this.clones =[];
    
    //		NSIZE
    for(var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].seg) != 'undefined' && typeof(this.windows[i].seg.Nsize) != 'undefined' ){
	nsize=this.windows[i].seg.Nsize;
	if (nsize>maxNsize){maxNsize=nsize;}
			}else{
	nsize=-1;
      }
      self.mapID[this.windows[i].window]=i;
      this.clones[i]={display:true, Nsize:nsize, cluster :[i], tag: default_tag};
    }
    
    //		COLOR_N
    for (var i=0; i<this.n_windows; i++){
      this.clones[i].colorN=colorGenerator( ( ((this.clones[i].Nsize/maxNsize)-1)*(-250) )  ,  color_s  , color_v);
    }
    
    //		COLOR_V
    for (var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].seg.V) != 'undefined'){
	var vGene=this.windows[i].seg.V[0];
	this.clones[i].colorV=this.germline.v[vGene].color;
      }else{
	this.clones[i].colorV=default_color;
      }
    }
    
    //		COLOR_J
    for (var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].seg.J) != 'undefined'){
	var jGene=this.windows[i].seg.J[0];
	this.clones[i].colorJ=this.germline.j[jGene].color;
      }else{
	this.clones[i].colorJ=default_color;
      }	
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
      if (typeof this.mapID[c[i].window] != "undefined" ){
	var f=1;
	if (typeof c[i].expected  != "undefined" ){
	  var u= this.normalizations.indexOf("highest standard");
	  if (u!=-1){
	    f=this.getSize([this.mapID[c[i].window]])/c[i].expected;
	  }else{
	    f=jsonData.windows[this.mapID[c[i].window]].ratios[u]/c[i].expected;
	  }
	}
	if (f<100 && f>0.01){
	  if (typeof( c[i].tag ) != "undefined" ) {
	    this.clones[this.mapID[c[i].window]].tag=c[i].tag;
	  }

	  if (typeof( c[i].name ) != "undefined" ) {
	    this.clones[this.mapID[c[i].window]].c_name=c[i].name;
	  }
	}
      }
    }
    
    //		CUSTOM CLUSTER
    var cluster=this.analysis.cluster;
    for(var i=0 ;i<cluster.length; i++){
      if (typeof self.mapID[cluster[i].l] != "undefined" 
       && typeof self.mapID[cluster[i].f] != "undefined" ){
	
	var new_cluster = [];
	new_cluster= new_cluster.concat(this.clones[ self.mapID[cluster[i].l] ].cluster);
	new_cluster= new_cluster.concat(this.clones[ self.mapID[cluster[i].f] ].cluster);

	this.clones[ self.mapID[cluster[i].l] ].cluster=new_cluster;
	this.clones[ self.mapID[cluster[i].f] ].cluster=[];
	
      }
    }

		this.init()
  },//end initClones
  
  
/* generate à json file from user analysis currently applied
 * 
 * */
  saveAnalysis: function(){
    console.log("saveAnalysis()")
    var analysisData ={ custom :[], cluster :[]} 
    
    for(var i=0 ;i<this.n_windows; i++){
      
      if ( ( typeof this.clones[i].tag != "undefined" && this.clones[i].tag != 8 ) || 
	typeof this.clones[i].c_name != "undefined" ){

	var elem = {};
	elem.window = this.windows[i].window;
	if ( typeof this.clones[i].tag != "undefined" && this.clones[i].tag != 8)
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
  
/* give a new custom tag to a clone
 * 
 * */
  changeTag : function(cloneID, newTag){
    console.log("changeTag() (clone "+cloneID+" <<"+newTag+")");
    this.clones[cloneID].tag=newTag;
    if (newTag==8) { 
      delete(this.clones[cloneID].tag)
    }
    this.updateElem([cloneID]);
  },
  
/* return custom name of cloneID,
 * or return segmentation name
 * 
 * */
  getName : function(cloneID){
    if ( typeof(this.clones[cloneID].c_name)!='undefined' ){
      return this.clones[cloneID].c_name;
    }else{
      return this.getCode(cloneID);
    }
  },//end getName

/* return segmentation name "geneV -x/y/-z geneJ",
 * return a short segmentation name if system == IGH,
 * 
 * */
  getCode : function(cloneID){
    if ( typeof(this.windows[cloneID].seg)!='undefined' && typeof(this.windows[cloneID].seg.name)!='undefined' ){
      if ( this.system=="IGH" && typeof(this.windows[cloneID].seg.shortName)!='undefined' ){
	return this.windows[cloneID].seg.shortName;
      }
      else{
	return this.windows[cloneID].seg.name;
      }
    }else{
      return this.windows[cloneID].window;
    }
  },//end getCode
  
  
/* compute the clone size ( sum of all windows clustered )
 * @t : tracking point (default value : current tracking point)
 * */
  getSize : function(cloneID, time){
    time = typeof time !== 'undefined' ? time : this.t; 
    var result=0;
    for(var j=0 ;j<this.clones[cloneID].cluster.length; j++){
      result += this.windows[this.clones[cloneID].cluster[j]].ratios[time][this.r];}
    return result
  },//end getSize

/* return the clone size with a fixed number of character
 * use scientific notation if neccesary
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

/* return the clone color
 * 
 * */
  getColor : function(cloneID){
    if (this.focus==cloneID) {
      return focus_color;
    }
    if (!this.clones[cloneID].active) {
      return default_color;
    }
    if (typeof(this.windows[cloneID].seg.V) != 'undefined'){
      if (this.colorMethod=="V") {
      	return this.clones[cloneID].colorV;
      }
      if (this.colorMethod=="J") {
      	return this.clones[cloneID].colorJ;
      }
      if (this.colorMethod=="N") {
      	return this.clones[cloneID].colorN;
      }
      if (this.colorMethod=="Tag") {
      	return tagColor[this.clones[cloneID].tag];
      }
      if (this.colorMethod=="abundance") {
      	return tagColor[this.clones[cloneID].tag];
      }
    }
    return default_color;
  },

/*
 *
 * */
  changeColorMethod : function(colorM){
    this.colorMethod=colorM;
    this.update();
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
    var tmp=this.focus;

    if (tmp!=cloneID){
	this.focus=cloneID;
      if (tmp!=-1){
	this.updateElem([cloneID, tmp]);
      }else{
	this.updateElem([cloneID]);
      }
    }
  },
  
  
/* remove focus marker
 * 
 * */
  focusOut : function(){
    var tmp = this.focus;
    this.focus=-1;
    if (tmp!=-1) this.updateElem([tmp]);
  },
  

/* put a clone in the selection
 * 
 * */
  select : function(cloneID){
    console.log("select() (clone "+cloneID+")")
    
    if (this.clones[cloneID].select){
      this.unselect(cloneID); 
    }else{
      this.clones[cloneID].select=true;
    }
    this.updateElem([cloneID]);
  },
  

/* kick a clone out of the selection
 * 
 * */
  unselect :function(cloneID){
    console.log("unselect() (clone "+cloneID+")")
    if (this.clones[cloneID].select){
      this.clones[cloneID].select=false;
    }
    this.updateElem([cloneID]);
  },
 
 
/* kick all clones out of the selection
 * 
 * */
  unselectAll :function(){
    console.log("unselectAll()")
    var list=this.getSelected();
    for (var i=0; i< list.length ; i++){
      this.clones[list[i]].select=false; 
    }
    this.updateElem(list);
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
  
  
/* merge all clones currently in the selection into one
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
  
  
/* sépare une window d'un clone
 * 
 * */
  split :function(cloneID, windowID){
    console.log("split() (cloneA "+cloneID+" windowB "+windowID+")")
    if (cloneID==windowID) return
     
    var nlist = this.clones[cloneID].cluster;
    var index = nlist.indexOf(windowID);
    if (index == -1) return
      
    nlist.splice(index, 1);

    //le clone retrouve sa liste de windows -1
    this.clones[cloneID].cluster=nlist;
    //la window forme son propre clone a part
    this.clones[windowID].cluster=[windowID];
		
    this.updateElem([windowID,cloneID]);    
  },
  
  
/* resize all views
 * 
 * */
  resize :function(){
    for (var i=0; i<this.view.length; i++){
      this.view[i].resize();
    }
  },
  

/* 
 * 
 * */
  updateModel :function(){
    for (var i=0; i<this.n_windows; i++){
      if (this.clones[i].cluster.length!=0 && this.windows[i].top < this.top && tagDisplay[this.clones[i].tag] == 1 ){
	this.clones[i].active=true;
      }else{
	this.clones[i].active=false;
      }
    }   
    for (var i=0; i<this.n_windows; i++){
      this.clones[i].color=this.getColor(i);
    }
  },
  

/*
 * 
 * */
  updateModelElem :function(list){
    for (var i=0 ; i < list.length ; i++){
      if (this.clones[list[i]].cluster.length!=0 && this.windows[list[i]].top < this.top && tagDisplay[this.clones[list[i]].tag] == 1 ){
	this.clones[list[i]].active=true;
      }else{
	this.clones[list[i]].active=false;
      }   
    }
    for (var i=0 ; i < list.length ; i++){
      this.clones[list[i]].color=this.getColor(list[i]);
    }
  },
  

/*update all views
 * 
 * */
  update :function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
    this.updateModel();
    for (var i=0; i<this.view.length; i++){
      this.view[i].update();
    }
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update() : " +elapsedTime);  
  },


/*update a clone list in all views
 * 
 * */
  updateElem :function(list){
    this.updateModelElem(list);
    for (var i=0; i<this.view.length; i++){
      this.view[i].updateElem(list);
    }
  },


/*init all views
 * 
 * */
  init :function(){
    for (var i=0; i<this.view.length; i++){
      this.view[i].init();
    }
    this.displayTop();
  },
  

/* define a minimum top rank required for a clone to be displayed
 * 
 * */
  displayTop : function(top){
    top = typeof top !== 'undefined' ? top : this.top; 
    this.top=top;
    document.getElementById('rangeValue').value=top;
    document.getElementById('top_display').innerHTML=top;
    this.update();
  },


/* increase the minimum top rank required
 * 
 * */
  incDisplayTop : function(){
    if (this.top<100){ 
      this.top=this.top+5;
      this.displayTop();
    }
  },


/* decrease the minimum top rank required
 * 
 * */  
  decDisplayTop : function(){
    if (this.top>0){ 
      this.top=this.top-5;
      this.displayTop();
    }
  },
  

}//end prototype Model





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



  function showSelector(elem){
    if ($('#'+elem).css('display') == 'none'){
      $('.selector').stop()
      $('.selector').css('display','none'); 
      $('#'+elem).animate({ height: "show", display: "show"}, 100 ); 
    }
  }
  
  function hideSelector(){
    $('.selector').stop();
    $('.selector').animate({ height: "hide", display: "none"}, 100 ); 
  }
 

function initCoef(){
	m.resize();
};

/*appel a chaque changement de taille du navigateur*/
window.onresize = initCoef;


  function switchVisu(hv1,hv2){
  
  $('#visu2').animate({height: hv1+"%"}, 400 , function(){
    m.resize();
  }); 
  $('#visu').animate({height: hv2+"%"}, 400 ); 
}

  function showDisplayMenu(){
    $('#display-menu').stop
    $('#display-menu').toggle("fast");
  }


  function popupMsg(msg){
    document.getElementById("popup-container").style.display="block";
    
    document.getElementById("popup-msg").innerHTML+=msg;
  }
  
  function closePopupMsg(){
    document.getElementById("popup-container").style.display="none";
    document.getElementById("popup-msg").innerHTML="";
  }
  
  var msg= {
    "align_error" : "ERROR : align fail , this can be due to connection problem with the cgi server "
    +"</br> please check your internet connection and retry"
    +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>Ok</button></div>",
    
    "version-error" : "ERROR : incorrect data file"
    +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>Ok</button></div>",
    
    "welcome" : "<h2> Welcome,</h2> This is the Vidjil's beta interface. "
    +"</br> Compatible with google chrome and mozilla firefox browsers"
    +"</br></br> <div class='center' > <button onclick='loadData(), closePopupMsg()'>start</button></div>",
    
  }
  
