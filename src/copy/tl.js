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
  // Guide cards (AI draft; /guides and /resources have no language switch yet).
  public: {
    guides: {
      source: 'Mula sa {source} · bubukas sa bagong tab',
    },
  },
};
