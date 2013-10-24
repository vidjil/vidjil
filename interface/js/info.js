/* VIDJIL
 * License blablabla
 * date: 30/05/2013
 * version :0.0.01-a
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
  
function List(id, model){
  this.id=id;
  this.m=model;
  this.m.view.push(this);
}

List.prototype = {
  
  init : function(){
    
    var self=this;
    
    var divParent = document.getElementById(this.id);
    divParent.innerHTML="";
  
    for(var i=0 ;i<this.m.n_windows; i++){
      var div = document.createElement('li');
      div.className="list";
      div.id=i;
      div.onmouseover = function(){ self.m.focusIn(this.id); }
      div.onmouseout= function(){ self.m.focusOut(this.id); }
      
      document.getElementById("listClones").appendChild(div);
    }
    this.update();
  },
  
  update : function(){
    for(var i=0 ;i<this.m.n_windows; i++){
      this.updateElem(i);
    }
  },
  
  resize : function(){
  },
  
  div_elem : function(div_elem, cloneID, display){
    
    var self=this;
    div_elem.innerHTML='';
    div_elem.className="listElem";
    
    if (!display || this.m.clones[cloneID].cluster.length==0){ 
      div_elem.style.display="none"
    }else{
      var span0 = document.createElement('span');
      span0.className = "nameBox2";
      span0.ondblclick = function(){ self.editName(cloneID, this); }
      span0.onclick = function(){ self.m.select(cloneID); }
      span0.appendChild(document.createTextNode(this.m.getName(cloneID)));
      span0.title = this.m.getName(cloneID);
	
      var svg=document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('class','starBox'); 
      svg.onclick=function(){ changeTag(cloneID); }
      var path=document.createElementNS('http://www.w3.org/2000/svg','path')
      path.setAttribute('d', "M 0,6.1176482 5.5244193,5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z");
      path.setAttribute('id','color'+cloneID); 
      if (typeof this.m.clones[cloneID].tag != 'undefined') path.setAttribute("fill", tagColor[this.m.clones[cloneID].tag]);
      else path.setAttribute("fill", colorStyle.c01);
	  
      svg.appendChild(path);
	
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="size"+cloneID;
      span2.onclick=function(){ this.m.select(cloneID); }
	
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
    }
  },
  
  div_cluster : function(div_cluster, cloneID, display){
    
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
	img.onclick=function(){ this.m.split(cloneID, this.parentNode.id2);
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
  
    editName : function(cloneID, elem){
    var self=this;
    if (document.getElementById("new_name")){
      this.updateElem(document.getElementById("new_name").parentNode.parentNode.parentNode.id);
    }
    var divParent = elem;
    divParent.innerHTML="";
    
    if (cloneID[0]=='s')
      cloneID=cloneID.substr(3);
    
    var input = document.createElement('input');
    input.type="text";
    input.id= "new_name";
    input.value= this.m.getName(cloneID);
    input.style.width="200px";
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
  
  updateElem : function(cloneID){
    var displayCluster=true;
    var display=true;
    if ($("#cluster"+cloneID).css("display")=="none") displayCluster=false;
    if ($("#"+cloneID).css("display")=="none"){ 
      display=false;
      displayCluster=false;
    }

    
    var div = document.getElementById(cloneID);
    div.innerHTML='';
    
      var div2 = document.createElement('div');
      this.div_elem(div2,cloneID, display);
      div.appendChild(div2);
      
      var div3=document.createElement('div');
      this.div_cluster(div3, cloneID, displayCluster);
      div.appendChild(div3);
      
  },
  
  showCluster : function(cloneID){
    $("#cluster"+cloneID).toggle("fast");
  }
  
  
}//fin prototype
  
  
  
  
  
  /*
  //met a jour les % dans les listes
  function updateList(){
    for (var i=0; i<totalClones; i++){
      
      document.getElementById("size"+i).innerHTML=getStrSize(i);
      
      if (document.getElementById("selectsize"+i)){
	document.getElementById("selectsize"+i).innerHTML=getStrSize(i);
      }
      
      var display=true;
      if (document.getElementById("cluster"+i).style.display=="none") display=false;
      
      document.getElementById(i).removeChild(document.getElementById("cluster"+i));
      
      var div=document.createElement('div');
      div_cluster(div, i, display);
      document.getElementById(i).appendChild(div);
      
    }  
  }*/

  
  function displayAll(){
    for (var i = 0; i < totalClones; i++){    
      if (table[i].cluster.length!=0){
	table[i].active=true;
      }else{
	table[i].active=false;
      }     
    }
    updateStyle();
  }
  
  function displayTop(top){
      document.getElementById('rangeValue').value=top;
      document.getElementById('top_display').innerHTML=top;
    for (var i = 0; i < totalClones; i++){      
      if (table[i].cluster.length!=0 ){
	
	var result=false;
	for (var j=0; j<table[i].cluster.length && !result ; j++){
	  if ( windows[table[i].cluster[j]].top < top ) result=true;
	}
	table[i].active=result;
	
      }else{
	table[i].active=false;
      }      
    }   
    updateStyle();
  }

  function incDisplayTop(){
    var top=parseInt(document.getElementById('rangeValue').value);
    
    if (top<100){ displayTop((top+5));}
  }
  
  function decDisplayTop(){
    var top=document.getElementById('rangeValue').value;
    
    if (top>0) displayTop((top-5));
  }
  
  function sortListBySize(){
    var list=jQuery('.list')
    var sort=list.sort(function(a,b){ 
      return getSize($(b).attr("id"))> getSize($(a).attr("id")) ? 1:-1; 
    })
    $("#listClones").html(sort);
  }
  
  
  
  
  
  
  
  function showSelector(elem){
    $('#'+elem).animate({ height: "show", display: "show"}, 100 ); 
  }
  
  
  function popupMsg(msg){
    document.getElementById("popup-container").style.display="block";
    
    document.getElementById("popup-msg").innerHTML+="<p>" +msg+ "</p>";
  }
  
  function closePopupMsg(){
    document.getElementById("popup-container").style.display="none";
    document.getElementById("popup-msg").innerHTML="";
  }
  
  
  function changeTag(cloneID){
    if (cloneID[0]=="s") cloneID=cloneID.substr(3);
    $('#tagSelector').show("fast");
  document.getElementById("tag_name").innerHTML=m.getName(cloneID);
  document.getElementById("tag_id").innerHTML=cloneID;
  }
  
  