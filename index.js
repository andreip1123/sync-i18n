const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');

function Synci18n(options) {

  // User does not have to write 'new'
  if (!(this instanceof Synci18n)) {
    return new Synci18n(options);
  }

  options = options || {};

  this.tags = [];
  this.languages = [];

  this.unusedTags = [];

  this.rootDir = options.rootDir || '.';
  this.sourceFiles = this.getSourceFiles(options);
  this.destinationFile = options.destinationFile || this.rootDir + '/web/0translations.js'; //todo: test if parameter is folder path.
  this.translationXmlDestination = options.translationXmlDestination || this.rootDir + '/target/i18n/translation.xml';
  this.jsSourcesLocation = options.jsSourcesLocation || this.rootDir + '/web';
  this.javaSourcesLocation = options.javaSourcesLocation || this.rootDir + '/src';

  this.keepNewlinesAndTabs = options.keepNewLinesAndTabs;
  this.cleanTargetXml = options.cleanTargetXml || true;

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
  var tagMap = this.getTagMap();
  var unusedTags = [];

  var uniformizedClientTags = this.clientTags ? this.clientTags.map(this.getUniformTagName) : [];
  var uniformizedServerTags = this.serverTags ? this.serverTags.map(this.getUniformTagName) : [];

  for (var tag in tagMap) {
    if (tagMap.hasOwnProperty(tag)) {
      if (uniformizedClientTags.indexOf(tag) === -1 && uniformizedServerTags.indexOf(tag) === -1) {
        unusedTags.push(tag);
      }
    }
  }
  if (unusedTags.length > 0) {
    console.log('WARNING: ' + unusedTags.length + ' unused tags:');
    console.log(unusedTags);
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
  var msgsFile = '(function(){var msgs=' + this.stringify(msgsObj) + ';sync.Translation.addTranslations(msgs);})();';
  fs.writeFileSync(this.destinationFile, msgsFile, 'utf8');

  if (this.serverTags && this.serverTags.length > 0) {
    var extractedServerTags = [];

    this.serverTags.forEach(function (serverSideTag) {
      uniformTagName = this.getUniformTagName(serverSideTag);
      if (allTagsFromTranslationFile.hasOwnProperty(uniformTagName)) {
        extractedServerTags.push(allTagsFromTranslationFile[uniformTagName]);
      } else {
        console.log('One server tag is used but cannot be found in the translation file, ', serverSideTag);
      }
    }, this);

    var translationXML = '';
    for (var i = 0; i < extractedServerTags.length; i++) {
      var extractedServerTag = extractedServerTags[i];
      translationXML += this.makeXmlEntry(extractedServerTag['$'].value, extractedServerTag, true);
    }

    var targetPath = path.resolve(path.dirname(this.translationXmlDestination));
    console.log('Creating folder', targetPath);
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

    var generatedFileWarning = '';
    if (!this.cleanTargetXml) {
      generatedFileWarning = '<!-- IMPORTANT: This file is generated and contains only the subset of messages used on the server-side. -->\n' +
        '<!-- You should not manually edit this file. -->\n';
    }

    fs.writeFileSync(this.translationXmlDestination, '<?xml version="1.0" encoding="UTF-8"?>\n' +
      generatedFileWarning +
      '<translation>\n' +
      '    <languageList>\n' +
      '        <language description="English" lang="en_US" localeDescription="English"/>\n' +
      '        <language description="German" lang="de_DE" localeDescription="Deutsch"/>\n' +
      '        <language description="French" lang="fr_FR" localeDescription="Français"/>\n' +
      '        <language description="Japanese" lang="ja_JP" localeDescription="日本語"/>\n' +
      '        <language description="Dutch" lang="nl_NL" localeDescription="Nederlands"/>\n' +
      '    </languageList>\n' + translationXML + '</translation>', 'utf8');
  } else {
    console.log('Could not find server tags');
  }
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
 * Load the tags used client-side and server-side.
 */
Synci18n.prototype.extractTags = function () {
  this.clientTags = this.extractTagsInternal('client');
  this.serverTags = this.extractTagsInternal('server');
  this.checkForUnusedTags();
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
    regex = /(?:tr|trDom)\(msgs\.[A-Za-z|\_|\.]+/g;
    regexTrim = 'tr(msgs.';
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
        // TODO: use something more powerful to set up exclude paths.
        var filename = path.basename(filenames[i], path.extname(filenames[i]));
        if (path.extname(filenames[i]) === fileExt && filename.indexOf('test_') === -1) {
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
      if (tagsType === 'server') {
        tagsFromFile[i] = tagsFromFile[i].replace(regexTrim, '');
      } else {
        tagsFromFile[i] = tagsFromFile[i].substring(tagsFromFile[i].indexOf('(') + 1);
        tagsFromFile[i] = tagsFromFile[i].replace('msgs.', '');
      }
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
