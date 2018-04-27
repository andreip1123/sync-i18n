var should = require('chai').should();
var Synci18n = require('../index');
var fs = require('fs');

describe('readSourceFile', function () {
  it('should read source file properly', function () {
    var sourceFile = './test/translation.xml';
    var destinationFile = __dirname + '/temp/22translations.js';

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      destinationFile: destinationFile
    });

    synci18n.languages.should.have.members([ 'en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL' ]);
    synci18n.tags.length.should.equal(2);
    synci18n.tags[0]['$'].value.should.equal('RESTART_SERVER_');
    synci18n.tags[1]['$'].value.should.equal('DEC_');

    if (fs.existsSync(destinationFile)) {
      fs.unlinkSync(destinationFile);
    }

    synci18n.generateTranslations();
    fs.existsSync(destinationFile).should.equal(true);
    fs.unlinkSync(destinationFile);
  });
});

describe('getLanguages', function () {
  it('should get the languages provided by the file', function () {
    var sourceFile = './test/translation.xml';
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });
    synci18n.languages.should.have.members([ 'en_US', 'de_DE', 'nl_NL', 'fr_FR', 'ja_JP' ]);
  });
});

describe('makeMsgs', function () {
  it('should create the msgs file', function () {
    var sourceFile = './test/translation.xml';
    var destinationFile = __dirname + '/temp/01translaciooon.js';

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      destinationFile: destinationFile
    });

    if (fs.existsSync(destinationFile)) {
      fs.unlinkSync(destinationFile);
    }

    synci18n.generateTranslations();

    fs.existsSync(destinationFile).should.equal(true);
    fs.unlinkSync(destinationFile);
  });
});

describe('extractTags', function () {
  it('should extract only the used tags', function () {
    var synci18n = Synci18n({
      rootDir: __dirname
      /*destinationFile: __dirname + '/web/0translations.js',
      sourceFile: __dirname + '/translation.xml',
      jsSourcesLocation: __dirname + '/web',
      javaSourcesLocation: __dirname + '/src'*/
    });
    synci18n.extractTags();
    synci18n.clientTags.length.should.equal(4);
    synci18n.serverTags.length.should.equal(2);
  });
});

describe('testDefaults', function () {
  it('should create at expected default paths', function () {
    var synci18n = Synci18n({rootDir: __dirname});
    // Weak check for proper default paths.
    synci18n.sourceFile.indexOf('/i18n/translation.xml').should.not.equal(-1);
    synci18n.destinationFile.indexOf('/web/0translations.js').should.not.equal(-1);
  });
});