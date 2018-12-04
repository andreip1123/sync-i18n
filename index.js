const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

function Synci18n(options) {

  // User does not have to write 'new'
  if (!(this instanceof Synci18n)) {
    return new Synci18n(options);
  }

  var getBool = this.getBooleanOption;
  options = options || {};

  this.regex = {
    client: /(?:tr|trDom)\(msgs\.[A-Za-z0-9|\_|\.]+/g,
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

  this.unusedTags = [];
  this.tagsNotInXml = [];
  this.tagSkipInconsistencies = [];

  this.rootDir = options.rootDir || '.';
  this.sourceFiles = this.getSourceFiles(options);
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
 * Get the source files from the options.
 * If not properly defined, go to fallbacks and show warnings.
 * @param options The options object.
 * @returns {Array<string>} The list of source files.
 */
Synci18n.prototype.getSourceFiles = function (options) {
  var sourceFiles = [];
  var defaultSourceFile = this.rootDir + '/i18n/translation.xml';
  if (Array.isArray(options.sourceFiles)) {
    sourceFiles.forEach(function(fileToCheck){
      if (!fs.existsSync(fileToCheck)) {
        console.warn('Source file does not exist: ' + fileToCheck);
      }
    });
    sourceFiles = options.sourceFiles;
  } else {
    if (options.sourceFiles) {
      if (fs.existsSync(options.sourceFiles)) {
        sourceFiles = [options.sourceFiles];
      } else {
        console.warn('Source file does not exist: ' + options.sourceFiles);
        console.warn('Falling back to ' + defaultSourceFile);
        sourceFiles = [defaultSourceFile];
      }
    }
    if (options.sourceFile) {
      if (fs.existsSync(options.sourceFile)) {
        sourceFiles = [options.sourceFile];
      } else {
        console.warn('Source file does not exist: ' + options.sourceFile);
        console.warn('Falling back to ' + defaultSourceFile);
        sourceFiles = [defaultSourceFile];
      }
    } else {
      if (!fs.existsSync(defaultSourceFile)) {
        console.log('Source file does not exist: ' + defaultSourceFile)
      }
      sourceFiles = [defaultSourceFile];
    }
  }
  return sourceFiles;
};

/**
 * Add languages to supported languages.
 * @param languagesList {Array<string>} List of languages extracted from file.
 */
Synci18n.prototype.addToSupportedLanguages = function (languagesList) {
  for (var i = 0; i < languagesList.length; i++) {
    var langObj = languagesList[i]['$'];
    if (this.supportedLanguagesMap.hasOwnProperty(langObj.lang)) {
      if (this.supportedLanguagesMap[langObj.lang] !== langObj.localeDescription) {
        console.warn('supported languages mismatch! ', langObj.lang, this.supportedLanguagesMap[langObj.lang], ' got ', langObj.localeDescription);
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
      var parser = new xml2js.Parser();
      parser.parseString(xmlFileContent, (function(err, result) {
        if (result) {
          this.tags = this.tags.concat(result.translation.key);
          this.languages = this.languages.concat(this.getLanguages(result.translation.languageList[0].language));
          this.addToSupportedLanguages(result.translation.languageList[0].language);
        } else {
          console.error('Could not parse ' + sourceFile + ', check if file is valid XML');
        }
      }).bind(this));
    } else {
      console.trace('Source file ' + sourceFile + ' does not exist');
    }
  }
  this.languages = this.removeDuplicates(this.languages);
};

/**
 * Remove duplicates from array.
 * @param array The array to remove duplicates from.
 * @returns {Array} The de-duplicated array.
 */
Synci18n.prototype.removeDuplicates = function (array) {
  var visited = {};
  var output = [];
  var len = array.length;
  var j = 0;
  for(var i = 0; i < len; i++) {
    var item = array[i];
    if(visited[item] !== 1) {
      visited[item] = 1;
      output[j++] = item;
    }
  }
  return output;
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
    uniformTagName = this.getUniformTagName(clientSideTag);
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
  var removeNewLinesAndTabsFn = this.removeNewlinesAndTabs;

  // Get all messages for all languages.
  tagObj.val.forEach(function (translation) {
    var messageForLanguage = translation['_'];
    if (!this.keepNewlinesAndTabs) {
      messageForLanguage = removeNewLinesAndTabsFn(messageForLanguage);
    }
    value[translation['$'].lang] = messageForLanguage;
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
 * Return the string, removing quotes where safe.
 * @param obj The object to custom stringify.
 */
Synci18n.prototype.stringify = function (obj) {
  var stringified = '{';
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (prop.match(/[0-9]|-|\./)) {
        stringified += JSON.stringify(prop) + ':';
      } else {
        stringified += prop + ':';
      }
      if (typeof obj[prop] === 'string') {
        stringified += JSON.stringify(obj[prop]);
      } else if (typeof obj[prop] === "object") {
        stringified += this.stringify(obj[prop]);
      }
      stringified += ','
    }
  }
  if (stringified.length > 1) {
    stringified = stringified.slice(0, -1);
  }
  stringified += '}';
  return stringified;
};

/**
 * Check if there are any tags in the translation.xml file, which are not used in the application.
 * These tags will be purged from the output.
 */
Synci18n.prototype.checkForUnusedTags = function () {
  this.getTagMap();
  var uniformTags = this.uniformTags;
  var unusedTags = [];

  var uniformizedClientTags = this.clientTags ? this.clientTags.map(this.getUniformTagName) : [];
  var uniformizedServerTags = this.serverTags ? this.serverTags.map(this.getUniformTagName) : [];

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
 * Create directories to fill out a path.
 * Stops if it goes up 3 levels and does not reach an existing directory.
 * @param targetPath The directory path to be created.
 */
Synci18n.makeDirectory = function (targetPath) {
  if (!fs.existsSync(targetPath)) {
    var poppedSegments = [];
    var sanityPath = targetPath;
    var counter = 0;
    while (!fs.existsSync(sanityPath) && counter < 3) {
      sanityPath = sanityPath.split(path.sep);
      poppedSegments.unshift(sanityPath.pop());
      sanityPath = sanityPath.join(path.sep);
      counter++;
      if (counter >= 3) {
        console.log('Went up 3 parents to find a starting point, giving up.');
      }
    }
    for (var i = 0; i < poppedSegments.length; i++) {
      sanityPath += path.sep + poppedSegments[i];
      fs.mkdirSync(sanityPath);
    }
  }
};

/**
 * Create the msgs file, which will add the translations so they can be displayed.
 */
Synci18n.prototype.generateTranslations = function () {
  var allTagsFromTranslationFile = this.getTagMap();

  var uniformTagName;
  var msgsObj = this.getMsgsObject();
  var msgsFile;

    // The file has a different structure when used by the web author.
  if (this.webAuthorMode) {
    msgsFile = 'goog.provide("msgs"); //This file is generated by a gulp task.\nwindow.msgs=' + this.stringify(msgsObj) +
      ';window.supportedLanguages=' + JSON.stringify(this.supportedLanguages) + ';';
  } else {
    msgsFile = '(function(){var msgs=' + this.stringify(msgsObj) + ';sync.Translation.addTranslations(msgs);})();';
    // Must be surrounded by an IIFE with the rest of the plugin.
    // Will otherwise overwrite the global msgs.
    if (this.useLocalMsgs) {
      console.warn('Using local messages, make sure it is surrounded by IIFE properly!');
      msgsFile = 'var msgs=' + this.stringify(msgsObj) + ';';
    }
  }

  // Make parent directories if necessary.
  Synci18n.makeDirectory(path.resolve(path.dirname(this.destinationFile)));
  fs.writeFileSync(this.destinationFile, msgsFile, 'utf8');

  if (this.serverTags.length > 0) {
    this.extractedServerTags = [];

    this.serverTags.forEach(function (serverSideTag) {
      uniformTagName = this.getUniformTagName(serverSideTag);
      if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
        this.extractedServerTags.push(allTagsFromTranslationFile[uniformTagName]);
      } else {
        console.log('One server tag is used but cannot be found in the translation file, ', serverSideTag);
      }
    }, this);

    var translationXmlElements = '';
    for (var i = 0; i < this.extractedServerTags.length; i++) {
      var extractedServerTag = this.extractedServerTags[i];
      translationXmlElements += this.makeXmlEntry(extractedServerTag['$'].value, extractedServerTag, true);
    }

    var targetPath = path.resolve(path.dirname(this.translationXmlDestination));
    console.log('Creating folder', targetPath);
    Synci18n.makeDirectory(targetPath);
    fs.writeFileSync(this.translationXmlDestination, Synci18n.makeXmlWithTags(translationXmlElements, this.cleanTargetXml), 'utf8');

    this.checkTranslationStatus();
    this.checkQuotesServerSide(this.extractedServerTags);
  } else {
    console.log('Could not find server tags');
  }
};

/**
 * Wrap the list of tag elements to create a translation.xml file.
 * @param translationXmlElements {string} List of translation translationXmlElements xml elements.
 * @param showWarning {boolean|null} Whether to add a comment warning that the file is generated.
 * @returns {string} The translation.xml file contents.
 */
Synci18n.makeXmlWithTags = function (translationXmlElements, showWarning) {
  var generatedFileWarning = '';
  if (showWarning) {
    generatedFileWarning = '<!-- IMPORTANT: This file is generated and contains only the subset of messages used on the server-side. -->\n' +
      '<!-- You should not manually edit this file. -->\n';
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    generatedFileWarning +
    '<translation>\n' +
    '    <languageList>\n' +
    '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
    '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
    '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
    '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
    '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
    '    </languageList>\n' + translationXmlElements + '</translation>'
};

/**
 * Replace newlines and tabs with spaces. Editor does not show them but webapp does.
 * @param {string} message The translated message to be cleaned up.
 * @returns {string} The translated message, purged of newlines and tabs.
 */
Synci18n.prototype.removeNewlinesAndTabs = function (message) {
  if(message.indexOf('\n') !== -1) {
    message = message.replace(/\r?\n\|\r/g, '').replace(/\s\s+/g, ' ');
    //tagsWithNewlines++;
  }
  return message;
};

/**
 * Check if message has unescaped quotes and variables.
 * May be a problem on the server-side.
 * @param {string} message The message to check.
 * @return {boolean} Whether the message has unescaped quotes.
 */
Synci18n.prototype.checkMessageHasUnescapedQuotes = function (message) {
  var hasUnescapedQuotes = false;
  if (message.indexOf('}') !== -1) {
    // Check whether each quote in the message is followed by another quote.
    var indexOfQuote = message.indexOf("'");
    while (indexOfQuote !== -1 && !hasUnescapedQuotes) {
      hasUnescapedQuotes = (indexOfQuote < message.length - 1 && message[indexOfQuote + 1] !== "'");
      indexOfQuote = message.indexOf("'", indexOfQuote + 2);
    }
  }
  return hasUnescapedQuotes;
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
      if (this.checkMessageHasUnescapedQuotes(serverTag[langCode])) {
        console.error('*** The quote must be escaped in: ', serverTag[langCode]);
        console.error(Object.keys(serverTags));
        foundQuoteDanger = true;
      }
    }
    if (foundQuoteDanger) {
      tagsWithQuoteWarning++;
    }
  }
  if (tagsWithQuoteWarning > 0) {
    console.error('There are ' + tagsWithQuoteWarning + ' server-side tags which probably need to have quotes escaped.');
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
      console.error('[' + tagsType + ']' + ' Could not find ', directory);
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
 * Get the variables from a translation string.
 * Detects the following formats: ${EXAMPLE_VARIABLE} or {0} or {VARIABLE_NAME}
 *
 * @param message The translated message to check for variables
 *
 * @returns {?string[]} Array with variables or null.
 */
Synci18n.prototype.checkForVariables = function (message) {
  return message.match(/(\{\$([A-Z|a-z|\_]*)\}|\{[A-Z|a-z|\_|0-9]*\})+?/g);
};

/**
 * Show variable inconsistencies in the console.
 * @param tagFinalForm The tag to be checked.
 * @param tagName The name of the tag to check.
 */
Synci18n.prototype.alertIfVariableInconsistency = function (tagFinalForm, tagName) {
  var englishVariables = this.checkForVariables(tagFinalForm['en_US']);
  var variables = [];

  var numberOfVariableInconsistencies = {};
  var nameOfVariableInconsistencies = {};
  for (var i = 0; i < this.languages.length; i++) {
    var lang = this.languages[i];
    if (lang !== 'en_US') {
      if (tagFinalForm[lang]) {
        variables = this.checkForVariables(tagFinalForm[lang]);
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
    console.log('Variable number inconsistencies: ');
    for (var t in numberOfVariableInconsistencies) {
      console.log(t);
      numberOfVariableInconsistencies[t].forEach(function (languageAndNumber) {
        console.log('  ' + languageAndNumber);
      });
    }
    this.stats.numberOfVariableInconsistencies = numberOfVariableInconsistencies;
  }

  if (Object.keys(nameOfVariableInconsistencies).length > 0) {
    console.log('Variable name inconsistencies: ');
    for (var n in nameOfVariableInconsistencies) {
      nameOfVariableInconsistencies[n].forEach(function (languageAndName) {
        console.log('  ' + languageAndName);
      });
    }
    this.stats.nameOfVariableInconsistencies = nameOfVariableInconsistencies;
  }
};

Synci18n.prototype.checkTagsSkipped = function () {
  this.tags.forEach(function (tagObj) {
    if (tagObj['$'].hasOwnProperty('skipTranslation') && tagObj['$']['skipTranslation'] === 'true') {
      var msgsObjForTag = this.getMsgsObjectForTag(tagObj);
      var englishMsg = msgsObjForTag['en_US'];
      var foundTagSkipFail = false;
      for (var langCode in msgsObjForTag) {
        if (englishMsg !== msgsObjForTag[langCode]) {
          foundTagSkipFail = true;
        }
      }
      if (foundTagSkipFail) {
        this.tagSkipInconsistencies.push(englishMsg);
      }
    }
  }, this);
  if (this.tagSkipInconsistencies.length > 0) {
    console.error('Tags marked with skipTranslation should not be translated', this.tagSkipInconsistencies);
  }
};

/**
 * Check the status of the translation file.
 */
Synci18n.prototype.checkTranslationStatus = function () {
  this.checkTagsSkipped();

  if (this.tagsNotInXml.length > 0) {
    console.error('Could not find in translation file:', this.tagsNotInXml);
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
    return this.uniformTags.indexOf(this.getUniformTagName(tag)) !== -1;
  }.bind(this));
  if (tagExceptions.length > 0) {
    console.log('The following client-side tags will be added even if not used: ');
    console.log(tagExceptions);
  }
  return this.removeDuplicates(tagList.concat(tagExceptions));
};

module.exports = Synci18n;

/**
 * Anything other than boolean true or string 'true' will return false.
 * @param option The option to check.
 * @returns {boolean} The option value to set.
 */
Synci18n.prototype.getBooleanOption = function (option) {
  var optValue = false;
  if (typeof option === 'boolean') {
    optValue = option;
  } else {
    optValue = (option === 'true');
  }
  return optValue;
};
