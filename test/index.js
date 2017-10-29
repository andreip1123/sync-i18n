var should = require('chai').should();
var synci18n = require('../index');
var doit = synci18n.doit;

describe('doitproperly', function () {
  it('appends to string', function () {
    doit('testmessage').should.equal('did it testmessage');
  })
});