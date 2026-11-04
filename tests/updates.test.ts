import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkForUpdate, isNewer } from '../src/main/updates'

const reply = (body: unknown, status = 200): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

test('confronto tra versioni', () => {
  assert.equal(isNewer('0.1.5', '0.1.4'), true)
  assert.equal(isNewer('v0.1.10', '0.1.9'), true) // 10 è più di 9
  assert.equal(isNewer('0.2.0', '0.1.99'), true)
  assert.equal(isNewer('0.1.4', '0.1.4'), false)
  assert.equal(isNewer('0.1.3', '0.1.4'), false)
  assert.equal(isNewer('1.0', '0.9.9'), true)
})

test('aggiornamento: solo se la release è più recente e vera', async () => {
  const rel = { tag_name: 'v0.1.5', html_url: 'https://github.com/VjAlbert/Mr.Emulator/releases/tag/v0.1.5' }
  assert.deepEqual(await checkForUpdate('0.1.4', reply(rel)), { version: '0.1.5', url: rel.html_url })
  assert.equal(await checkForUpdate('0.1.5', reply(rel)), null)
  assert.equal(await checkForUpdate('0.1.4', reply({ ...rel, draft: true })), null)
  assert.equal(await checkForUpdate('0.1.4', reply({ ...rel, prerelease: true })), null)
  assert.equal(await checkForUpdate('0.1.4', reply({}, 404)), null)
  assert.equal(await checkForUpdate('0.1.4', (async () => { throw new Error('offline') }) as unknown as typeof fetch), null)
  // un indirizzo che non è del progetto non si segue
  const strano = await checkForUpdate('0.1.4', reply({ tag_name: 'v9.9.9', html_url: 'https://sito-strano.example/scarica' }))
  assert.equal(strano?.url, 'https://github.com/VjAlbert/Mr.Emulator/releases/latest')
})
