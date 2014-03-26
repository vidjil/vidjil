/*
 * This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
 * Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr> and the Vidjil Team
 * Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
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

/*
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

VIDJIL_JSON_VERSION = '2014.02'

/*Model constructor
 * 
 * */
function Model(){
  console.log("creation Model")
  this.analysis ={ custom :[], cluster :[], date :[]} ;
  this.t=0;
  this.norm=false;
  this.focus=-1;
  this.colorMethod="Tag";
  this.view=[];
  this.mapID={};
  this.top=10;
  this.precision=1;
  this.time_order=[];
  
  this.notation_type = "percent"
  
  this.checkBrowser()
}


Model.prototype = {


/* load the selected data/analysis file in the model
 * @data : id of the form (html element) linking to the data file
 * @analysis : id of the form (html element) linking to the analysis file
 * impossible to use direct path to input files, need a fakepath from input form 
 * @limit : minimum top value to keep a window*/
  load : function(data, analysis, limit){
    var self = this;
    
    console.log("load()");
    
    if (document.getElementById(data).files.length === 0) { return; }
    
    var oFReader = new FileReader();
    var oFile = document.getElementById(data).files[0];
    self.dataFileName= document.getElementById(data).files[0].name;
    oFReader.readAsText(oFile);
    
    oFReader.onload = function (oFREvent) {
      try{
	var data =JSON.parse( oFREvent.target.result);
      }catch(e){
	popupMsg(msg.file_error);
	return 0
      }
      if ((typeof(data.vidjil_json_version) =='undefined')
	  || (data.vidjil_json_version < VIDJIL_JSON_VERSION)){
	popupMsg(msg.version_error);
	return 0;
      }
     self.parseJsonData(data, limit)
    .loadGermline()
    .loadAnalysis(analysis);
      
    }


  },//end load
  
  parseJsonData : function(data, limit){
    self=this;
    self.windows = [];
    self.mapID={}
    self.dataCluster = []
    var min_size = 1;
    var n_max=0;
    var n2_max=0; //TODO rename
	
	var min_nf=1;
	for(var k=0 ; k < data.normalization_factor.length; k++){
		if (min_nf > data.normalization_factor[k])
		min_nf=data.normalization_factor[k];
	}
	
    //keep best top value
    for(var i=0; i < data.windows.length; i++){
      if (data.windows[i].top <= limit){

		//search for min_size
		for(var k=0 ; k<data.windows[i].size.length; k++){
			var size =(data.windows[i].size[k]/data.reads_segmented[k])*min_nf;
			
			if (min_size > size && data.windows[i].size[k] != 0)
			min_size=size;
		}

		//search for n_max / n2_max
		if ((typeof(data.windows[i].sequence) != 'undefined') && 
			(typeof(data.windows[i].Nlength) != 'undefined') &&
			(data.windows[i].Nlength > n_max)){
			n_max=data.windows[i].Nlength;   
		}
		
		/*
		var n2=0;
		if ((typeof(data.windows[i].sequence) != 'undefined') && 
		(typeof(data.windows[i].Nlength) != 'undefined')){
		n2=data.windows[i].name.split('/')[1];
		if (n2>n2_max)n2_max=n2;  
		}
		data.windows[i].n=n2
		*/
		self.windows.push(data.windows[i]);
      } 	
    }
    
    var other = { "sequence" : 0,
		 "window": "other", 
		 "top": 0, 
		 "size": []
    }
    
    self.windows.push(other);
    
    var count=min_size;

    while (count<1){
      count=count*10;
      self.precision= self.precision*10;
    }

    self.n_windows=self.windows.length;
    self.min_size=min_size;
    self.n_max=n_max;
    self.n2_max=n2_max;
    self.normalization_factor = data.normalization_factor;
    self.reads_segmented = data.reads_segmented;
    self.reads_segmented_total = self.reads_segmented.reduce(function(a, b) { return a + b; });
    self.reads_total = data.reads_total;
    if (self.reads_total){
        self.reads_total_total = self.reads_total.reduce(function(a, b) { return a + b; });
    }else{
        self.reads_total_total=self.reads_segmented_total;
        self.reads_total=self.reads_segmented;
    }
    self.timestamp = data.timestamp;
    self.time = data.point;
    self.scale_color = d3.scale.log()
    .domain([1,self.precision])
    .range([250,0]);
    for (var i=0; i<self.time.length; i++) self.time_order.push(i);
    
    var html_container=document.getElementById("info_n_max");
    if (html_container!=null)html_container.innerHTML=" N = "+self.n_max;
    
    html_container=document.getElementById("info_n2_max");
    if (html_container!=null)html_container.innerHTML=" N = "+self.n2_max;
    
    //extract germline
    if (typeof data.germline !='undefined'){
      var t=data.germline.split('/');
      self.system=t[t.length-1];
    }else{
      self.system="TRG";
    }
    
    html_container=document.getElementById("info_system");
    if (html_container!=null)html_container.innerHTML="germline: " +self.system;

    for (var i=0; i< self.n_windows; i++){
      self.mapID[self.windows[i].window]=i;
    }
    
    var tmp = {}
    // init clones
    if (data.clones){
		for ( var i=0; i< data.clones.length; i++){
			var cl = {}
			cl.cluster = []
			for ( var j=0; j<data.clones[i].cluster.length; j++){
				if (self.mapID[data.clones[i].cluster[j]] || self.mapID[data.clones[i].cluster[j]]=="0"){
					cl.cluster.push(self.mapID[data.clones[i].cluster[j]])
				}
			}
			if (data.clones[i].name){
				cl.name=data.clones[i].name
			}else{
                cl.name="cluster "+i
            }
			
			//fuse cluster with same name
			if (cl.cluster.length!=0){
                if (!tmp[cl.name]){
                    tmp[cl.name] = cl
                    tmp[cl.name].cluster.sort()
                }else{
                    tmp[cl.name].cluster = tmp[cl.name].cluster.concat(cl.cluster)
                    tmp[cl.name].cluster.sort()
                }
			}
		}
		
		for (var key in tmp){
            self.dataCluster.push(tmp[key])
        }

	}
    
    return this
  },
  
  
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
      case "TRB" :
    self.germline.v=germline.TRBV;
    self.germline.j=germline.TRBJ;
    break;
      case "TRG" :
    self.germline.v=germline.TRGV;
    self.germline.j=germline.TRGJ;
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
	self.germline.vgene[elem2]={};
	self.germline.vgene[elem2].n=n2;
	self.germline.vgene[elem2].color=colorGenerator( ( 30+((i-1)/key.length)*290 ), 
						    color_s, color_v );
	n++;
	n2=0;
      }
      elem2=elem;
      self.germline.v[key[i]].gene=n
      self.germline.v[key[i]].allele=n2
      n2++;
    }
    self.germline.vgene[elem2]={};
    self.germline.vgene[elem2].n=n2;
    self.germline.vgene[elem2].color=colorGenerator( ( 30+((i-1)/key.length)*290 ), 
						color_s, color_v );
    
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
	self.germline.jgene[elem2]={};
	self.germline.jgene[elem2].n=n2;
	self.germline.jgene[elem2].color=colorGenerator( ( 30+((i-1)/key.length)*290 ),
						    color_s, color_v );
	n++;
	n2=0;
      }
      elem2=elem;
      self.germline.j[key[i]].gene=n
      self.germline.j[key[i]].allele=n2
      n2++;
    }
    self.germline.jgene[elem2]={};
    self.germline.jgene[elem2].n=n2;
    self.germline.jgene[elem2].color=colorGenerator( ( 30+((i-1)/key.length)*290 ),
						color_s, color_v );
    
	
    // V gene used
	self.usedV = {}

	for ( var i=0; i< self.windows.length; i++){
		if (self.windows[i].V && self.windows[i].V[0] && self.germline.v[self.windows[i].V[0]] ){
			var elem=self.windows[i].V[0].split('*')[0];
			if (self.usedV[elem]){
				self.usedV[elem]++
			}else{
				self.usedV[elem]=1
			}
		}
	}
	
	var keys = Object.keys(self.germline.vgene)
	var order=1;
	for ( var i=0; i< keys.length; i++){
		if (self.usedV[keys[i]]){
			self.usedV[keys[i]]=order;
			order++
		}
	}
	
	
    return this;
  },//end loadGermline

  
/* load the selected analysis file in the model
 * @analysis : id of the form (html element) linking to the analysis file
 * */
    loadAnalysis: function(analysis){
        var self = this
        
        console.log("loadAnalysis()");
        if (document.getElementById(analysis).files.length != 0) { 
            var oFReader = new FileReader();
            var oFile = document.getElementById(analysis).files[0];
            
            self.analysisFileName=document.getElementById(analysis).files[0].name;
            
            oFReader.readAsText(oFile);
            
            oFReader.onload = function (oFREvent) {
                var text = oFREvent.target.result;
                self.analysis = JSON.parse(text);
                if (self.analysis.time && ( self.analysis.time.length == self.time.length ) ){
                    self.time = self.analysis.time;
                    self.time_order =self.analysis.time_order;
                }
                self.initClones();
            }
        }else{
            self.initClones();
        }
        
        return this;
    },//end loadAnalysis

  
/* initializes clones with analysis file data
 * 
 * */
  initClones: function(){
    console.log("initClones()");
    var maxNlength=0;
    var nsize;
    self.mapID = [];
    this.clones = [];
    
    //		NSIZE
    for(var i=0; i<this.n_windows; i++){
        
    if (!this.windows[i].Nlength){
        this.windows[i].Nlength=0;
    }
    
        
      if (typeof(this.windows[i].sequence) != 'undefined'){
	nsize=this.windows[i].Nlength;
	if (nsize>maxNlength){maxNlength=nsize;}
			}else{
	nsize=-1;
      }
      self.mapID[this.windows[i].window]=i;
      this.clones[i]={cluster:[i] , split: false};
      this.windows[i].Nlength=nsize;
      this.windows[i].tag=default_tag;
    }
    console.log(maxNlength);
    //		COLOR_N
    for (var i=0; i<this.n_windows; i++){
      this.windows[i].colorN=colorGenerator( ( ((this.windows[i].Nlength/maxNlength)-1)*(-250) )  ,  color_s  , color_v);
    }
    
    //		COLOR_N2
    for (var i=0; i<this.n_windows; i++){
      this.windows[i].colorN2=colorGenerator( ( ((this.windows[i].n/this.n2_max)-1)*(-250) )  ,  color_s  , color_v);
    }
    
    //		COLOR_V
    for (var i=0; i<this.n_windows; i++){
        if (typeof(this.windows[i].V) != 'undefined' && this.germline.v[this.windows[i].V[0]]){
            var vGene=this.windows[i].V[0];
            this.windows[i].colorV=this.germline.v[vGene].color;
        }else{
            this.windows[i].colorV=color['@default'];
        }
    }
    
    //		COLOR_J
    for (var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].J) != 'undefined' && this.germline.j[this.windows[i].J[0]]){
	var jGene=this.windows[i].J[0];
	this.windows[i].colorJ=this.germline.j[jGene].color;
      }else{
	this.windows[i].colorJ=color['@default'];
      }	
    }
    
    //		SHORTNAME
    for(var i=0; i<this.n_windows; i++){
      if (typeof(this.windows[i].sequence) != 'undefined' && typeof(this.windows[i].name) != 'undefined' ){
	this.windows[i].shortName=this.windows[i].name.replace(new RegExp('IGHV', 'g'), "VH");
	this.windows[i].shortName=this.windows[i].shortName.replace(new RegExp('IGHD', 'g'), "DH");
	this.windows[i].shortName=this.windows[i].shortName.replace(new RegExp('IGHJ', 'g'), "JH");
	this.windows[i].shortName=this.windows[i].shortName.replace(new RegExp('TRG', 'g'), "");
	this.windows[i].shortName=this.windows[i].shortName.replace(new RegExp('\\*..', 'g'), "");
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
	    this.windows[this.mapID[c[i].window]].tag=c[i].tag;
	  }

	  if (typeof( c[i].name ) != "undefined" ) {
	    this.windows[this.mapID[c[i].window]].c_name=c[i].name;
	  }
	}
      }
    }
    
    //		DATA CLUSTER
    this.dataCluster.sort(function(a,b){return b.cluster[0]-a.cluster[0]})
    for (var i=0 ; i<this.dataCluster.length; i++){
		var new_cluster = [];
		for (var j=0 ; j<this.dataCluster[i].cluster.length; j++){
			new_cluster = new_cluster.concat(this.clones[this.dataCluster[i].cluster[j]].cluster);
			this.clones[this.dataCluster[i].cluster[j]].cluster=[]
		}
		this.clones[this.dataCluster[i].cluster[0]].cluster=new_cluster
		this.clones[this.dataCluster[i].cluster[0]].name=this.dataCluster[i].name
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
            
            //tag and custom name
            if ( ( typeof this.windows[i].tag != "undefined" && this.windows[i].tag != 8 ) 
                || typeof this.windows[i].c_name != "undefined" ){

                var elem = {};
                elem.window = this.windows[i].window;
                
                if ( typeof this.windows[i].tag != "undefined" && this.windows[i].tag != 8)
                    elem.tag = this.windows[i].tag;
                if ( typeof this.windows[i].c_name != "undefined" ) 
                    elem.name = this.windows[i].c_name;

                analysisData.custom.push(elem);
            }
            
            //clones / cluster
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
        
        //name time/point
        analysisData.time = this.time
        analysisData.time_order = this.time_order
        
        var textToWrite = JSON.stringify(analysisData, undefined, 2);
        var textFileAsBlob = new Blob([textToWrite], {type:'json'});

        var ext = this.dataFileName.lastIndexOf(".")
        var filename = this.dataFileName.substr(0, ext)
        
        saveAs(textFileAsBlob, filename+".analysis");
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
    this.windows[cloneID].c_name = newName;
    this.updateElem([cloneID]);
  },//fin changeName,
  
/* give a new custom tag to a clone
 * 
 * */
  changeTag : function(cloneID, newTag){
    newTag=""+newTag
    newTag=newTag.replace("tag", "");
    console.log("changeTag() (clone "+cloneID+" <<"+newTag+")");
    this.windows[cloneID].tag=newTag;
    this.updateElem([cloneID]);
  },
  
/* return clone name
 * or return name of the representative sequence of the clone
 * 
 * */
  getName : function(cloneID){
    if ( this.clones[cloneID].name ){
      return this.clones[cloneID].name;
    }else{
      return this.getSequenceName(cloneID);
    }
  },//end getCloneName
  
/* return custom name of cloneID,
 * or return segmentation name
 * 
 * */
  getSequenceName : function(cloneID){
    if ( typeof(this.windows[cloneID].c_name)!='undefined' ){
      return this.windows[cloneID].c_name;
    }else{
      return this.getCode(cloneID);
    }
  },//end getName

/* return segmentation name "geneV -x/y/-z geneJ",
 * return a short segmentation name if system == IGH,
 * 
 * */
  getCode : function(cloneID){
    if ( typeof(this.windows[cloneID].sequence)!='undefined' && typeof(this.windows[cloneID].name)!='undefined' ){
      if ( this.windows[cloneID].name.length>32 && typeof(this.windows[cloneID].shortName)!='undefined' ){
	return this.windows[cloneID].shortName;
      }
      else{
	return this.windows[cloneID].name;
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

    result += this.getReads(cloneID, time)
      
	var r=1;
    var t=this.time_order[time]
	if (this.norm){
		r=this.normalization_factor[t];
	}

	return (result/this.reads_segmented[t])*r;

  },//end getSize
  
/* 
 * 
 * */
  getSequenceSize : function(cloneID, time){
    time = typeof time !== 'undefined' ? time : this.t; 
    
    var result=0;
      result = this.getSequenceReads(cloneID, time)
      
    var r=1;
    if (this.norm){
        r=this.normalization_factor[this.time_order[time]];
    }

    return (result/this.reads_segmented[time])*r;

  },//end getSequenceSize
  
  
/* compute the clone reads number ( sum of all reads of windows clustered )
 * @t : tracking point (default value : current tracking point)
 * */
  getReads : function(cloneID, time){
    time = typeof time !== 'undefined' ? time : this.t; 
    var result=0;
    
    for(var j=0 ;j<this.clones[cloneID].cluster.length; j++){
      result += this.windows[this.clones[cloneID].cluster[j]].size[this.time_order[time]];
    }

    return result

  },//end getSize
  
/* 
 * 
 * */
  getSequenceReads : function(cloneID, time){
    time = typeof time !== 'undefined' ? time : this.t; 
    
    var result=0;
      result = this.windows[cloneID].size[this.time_order[time]];

    return result;

  },//end getSequenceSize
  getV : function(cloneID){
    if ( typeof(this.windows[cloneID].sequence)!='undefined' && typeof(this.windows[cloneID].V)!='undefined' ){
      return this.windows[cloneID].V[0].split('*')[0];
    }
    return "undefined V";
  },
  
  getJ : function(cloneID){
    if ( typeof(this.windows[cloneID].sequence)!='undefined' && typeof(this.windows[cloneID].J)!='undefined' ){
      return this.windows[cloneID].J[0].split('*')[0];;
    }
    return "undefined J";
  },
  

/* return the clone size with a fixed number of character
 * use scientific notation if neccesary
 * */
    getStrSize : function(cloneID){
        var size = this.getSize(cloneID);
        return this.formatSize(size, true)
    },

/* return the clone color
 * 
 * */
  getColor : function(cloneID){
    if (this.focus==cloneID) {
      return color['@select'];
    }
    if (!this.windows[cloneID].active) {
      return color['@default'];
    }
    if (this.colorMethod=="abundance") {
      var size=this.getSize(cloneID)
      if (size==0) return color['@default'];
      return colorGenerator( this.scale_color(size*this.precision) ,  color_s  , color_v);
    }
    if (this.colorMethod=="Tag") {
      return tagColor[this.windows[cloneID].tag];
    }
    if (typeof(this.windows[cloneID].V) != 'undefined'){
      if (this.colorMethod=="V") {
      	return this.windows[cloneID].colorV;
      }
      if (this.colorMethod=="J") {
      	return this.windows[cloneID].colorJ;
      }
      if (this.colorMethod=="N") {
      	return this.windows[cloneID].colorN;
      }
      if (this.colorMethod=="N2") {
      	return this.windows[cloneID].colorN2;
      }
    }
    return color['@default'];
  },

/*
 *
 * */
  changeColorMethod : function(colorM){
    this.colorMethod=colorM;
    this.update();
  },
  
/* use normalization_factor to compute clone size ( true/false )
 * 
 * */
  normalization_switch : function(newR){
    console.log("normalization : "+newR)
	this.norm=newR;
    this.update();
  },
  
  
/* change the current tracking point used
 * 
 * */
  changeTime : function(newT){
    console.log("changeTime()"+ newT)
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
                this.updateElemStyle([cloneID, tmp]);
            }else{
                this.updateElemStyle([cloneID]);
            }
        }
        
        $(".focus").text(this.getName(cloneID))
        
    },
  
  
/* remove focus marker
 * 
 * */
  focusOut : function(){
    var tmp = this.focus;
    this.focus=-1;
    if (tmp!=-1) this.updateElem([tmp]);
    $(".focus").text("")
  },
  

/* put a clone in the selection
 * 
 * */
  select : function(cloneID){
    
    var list=this.getSelected();
    
    console.log("select() (clone "+cloneID+")")
    
    if (cloneID==(this.n_windows-1)) return 0
    
    if (this.windows[cloneID].select){
      this.unselect(cloneID); 
    }else{
      if (list.length < 5) this.windows[cloneID].select=true;
    }
    this.updateElemStyle([cloneID]);
  },
  

/* kick a clone out of the selection
 * 
 * */
  unselect :function(cloneID){
    console.log("unselect() (clone "+cloneID+")")
    if (this.windows[cloneID].select){
      this.windows[cloneID].select=false;
    }
    this.updateElemStyle([cloneID]);
  },
 
 
/* kick all clones out of the selection
 * 
 * */
  unselectAll :function(){
    console.log("unselectAll()")
    var list=this.getSelected();
    for (var i=0; i< list.length ; i++){
      this.windows[list[i]].select=false; 
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
      if(this.windows[i].select){
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
  resize :function(speed){
    for (var i=0; i<this.view.length; i++){
      this.view[i].resize(speed);
    }
  },
  

    /* 
    * 
    * */
    updateModel :function(){
        for (var i=0; i<this.clones.length; i++){
            // compute only non empty clones
            if (this.clones[i].cluster.length!=0 ){
                if (!this.clones[i].split){
                    for (var j=0; j<this.clones[i].cluster.length; j++ ){
                        var seq = this.clones[i].cluster[j]
                        this.windows[seq].active=false;
                    }
                    this.active(i)
                }else{
                    for (var j=0; j<this.clones[i].cluster.length; j++ ){
                        var seq = this.clones[i].cluster[j]
                        this.active(seq)
                    }
                }
            }
        }   
        this.computeOtherSize();
        
        for (var i=0; i<this.n_windows; i++){
            this.windows[i].color=this.getColor(i);
        }
        
    },
  
    active : function (id) {
        if (this.windows[id].top <= this.top
            && tagDisplay[this.windows[id].tag] == 1 
            && this.windows[id].window!= "other"){
            this.windows[id].active=true;
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
        this.updateModel()
        for (var i=0; i<this.view.length; i++){
            this.view[i].updateElem(list);
        }
    },
  
/*style a clone list in all views
 * 
 * */
    updateElemStyle :function(list){
        this.updateModel();
        for (var i=0; i<this.view.length; i++){
            this.view[i].updateElemStyle(list);
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
    
    var count=0;
    for ( var i=0; i<this.windows.length; i++){
        if (this.windows[i].active) count++
    }
    
    if (count <5){ 
        this.top = 25
        this.displayTop()
    }
        
  },
  

/* define a minimum top rank required for a clone to be displayed
 * 
 * */
  displayTop : function(top){
    top = typeof top !== 'undefined' ? top : this.top; 
    this.top=top;
    
    var html_container=document.getElementById('top_slider');
    if (html_container!=null){
      html_container.value=top;
    }
    this.update();
  },
  
/* 
 * 
 * */  
  computeOtherSize : function(){
    var other = [];

    for (var j=0; j < this.reads_segmented.length; j++){
      other[j]=this.reads_segmented[j]
    }   
    
    for (var i=0; i < this.n_windows-1; i++){
      for (var j=0; j < this.reads_segmented.length; j++){
		if (this.windows[i].active==true){
            for (var k=0; k < this.clones[i].cluster.length; k++){
                if (this.clones[i].cluster[k] != this.n_windows-1)
                other[j]-= this.windows[this.clones[i].cluster[k]].size[j];
            }
        }
      }   
    }
    
    this.windows[this.n_windows-1].size=other;

  },

/* return info about a sequence/clone in html 
 * 
 * */  
    getHtmlInfo : function(id, type){
        
        if (this.clones[id].cluster.length <= 1) type="sequence" 
        var time_length=this.reads_segmented.length
        var html=""
        
        
        if (type=="clone"){
            html = "<h2>Clone info : "+this.getName(id)+"</h2>"
        }else{
            html = "<h2>Sequence info : "+this.getSequenceName(id)+"</h2>"
        }
        
        html+="<div id='info_window'><table><tr><th></th>"
        
        for (var i=0; i<time_length; i++) {
            html+= "<td>"+this.time[i] + "</td>"
        }
        html += "</tr>"
        
        if (type=="clone"){
            
            html+="<tr><td class='header' colspan='"+(time_length+1)+"'> clone information </td></tr>"
            html+="<tr><td> clone name </td><td colspan='"+time_length+"'>"+this.getName(id)+"</td></tr>"
            html+="<tr><td> clone size (n-reads (total reads) )</td>"
            
            for (var i=0; i<time_length; i++) {
                html+= "<td>"+this.getReads(id, i) + "  (" +this.reads_segmented[i] + ")</td>"
            }
            html += "</tr>"
            
            html+="<tr><td> clone size (%)</td>"
            for (var i=0; i<time_length; i++) {
                html+= "<td>" + (this.getSize(id, i)*100).toFixed(3) + " % </td>"
            }
            
            html+="<tr><td class='header' colspan='"+(time_length+1)+"'> representative sequence information</td></tr>"
        }
        
        html+="<tr><td> sequence name </td><td colspan='"+time_length+"'>"+this.getSequenceName(id)+"</td></tr>"
        html+="<tr><td> code </td><td colspan='"+time_length+"'>"+this.getCode(id)+"</td></tr>"
        html+="<tr><td> size (n-reads (total reads) )</td>"
        for (var i=0; i<time_length; i++) {
            html+= "<td>"+this.getSequenceReads(id, i) + "  (" +this.reads_segmented[i] + ")</td>"
        }
        html += "</tr>"
        
        html+="<tr><td> size (%)</td>"
        for (var i=0; i<time_length; i++) {
            html+= "<td>" + (this.getSequenceSize(id, i)*100).toFixed(3) + " % </td>"
        }
        html += "</tr>"
        
        html+="<tr><td> sequence </td><td colspan='"+time_length+"'>"+this.windows[id].sequence+"</td>"
        html+="<tr><td> window </td><td colspan='"+time_length+"'>"+this.windows[id].window+"</td>"
        html+="<tr><td> V </td><td colspan='"+time_length+"'>"+this.windows[id].V+"</td>"
        html+="<tr><td> D </td><td colspan='"+time_length+"'>"+this.windows[id].D+"</td>"
        html+="<tr><td> J </td><td colspan='"+time_length+"'>"+this.windows[id].J+"</td>"
        
        for (var key in this.windows[id] ){
            if (key[0]=="_"){
                html+="<tr><td>"+key+"</td>"
                if (this.windows[id][key] instanceof Array){
                    for ( var i=0; i<this.windows[id][key].length; i++ ){
                        html+="<td>"+this.windows[id][key][i]+"</td>"
                    }
                }else{
                    html+="<td>"+this.windows[id][key]+"</td>"
                }
                html+="</tr>"
            }
        }
        html+="</table></div>"
        return html
    },  

/* 
 * 
 * */  
    clusterBy : function(data_name){
      
        var tmp = {}
        for (var i=0; i<this.windows.length-1; i++){
            
            //detect key value
            var key = "undefined"
            
            if (this.windows[i][data_name]){
                if (this.windows[i][data_name] instanceof Array){
                    for (var j=this.windows[i][data_name].length; j>=0 ; j--){
                        if (this.windows[i][data_name][j] != 0)
                        key = this.windows[i][data_name][j]
                    }
                }else{
                    if (this.windows[i][data_name] != 0)
                    key = this.windows[i][data_name]
                }
            }
            //console.log("id window/sequence : "+i+" /// cluster key : "+key)
            
            //store windows with same key together
            if (key == "") key = "undefined"
            if (tmp[key]){
                tmp[key].push(i)
            }else{
                tmp[key] = [i]
            }
            
        }
        
        //order windows with same key
        var keys = Object.keys(tmp)
        for (var i in tmp){
            tmp[i].sort()
        }
        
        //reset cluster
        for (var i=0; i< this.windows.length; i++ ){
            this.clones[i]={cluster:[i]};
        }
        
        //new cluster
        for (var i in tmp){
            this.clones[ tmp[i][0] ].cluster = tmp[i]
            this.clones[ tmp[i][0] ].name = i
            
            for (var j=1; j<tmp[i].length; j++){
                this.clones[ tmp[i][j] ].cluster = []
            }
        }
        this.update()
    },

    
/* 
 * 
 * */  
    resetClones : function(){
        //reset cluster
        for (var i=0; i< this.windows.length; i++ ){
            this.clones[i]={cluster:[i]};
        }
        
        this.update()
    },
    
    
/* 
 * 
 * */  
    switchTimeOrder : function(a,b){
        var tmp = this.time_order[a];
        this.time_order[a]=this.time_order[b]
        this.time_order[b]=tmp;
        this.update()
    },
    
/* 
 * 
 * */  
    checkBrowser : function () {
        this.browser_version = parseInt(navigator.appVersion,10);
        this.browser = null
        
        if ((navigator.userAgent.indexOf("Chrome"))!=-1) {
            this.browser = "Chrome";
        }
            
        else if ((navigator.userAgent.indexOf("Firefox"))!=-1) {
            this.browser = "Firefox";
        }
        
        else if ((navigator.userAgent.indexOf("MSIE"))!=-1) {
            this.browser = "Internet Explorer";
        }

        else if ((navigator.userAgent.indexOf("Safari"))!=-1) {
            this.browser = "Safari";
        }

        //TODO check version 
        if ( this.browser == "Chrome" || 
            this.browser == "Firefox" || 
            this.browser == "Safari" ){
            popupMsg(msg.welcome)
        }else{
            popupMsg(msg.browser_error)
        }

    },
    
    formatSize : function (size, fixed) {
        var result = "-/-"
        
        if (size == 0) return result
            
        switch (this.notation_type){
            case "percent" :
                if (fixed){
                    if (size<0.0001){
                        result=(100*size).toFixed(4)+"%";
                    }else if (size > 0.1){
                        result=(100*size).toFixed(2)+"%";
                    }else{
                        result=(100*size).toFixed(3)+"%";
                    }
                }else{
                    //hack to avoid approximation due to javascript way to handle Number
                    result=parseFloat((100*size).toFixed(10))+"%";
                }
            break;
            case "scientific" :
                result=(size).toExponential(1);
            break;
        }
        return result
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

  function showDisplayMenu(){
    $('#display-menu').stop
    $('#display-menu').toggle("fast");
  }


  function popupMsg(msg){
    document.getElementById("popup-msg").innerHTML="";
    document.getElementById("popup-container").style.display="block";
    document.getElementById("popup-msg").innerHTML+=msg;
  }
  
  function closePopupMsg(){
    document.getElementById("popup-container").style.display="none";
    document.getElementById("popup-msg").innerHTML="";
  }
  
  function dataBox(msg){
    document.getElementById("data-container").style.display="block";
    document.getElementById("data-msg").innerHTML=msg;
  }
  
  function closeDataBox(){
    document.getElementById("data-container").style.display="none";
    document.getElementById("data-msg").innerHTML="";
  }
  
  var msg= {
    "align_error" : "Error &ndash; connection to align server (bioinfo.lifl.fr) failed"
    +"</br> Please check your internet connection and retry."
    +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",
    
    "file_error" : "Error &ndash; incorrect data file"
    +"</br> Please check you use a .data file generated by Vidjil."
    +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",
    
    "version_error" : "Error &ndash; data file too old (version " + VIDJIL_JSON_VERSION + " required)"
    +"</br> This data file was generated by a too old version of Vidjil. "
    +"</br> Please regenerate a newer data file. "
    +"</br></br> <div class='center' > <button onclick='closePopupMsg()'>ok</button></div>",
    
    "welcome" : " <h2>Vidjil <span class='logo'>(beta)</span></h2>"
    +"(c) 2011-2014, the Vidjil team"
    +"<br />Marc Duez, Mathieu Giraud and Mikaël Salson"
    +" &ndash; <a href='http://bioinfo.lifl.fr/vidjil'>http://bioinfo.lifl.fr/vidjil</a>"
    +"</br>"
    +"</br>Vidjil is developed by the <a href='http://www.lifl.fr/bonsai'>Bonsai bioinformatics team</a> (LIFL, CNRS, U. Lille 1, Inria Lille), in collaboration with the <a href='http://biologiepathologie.chru-lille.fr/organisation-fbp/91210.html'>department of Hematology</a> of CHRU Lille"
    + " the <a href='http://www.ircl.org/plate-forme-genomique.html'>Functional and Structural Genomic Platform</a> (U. Lille 2, IFR-114, IRCL)"
    + " and the <a href='http://www.euroclonality.org/'>EuroClonality-NGS</a> working group."
    +"</br>"
    +"</br>This is a beta version, please use it only for test purposes."
    +"</br></br> <div class='center' > <button onclick='loadData(), closePopupMsg()'>start</button></div>",
    
    "browser_error" : "It seems you used an incompatible web browser (too old or too weak)."
    +"</br>We recommend to install one of those for a better experience : "
    +"</br> <a href='http://www.mozilla.org/'> Firefox </a> "
    +"</br> <a href='www.google.com/chrome/'> Chrome </a> "
    +"</br> <a href='http://www.chromium.org/getting-involved/download-chromium'> Chromium </a> "
    +"</br></br> <div class='center' > <button onclick='popupMsg(msg.welcome)'>i want to try anyway</button></div>",

  }
  
