// Tagalog text for the assent walkthrough and the crisis screen (2.1.6.3.1).
// DRAFT TRANSLATION written with AI at the user's request (2026-10-11), everyday Tagalog.
// 00 Section 10.2 says the team writes this text: every line must be checked by a native speaker
// on the team before the pilot (docs/translation-sheet.csv, column checked_by).
// Keep every key and every {name} token (for example {number}) exactly as written, so the numbers
// still appear.
export const tl = {
  assent: {
    step: 'Step 2 ng 2',
    languageLabel: 'Wika',
    title: 'Ano ang tinatago naming private, at ano ang hindi',
    lead: 'Pakibasa muna kung paano ka pinoprotektahan ng HingaWeb bago mo isulat ang una mong check-in.',
    card1Title: 'Sa iyo lang ang mga check-in mo.',
    card1Body:
      'Ikaw lang ang makakakita ng sinusulat mo sa check-in. Hindi ito matitingnan ng mga staff ng school.',
    card2Title: 'Ikaw ang bahala kung kailan ka hihingi ng tulong.',
    card2Body: 'Walang ipapadala sa guidance office maliban kung pipiliin mong ipadala ito.',
    card3Title: 'Isang bagay na kailangan naming aksyunan.',
    card3Body:
      'Kung sasabihin mo na may nananakit sa iyo o naiisip mong saktan ang sarili mo, sasabihan ang guidance office para may makatulong sa iyo. Ito lang ang pagkakataon na may automatic na ibinabahagi.',
    detailsToggle: 'Basahin ang detalye',
    detailsSaved: 'Ano ang naka-save',
    detailsSavedBody:
      'Ang mga check-in mo: apat na maikling tanong, kumusta ang mood at stress mo, at note kung gusto mo. Ikaw lang ang makakakita nito.',
    detailsShared: 'Ano ang ibinabahagi kapag humingi ka ng tulong',
    detailsSharedBody:
      'Kung pipiliin mong magpadala ng support request, makikita ng guidance office ang pangalan mo, grade, section, class adviser, ang mga sagot mo sa apat na tanong mula sa pinakabago mong check-in, at anumang isusulat mo sa request. Hindi nila makikita ang iba mong check-in, ang mood at stress mo, o ang mga note mo sa check-in.',
    detailsException: 'Ang nag-iisang automatic na eksepsiyon',
    detailsExceptionBody:
      'Kung i-tick mo ang isa sa mga safety item sa check-in, agad na sasabihan ang guidance office para may kumustahin ka. Makikita nila ang pangalan mo, grade, section, class adviser, at ang item na tinick mo. Wala nang iba pang ibinabahagi.',
    detailsWho: 'Sino ang makakakita ng request',
    detailsWhoBody:
      'Ang mga awtorisadong staff lang ng guidance office. Bawat beses na buksan nila ang isang request, nire-record ito.',
    detailsNot: 'Ano ang hindi ginagawa ng HingaWeb',
    detailsNotBody:
      'Hindi kailanman binabasa o sinusuri ng HingaWeb ang isinusulat mo. Hindi ito test, at hindi nito pinapalitan ang pakikipag-usap sa isang tao.',
    detailsParent: 'Ang magulang o guardian mo',
    detailsParentBody:
      'Bago ang una mong check-in, kailangan din ng school ang permission form na pinirmahan ng magulang o guardian mo.',
    detailsKept: 'Gaano katagal ito itatago',
    detailsKeptBody:
      'Itatago lang ang impormasyon mo habang may pilot. Pagkatapos ng pilot, ide-delete ito, maliban kung ang school na ang magpapatuloy ng HingaWeb at susundin ang sarili nilang patakaran sa records.',
    detailsStop: 'Kung magbago ang isip mo',
    detailsStopBody:
      'Pwede kang tumigil kahit kailan. Sabihan ang guidance office na bawiin ang permiso mo. Pwede ka pa ring magbasa ng guides at tingnan kung saan pwedeng humingi ng tulong.',
    understand: 'Nabasa ko ito at naiintindihan ko.',
    notNow: 'Hindi muna',
    continue: 'Magpatuloy',
    footer: 'Guidance office ng senior high school ng Rizal Memorial Colleges, Inc.',
    saveError: 'Hindi namin ito na-save. I-check ang connection mo at subukan ulit.',
  },
  crisis: {
    notice: 'Hindi ito para sa emergency. Kung nasa panganib ka ngayon, tumawag sa numerong ito:',
    chip: 'Safety response ng guidance • {school}',
    languageLabel: 'Wika',
    title: 'May tulong ngayon din',
    lead: 'Salamat sa pagsasabi mo sa amin. Hindi mo kailangang harapin ito nang mag-isa.',
    hotlinesHeading: 'Mga pwede mong tawagan ngayon',
    call: 'Tumawag sa {number}',
    callLabel: 'Tumawag sa {name} sa {number}',
    officeTitle: 'Ang guidance office ng school mo',
    officeCall: 'Tumawag sa guidance',
    officeCallLabel: 'Tumawag sa guidance office sa {number}',
    nextTitle: 'Ano ang susunod na mangyayari',
    nextBody:
      'Dahil sinabi mo ito sa amin, sasabihan ang guidance office para may kumustahin ka. Ito lang ang ibinabahagi ng HingaWeb nang hindi muna nagtatanong, at nasabihan ka na tungkol dito bago ka nagsimula.',
    statusSending: 'Sinasabihan ang guidance office…',
    statusSent: 'Nasabihan na ang guidance office.',
    statusRetrying:
      'Hindi pa namin makontak ang guidance office. Huwag munang isara ang page na ito, susubukan pa rin namin. Pwede mo rin silang tawagan gamit ang button sa itaas.',
    statusOffline:
      'Offline ka. Sasabihan namin ang guidance office pagbalik ng internet mo. Gumagana na ngayon ang mga hotline sa itaas.',
    statusFailed:
      'Hindi namin nasabihan ang guidance office sa HingaWeb. Pakitawagan sila ngayon gamit ang button sa itaas.',
    back: 'Bumalik sa check-in ko',
  },
  // Toasts (AI draft; not shown in Tagalog yet).
  common: {
    toast: {
      saved: 'Na-save',
      requestSent: 'Naipadala na ang request',
    },
  },
  // Check-in steps and breathing card (AI draft; /check-in has no language switch yet).
  checkin: {
    next: 'Susunod',
    back: 'Bumalik',
    stepOf: 'Tanong {n} ng {total}',
    breath: {
      title: 'Huminga muna',
      start: 'Simulan',
      stop: 'Ihinto',
      skip: 'Laktawan',
      in: 'Huminga papasok…',
      hold: 'Pigilin…',
      out: 'Huminga palabas…',
      done: 'Ayos. Tuloy tayo kapag handa ka na.',
    },
  },
  // Landing page nav and footer (ui-landing-v2; AI draft; no language switch there yet).
  nav: {
    public: {
      how: 'Paano ito gumagana',
      breathe: 'Huminga',
      getHelp: 'Humingi ng tulong',
    },
    footer: {
      title: 'Hinga muna.',
      tagline: 'HingaWeb, isang mental health platform para sa mga senior high student.',
      label: 'Footer',
    },
  },
  // Guide cards (AI draft; /guides and /resources have no language switch yet).
  public: {
    // Landing page (ui-landing-v2; AI draft).
    landing: {
      tryCheckin: 'Subukan ang check-in',
      seeHow: 'Tingnan kung paano',
      mood: {
        title: 'Kumusta ka talaga ngayon?',
        note: 'Walang naka-save hangga’t wala kang account.',
        good: 'Ayos',
        okay: 'Okay lang',
        notSure: 'Di ako sure',
        low: 'Malungkot',
        overwhelmed: 'Sobrang bigat',
        reply: {
          good: 'Masaya akong marinig iyan. Makakatulong ang maikling check-in para mapansin mo kung ano ang maayos ngayon.',
          okay: 'Ayos lang ang okay lang. Makakatulong ang check-in para makita mo kung kumusta ang linggo mo.',
          notSure: 'Okay lang din iyan. Makakatulong ang ilang maikling tanong para maayos mo ito.',
          low: 'Salamat sa pagiging tapat. Hindi mo kailangang dalhin ito nang mag-isa.',
          overwhelmed: 'Mukhang mabigat iyan. Dahan-dahan lang, isang hinga sa bawat sandali.',
        },
        talkNow: 'Gusto mo bang makausap ang isang tao ngayon?',
        talkLink: 'Tingnan kung sino ang pwede mong tawagan',
      },
      how: {
        title: 'Paano gumagana ang HingaWeb',
        lead: 'Ikaw ang bahala sa bilis mo. Walang mangyayari maliban kung pipiliin mo.',
        step1Kicker: 'Una',
        step1Title: 'Mag-check in sa sarili mo',
        step1Body:
          'Sagutin ang ilang maikling tanong tungkol sa school, bahay, mood mo at stress mo. Ilang minuto lang ito.',
        step2Kicker: 'Pagkatapos',
        step2Title: 'Pansinin ang mga pattern mo',
        step2Body:
          'Tingnan kung kumusta ang linggo mo, para mas madaling sabihin kung ano ang nararamdaman mo.',
        step3Kicker: 'Kapag handa ka na',
        step3Title: 'Kausapin ang guidance office mo',
        step3Body:
          'Magpadala ng request para makipagkita sa counselor kapag gusto mong makipag-usap. Ikaw ang bahala kung kailan.',
        days: 'M T W T F S S',
      },
      breathe: {
        title1: 'Hinga muna.',
        title2: 'Isang minutong dahan-dahan.',
        body: 'Kapag mabigat ang pakiramdam, makakatulong ang ilang mabagal na paghinga para kumalma ka at mapansin kung ano ang kailangan mo. Sundan ang hugis: lumalaki ito habang humihinga ka papasok at lumiliit habang humihinga ka palabas.',
        inFor: 'Papasok',
        holdFor: 'Pigil',
        outFor: 'Palabas',
        forSeconds: 'nang {n}',
        start: 'Simulan ang paghinga',
        stop: 'Ihinto',
        ready: 'Handa na kapag handa ka na',
        readyHint: 'Pindutin ang simulan at sundan ang hugis.',
      },
      reads: {
        title: 'Maikling babasahin para sa totoong araw',
        browse: 'Tingnan lahat ng guides',
      },
      help: {
        title: 'Kung kailangan mo ng tulong ngayon',
        lead: 'Libre at kumpidensyal na suporta ay handa 24/7 para sa iyo o sa kakilala mo.',
        officeTitle: 'Ang guidance office mo',
        request: 'Humiling ng usapan',
      },
      faq: {
        title: 'Mga tanong ng mga estudyante',
        q1: 'Diagnosis ba ang HingaWeb?',
        a1: 'Hindi. Tinutulungan ka ng HingaWeb na mapansin kung kumusta ka at makausap ang guidance office mo kapag gusto mo. Hindi nito sinasabi kung ano ang mali sa iyo, at hindi nito pinapalitan ang pakikipag-usap sa isang tao.',
        q2: 'Kailangan ko bang makipag-usap sa counselor?',
        a2: 'Hindi. Ikaw palagi ang pipili kung kakausapin mo ang guidance office. Walang ipapadala sa kanila maliban kung pipiliin mong ipadala.',
        q3: 'Sino ang makakakita ng mga check-in ko?',
        a3: 'Ikaw lang. Hindi mabubuksan ng mga staff ng school ang mga check-in mo, kahit ang guidance office. Kung pipiliin mong magpadala ng support request, makikita ng guidance office ang pangalan mo, grade, section at class adviser, ang mga sagot mo sa apat na tanong mula sa pinakabago mong check-in, at ang isinulat mo sa request. Hindi nila kailanman makikita ang mood mo, stress mo, mga note mo sa check-in o ang iba mong check-in. Kung i-tick mo ang isa sa mga safety item, agad na sasabihan ang guidance office at makikita nila ang pangalan mo, grade, section, class adviser at ang item na tinick mo.',
        q4: 'Paano kung kailangan ko ng tulong ngayon?',
        a4: 'Tawagan ang isa sa mga hotline sa page na ito. Libre at bukas 24/7 ang mga ito. Hindi para sa emergency ang HingaWeb: kung nasa panganib ka ngayon, tumawag sa {number}.',
      },
    },
    guides: {
      source: 'Mula sa {source} · bubukas sa bagong tab',
    },
  },
};
