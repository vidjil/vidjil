
function Similarity (model) {
    //default var for tsne
    this.e = 10;
    this.p = 80;
    this.po = 1.5;

    this.m = model;
    this.m.similarity_builder = this;
    this.callback=function(){};

    this.yMax = 0;
    this.system_yMax = {}
}

Similarity.prototype = {

    /* compute tsne/system_tsne using similarity matrix
     * retrieve similarity matrix from server if neccesary 
     * */
    init : function(callback) {
        this.callback=callback;
        if (typeof this.m.similarity != "undefined"){
            this.callback();
        }else{
            this.get_similarity()
        }


    },
    
    /* request a similarity to the cgi server
     * pre-compute tsne/system_tsne on success
     * */
    get_similarity: function () {
        var self = this
        var request = "";

        for (var i = 0; i < this.m.clones.length; i++) {
            if (m.clone(i).sequence!=0) request += ">" + i + "\n" + this.m.clone(i).id + "\n";
        }

        $.ajax({
            type: "POST",
            timeout: 120000,
            data: request,
            url: segment.cgi_address + "similarity.cgi",
            beforeSend: function () {
                self.m.wait("Computing similarities between clones...");
            },
            complete: function () {
                self.m.resume();
            },
            success: function (result) {
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

    /* compute tsne using the similarity matrix (default parameters are defined in the similarity Object)
     * tsne computes a 2D coordinate for each clones and tries to conserve the relative distance between each clones.
     * */
    compute_tsne: function(e,p,po) {
        var opt = {
            epsilon: e,
            perplexity: p
        };
        this.tsne = new tsnejs.tSNE(opt);

        this.dists = []
        for (var i=0; i<this.m.similarity.length; i++) {
            this.dists[i] = []
            for (var j=0; j<this.m.similarity.length; j++) {
                this.dists[i][j]= Math.pow( (100-this.m.similarity[i][j]) ,po)
            }
        }
        this.tsne.initDataDist(this.dists);

        for(var k = 0; k < 1000; k++) this.tsne.step();
        console.log(this.tsne.step());

        var result = this.tsne.getSolution();
        console.log(result[5][4])
        result = this.rescale(result);
        var yMax = 0;
        var xMax = 0;

        for (var i in result){
            if (result[i][1] > yMax) yMax = result[i][1];
            if (result[i][0] > xMax) xMax = result[i][0];
            m.clone(i).tsne = result[i]
        }
        this.yMax = yMax;
        this.xMax = xMax;
        
        return this;
    },
    
    /* translate and rescale an array of coordinates to be between 0/0 and 1/1
     *
     * */ 
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

    /* same as compute_tsne() but treats each systems independently
     *
     * */
    compute_system_tsne: function(e,p,po) {

        for (var l in this.m.system_available){
            var locus = this.m.system_available[l]
            var opt = {
                epsilon: e,
                perplexity: p
            };
            var tsne = new tsnejs.tSNE(opt);

            var list = []
            for (var i=0; i<this.m.similarity.length; i++) if (this.m.clone(i).get("germline") == locus) list.push(i)

            var dists = []
            for (var i in list) dists[i] = []

            for (var i in list) {
                for (var j in list) {
                    dists[i][j]= Math.pow( (100-this.m.similarity[list[i]][list[j]]) ,po)
                }
            }

            tsne.initDataRaw(dists);

            for(var k = 0; k < 500; k++) {
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
    }, 
    
    /* 
     * return a list of clusters found with the DBscan algorithm
     * */
    DBscan: function (eps, min) {
        var self = this;
        this.callback = function(){self.DBscan(eps,min)};
        if (typeof this.m.similarity == "undefined"){
            this.get_similarity();
            return;
        }
        
        this.m.resetClusters();
        var cluster_list = [];
        
        //init flag (keep track of visited/clustered clones)
        var visit_flag = []
        var cluster_flag = []
        
        for (var i in this.m.similarity){
            visit_flag[i]=false;
            cluster_flag[i]=false;
        } 
        
        for (var i in this.m.similarity) {
            //search for an unvisited node
            if (!visit_flag[i]){
                visit_flag[i]=true;
                
                //compute neighborhood of the unvisited node
                var tmp = this.compute_neighborhood(i, eps);
                var neighborhood = tmp[0];
                var neighborhood_size = tmp[1];
                
                //start expand a cluster around the unvisited node if the local density is enough
                if (neighborhood_size > min) {
                    var cluster = [] //new cluster
                    
                    var l = neighborhood.length;
                    for (var j=0; j<l; j++){
                        if (!visit_flag[neighborhood[j]]){
                            visit_flag[neighborhood[j]]=true;
                            
                            var tmp2 = this.compute_neighborhood(neighborhood[j], eps);
                            var neighborhood2 = tmp2[0];
                            var neighborhood_size2 = tmp2[1];
                                
                            //add to the cluster the neighborhood of every valid neighbor 
                            if (neighborhood_size2 > min){
                                for (var k in neighborhood2){
                                    if (neighborhood.indexOf(neighborhood2[k]) == -1){
                                        neighborhood.push(neighborhood2[k]);
                                        l++;
                                    }
                                }
                            }
                            
                        }
                        //add all the neighborhood to the cluster
                        if (!cluster_flag[neighborhood[j]]){
                            cluster_flag[neighborhood[j]]=true;
                            cluster.push(neighborhood[j]);
                        }
                    }
                    
                    //add only clusters with more than one clone
                    if (cluster.length >1) cluster_list.push(cluster);
                }
            }     
        }
        for (var c in cluster_list) this.m.merge(cluster_list[c]);
        return cluster_list;
    },
    
    /* find the eps-neighborhood of a given clone
     * return a list of neighbor and the density of this neighborhood 
     * */
    compute_neighborhood: function (id, eps) {
        var neighborhood=[];
        var neighborhood_size=0;
        for (var j in this.m.similarity){
            if (this.m.similarity[id][j] > eps) {
                neighborhood.push(j); 
                neighborhood_size += this.m.clone(j).getMaxSize()
            }
        } 
        return [neighborhood, neighborhood_size];
    },


    /* return all clones who don't have any bigger neighbors
     * and clones too big to be considered as just noise of the previous ones
     * eps : neighborhood distance
     * limit : relative size needed for a clone to not be considered as noise
     * */
    find_real_clones : function (eps, limit) {
        var clone_list = [];
        
        for (var i in this.m.similarity) {
            var flag = true;
            var size = this.m.clone(i).getMaxSize();
            var n = [];
            
            for (var j in this.m.similarity){
                var neighbor_size = this.m.clone(j).getMaxSize();
                if (this.m.similarity[i][j] > eps) {
                    if (neighbor_size>(size*limit) ) n.push(j);
                    if (neighbor_size>size) flag = false;
                }
            } 
            
            if (flag){
                clone_list.push(i);
                for (var j in n) if (clone_list.indexOf(n[j])==-1) clone_list.push(n[j]);
            } 
        }
        
        return clone_list;
    },

    /* 
     * 
     * */
    cluster_me : function (eps, limit) {
        var self = this;
        this.callback = function(){self.cluster_me(eps,limit)};
        if (typeof this.m.similarity == "undefined"){
            this.get_similarity();
            return;
        }
        
        this.m.resetClusters();
        var c = this.find_real_clones(eps, limit);
        
        var cluster_list = [];
        var cluster_flag = []
        for (var i in this.m.similarity) cluster_flag[i] = false; 
        
        for (var i in c) {
            var cluster = [c[i]];
            
            for (var j in this.m.similarity){
                if (this.m.similarity[c[i]][j] > eps && c.indexOf(j)==-1 && !cluster_flag[j]) {
                    cluster_flag[j] = true;
                    cluster.push(j);
                }
            } 
            
            if (cluster.length>1) cluster_list.push(cluster); 
        }
        
        for (var c in cluster_list) this.m.merge(cluster_list[c]);
        return cluster_list;
    }



}





