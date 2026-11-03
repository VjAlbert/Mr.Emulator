/** BIOS richiesti dai sistemi: il programma non li scarica né li distribuisce, dice solo quali servono e dove metterli */
export interface BiosRule {
  systemId: string
  name: string
  /** Basta uno di questi file */
  anyOf: string[]
  /** Dove metterli, a partire dalla cartella BIOS */
  where: string
  note: string
}

export const BIOS_RULES: BiosRule[] = [
  { systemId: 'neogeo', name: 'Neo Geo', anyOf: ['neogeo.zip'], where: 'bios\\fbneo', note: 'Un solo file, necessario per quasi tutti i giochi Neo Geo.' },
  { systemId: 'psx', name: 'PlayStation', anyOf: ['scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'scph1001.bin', 'scph7001.bin'], where: 'bios', note: 'Ne basta uno: 5501 (USA), 5500 (Giappone), 5502 (Europa).' },
  { systemId: 'dreamcast', name: 'Dreamcast', anyOf: ['dc_boot.bin'], where: 'bios\\dc', note: 'Insieme a dc_flash.bin.' },
  { systemId: 'naomi', name: 'Sega Naomi', anyOf: ['naomi.zip'], where: 'bios\\dc', note: 'Con il nome del set MAME.' },
  { systemId: 'atomiswave', name: 'Atomiswave', anyOf: ['awbios.zip'], where: 'bios\\dc', note: 'Con il nome del set MAME.' },
  { systemId: 'fds', name: 'Famicom Disk System', anyOf: ['disksys.rom'], where: 'bios', note: 'Serve per i giochi su disco.' }
]
