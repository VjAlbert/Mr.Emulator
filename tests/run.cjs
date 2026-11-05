// Compila ed esegue i test (funziona uguale su Windows e Linux)
const { spawnSync } = require('child_process')
const { readdirSync } = require('fs')
const path = require('path')
// su Windows npx è un .cmd e ha bisogno della shell; node no: con la shell il percorso "C:\Program Files\nodejs\node.exe" verrebbe spezzato allo spazio
const run = (cmd, args, env = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npx', env: { ...process.env, ...env } })
if (run('npx', ['tsc', '-p', 'tsconfig.test.json']).status !== 0) process.exit(1)
const files = readdirSync('out-test/tests').filter((f) => f.endsWith('.test.js')).map((f) => path.join('out-test', 'tests', f))
process.exit(run(process.execPath, ['--require', path.resolve('tests', 'stubs', 'register.cjs'), '--test', ...files]).status ?? 1)
