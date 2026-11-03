// Nei test "electron" è sostituito da un finto modulo e l'alias @shared punta ai file compilati
const Module = require('module')
const path = require('path')
const stub = path.join(__dirname, 'electron', 'index.js')
const shared = path.resolve(__dirname, '..', '..', 'out-test', 'src', 'shared')
const orig = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request === 'electron') return stub
  if (request.startsWith('@shared/')) return orig.call(this, path.join(shared, request.slice(8)), ...rest)
  return orig.call(this, request, ...rest)
}
