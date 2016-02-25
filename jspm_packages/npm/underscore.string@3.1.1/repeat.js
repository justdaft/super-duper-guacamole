/* */ 
var makeString = require('./helper/makeString');
var strRepeat = require('./helper/strRepeat');
module.exports = function repeat(str, qty, separator) {
  str = makeString(str);
  qty = ~~qty;
  if (separator == null)
    return strRepeat(str, qty);
  for (var repeat = []; qty > 0; repeat[--qty] = str) {}
  return repeat.join(separator);
};
