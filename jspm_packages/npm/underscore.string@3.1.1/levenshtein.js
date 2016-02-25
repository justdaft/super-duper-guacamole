/* */ 
var makeString = require('./helper/makeString');
module.exports = function levenshtein(str1, str2) {
  'use strict';
  str1 = makeString(str1);
  str2 = makeString(str2);
  if (str1 === str2)
    return 0;
  if (!str1 || !str2)
    return Math.max(str1.length, str2.length);
  var prevRow = new Array(str2.length + 1);
  for (var i = 0; i < prevRow.length; ++i) {
    prevRow[i] = i;
  }
  for (i = 0; i < str1.length; ++i) {
    var nextCol = i + 1;
    for (var j = 0; j < str2.length; ++j) {
      var curCol = nextCol;
      nextCol = prevRow[j] + ((str1.charAt(i) === str2.charAt(j)) ? 0 : 1);
      var tmp = curCol + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      tmp = prevRow[j + 1] + 1;
      if (nextCol > tmp) {
        nextCol = tmp;
      }
      prevRow[j] = curCol;
    }
    prevRow[j] = nextCol;
  }
  return nextCol;
};
