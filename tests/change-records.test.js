const lib = require('../src');
const fs = require('fs');

describe("change existing records", () => {
  
  // in 'override' mode, we remove ALL existing A records for this (sub)domain and replace them with the new one
  it("should override existing A record with single value", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.setRecord('a', {name: 'dns0', ip: '1.2.3.4'});
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": {"name": "dns0"}, "type": "a"}, {"action": "APPEND_RECORD", "record": {"ip": "1.2.3.4", "name": "dns0"}, "type": "a"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  // there can be multiple A values for same (sub)domain
  it("should append new A record to existing A records", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.setRecord('a', {name: 'dns0', ip: '1.2.3.4'}, 'append');
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "APPEND_RECORD", "record": {"ip": "1.2.3.4", "name": "dns0"}, "type": "a"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  // there can be only one CNAME per (sub)domain 
  it("should override existing CNAME record with single value", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.setRecord('cname', {name: 'www', alias: 'domain.tld'});
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": {"name": "www"}, "type": "cname"}, {"action": "APPEND_RECORD", "record": {"alias": "domain.tld", "name": "www"}, "type": "cname"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  // there can be only one CNAME per (sub)domain, so in 'append' mode we still override the value of existing record
  it("should override existing CNAME record with single value (even in append mode)", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.setRecord('cname', {name: 'www', alias: 'domain.tld'}, 'append');
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": {"name": "www"}, "type": "cname"}, {"action": "APPEND_RECORD", "record": {"alias": "domain.tld", "name": "www"}, "type": "cname"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  // if multiple A records found for this (sub)domain, all are marked for removal
  it("should remove all existing A records matching subdomain", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.removeRecord('a', 'dns0');
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": {"name": "dns0"}, "type": "a"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  // there can be only one record per (sub)domain
  it("should remove existing CNAME record matching subdomain", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.removeRecord('cname', 'www');
      const stack = ch.dumpOperations();
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": {"name": "www"}, "type": "cname"}]);
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  it("should remove existing A record matching name AND value", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      ch.removeRecord('a', 'api', '33.33.33.33');
      const stack = ch.dumpOperations();
      console.log(ch.describeChange());
      expect(stack).toEqual([{"action": "REMOVE_RECORD", "record": { "name": "api", "value": "33.33.33.33" }, "type": "a"}]);
      // apply changes and generate zone file
      const newZone = ch.applyChanges(true);
      ch.generateZone('./fixtures/zonefile1_new.txt');
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  // TODO: check cname/a conflicts

  // 
  /*
  it("should apply changes and return updated zone object", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      // should remove www CNAME and add A entry
      ch.setRecord('a', {name: "www", ip: '1.2.3.4'});
      // should remove www CNAME and add second A entry for www (because of append mode, no record is removed)
      ch.setRecord('a', {name: "www", ip: '10.20.30.40'}, 'append');
      // should remove both blog A entries
      ch.removeRecord('a', 'blog');
      // should remove cn CNAME
      ch.removeRecord('cname', 'cn');
      // should remove existing ru CNAME record and add new ru CNAME record
      ch.setRecord('cname', {name: "ru", alias: 'forever.com'});
      // should add new CNAME record: russia
      ch.setRecord('cname', {name: "russia", alias: 'forever.com'});
      
      const stack = ch.dumpOperations();
      expect(stack).toEqual([
        {"action": "REMOVE_RECORD", "record": {"name": "www"}, "type": "cname"},
        {"action": "APPEND_RECORD", "record": {"ip": "1.2.3.4", "name": "www"}, "type": "a"},

        {"action": "REMOVE_RECORD", "record": {"name": "www"}, "type": "cname"},
        {"action": "APPEND_RECORD", "record": {"ip": "10.20.30.40", "name": "www"}, "type": "a"},

        {"action": "REMOVE_RECORD", "record": {"name": "blog"}, "type": "a"},
        {"action": "REMOVE_RECORD", "record": {"name": "blog"}, "type": "a"},

        {"action": "REMOVE_RECORD", "record": {"name": "cn"}, "type": "cname"},

        {"action": "REMOVE_RECORD", "record": {"name": "ru"}, "type": "cname"},
        {"action": "APPEND_RECORD", "record": {"alias": "forever.com", "name": "ru"}, "type": "cname"},

        {"action": "APPEND_RECORD", "record": {"alias": "forever.com", "name": "russia"}, "type": "cname"}
      ]);
      // console.log(ch.describeChange());
      const newZone = ch.applyChanges(true);
      ch.generateZone('./fixtures/zonefile1_new.txt');
      //expect(newZone).toEqual({});
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  */

});
