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
  //this.javaDestinationFile = ...
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
      if (result) {
        this.tags = result.translation.key;
        this.languages = this.getLanguages(result.translation.languageList[0].language);
      }
    }).bind(this));
  } else {
    console.trace('Source file ' + sourceFile + ' does not exist');
  }
};

/**
 * Make a simpler object containing only a map of messages to languages from the translation object.
 * @param trObj The translation object.
 * @return {{}} The simplified object containing only messages.
 */
Synci18n.prototype.getMessages = function (trObj) {
  var messages = {};
  var trObjMessages = trObj['val'];
  trObjMessages.forEach(function (trObjMessage) {
    var currentLanguage = trObjMessage['$'].lang;
    if (this.languages.indexOf(currentLanguage) !== -1) {
      messages[currentLanguage] = trObjMessage['_'];
    }
  }, this);
  return messages;
};

/**
 * Transform the translation object back to XML.
 * Used when writing the translation.xml file which contains only the server-side tags.
 * @param {string} tag The translation tag, should preferably be like "Server_side_tag_format".
 * @param trObj The translation object.
 * @return {string} The xml element to be added to the final translation.xml
 */
Synci18n.prototype.makeXmlEntry = function (tag, trObj) {
  var xmlEntryString =
    '    <key distribution="webauthor" value="' + tag + '">\r\n' +
    '        ' + (trObj.comment ? '<comment>' + trObj.comment + '</comment>\r\n' : '<comment/>\r\n');

  var messages = this.getMessages(trObj);
  this.languages.forEach(function(language) {
    var message = messages[language];
    if (!message) {
      message = messages['en_US'] || 'translation_error';
    }
    xmlEntryString +=
      '        <val lang="' + language + '">' + message + '</val>\r\n'
  });
  xmlEntryString +=
    '    </key>\r\n';

  return xmlEntryString;
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
 * Strip the tag name of its personality, turn it into lowercase and remove trailing underline.
 * @param {string} tagName The tag name to be processed.
 * @return {string} The uniform tag name.
 */
Synci18n.prototype.getUniformTagName = function (tagName) {
  var uniformTagName = tagName.toLowerCase();
  if (uniformTagName[uniformTagName.length - 1] === '_') {
    uniformTagName = uniformTagName.slice(0, -1);
  }
  return uniformTagName;
};

/**
 * Get a map of all tags, where the uniform tag name is the key and
 * the value is the translation object as read from the translation.xml file.
 *
 * @return {{}} Map of all tags.
 */
Synci18n.prototype.getTagMap = function () {
  var allTags = {};
  this.tags.forEach(function (tagObj) {
    allTags[this.getUniformTagName(tagObj['$'].value)] = tagObj;
  }, this);
  return allTags;
};

/**
 * Generate the msgs object.
 * @return { TAG1_: {en_US: '', fr_FR: ''}, TAG2_: {en_US: '', fr_FR: ''}, ...}
 */
Synci18n.prototype.getMsgsObject = function () {
  var msgsObj = {};
  var uniformTagName;
  var allTagsFromTranslationFile = this.getTagMap();

  this.clientTags.forEach(function (clientSideTag) {
    uniformTagName = this.getUniformTagName(clientSideTag);
    if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
      var tagObj = allTagsFromTranslationFile[uniformTagName];
      msgsObj[clientSideTag] = this.getMsgsObjectForTag(tagObj);
    } else {
      // TODO: maybe fallback to check other formats.
      console.warn('Could not find exact key (' + clientSideTag + ') in translation file.');
    }
  }, this);
  return msgsObj;
};

/**
 * Generate the object which will be added to the msgs object for a tag.
 * @param tagObj The translation object as read from the translation file.
 * @param [duplicateMessages] Whether this object will include messages for all languages
 * even if they are duplicates of the english message.
 * False by default, will lighten the translation payload slightly.
 * @return {{Object}} Object containing the messages for a certain tag, looks like: {en_US: '...', fr_FR: '...'}
 */
Synci18n.prototype.getMsgsObjectForTag = function (tagObj, duplicateMessages) {
  var value = {};
  // Get all messages for all languages.
  tagObj.val.forEach(function (translation) {
    value[translation['$'].lang] = translation['_'];
  });

  // Drop duplicate messages to save bandwidth.
  var fallbackLanguage = 'en_US';
  if (!duplicateMessages) {
    var fallbackMessage = value[fallbackLanguage];
    var languages = this.languages;
    languages.forEach(function (lang) {
      if (lang !== fallbackLanguage && value[lang] === fallbackMessage) {
        delete value[lang];
      }
    });
  }
  return value;
};

/**
 * Create the msgs file, which will add the translations so they can be displayed.
 */
Synci18n.prototype.generateTranslations = function () {
  this.extractTags();
  var allTagsFromTranslationFile = this.getTagMap();

  var uniformTagName;
  var msgsObj = this.getMsgsObject();

  var extractedServerTags = [];
  this.serverTags.forEach(function (serverSideTag) {
    uniformTagName = this.getUniformTagName(serverSideTag);
    if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
      extractedServerTags.push(allTagsFromTranslationFile[uniformTagName]);
    } else {
      console.log('One server tag is used but cannot be found in the translation file, ', serverSideTag);
    }
  }, this);

  console.log('extracted server tags ', extractedServerTags);
  console.log('extracted server tags2 ', JSON.stringify(extractedServerTags[0]));
  console.log('would write to xml: ', this.makeXmlEntry(extractedServerTags[0]['$'].value, extractedServerTags[0]));

  var msgsFile = '(function(){var msgs=' + JSON.stringify(msgsObj) + '; sync.Translation.addTranslations(msgs);})();';
  fs.writeFileSync(this.destinationFile, msgsFile, 'utf8');

  // TODO: write the server side tags only in the target translation.xml


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
    if (fs.existsSync(directory)) {
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
    } else {
      console.error('[' + tagsType + ']' + ' Could not find ', directory);
    }

  };

  recursiveReadDir(sourcesPath);

  // Find tags.
  var tagsFromFile = fileContents.match(regex);
  if (tagsFromFile) {
    for (var i = 0; i < tagsFromFile.length; i++) {
      tagsFromFile[i] = tagsFromFile[i].replace(regexTrim, '');
    }
    // Remove duplicates.
    tagsFromFile = tagsFromFile.filter(function(item, pos) {
      return tagsFromFile.indexOf(item) === pos;
    });
  }

  return tagsFromFile;
};

/**
 * Check the status of the translation file.
 */
Synci18n.prototype.checkTranslationStatus = function () {

};

module.exports = Synci18n;
