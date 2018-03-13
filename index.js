const fs = require('fs');
const path = require('path');

var xml2js = require('xml2js');

function Synci18n(options) {

  options = options || {};
  this.sourceFile = options.sourceFile;
  this.destinationFolder = options.destinationFolder;
}

Synci18n.prototype.getLanguages = function () {
  var languages;
  var sourceFile = this.sourceFile;
  if (sourceFile) {
    console.log('getting languages from file');
    languages = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    languages = languages.translation.languageList[0].language;

    var languageCodes = [];
    languages.forEach(language => languageCodes.push(language['$'].lang));
    return languageCodes;
  } else {
    console.log('getting default languages');
    return ['en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL'];
  }
};

// get the XML files and transform them into JSON
/*"translation-xml-to-json"*/
Synci18n.prototype.makeTranslationJsons = function () {
  var sourceFile = this.sourceFile;
  var destinationFolder = this.destinationFolder;

  var parser = new xml2js.Parser();
  var xmlFileContent = fs.readFileSync(sourceFile, 'utf8');

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
  var languages = this.getLanguages();
  var xmlEntryString =
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

module.exports = Synci18n;
