/**
 * Get the uniform tag name - lowercase and without trailing underline.
 * @param {string} tagName The tag name to be processed.
 * @return {string} The uniform tag name.
 */
function getUniformTagName(tagName) {
  var uniformTagName = tagName.toLowerCase();
  if (uniformTagName[uniformTagName.length - 1] === '_') {
    uniformTagName = uniformTagName.slice(0, -1);
  }
  return uniformTagName;
}

/**
 * Wrap the list of tag elements to create a translation.xml file.
 * @param translationXmlElements {string} List of translation translationXmlElements xml elements.
 * @param showWarning {boolean|null} Whether to add a comment warning that the file is generated.
 * @returns {string} The translation.xml file contents.
 */
function makeXmlWithTags (translationXmlElements, showWarning) {
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
}

/**
 * Get the string for the tag object.
 * JSON stringify properties are always surrounded with quotes. This cuts as many quotes as it can.
 * @param {object} obj The object to custom stringify.
 * @return {string} The tag js object, "minified".
 */
function stringify (obj) {
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
}

/**
 * Get the variables from a translation string.
 * Detects the following formats: ${EXAMPLE_VARIABLE} or {0} or {VARIABLE_NAME}
 *
 * @param message The translated message to check for variables
 *
 * @returns {?string[]} Array with variables or null.
 */
function checkForVariables (message) {
  return message.match(/(\{\$([A-Z|a-z|\_]*)\}|\{[A-Z|a-z|\_|0-9]*\})+?/g);
}

module.exports = {
  getUniformTagName,
  makeXmlWithTags,
  stringify,
  checkForVariables
};
