const fs = require('fs');
const path = require('path');

/**
 * Get the source files from the options.
 * If not properly defined, go to fallbacks and show warnings.
 * @param {string} rootDir The root directory.
 * @param {Array<string>} sourceFilesFromOptions The list of source files from the options object, if any.
 * @returns {Array<string>} The list of source files.
 */
function getSourceFiles (rootDir, sourceFilesFromOptions) {
  let validSourceFiles = [];
  let defaultSourceFile = rootDir + '/i18n/translation.xml';
  let defaultSourceFileExists = fs.existsSync(defaultSourceFile);

  if (sourceFilesFromOptions.length) {
    validSourceFiles = sourceFilesFromOptions.filter(function(fileToCheck){
      let fileExists = fs.existsSync(fileToCheck);
      if (!fileExists) {
        console.warn('Warning: Source file does not exist: ' + fileToCheck);
      }
      return fileExists;
    });
    if (!validSourceFiles.length) {
      if (defaultSourceFileExists) {
        console.error('None of the source files could be found, will try to use default file: ' + defaultSourceFile);
        validSourceFiles.push(defaultSourceFile);
      } else {
        console.error('None of the source files could be found, neither the default file: ' + defaultSourceFile);
      }
    }
  } else {
    if (defaultSourceFileExists) {
      console.log('Using default file: ', defaultSourceFile);
      validSourceFiles.push(defaultSourceFile);
    } else {
      console.error('Default translation file could not be found: ' + defaultSourceFile);
    }
  }
  return validSourceFiles;
}

/**
 * Create directories to fill out a path.
 * Stops if it goes up 3 levels and does not reach an existing directory.
 * @param targetPath The directory path to be created.
 */
function makeDirectory (targetPath) {
  if (!fs.existsSync(targetPath)) {
    let poppedSegments = [];
    let sanityPath = targetPath;
    let counter = 0;
    while (!fs.existsSync(sanityPath) && counter < 3) {
      sanityPath = sanityPath.split(path.sep);
      poppedSegments.unshift(sanityPath.pop());
      sanityPath = sanityPath.join(path.sep);
      counter++;
      if (counter >= 3) {
        console.log('Went up 3 parents to find a starting point, giving up.');
      }
    }
    for (let i = 0; i < poppedSegments.length; i++) {
      sanityPath += path.sep + poppedSegments[i];
      fs.mkdirSync(sanityPath);
    }
  }
}

module.exports = {
  getSourceFiles,
  makeDirectory
};