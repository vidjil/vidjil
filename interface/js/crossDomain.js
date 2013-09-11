//parametre IMGT par defaut
var imgtInput={};
imgtInput["callback"]="jQuery17106713638880755752_1378825832820"
imgtInput["livret"]="1";
imgtInput["Session"]="&lt;session code=Â¤0Â¤ appliName=Â¤IMGTvquestÂ¤ time=Â¤3625396897Â¤/&gt;";
imgtInput["l01p01c02"]="Homo sapiens";
imgtInput["l01p01c04"]="TR";
imgtInput["l01p01c03"]="inline";
imgtInput["l01p01c10"]="";
imgtInput["l01p01c07"]="1. Details";
imgtInput["l01p01c05"]="HTML";
imgtInput["l01p01c09"]="60";
imgtInput["l01p01c60"]="5";
imgtInput["l01p01c12"]="Y";
imgtInput["l01p01c13"]="Y";
imgtInput["l01p01c06"]="Y";
imgtInput["l01p01c24"]="N";
imgtInput["l01p01c14"]="Y";
imgtInput["l01p01c15"]="Y";
imgtInput["l01p01c16"]="Y";
imgtInput["l01p01c41"]="Y";
imgtInput["l01p01c22"]="Y";
imgtInput["l01p01c17"]="Y";
imgtInput["l01p01c23"]="Y";
imgtInput["l01p01c19"]="Y";
imgtInput["l01p01c18"]="Y";
imgtInput["l01p01c20"]="Y";
imgtInput["l01p01c27"]="Y";
imgtInput["l01p01c28"]="Y";
imgtInput["l01p01c29"]="Y";
imgtInput["l01p01c30"]="Y";
imgtInput["l01p01c31"]="Y";
imgtInput["l01p01c32"]="Y";
imgtInput["l01p01c33"]="Y";
imgtInput["l01p01c34"]="Y";
imgtInput["l01p01c46"]="Y";
imgtInput["l01p01c47"]="Y";
imgtInput["l01p01c48"]="Y";
imgtInput["l01p01c49"]="Y";
imgtInput["l01p01c50"]="Y";
imgtInput["l01p01c51"]="Y";
imgtInput["l01p01c52"]="Y";
imgtInput["l01p01c53"]="Y";
imgtInput["l01p01c54"]="Y";
imgtInput["l01p01c55"]="NO";
imgtInput["l01p01c35"]="F+ORF+ in-frame P";
imgtInput["l01p01c36"]="0";
imgtInput["l01p01c40"]="0";
imgtInput["l01p01c25"]="default";
imgtInput["l01p01c37"]="default";
imgtInput["l01p01c38"]="default";
imgtInput["l01p01c39"]="default";
imgtInput["l01p01c08"]="";
imgtInput["l01p01c26"]="";
imgtInput["l01p01c10"]=">a\nATGCGCAGATGC\n";



function imgtPost(data) {
  
  imgtInput["l01p01c10"]=data;
  
  var iframe = document.createElement("iframe");
  document.getElementById("frame-container").appendChild(iframe);
  iframe.style.display = "none";
  iframe.contentWindow.name = "imgt";

  var form = document.createElement("form");
  form.target = "_blank";
  form.action = "http://www.imgt.org/IMGT_vquest/vquest";
  form.method = "POST";

  for (var k in imgtInput){ 
  var input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = imgtInput[k];
    form.appendChild(input);
  }

  form.submit();

}

