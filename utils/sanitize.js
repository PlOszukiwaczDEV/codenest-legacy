const sanitizeHtml = require('sanitize-html');

function sanitize(input) {
  if (typeof input !== 'string') return input;
  
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape'
  });
}

module.exports = { sanitize }; 