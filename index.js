const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

function Synci18n(options) {
  options = options || {};

  this.defaultSourceFile = __dirname + '/i18n/translation.xml';
  this.defaultDestinationFolder = __dirname + '/web';

  this.sourceFile = options.sourceFile;
  this.destinationFolder = options.destinationFolder;

  this.webauthorMode = options.webauthorMode;

}

Synci18n.prototype.getSourceFile = function () {
  return this.sourceFile || this.defaultSourceFile;
};

Synci18n.prototype.getDestinationFolder = function () {
  return this.destinationFolder || this.defaultDestinationFolder;
};

/**
 * Get the list of language codes from the xml file.
 * @returns {Array.<String>} The list of language codes.
 */
Synci18n.prototype.getLanguages = function () {
  let languages;
  let sourceFile = this.getSourceFile();
  if (sourceFile) {
    console.log('getting languages from file', sourceFile);
    languages = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    languages = languages.translation.languageList[0].language;

    let languageCodes = [];
    languages.forEach(language => languageCodes.push(language['$'].lang));
    return languageCodes;
  } else {
    console.log('getting default languages');
    return ['en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL'];
  }
};

/**
 * Convert the source xml file to json.
 */
Synci18n.prototype.makeTranslationJsons = function () {
  let sourceFile = this.getSourceFile();
  let destinationFolder = this.getDestinationFolder();

  let parser = new xml2js.Parser();
  let xmlFileContent = fs.readFileSync(sourceFile, 'utf8');

  parser.parseString(xmlFileContent, (err, result) => {
    if (destinationFolder) {
      fs.writeFileSync(destinationFolder + '/translation.json', JSON.stringify(result), 'utf8');
    } else {
      console.error('could not find temp folder');
    }
  });
};

/**
 * Generate an entry for translation_webapp.xml from the translation objects added in translation.js.
 * All languages will have the english string, this is a new, untranslated tag.
 *
 * @param key The value for the key element.
 * @param trObj The translation object.
 * @returns {string} A string with the xml entry to be added to translation.xml
 */
Synci18n.prototype.makeXmlEntry = function (key, trObj) {
  let languages = this.getLanguages();
  let xmlEntryString =
    '    <key distribution="webauthor" value="' + key + '">\r\n' +
    '        ' + (trObj.comment ? '<comment>' + trObj.comment + '</comment>\r\n' : '<comment/>\r\n');
  languages.forEach(function(language) {
    xmlEntryString +=
      '        <val lang="' + language + '">' + ((trObj[language]) ? trObj[language] : trObj['en_US']) + '</val>\r\n'
  });
  xmlEntryString +=
    '    </key>\r\n';
  return xmlEntryString;
};

/**
 * Set the msgs file path.
 * @param msgsFilePath The path of msgs file from options.
 */
Synci18n.prototype.getMsgsFilePath = function (msgsFilePath) {
  let filePath = null;
  if (msgsFilePath) {
    filePath = msgsFilePath;
  } else {
    if (this.webauthorMode) {
      filePath = this.getDestinationFolder() + '/msgs.js';
    } else {
      filePath = this.getDestinationFolder() + '/0translation.js';
    }
  }
  return filePath;
};

/**
 * Create the msgs file, which will add the translations so they can be displayed.
 */
Synci18n.prototype.makeMsgs = function () {
  let xmlFile = this.getSourceFile();
  let jsonFile = this.getDestinationFolder() + '/' + path.basename(xmlFile, path.extname(xmlFile)) + '.json';

  let msgsObj = {};
  let tags = JSON.parse(fs.readFileSync(jsonFile, 'utf8')).translation.key;
  tags.forEach(tag => {
    let key = tag['$'].value;
    let value = {};

    tag.val.forEach(translation => {
      value[translation['$'].lang] = translation['_'];
    });

    msgsObj[key] = value;
  });
  let msgsFile = '(function(){var msgs=' + JSON.stringify(msgsObj) + '; sync.Translation.addTranslations(msgs);})();';
  fs.writeFileSync(this.getMsgsFilePath(), msgsFile, 'utf8');
};

Synci18n.prototype.generateTranslations = function () {
  this.makeTranslationJsons();
  this.makeMsgs();
};

module.exports = Synci18n;
