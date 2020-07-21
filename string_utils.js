/**
 * Check if message has unescaped quotes and variables.
 * May be a problem on the server-side.
 * @param {string} message The message to check.
 * @return {boolean} Whether the message has unescaped quotes.
 */
function checkMessageHasUnescapedQuotes (message) {
  let hasUnescapedQuotes = false;
  if (message.indexOf('}') !== -1) {
    // Check whether each quote in the message is followed by another quote.
    let indexOfQuote = message.indexOf("'");
    while (indexOfQuote !== -1 && !hasUnescapedQuotes) {
      hasUnescapedQuotes = (indexOfQuote < message.length - 1 && message[indexOfQuote + 1] !== "'");
      indexOfQuote = message.indexOf("'", indexOfQuote + 2);
    }
  }
  return hasUnescapedQuotes;
}

module.exports = {
  checkMessageHasUnescapedQuotes
};