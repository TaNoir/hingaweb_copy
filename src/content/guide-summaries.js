// One-line captions for guide cards (user request, 2026-10-11). Matched by the guide's link: the
// site must be in GUIDE_SOURCES and the last part of the path must be a key of GUIDE_SUMMARIES.
// A guide that is not listed shows no caption and no source line (captions are never made up).
// Bisaya (ceb) and Tagalog (tl) are AI drafts waiting for the team's check
// (docs/translation-sheet.csv); /guides and /resources show English (no language switch there).

/** Sites whose guides have captions, and the name shown in "From {source} · opens in a new tab". */
export const GUIDE_SOURCES = Object.freeze({
  'www.youngminds.org.uk': 'YoungMinds',
});

export const GUIDE_SUMMARIES = Object.freeze({
  'exam-stress': {
    en: 'Ways to stay calm and plan your study time when exams pile up.',
    ceb: 'Mga paagi para magpabilin nga kalma ug maplano imong oras sa pagtuon kung nagdungan ang mga exam.',
    tl: 'Mga paraan para manatiling kalmado at maplano ang oras ng pag-aaral kapag sunod-sunod ang exam.',
  },
  'money-and-mental-health': {
    en: 'What to do when money worries at home are on your mind.',
    ceb: 'Unsa ang buhaton kung naghunahuna ka sa problema sa kwarta sa balay.',
    tl: 'Ano ang gagawin kapag iniisip mo ang problema sa pera sa bahay.',
  },
  'looking-after-yourself-at-uni': {
    en: 'Getting ready for college or work, and taking care of yourself through the change.',
    ceb: 'Pagpangandam para sa college o trabaho, ug pag-atiman sa imong kaugalingon samtang nag-usab ang tanan.',
    tl: 'Paghahanda para sa college o trabaho, at pag-aalaga sa sarili habang may pagbabago.',
  },
  'down-and-unable-to-cope': {
    en: 'What you can do on days you feel low, and who you can talk to.',
    ceb: 'Unsa ang pwede nimo buhaton sa mga adlaw nga down ka, ug kinsa ang pwede nimo istoryahan.',
    tl: 'Ano ang pwede mong gawin sa mga araw na malungkot ka, at sino ang pwede mong kausapin.',
  },
  'sleep-problems': {
    en: 'Simple habits for better sleep on school nights.',
    ceb: 'Simple nga mga batasan para mas nindot ang tulog sa gabii nga naay klase ugma.',
    tl: 'Simpleng mga gawi para mas maayos ang tulog sa gabi bago ang pasukan.',
  },
  'problems-at-school': {
    en: 'Help with problems at school, like falling behind or trouble with classmates.',
    ceb: 'Tabang sa mga problema sa school, sama sa pagkaulahi sa klase o away sa classmates.',
    tl: 'Tulong sa mga problema sa school, gaya ng pagkahuli sa klase o gulo sa classmates.',
  },
  family: {
    en: 'Ideas for handling arguments, changes or pressure at home.',
    ceb: 'Mga ideya kung unsaon pag-atubang sa away, kausaban o pressure sa balay.',
    tl: 'Mga ideya kung paano haharapin ang away, pagbabago o pressure sa bahay.',
  },
  'self-care': {
    en: 'Small, everyday things you can do to look after yourself.',
    ceb: 'Gagmay, adlaw-adlaw nga mga butang nga pwede nimo buhaton para atimanon imong kaugalingon.',
    tl: 'Maliliit na bagay araw-araw na pwede mong gawin para alagaan ang sarili mo.',
  },
  'self-esteem-and-believing-in-yourself': {
    en: 'How to be kinder to yourself and build your confidence.',
    ceb: 'Unsaon pagkahimong mas buotan sa imong kaugalingon ug pagpalig-on sa imong confidence.',
    tl: 'Paano maging mas mabait sa sarili mo at palakasin ang confidence mo.',
  },
  friends: {
    en: 'Making friends, keeping them, and what to do when things go wrong.',
    ceb: 'Pagpangita og higala, pagpabilin sa inyong pagkahigala, ug unsa ang buhaton kung naay problema.',
    tl: 'Paano magkaroon ng kaibigan, panatilihin sila, at ano ang gagawin kapag may problema.',
  },
  'social-media-and-mental-health': {
    en: 'How to keep social media from bringing you down.',
    ceb: 'Unsaon para dili ka ma-down tungod sa social media.',
    tl: 'Paano hindi ka ma-down dahil sa social media.',
  },
  'young-carers': {
    en: 'Support if you help take care of a family member at home.',
    ceb: 'Suporta kung ikaw ang nagtabang pag-atiman sa usa ka kapamilya sa balay.',
    tl: 'Suporta kung tumutulong ka sa pag-aalaga ng isang kapamilya sa bahay.',
  },
});

/** { summary, source } for a guide link; each is null when the guide is not listed. */
export function guideInfo(url, lang = 'en') {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { summary: null, source: null };
  }
  const source = GUIDE_SOURCES[parsed.hostname] ?? null;
  if (!source) return { summary: null, source: null };
  const slug = parsed.pathname.split('/').filter(Boolean).at(-1);
  const entry = GUIDE_SUMMARIES[slug];
  return { summary: entry ? (entry[lang] ?? entry.en) : null, source };
}
