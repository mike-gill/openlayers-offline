/**
 * @author mgill
 */

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.");
}

OpenLayers.Protocol.IndexedDb = OpenLayers.Class(OpenLayers.Protocol, {

    dbName: null,
    dbVersion: null,
    dbStoreName: null,
    db: {},
    format: null,
    
    initialize: function(dbName, dbVersion, dbStoreName, options) {
        OpenLayers.Protocol.prototype.initialize.apply(this, [options]);
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.dbStoreName = dbStoreName;
        this.format = new OpenLayers.Format.GeoJSON();
    },

    openDb: function (callback, scope) {
        var db = this.db;
        var dbStoreName = this.dbStoreName;
        console.log("openDb ...");
        var req = indexedDB.open(this.dbName, this.dbVersion);
        
        req.onsuccess = function(evt) {
            // Better use "this" than "req" to get the result to avoid problems with
            // garbage collection.
            // db = req.result;
            db.db = req.result;
            console.log("openDb DONE");
            
            if (callback) {
                callback.call(scope);
            }
        };
        
        req.onerror = function(evt) {
            console.error("openDb:", evt.target.errorCode);
        };
        
        req.onupgradeneeded = function(evt) {
            console.log("openDb.onupgradeneeded");
            console.log("this.dbStoreName: " + this.dbStoreName);
            console.log("dbStoreName: " + dbStoreName);
            var store = evt.currentTarget.result.createObjectStore(dbStoreName, {
                keyPath : 'key',
                autoIncrement : true
            });
            //store.createIndex('field1', 'field1', { unique: true });
            //store.createIndex('field2', 'field2', { unique: false });
        };
    },

    /**
     * @param {string} mode either "readonly" or "readwrite"
     */
    getObjectStore: function (mode) {
        var tx = this.db.db.transaction([this.dbStoreName], mode);
        return tx.objectStore(this.dbStoreName);
    },

    clearObjectStore: function (store_name) {
        var store = this.getObjectStore(DB_STORE_NAME, IDBTransaction.READ_WRITE);
        var req = store.clear();
        
        req.onsuccess = function(evt) {
            console.log("Store cleared");
        };
        
        req.onerror = function(evt) {
            console.error("clearObjectStore:", evt.target.errorCode);
        };

    },
    
    _putFeature: function(store, features, index, options) {
        var thisObj = this;
        var feature = features[index];
        var geoJsonObj = JSON.parse(this.format.write(feature));
        if (feature.key) {
            geoJsonObj.key = feature.key
        }
        var req = store.put(geoJsonObj);
        
        req.onsuccess = function(event) {
            console.log("Key: " + event.target.result);
            // TODO - look at case where transaction could be rolled back,
            // and impact on the following.
            features[index].key = event.target.result;
            features[index].state = null;
            console.log("FeatureKey: " + features[index].key);
            index++;
            if (index < features.length) {
                thisObj._putFeature(store, features, index, options);
            } else {
                var response = new OpenLayers.Protocol.Response({
                    code: OpenLayers.Protocol.Response.SUCCESS,
                    requestType: "commit",
                    reqFeatures: features
                });
                options.callback.call(options.scope, response);
            }
        };
        
        req.onerror = function(evt) {
            console.error("_putFeature:", evt.target.errorCode);
        };
    },
    
    commit: function(features, options) {
        var store = this.getObjectStore(IDBTransaction.READ_WRITE);
        this._putFeature(store, features, 0, options)
    },
    
    readFeature: function(key, callback, scope) {
        var format = this.format;
        var store = this.getObjectStore(IDBTransaction.READ_ONLY);
        var req = store.get(key);
        
        req.onsuccess = function(event) {
            if (event.target.result == null) {
                console.log("Feature not found");
            } else {
                console.log(JSON.stringify(event.target.result));
                var feature = format.parseFeature(event.target.result);
                feature.key = event.target.result.key;
                console.log("Label: " + feature.attributes.label);
                console.log("Area: " + feature.geometry.getArea());
            }
            callback.call(scope, feature);
        };

        req.onerror = function(evt) {
            console.error("readFeature:", evt.target.errorCode);
        };
    },
    
    read: function(options) {
        OpenLayers.Protocol.prototype.read.apply(this, arguments);
        options = OpenLayers.Util.extend({}, options);
        OpenLayers.Util.applyDefaults(options, this.options || {});
        
        var bounds = null;
        if (options.filter) {
            var filter = options.filter;
            if (filter instanceof OpenLayers.Filter.Spatial && 
                filter.type == OpenLayers.Filter.Spatial.BBOX &&
                filter.value instanceof OpenLayers.Bounds) {
                bounds = filter.value;
            } else {
                console.log("Filter not applied as was not BBOX filter");
            }
        }
        
        var features = [];
        var format = this.format;
        var store = this.getObjectStore(IDBTransaction.READ_ONLY);
        var req = store.openCursor();
        
        req.onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                var feature = format.parseFeature(cursor.value);
                feature.key = cursor.value.key;
                if (bounds) {
                    if (bounds.intersectsBounds(feature.geometry.getBounds())) {
                        features.push(feature);
                    }
                } else {
                    features.push(feature);
                }
                cursor.continue();
            } else {
                var response = new OpenLayers.Protocol.Response({
                    code: OpenLayers.Protocol.Response.SUCCESS,
                    requestType: "read",
                    features: features
                });
                options.callback.call(options.scope, response);
                console.log("Finished reading " + 
                            features.length + " features");
            }
        };

        req.onerror = function(evt) {
            console.error("readAllFeatures:", evt.target.errorCode);
        };
    },
    
    CLASS_NAME: "OpenLayers.Protocol.IndexedDb" 

});

