'use strict';

var path = require('path');
var fs = require('fs');
var Ajv = require('ajv');
var ajv = new Ajv();
var schemas = {
  '../json-schemas/record-a.js': require('../json-schemas/record-a.js'),
  '../json-schemas/record-cname.js': require('../json-schemas/record-cname.js')
};

/**
 * Add formats to validator
 */
ajv.addFormat("hostname+port", function (val) {
  var regex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*:(\d+)$/i;
  return regex.test(val);
});

var exp = {
  ajv: ajv,
  schema: function schema(name) {
    return schemas['../json-schemas/' + name + '.js'];
  },
  validate: function validate(schemaName, data) {
    var sch = exp.schema(schemaName);
    return ajv.validate(sch, data);
  }
};
module.exports = exp;