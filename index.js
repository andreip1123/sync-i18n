const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

function Synci18n(options) {

  // User does not have to write 'new'
  if (!(this instanceof Synci18n)) {
    return new Synci18n(options);
  }

  options = options || {};
  this.rootDir = options.rootDir || '.';
  this.sourceFile = options.sourceFile || this.rootDir + '/i18n/translation.xml';
  this.destinationFile = options.destinationFile || this.rootDir + '/web/0translations.js'; //todo: test if parameter is folder path.
  this.jsSourcesLocation = options.jsSourcesLocation || this.rootDir + '/web';
  this.javaSourcesLocation = options.javaSourcesLocation || this.rootDir + '/src';

  this.readSourceFile(this.sourceFile);
}

/**
 * Read the source file and save its contents.
 */
Synci18n.prototype.readSourceFile = function (sourceFile) {
  if (fs.existsSync(sourceFile)) {
    var xmlFileContent = fs.readFileSync(sourceFile, 'utf8');
    var parser = new xml2js.Parser();
    parser.parseString(xmlFileContent, (function(err, result) {
      this.tags = result.translation.key;
      this.languages = this.getLanguages(result.translation.languageList[0].language);
    }).bind(this));
  } else {
    console.trace('Source file ' + sourceFile + ' does not exist');
  }
};

/**
 * Get the list of language codes from the xml file.
 * @returns {Array.<String>} The list of language codes.
 */
Synci18n.prototype.getLanguages = function (languages) {
  var languageCodes = [];
  languages.forEach(function (language) {
    languageCodes.push(language['$'].lang);
  });
  return languageCodes;
};

/**
 * Create the msgs file, which will add the translations so they can be displayed.
 */
Synci18n.prototype.generateTranslations = function () {
  var msgsObj = {};
  var tags = this.tags;
  tags.forEach(function (tag) {
    var key = tag['$'].value;
    var value = {};

    tag.val.forEach(function (translation) {
      value[translation['$'].lang] = translation['_'];
    });

    msgsObj[key] = value;
  });
  var msgsFile = '(function(){var msgs=' + JSON.stringify(msgsObj) + '; sync.Translation.addTranslations(msgs);})();';
  fs.writeFileSync(this.destinationFile, msgsFile, 'utf8');
};

/**
 * Load the tags used client-side and server-side.
 */
Synci18n.prototype.extractTags = function () {
  this.clientTags = this.extractTagsInternal('client');
  this.serverTags = this.extractTagsInternal('server');
};

/**
 * Get the tags of a certain type from the source files.
 * @param tagsType The type of tags to get.
 * @return {RegExpMatchArray} The tags found.
 */
Synci18n.prototype.extractTagsInternal = function (tagsType) {
  var fileExt, regex, regexTrim;

  var sourcesPath = '';

  if (tagsType === 'client') {
    /*
      Make sure the destination file does not contaminate the tags.
      It will be recreated.
     */
    if (fs.existsSync(this.destinationFile)) {
      fs.unlinkSync(this.destinationFile);
    }
    sourcesPath = this.jsSourcesLocation;
    fileExt = '.js';
    regex = /msgs.[A-Za-z|\_]+/g;
    regexTrim = 'msgs.';
  } else if (tagsType === 'server') {
    sourcesPath = this.javaSourcesLocation;
    fileExt = '.java';
    regex = /rb.getMessage\(TranslationTags.[A-Za-z|\_]+/g;
    regexTrim = 'rb.getMessage(TranslationTags.';
  }


  var fileContents = '';

  var recursiveReadDir = function (directory) {
    var filenames = fs.readdirSync(directory);
    for (var i = 0; i < filenames.length; i++) {
      if (path.extname(filenames[i]) === fileExt) {
        try {
          fileContents += fs.readFileSync(directory + '/' + filenames[i], 'utf8');
        } catch (e) {
          // this is a folder, you can't read a folder, don't be silly!
        }
      } else {
        var isDirectory = fs.lstatSync(directory + '/' + filenames[i]).isDirectory();
        if (isDirectory) {
          recursiveReadDir(directory + '/' + filenames[i]);
        }
      }
    }
  };

  recursiveReadDir(sourcesPath);

  // Find tags.
  var tagsFromFile = fileContents.match(regex);
  for (var i = 0; i < tagsFromFile.length; i++) {
    tagsFromFile[i] = tagsFromFile[i].replace(regexTrim, '');
  }
  // Remove duplicates.
  tagsFromFile = tagsFromFile.filter(function(item, pos) {
    return tagsFromFile.indexOf(item) === pos;
  });

  return tagsFromFile;
};

/**
 * Check the status of the translation file.
 */
Synci18n.prototype.checkTranslationStatus = function () {

};

module.exports = Synci18n;
