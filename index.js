const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

let utils = require('./utils.js');
let fileUtil = require('./file_utils.js');
let stringUtil = require('./string_utils.js');

function Synci18n(options) {

  // User does not have to write 'new'
  if (!(this instanceof Synci18n)) {
    return new Synci18n(options);
  }

  var getBool = this.getBooleanOption;
  options = options || {};

  this.regex = {
    client: /(?:tr|trDom)([\t\r\n ]*)\(([\t\r\n ]*)msgs\.[A-Za-z0-9|\_|\.]+/g,
    server: /rb.getMessage\(TranslationTags.[A-Za-z0-9|\_]+/g
  };
  this.regexTrim = {
    client: 'tr(msgs.',
    server: 'rb.getMessage(TranslationTags.'
  };

  this.stats = {};
  this.tags = [];
  this.languages = [];
  this.supportedLanguages = [];
  this.supportedLanguagesMap = {};
  this.sourceLanguagesHeader_ = null;

  this.unusedTags = [];
  this.tagsNotInXml = [];
  this.tagSkipInconsistencies = [];
  this.languageSkipInconsistencies = [];

  this.rootDir = options.rootDir || '.';

  let sourceFilesFromOptions = options.sourceFiles || [];
  // deprecated option. todo: delete it.
  if (options.sourceFile) {
    sourceFilesFromOptions.push(options.sourceFile);
  }
  this.sourceFiles = fileUtil.getSourceFiles(this.rootDir, sourceFilesFromOptions);

  this.destinationFile = options.destinationFile || this.rootDir + '/web/0translations.js'; //todo: test if parameter is folder path.
  this.translationXmlDestination = options.translationXmlDestination || this.rootDir + '/target/i18n/translation.xml';
  this.jsSourcesLocation = options.jsSourcesLocation || this.rootDir + '/web';
  this.javaSourcesLocation = options.javaSourcesLocation || this.rootDir + '/src';
  this.webAuthorMode = getBool(options.webAuthorMode);

  // Use a local msgs object. Needs to be wrapped in an IIFE afterwards, otherwise it overwrites the global msgs object.
  this.useLocalMsgs = getBool(options.useLocalMsgs);

  this.keepNewlinesAndTabs = options.keepNewLinesAndTabs;
  this.cleanTargetXml = options.cleanTargetXml || true;

  // These tags will be added even if their usage is not detected (ex: used in frameworks).
  this.clientSideExceptions = options.clientSideExceptions;

  this.readSourceFiles(this.sourceFiles);
  this.extractTags();
}


/**
 * Add languages to supported languages.
 * @param languagesList {Array<string>} List of languages extracted from file.
 */
Synci18n.prototype.addToSupportedLanguages = function (languagesList) {
  for (var i = 0; i < languagesList.length; i++) {
    var langObj = languagesList[i]['$'];
    if (this.supportedLanguagesMap.hasOwnProperty(langObj.lang)) {
      if (this.supportedLanguagesMap[langObj.lang] !== langObj.localeDescription) {
        console.warn('WARNING: supported languages mismatch! ', langObj.lang, this.supportedLanguagesMap[langObj.lang], ' got ', langObj.localeDescription);
      }
    } else {
      this.supportedLanguagesMap[langObj.lang] = langObj.localeDescription;
      this.supportedLanguages.push({code: langObj.lang, description: langObj.localeDescription});
    }
  }
};

/**
 * Read the source file and save its contents.
 * @param {Array<string>} sourceFiles the list of source files.
 */
Synci18n.prototype.readSourceFiles = function (sourceFiles) {
  for (var i = 0; i < sourceFiles.length; i++) {
    var sourceFile = sourceFiles[i];
    if (fs.existsSync(sourceFile)) {
      var xmlFileContent = fs.readFileSync(sourceFile, 'utf8');

      // Save the languageList header.
      var languageListStartIndex = xmlFileContent.indexOf('<languageList>');
      var endTag = '</languageList>';
      var languageListEndIndex = xmlFileContent.indexOf(endTag) + endTag.length;
      this.sourceLanguagesHeader_ = xmlFileContent.substring(languageListStartIndex, languageListEndIndex);

      var parser = new xml2js.Parser();
      parser.parseString(xmlFileContent, (function(err, result) {
        if (result) {
          this.tags = this.tags.concat(result.translation.key);
          this.languages = this.languages.concat(this.getLanguages(result.translation.languageList[0].language));
          this.addToSupportedLanguages(result.translation.languageList[0].language);
        } else {
          console.error('ERROR: Could not parse ' + sourceFile + ', check if file is valid XML');
        }
      }).bind(this));
    } else {
      console.trace('ERROR: Source file ' + sourceFile + ' does not exist');
    }
  }
  // Remove duplicates.
  this.languages = Array.from(new Set(this.languages));
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
 * This is useful when creating the server-side-only translation.xml file for plugins.
 *
 * @return {string} The xml element to be added to the final translation.xml
 */
Synci18n.prototype.makeXmlEntry = function (tag, trObj) {
  var distribution = '';
  var commentLine = '';

  if (!this.cleanTargetXml) {
    distribution = 'distribution="webauthor" ';
    commentLine = '        ' + (trObj.comment ? '<comment>' + trObj.comment + '</comment>\r\n' : '<comment/>\r\n');
  }

  var xmlEntryString =
    '    <key ' + distribution + 'value="' + tag + '">\r\n' +
    commentLine;

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
 * Get a map of all tags, where the uniform tag name is the key and
 * the value is the translation object as read from the translation.xml file.
 *
 * @return {{}} Map of all tags.
 */
Synci18n.prototype.getTagMap = function () {
  var allTags = {};
  this.tags.forEach(function (tagObj) {
    allTags[utils.getUniformTagName(tagObj['$'].value)] = tagObj;
  }, this);
  this.uniformTags = Object.keys(allTags);
  // Overwrite the generics with the specifics.
  this.tags.forEach(function (tagObj) {
    allTags[tagObj['$'].value] = tagObj;
  }, this);
  return allTags;
};

/**
 * Generate the msgs object.
 * @return {{ TAG1_: {en_US: '', fr_FR: ''}, TAG2_: {en_US: '', fr_FR: ''}, ...}}
 */
Synci18n.prototype.getMsgsObject = function () {
  var msgsObj = {};
  var tagObj;
  var uniformTagName;
  var allTagsFromTranslationFile = this.getTagMap();

  this.clientTags.forEach(function (clientSideTag) {
    uniformTagName = utils.getUniformTagName(clientSideTag);
    if (allTagsFromTranslationFile.hasOwnProperty(clientSideTag)) {
      tagObj = allTagsFromTranslationFile[clientSideTag];
      msgsObj[clientSideTag] = this.getMsgsObjectForTag(tagObj);
      this.alertIfVariableInconsistency(msgsObj[clientSideTag], clientSideTag);
    } else if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
      // Fallback to check the uniform format, before considering it not found.
      tagObj = allTagsFromTranslationFile[uniformTagName];
      msgsObj[clientSideTag] = this.getMsgsObjectForTag(tagObj);
      this.alertIfVariableInconsistency(msgsObj[clientSideTag], clientSideTag);

      if (!this.webAuthorMode) {
        console.log(clientSideTag, ' falls back to ', uniformTagName);
      }
    } else {
      this.tagsNotInXml.push(clientSideTag);
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
    let messageForLanguage = this.getMessageForLanguage(translation);
    if (messageForLanguage) {
      value[translation['$'].lang] = messageForLanguage;
    }
  }.bind(this));

  // Drop duplicate messages to save bandwidth.
  var fallbackLanguage = 'en_US';
  if (!duplicateMessages) {
    var fallbackMessage = value[fallbackLanguage];
    // A tag may have languages which are not defined in the language list.
    // Remove them if they are duplicates.
    // todo: Maybe warn in this case, it's probably a typo.
    var languages = Object.keys(value);
    languages.forEach(function (lang) {
      if (lang !== fallbackLanguage && value[lang] === fallbackMessage) {
        delete value[lang];
      }
    });
  }
  return value;
};

/**
 * Check if there are any tags in the translation.xml file, which are not used in the application.
 * These tags will be purged from the output.
 */
Synci18n.prototype.checkForUnusedTags = function () {
  this.getTagMap();
  var uniformTags = this.uniformTags;
  var unusedTags = [];

  var uniformizedClientTags = this.clientTags ? this.clientTags.map(utils.getUniformTagName) : [];
  var uniformizedServerTags = this.serverTags ? this.serverTags.map(utils.getUniformTagName) : [];

  uniformTags.forEach(function (tag) {
    if (uniformizedClientTags.indexOf(tag) === -1 && uniformizedServerTags.indexOf(tag) === -1) {
      unusedTags.push(tag);
    }
  });

  if (unusedTags.length > 0 && !this.webAuthorMode) {
    console.log('WARNING: ' + unusedTags.length + ' unused tags:');
    console.log(unusedTags);
    // Should only consider the unused tags from translation_webapp.xml
    this.unusedTags = unusedTags;
  }
};

/**
 * Create the msgs file, which will add the translations so they can be displayed.
 */
Synci18n.prototype.generateTranslations = function () {
  var allTagsFromTranslationFile = this.getTagMap();

  var uniformTagName;
  var msgsObj = this.getMsgsObject();

  // Log the tags which were not found in the xml files.
  this.checkTranslationStatus();

  var msgsFile;

    // The file has a different structure when used by the web author.
  if (this.webAuthorMode) {
    msgsFile = 'goog.provide("msgs"); //This file is generated by a gulp task.\nwindow.msgs=' + utils.stringify(msgsObj) +
      ';window.supportedLanguages=' + JSON.stringify(this.supportedLanguages) + ';';
  } else {
    msgsFile = '(function(){var msgs=' + utils.stringify(msgsObj) + ';sync.Translation.addTranslations(msgs);})();';
    // Must be surrounded by an IIFE with the rest of the plugin.
    // Will otherwise overwrite the global msgs.
    if (this.useLocalMsgs) {
      console.warn('Warning: Using local messages, make sure it is surrounded by IIFE properly!');
      msgsFile = 'var msgs=' + utils.stringify(msgsObj) + ';';
    }
  }

  // Make parent directories if necessary.
  fileUtil.makeDirectory(path.resolve(path.dirname(this.destinationFile)));
  fs.writeFileSync(this.destinationFile, msgsFile, 'utf8');

  if (this.serverTags.length > 0) {
    this.extractedServerTags = [];

    this.serverTags.forEach(function (serverSideTag) {
      uniformTagName = utils.getUniformTagName(serverSideTag);
      if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
        this.extractedServerTags.push(allTagsFromTranslationFile[uniformTagName]);
      } else {
        console.warn('WARNING: One server tag is used but cannot be found in the translation file, ', serverSideTag);
      }
    }, this);

    var translationXmlElements = '';
    for (var i = 0; i < this.extractedServerTags.length; i++) {
      var extractedServerTag = this.extractedServerTags[i];
      translationXmlElements += this.makeXmlEntry(extractedServerTag['$'].value, extractedServerTag, true);
    }

    var targetPath = path.resolve(path.dirname(this.translationXmlDestination));
    console.log('Creating folder', targetPath);
    fileUtil.makeDirectory(targetPath);
    fs.writeFileSync(this.translationXmlDestination, utils.makeXmlWithTags(translationXmlElements, this.cleanTargetXml, this.sourceLanguagesHeader_), 'utf8');

    this.checkTranslationStatus();
    this.checkQuotesServerSide(this.extractedServerTags);
  } else {
    console.log('Warning: No server tags found... skipping');
  }
};

/**
 * Replace newlines and tabs with spaces. Editor does not show them but webapp does.
 * @param {string} message The translated message to be cleaned up.
 * @returns {string} The translated message, purged of newlines and tabs.
 */
Synci18n.prototype.removeNewlinesAndTabs = function (message) {
  return message.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ');
};

/**
 * MessageFormat will break when it finds unescaped single quotes.
 * This is only a problem for server-side tags.
 * @param serverTags
 * @returns {number}
 */
Synci18n.prototype.checkQuotesServerSide = function (serverTags) {
  var tagsWithQuoteWarning = 0;
  for (var i = 0; i < serverTags.length; i++) {
    var s = serverTags[i];
    var serverTag = this.getMsgsObjectForTag(s, true);
    var foundQuoteDanger = false;
    for (var langCode in serverTag) {
      if (stringUtil.checkMessageHasUnescapedQuotes(serverTag[langCode])) {
        console.error('ERROR: The quote must be escaped in: ', serverTag[langCode]);
        console.error(Object.keys(serverTags));
        foundQuoteDanger = true;
      }
    }
    if (foundQuoteDanger) {
      tagsWithQuoteWarning++;
    }
  }
  if (tagsWithQuoteWarning > 0) {
    console.error('ERROR: There are ' + tagsWithQuoteWarning + ' server-side tags which probably need to have quotes escaped.');
  }
  return tagsWithQuoteWarning;
};

/**
 * Load the tags used client-side and server-side.
 */
Synci18n.prototype.extractTags = function () {
  this.clientTags = this.extractTagsInternal('client') || [];
  this.serverTags = this.extractTagsInternal('server') || [];
  this.checkForUnusedTags();

  // In case the usage detector fails, or if some usage cannot be detected at this point.
  if (this.clientSideExceptions) {
    this.clientTags = this.addExceptions(this.clientTags, this.clientSideExceptions);
  }
};

/**
 * Get the tags of a certain type from the source files.
 * @param tagsType The type of tags to get.
 * @return {RegExpMatchArray} The tags found.
 */
Synci18n.prototype.extractTagsInternal = function (tagsType) {
  var fileExt;

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
  } else if (tagsType === 'server') {
    sourcesPath = this.javaSourcesLocation;
    fileExt = '.java';
  }


  var fileContents = '';
  var takeHtmlExt = false;

  var recursiveReadDir = function (directory) {
    if (fs.existsSync(directory)) {
      var filenames = fs.readdirSync(directory);
      for (var i = 0; i < filenames.length; i++) {
        // Do not detect tags used in the test files of this module.
        if (filenames[i].indexOf('node_modules') !== -1) {
          continue;
        }
        // TODO: use something more powerful to set up exclude paths.
        var filename = path.basename(filenames[i], path.extname(filenames[i]));
        if (fileExt === '.js') {
          // take html file extensions too.
          takeHtmlExt = true;
        }

        if ((path.extname(filenames[i]) === fileExt || (!fs.lstatSync(directory + '/' + filenames[i]).isDirectory() && takeHtmlExt && path.extname(filenames[i]) === '.html')) &&
          filename.indexOf('test_') === -1) {
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
      console.warn('WARNING: [' + tagsType + '-side-tags]' + ' Could not find folder: ', directory);
    }

  };

  recursiveReadDir(sourcesPath);

  return this.findTagsInString(fileContents, tagsType);
};

/**
 * Apply the regex to a string (all targeted files concatenated usually) to extract the tags.
 * @param fileContents The string created from concatenating the source files of a certain type.
 * @param tagsType The type of tags to extract.
 * @returns {Array<string>} The list of tags found.
 */
Synci18n.prototype.findTagsInString = function (fileContents, tagsType) {
  var regex = this.regex[tagsType];
  var regexTrim = this.regexTrim[tagsType];
  // Find tags.
  var tagsFromFile = fileContents.match(regex);
  if (tagsFromFile) {
    tagsFromFile = tagsFromFile.map(function (tag) {
      if (tagsType === 'server') {
        return tag.replace(regexTrim, '');
      } else {
        tag = tag.substring(tag.indexOf('(') + 1);
        tag = tag.trim();
        return tag.replace('msgs.', '');
      }
    });

    // Remove duplicates.
    tagsFromFile = tagsFromFile.filter(function(item, pos) {
      return tagsFromFile.indexOf(item) === pos;
    });
  }
  return tagsFromFile;
};

/**
 * Show variable inconsistencies in the console.
 * @param tagFinalForm The tag to be checked.
 * @param tagName The name of the tag to check.
 */
Synci18n.prototype.alertIfVariableInconsistency = function (tagFinalForm, tagName) {
  var englishVariables = utils.checkForVariables(tagFinalForm['en_US']);
  var variables = [];

  var numberOfVariableInconsistencies = {};
  var nameOfVariableInconsistencies = {};
  for (var i = 0; i < this.languages.length; i++) {
    var lang = this.languages[i];
    if (lang !== 'en_US') {
      if (tagFinalForm[lang]) {
        variables = utils.checkForVariables(tagFinalForm[lang]);
        if (variables) {
          if (variables.length !== englishVariables.length) {
            if (!numberOfVariableInconsistencies[tagName]) {
              numberOfVariableInconsistencies[tagName] = ['en_US ' + englishVariables.length + ' ' + englishVariables];
            }
            numberOfVariableInconsistencies[tagName].push(lang + ' ' + variables.length + ' ' + variables);
          } else {
            var nameInconsistencyFound = false;
            variables.forEach(function (variable) {
              if(englishVariables.indexOf(variable) === -1) {
                if (!nameOfVariableInconsistencies[tagName]) {
                  nameOfVariableInconsistencies[tagName] = ['en_US ' + englishVariables];
                }
                nameInconsistencyFound = true;
              }
            });
            if (nameInconsistencyFound) {
              nameOfVariableInconsistencies[tagName].push(lang + ' ' + variables);
            }
          }
        }
      } else {
        // This message falls back to english so it cannot be inconsistent.
        // console.log(tagName, ' falls back to english for ', lang);
      }

    }
  }

  if (Object.keys(numberOfVariableInconsistencies).length > 0) {
    console.log('ERROR: Variable number inconsistencies: ');
    for (var t in numberOfVariableInconsistencies) {
      console.log(t);
      numberOfVariableInconsistencies[t].forEach(function (languageAndNumber) {
        console.log('  ' + languageAndNumber);
      });
    }
    this.stats.numberOfVariableInconsistencies = numberOfVariableInconsistencies;
  }

  if (Object.keys(nameOfVariableInconsistencies).length > 0) {
    console.log('ERROR: Variable name inconsistencies: ');
    for (var n in nameOfVariableInconsistencies) {
      nameOfVariableInconsistencies[n].forEach(function (languageAndName) {
        console.log('  ' + languageAndName);
      });
    }
    this.stats.nameOfVariableInconsistencies = nameOfVariableInconsistencies;
  }
};

/**
 * Check that, if the tag or part of it is marked with skipTranslation, it is properly skipped.
 */
Synci18n.prototype.checkSkippedTranslations = function () {
  this.tags.forEach(function (tagObj) {
    var tagNotProperlySkipped = this.checkSkippedTag(tagObj);
    if (tagNotProperlySkipped) {
      // The tag has the skipTranslation attribute - all languages should be skipped.
      this.tagSkipInconsistencies.push(tagNotProperlySkipped);
    } else {
      // This tag may have languages with skipTranslation attribute - those languages should be skipped.
      var languagesNotProperlySkipped = this.checkSkippedLanguages(tagObj);
      if (languagesNotProperlySkipped && languagesNotProperlySkipped.length) {
        this.languageSkipInconsistencies = this.languageSkipInconsistencies.concat(languagesNotProperlySkipped);
      }
    }
  }, this);
  if (this.tagSkipInconsistencies.length > 0) {
    console.error('ERROR: Tags marked with skipTranslation should not be translated', this.tagSkipInconsistencies);
  }
  if (this.languageSkipInconsistencies.length > 0) {
    console.error('ERROR: Languages marked with skipTranslation should not be translated', this.languageSkipInconsistencies);
  }
};

/**
 * Check that, if the tag has skipTranslation attribute, all languages are properly skipped.
 * @param {object} tagObj The xml tag object.
 * @return {string|null} The english message of the tag which is not properly skipped.
 */
Synci18n.prototype.checkSkippedTag = function (tagObj) {
  var tagSkipError = null;
  if (tagObj['$'].hasOwnProperty('skipTranslation') && tagObj['$']['skipTranslation'] === 'true') {
    var msgsObjForTag = this.getMsgsObjectForTag(tagObj, false);
    var englishMsg = msgsObjForTag['en_US'];
    for (var langCode in msgsObjForTag) {
      if (englishMsg !== msgsObjForTag[langCode]) {
        tagSkipError = englishMsg;
        break;
      }
    }
  }
  return tagSkipError;
};

/**
 * Some languages may have the skipTranslation attribute, show an error if it is not respected.
 * @param {object} tagObj The xml tag object.
 * @return {Array<string>} The list of messages which are not properly skipped in a certain language.
 */
Synci18n.prototype.checkSkippedLanguages = function (tagObj) {
  let languageSkipErrors = [];

  let englishMessage;
  // Get all messages for all languages.
  tagObj.val.forEach(function (translation) {
    let messageForLanguage = this.getMessageForLanguage(translation);
    if (translation['$'].lang === 'en_US') {
      englishMessage = messageForLanguage;
    } else if (translation['$'].skipTranslation === 'true' && messageForLanguage !== englishMessage) {
      languageSkipErrors.push(englishMessage + ' (' + translation['$'].lang + ')');
    }
  }.bind(this));
  return languageSkipErrors;
};

/**
 * This slice of the translation tag object looks like:  { _: 'Restart Server', '$': { lang: 'en_US' } }
 * @param {obj} translationObj The object containing a message for a language.
 * @return {string} The message for the language, or the string 'undefined' if there was no message.
 */
Synci18n.prototype.getMessageForLanguage = function (translationObj) {
  let messageForLanguage = translationObj['_'];
  if (messageForLanguage && !this.keepNewlinesAndTabs) {
    messageForLanguage = this.removeNewlinesAndTabs(messageForLanguage);
  }
  return messageForLanguage;
};

/**
 * Check the status of the translation file.
 */
Synci18n.prototype.checkTranslationStatus = function () {
  this.checkSkippedTranslations();

  if (this.tagsNotInXml.length > 0) {
    console.error('ERROR: Could not find tags in translation file:', this.tagsNotInXml);
  }
};

/**
 * Add some exceptions - keep certain tags even if no usage was found for them.
 * Filter out the exception tags which could not be found in the translation xmls.
 *
 * @param tagList The tag list to add exceptions to.
 * @param tagExceptions The tags to be added even if their usage was not detected.
 * @returns {Array} The new list of tags.
 */
Synci18n.prototype.addExceptions = function (tagList, tagExceptions) {
  // Add tag exception if a translation for it could be found in the source xmls.
  tagExceptions = tagExceptions.filter(function (tag) {
    return this.uniformTags.indexOf(utils.getUniformTagName(tag)) !== -1;
  }.bind(this));
  if (tagExceptions.length > 0) {
    console.log('The following client-side tags will be added even though they seem to not be used: ');
    console.log(tagExceptions);
  }
  // Remove duplicates.
  return Array.from(new Set(tagList.concat(tagExceptions)));
};

/**
 * Anything other than boolean true or string 'true' will return false.
 * @param option The option to check.
 * @returns {boolean} The option value to set.
 */
Synci18n.prototype.getBooleanOption = function (option) {
  return option === true || option === 'true';
};

module.exports = Synci18n;
