OpenLayers.Layer.OsOpenSpace = OpenLayers.Class(OpenLayers.Layer.WMS, {
    initialize: function(name, url, params, options) {
        //params = OpenLayers.Util.upperCaseObject(params);
		if (params == null) { params = {}; }
		params.format = 'image/png';
		params.url = document.URL;
		if (!params.key){
			OpenLayers.Console.warn("A valid 'key' parameter must be passed in the parameter list");
		}

		if (options == null) { options = {}; }
		if (!options.maxExtent){ options.maxExtent = new OpenLayers.Bounds(0, 0, 800000, 1300000); }
		if (!options.resolutions){ options.resolutions = new Array(2500, 1000, 500, 200, 100, 50, 25, 10, 5, 2, 1); }
		if (!options.tileSizes){ options.tileSizes = new Array(200, 200, 200, 200, 200, 200, 200, 200, 200, 250, 250); }
		options.projection = new OpenLayers.Projection("EPSG:27700");
		options.attribution = "&copy; Crown Copyright &amp; Database Right 2008.&nbsp; All rights reserved.<br />"
			+ "<a href=\"http://openspace.ordnancesurvey.co.uk/openspace/developeragreement.html#" 
		    + "enduserlicense\" target=\"_blank\" title=\"openspace.ordnancesurvey.co.uk\">End User License Agreement</a>"

		var newArguments = [];
        newArguments.push(name, url, params, options);
        OpenLayers.Layer.WMS.prototype.initialize.apply(this, newArguments);
	},

	/**
     * Method: clone
     * Create a clone of this layer
     *
     * Returns:
     * {<OpenLayers.Layer.WMS>} An exact clone of this layer
     */
    clone: function (obj) {
        
        if (obj == null) {
            obj = new OpenLayers.Layer.OsOpenSpace(this.name,
                                           this.url,
                                           this.params,
                                           this.getOptions());
        }

        //get all additions from superclasses
        obj = OpenLayers.Layer.WMS.prototype.clone.apply(this, [obj]);

        // copy/set any non-init, non-simple values here

        return obj;
    },    

    moveTo: function(bounds, zoomChanged, dragging) {
		if (zoomChanged) {
			var	resolution = this.getResolution();
			newTileSize = 200;
			for (var i = 0; i < this.resolutions.length; i++) {
				if (this.resolutions[i] == resolution){
					newTileSize = this.tileSizes[i];
				}
			}

			if( this.tileSize.w != newTileSize ) {
				this.setTileSize(new OpenLayers.Size(newTileSize, newTileSize));
				this.clearGrid();
				
			}
			this.params = OpenLayers.Util.extend( this.params, OpenLayers.Util.upperCaseObject({"layers":resolution}) );
		}
		OpenLayers.Layer.WMS.prototype.moveTo.apply(this, arguments);
	},

    CLASS_NAME: "OsOpenSpace"
});