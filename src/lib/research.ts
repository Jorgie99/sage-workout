// In-app mirror of the reference list in RESEARCH.md. The "learn more" sheets
// read from here, so every coach card can show exactly where its rule comes from.

export interface Source {
  id: string;
  /** Short label, e.g. "ACSM Position Stand (2026)". */
  label: string;
  /** What this source found, in one plain sentence. */
  finding: string;
  cite: string;
  url?: string;
}

const list: Source[] = [
  {
    id: 'acsm2026', label: 'ACSM Position Stand (2026)',
    finding: 'Train all major muscle groups at least twice a week; about 10+ weekly sets per muscle for growth, with diminishing returns past ~18–20; muscle grows similarly from light to heavy loads.',
    cite: 'Currier BS, et al. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Med Sci Sports Exerc. 2026;58(4):851–872.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823',
  },
  {
    id: 'acsm2009', label: 'ACSM Position Stand (2009)',
    finding: 'Novices: 8–12 reps at slow-to-moderate speed; 2–3 min rest for heavy multi-joint lifts, 1–2 min for assistance work; add 2–10% load once you can exceed the target reps.',
    cite: 'American College of Sports Medicine. Progression models in resistance training for healthy adults. Med Sci Sports Exerc. 2009;41(3):687–708.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/',
  },
  {
    id: 'garber2011', label: 'ACSM exercise guidance (2011)',
    finding: 'Hold static stretches 10–30 s, about 60 s in total per stretch, when the muscle is warm; train each major muscle group 2–3 days a week.',
    cite: 'Garber CE, et al. Quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults. Med Sci Sports Exerc. 2011;43(7):1334–1359.',
  },
  {
    id: 'schoenfeld2017volume', label: 'Weekly volume meta-analysis (2017)',
    finding: 'More weekly sets per muscle means more growth; 10+ sets beat fewer than 5.',
    cite: 'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci. 2017;35(11):1073–1082.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
  },
  {
    id: 'pelland2026', label: 'Volume & frequency meta-regression (2026)',
    finding: 'Best fit comes from counting a full set for directly trained muscles and half a set for indirectly trained ones.',
    cite: 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. Sports Med. 2026;56(2):481–505.',
  },
  {
    id: 'iversen2021', label: 'Time-efficient training review (2021)',
    finding: 'Prioritise compound lifts, at least 4 weekly sets per muscle group, 6–15 reps; keep warm-ups short and specific; stretch only if flexibility is a goal.',
    cite: 'Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy. Sports Med. 2021;51(10):2079–2095.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772',
  },
  {
    id: 'schoenfeld2017load', label: 'Light vs heavy load meta-analysis (2017)',
    finding: 'Muscle growth is similar with light and heavy loads; heavy loads are better for maximal strength.',
    cite: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training. J Strength Cond Res. 2017;31(12):3508–3523.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/',
  },
  {
    id: 'schoenfeld2016rest', label: 'Rest interval trial (2016)',
    finding: 'In trained men, 3-minute rests produced more strength and thigh growth than 1-minute rests on a compound-heavy programme.',
    cite: 'Schoenfeld BJ, et al. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res. 2016;30(7):1805–1812.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26605807/',
  },
  {
    id: 'grgic2018', label: 'Rest & strength review (2018)',
    finding: 'Untrained lifters do well with 60–120 s rests; trained lifters benefit from more than 2 minutes for strength.',
    cite: 'Grgic J, Schoenfeld BJ, Skrepnik M, Davies TB, Mikulic P. Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength. Sports Med. 2018;48(1):137–151.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28933024/',
  },
  {
    id: 'singer2024', label: 'Rest & muscle growth meta-analysis (2024)',
    finding: 'Resting longer than 60 s gives a small growth benefit; little is gained beyond about 90 s.',
    cite: 'Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living. 2024;6:1429789.',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11349676/',
  },
  {
    id: 'nunes2021', label: 'Exercise order meta-analysis (2021)',
    finding: 'Strength gains are largest for exercises done first; compound lifts benefit from going before isolation work. Muscle growth is unaffected by order.',
    cite: 'Nunes JP, Grgic J, Cunha PM, et al. What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? Eur J Sport Sci. 2021;21(2):149–157.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32077380/',
  },
  {
    id: 'simao2012', label: 'Exercise order review (2012)',
    finding: 'You complete more reps on whatever comes first; exercises placed later in a session suffer.',
    cite: 'Simão R, de Salles BF, Figueiredo T, Dias I, Willardson JM. Exercise order in resistance training. Sports Med. 2012;42(3):251–265.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22292516/',
  },
  {
    id: 'behm2016', label: 'Stretching & performance review (2016)',
    finding: 'Static stretching just before effort lowers performance a little — mostly with holds of 60 s or more per muscle. Dynamic movement does not.',
    cite: 'Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals. Appl Physiol Nutr Metab. 2016;41(1):1–11.',
  },
  {
    id: 'kay2012', label: 'Static stretch dose review (2012)',
    finding: 'The performance cost of static stretching grows with hold length; short holds have little effect.',
    cite: 'Kay AD, Blazevich AJ. Effect of acute static stretch on maximal muscle performance: a systematic review. Med Sci Sports Exerc. 2012;44(1):154–164.',
  },
  {
    id: 'fradkin2010', label: 'Warm-up meta-analysis (2010)',
    finding: 'Warming up improved performance in 79% of the outcomes examined.',
    cite: 'Fradkin AJ, Zazryn TR, Smoliga JM. Effects of warming-up on physical performance: a systematic review with meta-analysis. J Strength Cond Res. 2010;24(1):140–148.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19996770/',
  },
  {
    id: 'mcgowan2015', label: 'Warm-up mechanisms review (2015)',
    finding: 'Active warm-ups work mainly by raising muscle temperature and rehearsing the movement.',
    cite: 'McGowan CJ, Pyne DB, Thompson KG, Rattray B. Warm-Up Strategies for Sport and Exercise: Mechanisms and Applications. Sports Med. 2015;45(11):1523–1546.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26400696/',
  },
  {
    id: 'abad2011', label: 'General + specific warm-up trial (2011)',
    finding: 'A general warm-up plus lighter practice sets beat practice sets alone before heavy leg presses.',
    cite: 'Abad CCC, Prado ML, Ugrinowitsch C, Tricoli V, Barroso R. Combination of general and specific warm-ups improves leg-press one repetition maximum compared with specific warm-up in trained individuals. J Strength Cond Res. 2011;25(8):2242–2245.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21544000/',
  },
  {
    id: 'bandy1994', label: 'Stretch duration trial (1994)',
    finding: 'A 30-second hold improved flexibility as much as 60 seconds, and more than 15.',
    cite: 'Bandy WD, Irion JM. The effect of time on static stretch on the flexibility of the hamstring muscles. Phys Ther. 1994;74(9):845–850.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8066111/',
  },
  {
    id: 'afonso2021', label: 'Post-exercise stretching meta-analysis (2021)',
    finding: 'Stretching after exercise does not reduce soreness or speed recovery compared with resting.',
    cite: 'Afonso J, Clemente FM, Nakamura FY, et al. The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness. Front Physiol. 2021;12:677581.',
  },
  {
    id: 'kolber2009', label: 'Shoulder balance study (2009)',
    finding: 'Recreational lifters whose training favoured chest and front shoulders showed shoulder strength imbalances and reduced mobility.',
    cite: 'Kolber MJ, Beekhuizen KS, Cheng MS, Hellman MA. Shoulder joint and muscle characteristics in the recreational weight training population. J Strength Cond Res. 2009;23(1):148–157.',
  },
  {
    id: 'nsca2016', label: 'NSCA Essentials textbook (2016)',
    finding: 'Standard practice: balance opposing muscle groups, alternate body areas so muscles can recover, and use lighter practice sets before heavy lifts.',
    cite: 'Haff GG, Triplett NT, eds. Essentials of Strength Training and Conditioning. 4th ed. Human Kinetics; 2016.',
  },
  {
    id: 'compendium2024', label: 'Compendium of Physical Activities (2024)',
    finding: 'Resistance training with multiple exercises is 3.5 METs; mild stretching is 2.3 METs.',
    cite: 'Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024;13(1):6–12.',
    url: 'https://pacompendium.com',
  },
  {
    id: 'ebben2011', label: 'Push-up load study (2011)',
    finding: 'A regular push-up loads about 64% of body weight; a knee push-up about 49%.',
    cite: 'Ebben WP, Wurm B, VanderZanden TL, et al. Kinetic analysis of several variations of push-ups. J Strength Cond Res. 2011;25(10):2891–2894.',
  },
  {
    id: 'roberts2020', label: 'Sex differences meta-analysis (2020)',
    finding: 'Women and men gain muscle and lower-body strength at similar relative rates.',
    cite: 'Roberts BM, Nuckols G, Krieger JW. Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis. J Strength Cond Res. 2020;34(5):1448–1460.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32218059/',
  },
];

export const SOURCES: Record<string, Source> = Object.fromEntries(list.map((s) => [s.id, s]));

export function getSources(ids: string[]): Source[] {
  return ids.map((id) => SOURCES[id]).filter(Boolean);
}
