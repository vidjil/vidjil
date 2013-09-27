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
  
  function initList(data){
  var divParent = document.getElementById("listClones");
  divParent.innerHTML="";
  for(var i=0 ;i<totalClones; i++){
      var div = document.createElement('li');
      div.className="list";
      div.id=i;
      div.onmouseover = function(){ focusIn(this.id); }
      div.onmouseout= function(){ focusOut(this.id); }
      
      var div2 = document.createElement('div');
      div_elem(div2,i);
      div.appendChild(div2);
      
      var div3=document.createElement('div');
      div_cluster(div3, i, false);
      div.appendChild(div3);
      
      document.getElementById("listClones").appendChild(div);
  }
}
  
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
  }
  
  function showCluster(cloneID){
    $("#cluster"+cloneID).toggle("fast");
  }
  
  function div_elem(div_elem, cloneID){
    
      div_elem.innerHTML='';
      div_elem.className="listElem";
      
      var span0 = document.createElement('span');
      span0.className = "nameBox";
      span0.ondblclick = function(){ editName(this.parentNode.parentNode.id, this); }
      span0.onclick=function(){ selectClone(this.parentNode.parentNode.id); }
      span0.appendChild(document.createTextNode(getname(cloneID)));
      
      var svg=document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('class','starBox'); 
      svg.onclick=function(){ changeColor(this.parentNode.parentNode.id); }
      var path=document.createElementNS('http://www.w3.org/2000/svg','path')
      path.setAttribute('d', "M 0,6.1176482 5.5244193,5.5368104 8.0000008,0 10.172535,5.5368104 16,6.1176482 11.406183,9.9581144 12.947371,16 8.0000008,12.689863 3.0526285,16 4.4675491,10.033876 z");
      path.setAttribute('id','color'+cloneID); 
      if (typeof table[cloneID].tag != 'undefined') path.setAttribute("fill", tagColor[table[cloneID].tag]);
      else path.setAttribute("fill", colorStyle.c01);
	
      svg.appendChild(path);
      
      var span2=document.createElement('span')
      span2.className = "sizeBox";
      span2.id="size"+cloneID;
      span2.onclick=function(){ selectClone(this.parentNode.parentNode.id); }
      
      span2.appendChild(document.createTextNode(getStrSize(cloneID)));
      
      var span3=document.createElement('span')
      span3.className = "clusterBox";
      if (table[cloneID].cluster.length >1){
	span3.onclick=function(){ showCluster( this.parentNode.parentNode.id )}
	span3.appendChild(document.createTextNode("+"));
      }else{
	span3.appendChild(document.createTextNode(' '));
      }
      
      div_elem.appendChild(span3);
      div_elem.appendChild(span0);
      div_elem.appendChild(span2);
      div_elem.appendChild(svg);
    
  }
  
  function getStrSize(cloneID){
	var size = getSize(cloneID);
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
  }
  
  function updateListElem(cloneID, display){
    
    var div = document.getElementById(cloneID);
    div.innerHTML='';
    
      var div2 = document.createElement('div');
      div_elem(div2,cloneID);
      div.appendChild(div2);
      
      var div3=document.createElement('div');
      div_cluster(div3, cloneID, display);
      div.appendChild(div3);
      
      if(table[cloneID].select){
	spanF = document.getElementById("f"+cloneID);
	spanF.innerHTML="";
	div_elem(spanF, cloneID);
	spanF.className="seq-fixed";
      }
    
  }
  
  function div_cluster(div_cluster, cloneID, display){
    
      div_cluster.innerHTML='';
      
      div_cluster.id="cluster"+cloneID;
      div_cluster.id2=cloneID;
      if (!display || table[cloneID].cluster.length==1) div_cluster.style.display="none";
      
      var clusterSize=0;
      for(var j=0 ;j<table[cloneID].cluster.length; j++){
	clusterSize += windows[table[cloneID].cluster[j]].ratios[t][used_ratio];
      }
      
      for (var i=0; i<table[cloneID].cluster.length; i++){
	
	var div_clone=document.createElement('div');
	div_clone.id2=table[cloneID].cluster[i];
	div_clone.className="listElem";
	
	var span_name = document.createElement('span');
        span_name.className = "nameBox";
        span_name.appendChild(document.createTextNode( getcode(table[cloneID].cluster[i]) ) );
	
	var img=document.createElement('img');
	img.onclick=function(){ split(cloneID, this.parentNode.id2);
	}
	if (table[cloneID].cluster[i]!=parseInt(cloneID)){ img.src="images/delete.png";}
	img.className="delBox";
	
	var span_stat=document.createElement('span');
	span_stat.className="sizeBox";
	span_stat.appendChild(document.createTextNode( (windows[table[cloneID].cluster[i]].ratios[t][used_ratio]*100/clusterSize).toFixed(1)+"%"));
	
	div_clone.appendChild(img); 
	div_clone.appendChild(span_name);
	div_clone.appendChild(span_stat);
	div_cluster.appendChild(div_clone);
      }
  }
 

  function showSelector(elem){
    $('#'+elem).animate({ height: "show", display: "show"}, 100 ); 
  }
  
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
  
  function popupMsg(msg){
    document.getElementById("popup-container").style.display="block";
    
    document.getElementById("popup-msg").innerHTML+="<p>" +msg+ "</p>";
  }
  
  function closePopupMsg(){
    document.getElementById("popup-container").style.display="none";
    document.getElementById("popup-msg").innerHTML="";
  }
  
  function convertToPng(){
    
    var html = d3.select("#svg")
      .attr("title", "test2")
      .attr("version", 1.1)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .node().parentNode.innerHTML;

    d3.select("#popup-msg").append("div")
      .attr("id", "download")
      .append("img")
      .attr("src", "data:image/svg+xml;base64,"+ btoa(html));
	
    popupMsg("plop");
	
  }