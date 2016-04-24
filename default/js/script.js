var ae_xml 		= null; 
var data 		= null;
var currFrame 	= null;

var akt_kf 		= 0;
var max_frame 	= 500;
var min_frame 	= 0;
var step_frame 	= 1;

var iniWinHeight = 0;
var iniScrollTop = 0;

var hierachy = '';

$(document).ready(function(){
	$.ajax({
        type: "GET",
		//url: "export_voll.xml",
		//url: "xml/composition.xml",
		//dataType: "xml"
		url: "json/composition.json",
		contentType: 'application/json; charset=utf-8',
		dataType: "json",
		success: function(result) {
			
			data = result.data;
			//alert(JSON.stringify(data.composition.settings.dimension.width));return;
			var comp = data.composition;
			
			document.title = comp.name;
			max_frame = data.composition.frameSet.count;
			$("#view").width(comp.settings.dimension.width);
			$("#view").height(comp.settings.dimension.height);
			$("#page").width(comp.settings.dimension.width);
			$("#info").css("left", (comp.settings.dimension.width / 2 - $("#info").width() / 2) + "px");
			$("#info").css("top", (comp.settings.dimension.height / 2 - $("#info").height() / 2) + "px");
			//$("#view").height(comp.settings.dimension.height);
			iniWinHeight = parseInt($(window).height())
			var nh = iniWinHeight + parseInt(comp.frameSet.count) + 1;
			$("body").height(nh);
			//console.log("foo");
			getHierachy(comp.hierarchy);
			//console.log(hierachy);
			$("#composition").append(hierachy);
			for(var i = 0; i < comp.layers.length; i++){
				var layer = comp.layers[i];
				var layerC = "";
				if(layer.type == "compitem"){
					layerC = '<img ' + 
								'src="" ' +
								'alt="img/empty.png" ' + 
								'id="' + layer.id + '"/>';
					for(var j = 0; j < comp.footage.item.length; j++){
						if(comp.footage.item[j].comment == "mask" && 
							comp.footage.item[j].source == layer.source){
							
							layer.source = layer.source + "/image_0.png";
							layer.type = "filesource";
						}
						if(comp.footage.item[j].comment == "effect" && 
							comp.footage.item[j].source == layer.source){
							for(var k = 0; k < layer.endFrame - layer.startFrame; k++){
								$("#info").html("Lade " + layer.name + " image_" + k + ".png" + '" ' );
								var effectImage = '<img ' + 
									'src="' + layer.source + "/image_" + k + ".png" + '" ' +
									'alt="" ' + 
									'class="effect c_' + layer.id + '"/>';
								$("#preload").append(effectImage);
							}
						}
					}
				}
				if(layer.type == "solidsource"){
					layerC = '<div ' + 'id="' + layer.id + '"' + 
								'style="' + 
									'background-color:' + layer.source.color + ';' +  
									'height:' + layer.source.height + 'px;' +  
									'width:' + layer.source.width + 'px;' +  
								'"' +
								' class="soldsource"></div>';
				}
				if(layer.type == "filesource"){
					layerC = '<img ' + 
								'id="' + layer.id + '" ' + 
								'src="' + layer.source + '" ' + 
								'alt="" ' + 
								'class="filesource"/></div>';
				}
				if(layer.type == "textlayer"){	
					layerC = '<div ' + 'id="' + layer.id + '" class="textlayer">' + layer.text + '</div';			
				}
				//console.log("#cl_" + layer.index);
				$("#cla_" + layer.index).append(layerC);
			}
			ArangeCompByFrame(akt_kf);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			//console.log(xhr.status);
			//console.log(thrownError);
		}
	});
	$("#info").hide();
	
});

function getHierachy(layerNode){
	if(layerNode != null && layerNode.layer != null){
		if(layerNode.layer.length != null){
			for(var i = 0; i < layerNode.layer.length; i++){
				hierachy += '<div id="clp_' + layerNode.layer[i].index + '" class="controlLayerPosition">\n';
				hierachy += '<div id="cla_' + layerNode.layer[i].index + '" class="controlLayerAnchor">\n';
				if(layerNode.layer != null){
					getHierachy(layerNode.layer[i]);
				}
				hierachy += '</div>\n';
				hierachy += '</div>\n';
			}
		}else{
			hierachy += '<div id="clp_' + layerNode.layer[i].index + '" class="controlLayerPosition">\n';
			hierachy += '<div id="cla_' + layerNode.layer[i].index + '" class="controlLayerAnchor">\n';
			if(layerNode.layer != null){
				getHierachy(layerNode.layer);
			}
			hierachy += '</div>\n';		
			hierachy += '</div>\n';		
		}
	}
}

$(document).scroll(function(event) {
	akt_kf = $(document).scrollTop();
	ArangeCompByFrame(akt_kf);
});

$(document).mousewheel(function(event, delta) {
	scrollPage ( delta);
	event.preventDefault();	
});

function scrollPage ( delta){
	if(delta < 0){
		//akt_kf+=10;
		if(akt_kf > max_frame){
			//akt_kf = min_frame;
		}else{
			akt_kf += step_frame;
		}
	}
	else if(delta > 0){
		if(akt_kf < min_frame){
			//akt_kf = max_frame;
		}else{
			akt_kf -= step_frame;
		}
	}
	$(document).scrollTop(akt_kf);
	ArangeCompByFrame(akt_kf);
}
function ArangeCompByFrame(frameIndex){
	$("#frameIndex").text(frameIndex);
	
	//currFrame = $(ae_xml).find("frameSet frame:nth-child(" + frameIndex + ")");
	if(frameIndex < 0 || frameIndex > data.composition.frameSet.count) return;
	currFrame = data.composition.frameSet.frame[frameIndex];
	
	if(currFrame != null){
		for (var i = 0; i < currFrame.layer.length; i++){
			var layer = currFrame.layer[i];
			var visible = layer.visible;
			//console.log("#cl_" + layer.index + " " + layer.zIndex);
			if(layer.visible == "true"){
				var deffLayer = data.composition.layers[layer.index - 1];
				if(deffLayer.type == "compitem"){
					//console.log(frameIndex + " : " + deffLayer.startFrame + " - " + deffLayer.endFrame);
					//console.log(frameIndex - deffLayer.startFrame);
					//console.log(deffLayer.source);
					var offset = frameIndex - deffLayer.startFrame;
					var image = "img/empty.png";
					var t_img = deffLayer.source + "/image_" + offset + ".png";
					//console.log(t_img);
					if(ImageExist(t_img)){
						image = t_img;
					}
					$("#" + layer.index).attr("src", image);
				}
				
				$("#" + layer.index).show();
				$("#" + layer.id).css({ 
					opacity: layer.opacity / 100,
					'z-index': Math.round(layer.zIndex),
					"transform" : "scale(" + (layer.scale.x / 100) + "," + (layer.scale.x / 100) + ")",
				});
				$("#cla_" + layer.index).css({ 
					'left': (layer.anchorpoint.x * -1) + "px",
					'top': (layer.anchorpoint.y * -1) + "px",
					'z-index': Math.round(layer.zIndex),
				});
				$("#clp_" + layer.index).css({ 
					'left': layer.position.x + "px",
					'top': layer.position.y + "px",
					"transform" : "rotate(" + layer.rotation + "deg)",
					'z-index': Math.round(layer.zIndex),
				});
			} else {
				$("#cl_" + layer.index).hide();
			}
		}
	}
} 


function ImageExist(url) 
{
   var img = new Image();
   img.src = url;
   return img.height != 0;
}