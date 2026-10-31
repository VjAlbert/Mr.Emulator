/**
 * Unico punto che conosce le differenze tra sistemi operativi.
 * Oggi il progetto punta solo a Windows; se un giorno servirà altro,
 * si tocca solo questo file.
 */
export const platform = {
  coreExt: '.dll',
  exeFilter: { name: 'Eseguibile', extensions: ['exe'] }
}
