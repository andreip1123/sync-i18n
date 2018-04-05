const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

function Synci18n(options) {

  // User does not have to write 'new'
  if (!(this instanceof Synci18n)) {
    return new Synci18n(options);
  }

  options = options || {};
  this.sourceFile = options.sourceFile || './i18n/translation.xml';
  this.destinationFile = options.destinationFile || './web/0translations';

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
    console.log('Source file ' + sourceFile + ' does not exist');
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
 * Check the status of the translation file.
 */
Synci18n.prototype.checkTranslationStatus = function () {

};

module.exports = Synci18n;
