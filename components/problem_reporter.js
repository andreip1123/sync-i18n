let ProblemReporter = function () {
  this.tagsNotInXml = [];
  this.tagSkipInconsistencies = [];
};

ProblemReporter.prototype.addTagNotInXml = function (tag) {
  this.tagsNotInXml.push(tag);
};

ProblemReporter.prototype.addTagSkipInconsistency = function (tag) {
  this.tagSkipInconsistencies.push(tag);
};

ProblemReporter.prototype.report = function () {
  if (this.tagsNotInXml.length > 0) {
    console.error('ERROR: Tag used but was not found in translation file:', this.tagsNotInXml);
  }

  if (this.tagSkipInconsistencies.length > 0) {
    console.error('ERROR: Tags marked with skipTranslation should not be translated', this.tagSkipInconsistencies);
  }
};

module.exports = ProblemReporter;