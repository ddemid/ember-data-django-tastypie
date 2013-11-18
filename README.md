ember-data-django-tastypie
==========================

Ember Data 1.0 Beta 3 adapter to Django-tastypie API's


##Usage

#### Javascript side

Tastypie adapter is and extension to build-in RestAdapter. So, most of it's options are available

      App.ApplicationAdapter = DS.TastypieAdapter.extend({
          namespace: "api/v1"
      })

By default adapter is converting 'under_scored' attribute names to 'camelCased'

#### Python/Django side
Make sure to configure your Resources with the meta option if you are going to perform POST or PUT operations:


    class Meta:
        always_return_data = True




