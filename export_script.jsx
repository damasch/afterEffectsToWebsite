{
    /*************************************************
    PROPERTIES
    *************************************************/
    var name                = null; // Composition name
    var numFrames           = null; // Count Frames
    var main_counter        = 0;    // Count multiple Main C.

    var exportEnvronment    = null; // Declare the ExportDir
    
    // Composition objects
    var composition         = null; 
    var mask_Composition    = new Array();
    var effect_composition  = new Array();
    var mask_counter        = 0;
    var effect_counter      = 0;
    var rad                 =  Math.PI / 180;
    var camLayers           = new Array();
    
    // Hierarchy objects and 
    var relMatrix           = null;
    var relList             = null;
    var layerHierarchy      = new Array();
    var hierarchyString     = "";
    var hierarchyStringJSON = "";
    var deepNode            = 3;
    
    var rootNode            = new Object();
    rootNode.value          = 0;
    rootNode.children       = new Array();

    /*************************************************
    START // the beginning of the Script
    *************************************************/
    // Get the main, mask and effect compositions
    for(i = 1; i <= app.project.items.length; i++){
        var item = app.project.items[i];
        
        if(item instanceof CompItem){
            // Search for the main compostion(s)
            if(item.comment.toLowerCase() == "main"){
                if(main_counter == 0){
                    composition = item;	
                    name = composition.name;
                    numFrames = Math.floor(composition.duration / composition.frameDuration);
                }	
                main_counter++;	
            }
            // Search for mask compositions
            if(item.comment.toLowerCase() == "mask" ){
                mask_Composition[mask_counter] = item;
                mask_counter++;
            }
            // Search for effect compositions
            if(item.comment.toLowerCase() == "effect"){
                effect_composition[effect_counter] = item;
                effect_counter++;
            }
        }
    }
    
    // Multiple main compositions
    if(main_counter > 1){
        alert("Multiple definition of Main composition.\nFirst one was selected!");
    }

    // Exist a main composition
    if(composition != null){
        exportComposition();
    } else{
        alert('There is no Composition with a "main" Comment');
    }
    
    
	//Create Export
    function exportComposition(){
        // Open saveDialog for Export
        var exportFile          = File.saveDialog("Export Komposition", "*");
        if(exportFile != null){
            $.writeln ("Export");
            // Create an export environment
            exportEnvronment = createExportEnvironment(exportFile);
                
            // Create a composition file
            var compFile = createExportComp(exportFile);
            compFile.encoding = "UTF-8";
            compFile.open("w", "TEXT", "0777");
            
            // get data by specified object
            $.writeln ("Get data");
            var data = getData();
            
            $.writeln ("\t write File");
            // Datatype of the export is an JSON
            compFile.write('{');
            compFile.write('"data":{');
            compFile.write('"composition":{"name":"' + data.composition.name + '",');
            // Export Settings
            compFile.write('"settings":{');
            compFile.write('"dimension":{' + 
                            '"width":"' + data.composition.dimension.width + '",' +
                            '"height":"' + data.composition.dimension.height + '"' +
                            '},');
            
            // Export information
            compFile.write('"info":{' + 
                            '"framerate":"' + data.composition.info.framerate + '",' +
                            '"frameduration":"' + data.composition.info.frameduration + '",' +
                            '"duration":"' + data.composition.info.duration + '" ' +
                            '}');
            compFile.write('},');
            
            // Export Footage
            compFile.write('"footage":{');
            compFile.write('"item":[');
            for(var i = 0; i < data.footage.items.length; i++){
                var item = data.footage.items[i];
                compFile.write('{' +
                                '"type":"' + item.name + '",' +
                                '"source":"' + item.source + '",' +
                                '"name":"' + item.name + '",' +
                                '"id":"' + item.id + '"' );
                if(item.comment != ""){
                    compFile.write(',"comment":"');
                    compFile.write(item.comment);
                    compFile.write('"');
                }
                compFile.write('}');
                if(i < data.footage.items.length - 1){
                    compFile.write(',');
                }
            }
            compFile.write(']');
            compFile.write('},');
            
            // Export Layers
            compFile.write('"layers":[');
            for(var i = 0; i < data.layers.length; i++){
                compFile.write('{');;
                var item = data.layers[i];
                
                compFile.write('"type":"' + item.type + '",');;
                compFile.write('"index":"' + item.index + '",');;
                compFile.write('"name":"' + item.name + '",');
                compFile.write('"id":"' + item.id + '",');
                if(item.type == "filesource" || item.type == "footageitem" || item.type == "compitem"){
                     compFile.write('"source":"' + item.source + '",');
                }
                if(item.type == "solidsource"){
                    compFile.write('"source":{');
                    compFile.write('"color":"' + item.source.color.rgb + '",');
                    compFile.write('"height":"' + item.source.height + '",');
                    compFile.write('"width":"' + item.source.width + '"');
                    compFile.write('},');
                }
                compFile.write('"startFrame":"' + item.startFrame + '",');;
                compFile.write('"endFrame":"' + item.endFrame + '",');;
                compFile.write('"startTime":"' + item.startTime + '",');
                compFile.write('"endTime":"' + item.endTime + '"');
                
                if(item.comment != ""){
                    compFile.write(',"comment":"');
                    compFile.write(item.comment);
                    compFile.write('"');
                }
                
                if(item.comment != ""){
                    compFile.write(',"text":"');
                    compFile.write(item.text);
                    compFile.write('"');
                }
                
                compFile.write('}');
                if(i < data.layers.length - 1){
                    compFile.write(',');
                }
            }
            compFile.write('],');
            
            // Export hierarchy as an JSON object
            getLayerHierarchyJSON(rootNode);
            compFile.write('"hierarchy":{');
            compFile.write(hierarchyStringJSON);
            compFile.write('},');
            
            // Export all frames
            compFile.write('"frameSet":{"count":"' + data.framelist.length + '",');            
            compFile.write('"frame":[');
            for(var i = 0; i < data.framelist.length; i++){
                var frame = data.framelist[i];
                compFile.write('{');
                compFile.write('"time":"' + frame.time + '",');
                compFile.write('"index":"' + frame.index + '"');
                compFile.write(',');
                compFile.write('"layer":[');
                
                // Export all layer values at frame(i)
                for(var j = 0; j < frame.layerList.length; j++){
                    var layer = frame.layerList[j];
                    compFile.write('{');
                    compFile.write('"index":"' + layer.index + '",');
                    compFile.write('"id":"' + layer.id + '",');
                    compFile.write('"visible":"' + layer.visible + '",');
                    compFile.write('"is3dLayer":"' + layer.is3DLayer + '",');
                    compFile.write('"zIndex":"' + layer.zIndex + '",');
                    compFile.write('"opacity":"' + layer.opacity + '",');
                    compFile.write('"rotation":"' + layer.rotation + '",');
                    compFile.write('"anchorpoint":{');
                    compFile.write('"x":"' + layer.anchorpoint.x + '",');
                    compFile.write('"y":"' + layer.anchorpoint.y + '",');
                    compFile.write('"z":"' + layer.anchorpoint.z + '"');
                    compFile.write('},');
                    compFile.write('"position":{');
                    compFile.write('"x":"' + layer.position.x + '",');
                    compFile.write('"y":"' + layer.position.y + '",');
                    compFile.write('"z":"' + layer.position.z + '"');
                    compFile.write('},');
                    compFile.write('"scale":{');
                    compFile.write('"x":"' + layer.scale.x + '",');
                    compFile.write('"y":"' + layer.scale.y + '",');
                    compFile.write('"z":"' + layer.scale.z + '"');
                    compFile.write('}');
                    
                    
                    compFile.write('}');
                    if(j < frame.layerList.length - 1){
                        compFile.write(',');
                    }
                }
                compFile.write(']');
                compFile.write('}');
                if(i < data.framelist.length - 1){
                    compFile.write(',');
                }
            }
            compFile.write(']');            
            compFile.write('}');
            
            // End of JSON
            compFile.write('}');
            compFile.write('}');
            compFile.write('}');
            
            compFile.close('');
            
            // Export the effect Composition 
            for(var i = 0; i < effect_composition.length; i++){
                ExportEffectComposition(effect_composition[i]);
            }
            // Export the mask Composition 
            for(var i = 0; i < mask_Composition.length; i++){
                ExportMaskComposition(mask_Composition[i]);
            }
            var indexFile = new File(exportEnvronment + "/index.html");
            //indexFile.execute();
        }
    }
    
    /*************************************************
    METHODS
    *************************************************/    
    // Create an specified object
    function getData(){
        var data = new Object();
        $.writeln ("\t Composition");
        data.composition = getComposition();
        $.writeln ("\t Footage");
        data.footage = getFootage(true);
        $.writeln ("\t Layers");
        data.layers = getLayers();
        $.writeln ("\t Hierarchy");
        data.hierarchy = getHierarchy();
        $.writeln ("\t Framelist");
        data.framelist = getFrameList();
        //$.writeln(data.framelist.length);
        return data;
    }
    
    // Create Environment
    function createExportEnvironment(exFile){
        // Get Export enviroment
        var exportPath          = exFile.path;
        var exportName          = exFile.name;
        var exportEnv           = exportPath + "/" + exportName;
        
        var exportFolder        = new Folder (exportEnv);
        exportFolder.create();
        
        var thisScript = new File($.fileName);
        
        copyDirectory(thisScript.path + "/default", exportEnv);
        return exportEnv;
    }

    // Create Compositon XML File
    function createExportComp(exFile){
        // Get Environment
        var exportPath          = exFile.path;
        var exportName          = exFile.name;
        
        var exportJSON          = exportPath + "/" + exportName + "/json";
        var exportJSONFolder    = new Folder (exportJSON);
        
        if(exportJSONFolder.exists){
            //var compositionXMLFile  = new File(exportXML + "/composition.xml");
            var compositionJSONFile  = new File(exportJSON + "/composition.json");
            return compositionJSONFile;
        }
    }
    
    
    // Copy Directory recursively
    function copyDirectory(source, target){
        // Create new Folder from Source        
        var sFolder = new Folder(source);
        
        // Get the Files
        var files = sFolder.getFiles();
        
        for(var i = 0; i < files.length; i++){
            var fil = new File(files[i].fullName);
            
            // File has length (>0)
            // Folder has negative length (-1)
            if(fil.length >= 0){
                // Is File
                fil.copy (target + "/" + fil.name);
            } else {
                // Is Folder
                var fol = new Folder(fil.fullName);
                // Create new Target
                var nTarget = target + "/" + fol.name;
                // Folder
                var nFol = new Folder(nTarget);
                nFol.create();
                
                // Call recursion
                copyDirectory (fol.fullName, nTarget);
            }
        }        
    } 

    // Get composition informations
    function getComposition(){
        var myComposition = new Object();
        myComposition.name = composition.name;
        
        myComposition.dimension = new Object();
        myComposition.dimension.width = composition.width;
        myComposition.dimension.height = composition.height;
        
        myComposition.info = new Object();
        myComposition.info.framerate = composition.frameRate;
        myComposition.info.frameduration = composition.frameDuration;
        myComposition.info.duration = composition.duration;
        
        return myComposition;
    }

    // Get composition layers
    function getLayers(exportEnvronment){
        var layerList = new Array();
        
        for(var i = 1; i <= composition.layers.length; i++){
            var layer = composition.layers[i];
            var myLayer = new Object();
            myLayer.index = layer.index;
            myLayer.startFrame = layer.inPoint / composition.frameDuration
            myLayer.endFrame = layer.outPoint / composition.frameDuration;
            myLayer.startTime = layer.outPoint;
            myLayer.endTime = layer.outPoint;
            myLayer.source = "";
            myLayer.type = "";
            myLayer.source = "";
            myLayer.name = "";
            myLayer.comment = "";
            myLayer.text = "";
             
            // Check layer type it is important for the website
            if(layer instanceof TextLayer){
                myLayer.type = "textlayer";
                var textProp = layer.property("Source Text");
                myLayer.text = textProp.value.toString();
            }
            if(layer instanceof AVLayer){           
                if(layer.source instanceof CompItem){
                    myLayer.type = "compitem";
                    myLayer.source = layer.source.name.replace(/\ /g,'');
                    myLayer.source = source.toLowerCase();
                    myLayer.source = "footage/" + source;
                    if(exportEnvronment != null){
                        var exportDir = exportEnvronment + "/" + myLayer.source;
                        var exportFolder = new Folder (exportDir);
                        exportFolder.create();
                    }
                }
                if(layer.source instanceof FootageItem){
                    myLayer.type = "footageitem";
                    var currItem = layer.source;
                    if(currItem.mainSource instanceof FileSource){
                        myLayer.type = "filesource";
                        myLayer.source = 'footage/' + layer.source.file.name;
                    }
                    if(currItem.mainSource instanceof SolidSource){
                        myLayer.type = "solidsource";
                        myLayer.source = new Object()
                        myLayer.source.color = new Object();
                        myLayer.source.color.red = Math.round(currItem.mainSource.color[0] * 255);
                        myLayer.source.color.green = Math.round(currItem.mainSource.color[1] * 255);
                        myLayer.source.color.blue = Math.round(currItem.mainSource.color[2] * 255);
                        myLayer.source.color.rgb = "rgb(" + myLayer.source.color.red + 
                                                    "," + myLayer.source.color.green + 
                                                    "," + myLayer.source.color.blue + ")";
                        myLayer.source.height = currItem.height;
                        myLayer.source.width = currItem.width;                     
                    }
                    
                }
            }
            if(layer.source != null){
                myLayer.name = layer.source.name;
            }
            
            myLayer.comment = layer.comment.toString();            
            myLayer.id = myLayer.type + '_' + myLayer.index;
            
            layerList.push(myLayer);
        }
        return layerList;
    }
    
    // Get the files
    function getFootage(copyFootage){
        var dir = exportEnvronment;
        var myFootage = new Object();
        myFootage.items = new Array();
        for(i = 1; i <= app.project.numItems; i++){
            var currItem = app.project.items[i];
            
            var myFootageItem = new Object();
            
            myFootageItem.type = "";
            myFootageItem.source = "";
            myFootageItem.name = "";
            myFootageItem.id = "";
            myFootageItem.comment = "";
            
            if(currItem instanceof CompItem){
                var source = currItem.name.replace(/\ /g,'');
                myFootageItem.type = "compitem";                
                myFootageItem.source = "footage/" + source.toLowerCase();
                myFootageItem.name = currItem.name;
                myFootageItem.id = myFootageItem.type.toLowerCase()  + "_" + i;
                myFootageItem.comment = "" + currItem.comment;
                
                myFootage.items.push(myFootageItem);
            }   
            if(currItem instanceof FootageItem){
                myFootageItem.type = "footageitem";
                if(currItem.mainSource instanceof FileSource){
                    myFootageItem.type = "filesource";
                    myFootageItem.source = "footage/" + currItem.file.name;
                    myFootageItem.name = myFootageItem.type.toLowerCase() + "_" + i;
                    myFootageItem.id = myFootageItem.type.toLowerCase() + "_" + i;
                    if(copyFootage){
                        var target = dir + "/" + myFootageItem.source;
                        currItem.file.copy(target);
                    }
                    myFootage.items.push(myFootageItem);
                }
            }
        }
        
        return myFootage;
    }

    // Method for the first call
    function getHierarchy(){
        var hierarchy = new Object();
        hierarchy.relationList = initializeLayerList(composition.layers);
        getLayerHierarchy();
        hierarchy.rootNode = rootNode;
        //hierarchy.relationList
        return hierarchy;
    }

    // hierachy as XML node
    function getLayerHierarchyXML(node) {
        for(var i = 0; i < node.children.length; i++){
            var tabString ="";
            for(var j = 0; j < deepNode; j++){
                tabString += "\t";
            }
            deepNode++;
            hierarchyString += tabString + '<layer index="' + node.children[i].layer + '">\n';
            
            // recursive call
            getLayerHierarchyXML(node.children[i]);
            hierarchyString += tabString + '</layer>\n';
            deepNode--;
        }
    }

    // hierachy as JSON-object
    function getLayerHierarchyJSON(node) {
        hierarchyStringJSON += '"layer":[';
        for(var i = 0; i < node.children.length; i++){
            
            hierarchyStringJSON += '{"index":"' + node.children[i].layer + '"';
            if(node.children[i].children.length > 0){
                hierarchyStringJSON += ',';
                // recursive call
                getLayerHierarchyJSON(node.children[i]);
            } 
            hierarchyStringJSON += '}';
            if(i < (node.children.length - 1)){
                hierarchyStringJSON += ',';
            } 
        }
        hierarchyStringJSON += ']';
    }
    
    // initialize the adjazenz list
    function initializeLayerList(layers){
        relList = new Array();
        for(var i = 1; i <= layers.length; i++){
            relList[i - 1] = 0;
            
            var layer = layers[i];
            var node = new Object();
            node.layer = i;
            node.parent = 0;
             
            if(layer.parent != null){
                for(var j = 1; j <= layers.length ; j++){
                    if(layers[j] == layer.parent){
                        node.parent = j;
                    }
                }
            }
            relList[i - 1] = node;
        }
	}

    // initialize the adjazenz list
    function getLayerHierarchy(){
        // iterate the relation list
        for(var i = 0; i < relList.length; i++){
            // define by default parent as 0
            //$.writeln(relList[i].toSource());
            var parent = 0;
            
            // if parent is world 
            if(relList[i].parent == 0){
                // create new node object
                var node = new Object();
                // set the layer index 
                node.layer = relList[i].layer;
                // define a property of an array for the child nodes
                node.children = new Array();
                var hasChild = false;
                // search the node in the rootNode
                for(var x = 0; x < rootNode.children.length && !hasChild; x++){
                    // if rootNode contains the layer set the flag hasChild
                    if(rootNode.children[x].layer == node.layer){
                        hasChild = true;
                    }
                }
                // if the layer dosen't exsit in the child list add it
                if(!hasChild) rootNode.children.push(node);
            }
            else {
                // create a temp array
                var sourcePathArray = new Array();
                // if the layer has a parent
                sourcePathArray.push(relList[i]);
                // get the parent layer
                parent = relList[i].parent;
                // add the all parent and parent of parent to the sourcePathArray until 
                // until the root/world layer has detected 
                do{
                    sourcePathArray.push(relList[parent - 1]);
                    parent = relList[parent - 1].parent;
                } while(parent != 0);
                // define an node object
                var actNode = rootNode;

                // iterate the sourcePathArray reverse an add every layer to the rootNode
                // abbr. to the childnode list

                for(var j = sourcePathArray.length - 1; j >= 0; j--){
                    // create a node object
                    var node = new Object();
                    node.layer = sourcePathArray[j].layer;
                    node.children = new Array();
                    var tempNode = null;
                    var hasChild = false;
                    var x = 0;
                    // search the layer in the child nodes
                    while (x < actNode.children.length && !hasChild){                       
                        if(actNode.children[x].layer == node.layer){
                            tempNode = actNode.children[x];
                            hasChild = true;
                        }
                        x++
                    }
                    // if the node were found set ist to the actnode 
                    if(tempNode != null){
                        actNode = tempNode;
                    }else{
                        // or add the tempNode to the actNode child list
                        actNode.children.push(node);
                        actNode = node;
                    }
                }
            }
        }
    }
    
    // create the framelist
    function getFrameList(){
        var comp = composition;
        var cam = comp.activeCamera;
        var frameList = new Array();
        
        var numFrames = Math.floor(composition.duration / composition.frameDuration);
        
        // get for every single frame the properties of an layer
        for(var i = 0; i <= numFrames; i++){
            $.writeln ("Calc Frame:" + i);
            // Initialize and Set Frameitem
            var frameItem = new Object()
            frameItem.index = i;
            frameItem.layerList = null;
            frameItem.time = frameItem.index * composition.frameDuration;
            
            // Initialize and Set myCamera     
            // If no CameraLayer included use the Composition Camera defined by
            var myCam = getCamObject(frameItem.time);
            var layerList = new Array();
            for(var j = 1; j <= comp.layers.length; j++){
                var layer = comp.layers[j];
                var myLayer = getLayerPos(layer, myCam, frameItem.time, frameItem.index)
                layerList.push(myLayer);
            }
            frameItem.layerList = layerList;
            frameList.push(frameItem);
        }        
        return frameList
    }
    
    // calc 3D layer position
    function getLayerPos(layer, cam, time, index){
        var name = layer.name; // For debugging in databrowser
        var propPosition    = layer.property("Position"); 
        var propAnchorpoint = layer.property("Anchor Point");
        var propScale       = layer.property("scale");
        var propRotation    = layer.property("Rotation"); // Z-Axis (x-rotation, y-rotation, rotation)
        var propOpacity     = layer.property("Opacity");
        
        var valPosition     = propPosition.valueAtTime(time, true);
        var valAnchorpoint  = propAnchorpoint.valueAtTime(time, true);
        var valScale        = propScale.valueAtTime(time, true);
        var valRotation     = propRotation.valueAtTime(time, true);
        var valOpacity      = propOpacity.valueAtTime(time, true);
        
        var maxZDepth = Math.round(getMaxZDepth(time)) + 1000;
        
        var myLayer = new Object();
        
        myLayer.name = layer.name;
        
        myLayer.position = new Object();
        myLayer.position.x = valPosition[0]; 
        myLayer.position.y = valPosition[1]; 
        myLayer.position.z = valPosition[2]; 
        
        myLayer.anchorpoint = new Object();
        myLayer.anchorpoint.x = valAnchorpoint[0]; 
        myLayer.anchorpoint.y = valAnchorpoint[1]; 
        myLayer.anchorpoint.z = valAnchorpoint[2]; 
        
        myLayer.scale = new Object();
        myLayer.scale.x = valScale[0]; 
        myLayer.scale.y = valScale[1]; 
        myLayer.scale.z = valScale[2];         
        
        myLayer.rotation = valRotation;
        
        myLayer.opacity = valOpacity;
                
        myLayer.index = layer.index;
        
        myLayer.name = layer.name;
                        
        myLayer.is3DLayer = layer.threeDLayer != null && layer.threeDLayer == true;
        
        myLayer.sourceLayer = layer;
        
        myLayer.relationFactor = 1;
                
        myLayer.zIndex = maxZDepth;
        
        myLayer.start = layer.inPoint / composition.frameDuration;
        
        myLayer.end = layer.outPoint / composition.frameDuration;
        
        myLayer.visible = index >= myLayer.start && index <= myLayer.end;
        
        myLayer.type = "Layer";
        
        if(layer instanceof TextLayer){
            myLayer.type = "TextLayer";
        }
        if(layer instanceof AVLayer){            
            if(layer.source instanceof CompItem){
                myLayer.type = "CompItem";
            }   
            if(layer.source instanceof FootageItem){
                l_type = "FootageItem";
                if(layer.source.mainSource instanceof FileSource){
                    myLayer.type = "FileSource";
                }
                if(layer.source.mainSource instanceof SolidSource){
                    myLayer.type = "SolidSource";
                }
            }   
        }
    
        myLayer.id = myLayer.type.toLowerCase() + "_" + layer.index;
        
        if(!myLayer.is3DLayer){
            var lale = composition.layers.length;
            var lain = layer.index;
            var max_z = 0;;
            for(var d = layer.index; d <= composition.layers.length; d++){
                var dLayer = composition.layers[d];
                var propDPosition    = dLayer.property("Position"); 
                var valDPosition     = propDPosition.valueAtTime(time, true);
                if(max_z <= valDPosition[2]){
                    max_z = valDPosition[2]; 
                }
            }
            myLayer.zIndex -= max_z;
        }
        
        if(myLayer.is3DLayer){
            var parent = layer;            
            var parentList = new Array();
            while(parent != null){
                for(var k = 0; k < camLayers.length; k++){
                    if(camLayers[k] == parent) return myLayer;
                }
                parentList.push (parent);
                parent = parent.parent;
            }
            
            var tempLayer = new Object();
            tempLayer.absolute = new Object();
            tempLayer.absolute.z = 0;
            tempLayer.absolute.rotation = 0;
            
            var tempParent = new Object();
            
            tempParent.relationMatrix = new Object();  
            tempParent.relationMatrix.a11 = 1;
            tempParent.relationMatrix.a12 = 0;
            tempParent.relationMatrix.a13 = 0;
            tempParent.relationMatrix.a21 = 0;
            tempParent.relationMatrix.a22 = 1;
            tempParent.relationMatrix.a23 = 0;
            tempParent.relationMatrix.a31 = 0;
            tempParent.relationMatrix.a32 = 0;
            tempParent.relationMatrix.a33 = 1;
            
            tempParent.rotationMatrix = new Object();            
            tempParent.rotationMatrix.a11 = 1;
            tempParent.rotationMatrix.a21 = 0;
            tempParent.rotationMatrix.a12 = 0;
            tempParent.rotationMatrix.a22 = 1;
        
            tempParent.scale = 0;
            
            for(var j = parentList.length - 1; j >= 0; j--){
                var tParent = parentList[j];
                //$.writeln(tParent.name);
                
                var propParentPosition    = tParent.property("Position"); 
                var propParentAnchorpoint = tParent.property("Anchor Point");
                var propParentRotation    = tParent.property("Rotation"); // Z-Axis (x-rotation, y-rotation, rotation)
                
                var valParentPosition     = propParentPosition.valueAtTime(time, true);
                var valParentAnchorpoint  = propParentAnchorpoint.valueAtTime(time, true);
                var valParentRotation     = propParentRotation.valueAtTime(time, true);
                
                tempLayer.position = new Object();
                tempLayer.position.x = valParentPosition[0];
                tempLayer.position.y = valParentPosition[1];
                tempLayer.position.z = 1; // For extended Vektor 
                //$.writeln("position\t" + tempLayer.position.toSource());
                
                tempLayer.anchorpoint = new Object();
                tempLayer.anchorpoint.x = valParentAnchorpoint[0];
                tempLayer.anchorpoint.y = valParentAnchorpoint[1];
                tempLayer.anchorpoint.z = 1; // For extended Vektor
                //$.writeln("anchorpoint\t" + tempLayer.anchorpoint.toSource());
                
                tempLayer.absolute.z += valParentPosition[2];
                
                tempLayer.absolute.z -= valParentAnchorpoint[2];

                tempLayer.absolute.rotation += valParentRotation;
                
                myLayer.zIndex -= tempLayer.absolute.z;
                
                if(tempLayer.absolute.z - cam.world.position.z != 0){
                    tempLayer.scale = cam.zoom / (tempLayer.absolute.z - cam.world.position.z);
                }else{
                    tempLayer.scale = 0;
                }
                tempLayer.rotationMatrix = rotationMatrix(tempLayer.absolute.rotation);
                //$.writeln("rotationMatrix\t" + tempLayer.rotationMatrix.toSource());
                
                tempLayer.anchorpointRel = multRotationMatrixVektor(tempLayer.rotationMatrix, tempLayer.anchorpoint);
                //$.writeln("anchorpointRel\t" + tempLayer.anchorpointRel.toSource());

                //$.writeln("P.relationMatrix\t" + tempParent.relationMatrix.toSource());
                
                tempLayer.positionRel = multRelationMatrixVektor(tempParent.relationMatrix, tempLayer.position);
                //$.writeln("positionRel\t" + tempLayer.positionRel.toSource());
                
                tempLayer.originWorld = new Object();
                tempLayer.originWorld.x = tempLayer.positionRel.x - tempLayer.anchorpointRel.x;
                tempLayer.originWorld.y = tempLayer.positionRel.y - tempLayer.anchorpointRel.y;
                tempLayer.originWorld.z = tempLayer.absolute.z;
                //$.writeln("originWorld\t" + tempLayer.originWorld.toSource());
                
                tempLayer.projetion = new Object();
                tempLayer.projetion.x = (tempLayer.positionRel.x - cam.world.position.x) * tempLayer.scale;
                tempLayer.projetion.y = (tempLayer.positionRel.y - cam.world.position.y) * tempLayer.scale;
                //$.writeln("projetion\t" + tempLayer.projetion.toSource());
                
                tempLayer.parallax = new Object();
                tempLayer.parallax.x = tempLayer.projetion.x + composition.width/2;
                tempLayer.parallax.y = tempLayer.projetion.y + composition.height/2;
                tempLayer.parallax.z = 1;
                //$.writeln("parallax\t" + tempLayer.parallax.toSource());
                
                if(tParent.parent != null){
                    tempLayer.camRelation = new Object();
                    tempLayer.camRelation.x = (tempParent.originWorld.x - cam.world.position.x) * tempParent.scale;
                    tempLayer.camRelation.y = (tempParent.originWorld.y - cam.world.position.y) * tempParent.scale;
                    //$.writeln("camRelation\t" + tempLayer.camRelation.toSource());
                    
                    tempLayer.worldRelation = new Object();
                    tempLayer.worldRelation.x = tempLayer.camRelation.x + composition.width/2;
                    tempLayer.worldRelation.y = tempLayer.camRelation.y + composition.height/2;
                    
                    tempLayer.reproMatrix = new Object();
                    tempLayer.reproMatrix.a11 = tempParent.relationMatrix.a11 * tempParent.scale;
                    tempLayer.reproMatrix.a12 = tempParent.relationMatrix.a12 * tempParent.scale;
                    tempLayer.reproMatrix.a13 = tempLayer.worldRelation.x;
                    tempLayer.reproMatrix.a21 = tempParent.relationMatrix.a21 * tempParent.scale;
                    tempLayer.reproMatrix.a22 = tempParent.relationMatrix.a22 * tempParent.scale;
                    tempLayer.reproMatrix.a23 = tempLayer.worldRelation.y ;
                    tempLayer.reproMatrix.a31 = 0;
                    tempLayer.reproMatrix.a32 = 0;
                    tempLayer.reproMatrix.a33 = 1;
                    
                    tempLayer.detMatrix = determinateMatrix(tempLayer.reproMatrix);
                    //$.writeln("reproMatrix_det\t" + tempLayer.detMatrix);
                    
                    //$.writeln("reproMatrix\t" + tempLayer.reproMatrix.toSource());
                    
                    tempLayer.reproMatrixT = transposeMatrix(tempLayer.reproMatrix);
                    //$.writeln("reproMatrixT\t" + tempLayer.reproMatrixT.toSource());
                    
                    tempLayer.reproMatrixInv = inverseMatrix(tempLayer.reproMatrix);
                    //$.writeln("reproMatrixInv\t" + tempLayer.reproMatrixInv.toSource());
                    
                    tempLayer.reproPosition = multRelationMatrixVektor(tempLayer.reproMatrixInv, tempLayer.parallax);
                    //$.writeln("reproPosition\t" + tempLayer.reproPosition.toSource());
                }else{
                    tempLayer.reproPosition = new Object();
                    tempLayer.reproPosition.x = tempLayer.parallax.x;
                    tempLayer.reproPosition.y = tempLayer.parallax.y;
                }
                
                tempParent.originWorld = tempLayer.originWorld;
                
                tempParent.relationMatrix.a11 = tempLayer.rotationMatrix.a11;
                tempParent.relationMatrix.a12 = tempLayer.rotationMatrix.a12;
                tempParent.relationMatrix.a13 = tempParent.originWorld.x;
                tempParent.relationMatrix.a21 = tempLayer.rotationMatrix.a21;
                tempParent.relationMatrix.a22 = tempLayer.rotationMatrix.a22;
                tempParent.relationMatrix.a23 = tempParent.originWorld.y;
                tempParent.relationMatrix.a31 = 0;
                tempParent.relationMatrix.a32 = 0;
                tempParent.relationMatrix.a33 = 1;
            
                tempParent.rotationMatrix = tempLayer.rotationMatrix;
                tempParent.scale = tempLayer.scale;
                
                
            }
            
            myLayer.scale.x = myLayer.scale.x * tempLayer.scale;
            myLayer.scale.y = myLayer.scale.y * tempLayer.scale;
            
            myLayer.position.x = tempLayer.reproPosition.x; 
            myLayer.position.y = tempLayer.reproPosition.y; 
        }
        var foo = 12 + 987;
        return myLayer;
    }
    
    // help function for debugging
    function printMatrix(matrix){
        $.writeln(matrix.a11 + "\t" + matrix.a12 + "\t" + matrix.a13);
        $.writeln(matrix.a21 + "\t" + matrix.a22 + "\t" + matrix.a23);
        $.writeln(matrix.a31 + "\t" + matrix.a32 + "\t" + matrix.a33);
        return "";
    }
    // inverse Matrix
    function inverseMatrix(matrix){
        var transMatrix = transposeMatrix(matrix);
        var detMatrix = determinateMatrix(matrix);
        var invMatrix = new Object(); 
        
        invMatrix.a11 = +(transMatrix.a22*transMatrix.a33 - transMatrix.a23*transMatrix.a32) / detMatrix;
        invMatrix.a12 = -(transMatrix.a21*transMatrix.a33 - transMatrix.a23*transMatrix.a31) / detMatrix;
        invMatrix.a13 = +(transMatrix.a21*transMatrix.a32 - transMatrix.a22*transMatrix.a31) / detMatrix;
        
        invMatrix.a21 = -(transMatrix.a12*transMatrix.a33 - transMatrix.a13*transMatrix.a32) / detMatrix;
        invMatrix.a22 = +(transMatrix.a11*transMatrix.a33 - transMatrix.a13*transMatrix.a31) / detMatrix;
        invMatrix.a23 = -(transMatrix.a11*transMatrix.a32 - transMatrix.a12*transMatrix.a31) / detMatrix;
        
        invMatrix.a31 = +(transMatrix.a12*transMatrix.a23 - transMatrix.a13*transMatrix.a22) / detMatrix;
        invMatrix.a32 = -(transMatrix.a11*transMatrix.a23 - transMatrix.a13*transMatrix.a21) / detMatrix;
        invMatrix.a33 = +(transMatrix.a11*transMatrix.a22 - transMatrix.a12*transMatrix.a21) / detMatrix;
        return invMatrix;
    }

    // transpose Matrix   
   function transposeMatrix(matrix){
        var tMatrix = new Object();
        tMatrix.a11 = matrix.a11;
        tMatrix.a12 = matrix.a21;
        tMatrix.a13 = matrix.a31;
        tMatrix.a21 = matrix.a12;
        tMatrix.a22 = matrix.a22;
        tMatrix.a23 = matrix.a32;
        tMatrix.a31 = matrix.a13;
        tMatrix.a32 = matrix.a23;
        tMatrix.a33 = matrix.a33;
        return tMatrix;
    }
    // determinate Matrix
    function determinateMatrix(matrix){
        return (matrix.a11 * matrix.a22 * matrix.a33 +
        matrix.a12 * matrix.a23 * matrix.a31 +
        matrix.a13 * matrix.a21 * matrix.a32) 
        - 
        (matrix.a13 * matrix.a22 * matrix.a31 +
        matrix.a12 * matrix.a21 * matrix.a33 +
        matrix.a11 * matrix.a23 * matrix.a31);
    }
    
    // rotate Matrix alpha in degree
    function rotationMatrix(alpha){
        var rotationMatrix = new Object();
        rotationMatrix.a11 = Math.cos(alpha * rad);
        rotationMatrix.a12 = -Math.sin(alpha * rad);
        rotationMatrix.a21 = Math.sin(alpha * rad);
        rotationMatrix.a22 = Math.cos(alpha * rad);
        return rotationMatrix;
    }
    // mult 2x2 Matrix with position vektor
    function multRotationMatrixVektor(rotationMatrix, vektor){
        var anchorpointRel = new Object();
        anchorpointRel.x = rotationMatrix.a11 * vektor.x + rotationMatrix.a12 * vektor.y;
        anchorpointRel.y = rotationMatrix.a21 * vektor.x + rotationMatrix.a22 * vektor.y;
        return anchorpointRel;
    }
    // mult 3x3 Matrix with extended position vektor
    function multRelationMatrixVektor(relationMatrix, vektor){
        var positionRel = new Object();
        positionRel.x = relationMatrix.a11 * vektor.x + relationMatrix.a12 * vektor.y + relationMatrix.a13 * vektor.z;
        positionRel.y = relationMatrix.a21 * vektor.x + relationMatrix.a22 * vektor.y + relationMatrix.a23 * vektor.z;
        positionRel.z = relationMatrix.a31 * vektor.x + relationMatrix.a32 * vektor.y + relationMatrix.a33 * vektor.z;
        return positionRel;
    }
    // get the properties of the active camera at time
    function getCamObject(time){
        var activeCam = composition.activeCamera;
        var myCam = new Object();

        myCam.position = new Object();
        myCam.position.x = 0; // Left of Composition
        myCam.position.y = 0; // Top of Composition
        myCam.position.z = -1770; // Testet in Projekt Composition
        
        
        myCam.anchorpoint = new Object();            
        myCam.anchorpoint.x = composition.width / 2;// midddle of Composition width
        myCam.anchorpoint.y = composition.height / 2;// midddle of Composition height
        myCam.anchorpoint.z = 0; 
        
        myCam.zoom = 1770; // Should be the positve value of myCam.position.z 
                           // Layer at z-Position = 0 has relation 1:1
        
        myCam.world = new Object();
        myCam.world.position = new Object();
        myCam.world.position.x = 0; // Left of Composition
        myCam.world.position.y = 0; // Top of Composition
        myCam.world.position.z = -1770; // Testet in Projekt Composition
        
        myCam.world.anchorpoint = new Object();            
        myCam.world.anchorpoint.x = composition.width / 2;// midddle of Composition width
        myCam.world.anchorpoint.y = composition.height / 2;// midddle of Composition height
        myCam.world.anchorpoint.z = 0; 
        
        if(activeCam != null){
            var propCamPosition = activeCam.property("Position");
            var propCamAnchor = activeCam.property("Anchor Point");
            
            var valCamPosition = propCamPosition.valueAtTime(time , true);
            var valCamAnchor = propCamAnchor.valueAtTime(time , true);        
            
            myCam.position.x = valCamPosition[0];
            myCam.position.y = valCamPosition[1];
            myCam.position.z = valCamPosition[2];
            
            myCam.anchorpoint.x = valCamAnchor[0];
            myCam.anchorpoint.y = valCamAnchor[1];
            myCam.anchorpoint.z = valCamAnchor[2];
            
            myCam.world.position.x = myCam.position.x; 
            myCam.world.position.y = myCam.position.y; 
            myCam.world.position.z = myCam.position.z;    
            
            myCam.world.anchorpoint.x = myCam.anchorpoint.x;
            myCam.world.anchorpoint.y = myCam.anchorpoint.y;
            myCam.world.anchorpoint.z = myCam.anchorpoint.z; 
        
            var propZoom = activeCam.property("Zoom");
            myCam.zoom = propZoom.valueAtTime(time , true);
            
            var parent = activeCam;
            
            while(parent != null){
                camLayers.push(parent);
                
                var propCamPosition = parent.property("Position");
                var propCamAnchor = parent.property("Anchor Point");
                
                var valCamPosition = propCamPosition.valueAtTime(time, true);
                var valCamAnchor = propCamAnchor.valueAtTime(time, true);
                
                myCam.world.position.x += valCamPosition[0];
                myCam.world.position.y += valCamPosition[1];
                myCam.world.position.z += valCamPosition[2];
                
                myCam.world.anchorpoint.x += valCamAnchor[0];
                myCam.world.anchorpoint.y += valCamAnchor[1];
                myCam.world.anchorpoint.z += valCamAnchor[2];
                
                parent = parent.parent;
            } 
        }
        return myCam;
    }

    // calc the the max distanz between 
    // the foremost and sternmost layer at time x
    function getMaxZDepth(time){
		var min = 0;
		var max = 0;
		for(var j = 1; j <= composition.layers.length; j++){
			var layer = composition.layers[j];
			var propPosition = layer.property("Position");
			var valPosition = propPosition.valueAtTime(time, true);
			if(layer.threeDLayer != null && layer.threeDLayer){
				if(valPosition[2] < min) min = valPosition[2];
				if(valPosition[2] > max) max = valPosition[2];
			}
		}
		return max - min;
	}      
}