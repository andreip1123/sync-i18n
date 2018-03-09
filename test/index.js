var should = require('chai').should();
var synci18n = require('../index');

describe('doitproperly', function () {
  it('appends to string', function () {
    synci18n.doit('testmessage').should.equal('did it testmessage');
  })
});

describe('makeXmlEntry', function () {
  it('should make new xml entry', function () {
    var languages = synci18n.getLanguages();
    var tag = 'NEW_TAG_';
    var englishMessage = 'This is a new tag';
    var comment = 'Trying to add new tag';


    var xmlEntry = synci18n.makeXmlEntry('NEW_TAG_', { comment: comment, en_US: englishMessage });
    var allChecksPassed = true;

    languages.forEach(function (languageCode) {
      if (xmlEntry.indexOf(languageCode) === -1) {
        allChecksPassed = false;
      }
    });

    if (xmlEntry.indexOf(comment) === -1 ||
      xmlEntry.indexOf(tag) === -1 ||
      xmlEntry.split(englishMessage).length - 1 !== languages.length||
      xmlEntry.indexOf('distribution="webauthor"') === -1) {
      allChecksPassed = false;
    }

    should.equal(allChecksPassed, true);
  })
});
