/**
 * @author mgill
 */
OpenLayers.WfstProxy = OpenLayers.Class(
{
    protocol: null,
    response: null,
    // Storing callback and scope here is probably bad - TODO - look
    // at using something similar to OpenLayers.Protocol.createCallback().
    callback: null,
    writeCallback: null,
    scope: null,
    writeScope: null,
    
    
    
    initialize: function(wfstOptions, callback, scope, writeCallback, writeScope) {
        this.protocol = new OpenLayers.Protocol.WFS(wfstOptions);
        this.callback = callback;
        this.writeCallback = writeCallback;
        this.scope = scope;
        this.writeScope = writeScope;
    },
    
    readFeatures: function(bounds, options) {
        if (this.response && !(options && options.noAbort === true)) {
            this.protocol.abort(this.response);
        }
        this.response = this.protocol.read(
            OpenLayers.Util.applyDefaults({
                filter: this.createFilter(bounds),
                callback: this.handleReadResponse,
                scope: this
            }, options));
    },
    
    /**
     * Method: createFilter
     * Creates a spatial BBOX filter. If the layer that this strategy belongs
     * to has a filter property, this filter will be combined with the BBOX 
     * filter.
     * 
     * Returns
     * {<OpenLayers.Filter>} The filter object.
     */
    createFilter: function(bounds) {
        var filter = new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.BBOX,
            value: bounds,
            projection: this.protocol.srsName
        });
        return filter;
    },
    
    handleReadResponse: function(resp) {
        var features = resp.features;
        this.callback.call(this.scope, features);
        this.response = null;
    },
    
    writeFeatures: function(features) {
    	var saveFeatures = [];
    	
    	for (var i = 0; i < features.length; i++) {
    		var feature = features[i];
    		if(feature.state === OpenLayers.State.INSERT ||
    	       feature.state === OpenLayers.State.UPDATE ||
    	       feature.state === OpenLayers.State.DELETE) {
    			saveFeatures.push(feature);
    		}
    	}
    	console.log("About to write " + saveFeatures.length + " features");
    	
    	this.response = this.protocol.commit(
    		saveFeatures, 
            OpenLayers.Util.applyDefaults({
                callback: this.handleWriteResponse,
                scope: this
            }, {}));
    },
    
    handleWriteResponse: function(resp) {
        this.writeCallback.call(this.writeScope);
    }
    
});