// finto "electron" per i test: la cartella dati è indicata da MR_TEST_DATA
module.exports = { app: { getPath: () => process.env.MR_TEST_DATA || require('os').tmpdir() } }
