# sync-i18n
This module is intended to help add translations to Oxygenxml Web Author plugins.
Create the translation xml file and use this module to generate the minified JavaScript file which will add the translations to your plugin.

Installation
============

Install using [npm](http://npmjs.org),
`npm install sync-i18n`


Usage
=====
For generating the plugin translation file, you only need to set the path to the source translation xml.
```javascript
var syncI18n = require('sync-i18n')({
    sourceFile: '...',              // defaults to the i18n folder
    destinationFolder: '...'        // defaults to the web folder
});
syncI18n.makePluginTranslation();
```