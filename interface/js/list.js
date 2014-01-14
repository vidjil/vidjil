/* 
 * Vidjil, V(D)J repertoire browsing and analysis
 * http://bioinfo.lifl.fr/vidjil
 * (c) 2013, Marc Duez and the Vidjil Team, Bonsai bioinfomatics (LIFL, UMR 8022 CNRS, Univ. Lille 1)
 * =====
 * This is a beta version, please use it only for test purposes.
 * This file is a part of Vidjil, and can not be copied, modified and/or distributed 
 * without the express permission of the Vidjil Team.
 *
 *
 * info.js
 * 
 * contains tools to manipulate element of the left-container :
 * favorites list
 * clone list
 * info panel
 * 
 * 
 */


/* List constructor
 * 
 * */   
function List(id, model){
  this.id=id;			//ID de la div contenant la liste
  this.m=model;			//Model utilisé

  this.starPath = "M 0,6.1176482 5.5244193, 5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z"
  this.m.view.push(this);		//synchronisation au Model
}

List.prototype = {
  
/* initialise la liste et crée un div pour chaque clones
 * 
 * */ 
  init : function(){
    
    var self=this;
    
    var divParent = document.getElementById(this.id);
    divParent.innerHTML="";
  
    for(var i=0 ;i<this.m.n_windows; i++){
      var div = document.createElement('li');
      div.className="list";
      div.id=i;
      div.onmouseover = function(){ self.m.focusIn(this.id); }

      
      document.getElementById("listClones").appendChild(div);
    }
    this.update();
  },

/*mise a jour de la liste
 * 
 * */   
  update : function(){
    var startTime = new Date().getTime();  
    var elapsedTime = 0;  
    for(var i=0 ;i<this.m.n_windows; i++){
      this.updateElem([i]);
    }
    elapsedTime = new Date().getTime() - startTime;  
    console.log( "update Liste: " +elapsedTime +"ms");  
  },
  
/*
 * TODO
 * */   
  resize : function(){
  },

/* genere le code HTML des infos d'un clone
 * @div_elem : element HTML a remplir
 * @cloneID : identifiant du clone a décrire
 * */   
  div_elem : function(div_elem, cloneID){

    var self=this;
    div_elem.innerHTML='';
    div_elem.className="listElem";
    div_elem.style.display="block";
    
    var span0 = document.createElement('span');
    span0.className = "nameBox2";
    span0.ondblclick = function(){ self.editName(cloneID, this); }
    span0.onclick = function(){ self.m.select(cloneID); }
    span0.appendChild(document.createTextNode(this.m.getName(cloneID)));
    span0.title = this.m.getName(cloneID);
    span0.style.color=this.m.windows[cloneID].color;
      
    var svg=document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class','starBox'); 
    svg.onclick=function(){ changeTag(cloneID); }
    var path=document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('d', this.starPath);
    path.setAttribute('id','color'+cloneID); 
    if (typeof this.m.windows[cloneID].tag != 'undefined') path.setAttribute("fill", tagColor[this.m.windows[cloneID].tag]);
    else path.setAttribute("fill", color['@default']);
	
    svg.appendChild(path);
      
    var span2=document.createElement('span')
    span2.className = "sizeBox";
    span2.id="size"+cloneID;
    span2.onclick=function(){ this.m.select(cloneID); }
    span2.style.color=this.m.windows[cloneID].color;
      
    span2.appendChild(document.createTextNode(this.m.getStrSize(cloneID)));
      
    var span3=document.createElement('span')
    span3.className = "clusterBox";
    if (this.m.clones[cloneID].cluster.length >1){
      span3.onclick=function(){ showCluster( cloneID )}
      span3.appendChild(document.createTextNode("+"));
    }else{
      span3.appendChild(document.createTextNode(' '));
    }
      
    div_elem.appendChild(span3);
    div_elem.appendChild(span0);
    div_elem.appendChild(svg);
    div_elem.appendChild(span2);
  },

/* genere le code HTML des infos d'un cluster
 * @div_cluster : element HTML a remplir
 * @cloneID : identifiant du clone a décrire
 * @display : affichage true/false
 * */  
  div_cluster : function(div_cluster, cloneID, display){

    var self=this;
    div_cluster.innerHTML='';
	
    div_cluster.id="cluster"+cloneID;
    div_cluster.id2=cloneID;
    if (!display || this.m.clones[cloneID].cluster.length==1) div_cluster.style.display="none";
	
    var clusterSize=this.m.getSize(cloneID)
	
    for (var i=0; i<this.m.clones[cloneID].cluster.length; i++){
      var id=this.m.clones[cloneID].cluster[i]
      var div_clone=document.createElement('div');
      div_clone.id2=id;
      div_clone.className="listElem";

      var span_name = document.createElement('span');
      span_name.className = "nameBox2";
      span_name.appendChild(document.createTextNode( this.m.getCode(id) ) );
      span_name.title=this.m.getCode(id);

      var img=document.createElement('img');
	      img.onclick=function(){ self.m.split(cloneID, this.parentNode.id2);
      }
      if (id!=parseInt(cloneID)){ img.src="images/delete.png";}
      img.className="delBox";

      var span_stat=document.createElement('span');
      span_stat.className="sizeBox";
      span_stat.appendChild(document.createTextNode( (this.m.windows[id].ratios[this.m.t][this.m.r]*100/clusterSize).toFixed(1)+"%"));

      div_clone.appendChild(img); 
      div_clone.appendChild(span_name);
      div_clone.appendChild(span_stat);
      div_cluster.appendChild(div_clone);
    }
  },
 
/* affiche une fenetre d'édition pour le nom d'un clone
 * @cloneID : identifiant du clone édité
 * @elem : element HTML acceuillant la fenetre d'édition
 * */  
  editName : function(cloneID, elem){
    var self=this;
    if (document.getElementById("new_name")){
      this.updateElem([document.getElementById("new_name").parentNode.parentNode.parentNode.id]);
    }
    var divParent = elem;
    divParent.innerHTML="";
    
    if (cloneID[0]=='s')
      cloneID=cloneID.substr(3);
    
    var input = document.createElement('input');
    input.type="text";
    input.id= "new_name";
    input.value= this.m.getName(cloneID);
    input.style.width="200px";		//TODO remplacer par une class css
    input.style.border="0px";
    input.style.margin="0px";
    input.onkeydown=function(){if (event.keyCode == 13) document.getElementById('btnSave').click();}
    divParent.appendChild(input);
    divParent.onclick="";
    
    var a = document.createElement('a');
    a.className="button";
    a.appendChild(document.createTextNode("save"));
    a.id="btnSave";
    a.onclick=function(){ 
      var newName=document.getElementById("new_name").value;
      self.m.changeName(cloneID, newName);
    }
    divParent.appendChild(a);
    $('#new_name').select();
  },

/*update une liste d'elements
 * 
 * */   
  updateElem : function(list){
    for ( var i=0; i<list.length ; i++){
      
      var displayCluster=false;
      var cluster =$("#cluster"+list[i])
      if (cluster.length!=0 && cluster.css("display")!="none") displayCluster=true;
      
      var div = document.getElementById(list[i]);
      div.innerHTML='';
      
      if (this.m.windows[list[i]].active){  
	if (this.m.windows[list[i]].select){  
	  document.getElementById(list[i]).className="list_select";
	}else{
	  document.getElementById(list[i]).className="list";
	}
	var div2 = document.createElement('div');
	this.div_elem(div2,list[i]);
	div.appendChild(div2);
	
	var div3=document.createElement('div');
	this.div_cluster(div3, list[i], displayCluster);
	div.appendChild(div3);
	div.style.display="";
	
      }else{
	div.style.display="none";
      }
    }
    
  },
  
  sortListBySize : function(){
    self=this;
    var list=jQuery('.list')
    var sort=list.sort(function(a,b){ 
      var idA=$(a).attr("id");
      var idB=$(b).attr("id");
      return self.m.getSize(idB)> self.m.getSize(idA) ? 1:-1; 
    })
    $("#listClones").html(sort);
  },
  
  sortListByTop : function(){
    self=this;
    var list=jQuery('.list')
    var sort=list.sort(function(a,b){ 
      var idA=$(a).attr("id");
      var idB=$(b).attr("id");
      return self.m.windows[idA].top> self.m.windows[idB].top ? 1:-1; 
    })
    $("#listClones").html(sort);
  },
  
  sortListByV : function(){
    self=this;
    var list=jQuery('.list')
    var sort=list.sort(function(a,b){ 
      var idA=$(a).attr("id");
      var idB=$(b).attr("id");
      var vA="undefined V";
      var vB="undefined V";
      
      if (typeof(self.m.windows[idA].seg) != 'undefined' && typeof(self.m.windows[idA].seg.V) != 'undefined' )
      vA=self.m.windows[idA].seg.V[0];
      if (typeof(self.m.windows[idB].seg) != 'undefined' && typeof(self.m.windows[idB].seg.V) != 'undefined' )
      vB=self.m.windows[idB].seg.V[0];
      
      //TODO ordre alpha//récupérer l'ordre correct dans le germline
      return vA>vB ? 1:-1; 
    })
    $("#listClones").html(sort);
  },
  
  sortListByJ : function(){
    self=this;
    var list=jQuery('.list')
    var sort=list.sort(function(a,b){ 
      var idA=$(a).attr("id");
      var idB=$(b).attr("id");
      var jA="undefined J";
      var jB="undefined J";
      
      if (typeof(self.m.windows[idA].seg) != 'undefined' && typeof(self.m.windows[idA].seg.J) != 'undefined' )
      jA=self.m.windows[idA].seg.J[0];
      if (typeof(self.m.windows[idB].seg) != 'undefined' && typeof(self.m.windows[idB].seg.J) != 'undefined' )
      jB=self.m.windows[idB].seg.J[0];
      
      //TODO ordre alpha//récupérer l'ordre correct dans le germline
      return jA>jB ? 1:-1; 
    })
    $("#listClones").html(sort);
  }
  
  
}//fin prototype
  




  function showCluster(cloneID){
    $("#cluster"+cloneID).toggle(50);
  }

  
  function changeTag(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    $('#tagSelector').show("fast");
  document.getElementById("tag_name").innerHTML=m.getName(cloneID);
  document.getElementById("tag_id").innerHTML=cloneID;
  }
  
  
