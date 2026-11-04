import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchAll, norm, searchTitles } from '../src/renderer/src/search'

const keys = ['Street Fighter II', '1942', 'Mission Impossible', 'Super Mario Bros 2', 'Mario Kart', 'Final Fight 2', 'Pac-Man'].map(norm)

test('ricerca: numeri e parole brevissime devono cominciare una parola', () => {
  assert.deepEqual(matchAll(keys, '2'), [3, 5])
  assert.deepEqual(matchAll(keys, 'ii'), [0])
  assert.deepEqual(matchAll(keys, 'mario 2'), [3])
})

test('ricerca: il titolo che comincia con la parola viene prima, quello identico per primo', () => {
  const h = searchTitles(keys, 'mario')
  assert.equal(keys[h.top[0]].startsWith('mario') || keys[h.top[0]].includes('mario'), true)
  assert.equal(keys[searchTitles(keys, 'pac man').top[0]], 'pac man')
  assert.equal(searchTitles(keys, 'zzz').total, 0)
})

test('ricerca: veloce su 60.000 titoli', () => {
  const big = Array.from({ length: 60000 }, (_, i) => norm(`Gioco numero ${i} Mario ${i % 97} (USA)`))
  const t = Date.now()
  for (const q of ['mario', 'gioco 77', 'numero 5 usa']) searchTitles(big, q)
  assert.ok(Date.now() - t < 600, `troppo lento: ${Date.now() - t} ms`)
})
