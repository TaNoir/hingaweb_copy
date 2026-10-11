// Cebuano (Bisaya) text for the assent walkthrough and the crisis screen (2.1.6.3.1).
// DRAFT TRANSLATION written with AI at the user's request (2026-10-11), everyday Davao Cebuano.
// 00 Section 10.2 says the team writes this text: every line must be checked by a native speaker
// on the team before the pilot (docs/translation-sheet.csv, column checked_by).
// Keep every key and every {name} token (for example {number}) exactly as written, so the numbers
// still appear.
export const ceb = {
  assent: {
    step: 'Step 2 sa 2',
    languageLabel: 'Pinulongan',
    title: 'Unsa ang among ginatago nga private, ug unsa ang dili',
    lead: 'Palihug basaha una kung giunsa ka pag-protektahan sa HingaWeb sa dili pa nimo isulat ang imong unang check-in.',
    card1Title: 'Imo ra ang imong mga check-in.',
    card1Body:
      'Ikaw ra ang makakita sa imong gisulat sa check-in. Dili ni ma-browse sa mga staff sa school.',
    card2Title: 'Ikaw ang mobuot kanus-a mangayo og tabang.',
    card2Body: 'Walay ipadala sa guidance office kung dili nimo kini pilion nga ipadala.',
    card3Title: 'Usa ka butang nga kinahanglan namong lihokan.',
    card3Body:
      'Kung isulti nimo nga naay nagpasakit nimo o naa kay hunahuna nga pasakitan ang imong kaugalingon, ipahibalo kini sa guidance office aron naay makatabang nimo. Kini ra ang higayon nga naay automatic nga ipahibalo.',
    detailsToggle: 'Basaha ang detalye',
    detailsSaved: 'Unsa ang ma-save',
    detailsSavedBody:
      'Imong mga check-in: upat ka mubo nga pangutana, kumusta imong mood ug stress, ug note kung gusto nimo. Ikaw ra ang makakita ani.',
    detailsShared: 'Unsa ang ipakita kung mangayo ka og tabang',
    detailsSharedBody:
      'Kung pilion nimo nga magpadala og support request, makita sa guidance office imong pangalan, grade, section, class adviser, imong tubag sa upat ka pangutana sa imong pinakabag-o nga check-in, ug bisan unsa nga imong isulat sa request. Dili nila makita ang imong ubang check-in, imong mood ug stress, o imong mga note sa check-in.',
    detailsException: 'Ang usa ka automatic nga eksepsiyon',
    detailsExceptionBody:
      'Kung i-tick nimo ang usa sa mga safety item sa check-in, ipahibalo dayon sa guidance office aron naay mo-check nimo. Makita nila imong pangalan, grade, section, class adviser, ug ang item nga imong gi-tick. Wala nay lain nga ipakita.',
    detailsWho: 'Kinsa ang makakita sa request',
    detailsWhoBody:
      'Ang mga awtorisado ra nga staff sa guidance office. Matag abli nila og request, ma-record kini.',
    detailsNot: 'Unsa ang dili buhaton sa HingaWeb',
    detailsNotBody:
      'Dili gyud basahon o susihon sa HingaWeb ang imong gisulat. Dili ni test, ug dili ni puli sa pakig-istorya sa usa ka tawo.',
    detailsParent: 'Imong ginikanan o guardian',
    detailsParentBody:
      'Sa dili pa ang imong unang check-in, kinahanglan pud sa school ang permission form nga gipirmahan sa imong ginikanan o guardian.',
    detailsKept: 'Unsa ka dugay kini itago',
    detailsKeptBody:
      'Ang imong impormasyon itago ra samtang naa pa ang pilot. Pag mahuman ang pilot, i-delete kini, gawas kung ang school na ang mopadayon sa HingaWeb ug ilang kaugalingong rules sa records ang sundon.',
    detailsStop: 'Kung mausab imong hunahuna',
    detailsStopBody:
      'Pwede ka mohunong bisan kanus-a. Ingna ang guidance office nga bawion ang imong permiso. Pwede gihapon ka mobasa og guides ug motan-aw kung asa makakuha og tabang.',
    understand: 'Nabasa nako ni ug nakasabot ko.',
    notNow: 'Dili sa karon',
    continue: 'Padayon',
    footer: 'Guidance office sa senior high school sa Rizal Memorial Colleges, Inc.',
    saveError: 'Wala nami ni ma-save. Tan-awa imong connection ug sulayi usab.',
  },
  crisis: {
    notice: 'Dili ni para sa emergency. Kung naa ka sa peligro karon dayon, tawag ani nga numero:',
    chip: 'Safety response sa guidance • {school}',
    languageLabel: 'Pinulongan',
    title: 'Naay tabang karon dayon',
    lead: 'Salamat sa pagsulti nimo namo. Dili nimo kinahanglan atubangon ni nga ikaw ra.',
    hotlinesHeading: 'Mga pwede nimo tawagan karon',
    call: 'Tawag sa {number}',
    callLabel: 'Tawag sa {name} sa {number}',
    officeTitle: 'Ang guidance office sa imong school',
    officeCall: 'Tawag sa guidance',
    officeCallLabel: 'Tawag sa guidance office sa {number}',
    nextTitle: 'Unsa ang sunod mahitabo',
    nextBody:
      'Tungod kay gisulti nimo ni namo, ipahibalo sa guidance office aron naay mo-kumusta nimo. Mao ra ni ang butang nga ipahibalo sa HingaWeb nga dili na mangutana una, ug gisultihan na ka ani sa wala pa ka nagsugod.',
    statusSending: 'Ginapahibalo ang guidance office…',
    statusSent: 'Napahibalo na ang guidance office.',
    statusRetrying:
      'Wala pa nami makontak ang guidance office. Ayaw sa i-close ni nga page, padayon mi og sulay. Pwede pud nimo sila tawagan gamit ang button sa taas.',
    statusOffline:
      'Offline ka. Ipahibalo namo ang guidance office pagbalik sa imong internet. Mugana na karon ang mga hotline sa taas.',
    statusFailed:
      'Wala namo mapahibalo ang guidance office pinaagi sa HingaWeb. Palihug tawagi sila karon gamit ang button sa taas.',
    back: 'Balik sa akong check-in',
  },
};
