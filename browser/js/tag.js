
function TagManager(model) {
    this.m=model;
    this.old_tag = {
        0 : "clonotype_1",
        1 : "clonotype_2",
        2 : "clonotype_3",
        3 : "standard_1",
        4 : "standard_2",
        5 : "custom_1",
        6 : "custom_2",
        7 : "custom_3",
        8 : "none",
        9 : "smaller_clonotypes"
    }

    this.tag = {
        "clonotype_1":          {"color" : "#dc322f", "display" : true, name: "clonotype 1"},
        "clonotype_2":          {"color" : "#cb4b16", "display" : true, name: "clonotype 2"},
        "clonotype_3":          {"color" : "#b58900", "display" : true, name: "clonotype 3"},
        "standard_1":           {"color" : "#268bd2", "display" : true, name: "standard"},
        "standard_2":           {"color" : "#6c71c4", "display" : true, name: "standard(noise)"},
        "custom_1":             {"color" : "#2aa198", "display" : true, name: "custom 1"},
        "custom_2":             {"color" : "#d33682", "display" : true, name: "custom 2"},
        "custom_3":             {"color" : "#859900", "display" : true, name: "custom 3"},
        "none":                 {"color" : "",        "display" : true},
        "smaller_clonotypes":   {"color" : "#bdbdbd", "display" : true, name: "smaller clonotype"}
    }

    this.default_tag="none";
    this.distrib_tag="smaller_clonotypes";
}


TagManager.prototype = {

    // return default tag key
    getDefault: function() {
        return this.default_tag;
    },

    // return distrib tag key
    getDistrib: function() {
        return this.distrib_tag;
    },

    // return name of a corresponding tag key
    getName: function(key){
        if (this.tag[key] && this.tag[key].name) 
            return this.tag[key].name
        else
            return key
    },

    // return color of a corresponding tag key
    getColor: function(key){
        return this.tag[key].color
    },

    // return tag current display value
    isVisible: function(key){
        return this.tag[key].display
    },

    registerTag: function(key, color, display, name){

    },

    update: function (){
        for (var k in this.tag){
            $(".tagColor_"+k).prop("title", k);
            $(".tagName_"+k).html(k);
        }
        this.updateBoxes();
    },
    
  
    updateBoxes: function(){
        for (var k in this.tag){
            if (this.tag[k].display){
                $(".tagColor_"+k).removeClass("inactiveTag")
            }else{
                $(".tagColor_"+k).addClass("inactiveTag")
            }
        }
    },

    buildSelector: function() {

        this.tagSelector = document.createElement("div");
        this.tagSelector.className = "tagSelector";
        
        var closeTag = document.createElement("span");
        closeTag.className = "closeButton" ;
        closeTag.appendChild(icon('icon-cancel', ''));
        closeTag.onclick = function() {$(this).parent().hide('fast')};
        this.tagSelector.appendChild(closeTag);
        
        this.tagSelectorInfo = document.createElement("div")
        this.tagSelector.appendChild(this.tagSelectorInfo);
        
        this.tagSelectorList = document.createElement("ul")
        this.tagSelector.appendChild(this.tagSelectorList);
        
        document.body.appendChild(this.tagSelector);
        $('.tagSelector').hover(function() { 
            $(this).addClass('hovered');
        }, function() {
            $(this).removeClass('hovered');
        });
    },

    /**
     * open/build the tag/normalize menu for a clone
     * @param {integer} cloneID - clone index
     * */
    openSelector: function (clonesIDs, e) {
        var self = this;
        this.tagSelectorList.removeAllChildren();
        clonesIDs = clonesIDs !== undefined ? clonesIDs : this.clonesIDs; 
        this.clonesIDs=clonesIDs

        var buildTagSelector = function (tag_key) {
            var span1 = document.createElement('span');
            span1.className = "tagColorBox tagColor_" + tag_key
            span1.style.backgroundColor = self.getColor(tag_key)
            
            var span2 = document.createElement('span');
            span2.className = "tagName_" + tag_key + " tn"
            span2.appendChild(document.createTextNode(self.getName(tag_key)))

            var div = document.createElement('div');
            div.className = "tagElem"
            div.id = "tagElem_" + tag_key
            div.appendChild(span1)
            div.appendChild(span2)
            div.onclick = function () {
                for (var j = 0; j < clonesIDs.length; j++) {
                    self.m.clone(clonesIDs[j]).changeTag(tag_key)
                }
                $(self.tagSelector).hide('fast')
            }

            var li = document.createElement('li');
            li.appendChild(div)

            self.tagSelectorList.appendChild(li);
        }

        for (var k in this.tag) {
            buildTagSelector(k);
        }
        

        // add to report button
        var div2 = $('<div/>', {}).html("<hr>").appendTo($(this.tagSelectorList))
        var report_button = $('<div/>', { text: 'add clone(s) to next report'
                                        }).appendTo(div2)
                                            .click(function (){
                                                report.addClones(clonesIDs);
                                                $(self.tagSelector).hide('fast')
                                        });
        $('<button/>', { class: "icon-newspaper"}).appendTo(report_button)


        // Add normalization field only if one clone is selected
        if (clonesIDs.length ==1){
            var separator = document.createElement('div');
            separator.innerHTML = "<hr>"

            var span1 = document.createElement('span');
            span1.appendChild(document.createTextNode("normalize to: "))

            var div = document.createElement('div');
            div.id  = "normalization_expected_input_div"
            div.appendChild(separator)
            div.appendChild(span1)

            this.m.norm_input = document.createElement('input');
            this.m.norm_input.id = "normalized_size";
            this.m.norm_input.type = "text";
            this.m.norm_input.placeholder = (this.m.clone(clonesIDs[0]).getSize()*100).toFixed(2)

            var span2 = document.createElement('span');
            span2.appendChild(this.m.norm_input)
            span2.appendChild(document.createTextNode(" % "))
            
            this.m.norm_button = document.createElement('button');
            this.m.norm_input.id = "norm_button";
            this.m.norm_button.appendChild(document.createTextNode("ok"))

            this.m.norm_button.onclick = function () {
                var cloneID = self.clonesIDs[0];
                var size = parseFloat(self.m.norm_input.value)/100;

                if (size>0 && size<1){
                    self.m.set_normalization( self.m.NORM_EXPECTED )
                    $("#expected_normalization").show();
                    self.m.norm_input.value = ""
                    self.m.clone(cloneID).expected=size;
                    self.m.compute_normalization(cloneID, size)
                    self.m.update()
                    $(self.tagSelector).hide('fast')
                    $("expected_normalization_input").prop("checked", true)
                }else{
                    console.log({"type": "popup", "msg": "expected input between 0.0001 and 1"});
                }
            }
            this.m.norm_input.onkeydown = function (event) {
                if (event.keyCode == 13) self.m.norm_button.click();
            }

            div.appendChild(span2)
            div.appendChild(this.m.norm_button)

            var li = document.createElement('li');
            li.appendChild(div)
            this.tagSelectorList.appendChild(li);
        }

        var string;
        if (clonesIDs.length > 1){
            string = "Tag for " + clonesIDs.length +  " clonotypes"
        } else {
            if (clonesIDs[0][0] == "s") cloneID = clonesIDs[0].substr(3);
            string = "Tag for "+this.m.clone(clonesIDs[0]).getName()
        }
        this.tagSelectorInfo.innerHTML = string
        $(this.tagSelector).show();

        // selector size
        var tagSelectorH = $(this.tagSelector).outerHeight()
        var tagSelectorW = $(this.tagSelector).outerWidth()

        var offsetH = 2;
        var offsetW = 0;

        // position of clicked element
        var rect = e.target.getBoundingClientRect()
        var targetX = rect.x;
        var targetY = rect.y + rect.height;

        var minTop = 20;
        var maxTop = Math.max(20, $(window).height()-tagSelectorH);
        var top = targetY - tagSelectorH + offsetH;
        if (top<minTop) top=minTop;
        if (top>maxTop) top=maxTop;

        var maxLeft = $(window).width() - tagSelectorW;
        var left = targetX + rect.width + offsetW;
        if (left>maxLeft) 
            left = targetX - tagSelectorW + offsetW;

        this.tagSelector.style.top=top+"px";
        this.tagSelector.style.left=left+"px";
    },
}
