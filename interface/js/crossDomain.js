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

//parametre igBlast par defaut
var igBlastInput= {};
igBlastInput["queryseq"]="GAAGGCCCCACAGCGTCTTCTGTACTATGACGTCTCCACCGCAAGGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGAGACTGCAAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTTCTGACATAAGAAACCCTTTGGCAGTGGAACAACAC"
igBlastInput["organism"]="human"
igBlastInput["germline_db_V"]="IG_DB/imgt.TR.Homo_sapiens.V.f.orf.p";
igBlastInput["germline_db_D"]="IG_DB/imgt.TR.Homo_sapiens.D.f.orf";
igBlastInput["germline_db_J"]="IG_DB/imgt.TR.Homo_sapiens.J.f.orf.p";
igBlastInput["program"]="blastn";
igBlastInput["min_D_match"]=5;
igBlastInput["D_penalty"]=-4;
igBlastInput["num_alignments_V"]=3;
igBlastInput["num_alignments_D"]=3;
igBlastInput["num_alignments_J"]=3;
igBlastInput["translation="]=true;
igBlastInput["domain"]="imgt";
igBlastInput["outfmt"]=3;
igBlastInput["additional_db"]="";
igBlastInput["v_focus"]=true;
igBlastInput["num_alignments_additional"]=10;
igBlastInput["evalue"]=1;
igBlastInput["LINK_LOC"]="";
igBlastInput["SEARCH_TYPE"]="TCR";
igBlastInput["igsource"]="new";
igBlastInput["analyze"]="on";
igBlastInput["CMD"]="request";
igBlastInput["seqtype"]="TCR";
    


function imgtPost(data, system) {
  
  imgtInput["l01p01c10"]=data;
  if (system=="IGH"){
      imgtInput["l01p01c04"]="IG";
  }
  if (system=="TRG"){
      imgtInput["l01p01c04"]="TR";
  }
  var form = document.getElementById("form");
  form.innerHTML="";
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

function igBlastPost(data,system){

  igBlastInput["queryseq"]=data;
  if (system=="IGH"){
      igBlastInput["germline_db_V"]="IG_DB/imgt.Homo_sapiens.V.f.orf.p";
      igBlastInput["germline_db_D"]="IG_DB/imgt.Homo_sapiens.D.f.orf";
      igBlastInput["germline_db_J"]="IG_DB/imgt.Homo_sapiens.J.f.orf";
  }
  if (system=="TRG"){
      igBlastInput["germline_db_V"]="IG_DB/imgt.TR.Homo_sapiens.V.f.orf.p";
      igBlastInput["germline_db_D"]="IG_DB/imgt.TR.Homo_sapiens.D.f.orf";
      igBlastInput["germline_db_J"]="IG_DB/imgt.TR.Homo_sapiens.J.f.orf.p";
  }
  
  
  var form = document.getElementById("form");
  form.innerHTML="";
  form.target = "_blank";
  form.action = "http://www.ncbi.nlm.nih.gov/igblast/igblast.cgi";
  form.method = "POST";

  for (var k in igBlastInput){ 
  var input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = igBlastInput[k];
    form.appendChild(input);
  }

  form.submit();
      
}


