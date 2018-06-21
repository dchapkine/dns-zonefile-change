const lib = require('../src');
const fs = require('fs');
const zonefile = require('dns-zonefile');

describe("load zone files", () => {
  
  it("should successfuly load existing zone file", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile1.txt')
    .then(ch => {
      done();
    })
    .catch(err => {
      done(err);
    });
  });

  it("should fail to load unexisting zone file", (done) => {
    lib()
    .loadFlatZoneFile('./fixtures/zonefile-that-never-existed.txt')
    .then(ch => {
      done(Error("should reject from promise, because the file does not exist"));
    })
    .catch(err => {
      done();
    });
  });
  
  it("should successfuly load flat zone content", (done) => {
    const content = fs.readFileSync("./fixtures/zonefile1.txt", "utf-8");
    lib()
    .loadFlatZoneString(content)
    .then(ch => {
      expect(ch.recordExists('a', 'dns0')).toEqual(true);
      done();
    })
    .catch(err => {
      done(err);
    });
  });
  
  it("should successfuly load JSON content", (done) => {
    const content = fs.readFileSync("./fixtures/zonefile1.txt", "utf-8");
    lib()
    .loadJsonZoneString(content)
    .then(ch => {
      expect(ch.recordExists('a', 'dns0')).toEqual(true);
      done();
    })
    .catch(err => {
      done(err);
    });
  });

});


