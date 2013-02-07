var map, idbLayer, untiled, cacheWrite;
var wfstProxy;
var cacheHits = 0;
var seeding = false;

OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";

var DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.layer = layer;
        this.handler = new OpenLayers.Handler.Feature(
            this, layer, {click: this.clickFeature}
        );
    },
    clickFeature: function(feature) {
        // if feature doesn't have a fid, destroy it
        if(feature.fid == undefined) {
            this.layer.destroyFeatures([feature]);
        } else {
            feature.state = OpenLayers.State.DELETE;
            this.layer.events.triggerEvent("afterfeaturemodified", 
                                           {feature: feature});
            feature.renderIntent = "select";
            this.layer.drawFeature(feature);
        }
    },
    setMap: function(map) {
        this.handler.setMap(map);
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },
    CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});

function init() {

    var extent = new OpenLayers.Bounds(
        506000, 122000, 516000, 132000
    );
    
    var maxExtent = new OpenLayers.Bounds(
        0,0,700000,1300000
    );


    map = new OpenLayers.Map('map', {
        projection: new OpenLayers.Projection("EPSG:27700"),
		units: 'm',
        displayProjection: new OpenLayers.Projection("EPSG:27700"),
        extent: extent,
        maxExtent: maxExtent,
        controls: [
            new OpenLayers.Control.PanZoom(),
            new OpenLayers.Control.Navigation()
        ]
    });
    // setup single tiled layer
	untiled = new OpenLayers.Layer.WMS(
		"Job polygons WMS", "http://osvm275:9090/geoserver/cite/wms",
		{
			LAYERS: 'cite:polygons_geo',
			STYLES: '',
			format: 'image/png',
			transparent: true
		},
		{
		   singleTile: true, 
		   ratio: 1, 
		   isBaseLayer: false,
		   yx : {'EPSG:27700' : false}
		} 
	);
   
   var protocol = new OpenLayers.Protocol.IndexedDb("TestDb17", 1, "TestFeatures");
   var bboxStrategy = new OpenLayers.Strategy.BBOX({autoActivate: false});
   var saveStrategy = new OpenLayers.Strategy.SaveIndexedDb();
   var editLayerName = "Editable Features";
   idbLayer = new OpenLayers.Layer.Vector(editLayerName, {
        strategies: [bboxStrategy, saveStrategy],
        protocol: protocol
    });
    
    /* global function to clear db */
    window.clearFeatureDb = function(){
        protocol.clearObjectStore(null);
    }
    
    protocol.openDb(function(){bboxStrategy.activate();}, this);

	var openspaceLayer = new OpenLayers.Layer.OsOpenSpace(
		"OS OpenSpace Layer",
		"http://openspace.ordnancesurvey.co.uk/osmapapi/ts",
		{ key: "CC19DCDCAA577402E0405F0ACA603788" },
		{ isBaseLayer: true, opacity: 0.2, eventListeners: {
                    tileloaded: updateCacheStatus
                } 
            }
	);
    
    map.addLayers([openspaceLayer, untiled, idbLayer]);

    var panel = new OpenLayers.Control.Panel({
        displayClass: 'customEditingToolbar',
        allowDepress: true
    });
    
    var draw = new OpenLayers.Control.DrawFeature(
        idbLayer, OpenLayers.Handler.Polygon,
        {
            title: "Draw Feature",
            displayClass: "olControlDrawFeaturePolygon",
            multi: true
        }
    );
    
    var edit = new OpenLayers.Control.ModifyFeature(idbLayer, {
        title: "Modify Feature",
        displayClass: "olControlModifyFeature"
    });

    var del = new DeleteFeature(idbLayer, {title: "Delete Feature"});
   
    var save = new OpenLayers.Control.Button({
        title: "Save Changes",
        trigger: function() {
            if(edit.feature) {
                edit.selectControl.unselectAll();
            }
            saveStrategy.save();
        },
        displayClass: "olControlSaveFeatures"
    });
    
    var checkOutBtn = new OpenLayers.Control.Button({
        title: "Check out data for current extent",
        trigger: clickReadWfst,
        displayClass: "olControlSaveFeatures"
    });
    
    var checkInBtn = new OpenLayers.Control.Button({
        title: "Check in data for current extent",
        trigger: clickWriteWfst,
        displayClass: "olControlSaveFeatures"
    });
/* 
    function clickReadWfst() {
        var bounds = map.getExtent();
        var wfstOptions = {
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://osvm275:9090/geoserver/wfs",
            featureNS :  "http://www.opengeospatial.net/cite",
            featureType: "cite:polygons_geo",
            geometryName: "geom",
        };
        var wfstProxy = new OpenLayers.WfstProxy(wfstOptions, readWfstCallback, this);
        wfstProxy.readFeatures(bounds);
    }
*/    
    wfstOptions = {
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://osvm275:9090/geoserver/wfs",
            featurePrefix: "cite",
            featureNS :  "http://www.opengeospatial.net/cite",
            featureType: "polygons_geo",
            geometryName: "wkb_geometry",
        };
    var wfstProxy = new OpenLayers.WfstProxy(wfstOptions, readWfstCallback, this, writeWfstCallback, this);
        
    function clickReadWfst() {
        var bounds = map.getExtent();
        wfstProxy.readFeatures(bounds);
    }
    
    
    function readWfstCallback(features) {
        var protocol = map.getLayersByName(editLayerName)[0].protocol;
        protocol.commit(features, {callback: loadWfstCallback, scope: this});

    }
    
    function clickWriteWfst() {
        //var bounds = map.getExtent();
        /*
        var wfstOptions = {
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://osvm275:9090/geoserver/wfs",
            featurePrefix: "cite",
            featureNS :  "http://www.opengeospatial.net/cite",
            featureType: "polygons_geo",
            geometryName: "geom",
        };
        var wfstProxy = new OpenLayers.WfstProxy(wfstOptions, writeWfstCallback, this);
        */
        wfstProxy.writeFeatures(idbLayer.features);
    }
    
    
    function writeWfstCallback(features) {
        var protocol = map.getLayersByName(editLayerName)[0].protocol;
        protocol.clearObjectStore({callback: clearIdbCallback, scope: this});

    }
    
    function loadWfstCallback(response) {
        console.log("WFST records inserted, response code: " + response.code);
        forceRefreshIdbLayer();
    }
    
    function clearIdbCallback() {
    	console.log("Local cache saved and cleared");
    	untiled.redraw(true);
    	forceRefreshIdbLayer();
    }
    
    function forceRefreshIdbLayer() {
    	for(var i = 0; i < idbLayer.strategies.length; i++) {
        	var strategy = idbLayer.strategies[i];
            if (strategy instanceof OpenLayers.Strategy.BBOX) {
            	strategy.update({force: true});
            	break;
            }
        }
    }
    
    /* tile caching */
    // try cache before loading from remote resource
    var cacheReader = new OpenLayers.Control.CacheRead({
        eventListeners: {
            activate: function() {
                console.log("cacheRead1 active");
            }
        }
    });
        
    cacheWrite = new OpenLayers.Control.CacheWrite({
        imageFormat: "image/png",
        eventListeners: {
            cachefull: function() {
                console.log("Cache full.");
                if (!window.localStorage) { return; }
                updateCacheStatus();
            },
            activate: function() {
                console.log("cacheWrite active");
            },
            deactivate: function() {
                console.log("cacheWrite inactive");
            }
        }
    });
        
    map.addControl(cacheReader);
    map.addControl(cacheWrite);
    /* cache end */

    panel.addControls([save, del, edit, draw, checkOutBtn, checkInBtn]);
    map.addControl(panel);
    map.zoomToExtent(extent, true);
}

