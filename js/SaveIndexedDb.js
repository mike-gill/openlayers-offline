/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Strategy.js
 */

/**
 * Class: OpenLayers.Strategy.SaveGeoStore
 * A strategy that commits newly created or modified features.  It is
 * closely based on the original OpenLayers.Save strategy, but in this
 * case the Protocol manages the clearing of state on the features as
 * they are saved
 * 
 *   By default the strategy waits for a call to <save> before persisting changes.
 *   By configuring the strategy with the <auto> option, changes can be saved
 *     automatically.
 *
 * Inherits from:
 *  - <OpenLayers.Strategy>
 */
OpenLayers.Strategy.SaveIndexedDb = OpenLayers.Class(OpenLayers.Strategy, {
    
    /**
     * APIProperty: events
     * {<OpenLayers.Events>} An events object that handles all 
     *     events on the strategy object.
     *
     * Register a listener for a particular event with the following syntax:
     * (code)
     * strategy.events.register(type, obj, listener);
     * (end)
     *
     * Supported event types:
     * start - Triggered before saving
     * success - Triggered after a successful transaction
     * fail - Triggered after a failed transaction
     * 
     */
 
    /** 
     * Property: events
     * {<OpenLayers.Events>} Events instance for triggering this protocol
     *    events.
     */
    events: null,
    
    /**
     * APIProperty: auto
     * {Boolean | Number} Auto-save.  Default is false.  If true, features will be
     *     saved immediately after being added to the layer and with each
     *     modification or deletion.  If auto is a number, features will be
     *     saved on an interval provided by the value (in seconds).
     */
    auto: false,
    
    /**
     * Property: timer
     * {Number} The id of the timer.
     */
    timer: null,

    /**
     * Constructor: OpenLayers.Strategy.Save
     * Create a new Save strategy.
     *
     * Parameters:
     * options - {Object} Optional object whose properties will be set on the
     *     instance.
     */
    initialize: function(options) {
        OpenLayers.Strategy.prototype.initialize.apply(this, [options]);
        this.events = new OpenLayers.Events(this);
    },
   
    /**
     * APIMethod: activate
     * Activate the strategy.  Register any listeners, do appropriate setup.
     * 
     * Returns:
     * {Boolean} The strategy was successfully activated.
     */
    activate: function() {
        var activated = OpenLayers.Strategy.prototype.activate.call(this);
        if(activated) {
            if(this.auto) {
                if(typeof this.auto === "number") {
                    this.timer = window.setInterval(
                        OpenLayers.Function.bind(this.save, this),
                        this.auto * 1000
                    );
                } else {
                    this.layer.events.on({
                        "featureadded": this.triggerSave,
                        "afterfeaturemodified": this.triggerSave,
                        scope: this
                    });
                }
            }
        }
        return activated;
    },
    
    /**
     * APIMethod: deactivate
     * Deactivate the strategy.  Unregister any listeners, do appropriate
     *     tear-down.
     * 
     * Returns:
     * {Boolean} The strategy was successfully deactivated.
     */
    deactivate: function() {
        var deactivated = OpenLayers.Strategy.prototype.deactivate.call(this);
        if(deactivated) {
            if(this.auto) {
                if(typeof this.auto === "number") {
                    window.clearInterval(this.timer);
                } else {
                    this.layer.events.un({
                        "featureadded": this.triggerSave,
                        "afterfeaturemodified": this.triggerSave,
                        scope: this
                    });
                }
            }
        }
        return deactivated;
    },
    
    /**
     * Method: triggerSave
     * Registered as a listener.  Calls save if a feature has insert, update,
     *     or delete state.
     *
     * Parameters:
     * event - {Object} The event this function is listening for.
     */
    triggerSave: function(event) {
        var feature = event.feature;
        if(feature.state === OpenLayers.State.INSERT ||
           feature.state === OpenLayers.State.UPDATE ||
           feature.state === OpenLayers.State.DELETE) {
            this.save([event.feature]);
        }
    },
    
    /**
     * APIMethod: save
     * Tell the layer protocol to commit unsaved features.  If the layer
     *     projection differs from the map projection, features will be
     *     transformed into the layer projection before being committed.
     *
     * Parameters:
     * features - {Array} Features to be saved.  If null, then default is all
     *     features in the layer.  Features are assumed to be in the map
     *     projection.
     */
    save: function(features) {
        if(!features) {
            features = this.layer.features;
        }
        
        var featuresToCommit = [];

        for (var i = 0; i < features.length; i++) {
            if (features[i].state) {
                featuresToCommit.push(features[i]);
            }
        }
        
        this.events.triggerEvent("start", {features:featuresToCommit});
        var remote = this.layer.projection;
        var local = this.layer.map.getProjectionObject();
        if(!local.equals(remote)) {
            throw new Error(
                "Different local and remote projections - not supported");
        }
        this.layer.protocol.commit(featuresToCommit, {
            callback: this.onCommit,
            scope: this
        });
    },
    
    /**
     * Method: onCommit
     * Called after protocol commit.
     *
     * Parameters:
     * response - {<OpenLayers.Protocol.Response>} A response object.
     */
    onCommit: function(response) {
        var evt = {"response": response};
        if(response.success()) {
            this.events.triggerEvent("success", evt);
        } else {
            this.events.triggerEvent("fail", evt);
        }
    },
   
    CLASS_NAME: "OpenLayers.Strategy.SaveIndexedDb" 
});
