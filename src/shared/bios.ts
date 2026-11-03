/** BIOS richiesti dai sistemi: il programma non li scarica né li distribuisce, dice solo quali servono e dove metterli */
export interface BiosRule {
  systemId: string
  name: string
  /** Basta uno di questi file */
  anyOf: string[]
  /** Dove metterli, a partire dalla cartella BIOS */
  where: string
  note: string
  /** MD5 noti dei file (nome file -> elenco). Se manca, il file si accetta senza controllo del contenuto */
  md5?: Record<string, string[]>
}

export const BIOS_RULES: BiosRule[] = [
  { systemId: 'neogeo', name: 'Neo Geo', anyOf: ['neogeo.zip'], where: 'bios\\fbneo', note: 'Un solo file, necessario per quasi tutti i giochi Neo Geo.' },
  { systemId: 'psx', name: 'PlayStation', anyOf: ['scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'scph1001.bin', 'scph7001.bin'], where: 'bios', note: 'Ne basta uno: 5501 (USA), 5500 (Giappone), 5502 (Europa).', md5: { 'scph5501.bin': ['490f666e1afb15b7362b406ed1cea246'], 'scph5500.bin': ['8dd7d5296a650fac7319bce665a6a53c'], 'scph5502.bin': ['32736f17079d0b2b7024407c39bd3050'] } },
  { systemId: 'dreamcast', name: 'Dreamcast', anyOf: ['dc_boot.bin'], where: 'bios\\dc', note: 'Insieme a dc_flash.bin.', md5: { 'dc_boot.bin': ['e10c53c2f8b90bab96ead2d368858623'] } },
  { systemId: 'naomi', name: 'Sega Naomi', anyOf: ['naomi.zip'], where: 'bios\\dc', note: 'Con il nome del set MAME.' },
  { systemId: 'atomiswave', name: 'Atomiswave', anyOf: ['awbios.zip'], where: 'bios\\dc', note: 'Con il nome del set MAME.' },
  { systemId: '3do', name: '3DO', anyOf: ['panafz10.bin', 'panafz1.bin', 'goldstar.bin'], where: 'bios', note: 'Ne basta uno (il più comune è panafz10.bin).' },
  { systemId: 'fds', name: 'Famicom Disk System', anyOf: ['disksys.rom'], where: 'bios', note: 'Serve per i giochi su disco.', md5: { 'disksys.rom': ['ca30b50f880eb660a320674ed365ef7a'] } }
]
