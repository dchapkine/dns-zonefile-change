const lib = require('../src');
const fs = require('fs');

describe("read existing records", () => {
  
  it("should find existing A record", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      const exists = ch.recordExists('a', 'dns0');
      expect(exists).toBeTruthy();
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  it("should find existing CNAME record", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      const exists = ch.recordExists('cname', 'en');
      expect(exists).toBeTruthy();
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  

  it("should fail to find missing A record", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      const exists = ch.recordExists('a', 'doesnotexist');
      expect(exists).toBeFalsy();
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  it("should fail to find missing CNAME record", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      const exists = ch.recordExists('cname', 'doesnotexist');
      expect(exists).toBeFalsy();
      done();
    })
    .catch(err => {
      done(err);
    });
  });

});


