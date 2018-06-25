var should = require('chai').should();
var Synci18n = require('../index');
var fs = require('fs');

var sourceFile = './test/translation.xml';

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

describe('readSourceFile', function () {
  it('should read source file properly', function () {
    var destinationFile = __dirname + '/temp/22translations.js';

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      destinationFile: destinationFile
    });
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
    var synci18n = Synci18n({
      /*rootDir: __dirname,*/
      sourceFile: __dirname + '/translation.xml'
      /*destinationFile: __dirname + '/web/0translations.js',
      jsSourcesLocation: __dirname + '/web',
      javaSourcesLocation: __dirname + '/src'*/
    });
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
    synci18n.getSourceFiles({})[0].indexOf('/i18n/translation.xml').should.not.equal(-1);
    synci18n.destinationFile.indexOf('/web/0translations.js').should.not.equal(-1);
  });
});

describe('getMessages', function () {
  it('should get the messages from the translation object', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });

    synci18n.getMessages(mockTrObj).should.eql({
      en_US: 'December',
      de_DE: 'Dezember',
      fr_FR: 'décembre',
      ja_JP: 'December',
      nl_NL: 'december'
    });
  });
});

describe('getMsgsObjectForTag', function () {
  it('should get the messages from the translation object', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });

    synci18n.getMsgsObjectForTag(mockTrObj).should.eql({
      en_US: 'December',
      de_DE: 'Dezember',
      fr_FR: 'décembre',
      nl_NL: 'december'
    });

    // Do not remove duplicate messages, will contain all languages.
    synci18n.getMsgsObjectForTag(mockTrObj, true).should.eql({
      en_US: 'December',
      de_DE: 'Dezember',
      fr_FR: 'décembre',
      ja_JP: 'December',
      nl_NL: 'december'
    });
  });
});

describe('removeNewLinesAndTabs', function () {
  it('should remove newlines and tabs from messages', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });

    var mockTrObj = {
      "$":{"distribution":"webauthor","value":"DEC_"},
      "comment":["December"],
      "val":[
        {"_":"branch, since branching, are applied to the target branch.\n\nYou should synchronize your branch periodically.","$":{"lang":"en_US"}},
        {"_":"Zielzweig angewandt.\n\n Sie sollten Ihren Zweig regelmäßig synchronisieren","$":{"lang":"de_DE"}},
        {"_":"branch, since branching, are applied to the target branch.\n\nYou should synchronize your branch periodically.","$":{"lang":"fr_FR"}},
        {"_":"branch, since branching, are applied to the target branch.\n\nYou should synchronize your branch periodically.","$":{"lang":"ja_JP"}},
        {"_":"branch, since branching, are applied to the target branch.\n\nYou should synchronize your branch periodically.","$":{"lang":"nl_NL"}}
      ]
    };

    var messageWithNewLine = 'Voor als u wilt dat er voor aanvullende details contact met u wordt\n' +
      '            opgenomen.';

    var mockTrObj2 = {
      "$":{"distribution":"webauthor","value":"DEC_"},
      "comment":["December"],
      "val":[
        {"_":messageWithNewLine,"$":{"lang":"nl_NL"}}
      ]
    };

    synci18n.getMsgsObjectForTag(mockTrObj).should.eql({
      en_US: 'branch, since branching, are applied to the target branch. You should synchronize your branch periodically.',
      de_DE: 'Zielzweig angewandt. Sie sollten Ihren Zweig regelmäßig synchronisieren'
    });

    synci18n.getMsgsObjectForTag(mockTrObj2).should.eql({
      nl_NL: 'Voor als u wilt dat er voor aanvullende details contact met u wordt opgenomen.'
    });
  });
});

describe('multipleSourceFiles', function () {
  it('should be able to take multiple source files', function () {
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, './test/translation_additional.xml']
    });
    synci18n.tags.length.should.equal(7);
    synci18n.languages.length.should.equal(6);
    synci18n.languages.should.eql([ 'en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL', 'du_DU' ]);
  });
});

describe('outputTranslationXml', function () {
  it('should write a translation xml with server tags', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });
    var defaultTargetTranslationXml = './target/i18n/translation.xml';
    var customTargetTranslationXml = './target_custom/i18n_custom/translation_custom.xml';

    var rmDir = function(dirPath) {
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return; }
      if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
      fs.rmdirSync(dirPath);
    };

    // Delete output of previous test runs, tests directory creation if non-existent.
    rmDir('./target');
    rmDir('./target_custom');


    // check default path
    synci18n.translationXmlDestination.should.equal(defaultTargetTranslationXml);
    synci18n.generateTranslations();
    fs.existsSync(defaultTargetTranslationXml).should.equal(true);

    // check unused tags
    synci18n.unusedTags.length.should.equal(1);

    // Use the output file as the input, should now have only 1 tag.
    var otherSynci18n = Synci18n({
      sourceFile: defaultTargetTranslationXml,
      translationXmlDestination: customTargetTranslationXml
    });

    otherSynci18n.translationXmlDestination.should.equal(customTargetTranslationXml);
    otherSynci18n.generateTranslations();
    otherSynci18n.tags.length.should.equal(1);
    fs.existsSync(customTargetTranslationXml).should.equal(true);
  });
});

describe('customStringifyFunction', function () {
  it('should make valid objects, trimming quotes where possible', function () {
    var synci18n = Synci18n({
      sourceFile: sourceFile
    });
    var input = {en_US: 'July flowers', de_DE: 'July flowers'};
    synci18n.stringify(input).should.equal('{en_US:"July flowers",de_DE:"July flowers"}');
    input = {
      some_tag_name: {en_US: 'July flowers', de_DE: 'July flowers'},
      some_other_name: {ja_JP: 'flowers', fr_FR: 'flowers'}
    };
    synci18n.stringify(input).should.equal('{some_tag_name:{en_US:"July flowers",de_DE:"July flowers"},some_other_name:{ja_JP:"flowers",fr_FR:"flowers"}}');
    input = {
      "invalid-tag-name": "www",
      "invalid.tag.name": "another one",
      "1.invalid": "this one has a number",
      valid_tag: "why not"
    };
    synci18n.stringify(input).should.equal('{"invalid-tag-name":"www","invalid.tag.name":"another one","1.invalid":"this one has a number",valid_tag:"why not"}');
  });
});

describe('webauthorMsgsFormat', function () {
  it('should provide msgs, and initialize window.supportedLanguages', function () {
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, './test/translation_additional.xml'],
      webAuthorMode: true
    });

    var contains = function (sourceString, containedString) {
      return sourceString.indexOf(containedString) !== -1;
    };

    // web author case.
    synci18n.generateTranslations();
    synci18n.supportedLanguages.length.should.equal(6);
    fs.existsSync(synci18n.destinationFile);
    var msgsFile = fs.readFileSync(synci18n.destinationFile, 'utf8');
    contains(msgsFile, 'goog.provide("msgs")').should.equal(true);
    contains(msgsFile, 'window.supportedLanguages=').should.equal(true);

    contains(msgsFile, '(function(){').should.equal(false);
    contains(msgsFile, 'sync.Translation.addTranslations(').should.equal(false);


    // normal case.
    synci18n.webAuthorMode = false;
    synci18n.generateTranslations();
    synci18n.supportedLanguages.length.should.equal(6);
    msgsFile = fs.readFileSync(synci18n.destinationFile, 'utf8');
    contains(msgsFile, 'goog.provide("msgs")').should.equal(false);
    contains(msgsFile, 'window.supportedLanguages=').should.equal(false);

    contains(msgsFile, '(function(){').should.equal(true);
    contains(msgsFile, 'sync.Translation.addTranslations(').should.equal(true);
  });
});