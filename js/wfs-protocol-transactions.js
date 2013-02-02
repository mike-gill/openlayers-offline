var map, wfs, untiled;
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
        400000, 100000, 420000, 120000
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

    var saveStrategy = new OpenLayers.Strategy.Save();
    
	/*
    wfs = new OpenLayers.Layer.Vector("Editable Features", {
        strategies: [new OpenLayers.Strategy.BBOX(), saveStrategy],
        projection: new OpenLayers.Projection("EPSG:27700"),
        protocol: new OpenLayers.Protocol.WFS({
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://localhost:8090/geoserver/avas/wfs",
            featureNS :  "http://www.geodigging.co.uk/avas",
            featureType: "schedmon",
            geometryName: "geom",
            schema: "http://localhost:8090/geoserver/avas/wfs/DescribeFeatureType?version=1.1.0&typename=avas:schedmon"
        })
    }); 
	*/

	wfs = new OpenLayers.Layer.Vector("Editable Features", {
        strategies: [new OpenLayers.Strategy.BBOX(), saveStrategy],
        protocol: new OpenLayers.Protocol.WFS({
            version: "1.1.0",
            srsName: "EPSG:27700",
            url: "http://localhost:8090/geoserver/wfs",
			featurePrefix: "avas",
            featureNS :  "http://www.geodigging.co.uk/avas",
            featureType: "schedmon",
            geometryName: "geom",
        })
    }); 

	var openspaceLayer = new OpenLayers.Layer.OsOpenSpace(
		"OS OpenSpace Layer",
		"http://openspace.ordnancesurvey.co.uk/osmapapi/ts",
		{ key: "CC19DCDCAA577402E0405F0ACA603788" },
		{ isBaseLayer: true, opacity: 0.2 }
	);
   
    map.addLayers([openspaceLayer, untiled, wfs]);

    var panel = new OpenLayers.Control.Panel({
        displayClass: 'customEditingToolbar',
        allowDepress: true
    });
    
    var draw = new OpenLayers.Control.DrawFeature(
        wfs, OpenLayers.Handler.Polygon,
        {
            title: "Draw Feature",
            displayClass: "olControlDrawFeaturePolygon",
            multi: true
        }
    );
    
    var edit = new OpenLayers.Control.ModifyFeature(wfs, {
        title: "Modify Feature",
        displayClass: "olControlModifyFeature"
    });

    var del = new DeleteFeature(wfs, {title: "Delete Feature"});
   
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

    panel.addControls([save, del, edit, draw]);
    map.addControl(panel);
    map.zoomToExtent(extent, true);
}

