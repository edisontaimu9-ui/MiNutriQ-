/**
 * regionalFCT.js — Oasis Regional Food Composition Database
 * ─────────────────────────────────────────────────────────────────────────
 * Curated food composition data from neighbouring countries:
 *   TZ — Tanzania   (FAO/INFOODS EAF 2012; TFCT 2008)
 *   ZM — Zambia     (ZAMFOODS 2019; FAO/INFOODS Southern African FCT)
 *   MZ — Mozambique (TACSA; FAO WCPFC; peer-reviewed literature)
 *   ZW — Zimbabwe   (ZFCT 2018; FAO/INFOODS)
 *   ZA — South Africa (SAFOODS 2010; MRC/NICUS Wolmarans et al.)
 *
 * All values are expressed PER 100 g edible portion unless noted.
 * Micronutrients: iron (mg), zinc (mg), vitA (µg RAE), calcium (mg).
 * measures[] follow the same shape as MALAWI_FCT for drop-in compatibility.
 *
 * Export (global, compatible with PWA/single-file hosting):
 *   REGIONAL_FCT  — Array of food objects
 *   REGIONAL_SYNONYM_MAP — Extra synonyms for foodSearch.js SYNONYM_MAP
 *
 * Sources
 *   EAF  — FAO/INFOODS East African Food Composition Table, 2012
 *   TFCT — Tanzania Food Composition Tables, 2008
 *   ZAMF — ZAMFOODS, Zambia Food Composition Table, 2019
 *   SAFC — FAO/INFOODS Southern African Food Composition Table, 2012
 *   ZFCT — Zimbabwe Food Composition Tables, FAO/INFOODS, 2018
 *   SAFD — SAFOODS, MRC/NICUS, Wolmarans et al. (2010)
 *   PEER — Peer-reviewed literature (individual studies cited inline)
 *
 * Author  : Edison Taimu / Oasis CNST
 * Version : 1.0.0
 * ─────────────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════════════
// HELPER — build a per-100g measures array from common portion sizes
// ══════════════════════════════════════════════════════════════════════════
function _buildMeasures(kcal100, pro100, cho100, fat100, portions) {
  return portions.map(([lbl, g]) => {
    const f = g / 100;
    return {
      lbl,
      kcal: +(kcal100 * f).toFixed(1),
      pro:  +(pro100  * f).toFixed(2),
      cho:  +(cho100  * f).toFixed(2),
      fat:  +(fat100  * f).toFixed(2),
      kj:   +(kcal100 * f * 4.184).toFixed(0),
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════
// REGIONAL FOOD COMPOSITION TABLE
// ══════════════════════════════════════════════════════════════════════════
const REGIONAL_FCT = [

  // ────────────────────────────────────────────────────────────────────────
  // TANZANIA (TZ)  ·  Sources: EAF 2012; TFCT 2008
  // ────────────────────────────────────────────────────────────────────────

  {
    id: 'tz_ugali', country: 'TZ', source: 'EAF 2012 / TFCT 2008',
    cat: 'Staples', name: 'Ugali (maize meal, cooked) [TZ]',
    altNames: ['Sima', 'Ugali wa unga wa mahindi'],
    kcal: 92,  kj: 385,  pro: 2.3,  cho: 20.4, fat: 0.2,
    iron: 0.2, zinc: 0.2, vitA: 0,  calcium: 4,  fiber: 0.5, sodium: 2,
    measures: _buildMeasures(92, 2.3, 20.4, 0.2, [
      ['1 cup / serving (240 g)', 240],
      ['½ cup (120 g)',            120],
      ['Large plate (~350 g)',     350],
    ]),
  },
  {
    id: 'tz_uji', country: 'TZ', source: 'TFCT 2008',
    cat: 'Staples', name: 'Uji (thin maize porridge) [TZ]',
    altNames: ['Uji wa mahindi', 'Togwa'],
    kcal: 43,  kj: 180,  pro: 1.1,  cho: 9.5,  fat: 0.3,
    iron: 0.1, zinc: 0.1, vitA: 0,  calcium: 3,  fiber: 0.3, sodium: 1,
    measures: _buildMeasures(43, 1.1, 9.5, 0.3, [
      ['1 cup (240 g)',   240],
      ['1 bowl (300 g)',  300],
      ['½ cup (120 g)',   120],
    ]),
  },
  {
    id: 'tz_maharagwe', country: 'TZ', source: 'EAF 2012',
    cat: 'Legumes', name: 'Maharagwe (kidney beans, cooked) [TZ]',
    altNames: ['Red kidney beans', 'Beans TZ'],
    kcal: 127, kj: 531,  pro: 8.9,  cho: 23.0, fat: 0.5,
    iron: 2.2, zinc: 1.0, vitA: 0,  calcium: 46, fiber: 6.4, sodium: 2,
    measures: _buildMeasures(127, 8.9, 23.0, 0.5, [
      ['1 cup (177 g)',            177],
      ['½ cup (89 g)',              89],
      ['1 plate relish (120 g)',   120],
    ]),
  },
  {
    id: 'tz_mchicha', country: 'TZ', source: 'EAF 2012',
    cat: 'Vegetables', name: 'Mchicha (amaranth leaves, raw) [TZ]',
    altNames: ['Terere', 'Spinach TZ'],
    kcal: 36,  kj: 151,  pro: 3.5,  cho: 6.5,  fat: 0.3,
    iron: 3.9, zinc: 0.9, vitA: 367, calcium: 215, fiber: 2.5, sodium: 20,
    measures: _buildMeasures(36, 3.5, 6.5, 0.3, [
      ['1 cup raw (30 g)',   30],
      ['½ cup raw (15 g)',   15],
      ['1 tbsp (5 g)',        5],
    ]),
  },
  {
    id: 'tz_dagaa', country: 'TZ', source: 'EAF 2012',
    cat: 'Protein Foods', name: 'Dagaa / Omena (dried lake sardines) [TZ]',
    altNames: ['Dagaa', 'Sangara ndogo', 'Silver cyprinid'],
    kcal: 290, kj: 1213, pro: 55.0, cho: 0.0,  fat: 7.0,
    iron: 14.0, zinc: 3.5, vitA: 60, calcium: 1200, fiber: 0, sodium: 420,
    measures: _buildMeasures(290, 55.0, 0.0, 7.0, [
      ['1 tablespoon dry (10 g)',  10],
      ['2 tablespoons (20 g)',     20],
      ['½ cup (40 g)',             40],
      ['1 cup (80 g)',             80],
    ]),
  },
  {
    id: 'tz_nyama_ng_ombe', country: 'TZ', source: 'EAF 2012',
    cat: 'Protein Foods', name: 'Nyama ya ng\'ombe (beef, raw) [TZ]',
    altNames: ['Beef Tanzania', 'Nyama'],
    kcal: 187, kj: 782,  pro: 20.0, cho: 0.0,  fat: 12.0,
    iron: 2.4, zinc: 5.1, vitA: 0,  calcium: 10, fiber: 0, sodium: 65,
    measures: _buildMeasures(187, 20.0, 0.0, 12.0, [
      ['1 medium piece (80 g)',   80],
      ['1 palm-sized (100 g)',   100],
      ['½ cup cooked (70 g)',     70],
    ]),
  },
  {
    id: 'tz_muhogo', country: 'TZ', source: 'EAF 2012',
    cat: 'Staples', name: 'Muhogo (cassava, boiled) [TZ]',
    altNames: ['Mhogo', 'Cassava Tanzania'],
    kcal: 135, kj: 565,  pro: 1.0,  cho: 32.4, fat: 0.2,
    iron: 0.3, zinc: 0.3, vitA: 1,  calcium: 16, fiber: 1.8, sodium: 10,
    measures: _buildMeasures(135, 1.0, 32.4, 0.2, [
      ['1 piece (100 g)',          100],
      ['1 cup chunks (200 g)',     200],
      ['½ cup (100 g)',            100],
    ]),
  },
  {
    id: 'tz_ndizi', country: 'TZ', source: 'EAF 2012',
    cat: 'Fruits', name: 'Ndizi (banana, ripe) [TZ]',
    altNames: ['Banana Tanzania', 'Ndizi mbivu'],
    kcal: 89,  kj: 372,  pro: 1.1,  cho: 23.0, fat: 0.3,
    iron: 0.4, zinc: 0.2, vitA: 3,  calcium: 5,  fiber: 2.6, sodium: 1,
    measures: _buildMeasures(89, 1.1, 23.0, 0.3, [
      ['1 medium banana (118 g)', 118],
      ['1 small banana (81 g)',    81],
      ['1 large banana (136 g)',  136],
    ]),
  },
  {
    id: 'tz_maharage_ya_kuku', country: 'TZ', source: 'EAF 2012',
    cat: 'Protein Foods', name: 'Kuku (chicken, cooked, no skin) [TZ]',
    altNames: ['Chicken Tanzania', 'Nyama ya kuku'],
    kcal: 165, kj: 690,  pro: 31.0, cho: 0.0,  fat: 3.6,
    iron: 1.0, zinc: 2.7, vitA: 15, calcium: 15, fiber: 0, sodium: 70,
    measures: _buildMeasures(165, 31.0, 0.0, 3.6, [
      ['1 thigh/piece (90 g)',    90],
      ['1 breast half (120 g)', 120],
      ['½ cup shredded (70 g)',   70],
    ]),
  },
  {
    id: 'tz_vitunguu', country: 'TZ', source: 'EAF 2012',
    cat: 'Vegetables', name: 'Vitunguu (onions, raw) [TZ]',
    altNames: ['Onion Tanzania'],
    kcal: 40,  kj: 167,  pro: 1.1,  cho: 9.3,  fat: 0.1,
    iron: 0.2, zinc: 0.2, vitA: 0,  calcium: 23, fiber: 1.7, sodium: 4,
    measures: _buildMeasures(40, 1.1, 9.3, 0.1, [
      ['1 medium onion (110 g)', 110],
      ['½ medium (55 g)',         55],
      ['1 tbsp chopped (10 g)',   10],
    ]),
  },
  {
    id: 'tz_pilipili', country: 'TZ', source: 'EAF 2012',
    cat: 'Vegetables', name: 'Pilipili hoho (sweet pepper, raw) [TZ]',
    altNames: ['Sweet pepper Tanzania', 'Bell pepper'],
    kcal: 20,  kj: 84,   pro: 0.9,  cho: 4.6,  fat: 0.2,
    iron: 0.4, zinc: 0.1, vitA: 26, calcium: 10, fiber: 1.7, sodium: 2,
    measures: _buildMeasures(20, 0.9, 4.6, 0.2, [
      ['1 medium pepper (119 g)', 119],
      ['½ pepper (60 g)',          60],
      ['1 tbsp chopped (10 g)',    10],
    ]),
  },
  {
    id: 'tz_maharage_soya', country: 'TZ', source: 'EAF 2012',
    cat: 'Legumes', name: 'Karanga ya soya (soybeans, boiled) [TZ]',
    altNames: ['Soy beans Tanzania', 'Soya'],
    kcal: 173, kj: 724,  pro: 16.6, cho: 9.9,  fat: 9.0,
    iron: 2.5, zinc: 1.2, vitA: 1,  calcium: 102, fiber: 6.0, sodium: 1,
    measures: _buildMeasures(173, 16.6, 9.9, 9.0, [
      ['½ cup (86 g)',     86],
      ['1 cup (172 g)',   172],
    ]),
  },

  // ────────────────────────────────────────────────────────────────────────
  // ZAMBIA (ZM)  ·  Sources: ZAMFOODS 2019; SAFC 2012
  // ────────────────────────────────────────────────────────────────────────

  {
    id: 'zm_nshima', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Staples', name: 'Nshima (maize meal, cooked) [ZM]',
    altNames: ['Shima', 'Ubwali'],
    kcal: 93,  kj: 389,  pro: 2.2,  cho: 21.0, fat: 0.2,
    iron: 0.3, zinc: 0.2, vitA: 0,  calcium: 5,  fiber: 0.5, sodium: 2,
    measures: _buildMeasures(93, 2.2, 21.0, 0.2, [
      ['1 cup / serving (240 g)', 240],
      ['½ cup (120 g)',            120],
      ['Large plate (~350 g)',     350],
    ]),
  },
  {
    id: 'zm_ifisashi', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Vegetables', name: 'Ifisashi (groundnut and leaf relish) [ZM]',
    altNames: ['Peanut greens stew', 'Zambian leaf relish'],
    kcal: 124, kj: 519,  pro: 4.2,  cho: 8.3,  fat: 8.9,
    iron: 1.5, zinc: 1.1, vitA: 185, calcium: 78, fiber: 2.8, sodium: 18,
    measures: _buildMeasures(124, 4.2, 8.3, 8.9, [
      ['1 cup (240 g)',           240],
      ['½ cup (120 g)',           120],
      ['1 plate relish (150 g)', 150],
      ['1 tbsp (15 g)',           15],
    ]),
  },
  {
    id: 'zm_kapenta', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Protein Foods', name: 'Kapenta (dried small fish) [ZM]',
    altNames: ['Usipa ZM', 'Matemba ZM', 'Sardine sèche'],
    kcal: 349, kj: 1461, pro: 67.0, cho: 0.0,  fat: 8.2,
    iron: 12.5, zinc: 4.2, vitA: 25, calcium: 1450, fiber: 0, sodium: 450,
    measures: _buildMeasures(349, 67.0, 0.0, 8.2, [
      ['1 tablespoon dry (10 g)',  10],
      ['2 tablespoons (20 g)',     20],
      ['½ cup (40 g)',             40],
    ]),
  },
  {
    id: 'zm_chibwabwa', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Vegetables', name: 'Chibwabwa (pumpkin leaves, boiled) [ZM]',
    altNames: ['Pumpkin greens Zambia', 'Impwa'],
    kcal: 54,  kj: 226,  pro: 5.8,  cho: 8.9,  fat: 0.6,
    iron: 2.1, zinc: 0.5, vitA: 320, calcium: 92, fiber: 3.2, sodium: 12,
    measures: _buildMeasures(54, 5.8, 8.9, 0.6, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
      ['1 tbsp (15 g)',           15],
    ]),
  },
  {
    id: 'zm_katapa', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Vegetables', name: 'Katapa (cassava leaves, boiled) [ZM]',
    altNames: ['Cassava greens Zambia', 'Chikanda'],
    kcal: 90,  kj: 376,  pro: 7.5,  cho: 14.8, fat: 0.8,
    iron: 2.7, zinc: 0.5, vitA: 540, calcium: 105, fiber: 3.5, sodium: 15,
    measures: _buildMeasures(90, 7.5, 14.8, 0.8, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'zm_sweet_potato_leaves', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Vegetables', name: 'Sweet potato leaves (boiled) [ZM]',
    altNames: ['Lumanda', 'Ibimejelo'],
    kcal: 44,  kj: 184,  pro: 5.0,  cho: 7.6,  fat: 0.4,
    iron: 3.3, zinc: 0.7, vitA: 622, calcium: 146, fiber: 3.0, sodium: 10,
    measures: _buildMeasures(44, 5.0, 7.6, 0.4, [
      ['1 cup (130 g)',           130],
      ['½ cup (65 g)',             65],
      ['1 plate relish (100 g)', 100],
    ]),
  },
  {
    id: 'zm_rape_boiled', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Vegetables', name: 'Rape / collard greens (boiled) [ZM]',
    altNames: ['Nkwali', 'Nkani'],
    kcal: 32,  kj: 134,  pro: 3.4,  cho: 5.2,  fat: 0.3,
    iron: 1.3, zinc: 0.4, vitA: 467, calcium: 117, fiber: 2.1, sodium: 9,
    measures: _buildMeasures(32, 3.4, 5.2, 0.3, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'zm_mopane_worm', country: 'ZM', source: 'ZAMFOODS 2019 / PEER',
    cat: 'Protein Foods', name: 'Mopane worm (dried, madora) [ZM]',
    altNames: ['Phane', 'Emperor moth caterpillar', 'Madora'],
    kcal: 430, kj: 1799, pro: 48.5, cho: 15.1, fat: 17.5,
    iron: 29.0, zinc: 11.0, vitA: 0,  calcium: 100, fiber: 7.0, sodium: 85,
    measures: _buildMeasures(430, 48.5, 15.1, 17.5, [
      ['1 tablespoon (10 g)',  10],
      ['2 tablespoons (20 g)', 20],
      ['½ cup (40 g)',         40],
    ]),
  },
  {
    id: 'zm_groundnut_paste', country: 'ZM', source: 'ZAMFOODS 2019',
    cat: 'Legumes', name: 'Groundnut paste (raw, unsalted) [ZM]',
    altNames: ['Impwa ya nzama', 'Peanut butter ZM'],
    kcal: 567, kj: 2372, pro: 25.8, cho: 16.1, fat: 49.2,
    iron: 2.4, zinc: 3.5, vitA: 0,  calcium: 50, fiber: 6.0, sodium: 5,
    measures: _buildMeasures(567, 25.8, 16.1, 49.2, [
      ['1 tablespoon (16 g)',  16],
      ['2 tablespoons (32 g)', 32],
      ['1 teaspoon (5 g)',      5],
    ]),
  },
  {
    id: 'zm_samp', country: 'ZM', source: 'SAFC 2012',
    cat: 'Staples', name: 'Samp (dried hominy, cooked) [ZM/ZA]',
    altNames: ['Umngqusho base', 'Isinkwa'],
    kcal: 115, kj: 481,  pro: 3.1,  cho: 26.3, fat: 0.2,
    iron: 0.4, zinc: 0.6, vitA: 0,  calcium: 3,  fiber: 1.8, sodium: 2,
    measures: _buildMeasures(115, 3.1, 26.3, 0.2, [
      ['1 cup cooked (180 g)',  180],
      ['½ cup (90 g)',           90],
    ]),
  },

  // ────────────────────────────────────────────────────────────────────────
  // MOZAMBIQUE (MZ)  ·  Sources: TACSA; FAO WCPFC; peer-reviewed literature
  // ────────────────────────────────────────────────────────────────────────

  {
    id: 'mz_xima', country: 'MZ', source: 'FAO WCPFC / PEER',
    cat: 'Staples', name: 'Xima (cassava flour porridge, cooked) [MZ]',
    altNames: ['Chima', 'Ugali wa muhogo'],
    kcal: 145, kj: 607,  pro: 0.8,  cho: 35.0, fat: 0.2,
    iron: 0.8, zinc: 0.3, vitA: 0,  calcium: 28, fiber: 1.2, sodium: 5,
    measures: _buildMeasures(145, 0.8, 35.0, 0.2, [
      ['1 cup / serving (240 g)', 240],
      ['½ cup (120 g)',            120],
      ['Large plate (~350 g)',     350],
    ]),
  },
  {
    id: 'mz_matapa', country: 'MZ', source: 'PEER (Chadare et al.)',
    cat: 'Vegetables', name: 'Matapa (cassava leaves, peanut & coconut stew) [MZ]',
    altNames: ['Matapha', 'Cassava leaf coconut stew'],
    kcal: 172, kj: 720,  pro: 7.5,  cho: 12.0, fat: 11.0,
    iron: 2.8, zinc: 1.1, vitA: 580, calcium: 118, fiber: 3.0, sodium: 22,
    measures: _buildMeasures(172, 7.5, 12.0, 11.0, [
      ['1 cup (240 g)',           240],
      ['½ cup (120 g)',           120],
      ['1 plate relish (150 g)', 150],
    ]),
  },
  {
    id: 'mz_nhemba', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Legumes', name: 'Nhemba beans (cowpeas, cooked) [MZ]',
    altNames: ['Feijão nhemba', 'Cowpeas Mozambique'],
    kcal: 116, kj: 485,  pro: 7.7,  cho: 20.7, fat: 0.6,
    iron: 2.3, zinc: 1.0, vitA: 2,  calcium: 24, fiber: 6.5, sodium: 3,
    measures: _buildMeasures(116, 7.7, 20.7, 0.6, [
      ['1 cup (177 g)',           177],
      ['½ cup (89 g)',             89],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'mz_mandioca', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Staples', name: 'Mandioca (cassava, boiled) [MZ]',
    altNames: ['Muhogo MZ', 'Tapioca root'],
    kcal: 160, kj: 669,  pro: 1.4,  cho: 38.0, fat: 0.3,
    iron: 0.3, zinc: 0.3, vitA: 1,  calcium: 16, fiber: 1.8, sodium: 14,
    measures: _buildMeasures(160, 1.4, 38.0, 0.3, [
      ['1 piece (100 g)',      100],
      ['1 cup chunks (200 g)', 200],
    ]),
  },
  {
    id: 'mz_mapira', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Staples', name: 'Mapira (sorghum flour, dry) [MZ]',
    altNames: ['Sorghum Mozambique', 'Ufa wa mapira'],
    kcal: 335, kj: 1402, pro: 10.2, cho: 72.6, fat: 3.5,
    iron: 4.4, zinc: 1.9, vitA: 0,  calcium: 25, fiber: 6.3, sodium: 3,
    measures: _buildMeasures(335, 10.2, 72.6, 3.5, [
      ['¼ cup dry (40 g)',   40],
      ['½ cup dry (80 g)',   80],
      ['1 tbsp dry (10 g)',  10],
    ]),
  },
  {
    id: 'mz_amendoim', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Legumes', name: 'Amendoim (groundnuts, raw) [MZ]',
    altNames: ['Peanuts MZ', 'Mancarra'],
    kcal: 567, kj: 2372, pro: 25.8, cho: 16.1, fat: 49.2,
    iron: 2.4, zinc: 3.5, vitA: 0,  calcium: 50, fiber: 8.5, sodium: 5,
    measures: _buildMeasures(567, 25.8, 16.1, 49.2, [
      ['1 tablespoon (15 g)',  15],
      ['2 tablespoons (30 g)', 30],
      ['1 handful (35 g)',     35],
    ]),
  },
  {
    id: 'mz_couve', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Vegetables', name: 'Couve (kale, boiled) [MZ]',
    altNames: ['Kale Mozambique', 'Folhas de couve'],
    kcal: 28,  kj: 117,  pro: 2.9,  cho: 4.1,  fat: 0.4,
    iron: 1.3, zinc: 0.3, vitA: 512, calcium: 135, fiber: 2.0, sodium: 12,
    measures: _buildMeasures(28, 2.9, 4.1, 0.4, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'mz_bacalhau', country: 'MZ', source: 'PEER',
    cat: 'Protein Foods', name: 'Peixe salgado/seco (salted dried fish) [MZ]',
    altNames: ['Dried saltfish MZ', 'Peixe seco'],
    kcal: 290, kj: 1213, pro: 62.0, cho: 0.0,  fat: 2.5,
    iron: 1.8, zinc: 1.5, vitA: 10, calcium: 220, fiber: 0, sodium: 3800,
    measures: _buildMeasures(290, 62.0, 0.0, 2.5, [
      ['1 tbsp flaked (10 g)', 10],
      ['2 tbsp (20 g)',        20],
      ['1 small piece (30 g)', 30],
    ]),
  },
  {
    id: 'mz_batata_doce', country: 'MZ', source: 'FAO WCPFC',
    cat: 'Staples', name: 'Batata doce (sweet potato, boiled) [MZ]',
    altNames: ['Sweet potato MZ', 'Batata'],
    kcal: 90,  kj: 376,  pro: 2.0,  cho: 20.7, fat: 0.1,
    iron: 0.5, zinc: 0.3, vitA: 384, calcium: 27, fiber: 2.5, sodium: 22,
    measures: _buildMeasures(90, 2.0, 20.7, 0.1, [
      ['1 medium (130 g)', 130],
      ['½ medium (65 g)',   65],
      ['1 cup mashed (200 g)', 200],
    ]),
  },

  // ────────────────────────────────────────────────────────────────────────
  // ZIMBABWE (ZW)  ·  Sources: ZFCT 2018; FAO/INFOODS
  // ────────────────────────────────────────────────────────────────────────

  {
    id: 'zw_sadza', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Staples', name: 'Sadza (maize meal, cooked) [ZW]',
    altNames: ['Pap ZW', 'Ugali ZW'],
    kcal: 92,  kj: 385,  pro: 2.1,  cho: 20.3, fat: 0.3,
    iron: 0.3, zinc: 0.2, vitA: 0,  calcium: 4,  fiber: 0.5, sodium: 2,
    measures: _buildMeasures(92, 2.1, 20.3, 0.3, [
      ['1 cup / serving (240 g)', 240],
      ['½ cup (120 g)',            120],
      ['Large plate (~350 g)',     350],
    ]),
  },
  {
    id: 'zw_covo', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Vegetables', name: 'Covo (cowpea leaves, boiled) [ZW]',
    altNames: ['Derere', 'Muboora', 'Cowpea greens Zimbabwe'],
    kcal: 36,  kj: 151,  pro: 3.9,  cho: 5.5,  fat: 0.3,
    iron: 2.1, zinc: 0.4, vitA: 380, calcium: 126, fiber: 2.8, sodium: 11,
    measures: _buildMeasures(36, 3.9, 5.5, 0.3, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
      ['1 tbsp (15 g)',           15],
    ]),
  },
  {
    id: 'zw_matemba', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Protein Foods', name: 'Matemba (dried kapenta/small fish) [ZW]',
    altNames: ['Kapenta ZW', 'Usipa ZW', 'Freshwater sardine dried'],
    kcal: 320, kj: 1339, pro: 59.0, cho: 0.0,  fat: 9.0,
    iron: 13.0, zinc: 3.9, vitA: 45, calcium: 1380, fiber: 0, sodium: 410,
    measures: _buildMeasures(320, 59.0, 0.0, 9.0, [
      ['1 tablespoon dry (10 g)',  10],
      ['2 tablespoons (20 g)',     20],
      ['½ cup (40 g)',             40],
    ]),
  },
  {
    id: 'zw_muboora', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Vegetables', name: 'Muboora (pumpkin leaves, boiled) [ZW]',
    altNames: ['Pumpkin greens Zimbabwe', 'Derere'],
    kcal: 42,  kj: 176,  pro: 4.2,  cho: 6.8,  fat: 0.4,
    iron: 1.9, zinc: 0.4, vitA: 340, calcium: 110, fiber: 3.0, sodium: 9,
    measures: _buildMeasures(42, 4.2, 6.8, 0.4, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'zw_nhopi', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Vegetables', name: 'Nhopi (pumpkin with peanut butter) [ZW]',
    altNames: ['Dovi pumpkin relish', 'Nhopi relish'],
    kcal: 175, kj: 732,  pro: 5.2,  cho: 14.5, fat: 11.5,
    iron: 1.5, zinc: 1.2, vitA: 145, calcium: 52, fiber: 2.5, sodium: 20,
    measures: _buildMeasures(175, 5.2, 14.5, 11.5, [
      ['1 cup (240 g)',           240],
      ['½ cup (120 g)',           120],
      ['1 plate relish (150 g)', 150],
    ]),
  },
  {
    id: 'zw_muriwo_une_dovi', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Vegetables', name: 'Muriwo une dovi (greens with peanut butter) [ZW]',
    altNames: ['Dovi greens', 'Peanut butter greens Zimbabwe'],
    kcal: 129, kj: 540,  pro: 6.0,  cho: 9.3,  fat: 8.6,
    iron: 2.3, zinc: 1.1, vitA: 295, calcium: 108, fiber: 3.0, sodium: 18,
    measures: _buildMeasures(129, 6.0, 9.3, 8.6, [
      ['1 cup (240 g)',           240],
      ['½ cup (120 g)',           120],
      ['1 plate relish (150 g)', 150],
    ]),
  },
  {
    id: 'zw_rupiza', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Legumes', name: 'Rupiza (cowpeas, cooked) [ZW]',
    altNames: ['Black-eyed beans ZW', 'Nyemba ZW'],
    kcal: 118, kj: 494,  pro: 8.0,  cho: 21.0, fat: 0.5,
    iron: 2.3, zinc: 1.0, vitA: 2,  calcium: 30, fiber: 6.3, sodium: 4,
    measures: _buildMeasures(118, 8.0, 21.0, 0.5, [
      ['1 cup (177 g)',           177],
      ['½ cup (89 g)',             89],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'zw_madora', country: 'ZW', source: 'ZFCT 2018 / PEER',
    cat: 'Protein Foods', name: 'Madora (mopane caterpillar, dried) [ZW]',
    altNames: ['Mopane worm ZW', 'Phane worm'],
    kcal: 430, kj: 1799, pro: 48.0, cho: 14.0, fat: 17.0,
    iron: 29.0, zinc: 11.0, vitA: 0,  calcium: 95, fiber: 7.0, sodium: 80,
    measures: _buildMeasures(430, 48.0, 14.0, 17.0, [
      ['1 tablespoon (10 g)',  10],
      ['2 tablespoons (20 g)', 20],
      ['½ cup (40 g)',         40],
    ]),
  },
  {
    id: 'zw_bota', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Staples', name: 'Bota (thin maize porridge) [ZW]',
    altNames: ['Thin pap Zimbabwe', 'Uji ZW'],
    kcal: 46,  kj: 192,  pro: 1.1,  cho: 10.1, fat: 0.2,
    iron: 0.2, zinc: 0.1, vitA: 0,  calcium: 4,  fiber: 0.5, sodium: 2,
    measures: _buildMeasures(46, 1.1, 10.1, 0.2, [
      ['1 cup (240 g)',  240],
      ['1 bowl (300 g)', 300],
    ]),
  },
  {
    id: 'zw_mazondo', country: 'ZW', source: 'ZFCT 2018',
    cat: 'Protein Foods', name: 'Mazondo (cow trotters/feet, boiled) [ZW]',
    altNames: ['Cow feet Zimbabwe', 'Trotters ZW'],
    kcal: 205, kj: 858,  pro: 18.5, cho: 0.0,  fat: 14.5,
    iron: 1.2, zinc: 3.0, vitA: 5,  calcium: 40, fiber: 0, sodium: 70,
    measures: _buildMeasures(205, 18.5, 0.0, 14.5, [
      ['1 piece (100 g)',  100],
      ['½ cup (80 g)',      80],
    ]),
  },

  // ────────────────────────────────────────────────────────────────────────
  // SOUTH AFRICA (ZA)  ·  Sources: SAFOODS 2010; MRC/NICUS (Wolmarans et al.)
  // ────────────────────────────────────────────────────────────────────────

  {
    id: 'za_pap', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Pap / Putu (maize meal, cooked) [ZA]',
    altNames: ['Stywe pap', 'Krummelpap', 'Mealie pap'],
    kcal: 93,  kj: 389,  pro: 2.3,  cho: 21.0, fat: 0.3,
    iron: 0.3, zinc: 0.2, vitA: 0,  calcium: 4,  fiber: 0.5, sodium: 2,
    measures: _buildMeasures(93, 2.3, 21.0, 0.3, [
      ['1 cup / serving (240 g)', 240],
      ['½ cup (120 g)',            120],
      ['Large plate (~350 g)',     350],
    ]),
  },
  {
    id: 'za_umngqusho', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Umngqusho (samp and beans) [ZA]',
    altNames: ['Samp and beans SA', 'Isinkwa nenyama'],
    kcal: 143, kj: 598,  pro: 7.2,  cho: 28.0, fat: 0.8,
    iron: 2.0, zinc: 1.1, vitA: 0,  calcium: 35, fiber: 5.0, sodium: 10,
    measures: _buildMeasures(143, 7.2, 28.0, 0.8, [
      ['1 cup (200 g)',  200],
      ['½ cup (100 g)', 100],
    ]),
  },
  {
    id: 'za_chakalaka', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Vegetables', name: 'Chakalaka (spiced vegetable relish) [ZA]',
    altNames: ['Chakalaka relish', 'Spicy bean relish SA'],
    kcal: 71,  kj: 297,  pro: 2.5,  cho: 11.0, fat: 2.1,
    iron: 1.1, zinc: 0.5, vitA: 120, calcium: 42, fiber: 3.2, sodium: 280,
    measures: _buildMeasures(71, 2.5, 11.0, 2.1, [
      ['1 cup (200 g)',          200],
      ['½ cup (100 g)',          100],
      ['1 tbsp (15 g)',          15],
      ['1 plate relish (120 g)', 120],
    ]),
  },
  {
    id: 'za_morogo', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Vegetables', name: 'Morogo (wild spinach / wild greens) [ZA]',
    altNames: ['Wild spinach SA', 'Imifino', 'Thepe'],
    kcal: 29,  kj: 121,  pro: 3.2,  cho: 4.8,  fat: 0.2,
    iron: 3.3, zinc: 0.6, vitA: 430, calcium: 145, fiber: 2.8, sodium: 15,
    measures: _buildMeasures(29, 3.2, 4.8, 0.2, [
      ['1 cup (180 g)',           180],
      ['½ cup (90 g)',             90],
      ['1 plate relish (120 g)', 120],
      ['1 tbsp (15 g)',           15],
    ]),
  },
  {
    id: 'za_boerewors', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Protein Foods', name: 'Boerewors (beef sausage, grilled) [ZA]',
    altNames: ['SA sausage', 'Braai wors'],
    kcal: 339, kj: 1418, pro: 17.5, cho: 1.2,  fat: 29.0,
    iron: 1.8, zinc: 3.5, vitA: 15, calcium: 22, fiber: 0, sodium: 820,
    measures: _buildMeasures(339, 17.5, 1.2, 29.0, [
      ['1 sausage link (85 g)', 85],
      ['½ link (42 g)',         42],
    ]),
  },
  {
    id: 'za_biltong', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Protein Foods', name: 'Biltong (dried/cured beef) [ZA]',
    altNames: ['Beef biltong', 'Droëwors'],
    kcal: 347, kj: 1452, pro: 55.0, cho: 0.5,  fat: 13.0,
    iron: 3.5, zinc: 8.5, vitA: 0,  calcium: 25, fiber: 0, sodium: 1200,
    measures: _buildMeasures(347, 55.0, 0.5, 13.0, [
      ['1 strip (20 g)',  20],
      ['3 strips (60 g)', 60],
      ['½ cup (40 g)',    40],
    ]),
  },
  {
    id: 'za_amadumbe', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Amadumbe / Taro (boiled) [ZA]',
    altNames: ['Taro SA', 'Colocasia', 'Amadumbe'],
    kcal: 112, kj: 469,  pro: 1.5,  cho: 26.5, fat: 0.1,
    iron: 0.5, zinc: 0.3, vitA: 5,  calcium: 18, fiber: 4.1, sodium: 11,
    measures: _buildMeasures(112, 1.5, 26.5, 0.1, [
      ['1 medium (130 g)',       130],
      ['½ medium (65 g)',         65],
      ['1 cup chunks (155 g)',   155],
    ]),
  },
  {
    id: 'za_isijingi', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Isijingi (pumpkin and maize porridge) [ZA]',
    altNames: ['Pumpkin pap SA', 'Phutu'],
    kcal: 72,  kj: 301,  pro: 1.8,  cho: 16.0, fat: 0.4,
    iron: 0.6, zinc: 0.4, vitA: 385, calcium: 28, fiber: 1.4, sodium: 5,
    measures: _buildMeasures(72, 1.8, 16.0, 0.4, [
      ['1 cup (240 g)',  240],
      ['½ cup (120 g)', 120],
      ['1 bowl (300 g)', 300],
    ]),
  },
  {
    id: 'za_umvubo', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Umvubo (fermented sorghum porridge) [ZA]',
    altNames: ['Fermented pap ZA', 'Ujeqe'],
    kcal: 68,  kj: 284,  pro: 2.1,  cho: 13.5, fat: 0.5,
    iron: 0.8, zinc: 0.4, vitA: 0,  calcium: 20, fiber: 1.2, sodium: 5,
    measures: _buildMeasures(68, 2.1, 13.5, 0.5, [
      ['1 cup (240 g)',  240],
      ['½ cup (120 g)', 120],
      ['1 bowl (300 g)', 300],
    ]),
  },
  {
    id: 'za_inkobe', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Inkobe (whole maize, cooked) [ZA]',
    altNames: ['Whole corn cooked SA', 'Imvu', 'Stampmielies'],
    kcal: 145, kj: 607,  pro: 4.5,  cho: 31.0, fat: 1.5,
    iron: 0.5, zinc: 0.9, vitA: 5,  calcium: 5,  fiber: 2.4, sodium: 2,
    measures: _buildMeasures(145, 4.5, 31.0, 1.5, [
      ['1 cup kernels (154 g)', 154],
      ['½ cup (77 g)',           77],
    ]),
  },
  {
    id: 'za_umphothulo', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Staples', name: 'Umphothulo (mealie meal with sour milk) [ZA]',
    altNames: ['Maize sour milk porridge SA', 'Uphuthu'],
    kcal: 127, kj: 531,  pro: 4.5,  cho: 19.8, fat: 3.3,
    iron: 0.4, zinc: 0.5, vitA: 15, calcium: 82, fiber: 0.5, sodium: 40,
    measures: _buildMeasures(127, 4.5, 19.8, 3.3, [
      ['1 cup (240 g)',  240],
      ['½ cup (120 g)', 120],
      ['1 bowl (300 g)', 300],
    ]),
  },
  {
    id: 'za_umleqwa', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Protein Foods', name: 'Umleqwa (free-range chicken, stewed) [ZA]',
    altNames: ['Village chicken SA', 'Imfulamfula'],
    kcal: 185, kj: 774,  pro: 25.0, cho: 0.0,  fat: 9.5,
    iron: 1.5, zinc: 2.5, vitA: 20, calcium: 12, fiber: 0, sodium: 68,
    measures: _buildMeasures(185, 25.0, 0.0, 9.5, [
      ['1 piece (100 g)',  100],
      ['½ cup (70 g)',      70],
    ]),
  },
  {
    id: 'za_mogodu', country: 'ZA', source: 'SAFOODS 2010',
    cat: 'Protein Foods', name: 'Mogodu (tripe, stewed) [ZA]',
    altNames: ['Ox tripe SA', 'Beef tripe'],
    kcal: 148, kj: 619,  pro: 16.0, cho: 1.2,  fat: 8.8,
    iron: 1.5, zinc: 2.0, vitA: 5,  calcium: 25, fiber: 0, sodium: 75,
    measures: _buildMeasures(148, 16.0, 1.2, 8.8, [
      ['1 cup (200 g)',  200],
      ['½ cup (100 g)', 100],
    ]),
  },
  {
    id: 'za_umqombothi', country: 'ZA', source: 'PEER (Sefa-Dedeh et al.)',
    cat: 'Staples', name: 'Umqombothi (traditional sorghum beer) [ZA]',
    altNames: ['Sorghum beer SA', 'Opaque beer', 'Chibuku-type'],
    kcal: 48,  kj: 201,  pro: 1.2,  cho: 8.1,  fat: 0.2,
    iron: 1.3, zinc: 0.3, vitA: 0,  calcium: 8,  fiber: 0.5, sodium: 8,
    measures: _buildMeasures(48, 1.2, 8.1, 0.2, [
      ['1 cup (240 mL)', 240],
      ['½ cup (120 mL)', 120],
    ]),
  },
];

// ══════════════════════════════════════════════════════════════════════════
// REGIONAL SYNONYM MAP
// Additional synonyms to merge into foodSearch.js SYNONYM_MAP
// ══════════════════════════════════════════════════════════════════════════
const REGIONAL_SYNONYM_MAP = {
  // Tanzania
  ugali:            ['nsima', 'sadza', 'nshima', 'pap', 'xima'],
  sima:             ['nsima', 'ugali'],
  mchicha:          ['amaranth', 'bonongwe'],
  dagaa:            ['usipa', 'kapenta'],
  omena:            ['usipa', 'kapenta', 'dagaa'],
  'sukuma wiki':    ['rape', 'kale', 'covo', 'muriwo'],
  muhogo:           ['cassava', 'mandioca'],
  ndizi:            ['banana', 'nthochi'],
  maharagwe:        ['beans', 'kidney beans'],
  vitunguu:         ['onion'],

  // Zambia
  nshima:           ['nsima', 'sadza', 'ugali'],
  shima:            ['nsima', 'nshima'],
  ifisashi:         ['peanut greens', 'groundnut relish'],
  kapenta:          ['usipa', 'dagaa', 'matemba'],
  chibwabwa:        ['pumpkin leaves', 'muboora'],
  katapa:           ['cassava leaves'],
  phane:            ['mopane worm', 'madora'],
  madora:           ['mopane worm', 'phane'],

  // Mozambique
  xima:             ['nsima', 'ugali', 'sadza'],
  chima:            ['nsima', 'xima'],
  matapa:           ['cassava leaf stew', 'coconut greens'],
  nhemba:           ['cowpeas', 'black-eyed beans'],
  mandioca:         ['cassava', 'muhogo'],
  couve:            ['kale', 'rape', 'collard greens'],
  amendoim:         ['groundnut', 'peanut'],
  mapira:           ['sorghum'],

  // Zimbabwe
  sadza:            ['nsima', 'ugali', 'nshima', 'pap'],
  covo:             ['cowpea leaves', 'collard greens', 'rape'],
  muriwo:           ['greens', 'covo', 'rape'],
  matemba:          ['usipa', 'kapenta', 'dagaa'],
  muboora:          ['pumpkin leaves', 'chibwabwa'],
  rupiza:           ['cowpeas', 'black-eyed beans', 'nyemba'],
  nhopi:            ['pumpkin peanut relish'],
  mazondo:          ['cow trotters', 'cow feet'],
  madora:           ['mopane worm', 'phane', 'caterpillar'],
  bota:             ['thin porridge', 'uji'],

  // South Africa
  pap:              ['nsima', 'ugali', 'sadza', 'nshima'],
  'stywe pap':      ['nsima', 'sadza', 'ugali'],
  'mealie pap':     ['nsima', 'sadza'],
  umngqusho:        ['samp and beans'],
  chakalaka:        ['spiced vegetable relish', 'bean relish'],
  morogo:           ['wild spinach', 'amaranth', 'bonongwe'],
  imifino:          ['wild greens', 'morogo'],
  boerewors:        ['beef sausage'],
  biltong:          ['dried beef', 'jerky'],
  amadumbe:         ['taro', 'cocoyam', 'masimbi'],
  isijingi:         ['pumpkin porridge', 'pumpkin pap'],
  umvubo:           ['fermented sorghum porridge'],
  umphothulo:       ['maize sour milk', 'uphuthu'],
  inkobe:           ['whole maize cooked'],
  mogodu:           ['tripe', 'ox tripe'],
  umqombothi:       ['sorghum beer', 'opaque beer'],
};

// ══════════════════════════════════════════════════════════════════════════
// METADATA
// ══════════════════════════════════════════════════════════════════════════
const REGIONAL_FCT_META = {
  version:   '1.0.0',
  countries: ['TZ', 'ZM', 'MZ', 'ZW', 'ZA'],
  totalItems: REGIONAL_FCT.length,
  sources: [
    'FAO/INFOODS East African Food Composition Table (EAF) 2012',
    'Tanzania Food Composition Tables (TFCT) 2008',
    'ZAMFOODS: Zambia Food Composition Table 2019',
    'FAO/INFOODS Southern African Food Composition Table (SAFC) 2012',
    'Zimbabwe Food Composition Tables (ZFCT), FAO/INFOODS 2018',
    'SAFOODS: South African Food Composition Tables, MRC/NICUS (Wolmarans et al. 2010)',
    'FAO West/Central/Pacific Food Composition (WCPFC)',
    'Peer-reviewed literature (individual studies)',
  ],
  micronutrientNote: 'iron (mg/100g), zinc (mg/100g), vitA (µg RAE/100g), calcium (mg/100g)',
  disclaimer: 'Values are reference means from published FCTs. Actual nutrient content varies by cultivar, season, cooking method, and soil conditions. Use for dietary assessment and education only.',
};

// ══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.REGIONAL_FCT         = REGIONAL_FCT;
  window.REGIONAL_SYNONYM_MAP = REGIONAL_SYNONYM_MAP;
  window.REGIONAL_FCT_META    = REGIONAL_FCT_META;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REGIONAL_FCT, REGIONAL_SYNONYM_MAP, REGIONAL_FCT_META };
}
