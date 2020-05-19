"use strict";
var should = require('chai').should();
var fs = require('fs');

var Synci18n = require('../index');
var utils = require('../utils.js');

var sourceFile = './test/translation.xml';

var deleteIfFileExists = function (filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};


var makeXmlEntryWithEnglishMessage = function (tagName, message) {
  return '<key value="' + tagName + '">\n' +
    '        <val lang="en_US">' + message + '</val>\n' +
    '        <val lang="de_DE">' + message + '</val>\n' +
    '        <val lang="fr_FR">' + message + '</val>\n' +
    '        <val lang="ja_JP">' + message + '</val>\n' +
    '        <val lang="nl_NL">' + message + '</val>\n' +
    '    </key>'
};

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

    deleteIfFileExists(destinationFile);

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

    utils.getUniformTagName('CLIENT_SIDE_').should.equal('client_side');
    utils.getUniformTagName('Server_side').should.equal('server_side');
    // Try some weird formats too
    utils.getUniformTagName('wEird_FormaT_oNE_').should.equal('weird_format_one');
    utils.getUniformTagName('wEird_FormaT_oNE').should.equal('weird_format_one');
  });
});

describe('makeMsgs', function () {
  it('should create the msgs file', function () {
    var destinationFile = __dirname + '/temp/01translaciooon.js';

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      destinationFile: destinationFile
    });

    deleteIfFileExists(destinationFile);

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

describe('sourceHasNoTags', function () {
  it('nulls should be guarded', function () {
    var folderForNoTagsTest = __dirname + '/web_no_tags';
    Synci18n.makeDirectory(folderForNoTagsTest);

    var msgsFilePath = folderForNoTagsTest + '/msgs_no_tags.js';
    var jsSourceFile = folderForNoTagsTest + '/plugin_has_no_tags.js';
    var jsSourceContent = '(function () { var someText = "har har"; someText += "said the pirate, yarr";})();';

    fs.writeFileSync(jsSourceFile, jsSourceContent, 'utf8');

    var synci18n = Synci18n({
      sourceFile: sourceFile,
      jsSourcesLocation: folderForNoTagsTest,
      destinationFile: msgsFilePath
    });
    synci18n.generateTranslations();

    // Msgs file should have no tags, there should be no language properties present.
    fs.existsSync(msgsFilePath).should.equal(true);
    var msgsFileContents = fs.readFileSync(msgsFilePath, 'utf8');
    synci18n.languages.should.eql(['en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL']);
    // Looks like this:
    msgsFileContents.should.equal('(function(){var msgs={};sync.Translation.addTranslations(msgs);})();');
    synci18n.languages.forEach(function (langCode) {
      (msgsFileContents.indexOf(langCode) === -1).should.equal(true);
    });

    // Clean up the temp files.
    fs.unlinkSync(msgsFilePath);
    fs.unlinkSync(jsSourceFile);
    fs.rmdirSync(folderForNoTagsTest);
  });
});

describe('findTagsInString', function () {
  it('should messages even if tag format does not exactly match', function () {
    // Check that it will take any tag format.
    var mockPluginJsContent = '(function () {\n' +
      '  var someText = tr(msgs.JULY_FLOWERS_);\n' +
      '  var someText += trDom(msgs.RESTART_SERVER_, tr(msgs.Apr));\n' +
      '  var someOtherText += trDom(msgs.MAY_) + trDom(msgs.MAY) + trDom(msgs.May) + trDom(msgs.May_);\n' +
      '  someOtherText += tr(msgs.APR_) + tr(msgs.Apr_) + tr(msgs.APR);\n' +
      '})();';

    var mockPluginDirectory = __dirname + '/web_tag_formats';
    Synci18n.makeDirectory(mockPluginDirectory);

    var msgsFilePath = mockPluginDirectory + '/msgs_tag_formats.js';
    var jsSourceFile = mockPluginDirectory + '/plugin_tag_formats.js';

    fs.writeFileSync(jsSourceFile, mockPluginJsContent, 'utf8');

    var synci18n = Synci18n({
      sourceFiles: [sourceFile, './test/translation_additional.xml'],
      jsSourcesLocation: mockPluginDirectory,
      destinationFile: msgsFilePath
    });

    // All formats should be detected and all formats should be present in the msgs file.
    var expectedTags = ['JULY_FLOWERS_', 'RESTART_SERVER_', 'APR_', 'APR', 'Apr_', 'Apr', 'MAY_', 'MAY', 'May_', 'May'];
    var tagsFound = synci18n.findTagsInString(mockPluginJsContent, 'client');
    tagsFound.should.have.members(expectedTags);
    synci18n.generateTranslations();

    var msgsObj = synci18n.getMsgsObject();
    Object.keys(msgsObj).should.have.members(expectedTags);

    var tagsShouldHaveSameMessages = function (similarTags) {
      var j;
      var initialMessage = msgsObj[similarTags[0]];
      for (j = 1; j < similarTags.length; j++) {
        msgsObj[similarTags[j]].should.eql(initialMessage);
      }
    };

    // All similar tags should have the same messages, since only one version is defined in the translation file.
    tagsShouldHaveSameMessages(['APR_', 'APR', 'Apr_', 'Apr']);
    tagsShouldHaveSameMessages(['MAY_', 'MAY', 'May_', 'May']);
    var originalMayMessageObj = Object.assign({}, msgsObj['MAY_']);

    // Use another translation file that contains some of these similar tags.
    var firstMessage = 'This message is slightly different';
    var secondMessage = 'This message is wildly different';
    var tempTranslationFile = mockPluginDirectory + '/translation_tag_formats.xml';
    var someTagsXmlElements = makeXmlEntryWithEnglishMessage('MAY', firstMessage) +
      makeXmlEntryWithEnglishMessage('May', secondMessage);
    fs.writeFileSync(tempTranslationFile, utils.makeXmlWithTags(someTagsXmlElements), 'utf8');

    synci18n = Synci18n({
      sourceFiles: [sourceFile, './test/translation_additional.xml', tempTranslationFile],
      jsSourcesLocation: mockPluginDirectory,
      destinationFile: msgsFilePath
    });

    // Detected tags should not have changed.
    synci18n.generateTranslations();
    msgsObj = synci18n.getMsgsObject();
    tagsFound.should.have.members(Object.keys(msgsObj));

    // "APR_" is the only tag defined in a translation.xml file.
    // The other formats get the same message via fallback to uniform/generic name.
    tagsShouldHaveSameMessages(['APR_', 'APR', 'Apr_', 'Apr']);

    // The "May" tag was the last one to overwrite the message. All generics will have this translation.
    // In this case, the only generic left is "May_".
    msgsObj['May_'].should.eql(msgsObj['May']);
    msgsObj['May'].en_US.should.equal(secondMessage);
    msgsObj['MAY'].en_US.should.equal(firstMessage);
    // The "May_" tag should have the original translation.
    msgsObj['MAY_'].should.eql(originalMayMessageObj);

    // Test that it properly grabs the right translation for the tags.
    // Clean up the temp files.
    fs.unlinkSync(msgsFilePath);
    fs.unlinkSync(jsSourceFile);
    fs.unlinkSync(tempTranslationFile);
    fs.rmdirSync(mockPluginDirectory);

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

describe('addExceptions', function () {
  it('should be able to take exceptions on client-side tags', function () {

    var msgsFilePath = __dirname + '/msgs_with_exceptions.js';
    var synci18n = Synci18n({
      sourceFiles: [
        __dirname + '/translation.xml',
        __dirname + '/translation_additional.xml'
      ],
      clientSideExceptions: ['RESTART_SERVER_', 'TAG_NOT_IN_TRANSLATION_FILES_'],
      destinationFile: msgsFilePath
    });
    // No usages of RESTART_SERVER_ should have been found but it should be kept,
    // because it was specified as an exception.
    synci18n.extractTags();
    var clientTags = synci18n.clientTags;
    clientTags.should.eql(['DEC_', 'NOV', 'RESTART_SERVER_']);
    clientTags.length.should.equal(3);

    // Exceptions should not get into server tags.
    var serverTags = synci18n.serverTags;
    serverTags.length.should.equal(2);
    serverTags.should.eql(['JULY_FLOWERS', 'DECEMBER']);

    // Follow the exceptions all the way to the msgs file content.
    synci18n.generateTranslations();
    var msgsObj = synci18n.getMsgsObject();
    clientTags.should.have.members(Object.keys(msgsObj));

    var msgsFileContents = fs.readFileSync(msgsFilePath, 'utf8');
    msgsFileContents.should.equal('(function(){var msgs={DEC_:{en_US:"December2",de_DE:"Dezember2",fr_FR:"décembre2",nl_NL:"december2"},NOV:{en_US:"November"},RESTART_SERVER_:{en_US:"Restart Server"}};sync.Translation.addTranslations(msgs);})();');

    fs.existsSync(msgsFilePath).should.equal(true);
    fs.unlinkSync(msgsFilePath);
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
    // The resulting file containing only the used server tags should keep the original languageList element.
    var serverTagsOnlyFile = fs.readFileSync(defaultTargetTranslationXml, 'utf8');
    serverTagsOnlyFile.indexOf('<language testKeepSourceLanguageList="yes"').should.not.equal(-1);
    otherSynci18n.languages.should.eql([ 'en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL']);

    otherSynci18n.translationXmlDestination.should.equal(customTargetTranslationXml);
    otherSynci18n.generateTranslations();
    otherSynci18n.tags.length.should.equal(1);
    fs.existsSync(customTargetTranslationXml).should.equal(true);
  });
});

describe('customStringifyFunction', function () {
  it('should make valid objects, trimming quotes where possible', function () {
    var input = {en_US: 'July flowers', de_DE: 'July flowers'};
    utils.stringify(input).should.equal('{en_US:"July flowers",de_DE:"July flowers"}');
    input = {
      some_tag_name: {en_US: 'July flowers', de_DE: 'July flowers'},
      some_other_name: {ja_JP: 'flowers', fr_FR: 'flowers'}
    };
    utils.stringify(input).should.equal('{some_tag_name:{en_US:"July flowers",de_DE:"July flowers"},some_other_name:{ja_JP:"flowers",fr_FR:"flowers"}}');
    input = {
      "invalid-tag-name": "www",
      "invalid.tag.name": "another one",
      "1.invalid": "this one has a number",
      valid_tag: "why not"
    };
    utils.stringify(input).should.equal('{"invalid-tag-name":"www","invalid.tag.name":"another one","1.invalid":"this one has a number",valid_tag:"why not"}');
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

describe('testVariableRegex', function () {
  it('should properly detect variables in messages', function () {
    // This case would consider {$B_END}{$P_END} as one variable.
    var stringToCheck = '{$B_START}Annuler/Rétablir{$B_END}{$P_END}';
    var variables = utils.checkForVariables(stringToCheck);
    variables.length.should.equal(3);
  });
});

describe('alertIfVariableInconsistency', function () {
  it('should provide msgs, and initialize window.supportedLanguages', function () {
    var synci18n = Synci18n({sourceFile: sourceFile});

    // Now contains variable number inconsistencies.
    var mockObject = {
      en_US: 'December ${month}',
      de_DE: 'Dezember ${month} ${day}',
      fr_FR: 'décembre ${month}',
      nl_NL: '${month} december ${day}'
    };

    utils.checkForVariables(mockObject.en_US).length.should.equal(1);
    synci18n.alertIfVariableInconsistency(mockObject, 'TAG_NAME_');
    Object.keys(synci18n.stats.numberOfVariableInconsistencies).length.should.equal(1);

    var nrInconsistencies = synci18n.stats.numberOfVariableInconsistencies['TAG_NAME_'];
    nrInconsistencies.length.should.equal(3);
    nrInconsistencies[0].should.equal('en_US 1 {month}');
    (nrInconsistencies.indexOf('de_DE 2 {month},{day}') !== -1).should.equal(true);
    (nrInconsistencies.indexOf('nl_NL 2 {month},{day}') !== -1).should.equal(true);

    // Now contains variable name inconsistencies.
    mockObject = {
      en_US: 'December ${month}',
      de_DE: 'Dezember ${month}',
      fr_FR: 'décembre ${montha}',
      nl_NL: '${montho} december',
      ja_JP: '${month} december'
    };

    utils.checkForVariables(mockObject.en_US).length.should.equal(1);
    synci18n.alertIfVariableInconsistency(mockObject, 'TAG_NAME_');
    var nameInconsistencies = synci18n.stats.nameOfVariableInconsistencies['TAG_NAME_'];
    Object.keys(synci18n.stats.nameOfVariableInconsistencies).length.should.equal(1);
    nameInconsistencies.length.should.equal(3);
    nameInconsistencies[0].should.equal('en_US {month}');
    (nameInconsistencies.indexOf('fr_FR {montha}') !== -1).should.equal(true);
    (nameInconsistencies.indexOf('nl_NL {montho}') !== -1).should.equal(true);


    mockObject = {
      en_US: 'December ${month} ${day}',
      de_DE: 'Dezember ${month} ${daaayo}',
      fr_FR: '${day} décembre ${montha}',
      nl_NL: '${montho} december ${dayo}',
      ja_JP: '${month} december ${day}'
    };

    utils.checkForVariables(mockObject.en_US).length.should.equal(2);
    synci18n.alertIfVariableInconsistency(mockObject, 'TAG_NAME_');
    Object.keys(synci18n.stats.nameOfVariableInconsistencies).length.should.equal(1);
    synci18n.stats.nameOfVariableInconsistencies['TAG_NAME_'].length.should.equal(4);
  });
});

describe('testSkippedTags', function () {
  it('should show warning if skipped tags get translated', function () {
    var skippedTranslationXml = __dirname + '/translation_skipped.xml';
    deleteIfFileExists(skippedTranslationXml);

    var testSkippedTagsTranslationXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' +
      '    <key skipTranslation="true" value="April_flowers">\n' +
      '        <val lang="en_US">April flowers</val>\n' +
      '        <val lang="de_DE">Avril flowers</val>\n' +
      '        <val lang="fr_FR">April flowers</val>\n' +
      '        <val lang="ja_JP">April flowers</val>\n' +
      '        <val lang="nl_NL">April flowers</val>\n' +
      '    </key>\n' +
      '</translation>';
    fs.writeFileSync(skippedTranslationXml, testSkippedTagsTranslationXml, 'utf8');
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, skippedTranslationXml]
    });
    synci18n.checkTranslationStatus();
    synci18n.tagSkipInconsistencies.length.should.eql(1);
    synci18n.tagSkipInconsistencies.should.eql(['April flowers']);

    deleteIfFileExists(skippedTranslationXml);
  });
});

describe('testSkippedLanguage', function () {
  it('should show warning if a skipped language get translated', function () {
    var skippedTranslationXml = __dirname + '/translation_skipped_language.xml';
    deleteIfFileExists(skippedTranslationXml);

    var testSkippedTagsTranslationXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' +
      '    <key value="April_flowers">\n' +
      '        <val lang="en_US">April flowers</val>\n' +
      '        <val lang="de_DE">Avril flowers</val>\n' +
      '        <val lang="fr_FR">April flowers</val>\n' +
      '        <val skipTranslation="true" lang="ja_JP">Aprili flowersi</val>\n' +
      '        <val lang="nl_NL">April flowers</val>\n' +
      '    </key>\n' +
      '</translation>';
    fs.writeFileSync(skippedTranslationXml, testSkippedTagsTranslationXml, 'utf8');
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, skippedTranslationXml]
    });
    synci18n.checkTranslationStatus();
    synci18n.languageSkipInconsistencies.length.should.eql(1);
    synci18n.languageSkipInconsistencies.should.eql(['April flowers (ja_JP)']);

    deleteIfFileExists(skippedTranslationXml);
  });
});

describe('testMultipleSkippedLanguages', function () {
  it('should show warning more skipped languages get translated', function () {
    var skippedTranslationXml = __dirname + '/translation_skipped_language.xml';
    deleteIfFileExists(skippedTranslationXml);

    var testSkippedTagsTranslationXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' +
      '    <key value="April_flowers">\n' +
      '        <val lang="en_US">April flowers</val>\n' +
      '        <val lang="de_DE">Avril flowers</val>\n' +
      '        <val lang="fr_FR">April flowers</val>\n' +
      '        <val skipTranslation="true" lang="ja_JP">Aprili flowersi</val>\n' +
      '        <val lang="nl_NL">April flowers</val>\n' +
      '    </key>\n' +
      '</translation>';
    fs.writeFileSync(skippedTranslationXml, testSkippedTagsTranslationXml, 'utf8');
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, skippedTranslationXml]
    });
    synci18n.checkTranslationStatus();
    synci18n.languageSkipInconsistencies.length.should.eql(1);
    synci18n.languageSkipInconsistencies.should.eql(['April flowers (ja_JP)']);

    deleteIfFileExists(skippedTranslationXml);
  });
});

describe('testUseLocalMsgsSourceHasNoTags', function () {
  it('should never happen in web author mode', function () {
    var folderForNoTagsTest = __dirname + '/web_no_tags';
    Synci18n.makeDirectory(folderForNoTagsTest);

    var msgsFilePath = folderForNoTagsTest + '/msgs_no_tags.js';
    var jsSourceFile = folderForNoTagsTest + '/plugin_has_no_tags.js';
    var jsSourceContent = '(function () { var someText = "har har"; someText += "said the pirate, yarr";})();';

    fs.writeFileSync(jsSourceFile, jsSourceContent, 'utf8');

    // Options for a normal, no source tags run.
    var opts = {
      sourceFile: sourceFile,
      jsSourcesLocation: folderForNoTagsTest,
      destinationFile: msgsFilePath
    };
    var synci18n = Synci18n(opts);
    synci18n.generateTranslations();
    var msgsFileContents = fs.readFileSync(msgsFilePath, 'utf8');
    msgsFileContents.should.equal('(function(){var msgs={};sync.Translation.addTranslations(msgs);})();');


    // Use local msgs.
    var useLocalMsgsOptions = Object.assign({
      useLocalMsgs: true
    }, opts);
    synci18n = Synci18n(useLocalMsgsOptions);
    synci18n.generateTranslations();
    msgsFileContents = fs.readFileSync(msgsFilePath, 'utf8');
    msgsFileContents.should.equal('var msgs={};');

    // Use local msgs when in webauthor mode.
    // Should do nothing - the useLocalMsgs file should be ignored.
    var useLocalMsgsOptionsWebAuthor = Object.assign({
      webAuthorMode: true
    }, useLocalMsgsOptions);
    synci18n = Synci18n(useLocalMsgsOptionsWebAuthor);
    synci18n.generateTranslations();
    msgsFileContents = fs.readFileSync(msgsFilePath, 'utf8');
    (msgsFileContents.indexOf('goog.provide("msgs")') !== -1).should.equal(true);
    (msgsFileContents.indexOf('var msgs={}') === -1).should.equal(true);

    // Clean up the temp files.
    fs.unlinkSync(msgsFilePath);
    fs.unlinkSync(jsSourceFile);
    fs.rmdirSync(folderForNoTagsTest);
  });
});

describe('testTagsWithQuotes', function () {
  it('should show warning if quotes are properly escaped when used in server tags ', function () {
    var quotesTranslationXml = __dirname + '/translation_quotes.xml';
    deleteIfFileExists(quotesTranslationXml);

    var quotesTranslationXmlValue = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' +
      '    <key value="quotes_without_params">\n' +
      '        <val lang="en_US">aaa' + "'" + 'a</val>\n' +
      '        <val lang="de_DE">bbb' + "'" + 'b</val>\n' +
      '        <val lang="fr_FR">ccc' + "'" + 'c</val>\n' +
      '        <val lang="ja_JP">ddd' + "'" + 'd</val>\n' +
      '        <val lang="nl_NL">eee' + "'" + 'e</val>\n' +
      '    </key>\n' +
      '    <key value="quotes_with_params">\n' +
      '        <val lang="en_US">aaa' + "'" + ' {a}</val>\n' +
      '        <val lang="de_DE">bbb' + "'" + ' {b}</val>\n' +
      '        <val lang="fr_FR">ccc' + "'" + ' {c}</val>\n' +
      '        <val lang="ja_JP">ddd' + "'" + ' {d}</val>\n' +
      '        <val lang="nl_NL">eee' + "'" + ' {e}</val>\n' +
      '    </key>\n' +
      '</translation>';
    fs.writeFileSync(quotesTranslationXml, quotesTranslationXmlValue, 'utf8');
    var synci18n = Synci18n({
      sourceFiles: [sourceFile, quotesTranslationXml]
    });

    synci18n.serverTags = ['quotes_without_params', 'quotes_with_params'];
    synci18n.generateTranslations();
    synci18n.checkQuotesServerSide(synci18n.extractedServerTags).should.equal(1);
    deleteIfFileExists(quotesTranslationXml);

    // to test the detection straight on the string, do it faster with:
    synci18n.checkMessageHasUnescapedQuotes("this string only has'a quote").should.equal(false);
    synci18n.checkMessageHasUnescapedQuotes("this string only has'a quote and a {variable}").should.equal(true);

    // Detect if the quotes have been properly escaped.
    synci18n.checkMessageHasUnescapedQuotes("{0} l''enfant basculé vers le chemin d'origine.").should.equal(true);
    synci18n.checkMessageHasUnescapedQuotes("{0} l''enfant basculé vers le chemin d''origine.").should.equal(false);
    synci18n.checkMessageHasUnescapedQuotes("pas d'éléments.").should.equal(false);
  });
});

/**
 * Check that client-side tags are detected even if there are some newlines/tabs/spaces between the tr and the msgs part.
 */
describe('findTagsInStringNewlinesTabsSpaces', function () {
  it('should messages even if there are some newlines, tabs, spaces', function () {
    // Check that it will take any tag format.
    var mockPluginJsContent = '(function () {\n' +
      '  var someText = tr(\n\n' + // two newlines
          'msgs.JULY_FLOWERS_);\n' +
      '  var someText = tr( msgs.TEST1_);' +
      '  var someText = trDom(  \n msgs.TEST2_);' +
      '  var someText = tr( \n   \n msgs.TEST3_);' +
      '  var someText += trDom(msgs.RESTART_SERVER_, tr(msgs.Apr));\n' +
      '  var someOtherText += trDom(msgs.MAY_) + trDom(msgs.MAY) + trDom(msgs.May) + trDom(msgs.May_);\n' +
      '  someOtherText += tr(msgs.APR_) + tr(msgs.Apr_) + tr(msgs.APR);\n' +
      '})();';


    var synci18n = Synci18n({
      sourceFiles: [sourceFile, './test/translation_additional.xml']
    });

    // All formats should be detected and all formats should be present in the msgs file.
    var expectedTags = ['JULY_FLOWERS_', 'TEST1_', 'TEST2_', 'TEST3_', 'RESTART_SERVER_', 'APR_', 'APR', 'Apr_', 'Apr', 'MAY_', 'MAY', 'May_', 'May' ];
    var tagsFound = synci18n.findTagsInString(mockPluginJsContent, 'client');
    tagsFound.should.have.members(expectedTags);
  });
});

/**
 * Check that if the message element for a language is empty translation still works as expected.
 */
describe('testNoMessageForALanguage', function () {
  it("should work if there's an empty message element", function () {
    let destinationFile = __dirname + '/temp/empty_message_translations.js';
    let skippedTranslationXml = __dirname + '/translation_empty_message_for_language.xml';
    deleteIfFileExists(skippedTranslationXml);

    let testSkippedTagsTranslationXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' +
      '    <key value="DEC_">\n' +
      '        <val lang="en_US">April flowers</val>\n' +
      '        <val lang="fr_FR">April flowers</val>\n' +
      '        <val lang="ja_JP">Aprili flowersi</val>\n' +
      '        <val lang="nl_NL"/>\n' +
      '    </key>\n' +
      '</translation>';
    fs.writeFileSync(skippedTranslationXml, testSkippedTagsTranslationXml, 'utf8');
    let synci18n = Synci18n({
      sourceFiles: [skippedTranslationXml],
      destinationFile: destinationFile
    });

    deleteIfFileExists(destinationFile);
    synci18n.generateTranslations();

    let msgsFileContents = fs.readFileSync(synci18n.destinationFile, 'utf8');
    msgsFileContents.indexOf('de_DE').should.equal(-1);
    msgsFileContents.indexOf('nl_NL').should.equal(-1);
    (msgsFileContents.indexOf('{DEC_:{en_US:"April flowers",ja_JP:"Aprili flowersi"}') !== -1)
      .should.equal(true);

    fs.existsSync(destinationFile).should.equal(true);
    fs.unlinkSync(destinationFile);
    deleteIfFileExists(skippedTranslationXml);
  });
});