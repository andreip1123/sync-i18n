var should = require('chai').should();
var Synci18n = require('../index');
var fs = require('fs');
var xml2js = require('xml2js');
const path = require('path');

describe('makeXmlEntry', function () {
  it('should make new xml entry', function () {
    var sourceFile = __dirname + '/temp/translation.json';

    var tag = 'NEW_TAG_';
    var englishMessage = 'This is a new tag';
    var comment = 'Trying to add new tag';


    var synci18n = new Synci18n();
    var languages = synci18n.getLanguages();
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

describe('makeTranslationJsons', function () {
  it('json from xml should be created', function () {
    var sourceFile = './test/translation.xml';
    var destinationFolder = __dirname + '/temp';

    var synci18n = new Synci18n({
      sourceFile,
      destinationFolder
    });

    var expectedOutputFile = destinationFolder + '/' + path.basename(sourceFile, path.extname(sourceFile)) + '.json';

    if (fs.existsSync(expectedOutputFile)) {
      fs.unlinkSync(expectedOutputFile);
    }

    synci18n.makeTranslationJsons();
    fs.existsSync(expectedOutputFile).should.equal(true);
  });
});

describe('getLanguages', function () {
  it('should get the languages provided by the file', function () {
    var sourceFile = __dirname + '\\temp\\translation.json';
    var synci18n = new Synci18n({
      sourceFile
    });
    var languages = synci18n.getLanguages(sourceFile);
    languages.should.eql(languages, ['en_US', 'de_DE', 'nl_NL', 'fr_FR', 'ja_JP']);
  });
});

describe('makeMsgs', function () {
  it('should create the msgs file', function () {
    var sourceFile = './test/translation.xml';
    var destinationFolder = __dirname + '/temp';

    var synci18n = new Synci18n({
      mode: 'plugin',
      sourceFile,
      destinationFolder
    });

    let expectedMsgsFilePath = synci18n.msgsFilePath;

    if (fs.existsSync(expectedMsgsFilePath)) {
      fs.unlinkSync(expectedMsgsFilePath);
    }

    synci18n.makeMsgs();

    fs.existsSync(expectedMsgsFilePath).should.equal(true);
  });
});