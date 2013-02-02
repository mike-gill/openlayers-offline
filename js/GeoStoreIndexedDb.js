/**
 * @author mgill
 */

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (!window.indexedDB) {
	window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
}

OpenLayers.GeoStoreIndexedDb = OpenLayers.Class(
{

	dbName: null,
	dbVersion: null,
	dbStoreName: null,
	db: {},
	format: null,
	
	initialize: function(dbName, dbVersion, dbStoreName) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.dbStoreName = dbStoreName;
        this.format = new OpenLayers.Format.GeoJSON();
        this.openDb();
    },

	openDb: function () {
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
		};
		req.onerror = function(evt) {
			console.error("openDb:", evt.target.errorCode);
		};
		req.onupgradeneeded = function(evt) {
			console.log("openDb.onupgradeneeded");
			console.log("this.dbStoreName: " + this.dbStoreName);
			console.log("dbStoreName: " + dbStoreName);
			var store = evt.currentTarget.result.createObjectStore(dbStoreName, {
				keyPath : 'id',
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
	
	_putFeature: function(store, features, index, callback, scope) {
		var thisObj = this;
		var req = store.put(JSON.parse(this.format.write(features[index])));
		req.onsuccess = function(event) {
			console.log("Key: " + event.target.result);
		    features[index].key = event.target.result;
		    console.log("FeatureKey: " + features[index].key);
		    index++;
		    if (index < features.length) {
		    	thisObj._putFeature(store, features, index, callback, scope);
		    } else {
		    	callback.call(scope);
		    }
		};
		req.onerror = function(evt) {
			console.error("_putFeature:", evt.target.errorCode);
		};
	},
	
	putFeatures: function(features, callback, scope) {
		var store = this.getObjectStore(IDBTransaction.READ_WRITE);
		this._putFeature(store, features, 0, callback, scope)
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
				console.log("Label: " + feature.attributes.label);
				console.log("Area: " + feature.geometry.getArea());
			}
			callback.call(scope, feature);
		};

		req.onerror = function(evt) {
			console.error("readFeature:", evt.target.errorCode);
		};
	},
	
	readAllFeatures: function(callback, scope) {
		var features = [];
		var format = this.format;
		var store = this.getObjectStore(IDBTransaction.READ_ONLY);
		var req = store.openCursor();
		req.onsuccess = function(event) {
			var cursor = event.target.result;
			if (cursor) {
				features.push(format.parseFeature(cursor.value));
				cursor.continue();
			} else {
				callback.call(scope, features);
				console.log("Finished reading " + 
							features.length + " features");
			}
		};

		req.onerror = function(evt) {
			console.error("readAllFeatures:", evt.target.errorCode);
		};
	}
	

});

