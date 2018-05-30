var should = require('chai').should();
var Synci18n = require('../index');
var fs = require('fs');

var sourceFile = './test/translation.xml';

describe('readSourceFile', function () {
  it('should read source file properly', function () {
    var destinationFile = __dirname + '/temp/22translations.js';

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      destinationFile: destinationFile
    });
    synci18n.readSourceFile(synci18n.sourceFile);
    synci18n.languages.should.have.members([ 'en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL' ]);
    synci18n.tags.length.should.equal(4);
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
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });
    synci18n.languages.should.have.members([ 'en_US', 'de_DE', 'nl_NL', 'fr_FR', 'ja_JP' ]);
  });
});

describe('getUniformName', function () {
  it('should get the lowercase tag name without trailing underline', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });

    synci18n.getUniformTagName('CLIENT_SIDE_').should.equal('client_side');
    synci18n.getUniformTagName('Server_side').should.equal('server_side');
    // Try some weird formats too
    synci18n.getUniformTagName('wEird_FormaT_oNE_').should.equal('weird_format_one');
    synci18n.getUniformTagName('wEird_FormaT_oNE').should.equal('weird_format_one');
  });
});

describe('makeMsgs', function () {
  it('should create the msgs file', function () {
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
    /*fs.unlinkSync(destinationFile);*/
  });
});

describe('extractTags', function () {
  it('should extract only the used tags', function () {
    console.log('woob ', __dirname);
    var synci18n = Synci18n({
      /*rootDir: __dirname,*/
      sourceFile: __dirname + '/translation.xml'
      /*destinationFile: __dirname + '/web/0translations.js',
      jsSourcesLocation: __dirname + '/web',
      javaSourcesLocation: __dirname + '/src'*/
    });
    synci18n.readSourceFile(synci18n.sourceFile);
    synci18n.extractTags();
    var clientTags = synci18n.clientTags;
    clientTags.length.should.equal(2);
    clientTags.should.eql(['DEC_', 'NOV']);

    var serverTags = synci18n.serverTags;
    serverTags.length.should.equal(2);
    serverTags.should.eql(['JULY_FLOWERS', 'DECEMBER']);
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

describe('getMessages', function () {
  it('should get the messages from the translation object', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });

    var mockTrObj = {
      "$":{"distribution":"webauthor","value":"DEC_"},
      "comment":["December"],
      "val":[
        {"_":"December","$":{"lang":"en_US"}},
        {"_":"Dezember","$":{"lang":"de_DE"}},
        {"_":"décembre","$":{"lang":"fr_FR"}},
        {"_":"December","$":{"lang":"ja_JP"}},
        {"_":"december","$":{"lang":"nl_NL"}}
      ]
    };

    synci18n.getMessages(mockTrObj).should.eql({
      en_US: 'December',
      de_DE: 'Dezember',
      fr_FR: 'décembre',
      ja_JP: 'December',
      nl_NL: 'december'
    });
  });
});