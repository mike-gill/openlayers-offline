var map, idbLayer, untiled;
//OpenLayers.ProxyHost = "../proxy.cgi?url=";

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
        405000, 110000, 415000, 120000
    );


    map = new OpenLayers.Map('map', {
        projection: new OpenLayers.Projection("EPSG:27700"),
		units: 'm',
        displayProjection: new OpenLayers.Projection("EPSG:27700"),
        maxExtent: extent,
        controls: [
            new OpenLayers.Control.PanZoom(),
            new OpenLayers.Control.Navigation()
        ]
    });
    // setup single tiled layer
	untiled = new OpenLayers.Layer.WMS(
		"avas:schedmon - Untiled", "http://localhost:8090/geoserver/avas/wms",
		{
			LAYERS: 'avas:schedmon',
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
   
   var protocol = new OpenLayers.Protocol.IndexedDb("TestDb9", 1, "TestFeatures");
   var bboxStrategy = new OpenLayers.Strategy.BBOX({autoActivate: false})
   var saveStrategy = new OpenLayers.Strategy.SaveIndexedDb();
   var editLayerName = "Editable Features";
   idbLayer = new OpenLayers.Layer.Vector(editLayerName, {
        strategies: [bboxStrategy, saveStrategy],
        protocol: protocol
    });
    
    protocol.openDb(function(){bboxStrategy.activate();}, this);

	var openspaceLayer = new OpenLayers.Layer.OsOpenSpace(
		"OS OpenSpace Layer",
		"http://openspace.ordnancesurvey.co.uk/osmapapi/ts",
		{ key: "CC19DCDCAA577402E0405F0ACA603788" },
		{ isBaseLayer: true, opacity: 0.2 }
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
    
    function clickReadWfst() {
        var bounds = map.getExtent();
        var wfstOptions = {
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://localhost:8090/geoserver/wfs",
            featurePrefix: "avas",
            featureNS :  "http://www.geodigging.co.uk/avas",
            featureType: "schedmon",
            geometryName: "geom",
        }
        var wfstProxy = new OpenLayers.WfstProxy(wfstOptions, readWfstCallback, this);
        wfstProxy.readFeatures(bounds);
    }
    
    function readWfstCallback(features) {
        var protocol = map.getLayersByName(editLayerName)[0].protocol;
        protocol.commit(features, {callback: loadWfstCallback, scope: this});
    }
    
    function loadWfstCallback(response) {
        console.log("WFST records inserted, response code: " + response.code);
    }

    panel.addControls([save, del, edit, draw, checkOutBtn]);
    map.addControl(panel);
    map.zoomToExtent(extent, true);
}

