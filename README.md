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
syncI18n.generateTranslations();
```

Best practices
====
In order to differentiate tags at a quick glance, use:
- Client-side tag format: CLIENT_SIDE_TAG_
- Server-side tag format: Server_side_tag

These are some rules to make sure the translation process will go as smooth as possible:

Default input file:
- plugin_root/i18n/translation.xml is the default source file for getting all translations.

Default output files:
- plugin_root/target/i18n/translation.xml (server-side)
- plugin_root/web/0translations.js (client-side)
