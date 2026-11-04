/** Illustrazioni originali e stilizzate delle console (nessun logo): viewBox 0 0 320 230, contorno nero spesso, in stile fumetto */
const S = 'stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'
const SW = (n: number): string => S.replace('stroke-width="4"', `stroke-width="${n}"`)
const shine = (id: string): string => `<linearGradient id="sh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>`
const ov = (id: string, d: string): string => `<path d="${d}" fill="url(#sh${id})"/>`
const btn = (x: number, y: number, r: number, c: string): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${SW(3)}/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 3}" fill="#fff" opacity=".5"/>`
const dpad = (x: number, y: number, c = '#1a1a22'): string => `<path d="M${x - 5} ${y - 16}h10v11h11v10h-11v11h-10v-11h-11v-10h11z" fill="${c}" ${SW(3)}/>`

export const CONSOLES: Record<string, (c: string) => string> = {
  arcade: (c: string): string => `<svg viewBox="0 0 320 230">${shine('a')}
    <path d="M96 12H224L244 214H76Z" fill="#2b2b3c" ${S}/>
    <path d="M224 12L244 214H228L212 12Z" fill="${c}" opacity=".85"/>
    <rect x="94" y="12" width="132" height="32" rx="5" fill="${c}" ${S}/>
    <text x="160" y="36" text-anchor="middle" font-family="Anton" font-size="22" letter-spacing="4" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">ARCADE</text>
    <rect x="104" y="52" width="112" height="78" rx="8" fill="#0a0a12" ${S}/>
    <rect x="112" y="60" width="96" height="62" rx="5" fill="${c}" opacity=".9"/><rect x="112" y="60" width="96" height="62" rx="5" fill="url(#sha)"/>
    <path d="M118 112l14-28 10 16 12-24 14 36z" fill="#0a0a12" opacity=".55"/>
    <path d="M86 138H234L246 164H74Z" fill="#3a3a4e" ${S}/>
    <circle cx="124" cy="152" r="9" fill="#14141c" ${SW(3)}/><path d="M124 152L124 134" ${SW(5)}/>${btn(124, 131, 8, '#ff2d55')}
    ${btn(164, 152, 7, '#ffd400')}${btn(184, 148, 7, '#17c964')}${btn(204, 144, 7, '#00b4d8')}
    <rect x="96" y="172" width="128" height="34" rx="4" fill="#14141c" ${S}/><rect x="140" y="180" width="40" height="18" rx="2" fill="${c}" ${SW(3)}/>
    <text x="160" y="193" text-anchor="middle" font-family="Anton" font-size="11" fill="#000">COIN</text>
    <path d="M76 214H244" ${S}/></svg>`,

  nes: (c: string): string => `<svg viewBox="0 0 320 230">${shine('n')}
    <path d="M30 108L52 84H238L262 108V168H30Z" fill="#cfcfd6" ${S}/>${ov('n', 'M30 108L52 84H238L262 108V168H30Z')}
    <path d="M30 108H262" ${SW(3)}/>
    <rect x="62" y="116" width="150" height="38" rx="4" fill="#2c2c34" ${S}/><rect x="72" y="124" width="130" height="8" rx="2" fill="#0d0d12"/>
    <rect x="30" y="148" width="232" height="10" fill="${c}"/><path d="M30 148H262" ${SW(3)}/>
    <rect x="224" y="124" width="26" height="12" rx="2" fill="#1a1a22" ${SW(3)}/>
    <rect x="62" y="92" width="64" height="12" rx="2" fill="#a8a8b2" ${SW(3)}/>
    <g transform="translate(232 150) rotate(-8)"><rect x="-6" y="0" width="92" height="46" rx="6" fill="#cfcfd6" ${S}/>
      <rect x="2" y="7" width="76" height="32" rx="3" fill="#2c2c34"/>${dpad(22, 24, '#0d0d12')}
      <rect x="40" y="26" width="12" height="5" rx="2.5" fill="#cfcfd6"/><rect x="40" y="26" width="12" height="5" rx="2.5" fill="#cfcfd6"/>${btn(62, 28, 6, c)}${btn(75, 28, 6, c)}</g></svg>`,

  snes: (c: string): string => `<svg viewBox="0 0 320 230">${shine('s')}
    <path d="M26 116Q26 92 52 92H236Q262 92 262 116V160Q262 176 244 176H44Q26 176 26 160Z" fill="#c9c9d1" ${S}/>${ov('s', 'M26 116Q26 92 52 92H236Q262 92 262 116V160Q262 176 244 176H44Q26 176 26 160Z')}
    <rect x="96" y="74" width="92" height="26" rx="6" fill="#8e8e9a" ${S}/><rect x="112" y="60" width="62" height="22" rx="3" fill="#6d6d78" ${SW(3)}/>
    <rect x="46" y="112" width="40" height="14" rx="7" fill="#5b5b66" ${SW(3)}/><rect x="200" y="112" width="40" height="14" rx="7" fill="#5b5b66" ${SW(3)}/>
    <path d="M40 140H248" stroke="#8e8e9a" stroke-width="3"/><circle cx="62" cy="152" r="5" fill="${c}"/><circle cx="76" cy="152" r="5" fill="#17c964"/>
    <rect x="130" y="134" width="40" height="16" rx="3" fill="#2c2c34" ${SW(3)}/>
    <g transform="translate(206 150) rotate(-8)"><path d="M0 24Q0 4 22 4H70Q92 4 92 24Q92 46 70 46H22Q0 46 0 24Z" fill="#d6d6dd" ${S}/>
      ${dpad(20, 25)}${btn(76, 15, 5.5, '#ffd400')}${btn(66, 26, 5.5, '#17c964')}${btn(86, 26, 5.5, '#ff2d55')}${btn(76, 37, 5.5, '#2d7dff')}</g></svg>`,

  megadrive: (c: string): string => `<svg viewBox="0 0 320 230">${shine('m')}
    <path d="M24 120L44 92H246L266 120V166Q266 176 256 176H34Q24 176 24 166Z" fill="#26262e" ${S}/>${ov('m', 'M24 120L44 92H246L266 120V166Q266 176 256 176H34Q24 176 24 166Z')}
    <ellipse cx="146" cy="96" rx="66" ry="18" fill="#14141a" ${S}/><ellipse cx="146" cy="94" rx="50" ry="12" fill="#2f2f3a"/>
    <rect x="112" y="70" width="68" height="26" rx="4" fill="${c}" ${SW(3)}/><path d="M120 80H172" stroke="#fff" stroke-width="3" opacity=".7"/>
    <path d="M24 134H266" stroke="${c}" stroke-width="4"/><path d="M40 150H100" stroke="#3a3a46" stroke-width="3"/>
    <circle cx="228" cy="116" r="6" fill="#ff2d55" ${SW(3)}/><rect x="48" y="112" width="44" height="9" rx="4" fill="#4a4a58" ${SW(3)}/>
    <g transform="translate(200 154) rotate(-8)"><path d="M0 22Q0 6 18 6H78Q96 6 96 22Q96 40 78 40H62Q54 30 48 30Q42 30 34 40H18Q0 40 0 22Z" fill="#2c2c36" ${S}/>
      ${dpad(22, 23, '#101016')}${btn(62, 20, 5.5, '#c9c9d1')}${btn(75, 20, 5.5, '#c9c9d1')}${btn(88, 20, 5.5, '#c9c9d1')}</g></svg>`,

  psx: (c: string): string => `<svg viewBox="0 0 320 230">${shine('p')}
    <path d="M26 128L40 104H250L264 128V166Q264 176 254 176H36Q26 176 26 166Z" fill="#b9b9c2" ${S}/>${ov('p', 'M26 128L40 104H250L264 128V166Q264 176 254 176H36Q26 176 26 166Z')}
    <path d="M62 104L78 80H212L228 104Z" fill="#a4a4ae" ${S}/><circle cx="145" cy="92" r="14" fill="#5d5d68" ${S}/><circle cx="145" cy="92" r="5" fill="#2c2c34"/>
    <path d="M26 128H264" ${SW(3)}/>
    <rect x="50" y="140" width="50" height="14" rx="3" fill="#6d6d78" ${SW(3)}/><rect x="108" y="140" width="50" height="14" rx="3" fill="#6d6d78" ${SW(3)}/>
    <circle cx="230" cy="140" r="6" fill="${c}" ${SW(3)}/><circle cx="230" cy="158" r="6" fill="#2c2c34" ${SW(3)}/>
    <g transform="translate(206 146) rotate(-8)"><path d="M0 26Q0 6 20 6H78Q98 6 98 26L92 44Q88 50 78 40H20Q10 50 6 44Z" fill="#c4c4cc" ${S}/>
      ${dpad(22, 24, '#2c2c34')}<path d="M70 16l5 8h-10z" fill="#17c964"/><circle cx="84" cy="25" r="4" fill="none" stroke="#ff2d55" stroke-width="2.5"/><path d="M66 31l8 8m0-8l-8 8" stroke="#2d7dff" stroke-width="2.5"/><rect x="78" y="33" width="8" height="8" fill="none" stroke="#e86bd2" stroke-width="2.5"/></g></svg>`,

  gb: (c: string): string => `<svg viewBox="0 0 320 230">${shine('g')}
    <path d="M104 14Q104 8 112 8H208Q216 8 216 14V176Q216 186 206 206Q200 222 184 222H112Q104 222 104 214Z" fill="#c9c9cf" ${S}/>
    <path d="M104 14Q104 8 112 8H208Q216 8 216 14V176Q216 186 206 206Q200 222 184 222H112Q104 222 104 214Z" fill="url(#shg)"/>
    <rect x="116" y="22" width="88" height="66" rx="7" fill="#585868" ${S}/><rect x="130" y="34" width="60" height="44" rx="3" fill="#9bbc0f" ${SW(3)}/>
    <path d="M134 60l10-14 8 10 10-8 10 16z" fill="#4c6a08" opacity=".7"/>
    ${dpad(138, 132, '#2c2c34')}${btn(188, 124, 9, c)}${btn(168, 140, 9, c)}
    <rect x="132" y="172" width="22" height="8" rx="4" fill="#8e8e9a" ${SW(3)} transform="rotate(-20 143 176)"/><rect x="160" y="172" width="22" height="8" rx="4" fill="#8e8e9a" ${SW(3)} transform="rotate(-20 171 176)"/>
    <path d="M178 192l16-18M188 198l16-18M198 204l14-16" stroke="#6d6d78" stroke-width="4"/></svg>`
}

/** Quale illustrazione usare per ogni sistema (dove non c'è, si usa il simbolo della categoria) */
export const SVG_FOR: Record<string, string> = {
  arcade: 'arcade',
  mame: 'arcade',
  neogeo: 'arcade',
  nes: 'nes',
  snes: 'snes',
  megadrive: 'megadrive',
  psx: 'psx',
  gb: 'gb',
  gbc: 'gb'
}
