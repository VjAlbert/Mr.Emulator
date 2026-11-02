// Nei test "electron" è sostituito da un finto modulo (niente finestre, niente Electron vero)
const Module = require('module')
const stub = require('path').join(__dirname, 'electron', 'index.js')
const orig = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  return request === 'electron' ? stub : orig.call(this, request, ...rest)
}
