/* */ 
(function(Buffer) {
  'use strict';
  var through = require('through2');
  var escodegen = require('escodegen');
  var acorn = require('acorn');
  function uniffe(contents) {
    var comments = [];
    var tokens = [];
    var ast = acorn.parse(contents, {
      ranges: true,
      onComment: comments,
      onToken: tokens
    });
    escodegen.attachComments(ast, comments, tokens);
    if (ast.body[0].expression === undefined || ast.body[0].expression.callee === undefined) {
      return contents;
    }
    var rootProgram = ast.body[0].expression.callee.body;
    rootProgram.type = 'Program';
    rootProgram.body = rootProgram.body.slice(1);
    rootProgram.leadingComments = ast.body[0].leadingComments;
    return escodegen.generate(rootProgram, {comment: true});
  }
  module.exports = function() {
    return through.obj(function(file, enc, cb) {
      if (file.isBuffer()) {
        file.contents = new Buffer(uniffe(file.contents.toString(enc)), enc);
      }
      cb(null, file);
    });
  };
})(require('buffer').Buffer);
