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
```
var syncI18n = require('sync-i18n')(optionsObj);
syncI18n.generateTranslations();
```

Available options:

- **sourceFiles**: array of paths to translation.xml source files files. Defaults to `plugin_root/i18n/translation.xml`.

- **jsSourcesLocation**: path to folder containing .js/.html files to detect client-side tags. Defaults to `plugin_root/web`.

- **javaSourcesLocation**: path to folder containing .java files to detect server-side tags. Defaults to `plugin_root/src`.

- **translationXmlDestination**: path where the translation.xml will be written. This file will contain only the server-side tags used in the plugin (a subset of tags from the source files). Defaults to `plugin_root/target/i18n/translation.xml`.

- **destinationFile**: path where the file containing client-side tags will be written. This file will contain only the client-side tags used in the plugin (a subset of tags from the source files). Defaults to `plugin_root/web/0translations.js`. This file should be the first one when concatenating the plugin JavaScript files so that the tags are loaded before they are used.


Best practices
====
These are some rules to make sure the translation process will go as smooth as possible.

Tag naming - in order to differentiate tags at a quick glance, use:

- Client-side tag format: `CLIENT_SIDE_TAG_`
- Server-side tag format: `Server_side_tag`


Usage of tags:

- client-side tags will be detected if they are used as: `tr(msgs.SOME_TAG_ ...` or `trDom(msgs.SOME_TAG_ ...`
- server-side tags will be detected if they are used as: `rb.getMessage(TranslationTags.SOME_SERVER_TAG...`.