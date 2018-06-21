const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');
const ajv = new Ajv();
const schemas = {
  '../json-schemas/record-a.js': require('../json-schemas/record-a.js'),
  '../json-schemas/record-cname.js': require('../json-schemas/record-cname.js')
};

/**
 * Add formats to validator
 */
ajv.addFormat("hostname+port", val => {
  const regex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*:(\d+)$/i;
  return regex.test(val);
});

const exp = {
  ajv: ajv,
  schema: name => {
    return schemas[`../json-schemas/${name}.js`];
  },
  validate: (schemaName, data) => {
    const sch = exp.schema(schemaName);
    return ajv.validate(sch, data);
  }
};
module.exports = exp;