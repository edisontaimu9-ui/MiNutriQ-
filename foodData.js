/**
 * foodData.js — Oasis Food Databases
 * ─────────────────────────────────────────────────────────────
 * Extracted from index.html to keep the app modular.
 * Load this file BEFORE the main app script (index.html already does this).
 *
 * Exports (as globals, compatible with PWA single-file hosting):
 *   MALAWI_FCT              — Malawi Food Composition Table (household measures)
 *   UCT_EXCHANGE_DB         — UCT Division of Human Nutrition Exchange List (2014)
 *   UCT_EXCHANGE_TYPE_LABELS — Human-readable labels for UCT exchange types
 *   UCT_TYPE_LABELS         — Short labels (used in 24-hr recall / meal planner)
 *   UCT_TYPE_COLORS         — CSS colour tokens per exchange type
 *   UCT_MACROS              — Standard macro values per exchange type
 *   MP_FOODS                — Meal Planner food categories (staples, protein, etc.)
 *   BLEND_FOODS             — Blenderized feed ingredient database
 *
 * Author : Edison Taimu
 * Version: see index.html APP_VERSION
 * ─────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════
// 1. MALAWI FOOD COMPOSITION TABLE (with household measures)
// ══════════════════════════════════════════════════════════════
// Malawi FCT Food Database with household measures
const MALAWI_FCT = [
  // STAPLES
  { id:'nsima_thick', cat:'Staples', name:'Nsima (thick, maize)', measures:[{lbl:'1 cup / chikombe (240g)',kcal:246,pro:5.3,cho:55,fat:1.2,kj:1030},{lbl:'½ cup (120g)',kcal:123,pro:2.65,cho:27.5,fat:0.6,kj:515},{lbl:'Large plate serving (~350g)',kcal:358,pro:7.7,cho:80,fat:1.7,kj:1499}] },
  { id:'mgaiwa', cat:'Staples', name:'Mgaiwa (whole-grain maize porridge)', measures:[{lbl:'1 cup (250g)',kcal:218,pro:5.5,cho:47,fat:2.0,kj:913},{lbl:'½ cup (125g)',kcal:109,pro:2.75,cho:23.5,fat:1.0,kj:456},{lbl:'1 bowl / mbiya (300g)',kcal:262,pro:6.6,cho:56,fat:2.4,kj:1096}] },
  { id:'rice_white', cat:'Staples', name:'Rice (cooked, white)', measures:[{lbl:'1 cup / chikombe (185g)',kcal:242,pro:4.4,cho:53,fat:0.4,kj:1013},{lbl:'½ cup (93g)',kcal:121,pro:2.2,cho:26.5,fat:0.2,kj:507},{lbl:'1 plate serving (~250g)',kcal:327,pro:5.9,cho:72,fat:0.5,kj:1369},{lbl:'1 handful dry (40g → 120g cooked)',kcal:157,pro:2.8,cho:35,fat:0.3,kj:657}] },
  { id:'bread_white', cat:'Staples', name:'Bread (white, slice)', measures:[{lbl:'1 slice (30g)',kcal:79,pro:2.7,cho:15,fat:0.9,kj:331},{lbl:'2 slices (60g)',kcal:158,pro:5.4,cho:30,fat:1.8,kj:662},{lbl:'1 roll (45g)',kcal:119,pro:4.0,cho:22.5,fat:1.4,kj:498}] },
  { id:'bread_brown', cat:'Staples', name:'Bread (brown/wholegrain, slice)', measures:[{lbl:'1 slice (30g)',kcal:72,pro:3.0,cho:13,fat:1.0,kj:302},{lbl:'2 slices (60g)',kcal:144,pro:6.0,cho:26,fat:2.0,kj:604}] },
  { id:'sweet_potato', cat:'Staples', name:'Sweet potato (cooked)', measures:[{lbl:'1 medium (130g)',kcal:112,pro:2.0,cho:26,fat:0.1,kj:469},{lbl:'½ medium (65g)',kcal:56,pro:1.0,cho:13,fat:0.05,kj:234},{lbl:'1 small (90g)',kcal:77,pro:1.4,cho:18,fat:0.1,kj:322},{lbl:'1 cup mashed (200g)',kcal:172,pro:3.1,cho:40,fat:0.2,kj:720}] },
  { id:'cassava', cat:'Staples', name:'Cassava (boiled)', measures:[{lbl:'1 cup chunks (206g)',kcal:330,pro:2.8,cho:78,fat:0.6,kj:1381},{lbl:'½ cup (103g)',kcal:165,pro:1.4,cho:39,fat:0.3,kj:690},{lbl:'1 piece (~100g)',kcal:160,pro:1.4,cho:38,fat:0.3,kj:670}] },
  { id:'potato', cat:'Staples', name:'Irish potato (boiled)', measures:[{lbl:'1 medium (150g)',kcal:116,pro:2.5,cho:27,fat:0.1,kj:486},{lbl:'½ medium (75g)',kcal:58,pro:1.25,cho:13.5,fat:0.05,kj:243},{lbl:'1 cup boiled (150g)',kcal:116,pro:2.5,cho:27,fat:0.1,kj:486}] },
  { id:'sorghum', cat:'Staples', name:'Sorghum porridge (thin)', measures:[{lbl:'1 cup (240g)',kcal:215,pro:6.0,cho:45,fat:2.0,kj:900},{lbl:'1 bowl (300g)',kcal:269,pro:7.5,cho:56,fat:2.5,kj:1126}] },
  { id:'finger_millet', cat:'Staples', name:'Finger millet (ufa wazimu) porridge', measures:[{lbl:'1 cup (240g)',kcal:225,pro:5.5,cho:48,fat:1.5,kj:942},{lbl:'½ cup (120g)',kcal:112,pro:2.75,cho:24,fat:0.75,kj:471}] },
  { id:'mandazi', cat:'Staples', name:'Mandazi (fried doughnut)', measures:[{lbl:'1 piece (40g)',kcal:140,pro:2.5,cho:20,fat:5.5,kj:586},{lbl:'2 pieces (80g)',kcal:280,pro:5.0,cho:40,fat:11,kj:1172}] },
  { id:'chapati', cat:'Staples', name:'Chapati (wheat, fried)', measures:[{lbl:'1 medium (65g)',kcal:195,pro:4.0,cho:28,fat:7.5,kj:816},{lbl:'½ chapati (32g)',kcal:98,pro:2.0,cho:14,fat:3.8,kj:410}] },
  // --- Additional Staples from Malawi FCT 2019 (MW01) ---
  { id:'african_cake', cat:'Staples', name:'African cake / Chikondamoyo (Chigumu cha nthochi ndi dzira)', measures:[{lbl:'1 piece (80g)',kcal:172,pro:4.6,cho:33.1,fat:2.4,kj:729},{lbl:'½ piece (40g)',kcal:86,pro:2.3,cho:16.5,fat:1.2,kj:365},{lbl:'1 slice (50g)',kcal:108,pro:2.9,cho:20.7,fat:1.5,kj:456}] },
  { id:'banana_fritters', cat:'Staples', name:'Banana fritters (Zitumbuwa)', measures:[{lbl:'1 piece (60g)',kcal:113,pro:1.9,cho:23.1,fat:1.5,kj:480},{lbl:'2 pieces (120g)',kcal:227,pro:3.8,cho:46.3,fat:3.0,kj:960},{lbl:'1 tbsp batter (15g)',kcal:28,pro:0.5,cho:5.8,fat:0.4,kj:120}] },
  { id:'banana_cake', cat:'Staples', name:'Banana cake (Keke ya nthochi)', measures:[{lbl:'1 slice (80g)',kcal:268,pro:4.1,cho:37.8,fat:11.1,kj:1124},{lbl:'½ slice (40g)',kcal:134,pro:2.0,cho:18.9,fat:5.6,kj:562},{lbl:'1 small piece (50g)',kcal:168,pro:2.6,cho:23.7,fat:7.0,kj:703}] },
  { id:'plain_cake', cat:'Staples', name:'Plain cake (Keke)', measures:[{lbl:'1 slice (80g)',kcal:234,pro:4.5,cho:34.6,fat:8.7,kj:986},{lbl:'½ slice (40g)',kcal:117,pro:2.2,cho:17.3,fat:4.4,kj:493},{lbl:'1 small piece (50g)',kcal:147,pro:2.8,cho:21.6,fat:5.5,kj:617}] },
  { id:'dumplings', cat:'Staples', name:'Dumplings (Dampuling\'i)', measures:[{lbl:'1 piece (70g)',kcal:206,pro:6.7,cho:24.4,fat:9.0,kj:863},{lbl:'2 pieces (140g)',kcal:412,pro:13.4,cho:48.7,fat:18.1,kj:1726},{lbl:'½ piece (35g)',kcal:103,pro:3.4,cho:12.2,fat:4.5,kj:432}] },
  { id:'milk_scones', cat:'Staples', name:'Milk scones (Sikono ya mkaka)', measures:[{lbl:'1 scone (60g)',kcal:134,pro:4.2,cho:23.3,fat:2.8,kj:569},{lbl:'2 scones (120g)',kcal:269,pro:8.4,cho:46.6,fat:5.5,kj:1138},{lbl:'1 small scone (40g)',kcal:90,pro:2.8,cho:15.5,fat:1.8,kj:379}] },
  { id:'pancakes_mw', cat:'Staples', name:'Pancakes, wheat & maize flour (Mandasi a ufa wachimanga ndi tiligu)', measures:[{lbl:'1 pancake (60g)',kcal:89,pro:3.1,cho:12.7,fat:2.9,kj:376},{lbl:'2 pancakes (120g)',kcal:179,pro:6.2,cho:25.4,fat:5.9,kj:752},{lbl:'½ pancake (30g)',kcal:45,pro:1.6,cho:6.3,fat:1.5,kj:188}] },
  { id:'pumpkin_fritters', cat:'Staples', name:'Pumpkin fritters (Mandasi a maungu)', measures:[{lbl:'1 piece (60g)',kcal:92,pro:2.3,cho:10.5,fat:4.6,kj:386},{lbl:'2 pieces (120g)',kcal:185,pro:4.6,cho:21.0,fat:9.1,kj:773},{lbl:'1 tbsp batter (15g)',kcal:23,pro:0.6,cho:2.6,fat:1.1,kj:97}] },
  { id:'sweet_potato_fritters', cat:'Staples', name:'Sweet potato fritters (Zitumbuwa za mbatata)', measures:[{lbl:'1 piece (70g)',kcal:139,pro:3.6,cho:12.8,fat:8.1,kj:579},{lbl:'2 pieces (140g)',kcal:277,pro:7.3,cho:25.6,fat:16.2,kj:1158},{lbl:'½ piece (35g)',kcal:69,pro:1.8,cho:6.4,fat:4.1,kj:289}] },
  { id:'cassava_nsima', cat:'Staples', name:'Cassava thick porridge / Nsima ya kondowole', measures:[{lbl:'1 cup (250g)',kcal:160,pro:1.0,cho:37.0,fat:1.0,kj:678},{lbl:'½ cup (125g)',kcal:80,pro:0.5,cho:18.5,fat:0.5,kj:339},{lbl:'Large plate (~350g)',kcal:224,pro:1.4,cho:51.8,fat:1.4,kj:949}] },
  { id:'cassava_stew_pigeon_pea', cat:'Staples', name:'Cassava stew with pigeon pea (Chinangwa chophika ndi nandolo)', measures:[{lbl:'1 cup (240g)',kcal:96,pro:3.1,cho:20.4,fat:0.2,kj:408},{lbl:'½ cup (120g)',kcal:48,pro:1.6,cho:10.2,fat:0.1,kj:204},{lbl:'1 plate relish (150g)',kcal:60,pro:2.0,cho:12.8,fat:0.2,kj:255}] },
  { id:'maize_soya_nsima', cat:'Staples', name:'Maize & soya thick porridge (Nsima ya ufa wa chimanga ndi soya)', measures:[{lbl:'1 cup (250g)',kcal:233,pro:9.0,cho:40.0,fat:4.3,kj:985},{lbl:'½ cup (125g)',kcal:116,pro:4.5,cho:20.0,fat:2.1,kj:493},{lbl:'Large plate (~350g)',kcal:326,pro:12.6,cho:56.0,fat:6.0,kj:1379}] },
  { id:'phala_groundnut', cat:'Staples', name:'Maize soft porridge with groundnut flour (Phala la mgaiwa ndi nsinjilo)', measures:[{lbl:'1 cup (250g)',kcal:213,pro:7.0,cho:29.0,fat:7.5,kj:893},{lbl:'½ cup (125g)',kcal:106,pro:3.5,cho:14.5,fat:3.8,kj:447},{lbl:'1 bowl (300g)',kcal:255,pro:8.4,cho:34.8,fat:9.0,kj:1069}] },
  { id:'chips_chipisi', cat:'Staples', name:'French fries / Chipisi', measures:[{lbl:'Small portion (100g)',kcal:307,pro:3.3,cho:18.3,fat:23.5,kj:1275},{lbl:'Medium portion (150g)',kcal:461,pro:5.0,cho:27.5,fat:35.3,kj:1913},{lbl:'1 tbsp (20g)',kcal:61,pro:0.7,cho:3.7,fat:4.7,kj:255}] },
  { id:'spaghetti_cooked', cat:'Staples', name:'Spaghetti / macaroni, cooked (unenriched)', measures:[{lbl:'1 cup (180g)',kcal:223,pro:7.9,cho:45.7,fat:0.9,kj:947},{lbl:'½ cup (90g)',kcal:112,pro:4.0,cho:22.9,fat:0.5,kj:474},{lbl:'1 plate (250g)',kcal:310,pro:11.0,cho:63.5,fat:1.3,kj:1315}] },
  { id:'spaghetti_ww_cooked', cat:'Staples', name:'Spaghetti / macaroni, wholewheat, cooked', measures:[{lbl:'1 cup (180g)',kcal:238,pro:9.5,cho:47.7,fat:0.9,kj:1012},{lbl:'½ cup (90g)',kcal:119,pro:4.8,cho:23.9,fat:0.5,kj:506},{lbl:'1 plate (250g)',kcal:330,pro:13.3,cho:66.3,fat:1.3,kj:1405}] },
  { id:'oats_cooked', cat:'Staples', name:'Oats, cooked (Maotsi ophika)', measures:[{lbl:'1 cup (240g)',kcal:158,pro:4.1,cho:26.9,fat:3.8,kj:670},{lbl:'½ cup (120g)',kcal:79,pro:2.0,cho:13.5,fat:1.9,kj:335},{lbl:'1 bowl (300g)',kcal:198,pro:5.1,cho:33.6,fat:4.8,kj:837}] },
  { id:'oats_raw', cat:'Staples', name:'Oats, raw (Maotsi)', measures:[{lbl:'½ cup (40g)',kcal:170,pro:4.3,cho:28.7,fat:4.2,kj:715},{lbl:'¼ cup (20g)',kcal:85,pro:2.1,cho:14.4,fat:2.1,kj:357},{lbl:'1 tbsp (10g)',kcal:42,pro:1.1,cho:7.2,fat:1.0,kj:179}] },
  { id:'plantain_boiled', cat:'Staples', name:'Plantain, green, boiled (Matochi)', measures:[{lbl:'1 medium (120g)',kcal:149,pro:1.6,cho:35.8,fat:0.0,kj:634},{lbl:'½ medium (60g)',kcal:74,pro:0.8,cho:17.9,fat:0.0,kj:317},{lbl:'1 cup chunks (155g)',kcal:192,pro:2.0,cho:46.2,fat:0.0,kj:819}] },
  { id:'plantain_bean_casserole', cat:'Staples', name:'Plantain & bean casserole (Mbalagha za nyemba)', measures:[{lbl:'1 cup (240g)',kcal:214,pro:3.1,cho:40.3,fat:4.3,kj:902},{lbl:'½ cup (120g)',kcal:107,pro:1.6,cho:20.2,fat:2.2,kj:451},{lbl:'1 plate relish (200g)',kcal:178,pro:2.6,cho:33.6,fat:3.6,kj:752}] },
  { id:'plantain_beef_casserole', cat:'Staples', name:'Plantain & beef casserole (Mbalagha za nyama ya ng\'ombe)', measures:[{lbl:'1 cup (240g)',kcal:254,pro:13.2,cho:39.4,fat:4.8,kj:1075},{lbl:'½ cup (120g)',kcal:127,pro:6.6,cho:19.7,fat:2.4,kj:538},{lbl:'1 plate relish (200g)',kcal:212,pro:11.0,cho:32.8,fat:4.0,kj:896}] },
  { id:'plantain_fish_casserole', cat:'Staples', name:'Plantain & fish casserole (Mbalagha za usipa)', measures:[{lbl:'1 cup (240g)',kcal:336,pro:28.3,cho:46.8,fat:3.8,kj:1423},{lbl:'½ cup (120g)',kcal:168,pro:14.2,cho:23.4,fat:1.9,kj:712},{lbl:'1 plate relish (200g)',kcal:280,pro:23.6,cho:39.0,fat:3.2,kj:1186}] },
  { id:'rice_porridge', cat:'Staples', name:'Rice porridge (Phala la mpunga)', measures:[{lbl:'1 cup (250g)',kcal:105,pro:2.0,cho:22.0,fat:1.3,kj:450},{lbl:'½ cup (125g)',kcal:53,pro:1.0,cho:11.0,fat:0.6,kj:225},{lbl:'1 bowl (300g)',kcal:126,pro:2.4,cho:26.4,fat:1.5,kj:540}] },
  { id:'rice_brown', cat:'Staples', name:'Rice, brown, raw (Mpunga wa bulawuni)', measures:[{lbl:'¼ cup dry (45g → ~130g cooked)',kcal:161,pro:3.5,cho:34.4,fat:1.0,kj:681},{lbl:'½ cup dry (90g)',kcal:321,pro:7.0,cho:68.8,fat:2.0,kj:1362},{lbl:'1 cup cooked (195g)',kcal:216,pro:5.0,cho:44.8,fat:1.8,kj:914}] },
  { id:'maize_soy_flour', cat:'Staples', name:'Likuni Phala flour / Maize-soy flour, commercial (Ufa wosakaniza chimanga ndi soya)', measures:[{lbl:'½ cup dry (60g)',kcal:242,pro:8.5,cho:40.9,fat:4.9,kj:1022},{lbl:'¼ cup dry (30g)',kcal:121,pro:4.3,cho:20.5,fat:2.5,kj:511},{lbl:'1 tbsp (10g)',kcal:40,pro:1.4,cho:6.8,fat:0.8,kj:170}] },
  { id:'likuni_phala_porridge', cat:'Staples', name:'Likuni Phala porridge, cooked (Phala la ufa wosakaniza chimanga ndi soya)', measures:[{lbl:'1 cup (250g)',kcal:233,pro:8.9,cho:43.0,fat:4.3,kj:978},{lbl:'½ cup (125g)',kcal:116,pro:4.4,cho:21.5,fat:2.1,kj:489},{lbl:'1 bowl (300g)',kcal:279,pro:10.7,cho:51.6,fat:5.1,kj:1174},{lbl:'1 tbsp (15g)',kcal:14,pro:0.5,cho:2.6,fat:0.3,kj:59}] },
  { id:'sweet_potato_orange', cat:'Staples', name:'Sweet potato, orange-fleshed, raw (Mbatata yofila mkati)', measures:[{lbl:'1 medium (130g)',kcal:105,pro:2.3,cho:23.5,fat:0.1,kj:446},{lbl:'½ medium (65g)',kcal:53,pro:1.2,cho:11.8,fat:0.1,kj:223},{lbl:'1 cup chunks (133g)',kcal:108,pro:2.4,cho:24.1,fat:0.1,kj:456}] },
  { id:'sweet_potato_orange_milk', cat:'Staples', name:'Sweet potato, orange-fleshed, with milk (Mbatata yofila ndi mkaka)', measures:[{lbl:'1 cup (240g)',kcal:137,pro:4.1,cho:20.2,fat:4.3,kj:573},{lbl:'½ cup (120g)',kcal:68,pro:2.0,cho:10.1,fat:2.2,kj:287},{lbl:'1 plate (200g)',kcal:114,pro:3.4,cho:16.8,fat:3.6,kj:477}] },
  { id:'steamed_maize_banana', cat:'Staples', name:'Steamed maize & banana snack (Mkate)', measures:[{lbl:'1 piece (80g)',kcal:176,pro:4.3,cho:29.5,fat:4.6,kj:742},{lbl:'2 pieces (160g)',kcal:352,pro:8.6,cho:59.0,fat:9.1,kj:1485},{lbl:'½ piece (40g)',kcal:88,pro:2.2,cho:14.8,fat:2.3,kj:371}] },
  { id:'potato_pie', cat:'Staples', name:'Potato pie', measures:[{lbl:'1 slice (120g)',kcal:167,pro:3.2,cho:16.4,fat:9.8,kj:700},{lbl:'½ slice (60g)',kcal:83,pro:1.6,cho:8.2,fat:4.9,kj:350},{lbl:'1 small portion (80g)',kcal:111,pro:2.2,cho:11.0,fat:6.6,kj:466}] },
  { id:'samoosa_dough', cat:'Staples', name:'Samoosa dough, raw', measures:[{lbl:'1 samoosa worth (30g)',kcal:93,pro:2.0,cho:12.1,fat:4.1,kj:389},{lbl:'2 samoosas (60g)',kcal:185,pro:4.0,cho:24.2,fat:8.1,kj:779}] },
  { id:'cocoyam_boiled', cat:'Staples', name:'Cocoyam, boiled (Masimbi/koko)', measures:[{lbl:'1 cup chunks (155g)',kcal:225,pro:3.9,cho:51.5,fat:0.3,kj:952},{lbl:'½ cup (78g)',kcal:113,pro:1.9,cho:25.8,fat:0.2,kj:476},{lbl:'1 medium piece (100g)',kcal:145,pro:2.5,cho:33.2,fat:0.2,kj:614}] },
  { id:'maize_green_boiled', cat:'Staples', name:'Maize, green, boiled (Dowe chopika)', measures:[{lbl:'½ cob (~100g edible)',kcal:133,pro:3.3,cho:26.6,fat:1.5,kj:564},{lbl:'1 cob (~200g edible)',kcal:266,pro:6.6,cho:53.2,fat:3.0,kj:1128},{lbl:'¼ cup kernels (40g)',kcal:53,pro:1.3,cho:10.6,fat:0.6,kj:226}] },
  { id:'maize_bran', cat:'Staples', name:'Maize bran (Deya / Gaga)', measures:[{lbl:'1 tbsp (10g)',kcal:38,pro:1.2,cho:6.8,fat:0.7,kj:161},{lbl:'¼ cup (28g)',kcal:107,pro:3.3,cho:18.9,fat:2.0,kj:451},{lbl:'½ cup (55g)',kcal:210,pro:6.4,cho:37.1,fat:4.0,kj:886}] },
  // LEGUMES
  { id:'beans', cat:'Legumes', name:'Beans (boiled, any type)', measures:[{lbl:'1 cup / chikombe (177g)',kcal:245,pro:15,cho:44,fat:1.0,kj:1026},{lbl:'½ cup (89g)',kcal:123,pro:7.5,cho:22,fat:0.5,kj:513},{lbl:'1 plate relish serving (~120g)',kcal:166,pro:10,cho:30,fat:0.7,kj:695},{lbl:'1 tablespoon (20g)',kcal:28,pro:1.7,cho:5,fat:0.1,kj:117}] },
  { id:'groundnuts', cat:'Legumes', name:'Groundnuts (nzama, roasted)', measures:[{lbl:'1 tablespoon (15g)',kcal:86,pro:3.5,cho:2.8,fat:7.3,kj:360},{lbl:'2 tablespoons (30g)',kcal:172,pro:7.0,cho:5.6,fat:14.6,kj:720},{lbl:'1 handful (35g)',kcal:201,pro:8.2,cho:6.5,fat:17,kj:842},{lbl:'¼ cup (35g)',kcal:201,pro:8.2,cho:6.5,fat:17,kj:842}] },
  { id:'peanut_butter', cat:'Legumes', name:'Peanut butter (groundnut paste)', measures:[{lbl:'1 tablespoon (16g)',kcal:94,pro:4.0,cho:3,fat:8,kj:394},{lbl:'2 tablespoons (32g)',kcal:188,pro:8.0,cho:6,fat:16,kj:788},{lbl:'1 teaspoon (5g)',kcal:29,pro:1.25,cho:1,fat:2.5,kj:123}] },
  { id:'soya', cat:'Legumes', name:'Soya bean (cooked)', measures:[{lbl:'½ cup (86g)',kcal:149,pro:14.3,cho:8.5,fat:7.7,kj:624},{lbl:'1 cup (172g)',kcal:298,pro:28.6,cho:17,fat:15.4,kj:1248}] },
  // Topsoy — Textured Soya Protein (TSP) pieces; per-100g values read from pack label
  // Barcode: 6009681152934 (EAN-13, GS1 prefix 600 — South Africa / distributed regionally)
  // Source: pack label scan (Topsoy brand); values are "per 100 g dry product"
  { id:'soya_pieces_topsoy', cat:'Legumes', name:'Soya pieces / TSP, dry (Topsoy)',
    altNames:['textured soya protein','TSP','soya mince','soya chunks','topsoy'],
    barcode:'6009681152934',
    brand:'Topsoy',
    sourceLabel:'Pack label (Topsoy, per 100 g dry)',
    kcal:358, kj:1500, pro:42, cho:28, fat:5, fiber:16, sodium:null,
    measures:[
      {lbl:'1 cup dry (100 g)',    kcal:358, pro:42,   cho:28,   fat:5,    kj:1500},
      {lbl:'½ cup dry (50 g)',     kcal:179, pro:21,   cho:14,   fat:2.5,  kj:750 },
      {lbl:'¼ cup dry (25 g)',     kcal:90,  pro:10.5, cho:7,    fat:1.25, kj:375 },
      {lbl:'1 tablespoon dry (15 g)', kcal:54, pro:6.3, cho:4.2, fat:0.75, kj:225 },
    ],
  },
  { id:'lentils', cat:'Legumes', name:'Lentils (cooked)', measures:[{lbl:'½ cup (99g)',kcal:115,pro:9.0,cho:20,fat:0.4,kj:481},{lbl:'1 cup (198g)',kcal:230,pro:18,cho:40,fat:0.8,kj:962}] },
  { id:'pigeon_peas', cat:'Legumes', name:'Pigeon peas (nandolo, cooked)', measures:[{lbl:'½ cup (85g)',kcal:102,pro:5.7,cho:18,fat:0.6,kj:427},{lbl:'1 cup (170g)',kcal:204,pro:11.4,cho:36,fat:1.2,kj:854},{lbl:'1 plate relish (~120g)',kcal:144,pro:8.0,cho:25,fat:0.8,kj:603}] },
  // VEGETABLES (MW04 — 36 items, Malawi FCT, portions from MW04 database)
  { id:'sweet_potato_leaves', cat:'Vegetables', name:'Sweet potato leaves (cooked)', measures:[{lbl:'1 cup (130g)',kcal:44,pro:5.0,cho:6,fat:0.4,kj:184},{lbl:'½ cup (65g)',kcal:22,pro:2.5,cho:3,fat:0.2,kj:92},{lbl:'1 plate relish (100g)',kcal:34,pro:3.8,cho:4.6,fat:0.3,kj:142}] },
  { id:'lima_beans_fresh', cat:'Vegetables', name:'Lima beans, green (fresh)', measures:[{lbl:'1 cup (100g)',kcal:115,pro:7.8,cho:20.9,fat:0.4,kj:481},{lbl:'½ cup (50g)',kcal:58,pro:3.9,cho:10.4,fat:0.2,kj:240},{lbl:'1 tbsp (15g)',kcal:17,pro:1.2,cho:3.1,fat:0.1,kj:72},{lbl:'1 handful (50g)',kcal:58,pro:3.9,cho:10.4,fat:0.2,kj:240}] },
  { id:'blackjack_stew', cat:'Vegetables', name:'Black jack leaves stew', measures:[{lbl:'1 cup (240g)',kcal:89,pro:7.9,cho:10.8,fat:2.9,kj:372},{lbl:'½ cup (120g)',kcal:44,pro:4.0,cho:5.4,fat:1.4,kj:186},{lbl:'1 tbsp (15g)',kcal:6,pro:0.5,cho:0.7,fat:0.2,kj:23},{lbl:'1 plate relish (120g)',kcal:44,pro:4.0,cho:5.4,fat:1.4,kj:186}] },
  { id:'chinese_cabbage_boiled', cat:'Vegetables', name:'Chinese cabbage, boiled', measures:[{lbl:'1 cup (180g)',kcal:22,pro:2.7,cho:3.2,fat:0.4,kj:90},{lbl:'½ cup (90g)',kcal:11,pro:1.4,cho:1.6,fat:0.2,kj:45},{lbl:'1 tbsp (15g)',kcal:2,pro:0.2,cho:0.3,fat:0.03,kj:8},{lbl:'1 plate relish (100g)',kcal:12,pro:1.5,cho:1.8,fat:0.2,kj:50}] },
  { id:'cabbage_raw', cat:'Vegetables', name:'Cabbage (raw)', measures:[{lbl:'1 cup (30g)',kcal:8,pro:0.4,cho:1.7,fat:0.03,kj:32},{lbl:'½ cup (15g)',kcal:4,pro:0.2,cho:0.9,fat:0.02,kj:16},{lbl:'1 tbsp (5g)',kcal:1,pro:0.1,cho:0.3,fat:0.01,kj:5},{lbl:'1 handful (40g)',kcal:10,pro:0.5,cho:2.3,fat:0.04,kj:42}] },
  { id:'carrot_raw', cat:'Vegetables', name:'Carrot (raw)', measures:[{lbl:'1 cup (110g)',kcal:45,pro:1.0,cho:10.6,fat:0.2,kj:189},{lbl:'½ cup (55g)',kcal:23,pro:0.5,cho:5.3,fat:0.1,kj:95},{lbl:'1 tbsp (15g)',kcal:6,pro:0.1,cho:1.4,fat:0.03,kj:26},{lbl:'1 medium (61g)',kcal:25,pro:0.5,cho:5.9,fat:0.1,kj:105}] },
  { id:'eggplant_fritters', cat:'Vegetables', name:'Eggplant fritters (fried)', measures:[{lbl:'1 cup (240g)',kcal:401,pro:3.8,cho:36.0,fat:26.4,kj:1678},{lbl:'½ cup (120g)',kcal:200,pro:1.9,cho:18.0,fat:13.2,kj:839},{lbl:'1 tbsp (15g)',kcal:25,pro:0.2,cho:2.3,fat:1.7,kj:105}] },
  { id:'eggplant_raw', cat:'Vegetables', name:'Eggplant (raw)', measures:[{lbl:'1 cup (82g)',kcal:21,pro:0.8,cho:4.8,fat:0.2,kj:86},{lbl:'½ cup (41g)',kcal:10,pro:0.4,cho:2.4,fat:0.1,kj:43},{lbl:'1 tbsp (12g)',kcal:3,pro:0.1,cho:0.7,fat:0.02,kj:13}] },
  { id:'green_beans_raw', cat:'Vegetables', name:'Green beans (raw)', measures:[{lbl:'1 cup (100g)',kcal:31,pro:1.8,cho:7.0,fat:0.1,kj:130},{lbl:'½ cup (50g)',kcal:16,pro:0.9,cho:3.5,fat:0.05,kj:65},{lbl:'1 tbsp (15g)',kcal:5,pro:0.3,cho:1.1,fat:0.02,kj:20}] },
  { id:'green_pepper_raw', cat:'Vegetables', name:'Green pepper (raw)', measures:[{lbl:'1 cup (90g)',kcal:18,pro:0.8,cho:4.1,fat:0.2,kj:76},{lbl:'½ cup (45g)',kcal:9,pro:0.4,cho:2.1,fat:0.1,kj:38},{lbl:'1 tbsp (12g)',kcal:2,pro:0.1,cho:0.6,fat:0.02,kj:10}] },
  { id:'amaranth_boiled', cat:'Vegetables', name:'Amaranth leaves (bonongwe, boiled)', measures:[{lbl:'1 cup (180g)',kcal:36,pro:3.6,cho:6.3,fat:0.3,kj:151},{lbl:'½ cup (90g)',kcal:18,pro:1.8,cho:3.2,fat:0.1,kj:76},{lbl:'1 tbsp (15g)',kcal:3,pro:0.3,cho:0.5,fat:0.02,kj:13},{lbl:'1 plate relish (120g)',kcal:24,pro:2.4,cho:4.2,fat:0.2,kj:101}] },
  { id:'amaranth_raw', cat:'Vegetables', name:'Amaranth leaves (bonongwe, raw)', measures:[{lbl:'1 cup (30g)',kcal:7,pro:0.8,cho:1.1,fat:0.1,kj:29},{lbl:'½ cup (15g)',kcal:3,pro:0.4,cho:0.6,fat:0.05,kj:14},{lbl:'1 tbsp (5g)',kcal:1,pro:0.1,cho:0.2,fat:0.02,kj:5}] },
  { id:'blackjack_raw', cat:'Vegetables', name:'Black jack leaves (raw)', measures:[{lbl:'1 cup (30g)',kcal:13,pro:1.1,cho:2.3,fat:0.2,kj:54},{lbl:'½ cup (15g)',kcal:6,pro:0.6,cho:1.1,fat:0.1,kj:27},{lbl:'1 tbsp (5g)',kcal:2,pro:0.2,cho:0.4,fat:0.03,kj:9}] },
  { id:'cassava_leaves_boiled', cat:'Vegetables', name:'Cassava leaves (boiled)', measures:[{lbl:'1 cup (180g)',kcal:97,pro:8.1,cho:16.2,fat:0.9,kj:407},{lbl:'½ cup (90g)',kcal:49,pro:4.1,cho:8.1,fat:0.5,kj:203},{lbl:'1 tbsp (15g)',kcal:8,pro:0.7,cho:1.4,fat:0.1,kj:34},{lbl:'1 plate relish (120g)',kcal:65,pro:5.4,cho:10.8,fat:0.6,kj:271}] },
  { id:'cassava_leaves_raw', cat:'Vegetables', name:'Cassava leaves (raw)', measures:[{lbl:'1 cup (30g)',kcal:21,pro:2.0,cho:3.3,fat:0.2,kj:87},{lbl:'½ cup (15g)',kcal:10,pro:1.0,cho:1.7,fat:0.1,kj:43},{lbl:'1 tbsp (5g)',kcal:3,pro:0.3,cho:0.6,fat:0.03,kj:14}] },
  { id:'cats_whiskers', cat:'Vegetables', name:"Cat's whiskers leaves (luni, raw)", measures:[{lbl:'1 cup (30g)',kcal:11,pro:1.0,cho:1.7,fat:0.2,kj:44},{lbl:'½ cup (15g)',kcal:5,pro:0.5,cho:0.8,fat:0.1,kj:22},{lbl:'1 tbsp (5g)',kcal:2,pro:0.2,cho:0.3,fat:0.03,kj:7}] },
  { id:'jews_mallow', cat:'Vegetables', name:"Jew's mallow leaves (raw)", measures:[{lbl:'1 cup (30g)',kcal:11,pro:1.4,cho:1.7,fat:0.2,kj:48},{lbl:'½ cup (15g)',kcal:6,pro:0.7,cho:0.9,fat:0.1,kj:24},{lbl:'1 tbsp (5g)',kcal:2,pro:0.2,cho:0.3,fat:0.03,kj:8}] },
  { id:'okra_leaves_boiled', cat:'Vegetables', name:'Okra leaves (boiled)', measures:[{lbl:'1 cup (180g)',kcal:58,pro:5.4,cho:9.0,fat:0.7,kj:241},{lbl:'½ cup (90g)',kcal:29,pro:2.7,cho:4.5,fat:0.4,kj:121},{lbl:'1 tbsp (15g)',kcal:5,pro:0.5,cho:0.8,fat:0.1,kj:20},{lbl:'1 plate relish (100g)',kcal:32,pro:3.0,cho:5.0,fat:0.4,kj:134}] },
  { id:'pumpkin_leaves_boiled', cat:'Vegetables', name:'Pumpkin leaves (chibwabwa, boiled)', measures:[{lbl:'1 cup (180g)',kcal:63,pro:7.2,cho:7.2,fat:0.9,kj:265},{lbl:'½ cup (90g)',kcal:32,pro:3.6,cho:3.6,fat:0.5,kj:132},{lbl:'1 tbsp (15g)',kcal:5,pro:0.6,cho:0.6,fat:0.1,kj:22},{lbl:'1 plate relish (120g)',kcal:42,pro:4.8,cho:4.8,fat:0.6,kj:176}] },
  { id:'pumpkin_leaves_raw', cat:'Vegetables', name:'Pumpkin leaves (chibwabwa, raw)', measures:[{lbl:'1 cup (30g)',kcal:8,pro:0.9,cho:0.9,fat:0.1,kj:32},{lbl:'½ cup (15g)',kcal:4,pro:0.5,cho:0.5,fat:0.06,kj:16},{lbl:'1 tbsp (5g)',kcal:1,pro:0.2,cho:0.2,fat:0.02,kj:5}] },
  { id:'rape_raw', cat:'Vegetables', name:'Rape leaves / kale (nkhwani, raw)', measures:[{lbl:'1 cup (30g)',kcal:10,pro:0.9,cho:1.4,fat:0.2,kj:43},{lbl:'½ cup (15g)',kcal:5,pro:0.5,cho:0.7,fat:0.1,kj:21},{lbl:'1 tbsp (5g)',kcal:2,pro:0.2,cho:0.2,fat:0.03,kj:7}] },
  { id:'roselle_raw', cat:'Vegetables', name:'Roselle leaves (raw)', measures:[{lbl:'1 cup (30g)',kcal:13,pro:0.6,cho:2.8,fat:0.2,kj:55},{lbl:'½ cup (15g)',kcal:7,pro:0.3,cho:1.4,fat:0.1,kj:28},{lbl:'1 tbsp (5g)',kcal:2,pro:0.1,cho:0.5,fat:0.03,kj:9}] },
  { id:'mushroom_stew_gf', cat:'Vegetables', name:'Mushroom stew with groundnut flour', measures:[{lbl:'1 cup (240g)',kcal:228,pro:10.8,cho:14.4,fat:15.6,kj:955},{lbl:'½ cup (120g)',kcal:114,pro:5.4,cho:7.2,fat:7.8,kj:478},{lbl:'1 tbsp (15g)',kcal:14,pro:0.7,cho:0.9,fat:1.0,kj:60},{lbl:'1 plate relish (180g)',kcal:171,pro:8.1,cho:10.8,fat:11.7,kj:716}] },
  { id:'mushroom_cantherellus', cat:'Vegetables', name:'Mushroom indigenous (Cantherellus)', measures:[{lbl:'1 cup (70g)',kcal:27,pro:1.1,cho:4.8,fat:0.4,kj:111},{lbl:'½ cup (35g)',kcal:13,pro:0.5,cho:2.4,fat:0.2,kj:56},{lbl:'1 tbsp (10g)',kcal:4,pro:0.2,cho:0.7,fat:0.05,kj:16},{lbl:'1 handful (40g)',kcal:15,pro:0.6,cho:2.8,fat:0.2,kj:64}] },
  { id:'mushroom_termitomyces', cat:'Vegetables', name:'Mushroom indigenous (Termitomyces)', measures:[{lbl:'1 cup (70g)',kcal:25,pro:2.1,cho:3.9,fat:0.3,kj:103},{lbl:'½ cup (35g)',kcal:12,pro:1.1,cho:1.9,fat:0.1,kj:51},{lbl:'1 tbsp (10g)',kcal:4,pro:0.3,cho:0.6,fat:0.04,kj:15},{lbl:'1 handful (40g)',kcal:14,pro:1.2,cho:2.2,fat:0.2,kj:59}] },
  { id:'oyster_mushroom', cat:'Vegetables', name:'Oyster mushroom (raw)', measures:[{lbl:'1 cup (70g)',kcal:23,pro:2.3,cho:4.3,fat:0.3,kj:97},{lbl:'½ cup (35g)',kcal:12,pro:1.2,cho:2.1,fat:0.1,kj:48},{lbl:'1 tbsp (10g)',kcal:3,pro:0.3,cho:0.6,fat:0.04,kj:14},{lbl:'1 handful (40g)',kcal:13,pro:1.3,cho:2.4,fat:0.2,kj:55}] },
  { id:'mushroom_relish', cat:'Vegetables', name:'Mushroom relish (cooked)', measures:[{lbl:'1 cup (240g)',kcal:108,pro:6.0,cho:14.4,fat:3.6,kj:451},{lbl:'½ cup (120g)',kcal:54,pro:3.0,cho:7.2,fat:1.8,kj:226},{lbl:'1 tbsp (15g)',kcal:7,pro:0.4,cho:0.9,fat:0.2,kj:28},{lbl:'1 plate relish (150g)',kcal:68,pro:3.8,cho:9.0,fat:2.3,kj:282}] },
  { id:'button_mushroom', cat:'Vegetables', name:'White button mushroom (raw)', measures:[{lbl:'1 cup (70g)',kcal:15,pro:2.2,cho:2.3,fat:0.2,kj:64},{lbl:'½ cup (35g)',kcal:8,pro:1.1,cho:1.2,fat:0.1,kj:32},{lbl:'1 tbsp (10g)',kcal:2,pro:0.3,cho:0.3,fat:0.03,kj:9},{lbl:'1 handful (40g)',kcal:9,pro:1.2,cho:1.3,fat:0.1,kj:37}] },
  { id:'okra_relish', cat:'Vegetables', name:'Okra relish (therere)', measures:[{lbl:'1 cup (240g)',kcal:96,pro:4.8,cho:15.6,fat:2.9,kj:401},{lbl:'½ cup (120g)',kcal:48,pro:2.4,cho:7.8,fat:1.4,kj:200},{lbl:'1 tbsp (15g)',kcal:6,pro:0.3,cho:1.0,fat:0.2,kj:25},{lbl:'1 plate relish (150g)',kcal:60,pro:3.0,cho:9.8,fat:1.8,kj:250}] },
  { id:'okra_stew', cat:'Vegetables', name:'Okra stew (therere, cooked)', measures:[{lbl:'1 cup (240g)',kcal:132,pro:6.0,cho:16.8,fat:6.0,kj:552},{lbl:'½ cup (120g)',kcal:66,pro:3.0,cho:8.4,fat:3.0,kj:276},{lbl:'1 tbsp (15g)',kcal:8,pro:0.4,cho:1.1,fat:0.4,kj:35},{lbl:'1 plate relish (150g)',kcal:83,pro:3.8,cho:10.5,fat:3.8,kj:345}] },
  { id:'okra_raw', cat:'Vegetables', name:'Okra (therere, raw)', measures:[{lbl:'1 cup (100g)',kcal:33,pro:1.9,cho:7.5,fat:0.1,kj:138},{lbl:'½ cup (50g)',kcal:17,pro:1.0,cho:3.8,fat:0.05,kj:69},{lbl:'1 tbsp (15g)',kcal:5,pro:0.3,cho:1.1,fat:0.02,kj:21}] },
  { id:'onion_raw', cat:'Vegetables', name:'Onion (raw)', measures:[{lbl:'1 cup (160g)',kcal:64,pro:1.8,cho:14.9,fat:0.2,kj:267},{lbl:'½ cup (80g)',kcal:32,pro:0.9,cho:7.4,fat:0.1,kj:134},{lbl:'1 tbsp (10g)',kcal:4,pro:0.1,cho:0.9,fat:0.01,kj:17},{lbl:'1 medium (110g)',kcal:44,pro:1.2,cho:10.2,fat:0.1,kj:184},{lbl:'½ medium (55g)',kcal:22,pro:0.6,cho:5.1,fat:0.06,kj:92}] },
  { id:'peas_raw', cat:'Vegetables', name:'Peas, green (raw)', measures:[{lbl:'1 cup (100g)',kcal:81,pro:5.4,cho:14.5,fat:0.4,kj:339},{lbl:'½ cup (50g)',kcal:41,pro:2.7,cho:7.3,fat:0.2,kj:170},{lbl:'1 tbsp (15g)',kcal:12,pro:0.8,cho:2.2,fat:0.1,kj:51}] },
  { id:'pumpkin_leaves_stew', cat:'Vegetables', name:'Pumpkin leaves stew (chibwabwa)', measures:[{lbl:'1 cup (240g)',kcal:108,pro:8.4,cho:10.8,fat:4.8,kj:451},{lbl:'½ cup (120g)',kcal:54,pro:4.2,cho:5.4,fat:2.4,kj:226},{lbl:'1 tbsp (15g)',kcal:7,pro:0.5,cho:0.7,fat:0.3,kj:28},{lbl:'1 plate relish (150g)',kcal:68,pro:5.3,cho:6.8,fat:3.0,kj:282}] },
  { id:'pumpkin_boiled', cat:'Vegetables', name:'Pumpkin (boiled)', measures:[{lbl:'1 cup (120g)',kcal:31,pro:1.2,cho:7.8,fat:0.1,kj:131},{lbl:'½ cup (60g)',kcal:16,pro:0.6,cho:3.9,fat:0.06,kj:65},{lbl:'1 tbsp (15g)',kcal:4,pro:0.2,cho:1.0,fat:0.02,kj:16},{lbl:'1 medium wedge (80g)',kcal:21,pro:0.8,cho:5.2,fat:0.08,kj:87}] },
  { id:'tomato_soup', cat:'Vegetables', name:'Tomato soup (cooked)', measures:[{lbl:'1 cup (240g)',kcal:91,pro:2.2,cho:19.2,fat:1.7,kj:382},{lbl:'½ cup (120g)',kcal:46,pro:1.1,cho:9.6,fat:0.8,kj:191},{lbl:'1 tbsp (15g)',kcal:6,pro:0.1,cho:1.2,fat:0.1,kj:24}] },
  { id:'tomato_raw', cat:'Vegetables', name:'Tomato (raw)', measures:[{lbl:'1 cup (180g)',kcal:32,pro:1.6,cho:7.0,fat:0.4,kj:135},{lbl:'½ cup (90g)',kcal:16,pro:0.8,cho:3.5,fat:0.2,kj:68},{lbl:'1 tbsp (12g)',kcal:2,pro:0.1,cho:0.5,fat:0.02,kj:9},{lbl:'1 medium (123g)',kcal:22,pro:1.1,cho:4.8,fat:0.2,kj:92},{lbl:'1 small (80g)',kcal:14,pro:0.7,cho:3.1,fat:0.2,kj:60}] },
  // PROTEIN FOODS
  { id:'beef', cat:'Protein Foods', name:'Beef (cooked, lean)', measures:[{lbl:'30g (matchbox size)',kcal:61,pro:9.3,cho:0,fat:2.5,kj:255},{lbl:'60g',kcal:122,pro:18.6,cho:0,fat:5,kj:510},{lbl:'90g (1 small piece)',kcal:183,pro:27.9,cho:0,fat:7.5,kj:765},{lbl:'½ cup minced (100g)',kcal:215,pro:28,cho:0,fat:11,kj:900}] },
  { id:'chicken', cat:'Protein Foods', name:'Chicken (cooked, no skin)', measures:[{lbl:'30g',kcal:50,pro:9.5,cho:0,fat:1.4,kj:209},{lbl:'60g',kcal:100,pro:19,cho:0,fat:2.8,kj:418},{lbl:'1 drumstick (~80g)',kcal:133,pro:25,cho:0,fat:3.7,kj:557},{lbl:'1 breast half (~90g)',kcal:150,pro:28,cho:0,fat:4.2,kj:628}] },
  { id:'usipa', cat:'Protein Foods', name:'Usipa / Kapenta (dried small fish)', measures:[{lbl:'1 tablespoon (10g)',kcal:33,pro:6.5,cho:0,fat:0.7,kj:138},{lbl:'2 tablespoons (20g)',kcal:66,pro:13,cho:0,fat:1.4,kj:276},{lbl:'1 handful (30g)',kcal:99,pro:19.5,cho:0,fat:2.1,kj:414},{lbl:'¼ cup (25g)',kcal:83,pro:16.3,cho:0,fat:1.75,kj:347}] },
  { id:'chambo', cat:'Protein Foods', name:'Chambo fish (fresh, cooked)', measures:[{lbl:'30g',kcal:39,pro:8.5,cho:0,fat:0.6,kj:163},{lbl:'60g',kcal:78,pro:17,cho:0,fat:1.2,kj:326},{lbl:'1 medium fillet (120g)',kcal:156,pro:34,cho:0,fat:2.4,kj:653},{lbl:'1 small fillet (80g)',kcal:104,pro:22.7,cho:0,fat:1.6,kj:435}] },
  { id:'tilapia', cat:'Protein Foods', name:'Tilapia (cooked)', measures:[{lbl:'60g',kcal:84,pro:17.6,cho:0,fat:1.7,kj:352},{lbl:'1 medium fillet (120g)',kcal:168,pro:35,cho:0,fat:3.4,kj:703},{lbl:'30g',kcal:42,pro:8.8,cho:0,fat:0.85,kj:176}] },
  { id:'egg', cat:'Protein Foods', name:'Egg (whole, boiled)', measures:[{lbl:'1 large egg (50g)',kcal:72,pro:6.3,cho:0.4,fat:4.8,kj:301},{lbl:'2 eggs (100g)',kcal:144,pro:12.6,cho:0.8,fat:9.6,kj:602},{lbl:'1 small egg (40g)',kcal:58,pro:5.0,cho:0.3,fat:3.8,kj:243}] },
  { id:'milk_fc', cat:'Protein Foods', name:'Milk (full cream)', measures:[{lbl:'1 cup / chikombe (250mL)',kcal:152,pro:7.7,cho:11.7,fat:8.1,kj:636},{lbl:'½ cup (125mL)',kcal:76,pro:3.85,cho:5.85,fat:4.05,kj:318},{lbl:'1 tablespoon (15mL)',kcal:9,pro:0.46,cho:0.7,fat:0.49,kj:38},{lbl:'1 glass/gilasi (200mL)',kcal:122,pro:6.2,cho:9.4,fat:6.5,kj:509}] },
  { id:'lacto', cat:'Protein Foods', name:'Lacto / Sour milk (mageu)', measures:[{lbl:'1 cup (250mL)',kcal:165,pro:8.5,cho:14,fat:7,kj:691},{lbl:'½ cup (125mL)',kcal:83,pro:4.25,cho:7,fat:3.5,kj:345}] },
  { id:'liver', cat:'Protein Foods', name:'Beef liver (cooked)', measures:[{lbl:'30g',kcal:56,pro:8.3,cho:1.1,fat:2.1,kj:234},{lbl:'60g',kcal:112,pro:16.6,cho:2.2,fat:4.2,kj:468},{lbl:'1 slice (~45g)',kcal:84,pro:12.5,cho:1.7,fat:3.2,kj:351}] },
  // FRUITS (MW05 — 25 items, Malawi FCT, portions from MW05 database)
  { id:'apple_raw', cat:'Fruits', name:'Apple (raw)', measures:[{lbl:'1 cup (150g)',kcal:78,pro:0.5,cho:20.7,fat:0.3,kj:327},{lbl:'½ cup (75g)',kcal:39,pro:0.2,cho:10.3,fat:0.2,kj:164},{lbl:'1 tbsp (15g)',kcal:8,pro:0.05,cho:2.1,fat:0.03,kj:33},{lbl:'1 medium (100g)',kcal:52,pro:0.3,cho:13.8,fat:0.2,kj:218}] },
  { id:'avocado_raw', cat:'Fruits', name:'Avocado (raw)', measures:[{lbl:'1 cup (150g)',kcal:240,pro:3.0,cho:12.8,fat:22.1,kj:1005},{lbl:'½ cup (75g)',kcal:120,pro:1.5,cho:6.4,fat:11.0,kj:502},{lbl:'1 tbsp (15g)',kcal:24,pro:0.3,cho:1.3,fat:2.2,kj:100},{lbl:'½ avocado (100g)',kcal:160,pro:2.0,cho:8.5,fat:14.7,kj:670}] },
  { id:'banana_fried', cat:'Fruits', name:'Banana, fried', measures:[{lbl:'1 cup (150g)',kcal:266,pro:1.5,cho:49.5,fat:8.2,kj:1112},{lbl:'½ cup (75g)',kcal:133,pro:0.8,cho:24.8,fat:4.1,kj:556},{lbl:'1 tbsp (15g)',kcal:27,pro:0.2,cho:5.0,fat:0.8,kj:111},{lbl:'1 medium fried (100g)',kcal:177,pro:1.0,cho:33.0,fat:5.5,kj:741}] },
  { id:'banana_raw', cat:'Fruits', name:'Banana (raw)', measures:[{lbl:'1 cup (150g)',kcal:134,pro:1.6,cho:34.5,fat:0.5,kj:560},{lbl:'½ cup (75g)',kcal:67,pro:0.8,cho:17.2,fat:0.2,kj:280},{lbl:'1 tbsp (15g)',kcal:13,pro:0.2,cho:3.5,fat:0.05,kj:56},{lbl:'1 medium (118g)',kcal:105,pro:1.3,cho:27.1,fat:0.4,kj:440},{lbl:'1 small (90g)',kcal:80,pro:1.0,cho:20.7,fat:0.3,kj:336}] },
  { id:'baobab_pulp', cat:'Fruits', name:'Baobab fruit pulp', measures:[{lbl:'1 cup (150g)',kcal:210,pro:3.5,cho:112.5,fat:0.3,kj:879},{lbl:'½ cup (75g)',kcal:105,pro:1.7,cho:56.2,fat:0.2,kj:440},{lbl:'1 tbsp (15g)',kcal:21,pro:0.3,cho:11.2,fat:0.03,kj:88},{lbl:'1 portion (50g)',kcal:70,pro:1.2,cho:37.5,fat:0.1,kj:293}] },
  { id:'custard_apple', cat:'Fruits', name:'Custard apple, wild (sweetsop)', measures:[{lbl:'1 cup (150g)',kcal:152,pro:2.6,cho:37.8,fat:0.9,kj:634},{lbl:'½ cup (75g)',kcal:76,pro:1.3,cho:18.9,fat:0.5,kj:317},{lbl:'1 tbsp (15g)',kcal:15,pro:0.3,cho:3.8,fat:0.1,kj:63},{lbl:'1 fruit (100g)',kcal:101,pro:1.7,cho:25.2,fat:0.6,kj:423}] },
  { id:'fruit_salad', cat:'Fruits', name:'Fruit salad (mixed)', measures:[{lbl:'1 cup (150g)',kcal:86,pro:1.1,cho:21.0,fat:0.5,kj:358},{lbl:'½ cup (75g)',kcal:43,pro:0.5,cho:10.5,fat:0.2,kj:179},{lbl:'1 tbsp (15g)',kcal:9,pro:0.1,cho:2.1,fat:0.05,kj:36},{lbl:'1 bowl (200g)',kcal:114,pro:1.4,cho:28.0,fat:0.6,kj:478}] },
  { id:'guava_raw', cat:'Fruits', name:'Guava (raw)', measures:[{lbl:'1 cup (150g)',kcal:102,pro:3.9,cho:21.4,fat:1.5,kj:428},{lbl:'½ cup (75g)',kcal:51,pro:2.0,cho:10.7,fat:0.8,kj:214},{lbl:'1 tbsp (15g)',kcal:10,pro:0.4,cho:2.1,fat:0.2,kj:43},{lbl:'1 medium (55g)',kcal:37,pro:1.4,cho:7.9,fat:0.6,kj:157},{lbl:'2 medium (110g)',kcal:75,pro:2.9,cho:15.7,fat:1.1,kj:314}] },
  { id:'jakjak', cat:'Fruits', name:'Jakjak fruit (monkey orange)', measures:[{lbl:'1 cup (150g)',kcal:110,pro:3.0,cho:27.0,fat:0.8,kj:458},{lbl:'½ cup (75g)',kcal:55,pro:1.5,cho:13.5,fat:0.4,kj:229},{lbl:'1 tbsp (15g)',kcal:11,pro:0.3,cho:2.7,fat:0.1,kj:46},{lbl:'1 fruit (100g)',kcal:73,pro:2.0,cho:18.0,fat:0.5,kj:305}] },
  { id:'tamarind_juice', cat:'Fruits', name:'Tamarind juice', measures:[{lbl:'1 cup (250g)',kcal:100,pro:1.0,cho:26.2,fat:0.2,kj:418},{lbl:'½ cup (125g)',kcal:50,pro:0.5,cho:13.1,fat:0.1,kj:209},{lbl:'1 tbsp (15g)',kcal:6,pro:0.1,cho:1.6,fat:0.02,kj:25},{lbl:'1 glass (250g)',kcal:100,pro:1.0,cho:26.2,fat:0.2,kj:418}] },
  { id:'baobab_juice', cat:'Fruits', name:'Baobab juice', measures:[{lbl:'1 cup (250g)',kcal:95,pro:0.8,cho:23.8,fat:0.2,kj:398},{lbl:'½ cup (125g)',kcal:48,pro:0.4,cho:11.9,fat:0.1,kj:199},{lbl:'1 tbsp (15g)',kcal:6,pro:0.04,cho:1.4,fat:0.02,kj:24},{lbl:'1 glass (250g)',kcal:95,pro:0.8,cho:23.8,fat:0.2,kj:398}] },
  { id:'orange_juice', cat:'Fruits', name:'Orange juice (fresh)', measures:[{lbl:'1 cup (250g)',kcal:112,pro:1.8,cho:26.0,fat:0.5,kj:470},{lbl:'½ cup (125g)',kcal:56,pro:0.9,cho:13.0,fat:0.2,kj:235},{lbl:'1 tbsp (15g)',kcal:7,pro:0.1,cho:1.6,fat:0.03,kj:28},{lbl:'1 glass (250g)',kcal:112,pro:1.8,cho:26.0,fat:0.5,kj:470}] },
  { id:'jujube', cat:'Fruits', name:'Jujube (Ziziphus / wild date)', measures:[{lbl:'1 cup (150g)',kcal:118,pro:1.8,cho:30.3,fat:0.3,kj:496},{lbl:'½ cup (75g)',kcal:59,pro:0.9,cho:15.2,fat:0.2,kj:248},{lbl:'1 tbsp (15g)',kcal:12,pro:0.2,cho:3.0,fat:0.03,kj:50},{lbl:'1 handful (50g)',kcal:40,pro:0.6,cho:10.1,fat:0.1,kj:166}] },
  { id:'lemon', cat:'Fruits', name:'Lemon (raw)', measures:[{lbl:'1 cup (150g)',kcal:44,pro:1.6,cho:13.9,fat:0.5,kj:182},{lbl:'½ cup (75g)',kcal:22,pro:0.8,cho:7.0,fat:0.2,kj:91},{lbl:'1 tbsp (15g)',kcal:4,pro:0.2,cho:1.4,fat:0.04,kj:18},{lbl:'1 lemon (65g)',kcal:19,pro:0.7,cho:6.0,fat:0.2,kj:79}] },
  { id:'loquat', cat:'Fruits', name:'Loquat / Masuku (raw)', measures:[{lbl:'1 cup (150g)',kcal:70,pro:0.6,cho:18.1,fat:0.3,kj:296},{lbl:'½ cup (75g)',kcal:35,pro:0.3,cho:9.1,fat:0.2,kj:148},{lbl:'1 tbsp (15g)',kcal:7,pro:0.1,cho:1.8,fat:0.03,kj:30},{lbl:'1 fruit (30g)',kcal:14,pro:0.1,cho:3.6,fat:0.06,kj:59}] },
  { id:'mango_ripe', cat:'Fruits', name:'Mango, ripe', measures:[{lbl:'1 cup (150g)',kcal:90,pro:1.2,cho:22.4,fat:0.6,kj:376},{lbl:'½ cup (75g)',kcal:45,pro:0.6,cho:11.2,fat:0.3,kj:188},{lbl:'1 tbsp (15g)',kcal:9,pro:0.1,cho:2.2,fat:0.06,kj:38},{lbl:'1 medium (200g)',kcal:120,pro:1.6,cho:29.8,fat:0.8,kj:502},{lbl:'1 slice (50g)',kcal:30,pro:0.4,cho:7.5,fat:0.2,kj:126}] },
  { id:'african_medlar', cat:'Fruits', name:'African medlar (raw)', measures:[{lbl:'1 cup (150g)',kcal:110,pro:1.1,cho:28.1,fat:0.6,kj:458},{lbl:'½ cup (75g)',kcal:55,pro:0.5,cho:14.0,fat:0.3,kj:229},{lbl:'1 tbsp (15g)',kcal:11,pro:0.1,cho:2.8,fat:0.06,kj:46},{lbl:'1 fruit (80g)',kcal:58,pro:0.6,cho:15.0,fat:0.3,kj:244}] },
  { id:'orange_raw', cat:'Fruits', name:'Orange (raw)', measures:[{lbl:'1 cup (150g)',kcal:70,pro:1.4,cho:17.7,fat:0.2,kj:296},{lbl:'½ cup (75g)',kcal:35,pro:0.7,cho:8.8,fat:0.1,kj:148},{lbl:'1 tbsp (15g)',kcal:7,pro:0.1,cho:1.8,fat:0.02,kj:30},{lbl:'1 medium (130g)',kcal:61,pro:1.2,cho:15.3,fat:0.2,kj:256},{lbl:'1 small (100g)',kcal:47,pro:0.9,cho:11.8,fat:0.1,kj:197}] },
  { id:'papaya_raw', cat:'Fruits', name:'Pawpaw / Papaya (raw)', measures:[{lbl:'1 cup (150g)',kcal:58,pro:0.9,cho:14.7,fat:0.2,kj:244},{lbl:'½ cup (75g)',kcal:29,pro:0.5,cho:7.4,fat:0.1,kj:122},{lbl:'1 tbsp (15g)',kcal:6,pro:0.1,cho:1.5,fat:0.02,kj:24},{lbl:'1 slice (100g)',kcal:39,pro:0.6,cho:9.8,fat:0.1,kj:163},{lbl:'1 medium (200g)',kcal:78,pro:1.2,cho:19.6,fat:0.2,kj:326}] },
  { id:'peach_raw', cat:'Fruits', name:'Peach (raw)', measures:[{lbl:'1 cup (150g)',kcal:58,pro:1.4,cho:14.2,fat:0.4,kj:244},{lbl:'½ cup (75g)',kcal:29,pro:0.7,cho:7.1,fat:0.2,kj:122},{lbl:'1 tbsp (15g)',kcal:6,pro:0.1,cho:1.4,fat:0.04,kj:24},{lbl:'1 peach (150g)',kcal:58,pro:1.4,cho:14.2,fat:0.4,kj:244}] },
  { id:'pineapple_raw', cat:'Fruits', name:'Pineapple (raw)', measures:[{lbl:'1 cup (150g)',kcal:75,pro:0.8,cho:19.6,fat:0.2,kj:314},{lbl:'½ cup (75g)',kcal:38,pro:0.4,cho:9.8,fat:0.1,kj:157},{lbl:'1 tbsp (15g)',kcal:8,pro:0.1,cho:2.0,fat:0.02,kj:31},{lbl:'1 slice (84g)',kcal:42,pro:0.4,cho:11.0,fat:0.1,kj:176}] },
  { id:'mobola_plum', cat:'Fruits', name:'Mobola plum (raw)', measures:[{lbl:'1 cup (150g)',kcal:112,pro:1.5,cho:28.5,fat:0.5,kj:471},{lbl:'½ cup (75g)',kcal:56,pro:0.8,cho:14.2,fat:0.2,kj:236},{lbl:'1 tbsp (15g)',kcal:11,pro:0.2,cho:2.9,fat:0.05,kj:47},{lbl:'1 fruit (50g)',kcal:38,pro:0.5,cho:9.5,fat:0.2,kj:157}] },
  { id:'ximenia_plum', cat:'Fruits', name:'Sour plum / Ximenia (raw)', measures:[{lbl:'1 cup (150g)',kcal:90,pro:1.8,cho:22.5,fat:2.2,kj:376},{lbl:'½ cup (75g)',kcal:45,pro:0.9,cho:11.2,fat:1.1,kj:188},{lbl:'1 tbsp (15g)',kcal:9,pro:0.2,cho:2.2,fat:0.2,kj:38},{lbl:'1 fruit (40g)',kcal:24,pro:0.5,cho:6.0,fat:0.6,kj:100}] },
  { id:'tamarind_fruit', cat:'Fruits', name:'Tamarind fruit (raw pulp)', measures:[{lbl:'1 cup (150g)',kcal:358,pro:4.2,cho:93.8,fat:0.9,kj:1500},{lbl:'½ cup (75g)',kcal:179,pro:2.1,cho:46.9,fat:0.5,kj:750},{lbl:'1 tbsp (15g)',kcal:36,pro:0.4,cho:9.4,fat:0.1,kj:150},{lbl:'1 pod (30g)',kcal:72,pro:0.8,cho:18.8,fat:0.2,kj:300}] },
  { id:'watermelon_raw', cat:'Fruits', name:'Watermelon (raw)', measures:[{lbl:'1 cup (150g)',kcal:45,pro:0.9,cho:11.4,fat:0.3,kj:189},{lbl:'½ cup (75g)',kcal:22,pro:0.5,cho:5.7,fat:0.2,kj:94},{lbl:'1 tbsp (15g)',kcal:4,pro:0.1,cho:1.1,fat:0.03,kj:19},{lbl:'1 slice (286g)',kcal:86,pro:1.7,cho:21.7,fat:0.6,kj:360}] },
  // FATS & OILS (MW06 — 5 items, gram weights from MW06 database)
  { id:'margarine_rama', cat:'Fats & Oils', name:'Margarine (Rama, brick)', measures:[{lbl:'1 tsp (4.7g)',kcal:34,pro:0.01,cho:0.03,fat:3.8,kj:141},{lbl:'1 tbsp (14g)',kcal:100,pro:0.03,cho:0.1,fat:11.2,kj:420},{lbl:'1 cup (227g)',kcal:1628,pro:0.5,cho:1.6,fat:181.6,kj:6810}] },
  { id:'soybean_oil_local', cat:'Fats & Oils', name:'Soybean oil, fortified (local market)', measures:[{lbl:'1 tsp (4.5g)',kcal:40,pro:0,cho:0,fat:4.5,kj:167},{lbl:'1 tbsp (13.6g)',kcal:120,pro:0,cho:0,fat:13.6,kj:503},{lbl:'1 cup (218g)',kcal:1927,pro:0,cho:0,fat:218,kj:8066}] },
  { id:'soybean_oil_super', cat:'Fats & Oils', name:'Soybean oil, fortified (supermarket)', measures:[{lbl:'1 tsp (4.5g)',kcal:40,pro:0,cho:0,fat:4.5,kj:167},{lbl:'1 tbsp (13.6g)',kcal:120,pro:0,cho:0,fat:13.6,kj:503},{lbl:'1 cup (218g)',kcal:1927,pro:0,cho:0,fat:218,kj:8066}] },
  { id:'sunflower_oil_local', cat:'Fats & Oils', name:'Sunflower oil, fortified (local market)', measures:[{lbl:'1 tsp (4.5g)',kcal:40,pro:0,cho:0,fat:4.5,kj:167},{lbl:'1 tbsp (13.6g)',kcal:120,pro:0,cho:0,fat:13.6,kj:503},{lbl:'1 cup (218g)',kcal:1927,pro:0,cho:0,fat:218,kj:8066}] },
  { id:'sunflower_oil_super', cat:'Fats & Oils', name:'Sunflower oil, fortified (supermarket)', measures:[{lbl:'1 tsp (4.5g)',kcal:40,pro:0,cho:0,fat:4.5,kj:167},{lbl:'1 tbsp (13.6g)',kcal:120,pro:0,cho:0,fat:13.6,kj:503},{lbl:'1 cup (218g)',kcal:1927,pro:0,cho:0,fat:218,kj:8066}] },
  // BEVERAGES
  { id:'tea_sugar', cat:'Beverages', name:'Tea with sugar (1 tsp sugar)', measures:[{lbl:'1 cup (240mL)',kcal:32,pro:0.5,cho:7.6,fat:0.1,kj:134},{lbl:'1 mug (350mL)',kcal:47,pro:0.7,cho:11.0,fat:0.1,kj:197}] },
  { id:'tea_milk_sugar', cat:'Beverages', name:'Tea with milk & sugar', measures:[{lbl:'1 cup (240mL)',kcal:55,pro:1.5,cho:9.0,fat:1.5,kj:230},{lbl:'1 mug (350mL)',kcal:80,pro:2.2,cho:13.0,fat:2.2,kj:335}] },
  { id:'tea_plain', cat:'Beverages', name:'Tea (plain, no milk/sugar)', measures:[{lbl:'1 cup (240mL)',kcal:2,pro:0,cho:0.5,fat:0,kj:8},{lbl:'1 mug (350mL)',kcal:3,pro:0,cho:0.7,fat:0,kj:13}] },
  { id:'coffee_black', cat:'Beverages', name:'Coffee (black, instant)', measures:[{lbl:'1 cup (240mL)',kcal:5,pro:0.3,cho:0.8,fat:0.1,kj:21},{lbl:'1 mug (350mL)',kcal:7,pro:0.4,cho:1.2,fat:0.1,kj:30}] },
  { id:'coffee_milk_sugar', cat:'Beverages', name:'Coffee with milk & sugar', measures:[{lbl:'1 cup (240mL)',kcal:62,pro:1.8,cho:10.0,fat:1.8,kj:259},{lbl:'1 mug (350mL)',kcal:90,pro:2.6,cho:14.6,fat:2.6,kj:377}] },
  { id:'maheu', cat:'Beverages', name:'Maheu (fermented maize drink)', measures:[{lbl:'1 cup (250mL)',kcal:90,pro:2.5,cho:19.0,fat:0.8,kj:377},{lbl:'½ cup (125mL)',kcal:45,pro:1.3,cho:9.5,fat:0.4,kj:188},{lbl:'1 glass (200mL)',kcal:72,pro:2.0,cho:15.2,fat:0.6,kj:301}] },
  { id:'porridge_thin', cat:'Beverages', name:'Maize porridge, thin (phala)', measures:[{lbl:'1 cup (250mL)',kcal:63,pro:1.5,cho:13.0,fat:0.5,kj:264},{lbl:'1 bowl (350mL)',kcal:88,pro:2.1,cho:18.2,fat:0.7,kj:368}] },
  { id:'sorghum_porridge_thin', cat:'Beverages', name:'Sorghum porridge, thin', measures:[{lbl:'1 cup (250mL)',kcal:75,pro:1.9,cho:15.5,fat:0.7,kj:314},{lbl:'1 bowl (350mL)',kcal:105,pro:2.7,cho:21.7,fat:1.0,kj:440}] },
  { id:'soft_drink', cat:'Beverages', name:'Soft drink / Soda (sweetened)', measures:[{lbl:'1 cup (250mL)',kcal:105,pro:0,cho:26.5,fat:0,kj:440},{lbl:'1 can (330mL)',kcal:139,pro:0,cho:35.0,fat:0,kj:580},{lbl:'1 glass (200mL)',kcal:84,pro:0,cho:21.2,fat:0,kj:352}] },
  { id:'water', cat:'Beverages', name:'Water (plain)', measures:[{lbl:'1 cup (240g)',kcal:0,pro:0,cho:0,fat:0,kj:0},{lbl:'1 glass (200mL)',kcal:0,pro:0,cho:0,fat:0,kj:0},{lbl:'1 litre (1000mL)',kcal:0,pro:0,cho:0,fat:0,kj:0}] },
  { id:'soya_drink', cat:'Beverages', name:'Soya drink / Soy milk', measures:[{lbl:'1 cup (250mL)',kcal:104,pro:6.3,cho:12.0,fat:3.5,kj:435},{lbl:'½ cup (125mL)',kcal:52,pro:3.2,cho:6.0,fat:1.8,kj:218},{lbl:'1 glass (200mL)',kcal:83,pro:5.0,cho:9.6,fat:2.8,kj:348}] },
  { id:'lacto_drink', cat:'Beverages', name:'Lacto / Sour milk drink', measures:[{lbl:'1 cup (250mL)',kcal:165,pro:8.5,cho:14.0,fat:7.0,kj:691},{lbl:'½ cup (125mL)',kcal:83,pro:4.3,cho:7.0,fat:3.5,kj:345},{lbl:'1 glass (200mL)',kcal:132,pro:6.8,cho:11.2,fat:5.6,kj:553}] },

  // EXTENDED STAPLES (raw grains, flours, prepared dishes)
  { id:'cassava_raw',    cat:'Staples', name:'Cassava (raw)', measures:[{lbl:'100g',kcal:160,pro:1.2,cho:38.0,fat:0.3,kj:670},{lbl:'1 piece (150g)',kcal:240,pro:1.8,cho:57,fat:0.5,kj:1005},{lbl:'½ cup chunks (100g)',kcal:160,pro:1.2,cho:38,fat:0.3,kj:670}] },
  { id:'rice_raw',       cat:'Staples', name:'Rice (raw, white)', measures:[{lbl:'100g',kcal:348,pro:6.0,cho:80.0,fat:0.5,kj:1456},{lbl:'1 cup dry (200g)',kcal:696,pro:12,cho:160,fat:1.0,kj:2912},{lbl:'1 handful dry (50g)',kcal:174,pro:3.0,cho:40,fat:0.3,kj:728}] },
  { id:'maize_grain',    cat:'Staples', name:'Maize grain (raw)', measures:[{lbl:'100g',kcal:335,pro:9.1,cho:70.5,fat:1.9,kj:1402},{lbl:'½ cup (75g)',kcal:251,pro:6.8,cho:52.9,fat:1.4,kj:1050}] },
  { id:'maize_flour_w',  cat:'Staples', name:'Maize flour (whole, ufa mgaiwa)', measures:[{lbl:'100g',kcal:374,pro:10.4,cho:70.8,fat:5.5,kj:1565},{lbl:'1 cup (130g)',kcal:486,pro:13.5,cho:92,fat:7.2,kj:2035},{lbl:'2 Tbsp / 30g',kcal:112,pro:3.1,cho:21.2,fat:1.7,kj:469}] },
  { id:'maize_flour_r',  cat:'Staples', name:'Maize flour (refined, ufa woyera)', measures:[{lbl:'100g',kcal:367,pro:11.0,cho:71.9,fat:3.9,kj:1536},{lbl:'1 cup (130g)',kcal:477,pro:14.3,cho:93.5,fat:5.1,kj:1997},{lbl:'2 Tbsp / 30g',kcal:110,pro:3.3,cho:21.6,fat:1.2,kj:461}] },
  { id:'sorghum_raw',    cat:'Staples', name:'Sorghum grain (raw)', measures:[{lbl:'100g',kcal:358,pro:10.3,cho:71.8,fat:3.2,kj:1498},{lbl:'1 cup (192g)',kcal:687,pro:19.8,cho:137.9,fat:6.1,kj:2877}] },
  { id:'sweet_pot_raw',  cat:'Staples', name:'Sweet potato (raw)', measures:[{lbl:'100g',kcal:81,pro:1.8,cho:18.1,fat:0.1,kj:339},{lbl:'1 medium raw (130g)',kcal:105,pro:2.3,cho:23.5,fat:0.1,kj:441},{lbl:'½ cup diced (67g)',kcal:54,pro:1.2,cho:12.1,fat:0.1,kj:227}] },
  { id:'potato_raw',     cat:'Staples', name:'Irish potato (raw)', measures:[{lbl:'100g',kcal:68,pro:2.3,cho:14.4,fat:0.1,kj:285},{lbl:'1 medium (150g)',kcal:102,pro:3.5,cho:21.6,fat:0.2,kj:427},{lbl:'½ cup diced (75g)',kcal:51,pro:1.7,cho:10.8,fat:0.1,kj:213}] },
  { id:'cocoyam',        cat:'Staples', name:'Cocoyam / Taro (boiled)', measures:[{lbl:'100g',kcal:145,pro:2.5,cho:33.2,fat:0.2,kj:607},{lbl:'1 medium (120g)',kcal:174,pro:3.0,cho:39.8,fat:0.2,kj:728},{lbl:'½ cup mashed (100g)',kcal:145,pro:2.5,cho:33.2,fat:0.2,kj:607}] },
  { id:'rice_porridge',  cat:'Staples', name:'Rice porridge (thin)', measures:[{lbl:'100g',kcal:42,pro:0.8,cho:8.8,fat:0.5,kj:176},{lbl:'1 cup (240g)',kcal:101,pro:1.9,cho:21.1,fat:1.2,kj:422},{lbl:'1 bowl (300g)',kcal:126,pro:2.4,cho:26.4,fat:1.5,kj:527}] },
  { id:'rice_pudding',   cat:'Staples', name:'Rice pudding', measures:[{lbl:'100g',kcal:50,pro:1.5,cho:5.1,fat:2.6,kj:209},{lbl:'½ cup (125g)',kcal:63,pro:1.9,cho:6.4,fat:3.3,kj:261},{lbl:'1 cup (250g)',kcal:125,pro:3.8,cho:12.8,fat:6.5,kj:523}] },
  { id:'cake_plain',     cat:'Staples', name:'Cake (plain / sponge)', measures:[{lbl:'100g',kcal:293,pro:5.6,cho:43.2,fat:10.9,kj:1226},{lbl:'1 slice (60g)',kcal:176,pro:3.4,cho:25.9,fat:6.5,kj:736},{lbl:'1 small piece (40g)',kcal:117,pro:2.2,cho:17.3,fat:4.4,kj:490}] },
  { id:'potato_pie',     cat:'Staples', name:'Potato pie', measures:[{lbl:'100g',kcal:139,pro:2.7,cho:13.7,fat:8.2,kj:582},{lbl:'1 piece (120g)',kcal:167,pro:3.2,cho:16.4,fat:9.8,kj:698}] },
  { id:'pumpkin_fritter',cat:'Staples', name:'Pumpkin fritters', measures:[{lbl:'100g',kcal:154,pro:3.8,cho:17.5,fat:7.6,kj:644},{lbl:'1 fritter (45g)',kcal:69,pro:1.7,cho:7.9,fat:3.4,kj:290},{lbl:'2 fritters (90g)',kcal:139,pro:3.4,cho:15.8,fat:6.8,kj:580}] },
  { id:'swpot_fritter',  cat:'Staples', name:'Sweet potato fritters', measures:[{lbl:'100g',kcal:198,pro:5.2,cho:18.3,fat:11.6,kj:829},{lbl:'1 fritter (50g)',kcal:99,pro:2.6,cho:9.2,fat:5.8,kj:414},{lbl:'2 fritters (100g)',kcal:198,pro:5.2,cho:18.3,fat:11.6,kj:829}] },
  { id:'samosa_dough',   cat:'Staples', name:'Samosa (dough only)', measures:[{lbl:'100g',kcal:309,pro:6.6,cho:40.3,fat:13.5,kj:1293},{lbl:'1 samosa shell (25g)',kcal:77,pro:1.7,cho:10.1,fat:3.4,kj:323}] },
  { id:'mkate',          cat:'Staples', name:'Mkate (maize + banana bread)', measures:[{lbl:'100g',kcal:220,pro:5.4,cho:36.9,fat:5.7,kj:921},{lbl:'1 slice (50g)',kcal:110,pro:2.7,cho:18.5,fat:2.9,kj:461},{lbl:'2 slices (100g)',kcal:220,pro:5.4,cho:36.9,fat:5.7,kj:921}] },
  { id:'nsima_cassava',  cat:'Staples', name:'Nsima (cassava-based)', measures:[{lbl:'100g',kcal:64,pro:0.4,cho:14.8,fat:0.4,kj:268},{lbl:'1 cup (200g)',kcal:128,pro:0.8,cho:29.6,fat:0.8,kj:536},{lbl:'Large plate (~300g)',kcal:192,pro:1.2,cho:44.4,fat:1.2,kj:803}] },

  // EXTENDED LEGUMES
  { id:'bean_stew',      cat:'Legumes', name:'Bean stew', measures:[
      {lbl:'1 cup (200g)',kcal:98,pro:5.8,cho:15.2,fat:1.6,kj:410},
      {lbl:'½ cup (100g)',kcal:49,pro:2.9,cho:7.6,fat:0.8,kj:205}] },
  { id:'bean_soup',      cat:'Legumes', name:'Bean soup', measures:[
      {lbl:'1 cup (200g)',kcal:88,pro:5.8,cho:15.6,fat:0.2,kj:368},
      {lbl:'½ cup (100g)',kcal:44,pro:2.9,cho:7.8,fat:0.1,kj:184},
      {lbl:'1 bowl (300g)',kcal:132,pro:8.7,cho:23.4,fat:0.3,kj:553}] },
  { id:'beans_boiled2',  cat:'Legumes', name:'Beans boiled (plain)', measures:[
      {lbl:'1 cup (200g)',kcal:48,pro:3.2,cho:8.4,fat:0.2,kj:201},
      {lbl:'½ cup (100g)',kcal:24,pro:1.6,cho:4.2,fat:0.1,kj:100},
      {lbl:'1 plate relish (150g)',kcal:36,pro:2.4,cho:6.3,fat:0.15,kj:151}] },
  { id:'kidney_dry',     cat:'Legumes', name:'Kidney beans (dry)', measures:[
      {lbl:'1 cup dry (200g)',kcal:686,pro:47.6,cho:120,fat:1.6,kj:2872},
      {lbl:'½ cup dry (100g)',kcal:343,pro:23.8,cho:60,fat:0.8,kj:1436},
      {lbl:'1 handful (50g)',kcal:172,pro:11.9,cho:30,fat:0.4,kj:718}] },
  { id:'cowpea_dry',     cat:'Legumes', name:'Cowpea (dry)', measures:[
      {lbl:'1 cup dry (200g)',kcal:698,pro:42.8,cho:126,fat:2.6,kj:2921},
      {lbl:'½ cup dry (100g)',kcal:349,pro:21.4,cho:63,fat:1.3,kj:1461},
      {lbl:'1 handful (50g)',kcal:175,pro:10.7,cho:31.5,fat:0.65,kj:730}] },
  { id:'cowpea_boiled',  cat:'Legumes', name:'Cowpea (boiled)', measures:[
      {lbl:'1 cup (200g)',kcal:260,pro:16,cho:46.8,fat:1.0,kj:1088},
      {lbl:'½ cup (100g)',kcal:130,pro:8.0,cho:23.4,fat:0.5,kj:544},
      {lbl:'1 plate relish (150g)',kcal:195,pro:12,cho:35.1,fat:0.75,kj:816}] },
  { id:'cowpea_relish',  cat:'Legumes', name:'Cowpea relish', measures:[
      {lbl:'1 cup (200g)',kcal:80,pro:3.8,cho:12,fat:1.8,kj:335},
      {lbl:'½ cup (100g)',kcal:40,pro:1.9,cho:6,fat:0.9,kj:167},
      {lbl:'1 plate relish (150g)',kcal:60,pro:2.85,cho:9,fat:1.35,kj:251}] },
  { id:'soybean_dry',    cat:'Legumes', name:'Soybean (dry)', measures:[
      {lbl:'1 cup dry (200g)',kcal:864,pro:64.6,cho:74.4,fat:34.2,kj:3615},
      {lbl:'½ cup dry (100g)',kcal:432,pro:32.3,cho:37.2,fat:17.1,kj:1808},
      {lbl:'1 handful (50g)',kcal:216,pro:16.2,cho:18.6,fat:8.6,kj:904}] },
  { id:'soy_flour_boiled',cat:'Legumes', name:'Soy flour (boiled)', measures:[
      {lbl:'1 cup (200g)',kcal:958,pro:89,cho:44.6,fat:47,kj:4010},
      {lbl:'½ cup (100g)',kcal:479,pro:44.5,cho:22.3,fat:23.5,kj:2005},
      {lbl:'2 Tbsp (30g)',kcal:144,pro:13.4,cho:6.7,fat:7.1,kj:602}] },
  { id:'soy_flour_roasted',cat:'Legumes', name:'Soy flour (roasted)', measures:[
      {lbl:'1 cup (200g)',kcal:916,pro:94.8,cho:29.8,fat:46.4,kj:3834},
      {lbl:'½ cup (100g)',kcal:458,pro:47.4,cho:14.9,fat:23.2,kj:1917},
      {lbl:'2 Tbsp (30g)',kcal:137,pro:14.2,cho:4.5,fat:7.0,kj:575}] },
  { id:'groundnuts_dry',  cat:'Legumes', name:'Groundnuts (dry, raw)', measures:[
      {lbl:'1 cup (200g)',kcal:1194,pro:46.4,cho:17,fat:91.6,kj:4997},
      {lbl:'½ cup (100g)',kcal:597,pro:23.2,cho:8.5,fat:45.8,kj:2499},
      {lbl:'1 handful (35g)',kcal:209,pro:8.1,cho:3.0,fat:16.0,kj:875},
      {lbl:'1 tablespoon (15g)',kcal:90,pro:3.5,cho:1.3,fat:6.9,kj:375}] },
  { id:'groundnuts_boiled',cat:'Legumes', name:'Groundnuts (boiled)', measures:[
      {lbl:'1 cup (200g)',kcal:648,pro:24.4,cho:9.2,fat:50,kj:2713},
      {lbl:'½ cup (100g)',kcal:324,pro:12.2,cho:4.6,fat:25,kj:1356},
      {lbl:'1 handful (35g)',kcal:113,pro:4.3,cho:1.6,fat:8.8,kj:474}] },
  { id:'groundnut_flour', cat:'Legumes', name:'Groundnut flour', measures:[
      {lbl:'1 tablespoon (15g)',kcal:87,pro:3.8,cho:1.4,fat:6.7,kj:364},
      {lbl:'2 tablespoons (30g)',kcal:174,pro:7.6,cho:2.8,fat:13.4,kj:728},
      {lbl:'¼ cup (30g)',kcal:174,pro:7.6,cho:2.8,fat:13.4,kj:728}] },
  { id:'groundnut_sauce', cat:'Legumes', name:'Groundnut sauce', measures:[
      {lbl:'1 cup (200g)',kcal:196,pro:8.4,cho:3.8,fat:13.6,kj:820},
      {lbl:'½ cup (100g)',kcal:98,pro:4.2,cho:1.9,fat:6.8,kj:410},
      {lbl:'3 Tbsp (45g)',kcal:44,pro:1.9,cho:0.9,fat:3.1,kj:184}] },
  { id:'pigeon_peas_dry', cat:'Legumes', name:'Pigeon peas / Nandolo (dry)', measures:[
      {lbl:'1 cup dry (200g)',kcal:728,pro:42.4,cho:133.2,fat:3.0,kj:3047},
      {lbl:'½ cup dry (100g)',kcal:364,pro:21.2,cho:66.6,fat:1.5,kj:1524},
      {lbl:'1 handful (50g)',kcal:182,pro:10.6,cho:33.3,fat:0.75,kj:762}] },
  { id:'pigeon_peas_cooked2',cat:'Legumes', name:'Pigeon peas / Nandolo (boiled, full meal)',measures:[
      {lbl:'1 cup (200g)',kcal:292,pro:15.6,cho:54.2,fat:1.4,kj:1222},
      {lbl:'½ cup (100g)',kcal:146,pro:7.8,cho:27.1,fat:0.7,kj:611},
      {lbl:'1 plate relish (150g)',kcal:219,pro:11.7,cho:40.7,fat:1.05,kj:916}] },
  { id:'bean_gnut_stew',  cat:'Legumes', name:'Bean & groundnut stew', measures:[
      {lbl:'1 cup (200g)',kcal:108,pro:5.4,cho:11,fat:4.6,kj:452},
      {lbl:'½ cup (100g)',kcal:54,pro:2.7,cho:5.5,fat:2.3,kj:226},
      {lbl:'1 plate relish (150g)',kcal:81,pro:4.05,cho:8.25,fat:3.45,kj:339}] },

  // EXTENDED ANIMAL FOODS
  { id:'beef_mince_fried',  cat:'Protein Foods', name:'Beef mince (fried)', measures:[
      {lbl:'1 cup (140g)',kcal:223,pro:22.3,cho:0,fat:13.0,kj:933},
      {lbl:'½ cup (70g)', kcal:112,pro:11.2,cho:0,fat:6.5,kj:467},
      {lbl:'2 Tbsp (30g)',kcal:48, pro:4.8, cho:0,fat:2.8,kj:201}] },
  { id:'beef_stew',         cat:'Protein Foods', name:'Beef stew', measures:[
      {lbl:'1 cup (140g)',kcal:132,pro:23.7,cho:2.0,fat:1.8,kj:552},
      {lbl:'½ cup (70g)', kcal:66, pro:11.9,cho:1.0,fat:0.9,kj:276},
      {lbl:'1 plate (200g)',kcal:189,pro:33.9,cho:2.9,fat:2.6,kj:791}] },
  { id:'beef_raw',          cat:'Protein Foods', name:'Beef (raw)', measures:[
      {lbl:'1 cup (140g)',kcal:133,pro:28.7,cho:0,fat:2.1,kj:557},
      {lbl:'30g (matchbox)',kcal:29, pro:6.1, cho:0,fat:0.5,kj:120},
      {lbl:'½ cup (70g)', kcal:67, pro:14.4,cho:0,fat:1.1,kj:278}] },
  { id:'beef_kidney',       cat:'Protein Foods', name:'Beef kidney (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:139,pro:24.4,cho:0.8,fat:4.3,kj:582},
      {lbl:'½ cup (70g)', kcal:70, pro:12.2,cho:0.4,fat:2.2,kj:291},
      {lbl:'1 slice (45g)',kcal:45, pro:7.8, cho:0.3,fat:1.4,kj:187}] },
  { id:'tripe',             cat:'Protein Foods', name:'Tripe (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:115,pro:17.0,cho:0,fat:5.2,kj:481},
      {lbl:'½ cup (70g)', kcal:58, pro:8.5, cho:0,fat:2.6,kj:241},
      {lbl:'1 piece (80g)',kcal:66, pro:9.7, cho:0,fat:3.0,kj:275}] },
  { id:'chicken_stew',      cat:'Protein Foods', name:'Chicken stew', measures:[
      {lbl:'1 cup (140g)',kcal:220,pro:20.9,cho:2.5,fat:13.7,kj:921},
      {lbl:'½ cup (70g)', kcal:110,pro:10.5,cho:1.3,fat:6.9,kj:460},
      {lbl:'1 plate (200g)',kcal:314,pro:29.9,cho:3.6,fat:19.6,kj:1314}] },
  { id:'chicken_raw',       cat:'Protein Foods', name:'Chicken (raw)', measures:[
      {lbl:'1 cup (140g)',kcal:181,pro:29.5,cho:0,fat:6.9,kj:758},
      {lbl:'30g portion',  kcal:39, pro:6.3, cho:0,fat:1.5,kj:163},
      {lbl:'½ cup (70g)', kcal:91, pro:14.8,cho:0,fat:3.5,kj:379}] },
  { id:'egg_scrambled',     cat:'Protein Foods', name:'Egg (scrambled)', measures:[
      {lbl:'1 egg (60g)',  kcal:139,pro:6.0, cho:1.2,fat:12.2,kj:582},
      {lbl:'2 eggs (120g)',kcal:278,pro:12.0,cho:2.4,fat:24.4,kj:1163}] },
  { id:'egg_raw',           cat:'Protein Foods', name:'Egg (raw, whole)', measures:[
      {lbl:'1 large (50g)',kcal:74, pro:6.3, cho:0.4,fat:5.2,kj:310},
      {lbl:'2 eggs (100g)',kcal:148,pro:12.6,cho:0.8,fat:10.4,kj:619}] },
  { id:'duck_egg',          cat:'Protein Foods', name:'Duck egg (boiled)', measures:[
      {lbl:'1 egg (70g)',  kcal:107,pro:9.0, cho:0.6,fat:7.4,kj:448},
      {lbl:'2 eggs (140g)',kcal:214,pro:18.0,cho:1.2,fat:14.8,kj:896}] },
  { id:'milk_fresh',        cat:'Protein Foods', name:'Milk (fresh, whole)', measures:[
      {lbl:'1 cup (250mL)',kcal:168,pro:7.3, cho:12.0,fat:10.5,kj:703},
      {lbl:'½ cup (125mL)',kcal:84, pro:3.7, cho:6.0, fat:5.3, kj:351},
      {lbl:'1 glass (200mL)',kcal:134,pro:5.8,cho:9.6,fat:8.4,kj:561}] },
  { id:'milk_powder',       cat:'Protein Foods', name:'Milk powder (full cream)', measures:[
      {lbl:'1 tablespoon (15g)',kcal:76, pro:3.9,cho:5.8,fat:4.2,kj:318},
      {lbl:'2 tablespoons (30g)',kcal:152,pro:7.8,cho:11.6,fat:8.4,kj:636},
      {lbl:'¼ cup (30g)',  kcal:152,pro:7.8,cho:11.6,fat:8.4,kj:636}] },
  { id:'milkshake',         cat:'Protein Foods', name:'Milkshake', measures:[
      {lbl:'1 cup (250mL)',kcal:203,pro:6.0, cho:29.0,fat:7.5,kj:849},
      {lbl:'½ cup (125mL)',kcal:102,pro:3.0, cho:14.5,fat:3.8,kj:425}] },
  { id:'goat_meat',         cat:'Protein Foods', name:'Goat meat (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:231,pro:24.5,cho:0,fat:14.8,kj:967},
      {lbl:'30g portion',  kcal:50, pro:5.3, cho:0,fat:3.2,kj:207},
      {lbl:'½ cup (70g)', kcal:116,pro:12.3,cho:0,fat:7.4,kj:484}] },
  { id:'lamb_roast',        cat:'Protein Foods', name:'Lamb roast', measures:[
      {lbl:'1 cup (140g)',kcal:507,pro:32.5,cho:0,fat:41.9,kj:2122},
      {lbl:'30g portion',  kcal:109,pro:7.0, cho:0,fat:9.0,kj:455},
      {lbl:'½ cup (70g)', kcal:254,pro:16.3,cho:0,fat:21.0,kj:1061}] },
  { id:'mutton_stew',       cat:'Protein Foods', name:'Mutton stew', measures:[
      {lbl:'1 cup (140g)',kcal:175,pro:8.1, cho:3.0,fat:11.5,kj:732},
      {lbl:'½ cup (70g)', kcal:88, pro:4.1, cho:1.5,fat:5.8,kj:366},
      {lbl:'1 plate (200g)',kcal:250,pro:11.6,cho:4.3,fat:16.4,kj:1046}] },
  { id:'pork_cooked',       cat:'Protein Foods', name:'Pork (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:371,pro:23.5,cho:0,fat:30.8,kj:1553},
      {lbl:'30g portion',  kcal:79, pro:5.0, cho:0,fat:6.6,kj:332},
      {lbl:'½ cup (70g)', kcal:186,pro:11.8,cho:0,fat:15.4,kj:776}] },
  { id:'rabbit_meat',       cat:'Protein Foods', name:'Rabbit meat (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:182,pro:30.2,cho:0,fat:6.7,kj:762},
      {lbl:'30g portion',  kcal:39, pro:6.5, cho:0,fat:1.4,kj:163},
      {lbl:'½ cup (70g)', kcal:91, pro:15.1,cho:0,fat:3.4,kj:381}] },
  { id:'rabbit_stew',       cat:'Protein Foods', name:'Rabbit stew', measures:[
      {lbl:'1 cup (140g)',kcal:253,pro:34.4,cho:2.0,fat:10.8,kj:1059},
      {lbl:'½ cup (70g)', kcal:127,pro:17.2,cho:1.0,fat:5.4,kj:530},
      {lbl:'1 plate (200g)',kcal:361,pro:49.1,cho:2.9,fat:15.4,kj:1512}] },
  { id:'quail_meat',        cat:'Protein Foods', name:'Quail meat (cooked)', measures:[
      {lbl:'1 cup (140g)',kcal:169,pro:29.7,cho:0,fat:5.6,kj:707},
      {lbl:'30g portion',  kcal:36, pro:6.4, cho:0,fat:1.2,kj:151},
      {lbl:'½ cup (70g)', kcal:85, pro:14.9,cho:0,fat:2.8,kj:354}] },
  { id:'tilapia_fried',     cat:'Protein Foods', name:'Tilapia (fried)', measures:[
      {lbl:'1 medium piece (120g)',kcal:270,pro:14.5,cho:5.0,fat:19.0,kj:1130},
      {lbl:'½ piece (60g)', kcal:135,pro:7.3, cho:2.5,fat:9.5,kj:565},
      {lbl:'30g',           kcal:68, pro:3.6, cho:1.3,fat:4.8,kj:282}] },
  { id:'tilapia_grilled',   cat:'Protein Foods', name:'Tilapia (grilled)', measures:[
      {lbl:'1 piece (120g)',kcal:175,pro:13.5,cho:0,fat:13.4,kj:732},
      {lbl:'½ piece (60g)', kcal:88, pro:6.8, cho:0,fat:6.7,kj:366},
      {lbl:'Small piece (80g)',kcal:117,pro:9.0,cho:0,fat:8.9,kj:488}] },
  { id:'catfish_fried',     cat:'Protein Foods', name:'Catfish (fried)', measures:[
      {lbl:'1 piece (120g)',kcal:248,pro:21.7,cho:4.0,fat:14.2,kj:1038},
      {lbl:'½ piece (60g)', kcal:124,pro:10.9,cho:2.0,fat:7.1,kj:519},
      {lbl:'30g',           kcal:62, pro:5.4, cho:1.0,fat:3.6,kj:259}] },
  { id:'catfish_dried',     cat:'Protein Foods', name:'Catfish (dried)', measures:[
      {lbl:'2 tablespoons (30g)',kcal:126,pro:17.3,cho:0,fat:6.0,kj:527},
      {lbl:'1 tablespoon (15g)', kcal:63, pro:8.7, cho:0,fat:3.0,kj:264},
      {lbl:'1 handful (40g)',    kcal:168,pro:23.1,cho:0,fat:8.0,kj:703}] },
  { id:'usipa_dried',       cat:'Protein Foods', name:'Usipa / Sardines (dried)', measures:[
      {lbl:'2 tablespoons (30g)',kcal:109,pro:20.2,cho:0,fat:3.0,kj:456},
      {lbl:'1 tablespoon (15g)', kcal:55, pro:10.1,cho:0,fat:1.5,kj:228},
      {lbl:'1 handful (40g)',    kcal:145,pro:26.9,cho:0,fat:4.0,kj:607}] },
  { id:'fish_powder',       cat:'Protein Foods', name:'Fish powder', measures:[
      {lbl:'1 tablespoon (15g)', kcal:58, pro:9.0, cho:0,fat:2.4,kj:243},
      {lbl:'2 tablespoons (30g)',kcal:116,pro:18.0,cho:0,fat:4.8,kj:485},
      {lbl:'1 teaspoon (5g)',    kcal:19, pro:3.0, cho:0,fat:0.8,kj:81}] },
  { id:'crabs_boiled',      cat:'Protein Foods', name:'Crabs (boiled)', measures:[
      {lbl:'1 cup (140g)',kcal:267,pro:58.5,cho:0,fat:3.8,kj:1118},
      {lbl:'½ cup (70g)', kcal:134,pro:29.3,cho:0,fat:1.9,kj:559}] },
  { id:'caterpillars',      cat:'Protein Foods', name:'Caterpillars (roasted)', measures:[
      {lbl:'1 tablespoon (15g)', kcal:46, pro:6.7, cho:0,fat:1.1,kj:192},
      {lbl:'2 tablespoons (30g)',kcal:92, pro:13.4,cho:0,fat:2.2,kj:385},
      {lbl:'¼ cup (30g)',        kcal:92, pro:13.4,cho:0,fat:2.2,kj:385}] },
  { id:'lake_flies',        cat:'Protein Foods', name:'Lake flies / Nkhungu (dry)', measures:[
      {lbl:'1 tablespoon (15g)', kcal:75, pro:10.1,cho:0,fat:3.3,kj:314},
      {lbl:'2 tablespoons (30g)',kcal:150,pro:20.2,cho:0,fat:6.6,kj:628},
      {lbl:'¼ cup (30g)',        kcal:150,pro:20.2,cho:0,fat:6.6,kj:628}] },
  { id:'locust_roasted',    cat:'Protein Foods', name:'Locust (roasted)', measures:[
      {lbl:'1 tablespoon (15g)', kcal:34, pro:4.5, cho:0,fat:1.1,kj:142},
      {lbl:'2 tablespoons (30g)',kcal:68, pro:9.0, cho:0,fat:2.2,kj:285},
      {lbl:'1 handful (20g)',    kcal:45, pro:6.0, cho:0,fat:1.5,kj:189}] },
  { id:'termites_cooked',   cat:'Protein Foods', name:'Termites (cooked)', measures:[
      {lbl:'1 tablespoon (15g)', kcal:94, pro:6.2, cho:0,fat:7.2,kj:393},
      {lbl:'2 tablespoons (30g)',kcal:188,pro:12.4,cho:0,fat:14.4,kj:787},
      {lbl:'¼ cup (30g)',        kcal:188,pro:12.4,cho:0,fat:14.4,kj:787}] },
  { id:'beef_samosa',       cat:'Protein Foods', name:'Beef samosa', measures:[
      {lbl:'1 piece (80g)', kcal:144,pro:12.7,cho:11.0,fat:9.0,kj:603},
      {lbl:'2 pieces (160g)',kcal:288,pro:25.4,cho:22.0,fat:18.0,kj:1205}] },
  // CONDIMENTS & EXTRAS
  { id:'sugar_tbl', cat:'Condiments', name:'Sugar (white)', measures:[{lbl:'1 tsp (4g)',kcal:16,pro:0,cho:4.0,fat:0,kj:67},{lbl:'1 tbsp (12g)',kcal:48,pro:0,cho:12.0,fat:0,kj:201},{lbl:'1 cup (200g)',kcal:796,pro:0,cho:200.0,fat:0,kj:3335}] },
  { id:'brown_sugar', cat:'Condiments', name:'Sugar (brown)', measures:[{lbl:'1 tsp (4g)',kcal:15,pro:0,cho:3.9,fat:0,kj:63},{lbl:'1 tbsp (12g)',kcal:46,pro:0,cho:11.6,fat:0,kj:193},{lbl:'1 cup (200g)',kcal:770,pro:0,cho:193.0,fat:0,kj:3224}] },
  { id:'honey', cat:'Condiments', name:'Honey', measures:[{lbl:'1 tsp (7g)',kcal:21,pro:0.03,cho:5.8,fat:0,kj:88},{lbl:'1 tbsp (21g)',kcal:64,pro:0.1,cho:17.3,fat:0,kj:268},{lbl:'¼ cup (85g)',kcal:258,pro:0.3,cho:70.0,fat:0,kj:1080}] },
  { id:'salt', cat:'Condiments', name:'Salt (iodised)', measures:[{lbl:'1 tsp (5g)',kcal:0,pro:0,cho:0,fat:0,kj:0},{lbl:'1 pinch (0.5g)',kcal:0,pro:0,cho:0,fat:0,kj:0}] },
  { id:'tomato_puree', cat:'Condiments', name:'Tomato purée / paste', measures:[{lbl:'1 tbsp (16g)',kcal:13,pro:0.7,cho:3.0,fat:0.1,kj:54},{lbl:'2 tbsp (32g)',kcal:26,pro:1.4,cho:6.0,fat:0.1,kj:109},{lbl:'1 tsp (5g)',kcal:4,pro:0.2,cho:0.9,fat:0.03,kj:17}] },
  { id:'tomato_sauce', cat:'Condiments', name:'Tomato sauce / ketchup', measures:[{lbl:'1 tbsp (17g)',kcal:19,pro:0.4,cho:4.6,fat:0.1,kj:79},{lbl:'2 tbsp (34g)',kcal:38,pro:0.8,cho:9.2,fat:0.1,kj:159}] },
  { id:'soy_sauce', cat:'Condiments', name:'Soy sauce', measures:[{lbl:'1 tbsp (16g)',kcal:8,pro:1.3,cho:0.8,fat:0,kj:33},{lbl:'1 tsp (5g)',kcal:3,pro:0.4,cho:0.3,fat:0,kj:11}] },
  { id:'vinegar', cat:'Condiments', name:'Vinegar (any)', measures:[{lbl:'1 tbsp (15mL)',kcal:3,pro:0,cho:0.6,fat:0,kj:13},{lbl:'1 tsp (5mL)',kcal:1,pro:0,cho:0.2,fat:0,kj:4}] },
  { id:'chilli_sauce', cat:'Condiments', name:'Chilli sauce / hot sauce', measures:[{lbl:'1 tbsp (16g)',kcal:6,pro:0.3,cho:1.2,fat:0.1,kj:25},{lbl:'1 tsp (5g)',kcal:2,pro:0.1,cho:0.4,fat:0.03,kj:8}] },
  { id:'baking_powder', cat:'Condiments', name:'Baking powder', measures:[{lbl:'1 tsp (4g)',kcal:2,pro:0,cho:1.3,fat:0,kj:8},{lbl:'1 tbsp (12g)',kcal:7,pro:0,cho:3.9,fat:0,kj:29}] },
  { id:'bicarbonate', cat:'Condiments', name:'Bicarbonate of soda', measures:[{lbl:'1 tsp (4.6g)',kcal:0,pro:0,cho:0,fat:0,kj:0},{lbl:'½ tsp (2.3g)',kcal:0,pro:0,cho:0,fat:0,kj:0}] },
  { id:'cocoa_powder', cat:'Condiments', name:'Cocoa powder (unsweetened)', measures:[{lbl:'1 tbsp (7g)',kcal:12,pro:1.0,cho:3.0,fat:0.7,kj:50},{lbl:'2 tbsp (14g)',kcal:24,pro:2.0,cho:6.0,fat:1.4,kj:100},{lbl:'¼ cup (28g)',kcal:49,pro:4.0,cho:12.0,fat:2.9,kj:205}] },
  { id:'sugar_white_fort', cat:'Condiments', name:'Sugar, white (fortified)', measures:[{lbl:'1 tsp (4g)',kcal:16,pro:0,cho:4.0,fat:0,kj:67},{lbl:'1 tbsp (12g)',kcal:48,pro:0,cho:12.0,fat:0,kj:201},{lbl:'1 cup (200g)',kcal:796,pro:0,cho:200.0,fat:0,kj:3335}] },
  { id:'sugar_brown_fort', cat:'Condiments', name:'Sugar, brown (fortified)', measures:[{lbl:'1 tsp (4g)',kcal:15,pro:0,cho:3.9,fat:0,kj:63},{lbl:'1 tbsp (12g)',kcal:46,pro:0,cho:11.6,fat:0,kj:193},{lbl:'1 cup (200g)',kcal:770,pro:0,cho:193.0,fat:0,kj:3224}] },
  { id:'sugarcane_raw', cat:'Condiments', name:'Sugarcane (raw)', measures:[{lbl:'1 cup chopped (150g)',kcal:84,pro:0.6,cho:20.3,fat:0.3,kj:352},{lbl:'1 piece (50g)',kcal:28,pro:0.2,cho:6.8,fat:0.1,kj:117}] },

  // ONGA Mchuzi Mix — Spiced Tomato Flavour Seasoning Powder, 200g (Unilever East Africa, Kenya)
  // Barcode: 6008155016918 (EAN-13, GS1 company prefix 6008155 — 600 range, SA/EA distribution)
  // Source: pack label scan (per 100 g powder); Vitamin A 4800 µg/100g (not stored in nutrient fields)
  { id:'onga_mchuzi_mix', cat:'Condiments', name:'ONGA Mchuzi Mix (spiced tomato seasoning powder)',
    altNames:['onga','mchuzi mix','mchuzi powder','onga mchuzi','spiced tomato seasoning'],
    barcode:'6008155016918',
    brand:'ONGA',
    sourceLabel:'Pack label (ONGA Mchuzi Mix 200g, per 100 g powder, Kenya)',
    kcal:281, kj:1175, pro:2.5, cho:64.4, fat:0.6, fiber:null, sodium:7747,
    measures:[
      {lbl:'1 tbsp (~9 g)',        kcal:25, pro:0.23, cho:5.8, fat:0.05, kj:106},
      {lbl:'1 tsp (~3 g)',         kcal:8,  pro:0.08, cho:1.9, fat:0.02, kj:35 },
      {lbl:'½ tsp (~1.5 g)',       kcal:4,  pro:0.04, cho:1.0, fat:0.01, kj:18 },
      {lbl:'1 serving (2.5 g)',    kcal:7,  pro:0.06, cho:1.6, fat:0.02, kj:29 },
    ],
  },

  // THERAPEUTIC FOODS (MW08 — Malawi-specific clinical nutrition products)
  // ── RUTF (Ready-to-Use Therapeutic Food) ──────────────────────────────────
  { id:'rutf_msms', cat:'Therapeutic Foods', name:'RUTF — milk, maize, soya, sorghum (MSMS)', measures:[{lbl:'1 sachet (92g)',kcal:423,pro:12.9,cho:51.5,fat:18.4,kj:1771},{lbl:'1 tbsp (15g)',kcal:69,pro:2.1,cho:8.4,fat:3.0,kj:289}] },
  { id:'rutf_fsms', cat:'Therapeutic Foods', name:'RUTF — milk-free soya maize sorghum (FSMS)', measures:[{lbl:'1 sachet (92g)',kcal:405,pro:11.0,cho:53.4,fat:17.5,kj:1693},{lbl:'1 tbsp (15g)',kcal:66,pro:1.8,cho:8.7,fat:2.9,kj:276}] },
  { id:'rutf_pm', cat:'Therapeutic Foods', name:'RUTF — peanut milk (PM / Plumpy\'Nut®)', measures:[{lbl:'1 sachet (92g)',kcal:502,pro:12.7,cho:40.0,fat:28.7,kj:2098},{lbl:'1 tbsp (15g)',kcal:82,pro:2.1,cho:6.5,fat:4.7,kj:342}] },
  // ── RUSF (Ready-to-Use Supplementary Food) ────────────────────────────────
  { id:'rusf_plumpysup', cat:'Therapeutic Foods', name:'RUSF — Plumpy\'Sup® (peanut-based, MAM)', measures:[{lbl:'1 sachet (92g)',kcal:400,pro:10.0,cho:47.0,fat:21.0,kj:1675},{lbl:'½ sachet (46g)',kcal:200,pro:5.0,cho:23.5,fat:10.5,kj:838}] },
  // ── Therapeutic Milk Formulas (WHO F-75 / F-100) ──────────────────────────
  { id:'f75_100ml', cat:'Therapeutic Foods', name:'F-75 — therapeutic milk (stabilisation phase)', measures:[{lbl:'100 mL',kcal:75,pro:0.9,cho:13.3,fat:2.6,kj:314},{lbl:'200 mL',kcal:150,pro:1.8,cho:26.6,fat:5.2,kj:628},{lbl:'500 mL',kcal:375,pro:4.5,cho:66.5,fat:13.0,kj:1570}] },
  { id:'f100_100ml', cat:'Therapeutic Foods', name:'F-100 — therapeutic milk (rehabilitation phase)', measures:[{lbl:'100 mL',kcal:100,pro:2.9,cho:13.5,fat:5.4,kj:419},{lbl:'200 mL',kcal:200,pro:5.8,cho:27.0,fat:10.8,kj:838},{lbl:'500 mL',kcal:500,pro:14.5,cho:67.5,fat:27.0,kj:2095}] },
  // ── LNS (Lipid-Based Nutrient Supplements) ────────────────────────────────
  { id:'lns_mq_plumpydoz', cat:'Therapeutic Foods', name:'LNS-MQ — Plumpy\'Doz® (medium quantity, MAM)', measures:[{lbl:'1 sachet (46g)',kcal:247,pro:6.2,cho:24.0,fat:15.0,kj:1034},{lbl:'2 sachets (92g)',kcal:494,pro:12.4,cho:48.0,fat:30.0,kj:2068}] },
  { id:'lns_sq', cat:'Therapeutic Foods', name:'LNS-SQ — small quantity (preventive, 20g/day)', measures:[{lbl:'1 sachet (20g)',kcal:108,pro:2.6,cho:8.4,fat:7.2,kj:452},{lbl:'½ sachet (10g)',kcal:54,pro:1.3,cho:4.2,fat:3.6,kj:226}] },
  // ── Therapeutic Biscuits ──────────────────────────────────────────────────
  { id:'bp100_bar', cat:'Therapeutic Foods', name:'BP-100 — high-energy biscuit (SAM, per bar)', measures:[{lbl:'1 bar (90g)',kcal:450,pro:15.0,cho:60.8,fat:17.5,kj:1884},{lbl:'½ bar (45g)',kcal:225,pro:7.5,cho:30.4,fat:8.75,kj:942}] },
  // ── Supplementary Blended Foods ───────────────────────────────────────────
  { id:'csb_plus_plus', cat:'Therapeutic Foods', name:'CSB++ — Super Cereal Plus (MAM, fortified)', measures:[{lbl:'100 g dry',kcal:382,pro:20.4,cho:55.0,fat:9.0,kj:1599},{lbl:'1 cup cooked (245g)',kcal:167,pro:8.9,cho:24.1,fat:3.9,kj:699}] },
  { id:'wfp_supercereal', cat:'Therapeutic Foods', name:'Super Cereal (CSB+, WFP, maize-soy blend)', measures:[{lbl:'100 g dry',kcal:376,pro:17.5,cho:59.0,fat:7.5,kj:1573},{lbl:'1 cup cooked (245g)',kcal:165,pro:7.7,cho:25.9,fat:3.3,kj:691}] },
  { id:'cmsf', cat:'Therapeutic Foods', name:'CMSF — Corn Meal Soy Flour (local blend)', measures:[{lbl:'100 g dry',kcal:368,pro:14.0,cho:63.0,fat:6.0,kj:1540},{lbl:'1 cup cooked (245g)',kcal:161,pro:6.1,cho:27.6,fat:2.6,kj:674}] },
  // ── Micronutrient Supplements / Fortification ─────────────────────────────
  { id:'fortif_premix', cat:'Therapeutic Foods', name:'Fortificant premix (IS-353 DSM)', measures:[{lbl:'1 tbsp (15g)',kcal:0,pro:0,cho:0,fat:0,kj:0},{lbl:'1 tsp (5g)',kcal:0,pro:0,cho:0,fat:0,kj:0}] },
  { id:'cmv_sachet', cat:'Therapeutic Foods', name:'CMV — Combined Mineral Vitamin sachet (WHO SAM)', measures:[{lbl:'1 sachet (added to F-75/F-100)',kcal:0,pro:0,cho:0,fat:0,kj:0}] },
  { id:'resomal', cat:'Therapeutic Foods', name:'ReSoMal — Rehydration Solution for Malnutrition (per 500mL)', measures:[{lbl:'500 mL',kcal:27,pro:0,cho:6.5,fat:0,kj:113},{lbl:'1000 mL',kcal:54,pro:0,cho:13.0,fat:0,kj:226}] },
  // ── Sibusiso (local fortified therapeutic/supplementary food) ─────────────
  { id:'sibusiso_50g', cat:'Therapeutic Foods', name:'Sibusiso — fortified food (local, Malawi)', measures:[{lbl:'1 serving (50g)',kcal:281,pro:8.0,cho:24.0,fat:17.5,kj:1176},{lbl:'100 g',kcal:562,pro:16.0,cho:48.0,fat:35.0,kj:2352}] },
  // ══════════════════════════════════════════════════════════════════════════
  // BABY FOODS (MW07 — 84 items, Malawi Food Composition Table 2019, Group 7)
  // Includes baby cereals, infant formulae (BMS, powder & reconstituted),
  // commercial jarred first/junior foods, and 2 traditional Malawian weaning-
  // food recipes. Many items adapted from the South African Food Composition
  // Database (2017). Values are per 100 g edible food, except reconstituted
  // infant formula which is per 100 mL as prepared. 'cho' = available CHO.
  // ══════════════════════════════════════════════════════════════════════════
  { id:'baby_cereal_containing_milk_12mo_strawberry_flavor_dry', cat:'Baby Foods', name:'Baby cereal, containing milk, 12 months, strawberry flavor, dry', measures:[{lbl:'100 g',kcal:414,pro:15,cho:66.6,fat:9,kj:1749}] },
  { id:'baby_cereal_containing_milk_6mo_dry', cat:'Baby Foods', name:'Baby cereal, containing milk, 6 months, dry', measures:[{lbl:'100 g',kcal:420,pro:15,cho:67.4,fat:9.5,kj:1774}] },
  { id:'baby_cereal_containing_milk_7mo_regular_flavor_dry', cat:'Baby Foods', name:'Baby cereal, containing milk, 7 months, regular flavor, dry', measures:[{lbl:'100 g',kcal:394,pro:19.7,cho:71.3,fat:3.3,kj:1669}] },
  { id:'baby_cereal_containing_milk_9mo_mixed_fruit_flavor_dry', cat:'Baby Foods', name:'Baby cereal, containing milk, 9 months, mixed fruit flavor, dry', measures:[{lbl:'100 g',kcal:420,pro:15,cho:67.4,fat:9.5,kj:1774}] },
  { id:'baby_cereal_maize_6mo_dry', cat:'Baby Foods', name:'Baby cereal, maize, 6 months, dry', measures:[{lbl:'100 g',kcal:347,pro:6,cho:62.4,fat:2.6,kj:1473}] },
  { id:'baby_cereal_maize_9mo_strawberry_and_banana_flavor_dry', cat:'Baby Foods', name:'Baby cereal, maize, 9 months, strawberry and banana flavor, dry (Nestum)', measures:[{lbl:'100 g',kcal:366,pro:6,cho:73,fat:4,kj:1551}] },
  { id:'baby_cereal_mixed_cereal_7mo_dry', cat:'Baby Foods', name:'Baby cereal, mixed cereal, 7 months, dry', measures:[{lbl:'100 g',kcal:364,pro:9,cho:73,fat:2.4,kj:1542}] },
  { id:'baby_cereal_mixed_grain_7mo_dry', cat:'Baby Foods', name:'Baby cereal, mixed grain, 7 months, dry', measures:[{lbl:'100 g',kcal:355,pro:12.1,cho:67.8,fat:2.9,kj:1503}] },
  { id:'baby_food_jar_10mo_banana_and_berry_with_yoghurt', cat:'Baby Foods', name:'Baby food (jar), 10 months, banana & berry with yoghurt', measures:[{lbl:'100 g',kcal:47,pro:0.7,cho:10.6,fat:0,kj:199}] },
  { id:'baby_food_jar_10mo_summer_fruit_dessert', cat:'Baby Foods', name:'Baby food (jar), 10 months, summer fruit dessert', measures:[{lbl:'100 g',kcal:63,pro:4.8,cho:10.5,fat:0,kj:269}] },
  { id:'baby_food_jar_6mo_apple', cat:'Baby Foods', name:'Baby food (jar), 6 months, apple', measures:[{lbl:'100 g',kcal:48,pro:0,cho:11,fat:0,kj:204}] },
  { id:'baby_food_jar_6mo_banana', cat:'Baby Foods', name:'Baby food (jar), 6 months, banana', measures:[{lbl:'100 g',kcal:47,pro:0.6,cho:10.5,fat:0.1,kj:201}] },
  { id:'baby_food_jar_6mo_butternut', cat:'Baby Foods', name:'Baby food (jar), 6 months, butternut', measures:[{lbl:'100 g',kcal:52,pro:1,cho:10,fat:0,kj:221}] },
  { id:'baby_food_jar_6mo_carrot', cat:'Baby Foods', name:'Baby food (jar), 6 months, carrot', measures:[{lbl:'100 g',kcal:44,pro:1,cho:7,fat:0,kj:187}] },
  { id:'baby_food_jar_6mo_guava_and_pear', cat:'Baby Foods', name:'Baby food (jar), 6 months, guava & pear', measures:[{lbl:'100 g',kcal:51,pro:0.6,cho:11.4,fat:0.1,kj:218}] },
  { id:'baby_food_jar_6mo_sweet_potato', cat:'Baby Foods', name:'Baby food (jar), 6 months, sweet potato', measures:[{lbl:'100 g',kcal:36,pro:1,cho:7.5,fat:0,kj:153}] },
  { id:'baby_food_jar_7mo_apple', cat:'Baby Foods', name:'Baby food (jar), 7 months, apple', measures:[{lbl:'100 g',kcal:48,pro:0,cho:11,fat:0,kj:204}] },
  { id:'baby_food_jar_7mo_banana', cat:'Baby Foods', name:'Baby food (jar), 7 months, banana', measures:[{lbl:'100 g',kcal:47,pro:0.6,cho:10.5,fat:0.1,kj:201}] },
  { id:'baby_food_jar_7mo_banana_and_yoghurt', cat:'Baby Foods', name:'Baby food (jar), 7 months, banana & yoghurt', measures:[{lbl:'100 g',kcal:37,pro:0.9,cho:7.8,fat:0.2,kj:159}] },
  { id:'baby_food_jar_7mo_butternut', cat:'Baby Foods', name:'Baby food (jar), 7 months, butternut', measures:[{lbl:'100 g',kcal:38,pro:1.6,cho:7.6,fat:0,kj:163}] },
  { id:'baby_food_jar_7mo_carrot', cat:'Baby Foods', name:'Baby food (jar), 7 months, carrot', measures:[{lbl:'100 g',kcal:20,pro:0.9,cho:3.7,fat:0,kj:83}] },
  { id:'baby_food_jar_7mo_mixed_vegetables', cat:'Baby Foods', name:'Baby food (jar), 7 months, mixed vegetables', measures:[{lbl:'100 g',kcal:49,pro:5.2,cho:6.5,fat:0,kj:207}] },
  { id:'baby_food_jar_7mo_peach', cat:'Baby Foods', name:'Baby food (jar), 7 months, peach', measures:[{lbl:'100 g',kcal:38,pro:1.2,cho:6.4,fat:0.1,kj:160}] },
  { id:'baby_food_jar_7mo_pear', cat:'Baby Foods', name:'Baby food (jar), 7 months, pear', measures:[{lbl:'100 g',kcal:60,pro:0,cho:12,fat:0,kj:255}] },
  { id:'baby_food_jar_7mo_sweet_potato', cat:'Baby Foods', name:'Baby food (jar), 7 months, sweet potato', measures:[{lbl:'100 g',kcal:36,pro:1,cho:7.5,fat:0,kj:153}] },
  { id:'baby_food_jar_7mo_vegetables_and_beef', cat:'Baby Foods', name:'Baby food (jar), 7 months, vegetables & beef', measures:[{lbl:'100 g',kcal:36,pro:0.9,cho:6.9,fat:0.5,kj:153}] },
  { id:'baby_food_jar_7mo_vegetables_and_chicken', cat:'Baby Foods', name:'Baby food (jar), 7 months, vegetables & chicken', measures:[{lbl:'100 g',kcal:42,pro:2.6,cho:6.3,fat:0.4,kj:178}] },
  { id:'baby_food_jar_8mo_apple', cat:'Baby Foods', name:'Baby food (jar), 8 months, apple', measures:[{lbl:'100 g',kcal:50,pro:0.3,cho:10.8,fat:0.1,kj:213}] },
  { id:'baby_food_jar_8mo_apple_and_banana', cat:'Baby Foods', name:'Baby food (jar), 8 months, apple & banana', measures:[{lbl:'100 g',kcal:71,pro:0.4,cho:15.8,fat:0.1,kj:300}] },
  { id:'baby_food_jar_8mo_fruit_and_yoghurt', cat:'Baby Foods', name:'Baby food (jar), 8 months, fruit & yoghurt', measures:[{lbl:'100 g',kcal:37,pro:0.9,cho:7.7,fat:0.2,kj:159}] },
  { id:'baby_food_jar_8mo_fruit_salad', cat:'Baby Foods', name:'Baby food (jar), 8 months, fruit salad', measures:[{lbl:'100 g',kcal:67,pro:0.4,cho:14.8,fat:0.1,kj:283}] },
  { id:'baby_food_jar_8mo_peach', cat:'Baby Foods', name:'Baby food (jar), 8 months, peach', measures:[{lbl:'100 g',kcal:38,pro:1.2,cho:6.4,fat:0.1,kj:160}] },
  { id:'baby_food_jar_8mo_pear', cat:'Baby Foods', name:'Baby food (jar), 8 months, pear', measures:[{lbl:'100 g',kcal:63,pro:0.4,cho:12.1,fat:0.1,kj:266}] },
  { id:'baby_food_jar_8mo_pears_with_yoghurt', cat:'Baby Foods', name:'Baby food (jar), 8 months, pears with yoghurt', measures:[{lbl:'100 g',kcal:34,pro:0.4,cho:7.7,fat:0,kj:143}] },
  { id:'baby_food_jar_8mo_vegetables_and_chicken', cat:'Baby Foods', name:'Baby food (jar), 8 months, vegetables & chicken', measures:[{lbl:'100 g',kcal:55,pro:5.4,cho:5.8,fat:0.6,kj:233}] },
  { id:'bms_acidified_follow_up_formula_nan_pelargon_2_recon_100ml', cat:'Baby Foods', name:'BMS, acidified follow-up formula, Nan Pelargon 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:2,cho:8,fat:3.1,kj:285}] },
  { id:'bms_acidified_formula_nan_pelargon_1_powder', cat:'Baby Foods', name:'BMS, acidified formula, Nan Pelargon 1 powder', measures:[{lbl:'100 g',kcal:512,pro:11.4,cho:58,fat:26,kj:2142}] },
  { id:'bms_acidified_formula_nan_pelargon_1_recon_100ml', cat:'Baby Foods', name:'BMS, acidified formula, Nan Pelargon 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:69,pro:1.5,cho:8,fat:3.4,kj:287}] },
  { id:'bms_acidified_follow_up_formula_nan_pelargon_2_powder', cat:'Baby Foods', name:'BMS, acidified, follow-up formula, Nan Pelargon 2 powder', measures:[{lbl:'100 g',kcal:492,pro:14.8,cho:57,fat:22.8,kj:2064}] },
  { id:'bms_casein_predominant_formula_lactogen_1_powder', cat:'Baby Foods', name:'BMS, casein-predominant formula, Lactogen 1 powder', measures:[{lbl:'100 g',kcal:513,pro:11.6,cho:57,fat:26.5,kj:2147}] },
  { id:'bms_casein_predominant_formula_lactogen_1_recon_100ml', cat:'Baby Foods', name:'BMS, casein-predominant formula, Lactogen 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:66,pro:1.5,cho:7,fat:3.5,kj:274}] },
  { id:'bms_follow_up_formula_lactogen_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula Lactogen 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:67,pro:2,cho:8,fat:3,kj:281}] },
  { id:'bms_follow_up_formula_infacare_classic_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Infacare Classic 2 powder', measures:[{lbl:'100 g',kcal:457,pro:16.7,cho:60,fat:16.7,kj:1922}] },
  { id:'bms_follow_up_formula_infacare_classic_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, Infacare Classic 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:67,pro:2.4,cho:9,fat:2.4,kj:283}] },
  { id:'bms_follow_up_formula_infacare_classic_3_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Infacare Classic 3 powder', measures:[{lbl:'100 g',kcal:458,pro:16.8,cho:60,fat:16.8,kj:1927}] },
  { id:'bms_follow_up_formula_infacare_classic_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, Infacare Classic 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:88,pro:3.2,cho:11.5,fat:3.2,kj:368}] },
  { id:'bms_follow_up_formula_lactogen_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Lactogen 2 powder', measures:[{lbl:'100 g',kcal:486,pro:14.7,cho:58,fat:21.7,kj:2039}] },
  { id:'bms_follow_up_formula_lactogen_3_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Lactogen 3, powder', measures:[{lbl:'100 g',kcal:486,pro:14.7,cho:58,fat:21.7,kj:2039}] },
  { id:'bms_follow_up_formula_lactogen_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, Lactogen 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:67,pro:2,cho:8,fat:3,kj:281}] },
  { id:'bms_follow_up_formula_nan_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Nan 2 powder', measures:[{lbl:'100 g',kcal:490,pro:14.7,cho:56,fat:23,kj:2053}] },
  { id:'bms_follow_up_formula_nan_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, Nan 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:2,cho:8,fat:3.1,kj:285}] },
  { id:'bms_follow_up_formula_nan_3_powder', cat:'Baby Foods', name:'BMS, follow-up formula, Nan 3 powder', measures:[{lbl:'100 g',kcal:485,pro:14.6,cho:59,fat:21.2,kj:2036}] },
  { id:'bms_follow_up_formula_nan_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, Nan 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:67,pro:2,cho:8,fat:3,kj:279}] },
  { id:'bms_follow_up_formula_s_26_progress_3_powder', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Progress 3 powder', measures:[{lbl:'100 g',kcal:452,pro:14.4,cho:65,fat:14.9,kj:1901}] },
  { id:'bms_follow_up_formula_s_26_progress_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Progress 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:101,pro:3.2,cho:14.5,fat:3.3,kj:423}] },
  { id:'bms_follow_up_formula_s_26_progress_gold_3_powder', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Progress Gold 3 powder', measures:[{lbl:'100 g',kcal:452,pro:14.8,cho:60,fat:17,kj:1901}] },
  { id:'bms_follow_up_formula_s_26_progress_gold_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Progress Gold 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:77,pro:2.6,cho:10,fat:3,kj:325}] },
  { id:'bms_follow_up_formula_s_26_promil_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Promil 2 powder', measures:[{lbl:'100 g',kcal:471,pro:15.7,cho:57,fat:20,kj:1976}] },
  { id:'bms_follow_up_formula_s_26_promil_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Promil 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:66,pro:2.2,cho:8,fat:2.8,kj:277}] },
  { id:'bms_follow_up_formula_s_26_promil_gold_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Promil Gold 2 powder', measures:[{lbl:'100 g',kcal:478,pro:15.7,cho:54,fat:22.1,kj:2003}] },
  { id:'bms_follow_up_formula_s_26_promil_gold_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, S-26 Promil Gold 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:63,pro:2.1,cho:7,fat:3,kj:266}] },
  { id:'bms_follow_up_formula_soy_based_infasoy_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, soy based, Infasoy 2 powder', measures:[{lbl:'100 g',kcal:497,pro:16.4,cho:54,fat:23.9,kj:2081}] },
  { id:'bms_follow_up_formula_soy_based_infasoy_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, soy-based, Infasoy 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:66,pro:2.2,cho:7,fat:3.2,kj:275}] },
  { id:'bms_follow_up_formula_soy_based_isomil_2_powder', cat:'Baby Foods', name:'BMS, follow-up formula, soy-based, Isomil® 2 powder', measures:[{lbl:'100 g',kcal:471,pro:14.9,cho:57.8,fat:20,kj:1977}] },
  { id:'bms_follow_up_formula_soy_based_isomil_2_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, soy-based, Isomil® 2, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:2.2,cho:8.4,fat:2.9,kj:287}] },
  { id:'bms_follow_up_formula_soy_based_isomil_3_recon_100ml', cat:'Baby Foods', name:'BMS, follow-up formula, soy-based, Isomil® 3, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:69,pro:2.3,cho:8,fat:3.1,kj:289}] },
  { id:'bms_premature_whey_predominant_formula_prenan_powder', cat:'Baby Foods', name:'BMS, premature, whey-predominant formula, PreNan powder', measures:[{lbl:'100 g',kcal:503,pro:14.4,cho:53,fat:25.9,kj:2104}] },
  { id:'bms_premature_whey_predominant_formula_prenan_recon_100ml', cat:'Baby Foods', name:'BMS, premature, whey-predominant formula, PreNan, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:83,pro:2.3,cho:9,fat:4.2,kj:348}] },
  { id:'bms_soy_based_formula_infasoy_1_powder', cat:'Baby Foods', name:'BMS, soy-based formula, Infasoy 1 powder', measures:[{lbl:'100 g',kcal:517,pro:13.8,cho:53,fat:27.7,kj:2161}] },
  { id:'bms_soy_based_formula_infasoy_1_recon_100ml', cat:'Baby Foods', name:'BMS, soy-based formula, Infasoy 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:1.8,cho:7,fat:3.6,kj:283}] },
  { id:'bms_soy_based_formula_isomil_1_powder', cat:'Baby Foods', name:'BMS, soy-based formula, Isomil® 1 powder', measures:[{lbl:'100 g',kcal:507,pro:12.8,cho:52.4,fat:27.4,kj:2122}] },
  { id:'bms_soy_based_formula_isomil_1_recon_100ml', cat:'Baby Foods', name:'BMS, soy-based formula, Isomil® 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:1.7,cho:7,fat:3.7,kj:285}] },
  { id:'bms_whey_predominant_formula_infacare_classic_1_powder', cat:'Baby Foods', name:'BMS, whey-predominant formula, Infacare Classic 1 powder', measures:[{lbl:'100 g',kcal:507,pro:11.4,cho:59,fat:25,kj:2122}] },
  { id:'bms_whey_predominant_formula_infacare_classic_1_recon_100ml', cat:'Baby Foods', name:'BMS, whey-predominant formula, Infacare Classic 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:68,pro:1.5,cho:8,fat:3.3,kj:284}] },
  { id:'bms_whey_predominant_formula_nan_1_powder', cat:'Baby Foods', name:'BMS, whey-predominant formula, Nan 1 powder', measures:[{lbl:'100 g',kcal:502,pro:9.9,cho:57,fat:26,kj:2099}] },
  { id:'bms_whey_predominant_formula_nan_1_recon_100ml', cat:'Baby Foods', name:'BMS, whey-predominant formula, Nan 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:69,pro:1.3,cho:8,fat:3.5,kj:288}] },
  { id:'bms_whey_predominant_formula_s_26_classic_1_powder', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Classic 1, powder', measures:[{lbl:'100 g',kcal:522,pro:11.8,cho:55,fat:28.3,kj:2183}] },
  { id:'bms_whey_predominant_formula_s_26_classic_1_recon_100ml', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Classic 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:66,pro:1.5,cho:7,fat:3.6,kj:278}] },
  { id:'bms_whey_predominant_formula_s_26_comfort_gold_powder', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Comfort Gold, powder', measures:[{lbl:'100 g',kcal:520,pro:12,cho:55,fat:28,kj:2175}] },
  { id:'bms_whey_predominant_formula_s_26_comfort_gold_recon_100ml', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Comfort Gold, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:67,pro:1.6,cho:7,fat:3.6,kj:279}] },
  { id:'bms_whey_predominant_formula_s_26_gold_1_powder', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Gold 1 powder', measures:[{lbl:'100 g',kcal:526,pro:10.7,cho:56,fat:28.8,kj:2200}] },
  { id:'bms_whey_predominant_formula_s_26_gold_1_recon_100ml', cat:'Baby Foods', name:'BMS, whey-predominant formula, S-26 Gold 1, reconstituted/100mL', measures:[{lbl:'100 mL',kcal:66,pro:1.3,cho:7,fat:3.6,kj:274}] },
  { id:'maize_soft_porridge_with_egg_and_vegatable_phala_lamgaiwa', cat:'Baby Foods', name:'Maize soft porridge, with egg & vegatable, (Phala lamgaiwa loika mazira ndi masamba)', measures:[{lbl:'100 g',kcal:93,pro:3.2,cho:8.5,fat:4.9,kj:391}] },
  { id:'rice_porridge_with_carrot_milk_and_groundnut_flour_phala_la', cat:'Baby Foods', name:'Rice porridge, with carrot, milk & groundnut flour, (Phala la mpunga lothira kaloti, mkaka ndi nsinjilo)', measures:[{lbl:'100 g',kcal:52,pro:1.6,cho:6.7,fat:1.8,kj:221}] },
];

// ══════════════════════════════════════════════════════════════
// 2. UCT EXCHANGE DATABASE (UCT Division of Human Nutrition, 2014)
// ══════════════════════════════════════════════════════════════
const UCT_EXCHANGE_DB = [
  {
    "name": "Brown / wholewheat bread",
    "exchange_type": "starch",
    "portions": [
      "1 slice (±42 g)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Brown / wholewheat rolls",
    "exchange_type": "starch",
    "portions": [
      "½ roll"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pita bread (15 cm diameter)",
    "exchange_type": "starch",
    "portions": [
      "½ pita"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Wrap (20 cm × 20 cm)",
    "exchange_type": "starch",
    "portions": [
      "1 medium wrap"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Crackerbread",
    "exchange_type": "starch",
    "portions": [
      "3 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Corn thins",
    "exchange_type": "starch",
    "portions": [
      "3 pieces"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Cream cracker",
    "exchange_type": "starch",
    "portions": [
      "3 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Finn crisp",
    "exchange_type": "starch",
    "portions": [
      "4 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Melba toast",
    "exchange_type": "starch",
    "portions": [
      "4 pieces"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pro vita",
    "exchange_type": "starch",
    "portions": [
      "4 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Ryvita",
    "exchange_type": "starch",
    "portions": [
      "3 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Rice cake (10 cm)",
    "exchange_type": "starch",
    "portions": [
      "2 cakes"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Rice cracker",
    "exchange_type": "starch",
    "portions": [
      "5 crackers"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Cereals, high fibre (All Bran Flakes / High Fibre Bran)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Cereals, low fibre (Special K, Corn Flakes, Frosties)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Future Life Zero (dry cereal)",
    "exchange_type": "starch",
    "portions": [
      "3 Tbs (45 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Future Life Smart Food Original, High Protein and Crunch listed under Combination Foods"
  },
  {
    "name": "Maize meal, stiff (cooked)",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Maize meal, soft (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Maize meal, crumbly (cooked)",
    "exchange_type": "starch",
    "portions": [
      "¾ cup (190 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Maltabella (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Muesli",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Oats porridge (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Oats (raw) / oat bran",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (25 g / 60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pronutro (whole-wheat or flavours)",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (25 g / 60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Weetbix / Nutrifix",
    "exchange_type": "starch",
    "portions": [
      "1 biscuit"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Barley (cooked)",
    "exchange_type": "starch",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Bulgur wheat (cooked)",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Couscous (cooked)",
    "exchange_type": "starch",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Cake flour",
    "exchange_type": "starch",
    "portions": [
      "3 Tbs (45 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Corn flour / maizena",
    "exchange_type": "starch",
    "portions": [
      "20 g (45 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Maize rice (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pasta (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Plain popcorn (air-popped)",
    "exchange_type": "starch",
    "portions": [
      "3–4 cups (750–1000 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pretzels (not flavoured, thin sticks)",
    "exchange_type": "starch",
    "portions": [
      "20 sticks"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Quinoa (cooked)",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (60 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Rice – Basmati / brown / white (cooked)",
    "exchange_type": "starch",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Spaghetti (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Samp (cooked)",
    "exchange_type": "starch",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Sago (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Wheat rice / Pearled wheat / stampkoring (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Wholewheat flour",
    "exchange_type": "starch",
    "portions": [
      "25 g (50 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Baby potato",
    "exchange_type": "starch",
    "portions": [
      "3 baby potatoes"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Creamed sweetcorn",
    "exchange_type": "starch",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Mealie cob",
    "exchange_type": "starch",
    "portions": [
      "1 medium cob"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Mealie kernels",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Mixed vegetables with corn, peas, potato",
    "exchange_type": "starch",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Mash potato",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Potato",
    "exchange_type": "starch",
    "portions": [
      "1 small (100 g)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Pumpkin / butternut / Hubbard squash",
    "exchange_type": "starch",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Parsnips",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Sweet potato",
    "exchange_type": "starch",
    "portions": [
      "¼ cup (70 g)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Dried beans, peas, lentils (cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Equivalent to 1 starch + 1 lean meat exchange"
  },
  {
    "name": "Baked beans",
    "exchange_type": "starch",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Equivalent to 1 starch + 1 lean meat exchange"
  },
  {
    "name": "Chickpeas (dried, cooked)",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Equivalent to 1 starch + 1 lean meat exchange"
  },
  {
    "name": "Four bean mix",
    "exchange_type": "starch",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Equivalent to 1 starch + 1 lean meat exchange"
  },
  {
    "name": "Cup-a-Soup (regular)",
    "exchange_type": "starch",
    "portions": [
      "1 sachet"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Add 1 CHO if thickening agent (45 ml cake flour/maizena) used"
  },
  {
    "name": "Cup-a-Soup (lite)",
    "exchange_type": "starch",
    "portions": [
      "2 sachets"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Homemade soup (made with soup mix)",
    "exchange_type": "starch",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Add 1 CHO if thickening agent used"
  },
  {
    "name": "Homemade soup (made with legumes)",
    "exchange_type": "starch",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      3
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "Add 1 CHO if thickening agent used"
  },
  {
    "name": "Meat – lean beef, game, pork loin, ham, lamb leg, veal roast",
    "exchange_type": "lean",
    "portions": [
      "30 g (size of a matchbox)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Lean and extra lean mince",
    "exchange_type": "lean",
    "portions": [
      "30 g (1 Tbs rounded)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Chicken / turkey (without skin)",
    "exchange_type": "lean",
    "portions": [
      "30 g (1 drumstick / 1 wing = 1 exchange; 1 thigh = 2 exchanges; 1 breast = 3–4 exchanges)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Fish – fresh, frozen, tinned (incl. drained tuna in water or oil, salmon)",
    "exchange_type": "lean",
    "portions": [
      "30 g (one drained tin of tuna = 120 g = 4 exchanges)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Canned sardines",
    "exchange_type": "lean",
    "portions": [
      "2 sardines"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Canned pilchards",
    "exchange_type": "lean",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Shellfish (all types)",
    "exchange_type": "lean",
    "portions": [
      "30 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cottage cheese (low fat / fat-free)",
    "exchange_type": "lean",
    "portions": [
      "¼ cup (2 h Dsp / 60 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Feta (fat reduced)",
    "exchange_type": "lean",
    "portions": [
      "30 g (⅓ ring)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Processed cheese (low fat)",
    "exchange_type": "lean",
    "portions": [
      "30 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Lean biltong",
    "exchange_type": "lean",
    "portions": [
      "30 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Egg whites",
    "exchange_type": "lean",
    "portions": [
      "2 egg whites"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cold meats – chicken, turkey, beef",
    "exchange_type": "lean",
    "portions": [
      "1 thin slice"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Sausage (lean / extra lean)",
    "exchange_type": "lean",
    "portions": [
      "30 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Tripe / organ meats (kidney, lung, heart, liver)",
    "exchange_type": "lean",
    "portions": [
      "30 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Lean cold meat (ham)",
    "exchange_type": "lean",
    "portions": [
      "4 slices"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Lean smoked chicken",
    "exchange_type": "lean",
    "portions": [
      "2 slices"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Meat – corned beef, tongue, lamb rib, pork cutlet, veal cutlet",
    "exchange_type": "medium",
    "portions": [
      "30 g"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Tinned corned beef (e.g. Bully Beef)",
    "exchange_type": "medium",
    "portions": [
      "30 g (1/10 tin)"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Mince / meatloaf / lamb mince",
    "exchange_type": "medium",
    "portions": [
      "30 g (1 Tbs)"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Chicken (with skin or fried) / duck / goose",
    "exchange_type": "medium",
    "portions": [
      "30 g"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Fish (fried)",
    "exchange_type": "medium",
    "portions": [
      "30 g"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Egg (whole)",
    "exchange_type": "medium",
    "portions": [
      "1 large egg"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Cheese (mozzarella)",
    "exchange_type": "medium",
    "portions": [
      "30 g"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Cheese (Parmesan)",
    "exchange_type": "medium",
    "portions": [
      "20 g (4 Tbs)"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Cottage cheese (full fat) / Ricotta cheese",
    "exchange_type": "medium",
    "portions": [
      "60 g (¼ cup)"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Processed cheese / cheese spread (medium fat)",
    "exchange_type": "medium",
    "portions": [
      "30 g (1 h Dsp)"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Processed cheese wedges (low fat)",
    "exchange_type": "medium",
    "portions": [
      "2 wedges"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Vienna (normal or lean)",
    "exchange_type": "medium",
    "portions": [
      "1 vienna"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Reduced fat bacon",
    "exchange_type": "medium",
    "portions": [
      "2 rashers"
    ],
    "kcal": [
      75
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      315
    ]
  },
  {
    "name": "Pork bacon",
    "exchange_type": "highfat",
    "portions": [
      "2 rashers"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Chicken / turkey rashers",
    "exchange_type": "highfat",
    "portions": [
      "3 rashers"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Cheese – tussers, cheddar, gouda, normal feta",
    "exchange_type": "highfat",
    "portions": [
      "30 g"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Cheese – brie, goat, dairybelle in-shape, fiddlers, swiss, tilsiter",
    "exchange_type": "highfat",
    "portions": [
      "30 g"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Processed cheese / cheese spread (full fat)",
    "exchange_type": "highfat",
    "portions": [
      "30 g (1 h Dsp)"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Processed cheese wedges (full fat)",
    "exchange_type": "highfat",
    "portions": [
      "2 wedges"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Pork ribs",
    "exchange_type": "highfat",
    "portions": [
      "30 g"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Pork mince",
    "exchange_type": "highfat",
    "portions": [
      "30 g (1 Tbs)"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Cold meats – pastrami, salami",
    "exchange_type": "highfat",
    "portions": [
      "1 thin slice"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Beef / pork sausage",
    "exchange_type": "highfat",
    "portions": [
      "25 g"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Sausage – chorizo, bratwurst, Italian, Polish, smoked",
    "exchange_type": "highfat",
    "portions": [
      "30 g"
    ],
    "kcal": [
      100
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      8
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Baked beans",
    "exchange_type": "lean",
    "portions": [
      "⅓ cup (80 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "1 lean meat + 1 starch",
    "exchange_label": "1 lean meat + 1 starch"
  },
  {
    "name": "Dried beans / dried peas (cooked)",
    "exchange_type": "lean",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "1 lean meat + 1 starch",
    "exchange_label": "1 lean meat + 1 starch"
  },
  {
    "name": "Peanut butter",
    "exchange_type": "lean",
    "portions": [
      "25 g (1 Dsp)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "No CHO/starch component; equivalent to 1 high fat meat only",
    "exchange_label": "1 high fat meat"
  },
  {
    "name": "Hummus (regular / full fat)",
    "exchange_type": "lean",
    "portions": [
      "¼ cup (60 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "Use reduced-fat hummus if lower fat version needed",
    "exchange_label": "1 high fat meat + 1 starch"
  },
  {
    "name": "Lentils (cooked)",
    "exchange_type": "lean",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "1 lean meat + 1 starch",
    "exchange_label": "1 lean meat + 1 starch"
  },
  {
    "name": "Soy burgers (Fry's)",
    "exchange_type": "lean",
    "portions": [
      "1 × 80 g patty"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "2 lean meat exchanges",
    "exchange_label": "2 lean meat exchanges"
  },
  {
    "name": "Soya mince (cooked, unflavoured)",
    "exchange_type": "lean",
    "portions": [
      "45 g (¾ cup)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "1 lean meat + 1 starch",
    "exchange_label": "1 lean meat + 1 starch"
  },
  {
    "name": "Soya mince (cooked, flavoured e.g. Knorrox, PnP no name)",
    "exchange_type": "lean",
    "portions": [
      "75 g (1¼ cup)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "Also contains 1 starch exchange",
    "exchange_label": "2 lean meat + 1 starch"
  },
  {
    "name": "Tofu",
    "exchange_type": "lean",
    "portions": [
      "120 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      2
    ],
    "kj": [
      190
    ],
    "note": "1 lean meat + 1 starch",
    "exchange_label": "1 lean meat + 1 starch"
  },
  {
    "name": "Skim milk",
    "exchange_type": "milk_ff",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Skim milk powder",
    "exchange_type": "milk_ff",
    "portions": [
      "1 cup (±25 g)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Fat-free artificially sweetened plain / fruit yoghurt",
    "exchange_type": "milk_ff",
    "portions": [
      "¾ cup (175 ml)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Fat-free sweetened yoghurt",
    "exchange_type": "milk_ff",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      80
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ]
  },
  {
    "name": "Low fat / 2% milk",
    "exchange_type": "milk_lf",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ]
  },
  {
    "name": "Low fat yoghurt, plain",
    "exchange_type": "milk_lf",
    "portions": [
      "¾ cup (175 ml)"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ]
  },
  {
    "name": "Buttermilk, low fat",
    "exchange_type": "milk_lf",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ]
  },
  {
    "name": "Evaporated milk, lite",
    "exchange_type": "milk_lf",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ]
  },
  {
    "name": "Low fat yoghurt, sweetened",
    "exchange_type": "milk_lf",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ],
    "note": "Slightly lower fat and protein than category average"
  },
  {
    "name": "Drinking yoghurt, low fat sweetened",
    "exchange_type": "milk_lf",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ],
    "note": "Slightly lower fat and protein than category average"
  },
  {
    "name": "Flavoured milk, low fat, sweetened",
    "exchange_type": "milk_lf",
    "portions": [
      "150 ml"
    ],
    "kcal": [
      120
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      5
    ],
    "kj": [
      504
    ]
  },
  {
    "name": "Full cream milk",
    "exchange_type": "milk_fc",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ]
  },
  {
    "name": "Milk powder, full cream",
    "exchange_type": "milk_fc",
    "portions": [
      "1 cup (±25 g)"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ]
  },
  {
    "name": "Amasi / full cream sour milk",
    "exchange_type": "milk_fc",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ]
  },
  {
    "name": "Evaporated milk",
    "exchange_type": "milk_fc",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ]
  },
  {
    "name": "Yoghurt, full / double cream",
    "exchange_type": "milk_fc",
    "portions": [
      "200 ml"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ],
    "note": "Slightly lower fat and protein than category average"
  },
  {
    "name": "Yoghurt, full / double cream, sweetened",
    "exchange_type": "milk_fc",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      160
    ],
    "pro": [
      8
    ],
    "cho": [
      12
    ],
    "fat": [
      8
    ],
    "kj": [
      672
    ]
  },
  {
    "name": "Asparagus",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Baby marrow / Courgette / Zucchini",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Bean sprouts",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Beetroot",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Brinjal / Eggplant / Aubergine",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Broccoli",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Brussels sprouts",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Cabbage / Kale",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Carrots",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Cauliflower",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Gem squash",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Green beans",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Mixed vegetables (without corn, peas, potato or other starchy vegetables)",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Peas",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Patty pans",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Red cabbage",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Rhubarb (unsweetened)",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Sauerkraut",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Spinach",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Sugar snap peas",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Turnip",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Onion",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Waterblommetjie",
    "exchange_type": "veg",
    "portions": [
      "1 cup raw / ½ cup cooked"
    ],
    "kcal": [
      25
    ],
    "pro": [
      2
    ],
    "cho": [
      5
    ],
    "fat": [
      0
    ],
    "kj": [
      105
    ]
  },
  {
    "name": "Apple (raw)",
    "exchange_type": "fruit",
    "portions": [
      "1 medium apple"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Apple (dried)",
    "exchange_type": "fruit",
    "portions": [
      "4 rings"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Apple sauce (unsweetened)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Apricots (raw)",
    "exchange_type": "fruit",
    "portions": [
      "2 apricots"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Apricots (dried)",
    "exchange_type": "fruit",
    "portions": [
      "4 halves"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Apricots tinned (unsweetened)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (4 halves)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Banana",
    "exchange_type": "fruit",
    "portions": [
      "1 small banana"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Berries (fresh)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Cherries",
    "exchange_type": "fruit",
    "portions": [
      "12 cherries"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Cherries (canned)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Dates",
    "exchange_type": "fruit",
    "portions": [
      "3 dates"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Dried fruits (cranberries, mixed fruit, raisins)",
    "exchange_type": "fruit",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Figs (raw)",
    "exchange_type": "fruit",
    "portions": [
      "1½ large / 2 medium figs"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Figs (dried)",
    "exchange_type": "fruit",
    "portions": [
      "1½ figs"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Fruit juice (unsweetened)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Fruit salad (unsweetened)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Granadilla",
    "exchange_type": "fruit",
    "portions": [
      "5 medium / 125 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Grapefruit (raw)",
    "exchange_type": "fruit",
    "portions": [
      "½ large grapefruit"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Grapefruit (tinned)",
    "exchange_type": "fruit",
    "portions": [
      "¾ cup (190 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Grapes",
    "exchange_type": "fruit",
    "portions": [
      "8–12 grapes"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Guavas (raw)",
    "exchange_type": "fruit",
    "portions": [
      "2 medium guavas"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Guavas (tinned)",
    "exchange_type": "fruit",
    "portions": [
      "2 halves or ½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Kiwifruit",
    "exchange_type": "fruit",
    "portions": [
      "1 kiwifruit"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Litchis",
    "exchange_type": "fruit",
    "portions": [
      "8–10 litchis"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Melon",
    "exchange_type": "fruit",
    "portions": [
      "1 cup cubed (250 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Mango (fresh)",
    "exchange_type": "fruit",
    "portions": [
      "½ small mango"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Mango (dried)",
    "exchange_type": "fruit",
    "portions": [
      "25 g packet"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Naartjies",
    "exchange_type": "fruit",
    "portions": [
      "2 medium naartjies"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Nectarine",
    "exchange_type": "fruit",
    "portions": [
      "1 small nectarine"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Orange",
    "exchange_type": "fruit",
    "portions": [
      "1 small orange"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Paw paw / Papaya",
    "exchange_type": "fruit",
    "portions": [
      "¼ fruit / 1 cup cubed"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Peach (raw)",
    "exchange_type": "fruit",
    "portions": [
      "1 small peach"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Peach (dried)",
    "exchange_type": "fruit",
    "portions": [
      "2 halves"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Peach (tinned)",
    "exchange_type": "fruit",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Pear (raw)",
    "exchange_type": "fruit",
    "portions": [
      "1 medium pear"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Pear (dried)",
    "exchange_type": "fruit",
    "portions": [
      "2 halves"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Pineapple (fresh)",
    "exchange_type": "fruit",
    "portions": [
      "3 slices (¾ cup fresh)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Plums",
    "exchange_type": "fruit",
    "portions": [
      "2 small plums"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Prunes (dried)",
    "exchange_type": "fruit",
    "portions": [
      "3 prunes"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Raisins",
    "exchange_type": "fruit",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Strawberries",
    "exchange_type": "fruit",
    "portions": [
      "1½ cups (375 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Watermelon",
    "exchange_type": "fruit",
    "portions": [
      "1 slice 330×70 mm (220 g)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      250
    ]
  },
  {
    "name": "Peanuts",
    "exchange_type": "fat",
    "portions": [
      "10 peanuts"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Almonds / cashews",
    "exchange_type": "fat",
    "portions": [
      "5 nuts"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Macadamia nuts",
    "exchange_type": "fat",
    "portions": [
      "3 nuts"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Pecan (whole) / Brazil nuts / Walnuts",
    "exchange_type": "fat",
    "portions": [
      "2 nuts"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Pistachios",
    "exchange_type": "fat",
    "portions": [
      "14 pistachios"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Seeds (mixed)",
    "exchange_type": "fat",
    "portions": [
      "1½ Tbs (22 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Oil (sunflower / canola / peanut)",
    "exchange_type": "fat",
    "portions": [
      "1 tsp (5 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Margarine (regular)",
    "exchange_type": "fat",
    "portions": [
      "1 tsp (5 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Margarine (light)",
    "exchange_type": "fat",
    "portions": [
      "2 tsp (10 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Margarine (extra light / Flora Proactiv)",
    "exchange_type": "fat",
    "portions": [
      "3 tsp (15 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Mayonnaise (regular)",
    "exchange_type": "fat",
    "portions": [
      "1 h tsp (heaped teaspoon)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Mayonnaise lite / Salad creams (Hellmans Lite, House Brand Lite, Steers, Crosse & Blackwell lite)",
    "exchange_type": "fat",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Mayonnaise lite (Trim, Miracle Whip, Spur salad dressing)",
    "exchange_type": "fat",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Salad dressing – regular (vinaigrette, creamy)",
    "exchange_type": "fat",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Salad dressing – light (reduced oil / fat)",
    "exchange_type": "fat",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ],
    "note": "Nutritional content negligible; do not count as a fat exchange"
  },
  {
    "name": "Peanut butter",
    "exchange_type": "fat",
    "portions": [
      "2 tsp (10 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Avocado pear",
    "exchange_type": "fat",
    "portions": [
      "¼ avo (38 g)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Olives",
    "exchange_type": "fat",
    "portions": [
      "5 olives"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Butter",
    "exchange_type": "fat",
    "portions": [
      "1 tsp (5 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Coconut (dried)",
    "exchange_type": "fat",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Coconut milk",
    "exchange_type": "fat",
    "portions": [
      "20 ml"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cream – regular (unwhipped)",
    "exchange_type": "fat",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cream – light (unwhipped)",
    "exchange_type": "fat",
    "portions": [
      "1½ Tbs (22 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cream cheese (low fat)",
    "exchange_type": "fat",
    "portions": [
      "30 g (1 h Dsp)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Cream cheese (regular)",
    "exchange_type": "fat",
    "portions": [
      "15 g"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Orley whip (unwhipped)",
    "exchange_type": "fat",
    "portions": [
      "1½ Tbs (22 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Sour cream (regular)",
    "exchange_type": "fat",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      45
    ],
    "pro": [
      0
    ],
    "cho": [
      0
    ],
    "fat": [
      5
    ],
    "kj": [
      190
    ]
  },
  {
    "name": "Sugar (white / brown)",
    "exchange_type": "sugar",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Honey",
    "exchange_type": "sugar",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Syrup (golden / maple)",
    "exchange_type": "sugar",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Jam",
    "exchange_type": "sugar",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Sports drinks (e.g. Powerade, Game)",
    "exchange_type": "sugar",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Coke / Fanta orange-pine / Sprite / Sparletta / Stoney",
    "exchange_type": "sugar",
    "portions": [
      "125 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Just Juice / Minute Maid",
    "exchange_type": "sugar",
    "portions": [
      "125 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Fanta grape",
    "exchange_type": "sugar",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Lime cordial concentrate",
    "exchange_type": "sugar",
    "portions": [
      "200 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Oros concentrate",
    "exchange_type": "sugar",
    "portions": [
      "200 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Hot chocolate powder",
    "exchange_type": "sugar",
    "portions": [
      "4½ tsp (23 g)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Ice tea (depends on flavour)",
    "exchange_type": "sugar",
    "portions": [
      "200–250 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Energy drink",
    "exchange_type": "sugar",
    "portions": [
      "125 ml"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Jelly sweets",
    "exchange_type": "sugar",
    "portions": [
      "4 sweets"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Hard boiled sweets (Sparkles, Super C's)",
    "exchange_type": "sugar",
    "portions": [
      "5 sweets"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Toffee",
    "exchange_type": "sugar",
    "portions": [
      "5 toffees"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ],
    "note": "Counts as 1 sugar + 1 fat exchange"
  },
  {
    "name": "Marshmallows",
    "exchange_type": "sugar",
    "portions": [
      "2 marshmallows"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Tomato sauce",
    "exchange_type": "sugar",
    "portions": [
      "3 Tbs (45 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Chutney",
    "exchange_type": "sugar",
    "portions": [
      "2 Tbs (30 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Mustard",
    "exchange_type": "sugar",
    "portions": [
      "1 Tbs (15 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Sweet chilli sauce",
    "exchange_type": "sugar",
    "portions": [
      "2 tsp (10 ml)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      240
    ]
  },
  {
    "name": "Beer – light",
    "exchange_type": "alcohol",
    "portions": [
      "330 ml"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ],
    "note": "Equivalent to 1 alcohol exchange + ½ sugar exchange"
  },
  {
    "name": "Beer – regular",
    "exchange_type": "alcohol",
    "portions": [
      "330 ml"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ],
    "note": "Equivalent to 1 alcohol exchange + 1 sugar exchange"
  },
  {
    "name": "Spirits – brandy, vodka, gin, whiskey",
    "exchange_type": "alcohol",
    "portions": [
      "25 ml (1 tot)"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Liqueur (coffee flavour)",
    "exchange_type": "alcohol",
    "portions": [
      "25 ml (1 tot)"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ],
    "note": "Equivalent to 1 alcohol exchange + 1 sugar exchange"
  },
  {
    "name": "Sherry / Port / Muscadel",
    "exchange_type": "alcohol",
    "portions": [
      "100 ml"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Wine – white or red",
    "exchange_type": "alcohol",
    "portions": [
      "150 ml"
    ],
    "kcal": [
      100
    ],
    "pro": [
      0
    ],
    "cho": [
      7
    ],
    "fat": [
      0
    ],
    "kj": [
      420
    ]
  },
  {
    "name": "Burger – McDonalds Quarter Pounder",
    "exchange_type": "combo",
    "portions": [
      "1 burger"
    ],
    "kcal": [
      555
    ],
    "pro": [
      21
    ],
    "cho": [
      45
    ],
    "fat": [
      15
    ],
    "kj": [
      2322
    ],
    "note": "UCT Exchange: 3 CHO + 3 Prot + 3 Fat exchanges"
  },
  {
    "name": "Chicken burger – Nando's",
    "exchange_type": "combo",
    "portions": [
      "220 g standard burger"
    ],
    "kcal": [
      465
    ],
    "pro": [
      21
    ],
    "cho": [
      45
    ],
    "fat": [
      5
    ],
    "kj": [
      1946
    ],
    "note": "UCT Exchange: 3 CHO + 3 Prot + 1 Fat exchanges"
  },
  {
    "name": "Chicken fried (e.g. KFC)",
    "exchange_type": "combo",
    "portions": [
      "1 breast"
    ],
    "kcal": [
      432
    ],
    "pro": [
      28
    ],
    "cho": [
      15
    ],
    "fat": [
      12
    ],
    "kj": [
      1807
    ],
    "note": "UCT Exchange: 1 CHO + 4 Prot + 2 Fat exchanges"
  },
  {
    "name": "Chicken nuggets",
    "exchange_type": "combo",
    "portions": [
      "6 nuggets"
    ],
    "kcal": [
      245
    ],
    "pro": [
      14
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      1025
    ],
    "note": "UCT Exchange: 1 CHO + 2 Prot + 1 Fat exchanges"
  },
  {
    "name": "Chicken wrap (KFC)",
    "exchange_type": "combo",
    "portions": [
      "1 regular wrap"
    ],
    "kcal": [
      545
    ],
    "pro": [
      21
    ],
    "cho": [
      60
    ],
    "fat": [
      5
    ],
    "kj": [
      2280
    ],
    "note": "UCT Exchange: 4 CHO + 3 Prot + 1 Fat exchanges"
  },
  {
    "name": "Chips (slap chips, fried)",
    "exchange_type": "combo",
    "portions": [
      "100 g / 1 cup"
    ],
    "kcal": [
      375
    ],
    "pro": [
      0
    ],
    "cho": [
      45
    ],
    "fat": [
      15
    ],
    "kj": [
      1569
    ],
    "note": "UCT Exchange: 3 CHO + 0 Prot + 3 Fat exchanges"
  },
  {
    "name": "Hamburger, beef including roll",
    "exchange_type": "combo",
    "portions": [
      "1 standard size"
    ],
    "kcal": [
      348
    ],
    "pro": [
      14
    ],
    "cho": [
      30
    ],
    "fat": [
      8
    ],
    "kj": [
      1456
    ],
    "note": "UCT Exchange: 2 CHO + 2 Prot + 2 Fat exchanges"
  },
  {
    "name": "Kauai Princess wrap",
    "exchange_type": "combo",
    "portions": [
      "1 princess wrap"
    ],
    "kcal": [
      540
    ],
    "pro": [
      14
    ],
    "cho": [
      45
    ],
    "fat": [
      20
    ],
    "kj": [
      2259
    ],
    "note": "UCT Exchange: 3 CHO + 2 Prot + 4 Fat exchanges"
  },
  {
    "name": "Pie, commercial (meat / chicken filling)",
    "exchange_type": "combo",
    "portions": [
      "1 standard (140 g)"
    ],
    "kcal": [
      570
    ],
    "pro": [
      7
    ],
    "cho": [
      45
    ],
    "fat": [
      30
    ],
    "kj": [
      2385
    ],
    "note": "UCT Exchange: 3 CHO + 1 Prot + 6 Fat exchanges"
  },
  {
    "name": "Pizza, thin crust (depends on toppings)",
    "exchange_type": "combo",
    "portions": [
      "¼ of 30 cm pizza"
    ],
    "kcal": [
      348
    ],
    "pro": [
      14
    ],
    "cho": [
      30
    ],
    "fat": [
      8
    ],
    "kj": [
      1456
    ],
    "note": "UCT Exchange: 2 CHO + 2 Prot + 2 Fat exchanges"
  },
  {
    "name": "Brownie",
    "exchange_type": "combo",
    "portions": [
      "30 g"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Cake, iced",
    "exchange_type": "combo",
    "portions": [
      "1 matchbox size"
    ],
    "kcal": [
      250
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1046
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Cake, no icing (sponge only)",
    "exchange_type": "combo",
    "portions": [
      "1 matchbox size"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Chocolate chip cookie",
    "exchange_type": "combo",
    "portions": [
      "2 small"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Croissant",
    "exchange_type": "combo",
    "portions": [
      "1 standard"
    ],
    "kcal": [
      295
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      15
    ],
    "kj": [
      1234
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 3 Fat exchanges"
  },
  {
    "name": "Doughnut, plain glazed / sugared",
    "exchange_type": "combo",
    "portions": [
      "1 small"
    ],
    "kcal": [
      250
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1046
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Hot cross bun",
    "exchange_type": "combo",
    "portions": [
      "1 regular"
    ],
    "kcal": [
      205
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      5
    ],
    "kj": [
      858
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Lemon cream biscuits",
    "exchange_type": "combo",
    "portions": [
      "2 small"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Mince pie (Christmas pudding)",
    "exchange_type": "combo",
    "portions": [
      "1 regular"
    ],
    "kcal": [
      330
    ],
    "pro": [
      0
    ],
    "cho": [
      45
    ],
    "fat": [
      10
    ],
    "kj": [
      1381
    ],
    "note": "UCT Exchange: 3 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Pancake (made with full cream milk), plain",
    "exchange_type": "combo",
    "portions": [
      "1 medium"
    ],
    "kcal": [
      315
    ],
    "pro": [
      7
    ],
    "cho": [
      22
    ],
    "fat": [
      15
    ],
    "kj": [
      1318
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 3 Fat exchanges"
  },
  {
    "name": "Romany cream biscuits",
    "exchange_type": "combo",
    "portions": [
      "2 small"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Scone",
    "exchange_type": "combo",
    "portions": [
      "½ medium"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Shortbread",
    "exchange_type": "combo",
    "portions": [
      "2 small"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Tennis biscuit",
    "exchange_type": "combo",
    "portions": [
      "3 small"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Rusk",
    "exchange_type": "combo",
    "portions": [
      "1 medium"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Bar One",
    "exchange_type": "combo",
    "portions": [
      "1 medium bar (±50 g)"
    ],
    "kcal": [
      250
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1046
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Chocolate (plain)",
    "exchange_type": "combo",
    "portions": [
      "6 small blocks"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Crunchie",
    "exchange_type": "combo",
    "portions": [
      "1 medium bar (±40 g)"
    ],
    "kcal": [
      250
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1046
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "KitKat",
    "exchange_type": "combo",
    "portions": [
      "2 fingers (22.5 g)"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Lunch Bar",
    "exchange_type": "combo",
    "portions": [
      "1 medium bar (±40 g)"
    ],
    "kcal": [
      250
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1046
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Aero (chunky bar)",
    "exchange_type": "combo",
    "portions": [
      "1 bar (38 g)"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Crisps, potato",
    "exchange_type": "combo",
    "portions": [
      "1 small packet"
    ],
    "kcal": [
      192
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      12
    ],
    "kj": [
      803
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Flings",
    "exchange_type": "combo",
    "portions": [
      "12 g packet (small)"
    ],
    "kcal": [
      80
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      0
    ],
    "kj": [
      335
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 0 Fat exchanges"
  },
  {
    "name": "Nik Naks",
    "exchange_type": "combo",
    "portions": [
      "55 g packet (medium)"
    ],
    "kcal": [
      340
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      20
    ],
    "kj": [
      1423
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 4 Fat exchanges"
  },
  {
    "name": "Samoosa (small)",
    "exchange_type": "combo",
    "portions": [
      "1 small (8×8 cm)"
    ],
    "kcal": [
      295
    ],
    "pro": [
      4
    ],
    "cho": [
      8
    ],
    "fat": [
      25
    ],
    "kj": [
      1234
    ],
    "note": "UCT Exchange: 0 CHO + 0 Prot + 5 Fat exchanges"
  },
  {
    "name": "Vetkoek (homemade)",
    "exchange_type": "combo",
    "portions": [
      "1 medium"
    ],
    "kcal": [
      458
    ],
    "pro": [
      7
    ],
    "cho": [
      45
    ],
    "fat": [
      18
    ],
    "kj": [
      1916
    ],
    "note": "UCT Exchange: 3 CHO + 1 Prot + 4 Fat exchanges"
  },
  {
    "name": "Dinner microwave meal, commercial",
    "exchange_type": "combo",
    "portions": [
      "1 serving"
    ],
    "kcal": [
      555
    ],
    "pro": [
      21
    ],
    "cho": [
      45
    ],
    "fat": [
      15
    ],
    "kj": [
      2322
    ],
    "note": "UCT Exchange: 3 CHO + 3 Prot + 3 Fat exchanges"
  },
  {
    "name": "Hotdog, boerewors roll including roll",
    "exchange_type": "combo",
    "portions": [
      "1 standard size"
    ],
    "kcal": [
      400
    ],
    "pro": [
      18
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1674
    ],
    "note": "UCT Exchange: 2 CHO + 2 Prot + 2 Fat exchanges"
  },
  {
    "name": "Hotdog, vienna sausage including roll",
    "exchange_type": "combo",
    "portions": [
      "1 standard size"
    ],
    "kcal": [
      310
    ],
    "pro": [
      7
    ],
    "cho": [
      30
    ],
    "fat": [
      10
    ],
    "kj": [
      1297
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 2 Fat exchanges"
  },
  {
    "name": "Fish, crumbed / battered and fried",
    "exchange_type": "combo",
    "portions": [
      "180 g"
    ],
    "kcal": [
      432
    ],
    "pro": [
      28
    ],
    "cho": [
      15
    ],
    "fat": [
      12
    ],
    "kj": [
      1807
    ],
    "note": "UCT Exchange: 1 CHO + 4 Prot + 2 Fat exchanges"
  },
  {
    "name": "I & J (light and crispy multigrain) fish",
    "exchange_type": "combo",
    "portions": [
      "1 fish portion"
    ],
    "kcal": [
      185
    ],
    "pro": [
      7
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      774
    ],
    "note": "UCT Exchange: 1 CHO + 1 Prot + 1 Fat exchanges"
  },
  {
    "name": "Fish fingers",
    "exchange_type": "combo",
    "portions": [
      "4 sticks"
    ],
    "kcal": [
      475
    ],
    "pro": [
      21
    ],
    "cho": [
      30
    ],
    "fat": [
      15
    ],
    "kj": [
      1987
    ],
    "note": "UCT Exchange: 2 CHO + 3 Prot + 3 Fat exchanges"
  },
  {
    "name": "Pasta dish, meat / chicken with sauce",
    "exchange_type": "combo",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      355
    ],
    "pro": [
      18
    ],
    "cho": [
      30
    ],
    "fat": [
      5
    ],
    "kj": [
      1485
    ],
    "note": "UCT Exchange: 2 CHO + 2 Prot + 1 Fat exchanges"
  },
  {
    "name": "Toasted chicken and mayo sandwich",
    "exchange_type": "combo",
    "portions": [
      "1 sandwich"
    ],
    "kcal": [
      378
    ],
    "pro": [
      7
    ],
    "cho": [
      30
    ],
    "fat": [
      18
    ],
    "kj": [
      1582
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 4 Fat exchanges"
  },
  {
    "name": "Toasted cheese sandwich",
    "exchange_type": "combo",
    "portions": [
      "1 sandwich"
    ],
    "kcal": [
      378
    ],
    "pro": [
      7
    ],
    "cho": [
      30
    ],
    "fat": [
      18
    ],
    "kj": [
      1582
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 4 Fat exchanges"
  },
  {
    "name": "Soup, cream varieties",
    "exchange_type": "combo",
    "portions": [
      "1 cup (250 ml)"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Sushi (California rolls)",
    "exchange_type": "combo",
    "portions": [
      "6 rolls"
    ],
    "kcal": [
      220
    ],
    "pro": [
      7
    ],
    "cho": [
      30
    ],
    "fat": [
      0
    ],
    "kj": [
      920
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 0 Fat exchanges"
  },
  {
    "name": "Sushi (sashimi)",
    "exchange_type": "combo",
    "portions": [
      "1 piece (30 g)"
    ],
    "kcal": [
      60
    ],
    "pro": [
      7
    ],
    "cho": [
      0
    ],
    "fat": [
      0
    ],
    "kj": [
      251
    ],
    "note": "UCT Exchange: 0 CHO + 1 Prot + 0 Fat exchanges"
  },
  {
    "name": "Energy / sport bar",
    "exchange_type": "combo",
    "portions": [
      "1 × 60 g bar"
    ],
    "kcal": [
      205
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      5
    ],
    "kj": [
      858
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Cereal bar",
    "exchange_type": "combo",
    "portions": [
      "1 bar"
    ],
    "kcal": [
      120
    ],
    "pro": [
      0
    ],
    "cho": [
      22
    ],
    "fat": [
      0
    ],
    "kj": [
      502
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 0 Fat exchanges"
  },
  {
    "name": "Hot chocolate (regular)",
    "exchange_type": "combo",
    "portions": [
      "250 ml"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Ice-cream (depends on type)",
    "exchange_type": "combo",
    "portions": [
      "½ cup (125 ml)"
    ],
    "kcal": [
      125
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      5
    ],
    "kj": [
      523
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Ice-cream, soft-serve cone",
    "exchange_type": "combo",
    "portions": [
      "1 small"
    ],
    "kcal": [
      205
    ],
    "pro": [
      0
    ],
    "cho": [
      30
    ],
    "fat": [
      5
    ],
    "kj": [
      858
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Frozen yoghurt (Marcelle's)",
    "exchange_type": "combo",
    "portions": [
      "1 tub (175 ml)"
    ],
    "kcal": [
      305
    ],
    "pro": [
      7
    ],
    "cho": [
      38
    ],
    "fat": [
      5
    ],
    "kj": [
      1276
    ],
    "note": "UCT Exchange: 2 CHO + 1 Prot + 1 Fat exchanges"
  },
  {
    "name": "Magnum ice cream",
    "exchange_type": "combo",
    "portions": [
      "1 ice cream"
    ],
    "kcal": [
      255
    ],
    "pro": [
      0
    ],
    "cho": [
      22
    ],
    "fat": [
      15
    ],
    "kj": [
      1067
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 3 Fat exchanges"
  },
  {
    "name": "Popcorn (commercial microwave)",
    "exchange_type": "combo",
    "portions": [
      "4 cups (25 g)"
    ],
    "kcal": [
      148
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      8
    ],
    "kj": [
      619
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Salticrax",
    "exchange_type": "combo",
    "portions": [
      "5 biscuits"
    ],
    "kcal": [
      170
    ],
    "pro": [
      0
    ],
    "cho": [
      15
    ],
    "fat": [
      10
    ],
    "kj": [
      711
    ],
    "note": "UCT Exchange: 1 CHO + 0 Prot + 2 Fat exchanges"
  },
  {
    "name": "Future Life Original (dry cereal)",
    "exchange_type": "combo",
    "portions": [
      "1 sachet (40 g) / 3 Tbs"
    ],
    "kcal": [
      165
    ],
    "pro": [
      0
    ],
    "cho": [
      22
    ],
    "fat": [
      5
    ],
    "kj": [
      690
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Future Life Crunch (dry cereal)",
    "exchange_type": "combo",
    "portions": [
      "40 g / 3 Tbs"
    ],
    "kcal": [
      165
    ],
    "pro": [
      0
    ],
    "cho": [
      22
    ],
    "fat": [
      5
    ],
    "kj": [
      690
    ],
    "note": "UCT Exchange: 2 CHO + 0 Prot + 1 Fat exchanges"
  },
  {
    "name": "Future Life High Protein (dry cereal)",
    "exchange_type": "combo",
    "portions": [
      "1 sachet (75 g) / 6 Tbs"
    ],
    "kcal": [
      325
    ],
    "pro": [
      14
    ],
    "cho": [
      30
    ],
    "fat": [
      5
    ],
    "kj": [
      1360
    ],
    "note": "UCT Exchange: 2 CHO + 2 Prot + 1 Fat exchanges"
  }
];

// ══════════════════════════════════════════════════════════════
// 3. UCT EXCHANGE TYPE LABELS, COLORS & MACROS
// ══════════════════════════════════════════════════════════════
const UCT_EXCHANGE_TYPE_LABELS = {
  starch:   'Starch',
  lean:     'Protein (Lean)',
  medium:   'Protein (Medium-fat)',
  highfat:  'Protein (High-fat)',
  milk_ff:  'Milk (Fat-free)',
  milk_lf:  'Milk (Low-fat)',
  milk_fc:  'Milk (Full cream)',
  veg:      'Vegetables',
  fruit:    'Fruits',
  fat:      'Fats & Oils',
  sugar:    'Sugar/Sweets',
  alcohol:  'Alcohol',
  combo:    'Combination Foods',
};
const UCT_TYPE_LABELS = {
  starch:'Starch', lean:'Protein (Lean)', medium:'Protein (Med-fat)',
  highfat:'Protein (High-fat)', milk_ff:'Milk Fat-free', milk_lf:'Milk Low-fat',
  milk_fc:'Milk Full cream', veg:'Vegetables', fruit:'Fruit',
  fat:'Fat', sugar:'Sugar/Sweets', alcohol:'Alcohol', combo:'Combination',
};
const UCT_TYPE_COLORS = {
  starch:'var(--teal)', lean:'var(--blue)', medium:'#7eb8ff', highfat:'var(--amber)',
  milk_ff:'#e0aaff', milk_lf:'#c77dff', milk_fc:'#9d4edd',
  veg:'var(--green)', fruit:'#ffdd57', fat:'#ff9f43', sugar:'#ff6b9d',
  alcohol:'var(--red)', combo:'var(--text-dim)',
};
const UCT_MACROS = {
  starch:{kcal:80,kj:335,cho:15,pro:3,fat:0},
  lean:{kcal:45,kj:190,cho:0,pro:7,fat:2}, medium:{kcal:75,kj:315,cho:0,pro:7,fat:5},
  highfat:{kcal:100,kj:420,cho:0,pro:7,fat:8},
  milk_ff:{kcal:80,kj:335,cho:12,pro:8,fat:0}, milk_lf:{kcal:120,kj:504,cho:12,pro:8,fat:5},
  milk_fc:{kcal:160,kj:672,cho:12,pro:8,fat:8},
  veg:{kcal:25,kj:105,cho:5,pro:2,fat:0}, fruit:{kcal:60,kj:250,cho:15,pro:0,fat:0},
  fat:{kcal:45,kj:190,cho:0,pro:0,fat:5}, sugar:{kcal:60,kj:240,cho:15,pro:0,fat:0},
  alcohol:{kcal:100,kj:420,cho:7,pro:0,fat:0},
};


// ══════════════════════════════════════════════════════════════
// 4. MP_FOODS — Meal Planner Food Categories
// Note: MP_FOODS.exchange references UCT_EXCHANGE_DB (declared above)
// ══════════════════════════════════════════════════════════════
const MP_FOODS = {
  staples: [
    { name:'Nsima (maize porridge, thick)', portions:['1 cup (240g)','½ cup (120g)','2 cups (480g)'], kcal:[246,123,492], pro:[5.3,2.65,10.6], cho:[55,27.5,110], fat:[1.2,0.6,2.4], kj:[1030,515,2060] },
    { name:'Mgaiwa (whole-grain maize porridge)', portions:['1 cup (250g)','½ cup (125g)'], kcal:[218,109], pro:[5.5,2.75], cho:[47,23.5], fat:[2.0,1.0], kj:[913,456] },
    { name:'Rice (cooked, white)', portions:['1 cup (185g)','½ cup (93g)','¾ cup (140g)'], kcal:[242,121,182], pro:[4.4,2.2,3.3], cho:[53,26.5,40], fat:[0.4,0.2,0.3], kj:[1013,507,762] },
    { name:'Bread (white, slice)', portions:['1 slice (30g)','2 slices (60g)'], kcal:[79,158], pro:[2.7,5.4], cho:[15,30], fat:[0.9,1.8], kj:[331,662] },
    { name:'Bread (brown/wholegrain, slice)', portions:['1 slice (30g)','2 slices (60g)'], kcal:[72,144], pro:[3.0,6.0], cho:[13,26], fat:[1.0,2.0], kj:[302,604] },
    { name:'Sweet potato (cooked)', portions:['1 medium (130g)','½ medium (65g)'], kcal:[112,56], pro:[2.0,1.0], cho:[26,13], fat:[0.1,0.05], kj:[469,234] },
    { name:'Cassava (boiled)', portions:['1 cup chunks (206g)','½ cup (103g)'], kcal:[330,165], pro:[2.8,1.4], cho:[78,39], fat:[0.6,0.3], kj:[1381,690] },
    { name:'Irish potato (boiled)', portions:['1 medium (150g)','½ medium (75g)'], kcal:[116,58], pro:[2.5,1.25], cho:[27,13.5], fat:[0.1,0.05], kj:[486,243] },
    { name:'Sorghum porridge', portions:['1 cup (240g)','½ cup (120g)'], kcal:[215,107], pro:[6.0,3.0], cho:[45,22.5], fat:[2.0,1.0], kj:[900,450] },
    { name:'Finger millet (ufa wazimu) porridge', portions:['1 cup (240g)','½ cup (120g)'], kcal:[225,112], pro:[5.5,2.75], cho:[48,24], fat:[1.5,0.75], kj:[942,471] },
  ],
  legumes: [
    { name:'Beans (cooked, any type)', portions:['1 cup (177g)','½ cup (89g)','¾ cup (133g)'], kcal:[245,123,184], pro:[15,7.5,11.3], cho:[44,22,33], fat:[1.0,0.5,0.75], kj:[1026,513,770] },
    { name:'Groundnuts (peanuts, roasted)', portions:['1 tablespoon (15g)','2 tablespoons (30g)','¼ cup (35g)'], kcal:[86,172,201], pro:[3.5,7.0,8.2], cho:[2.8,5.6,6.5], fat:[7.3,14.6,17], kj:[360,720,842] },
    { name:'Peanut butter', portions:['1 tablespoon (16g)','2 tablespoons (32g)'], kcal:[94,188], pro:[4.0,8.0], cho:[3,6], fat:[8,16], kj:[394,788] },
    { name:'Soya bean (cooked)', portions:['½ cup (86g)','1 cup (172g)'], kcal:[149,298], pro:[14.3,28.6], cho:[8.5,17], fat:[7.7,15.4], kj:[624,1248] },
    { name:'Lentils (cooked)', portions:['½ cup (99g)','1 cup (198g)'], kcal:[115,230], pro:[9.0,18], cho:[20,40], fat:[0.4,0.8], kj:[481,962] },
    { name:'Pigeon peas (nandolo, cooked)', portions:['½ cup (85g)','1 cup (170g)'], kcal:[102,204], pro:[5.7,11.4], cho:[18,36], fat:[0.6,1.2], kj:[427,854] },
  ],
  veg: [
    { name:'Pumpkin leaves (chibwabwa, cooked)', portions:['½ cup (75g)','1 cup (150g)'], kcal:[26,52], pro:[3.0,6.0], cho:[3,6], fat:[0.4,0.8], kj:[109,218] },
    { name:'Sweet potato leaves (cooked)', portions:['½ cup (65g)','1 cup (130g)'], kcal:[22,44], pro:[2.5,5.0], cho:[3,6], fat:[0.2,0.4], kj:[92,184] },
    { name:'Rape/kale (cooked)', portions:['½ cup (65g)','1 cup (130g)'], kcal:[18,36], pro:[2.0,4.0], cho:[2,4], fat:[0.3,0.6], kj:[75,150] },
    { name:'Tomato (raw)', portions:['1 medium (123g)','2 medium (246g)'], kcal:[22,44], pro:[1.1,2.2], cho:[4.8,9.6], fat:[0.2,0.4], kj:[92,184] },
    { name:'Onion (raw)', portions:['½ medium (55g)','1 medium (110g)'], kcal:[22,44], pro:[0.7,1.4], cho:[5.1,10.2], fat:[0.1,0.2], kj:[92,184] },
    { name:'Carrot (cooked)', portions:['½ cup (78g)','1 cup (156g)'], kcal:[27,54], pro:[0.6,1.2], cho:[6.4,12.8], fat:[0.1,0.2], kj:[113,226] },
    { name:'Okra (cooked)', portions:['½ cup (80g)','1 cup (160g)'], kcal:[18,36], pro:[1.9,3.8], cho:[3.6,7.2], fat:[0.2,0.4], kj:[75,150] },
    { name:'Cabbage (cooked)', portions:['½ cup (75g)','1 cup (150g)'], kcal:[17,34], pro:[0.9,1.8], cho:[3.7,7.4], fat:[0.1,0.2], kj:[71,142] },
  ],
  fruit: [
    { name:'Banana (ripe)', portions:['1 medium (118g)','½ medium (59g)'], kcal:[105,53], pro:[1.3,0.65], cho:[27,13.5], fat:[0.4,0.2], kj:[440,220] },
    { name:'Mango (ripe)', portions:['1 medium (200g)','½ medium (100g)'], kcal:[135,68], pro:[1.1,0.55], cho:[35,17.5], fat:[0.6,0.3], kj:[565,283] },
    { name:'Papaya/Pawpaw', portions:['1 cup cubed (140g)','½ cup (70g)'], kcal:[55,28], pro:[0.9,0.45], cho:[14,7], fat:[0.1,0.05], kj:[230,115] },
    { name:'Orange', portions:['1 medium (131g)','2 medium (262g)'], kcal:[62,124], pro:[1.2,2.4], cho:[15,30], fat:[0.2,0.4], kj:[260,520] },
    { name:'Guava', portions:['1 medium (55g)','2 medium (110g)'], kcal:[37,74], pro:[1.4,2.8], cho:[7.9,15.8], fat:[0.5,1.0], kj:[155,310] },
    { name:'Avocado', portions:['½ avocado (68g)','1 avocado (136g)'], kcal:[114,228], pro:[1.3,2.6], cho:[6,12], fat:[10.5,21], kj:[477,954] },
  ],
  protein: [
    { name:'Beef (cooked, lean)', portions:['30g (matchbox)','60g','90g'], kcal:[61,122,183], pro:[9.3,18.6,27.9], cho:[0,0,0], fat:[2.5,5,7.5], kj:[255,510,765] },
    { name:'Chicken (cooked, no skin)', portions:['30g','60g','90g'], kcal:[50,100,150], pro:[9.5,19,28.5], cho:[0,0,0], fat:[1.4,2.8,4.2], kj:[209,418,628] },
    { name:'Fish (usipa, kapenta — dried)', portions:['1 tablespoon (10g)','2 tablespoons (20g)'], kcal:[33,66], pro:[6.5,13], cho:[0,0], fat:[0.7,1.4], kj:[138,276] },
    { name:'Fish (fresh, chambo, cooked)', portions:['30g','60g','90g'], kcal:[39,78,117], pro:[8.5,17,25.5], cho:[0,0,0], fat:[0.6,1.2,1.8], kj:[163,326,490] },
    { name:'Egg (whole, boiled)', portions:['1 large egg (50g)','2 eggs (100g)'], kcal:[72,144], pro:[6.3,12.6], cho:[0.4,0.8], fat:[4.8,9.6], kj:[301,602] },
    { name:'Milk (full cream)', portions:['1 cup 250mL','½ cup 125mL'], kcal:[152,76], pro:[7.7,3.85], cho:[11.7,5.85], fat:[8.1,4.05], kj:[636,318] },
    { name:'Sour milk/Lacto (mageu)', portions:['1 cup 250mL','½ cup 125mL'], kcal:[165,83], pro:[8.5,4.25], cho:[14,7], fat:[7,3.5], kj:[691,345] },
    { name:'Beef liver (cooked)', portions:['30g','60g'], kcal:[56,112], pro:[8.3,16.6], cho:[1.1,2.2], fat:[2.1,4.2], kj:[234,468] },
  ],
  fats: [
    { name:'Cooking oil (any)', portions:['1 teaspoon (5mL)','1 tablespoon (15mL)'], kcal:[44,133], pro:[0,0], cho:[0,0], fat:[5,15], kj:[184,559] },
    { name:'Margarine / butter', portions:['1 teaspoon (5g)','1 tablespoon (14g)'], kcal:[35,101], pro:[0.04,0.12], cho:[0.04,0.12], fat:[4,11.5], kj:[147,423] },
  ],
  therapeutic: [
    { name:'RUTF (Plumpy\'Nut® sachet)', portions:['1 sachet (92g)','½ sachet (46g)'], kcal:[500,250], pro:[12.5,6.25], cho:[53.5,26.75], fat:[28,14], kj:[2092,1046], note:'Ready-to-Use Therapeutic Food for SAM. 1 sachet = 500 kcal. Standard dose: 200 kcal/kg/day in SAM.' },
    { name:'RUTF (Plumpy\'Sup® — RUSF for MAM)', portions:['1 sachet (92g)','½ sachet (46g)'], kcal:[400,200], pro:[10,5], cho:[47,23.5], fat:[21,10.5], kj:[1675,837], note:'Ready-to-Use Supplementary Food for MAM.' },
    { name:'F-75 (therapeutic milk, 100mL)', portions:['100 mL','200 mL','300 mL'], kcal:[75,150,225], pro:[0.9,1.8,2.7], cho:[13.3,26.6,39.9], fat:[2.6,5.2,7.8], kj:[314,628,942], note:'F-75: Starter formula for SAM stabilisation phase. 75 kcal/100mL.' },
    { name:'F-100 (therapeutic milk, 100mL)', portions:['100 mL','200 mL','300 mL'], kcal:[100,200,300], pro:[2.9,5.8,8.7], cho:[13.5,27,40.5], fat:[5.4,10.8,16.2], kj:[419,838,1257], note:'F-100: Catch-up formula for SAM rehabilitation phase. 100 kcal/100mL.' },
    { name:'Plumpy\'Doz® (LNS-MQ, supplementary)', portions:['1 sachet (46g)','2 sachets (92g)'], kcal:[247,494], pro:[6.2,12.4], cho:[24,48], fat:[15,30], kj:[1034,2068], note:'Lipid-Based Nutrient Supplement — Medium Quantity for MAM.' },
    { name:'BP-100 (biscuit for SAM, bar)', portions:['1 bar (90g)','½ bar (45g)'], kcal:[450,225], pro:[15,7.5], cho:[60.8,30.4], fat:[17.5,8.75], kj:[1884,942], note:'High-energy biscuit for acute malnutrition. Used in therapeutic feeding programmes.' },
  ],
  ons: [
    { name:'Ensure Plus (237mL carton)', portions:['1 carton (237mL)','½ carton (118mL)'], kcal:[350,175], pro:[13,6.5], cho:[44,22], fat:[11,5.5], kj:[1465,733], note:'Complete ONS. 1.5 kcal/mL. Contains 13g protein per serving.' },
    { name:'Ensure Original (237mL carton)', portions:['1 carton (237mL)','½ carton (118mL)'], kcal:[220,110], pro:[9,4.5], cho:[31,15.5], fat:[6,3], kj:[921,460], note:'Standard ONS. 0.93 kcal/mL.' },
    { name:'Resource High Protein (200mL)', portions:['1 bottle (200mL)','½ bottle (100mL)'], kcal:[200,100], pro:[18,9], cho:[22,11], fat:[5,2.5], kj:[837,419], note:'High protein ONS. 1.0 kcal/mL, 18g protein per 200mL.' },
    { name:'Fresubin Drink 2 kcal (200mL)', portions:['1 bottle (200mL)','½ bottle (100mL)'], kcal:[400,200], pro:[20,10], cho:[38,19], fat:[17,8.5], kj:[1674,837], note:'High energy, high protein sip feed. 2 kcal/mL.' },
    { name:'Fresubin 3.2 kcal DRINK (125mL)', portions:['1 bottle (125mL)','½ bottle (62mL)'], kcal:[400,200], pro:[20,10], cho:[31.3,15.7], fat:[20,10], kj:[1680,840], note:'Ultra high-energy ONS — 3.2 kcal/mL. 400 kcal and 20g protein per 125 mL bottle. Collagen hydrolysate + milk protein. Use 2 bottles/day for clinical targets.' },
    { name:'Fresubin Jucy DRINK (200mL)', portions:['1 bottle (200mL)','½ bottle (100mL)'], kcal:[300,150], pro:[8,4], cho:[67,33.5], fat:[0,0], kj:[1256,628], note:'Juice-style, fat-free ONS. 1.5 kcal/mL, 4g whey protein/100mL. Suitable for fat malabsorption and clear fluid diets. Blackcurrant or Pineapple.' },
    { name:'Supportan DRINK (200mL)', portions:['1 bottle (200mL)','½ bottle (100mL)'], kcal:[300,150], pro:[20,10], cho:[24.8,12.4], fat:[13.4,6.7], kj:[1256,628], note:'Oncology/cachexia oral supplement. 1.5 kcal/mL, 27% protein, 40% fat, 33% CHO. High EPA from fish oil — anti-inflammatory, muscle-preserving.' },
    { name:'Fresubin Energy (200mL sip feed)', portions:['1 bottle (200mL)','½ bottle (100mL)'], kcal:[300,150], pro:[11.2,5.6], cho:[37,18.5], fat:[11.8,5.9], kj:[1255,628], note:'Energy dense oral supplement. 1.5 kcal/mL.' },
    { name:'Complan (50g sachet, mixed)', portions:['1 sachet (50g + 200mL water)'], kcal:[198], pro:[10.0], cho:[28], fat:[5.0], kj:[829], note:'Powdered ONS. Mix 50g with 200mL water or milk.' },
  ],
  exchange: UCT_EXCHANGE_DB.filter(e => e.exchange_type !== 'combo')
};

// ══════════════════════════════════════════════════════════════
// 5. BLEND_FOODS — Blenderized Feed Ingredient Database
// ══════════════════════════════════════════════════════════════
// ── Blenderized Feed: Foods database ──────────────────────────────────
// All values derived from MP_FOODS (Malawi FCT + protein foods database)
// unit: 'ml' = per ml; 'g' = per gram; 'unit' = fixed portion (e.g. 1 egg)
const BLEND_FOODS = [
  // ── STAPLES ──
  // Nsima: 246 kcal/240g → 1.025/g; pro 5.3/240=0.02208; cho 55/240=0.229; fat 1.2/240=0.005
  { id:'nsima',        name:'Nsima (maize porridge, thick)',    unit:'g',    kcal:1.025, pro:0.0221, fat:0.0050, cho:0.2292 },
  // Mgaiwa: 218/250g=0.872/g; pro 5.5/250=0.022; cho 47/250=0.188; fat 2.0/250=0.008
  { id:'mgaiwa',       name:'Mgaiwa (whole-grain porridge)',    unit:'g',    kcal:0.872, pro:0.0220, fat:0.0080, cho:0.1880 },
  // Likuni Phala: maize-soy blend, estimated (not directly in MP_FOODS)
  { id:'likuni',       name:'Likuni Phala (cooked, sieved)',    unit:'ml',   kcal:0.550, pro:0.0250, fat:0.0100, cho:0.0960 },
  // Thin maize porridge (0.5 nsima density): ~0.38/ml
  { id:'maize_thin',   name:'Thin maize porridge',             unit:'ml',   kcal:0.380, pro:0.0088, fat:0.0030, cho:0.0850 },
  // Rice cooked: 242/185g=1.308/g; pro 4.4/185=0.0238; cho 53/185=0.286; fat 0.4/185=0.00216
  { id:'rice',         name:'Rice (cooked, white)',             unit:'g',    kcal:1.308, pro:0.0238, fat:0.0022, cho:0.2865 },
  // Bread white: 79/30g=2.633/g; pro 2.7/30=0.09; cho 15/30=0.5; fat 0.9/30=0.03
  { id:'bread_white',  name:'Bread (white, per slice)',         unit:'unit', kcal:79,    pro:2.700,  fat:0.900,  cho:15.00 },
  { id:'bread_brown',  name:'Bread (brown/wholegrain, slice)',  unit:'unit', kcal:72,    pro:3.000,  fat:1.000,  cho:13.00 },
  // Sweet potato: 112/130g=0.862/g; pro 2.0/130=0.0154; cho 26/130=0.2; fat 0.1/130=0.00077
  { id:'swpot',        name:'Sweet potato (cooked)',            unit:'g',    kcal:0.862, pro:0.0154, fat:0.0008, cho:0.2000 },
  // Cassava: 330/206g=1.602/g; pro 2.8/206=0.0136; cho 78/206=0.379; fat 0.6/206=0.0029
  { id:'cassava',      name:'Cassava (boiled)',                 unit:'g',    kcal:1.602, pro:0.0136, fat:0.0029, cho:0.3786 },
  // Irish potato: 116/150g=0.773/g; pro 2.5/150=0.0167; cho 27/150=0.18; fat 0.1/150=0.00067
  { id:'irish_potato', name:'Irish potato (boiled)',            unit:'g',    kcal:0.773, pro:0.0167, fat:0.0007, cho:0.1800 },
  // Sorghum porridge: 215/240g=0.896/g; pro 6/240=0.025; cho 45/240=0.1875; fat 2/240=0.0083
  { id:'sorghum',      name:'Sorghum porridge',                 unit:'g',    kcal:0.896, pro:0.0250, fat:0.0083, cho:0.1875 },

  // ── LEGUMES ──
  // Beans cooked: 245/177g=1.384/g; pro 15/177=0.0847; cho 44/177=0.249; fat 1/177=0.00565
  { id:'beans',        name:'Beans (cooked, any type)',         unit:'g',    kcal:1.384, pro:0.0847, fat:0.0057, cho:0.2486 },
  // Groundnuts: 86/15g=5.733/g; pro 3.5/15=0.2333; cho 2.8/15=0.1867; fat 7.3/15=0.4867
  { id:'gnut',         name:'Groundnuts (peanuts, roasted)',    unit:'g',    kcal:5.733, pro:0.2333, fat:0.4867, cho:0.1867 },
  // Peanut butter: 94/16g=5.875/g; pro 4/16=0.25; cho 3/16=0.1875; fat 8/16=0.5
  { id:'gnut_paste',   name:'Peanut butter / groundnut paste',  unit:'g',    kcal:5.875, pro:0.2500, fat:0.5000, cho:0.1875 },
  // Soya cooked: 149/86g=1.733/g; pro 14.3/86=0.1663; cho 8.5/86=0.0988; fat 7.7/86=0.0895
  { id:'soya',         name:'Soya bean (cooked)',                unit:'g',    kcal:1.733, pro:0.1663, fat:0.0895, cho:0.0988 },
  // Lentils: 115/99g=1.162/g; pro 9/99=0.0909; cho 20/99=0.202; fat 0.4/99=0.00404
  { id:'lentils',      name:'Lentils (cooked)',                  unit:'g',    kcal:1.162, pro:0.0909, fat:0.0040, cho:0.2020 },
  // Pigeon peas: 102/85g=1.2/g; pro 5.7/85=0.0671; cho 18/85=0.212; fat 0.6/85=0.00706
  { id:'pigeon_peas',  name:'Pigeon peas / nandolo (cooked)',   unit:'g',    kcal:1.200, pro:0.0671, fat:0.0071, cho:0.2118 },

  // ── PROTEIN FOODS ──
  // Milk full cream: 152/250ml=0.608/ml; pro 7.7/250=0.0308; fat 8.1/250=0.0324; cho 11.7/250=0.0468
  { id:'milk',         name:'Milk (full cream)',                unit:'ml',   kcal:0.608, pro:0.0308, fat:0.0324, cho:0.0468 },
  // Egg: fixed unit 50g = 72 kcal; pro 6.3g; fat 4.8g; cho 0.4g
  { id:'egg',          name:'Egg (boiled, whole) — per unit',   unit:'unit', kcal:72,    pro:6.300,  fat:4.800,  cho:0.400  },
  // Chicken cooked: 50/30g=1.667/g; pro 9.5/30=0.3167; fat 1.4/30=0.04667; cho 0
  { id:'chicken',      name:'Chicken (cooked, no skin)',        unit:'g',    kcal:1.667, pro:0.3167, fat:0.0467, cho:0      },
  // Beef lean: 61/30g=2.033/g; pro 9.3/30=0.31; fat 2.5/30=0.0833; cho 0
  { id:'beef',         name:'Beef (cooked, lean)',              unit:'g',    kcal:2.033, pro:0.3100, fat:0.0833, cho:0      },
  // Usipa/Kapenta dried: 33/10g=3.3/g; pro 6.5/10=0.65; fat 0.7/10=0.07; cho 0
  { id:'fish_usipa',   name:'Fish usipa/kapenta (dried)',       unit:'g',    kcal:3.300, pro:0.6500, fat:0.0700, cho:0      },
  // Chambo fresh: 39/30g=1.3/g; pro 8.5/30=0.2833; fat 0.6/30=0.02; cho 0
  { id:'fish_chambo',  name:'Fish chambo (fresh, cooked)',      unit:'g',    kcal:1.300, pro:0.2833, fat:0.0200, cho:0      },
  // Beef liver: 56/30g=1.867/g; pro 8.3/30=0.2767; fat 2.1/30=0.07; cho 1.1/30=0.0367
  { id:'liver',        name:'Beef liver (cooked)',              unit:'g',    kcal:1.867, pro:0.2767, fat:0.0700, cho:0.0367 },
  // Sour milk/lacto: 165/250ml=0.66/ml; pro 8.5/250=0.034; fat 7/250=0.028; cho 14/250=0.056
  { id:'sour_milk',    name:'Sour milk / lacto (mageu)',        unit:'ml',   kcal:0.660, pro:0.0340, fat:0.0280, cho:0.0560 },

  // ── VEGETABLES ──
  // Pumpkin leaves: 26/75g=0.347/g; pro 3/75=0.04; cho 3/75=0.04; fat 0.4/75=0.00533
  { id:'pumpkin_leaves',name:'Pumpkin leaves/chibwabwa (cooked)',unit:'g',  kcal:0.347, pro:0.0400, fat:0.0053, cho:0.0400 },
  // Rape/kale: 18/65g=0.277/g; pro 2/65=0.0308; cho 2/65=0.0308; fat 0.3/65=0.00462
  { id:'rape_kale',    name:'Rape / kale (cooked)',             unit:'g',    kcal:0.277, pro:0.0308, fat:0.0046, cho:0.0308 },
  // Sweet potato leaves: 22/65g=0.338/g; pro 2.5/65=0.0385; cho 3/65=0.0462; fat 0.2/65=0.00308
  { id:'swpot_leaves', name:'Sweet potato leaves (cooked)',     unit:'g',    kcal:0.338, pro:0.0385, fat:0.0031, cho:0.0462 },
  // Tomato: 22/123g=0.179/g; pro 1.1/123=0.00894; cho 4.8/123=0.039; fat 0.2/123=0.00163
  { id:'tomato',       name:'Tomato (raw)',                     unit:'g',    kcal:0.179, pro:0.0089, fat:0.0016, cho:0.0390 },
  // Carrot: 27/78g=0.346/g; pro 0.6/78=0.0077; cho 6.4/78=0.082; fat 0.1/78=0.00128
  { id:'carrot',       name:'Carrot (cooked)',                  unit:'g',    kcal:0.346, pro:0.0077, fat:0.0013, cho:0.0821 },
  // Cabbage: 17/75g=0.227/g; pro 0.9/75=0.012; cho 3.7/75=0.0493; fat 0.1/75=0.00133
  { id:'cabbage',      name:'Cabbage (cooked)',                 unit:'g',    kcal:0.227, pro:0.0120, fat:0.0013, cho:0.0493 },

  // ── FRUIT ──
  // Banana: fixed unit 118g=105 kcal; pro 1.3g; fat 0.4g; cho 27g
  { id:'banana',       name:'Banana (ripe)',                    unit:'unit', kcal:105,   pro:1.300,  fat:0.400,  cho:27.00  },
  // Mango half: 68 kcal/100g=0.68/g; pro 1.1/200*2=0.0055/g; cho 17.5/100=0.175/g; fat 0.3/100=0.003/g
  { id:'mango',        name:'Mango (ripe)',                     unit:'g',    kcal:0.680, pro:0.0055, fat:0.0030, cho:0.1750 },
  // Papaya: 55/140g=0.393/g; pro 0.9/140=0.00643; cho 14/140=0.1; fat 0.1/140=0.000714
  { id:'papaya',       name:'Papaya / pawpaw',                  unit:'g',    kcal:0.393, pro:0.0064, fat:0.0007, cho:0.1000 },
  // Avocado: 114/68g=1.676/g; pro 1.3/68=0.01912; cho 6/68=0.0882; fat 10.5/68=0.1544
  { id:'avocado',      name:'Avocado',                          unit:'g',    kcal:1.676, pro:0.0191, fat:0.1544, cho:0.0882 },

  // ── FATS / EXTRAS ──
  // Oil: 44/5ml=8.8/ml; fat 5/5=1.0/ml (MP_FOODS.fats)
  { id:'oil',          name:'Cooking oil (any)',                 unit:'ml',   kcal:8.800, pro:0,      fat:1.0000, cho:0      },
  // Sugar: 3.87 kcal/g all CHO
  { id:'sugar',        name:'Sugar',                            unit:'g',    kcal:3.870, pro:0,      fat:0,      cho:1.0000 },
  // Margarine: 35/5g=7.0/g; fat 4/5=0.8/g
  { id:'margarine',    name:'Margarine / butter',               unit:'g',    kcal:7.000, pro:0.0008, fat:0.8000, cho:0.0008 },
];


// ══════════════════════════════════════════════════════════════════════════════
// PACKAGED FOODS — Chakudya API-backed, offline-first local DB
// ══════════════════════════════════════════════════════════════════════════════
/**
 * PackagedFoodsDB
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads/writes packaged (branded) foods against the public Chakudya API and
 * caches results in IndexedDB for offline-first access. Integrates cleanly
 * with the existing NTFoodSearch layered pipeline as "Layer 0" (highest
 * priority for packaged/branded foods).
 *
 * Architecture
 * ┌──────────────────────┐
 * │  Chakudya API         │  GET  /packaged        (list / barcode lookup)
 * │  (Cloudflare Worker)  │  POST /packaged/submit (public, rate-limited)
 * └──────────┬────────────┘
 *            │  periodic + on-demand sync
 * ┌──────────▼───────────┐
 * │  IndexedDB           │  OasisPackagedFoods store (offline cache)
 * └──────────┬───────────┘
 *            │  instant <100 ms
 * ┌──────────▼───────────┐
 * │  In-Memory Index     │  tokenIndex + barcodeMap built at load/sync
 * └──────────┬───────────┘
 *            │
 * ┌──────────▼───────────┐
 * │  PackagedFoodsDB API │  search(), searchBarcode(), add(), sync()
 * └──────────────────────┘
 *
 * Chakudya API
 * ─────────────────────────────────────────────────────────────────────────────
 *   Base       : https://chakudya-api.edisontaimu9.workers.dev
 *   GET  /packaged                 — query params: barcode, limit, offset
 *   POST /packaged/submit          — public, rate-limited
 *                                    requires: barcode, product_name
 *                                    auto-tagged: status:"pending" server-side
 *   PUT/PATCH/DELETE /packaged/:id — admin-only (not used by this client;
 *                                    requires an admin bearer token which the
 *                                    consumer app does not hold)
 *
 * User-submitted items land with status "pending" and only appear back in
 * GET /packaged once an admin verifies them in the companion app — exactly
 * like the old verified:false flow, just server-side now instead of Firestore.
 * We keep the freshly-submitted item visible locally in the meantime.
 *
 * Author : Edison Taimu / Oasis
 * ─────────────────────────────────────────────────────────────────────────────
 */

;(function (global) {
  'use strict';

  // ── CONSTANTS ────────────────────────────────────────────────────────────────
  const API_BASE        = 'https://chakudya-api.edisontaimu9.workers.dev';
  const PACKAGED_URL     = API_BASE + '/packaged';
  const SUBMIT_URL       = API_BASE + '/packaged/submit';

  const IDB_DB_NAME     = 'OasisPackagedFoods';
  const IDB_STORE       = 'foods';
  const IDB_META_STORE  = 'meta';
  const IDB_VERSION     = 3;             // bumped: cache now sourced from Chakudya API, not Firestore
  const SYNC_DEBOUNCE   = 3000;          // ms to wait after coming online
  const POLL_INTERVAL   = 15 * 60 * 1000; // re-poll GET /packaged every 15 min (no realtime push over REST)
  const PAGE_SIZE       = 200;           // items per GET /packaged page during sync
  const MAX_SYNC_PAGES  = 25;            // safety cap (≈5000 items) against runaway pagination
  const FETCH_TIMEOUT   = 10000;         // ms
  const MAX_RESULTS     = 20;
  const FUZZY_THRESHOLD = 0.35;

  // ── INTERNAL STATE ───────────────────────────────────────────────────────────
  let _idb          = null;              // IDBDatabase handle
  let _tokenIndex   = new Map();         // token → Set<docId>
  let _barcodeMap   = new Map();         // barcode → docId
  let _docMap       = new Map();         // docId  → document
  let _ready        = false;
  let _syncTimer    = null;
  let _pollTimer    = null;
  let _onSyncCallback = null;            // called after every sync batch

  // Resolve/reject queue for callers that arrive before init completes
  let _readyPromise = null;
  let _readyResolve = null;

  _readyPromise = new Promise(res => { _readyResolve = res; });

  // ── UTILITY ──────────────────────────────────────────────────────────────────

  function _norm(str) {
    return (str || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function _tokenize(str) {
    return _norm(str).split(' ').filter(t => t.length >= 2);
  }

  /** Levenshtein distance (capped early for performance) */
  function _lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[a.length][b.length];
  }

  /** Token-based fuzzy score (0–1) with Levenshtein for short tokens */
  function _fuzzyScore(query, target) {
    const qTokens = [...new Set(_tokenize(query))];
    const tNorm   = _norm(target);
    if (!qTokens.length) return 0;

    let score = 0;
    let hits  = 0;
    const totalLen = qTokens.reduce((s, t) => s + t.length, 0) || 1;

    for (const tok of qTokens) {
      if (tNorm.includes(tok)) {
        score += tok.length / totalLen;
        hits++;
      } else {
        const tToks  = tNorm.split(' ');
        const minDist = Math.min(...tToks.map(tt => _lev(tok, tt)));
        if (minDist <= 2) {
          score += (1 - minDist / (tok.length + 1)) * (tok.length / totalLen) * 0.6;
        }
      }
    }

    // Boost for exact phrase match
    if (tNorm.includes(_norm(query))) score = Math.min(score + 0.3, 1);

    return Math.min(score, 1);
  }

  /** Convert any timestamp-ish value → ISO string */
  function _toIso(v) {
    if (!v) return null;
    if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? v : d.toISOString(); }
    if (typeof v === 'number') return new Date(v).toISOString();
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString();      // Firestore Timestamp (legacy cache)
    if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return null;
  }

  /**
   * Normalise a raw Chakudya API record (or a locally-cached admin-schema doc)
   * into the single internal shape the rest of this module works with:
   *   { id, name, brand, barcode, servingSize, per100g:{kcal,kj,pro,cho,fat,fiber,sugar,sodium},
   *     verified, status, submittedBy, updatedAt, source }
   *
   * The API's exact field casing is expected to be snake_case (product_name,
   * energy_kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg,
   * serving_size) per the Chakudya README, but this bridge also accepts the
   * admin schema (name/per100g) used previously so nothing already cached
   * breaks, and it degrades gracefully if a field is simply absent.
   */
  function _normalizeApiDoc(raw) {
    if (!raw) return null;
    const n = raw.per100g || raw.nutrition || {};

    const name = raw.product_name || raw.name || raw.productName || '';
    if (!name) return null;

    const barcode = String(raw.barcode || raw.ean || raw.upc || '').replace(/\D/g, '');

    const kcal = raw.energy_kcal ?? raw.kcal ?? n.kcal ?? n.energy_kcal ?? null;
    const kj   = raw.energy_kj   ?? raw.kj   ?? n.kj   ?? (kcal != null ? +(kcal * 4.184).toFixed(0) : null);

    const status   = raw.status || (raw.verified === false ? 'pending' : null);
    const verified = raw.verified ?? (status ? status === 'approved' || status === 'verified' : true);

    const id = raw.id || raw._id || raw.uuid || barcode ||
      `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return {
      id:           String(id),
      name,
      brand:        raw.brand || '',
      barcode:      barcode || '',
      category:     raw.category || 'Packaged',
      country:      raw.country  || '',
      per100g: {
        kcal:   kcal,
        kj:     kj,
        pro:    raw.protein_g ?? raw.pro    ?? n.pro    ?? n.protein_g ?? null,
        cho:    raw.carbs_g   ?? raw.cho    ?? n.cho    ?? n.carbs_g   ?? null,
        fat:    raw.fat_g     ?? raw.fat    ?? n.fat    ?? n.fat_g     ?? null,
        fiber:  raw.fiber_g   ?? raw.fiber  ?? n.fiber  ?? n.fiber_g   ?? null,
        sugar:  raw.sugar_g   ?? raw.sugar  ?? n.sugar  ?? n.sugar_g   ?? null,
        sodium: raw.sodium_mg ?? raw.sodium ?? n.sodium ?? n.sodium_mg ?? null,
      },
      servingSize:  raw.serving_size_g ?? raw.serving_size ?? raw.servingSize ?? 100,
      servingLabel: raw.serving_label || raw.servingLabel || '',
      image:        raw.image || raw.image_url || '',
      status:       status || 'approved',
      verified:     !!verified,
      submittedBy:  raw.submitted_by || raw.submittedBy || '',
      createdAt:    _toIso(raw.created_at || raw.createdAt) || new Date().toISOString(),
      updatedAt:    _toIso(raw.updated_at || raw.updatedAt) || new Date().toISOString(),
      source:       raw.source || 'chakudya',
    };
  }

  /** Normalise a stored doc into the unified food output shape used by the UI. */
  function _toFoodShape(doc) {
    const n    = doc.per100g || {};
    return {
      id:              doc.id,
      name:            doc.name        || null,
      brand:           doc.brand       || null,
      barcode:         doc.barcode     || null,
      cat:             doc.category    || 'Packaged',
      country:         doc.country     || null,
      verified:        doc.verified    ?? false,
      status:          doc.status      || (doc.verified ? 'approved' : 'pending'),
      image:           doc.image       || null,
      kcal:            n.kcal   ?? null,
      kj:              n.kj     ?? null,
      pro:             n.pro    ?? null,
      cho:             n.cho    ?? null,
      fat:             n.fat    ?? null,
      sugar:           n.sugar  ?? null,
      fiber:           n.fiber  ?? null,
      sodium:          n.sodium ?? null,
      servingSize:     doc.servingSize  ?? null,
      servingLabel:    doc.servingLabel || null,
      sourceUsed:      'packaged',
      dbSource:        'Chakudya Packaged Foods',
      confidenceScore: 1.0,
      lastUpdated:     doc.updatedAt   ?? null,
      submittedBy:     doc.submittedBy || '',
      _raw:            doc,
    };
  }

  // ── INDEXEDDB HELPERS ────────────────────────────────────────────────────────

  function _openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Cache format changed (Chakudya API instead of Firestore) — start clean.
        if (db.objectStoreNames.contains(IDB_STORE)) db.deleteObjectStore(IDB_STORE);
        if (db.objectStoreNames.contains(IDB_META_STORE)) db.deleteObjectStore(IDB_META_STORE);

        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('barcode',   'barcode',   { unique: false });
        store.createIndex('name',      'name',      { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });

        db.createObjectStore(IDB_META_STORE, { keyPath: 'key' });
      };

      req.onsuccess  = (e) => resolve(e.target.result);
      req.onerror    = (e) => reject(e.target.error);
    });
  }

  function _idbGetAll() {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbPutBatch(docs) {
    return new Promise((resolve, reject) => {
      const tx    = _idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      docs.forEach(d => store.put(d));
      tx.oncomplete = () => resolve(docs.length);
      tx.onerror    = (e) => reject(e.target.error);
    });
  }

  function _idbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbGetMeta(key) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_META_STORE, 'readonly');
      const req = tx.objectStore(IDB_META_STORE).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbSetMeta(key, value) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_META_STORE, 'readwrite');
      const req = tx.objectStore(IDB_META_STORE).put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── IN-MEMORY INDEX BUILDER ──────────────────────────────────────────────────

  function _buildIndex(docs) {
    _tokenIndex.clear();
    _barcodeMap.clear();
    _docMap.clear();
    for (const doc of docs) _indexDoc(doc);
  }

  /** Incremental index update for a single doc (add/update) */
  function _indexDoc(doc) {
    _docMap.set(doc.id, doc);
    if (doc.barcode) _barcodeMap.set(String(doc.barcode).trim(), doc.id);
    const fields = [doc.name, doc.brand].filter(Boolean);
    for (const field of fields) {
      for (const token of _tokenize(field)) {
        if (!_tokenIndex.has(token)) _tokenIndex.set(token, new Set());
        _tokenIndex.get(token).add(doc.id);
      }
    }
  }

  /** Remove a doc from the in-memory index */
  function _unindexDoc(id) {
    const doc = _docMap.get(id);
    if (!doc) return;
    _docMap.delete(id);
    if (doc.barcode) _barcodeMap.delete(String(doc.barcode).trim());
    const fields = [doc.name, doc.brand].filter(Boolean);
    for (const field of fields) {
      for (const token of _tokenize(field)) {
        const set = _tokenIndex.get(token);
        if (set) { set.delete(id); if (!set.size) _tokenIndex.delete(token); }
      }
    }
  }

  // ── CHAKUDYA API — NETWORK HELPERS ───────────────────────────────────────────

  async function _apiFetch(url, opts = {}) {
    const ctrl    = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer   = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT) : null;
    try {
      const res = await fetch(url, { ...opts, signal: ctrl ? ctrl.signal : undefined });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.body   = json;
        throw err;
      }
      return json;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Pull the array of records out of whatever envelope Chakudya wraps them in. */
  function _extractList(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    if (json.data && Array.isArray(json.data.items)) return json.data.items;
    if (Array.isArray(json.items))   return json.items;
    if (Array.isArray(json.results)) return json.results;
    if (json.data && typeof json.data === 'object') return [json.data]; // single record
    return [];
  }

  /**
   * One page of GET /packaged.
   * @returns {Promise<Array>} raw records (un-normalised)
   */
  async function _fetchPackagedPage({ limit = PAGE_SIZE, offset = 0, barcode } = {}) {
    const params = new URLSearchParams();
    if (barcode) params.set('barcode', barcode);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const json = await _apiFetch(`${PACKAGED_URL}?${params.toString()}`);
    return _extractList(json);
  }

  /** Full paginated sync of GET /packaged into IndexedDB + in-memory index. */
  async function _syncFromAPI() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[PackagedFoodsDB] Offline — skipping sync');
      return 0;
    }
    try {
      let offset = 0;
      let page   = 0;
      let synced = 0;
      const batch = [];

      while (page < MAX_SYNC_PAGES) {
        const raw = await _fetchPackagedPage({ limit: PAGE_SIZE, offset });
        if (!raw.length) break;

        for (const r of raw) {
          const doc = _normalizeApiDoc(r);
          if (doc) { batch.push(doc); synced++; }
        }

        if (raw.length < PAGE_SIZE) break; // last page
        offset += PAGE_SIZE;
        page++;
      }

      if (batch.length) {
        await _idbPutBatch(batch);
        for (const doc of batch) _indexDoc(doc);
      }
      await _idbSetMeta('lastSync', new Date().toISOString());

      if (typeof _onSyncCallback === 'function') {
        try { _onSyncCallback(_docMap.size); } catch (_) {}
      }
      console.info(`[PackagedFoodsDB] Synced ${synced} doc(s) from Chakudya API`);
      return synced;
    } catch (err) {
      console.error('[PackagedFoodsDB] Chakudya sync error:', err);
      return 0;
    }
  }

  function _startPolling() {
    clearInterval(_pollTimer);
    _pollTimer = setInterval(() => { _syncFromAPI(); }, POLL_INTERVAL);
  }

  function _scheduleSyncIfOnline() {
    if (!navigator.onLine) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => { _syncFromAPI(); }, SYNC_DEBOUNCE);
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  async function _init() {
    try {
      _idb = await _openIDB();

      // Serve cached data immediately so the UI isn't blank
      const stored = await _idbGetAll();
      _buildIndex(stored);
      _ready = true;
      _readyResolve(true);

      console.info(`[PackagedFoodsDB] Loaded ${stored.length} doc(s) from IndexedDB`);

      // Kick off a fresh pull from the Chakudya API + start periodic polling.
      _syncFromAPI();
      _startPolling();

      window.addEventListener('online',  _scheduleSyncIfOnline);
      window.addEventListener('offline', () => clearTimeout(_syncTimer));

    } catch (err) {
      console.error('[PackagedFoodsDB] Init error:', err);
      _readyResolve(false);
    }
  }

  // ── SEARCH ENGINE (local, in-memory — Chakudya has no full-text endpoint) ────

  /**
   * Instant local search across product name and brand.
   * Uses the inverted token index for a candidate set, then scores with fuzzy matching.
   *
   * @param {string} query          - Free-text query (name or brand)
   * @param {object} [opts]
   * @param {number} [opts.limit]   - Max results (default 10)
   * @param {number} [opts.threshold] - Min score (default FUZZY_THRESHOLD)
   * @returns {Array}               - Sorted array of food objects (best first)
   */
  function _searchByText(query, { limit = 10, threshold = FUZZY_THRESHOLD } = {}) {
    if (!query || !query.trim()) return [];

    const qTokens = _tokenize(query);
    const candidates = new Set();

    for (const tok of qTokens) {
      const exact = _tokenIndex.get(tok);
      if (exact) exact.forEach(id => candidates.add(id));
      for (const [idxTok, idSet] of _tokenIndex) {
        if (idxTok.startsWith(tok) || tok.startsWith(idxTok)) {
          idSet.forEach(id => candidates.add(id));
        }
      }
    }

    const pool = candidates.size >= 1 ? candidates : new Set(_docMap.keys());

    const scored = [];
    for (const id of pool) {
      const doc = _docMap.get(id);
      if (!doc) continue;

      const nameScore  = _fuzzyScore(query, doc.name || '');
      const brandScore = _fuzzyScore(query, doc.brand || '') * 0.7;
      const score      = Math.max(nameScore, brandScore);

      if (score >= threshold) scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ doc, score }) => {
      const out = _toFoodShape(doc);
      out.confidenceScore = +score.toFixed(2);
      return out;
    });
  }

  /**
   * Barcode lookup. Checks the local cache first (instant), then — if online
   * and not found locally — asks the Chakudya API directly via
   * GET /packaged?barcode=... so newly-approved items are still reachable
   * before the next full sync.
   * @param {string} barcode
   * @returns {object|null}
   */
  function _searchByBarcode(barcode) {
    if (!barcode) return null;
    const bc = String(barcode).trim();

    const exactId = _barcodeMap.get(bc);
    if (exactId) return _toFoodShape(_docMap.get(exactId));

    // Partial fallback (leading zeros / check-digit mismatches) against local cache
    for (const [storedBc, id] of _barcodeMap) {
      if (storedBc.includes(bc) || bc.includes(storedBc)) {
        const doc = _docMap.get(id);
        if (doc) {
          const out = _toFoodShape(doc);
          out.confidenceScore = 0.85;
          return out;
        }
      }
    }
    return null;
  }

  /** Live network barcode lookup against the Chakudya API (async, used as a fallback). */
  async function _searchByBarcodeRemote(barcode) {
    if (!barcode || typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    try {
      const raw = await _fetchPackagedPage({ barcode: String(barcode).trim(), limit: 1 });
      if (!raw.length) return null;
      const doc = _normalizeApiDoc(raw[0]);
      if (!doc) return null;
      _idbPutBatch([doc]).catch(() => {});
      _indexDoc(doc);
      return _toFoodShape(doc);
    } catch (err) {
      console.warn('[PackagedFoodsDB] Remote barcode lookup failed:', err);
      return null;
    }
  }

  // ── CRUD — WRITE OPERATIONS ──────────────────────────────────────────────────

  /**
   * Submit a packaged food to the Chakudya API (POST /packaged/submit).
   * Public + rate-limited on the API side — no auth required. New submissions
   * come back tagged status:"pending" server-side and only surface in public
   * GET /packaged once an admin verifies them; we keep the submission visible
   * locally in the meantime.
   *
   * If `id` refers to a doc that's already synced from the API (i.e. this is
   * an edit rather than a fresh contribution), a PUT /packaged/:id is
   * attempted first. That endpoint is admin-only on the Chakudya API, so
   * unless this app is configured with an admin token (window.CHAKUDYA_ADMIN_KEY)
   * it will fail with 401/403 — in which case we fall back to updating the
   * local cache only, same resilience pattern as before.
   *
   * @param {object} data  - { name, brand, barcode, servingSize,
   *                           per100g:{kcal,pro,cho,fat,fiber,sugar,sodium} }
   *                          (also accepts legacy nutrition:{...} shape)
   * @param {string} [id]  - Existing doc id (edit) or a barcode to use as id
   * @returns {Promise<string>} the resulting document id
   */
  async function addFood(data, id) {
    const productName = data.name || data.productName;
    if (!productName) throw new Error('[PackagedFoodsDB] name is required');

    const src = data.per100g || data.nutrition || {};
    const kcalVal = data.kcal ?? src.kcal ?? src.energy_kcal ?? null;
    const barcode = (data.barcode || '').replace(/\D/g, '') || '';

    // Payload uses the exact snake_case column names of the `packaged_foods`
    // Supabase table (id, product_name, brand, barcode, serving_size_g,
    // energy_kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg,
    // status, submitted_at). No extra keys — PostgREST/Supabase reject
    // inserts containing columns that don't exist on the table, which
    // silently failed submissions here before this was caught.
    const payload = {
      product_name:   productName,
      brand:          data.brand || '',
      barcode:        barcode,
      serving_size_g: data.servingSize ?? 100,
      energy_kcal:    kcalVal,
      protein_g:      data.pro    ?? src.pro    ?? src.protein_g ?? null,
      carbs_g:        data.cho    ?? src.cho    ?? src.carbs_g   ?? null,
      fat_g:          data.fat    ?? src.fat    ?? src.fat_g     ?? null,
      sugar_g:        data.sugar  ?? src.sugar  ?? src.sugar_g   ?? null,
      fiber_g:        data.fiber  ?? src.fiber  ?? src.fiber_g   ?? null,
      sodium_mg:      data.sodium ?? src.sodium ?? src.sodium_mg ?? null,
    };

    const isEdit = !!(id && _docMap.has(id) && _docMap.get(id).source === 'chakudya');
    let docId = id;
    let serverOk = false;
    let serverRaw = null;

    try {
      if (isEdit) {
        // Admin-only on the API — will throw 401/403 without a configured token.
        const headers = { 'Content-Type': 'application/json' };
        if (global.CHAKUDYA_ADMIN_KEY) headers.Authorization = `Bearer ${global.CHAKUDYA_ADMIN_KEY}`;
        const json = await _apiFetch(`${PACKAGED_URL}/${encodeURIComponent(id)}`, {
          method: 'PATCH', headers, body: JSON.stringify(payload),
        });
        serverRaw = (json && (json.data || json)) || payload;
        serverOk  = true;
      } else {
        if (!barcode) {
          console.warn('[PackagedFoodsDB] Submitting without a barcode — Chakudya API documents barcode as required for /packaged/submit and may reject this.');
        }
        const json = await _apiFetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        serverRaw = (json && (json.data || json)) || payload;
        serverOk  = true;
        // Freshly submitted items are pending review until an admin verifies them.
        if (!serverRaw.status) serverRaw.status = 'pending';
        if (serverRaw.verified === undefined) serverRaw.verified = false;
      }
    } catch (err) {
      // A response with a status code means the request reached the server
      // and was rejected (validation error, rate limit, etc.) — retrying
      // with the same payload will fail again, so surface it instead of
      // silently pretending the submission succeeded.
      if (err && err.status) {
        console.error('[PackagedFoodsDB] Chakudya API rejected submission:', err.status, err.message);
        throw err;
      }
      // No status = genuine network/offline failure — safe to queue locally
      // and let it sync once connectivity returns.
      console.warn('[PackagedFoodsDB] Network unavailable (saving locally only):', err);
    }

    const doc = _normalizeApiDoc(serverRaw || payload) || {
      id:          docId || barcode || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name:        productName,
      brand:       payload.brand,
      barcode:     barcode,
      category:    'Packaged',
      country:     '',
      per100g:     { kcal: payload.energy_kcal, kj: null, pro: payload.protein_g, cho: payload.carbs_g,
                     fat: payload.fat_g, fiber: payload.fiber_g, sugar: payload.sugar_g, sodium: payload.sodium_mg },
      servingSize: payload.serving_size_g,
      servingLabel: '',
      image:       '',
      status:      'pending',
      verified:    false,
      submittedBy: data.submittedBy || '',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      source:      serverOk ? 'chakudya' : 'local-pending',
    };

    if (!doc.id) doc.id = docId || barcode || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (docId && doc.id !== docId && _docMap.has(docId)) _unindexDoc(docId); // replacing an edited local doc under a new id

    await _idbPutBatch([doc]);
    _indexDoc(doc);

    return doc.id;
  }

  /**
   * Delete a packaged food. The Chakudya API's DELETE /packaged/:id is
   * admin-only; without an admin token this only removes the item from the
   * local cache (mirrors the old "best-effort remote, always clean locally"
   * behaviour).
   * @param {string} id
   */
  async function deleteFood(id) {
    try {
      if (global.CHAKUDYA_ADMIN_KEY) {
        await _apiFetch(`${PACKAGED_URL}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${global.CHAKUDYA_ADMIN_KEY}` },
        });
      }
    } catch (err) {
      console.warn('[PackagedFoodsDB] Chakudya API delete failed (removing locally only):', err);
    }
    await _idbDelete(id);
    _unindexDoc(id);
  }

  // ── PAGINATED LISTING ────────────────────────────────────────────────────────

  /**
   * Return a page of all locally-cached packaged foods (for browsing/admin).
   * @param {object} [opts]
   * @param {number} [opts.page=0]   - Zero-based page number
   * @param {number} [opts.size=20]  - Items per page
   * @returns {{ items: Array, total: number, page: number, pages: number }}
   */
  function listFoods({ page = 0, size = MAX_RESULTS } = {}) {
    const all   = [..._docMap.values()];
    const total = all.length;
    const start = page * size;
    const items = all.slice(start, start + size).map(_toFoodShape);
    return {
      items,
      total,
      page,
      pages: Math.ceil(total / size),
    };
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────────

  const PackagedFoodsDB = {
    /**
     * Ensure the DB is ready before calling other methods.
     * @returns {Promise<boolean>}
     */
    ready() {
      return _readyPromise;
    },

    /**
     * Search packaged foods by product name or brand (fuzzy, case-insensitive).
     * Purely local/in-memory — the Chakudya API has no full-text search endpoint.
     * @param {string} query
     * @param {object} [opts]
     * @returns {Array}
     */
    search(query, opts = {}) {
      return _searchByText(query, opts);
    },

    /**
     * Look up a packaged food by barcode. Checks the local cache first;
     * if not found and online, use searchBarcodeAsync() to also try the
     * live Chakudya API.
     * @param {string} barcode
     * @returns {object|null}
     */
    searchBarcode(barcode) {
      return _searchByBarcode(barcode);
    },

    /**
     * Same as searchBarcode() but falls through to a live
     * GET /packaged?barcode=... call when the local cache misses.
     * @param {string} barcode
     * @returns {Promise<object|null>}
     */
    async searchBarcodeAsync(barcode) {
      const local = _searchByBarcode(barcode);
      if (local) return local;
      return _searchByBarcodeRemote(barcode);
    },

    /**
     * Submit or update a packaged food. New items go to
     * POST /packaged/submit (public, rate-limited) and land as status:"pending"
     * pending admin review. See addFood() doc-comment for edit-path caveats.
     * @param {object} data
     * @param {string} [id]
     * @returns {Promise<string>} Assigned/used document ID
     */
    add(data, id) {
      return addFood(data, id);
    },

    /**
     * Delete a packaged food by document ID (local cache always; remote only
     * if an admin token is configured — see deleteFood() doc-comment).
     * @param {string} id
     * @returns {Promise<void>}
     */
    delete(id) {
      return deleteFood(id);
    },

    /**
     * Kept for API compatibility with existing callers (main.js calls this
     * once after app boot). The Chakudya API is REST, not realtime, so this
     * simply triggers an immediate sync + starts periodic polling rather
     * than attaching a push listener.
     * @returns {boolean} always true
     */
    listen() {
      _syncFromAPI();
      _startPolling();
      return true;
    },

    /**
     * Register a callback that fires after every sync batch.
     * @param {function(count: number): void} cb
     */
    onSync(cb) {
      _onSyncCallback = typeof cb === 'function' ? cb : null;
    },

    /**
     * Force an immediate full paginated re-sync from GET /packaged.
     * @returns {Promise<number>} Number of documents synced
     */
    sync() {
      return _syncFromAPI();
    },

    /**
     * Browse all locally-cached packaged foods with pagination.
     * @param {{ page?: number, size?: number }} [opts]
     * @returns {{ items, total, page, pages }}
     */
    list(opts = {}) {
      return listFoods(opts);
    },

    /** Total count of locally cached packaged foods. @returns {number} */
    get count() {
      return _docMap.size;
    },

    /** True once IndexedDB has loaded and the in-memory index is built. @returns {boolean} */
    get isReady() {
      return _ready;
    },

    // ── Dev / debug helpers ────────────────────────────────────────────────
    _tokenIndex,
    _barcodeMap,
    _docMap,
  };

  // ── INTEGRATE WITH NTFoodSearch PIPELINE ────────────────────────────────────
  // When NTFoodSearch.searchBarcode is called, check PackagedFoodsDB first.
  function _patchFoodSearch() {
    if (typeof global.NTFoodSearch === 'undefined') return false;

    const orig = global.NTFoodSearch.searchBarcode;
    global.NTFoodSearch.searchBarcode = async function (barcode) {
      // Layer 0 — Packaged Foods DB (highest priority)
      if (_ready) {
        const local = PackagedFoodsDB.searchBarcode(barcode);
        if (local) return local;
      }
      // Fall through to original layers (local barcode registry → GS1)
      return orig ? orig(barcode) : null;
    };

    const origLocal = global.NTFoodSearch.searchLocal;
    global.NTFoodSearch.searchLocal = function (query, limit = 10) {
      const packaged = _ready ? PackagedFoodsDB.search(query, { limit: 5 }) : [];
      const rest     = origLocal ? origLocal(query, limit) : [];
      const seen   = new Set(packaged.map(f => f.id));
      const merged = [...packaged, ...rest.filter(f => !seen.has(f.id))];
      return merged.slice(0, limit);
    };

    return true;
  }

  if (!_patchFoodSearch()) {
    document.addEventListener('DOMContentLoaded', _patchFoodSearch);
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  _init().catch(err => console.error('[PackagedFoodsDB] Fatal init error:', err));

  // Expose globally
  global.PackagedFoodsDB = PackagedFoodsDB;

})(typeof window !== 'undefined' ? window : this);
