var get = Ember.get, set = Ember.set, isNone = Ember.isNone, merge = Ember.merge;

DS.TasypieAdapter = DS.RESTAdapter.extend({
    defaultSerializer: '_tastypie',
    namespace: 'api/v1',
    pathForType: function(type) {
        return type;
    },
    buildURL: function(type, id) {
        var url = this._super(type, id);
        if (url && url.substr(-1) != '/'){
            return url + '/';
        }
        return url;
    },
    findMany: function(store, type, ids, owner) {
        return this.ajax(this.buildURL(type.typeKey, 'set/' + ids.join(';')), 'GET', { data: {} });
    }
});

DS.TasypieSerializer = DS.JSONSerializer.extend({
    keyForAttribute: function (attr) {
        return Ember.String.decamelize(attr);
    },
    keyForRelationship: function (key, kind) {
        return Ember.String.decamelize(key);
    },

    normalizePayload: function (type, payload) {
        return payload;
    },

    normalize: function (type, hash, prop) {
        this.normalizeId(hash);
        this.normalizeAttributes(type, hash);
        this.normalizeRelationships(type, hash);

        return this._super(type, hash, prop);
    },

    normalizeId: function (hash) {
        hash.id = this.resourceUriToId(hash['resource_uri']);
        delete hash['resource_uri'];
    },

    normalizeAttributes: function (type, hash) {
        var payloadKey, key;
        if (this.keyForAttribute) {
            type.eachAttribute(function (key) {
                payloadKey = this.keyForAttribute(key);
                if (key === payloadKey) {
                    return;
                }

                hash[key] = hash[payloadKey];
                delete hash[payloadKey];
            }, this);
        }
    },

    resourceUriToId: function (resourceUri){
        return resourceUri.split('/').reverse()[1]
    },

    relationshipToResourceUri: function (relationship, value){
        if (!value) return value;
        var store = relationship.type.store, typeKey = relationship.type.typeKey;
        return store.adapterFor(typeKey).buildURL(typeKey, get(value, 'id'))
    },

    /**
     @method normalizeRelationships
     @private
     */
    normalizeRelationships: function (type, hash) {
        var payloadKey, key, self = this;

        type.eachRelationship(function (key, relationship) {
            if (this.keyForRelationship) {
                payloadKey = this.keyForRelationship(key, relationship.kind);
                if (key !== payloadKey) {
                    hash[key] = hash[payloadKey];
                    delete hash[payloadKey];
                }
            }
            if (hash[key]) {
                if (relationship.kind === 'belongsTo'){
                    hash[key] = this.resourceUriToId(hash[key]);
                } else if (relationship.kind === 'hasMany'){
                    var ids = [];
                    hash[key].forEach(function (resourceUri){
                       ids.push(self.resourceUriToId(resourceUri));
                    });
                    hash[key] = ids;
                }
            }


        }, this);

    },

    extractSingle: function (store, primaryType, payload, recordId, requestType) {
        payload = this.normalizePayload(primaryType, payload);
        return this.normalize(primaryType, payload, primaryType.typeKey);
    },

    extractArray: function (store, primaryType, payload) {
        var records = [];
        var self = this;
        payload.objects.forEach(function (hash) {
            records.push(self.normalize(primaryType, hash, primaryType.typeKey))
        });
        return records;
    },

    pushPayload: function (store, payload) {
        payload = this.normalizePayload(null, payload);

        return payload;
    },

    serialize: function (record, options) {
        var json = {};

        record.eachAttribute(function (key, attribute) {
            this.serializeAttribute(record, json, key, attribute);
        }, this);

        record.eachRelationship(function (key, relationship) {
            if (relationship.kind === 'belongsTo') {
                this.serializeBelongsTo(record, json, relationship);
            } else if (relationship.kind === 'hasMany') {
                this.serializeHasMany(record, json, relationship);
            }
        }, this);

        return json;
    },

    serializeIntoHash: function (data, type, record, options) {
        merge(data, this.serialize(record, options));
    },



    serializeBelongsTo: function (record, json, relationship) {
        this._super.apply(this, arguments);
        var key = relationship.key;
        key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo") : key;

        json[key] = this.relationshipToResourceUri(relationship, get(record, relationship.key));

    },

    serializeHasMany: function(record, json, relationship) {
        var key = relationship.key;
        key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo") : key;

        var relationshipType = DS.RelationshipChange.determineRelationshipType(record.constructor, relationship);

        if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany') {
           json[key] = get(record, relationship.key).map(function (next){
               return this.relationshipToResourceUri(relationship, next);
           }, this);
          // TODO support for polymorphic manyToNone and manyToMany relationships
        }
    },

    serializePolymorphicType: function (record, json, relationship) {
        var key = relationship.key,
            belongsTo = get(record, key);
        key = this.keyForAttribute ? this.keyForAttribute(key) : key;
        json[key + "Type"] = belongsTo.constructor.typeKey;

    }
});

Ember.onLoad('Ember.Application', function (Application) {
    Application.initializer({

        name: "tastypieAdapter",

        initialize: function (container, application) {
            application.register('serializer:_tastypie', DS.TasypieSerializer);
            application.register('adapter:_tastypie', DS.TasypieAdapter);
        }
    });
});
