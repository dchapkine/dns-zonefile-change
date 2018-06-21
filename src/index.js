const fs = require('fs');
const zonefile = require('dns-zonefile');
const ajv = require('./ajv');

/**
 * @todo handle specific case of SOA record (not an array)
 */

class DnsZoneFileChange {
  /**
   * Ctor
   *
   * @param {Object} config
   */
  constructor(config) {
    this.allowedRecordTypes = ['a', 'cname'];
    this.recordTypes = {
      a: {
        multipleRecords: true,
        multipleValuesPerKey: true
      },
      cname: {
        multipleRecords: true,
        multipleValuesPerKey: false
      },
      aaaa: {
        multipleRecords: true,
        multipleValuesPerKey: true
      },
      ns: {
        multipleRecords: true,
        multipleValuesPerKey: true
      },
      txt: {
        multipleRecords: true,
        multipleValuesPerKey: true
      },
      ptr: {
        multipleRecords: true,
        multipleValuesPerKey: false
      },
      caa: {
        multipleRecords: true,
        multipleValuesPerKey: true
      },
      soa: {
        multipleRecords: false,
        multipleValuesPerKey: false
      }
    };
    this.changeStack = [];
    this.currentZone = null;
  }

  /**
   * Loads zone from json file (see https://github.com/elgs/dns-zonefile)
   *
   * @param {String} path
   */
  loadJsonZoneFile(path) {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(path)) {
          const content = fs.readFileSync(path, 'utf8');
          if (content) {
            this.currentZone = zonefile.parse(JSON.parse(content));
            if (this.currentZone) {
              resolve(this); 
            } else {
              reject(Error("can't parse zone"));
            }
          } else {
            reject(Error("zone file is empty"));
          }
        } else {
          reject(Error("zone file does not exist"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Loads zone from json object (see https://github.com/elgs/dns-zonefile)
   *
   * @param {String} json
   */
  loadJsonZoneString(json) {
    return new Promise((resolve, reject) => {
      try {
        this.currentZone = zonefile.parse(json);
        if (this.currentZone) {
          resolve(this); 
        } else {
          reject(Error("can't parse zone"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Loads zone from flat file (see RFC1035)
   *
   * @param {String} path
   */
  loadFlatZoneFile(path) {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(path)) {
          const content = fs.readFileSync(path, 'utf8');
          if (content) {
            this.currentZone = zonefile.parse(content);
            if (this.currentZone) {
              resolve(this); 
            } else {
              reject(Error("can't parse zone"));
            }
          } else {
            reject(Error("zone file is empty"));
          }
        } else {
          reject(Error("zone file does not exist"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Loads zone from flat file content (see RFC1035)
   *
   * @param {String} flat zone file content
   */
  loadFlatZoneString(content) {
    return new Promise((resolve, reject) => {
      try {
        if (content) {
          this.currentZone = zonefile.parse(content);
          if (this.currentZone) {
            resolve(this); 
          } else {
            reject(Error("can't parse zone"));
          }
        } else {
          reject(Error("zone file content is empty"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * TEST
   * Loads zone from flat file content (see RFC1035)
   *
   * @param {String} flat zone file content
   */
  loadFlatZoneStringSync(content) {
    if (content) {
      this.currentZone = zonefile.parse(content);
    }
  }

  /**
   * Returns all records matching name
   *
   * @param {String} type a|cname
   * @param {String} name
   * @return {Array}
   */
  getRecords(type, name) {
    switch (type) {
      case 'a':
        if (!this.currentZone.a) return [];
        return this.currentZone.a.filter(el => el.name.localeCompare(name) === 0);
      case 'cname':
        if (!this.currentZone.cname) return [];
        return this.currentZone.cname.filter(el => el.name.localeCompare(name) === 0);
    }
    return [];
  }

  /**
   * Checks if at least one record matching this name exist
   *
   * @param {String} type a|cname
   * @param {String} name
   * @return {Boolean}
   */
  recordExists(type, name) {
    const records = this.getRecords(type, name);
    if (records.length > 0) return true;
    return false;
  }

  /**
   * Override all existing records of this type by new value
   *
   * @param {String} type
   * @param {Object} record
   * @throws {Error}
   */
  overrideRecord(type, record) {
    return this.setRecord(type, record, 'override');
  }

  /**
   * Append new record to existing records of this type
   *
   * @param {String} type
   * @param {Object} record
   * @throws {Error}
   */
  appendRecord(type, record) {
    return this.setRecord(type, record, 'append');
  }


  /**
   * Registers new record creation attempt
   *
   * @param {String} type of the record to set
   * @param {Object} record object (see json-schemas)
   * @throws {Error}
   */
  setRecord(type, record, mode) {
    mode = mode || 'override';
    const that = this;
    if (!this.allowedRecordTypes.includes(type)) {
      throw Error(`this record type os not supported: ${type}`);
    } else if (!ajv.validate(`record-${type}`, record)) {
      throw Error(`${ajv.ajv.errorsText()}`);
    } else {
      const change = { action: "SET_RECORD", type, record, mode, ops: [] };
      const name = record.name;
      // A and CNAME record with same name can't coexist: remove all CNAMEs and A (a only if override mode)
      if (type == 'a') {
        this.getRecords('cname', name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type: 'cname', record: {name: el.name}}));
        if (mode == 'override') {
          this.getRecords('a', name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type: 'a', record: {name: el.name}}));
        }

      // A and CNAME record with same name can't coexist: remove all A and CNAME (a only if override mode)
      } else if (type == 'cname') {
        this.getRecords('a', name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type: 'a', record: {name: el.name}}));
        this.getRecords('cname', name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type: 'cname', record: {name: el.name}}));

      // if any other record
      } else {
        if (mode == 'override' || !this.recordTypes[type].multipleValuesPerKey || !this.recordTypes[type].multipleRecords) {
          this.getRecords(type, name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type, record: {name: el.name}}));
        }
      }
      // in any case we append the record anyway
      change.ops.push({action: 'APPEND_RECORD', type, record});
      this.changeStack.push(change);
    }
  }

  /**
   * Register new record removal intent
   *
   * @param {String} type - type of the record to remove
   * @param {String} name - name of the record to remove
   * @param {String} value - optional, if set, will only remove the record matching value
   * @throws {Error}
   */
  removeRecord(type, name, value) {
    value = value === undefined ? null : value;
    const that = this;
    if (!this.allowedRecordTypes.includes(type)) {
      throw Error(`this record type os not supported: ${type}`);
    } else if (!this.recordExists(type, name)) {
      throw Error(`record ${name} of type ${type} doesn't exist`);
    } else {
      if (value === null) {
        const change = { action: "REMOVE_RECORD", type, record: {name}, ops: [] };
        this.getRecords(type, name).forEach(el => change.ops.push({action: 'REMOVE_RECORD', type, record: {name: el.name}}));
        this.changeStack.push(change);
      } else {
        const change = { action: "REMOVE_RECORD", type, record: {name, value}, ops: [] };
        change.ops.push({action: 'REMOVE_RECORD', type, record: {name, value}});
        this.changeStack.push(change);
      }
    }
  }

  /**
   * Describe hcange in human language or in terms of operations
   *
   * @return {String} - Text description of all changes
   */
  describeChange() {
    const getRecordValue = (type, el) => {
      switch (type) {
        case 'a':
          return el.ip;
        case 'cname':
          return el.alias;
        case 'txt':
          return el.txt;
        case 'ns':
          return el.host;
        case 'srv':
          return el.target;
        case 'ptr':
          return el.host;
        case 'mx':
          return el.host;
        default:
          return true; // don't remove if unknown
      }
    };

    return this.changeStack.map(el => {
      switch (el.action) {
        case 'REMOVE_RECORD':
          if (el.record.value !== undefined) {
            return `remove record '${el.record.name}' of type '${el.type}' matching value '${el.record.value}'`;
          } else {
            return `remove record '${el.record.name}' of type '${el.type}'`;
          }
        case 'SET_RECORD':
          if (el.mode === 'override' || el.record.type == 'cname') {
            return `set record '${el.record.name}' of type '${el.type}' to ${getRecordValue(el.type, el.record)} while removing any existing values`;
          } else {
            return `add new value to record '${el.record.name}' of type '${el.type}' to ${getRecordValue(el.type, el.record)}`;
          }
      }
      return "";
    }).join("\n");
  }

  /**
   * Applies every change in changes stack
   *
   * @param {Boolean} replaceOldZone - If true, will update zone object, default false
   * @return {Object} 
   */
  applyChanges(replaceOldZone) {
    const replace = replaceOldZone === true ? true : false;
    const nextZone = Object.assign({}, this.currentZone);
    const operations = this.dumpOperations();
    if (operations.length > 0) {
      // we do all remove operations first
      operations.forEach(op => {
        switch (op.action) {
          case 'REMOVE_RECORD':
            nextZone[op.type] = nextZone[op.type].filter(el => {
              // when a value is provided, each record is uniquely identifies by its name + value
              // deprnding on the record type, the value can be stored in different keys
              if (op.record.value !== undefined) {
                switch (op.type) {
                  case 'a':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.ip.localeCompare(op.record.value) == 0);
                  case 'cname':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.alias.localeCompare(op.record.value) == 0);
                  case 'txt':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.txt.localeCompare(op.record.value) == 0);
                  case 'ns':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.host.localeCompare(op.record.value) == 0);
                  case 'srv':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.target.localeCompare(op.record.value) == 0);
                  case 'ptr':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.host.localeCompare(op.record.value) == 0);
                  case 'mx':
                    return !(el.name.localeCompare(op.record.name) == 0 && el.host.localeCompare(op.record.value) == 0);
                  default:
                    return true; // don't remove if unknown
                }
              } else {
                return el.name.localeCompare(op.record.name) !== 0; 
              }
            });
          break;
        }
      });
      // then we do append operations
      operations.forEach(op => {
        switch (op.action) {
          case 'APPEND_RECORD':
            nextZone[op.type].push(op.record);
          break;
        }
      });
      if (replace === true) {
        this.currentZone = nextZone;
      }
    }
    return nextZone;
  }

  /**
   * Generates new zone file
   *
   * @param {String} [path] - if provided, writes the file on disk
   * @return {String} - new flat zone file content
   */
  generateZone(path) {
    const out = zonefile.generate(this.currentZone);
    if (typeof path != 'undefined') {
      fs.writeFileSync(path, out, 'utf-8');
    }
    return out;
  }

  /**
   * Returns raw pending operation stack
   * 
   * @return {Array} pending change operations stack
   */
  dumpChanges() {
    return this.changeStack;
  }

  /**
   * In case you want to store change stack as json somewhere, then load it into another instance
   * For example, you can build your change on frontend, then send it to the backend for processing
   *
   * @param {Array} changeStack
   * @return {DnsZoneFileChange}
   */
  importChanges(changeStack) {
    this.changeStack = changeStack;
    return this;
  }

  /**
   * Dump operations array
   *
   * @return {Array}
   */
  dumpOperations() {
    return this.changeStack
      .map(el => el.ops)
      .reduce((prev, curr) => {
        return prev.concat(curr);
      });
  }
}

module.exports = (config) => {
  const ret = new DnsZoneFileChange(config);
  return ret; 
};