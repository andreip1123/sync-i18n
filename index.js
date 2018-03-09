module.exports = {
  getLanguages: function () {
    return /*todo: get it from xml OR */ ['en_US', 'de_DE', 'fr_FR', 'ja_JP', 'nl_NL'];
  },

  doit: function (msg) {
    return 'did it ' + msg;
  },

  /**
   * Generate an entry for translation_webapp.xml from the translation objects added in translation.js.
   * All languages will have the english string, this is a new, untranslated tag.
   *
   * @param key The value for the key element.
   * @param trObj The translation object.
   * @returns {string} A string with the xml entry to be added to translation.xml
   */
  makeXmlEntry: function (key, trObj) {
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
  }
};
