
function Similarity (model) {
    //default var for tsne
    this.e = 10;
    this.p = 3;
    this.po = 1;

    this.m = model;
    this.m.similarity_builder = this;
    this.callback=function(){};
    
    this.yMax = 0;
    this.system_yMax = {}
}

Similarity.prototype = {
    
    init : function(callback) {
        this.callback=callback;
        if (typeof this.m.similarity != "undefined"){
            this.compute_tsne(self.e,self.p,self.po)
            .compute_system_tsne(self.e,self.p,self.po)
            .callback();
        }else{
            this.get_similarity()
        }
        
        
    },
    
    get_similarity: function () {
        var self = this
        var request = "";

        for (var i = 0; i < this.m.clones.length-1; i++) {
            request += ">" + i + "\n" + this.m.clone(i).id + "\n";
        }

        $.ajax({
            type: "POST",
            timeout: 120000,
            data: request,
            url: segment.cgi_address + "similarity.cgi",
            beforeSend: function () {
                self.m.wait("compute similarity matrix");
            },
            complete: function () {
                self.m.resume();
            },
            success: function (result) {
                console.log(result)
                self.m.similarity = JSON.parse(result)
                self.compute_tsne(self.e,self.p,self.po)
                .compute_system_tsne(self.e,self.p,self.po)
                .callback();
            },
            error: function () {
                console.log({"type": "flash", "msg": "cgi error : impossible to connect", "priority": 2});
            }
        })
    },
    
    
    compute_tsne: function(e,p,po) {
        var opt = {
            epsilon: e,
            perplexity: p
        }; 
        var tsne = new tsnejs.tSNE(opt); 

        var dists = []
        for (var i in this.m.similarity[0]) dists[i] = []
            
        for (var i in this.m.similarity) {
            for (var j in this.m.similarity) {
                dists[i][j]= Math.pow( (100-this.m.similarity[i][j]) ,po)
            }
        }
            
        tsne.initDataDist(dists);

        for(var k = 0; k < 2000; k++) {
            tsne.step(); 
        }

        var result = tsne.getSolution(); 
        var yMax = 0;
        
        for (var i in result){
            if (result[i][1] > yMax) yMax = result[i][1];
            m.clone(i).tsne = result[i]
        }
        this.yMax = yMax;
        
        return this;
    },
    
    rescale: function(tab){
        var result = tab;
        
        //compute min/max range
        var xMax=0;
        var xMin=0;
        var yMax=0;
        var yMin=0;
        
        for (var i in result){
            if (result[i][0] > xMax) xMax=result[i][0];
            if (result[i][0] < xMin) xMin=result[i][0];
            if (result[i][1] > yMax) yMax=result[i][1];
            if (result[i][1] < yMin) yMin=result[i][1];
        }
        
        var deltaX = xMax-xMin;
        var deltaY = yMax-yMin;
        
        //replace origin on 0/0
        for (var i in result){
            result[i][0] = result[i][0] - xMin;
            result[i][1] = result[i][1] - yMin;
        }
        
        //rotate result 
        if (deltaY > deltaX) {
            for (var i in result){
                var tmp = result[i][0];
                result[i][0] = result[i][1];
                result[i][1] = tmp;
            }
            var tmp = deltaX;
            deltaX = deltaY;
            deltaY = tmp;
        }
        
        //rescale
        for (var i in result){
            result[i][0] = result[i][0]/deltaX
            result[i][1] = result[i][1]/deltaX
        }
        
        return result;
    },
    
    compute_system_tsne: function(e,p,po) {
        
        for (var l in this.m.system_available){
            var locus = this.m.system_available[l]
            var opt = {
                epsilon: e,
                perplexity: p
            }; 
            var tsne = new tsnejs.tSNE(opt); 

            var list = []
            for (var i=0; i<this.m.clones.length; i++) if (this.m.clone(i).get("germline") == locus) list.push(i)
            
            var dists = []
            for (var i in list) dists[i] = []
                
            for (var i in list) {
                for (var j in list) {
                    dists[i][j]= Math.pow( (100-this.m.similarity[list[i]][list[j]]) ,po)
                }
            }
                
            tsne.initDataRaw(dists);

            for(var k = 0; k < 2000; k++) {
                tsne.step(); 
            }

            var result = tsne.getSolution(); 
            
            result = this.rescale(result);
            var yMax = 0;
            
            for (var i in result){
                if (result[i][1] > yMax) yMax = result[i][1];
                m.clone(list[i]).tsne_system = result[i];
            }
            
            this.system_yMax[locus] = yMax;
        }
        return this;
    }

}




