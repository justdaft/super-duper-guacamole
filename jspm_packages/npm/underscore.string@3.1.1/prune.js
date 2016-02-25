/* */ 
var makeString = require('./helper/makeString');
var rtrim = require('./rtrim');
module.exports = function prune(str, length, pruneStr) {
  str = makeString(str);
  length = ~~length;
  pruneStr = pruneStr != null ? String(pruneStr) : '...';
  if (str.length <= length)
    return str;
  var tmpl = function(c) {
    return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' ';
  },
      template = str.slice(0, length + 1).replace(/.(?=\W*\w*$)/g, tmpl);
  if (template.slice(template.length - 2).match(/\w\w/))
    template = template.replace(/\s*\S+$/, '');
  else
    template = rtrim(template.slice(0, template.length - 1));
  return (template + pruneStr).length > str.length ? str : str.slice(0, template.length) + pruneStr;
};
