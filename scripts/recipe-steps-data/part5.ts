import type { StepList } from './types'

const steps: Record<string, StepList> = {
  Taco: [
    ['Stek kjøttdeigen', 'Brun kjøttdeigen i en panne til den er gjennomstekt og smuldrer.'],
    ['Krydre', 'Strø over tacokrydderet og tilsett vann etter anvisningen på pakken. La det småkoke noen minutter til sausen har tyknet.'],
    ['Skjær tilbehør', 'Skjær salat, paprika, avokado og ananas. Sil av maisen og riv osten.'],
    ['Varm tacoen', 'Varm tacoskjell eller tacolefser etter anvisningen på pakken.'],
    ['Server', 'Sett alt på bordet og la alle fylle sin egen taco. Server med tacosaus og crème fraîche.'],
  ],
  'Taco med pulled pork': [
    ['Varm kjøttet', 'Varm pulled pork forsiktig i en panne, og tilsett en skvett vann om det trengs.'],
    ['Skjær tilbehør', 'Skjær salat og paprika. Sil av maisen og riv osten.'],
    ['Varm lefsene', 'Varm tacolefsene i en tørr panne eller i ovnen.'],
    ['Server', 'Fyll lefsene med pulled pork, salat, paprika, mais og ost.'],
  ],
  'Takeaway fra Nawabs': [
    ['Bestill eller hent', 'Bestill maten på forhånd, eller hent den på restauranten.'],
    ['Varm maten', 'Hvis maten har blitt kald, kan du varme den i ovnen eller i en kjele, med en skvett vann så den ikke tørker ut.'],
    ['Server', 'Ta maten over i skåler og server med det som følger med, som ris og brød.'],
  ],
  Teriyakibiff: [
    ['Lag marinaden', 'Riv ingefær og hvitløk og bland dem med soyasaus og ananasjuice. Legg ytrefileten i en pose med marinaden og press ut luften. La den stå i kjøleskapet i 4–5 timer eller over natten.'],
    ['Brun kjøttet', 'Ta kjøttet opp av marinaden og brun det på alle sider i en varm panne med olivenolje. Skru ned varmen, hell på marinaden, sett på lokk og la det småkoke i ca. 15 minutter.'],
    ['Skjær grønnsakene', 'Skjær vårløk, gulrot og kinakål i tynne strimler. Hakk koriander.'],
    ['Kok nudlene', 'Kok nudlene sammen med grønnsakene i ca. 5 minutter og sil av.'],
    ['Skjær kjøttet', 'Ta kjøttet ut av pannen og skjær det i tynne skiver.'],
    ['Server', 'Legg kjøttet over nudlene og grønnsakene og hell marinaden over. Pynt med koriander og ananas.'],
  ],
  'Thai curry': [
    ['Kok nudler', 'Kok nudlene etter anvisningen på pakken og sil av.'],
    ['Skjær opp', 'Skjær kylling eller svinekjøtt i strimler, og gulrot og paprika i tynne staver.'],
    ['Stek curryen', 'Stek den røde chilipastaen i litt olje i noen sekunder i en kjele. Tilsett kjøttet og stek til det har skiftet farge.'],
    ['Tilsett kokosmelk', 'Hell i kokosmelk og rør inn peanutsmør og fiskesaus. La det småkoke i noen minutter.'],
    ['Ha i grønnsaker', 'Ha i gulrot og paprika og la det småkoke til grønnsakene er møre men fortsatt litt faste, og kjøttet er gjennomkokt.'],
    ['Smak til og server', 'Smak til med limesaft og server over nudlene.'],
  ],
  'Thaisuppe med torsk og reker': [
    ['Gjør klart', 'Skjær torsken i terninger. Skjær rødløk i tynne skiver, finhakk hvitløk og chili, og skjær gulrot i tynne staver. Riv ingefær og del aspargesbønnene i to.'],
    ['Stek løk og hvitløk', 'Stek rødløk i olje til den er blank, ha i hvitløk og chili og ta alt til side.'],
    ['Lag suppebasen', 'Stek currypastaen i litt olje i en kjele i 30 sekunder. Tilsett revet ingefær, kokosmelk og fiskekraft.'],
    ['Kok grønnsakene', 'Ha i løkblandingen og gulrøttene og kok opp. La suppen småkoke i ca. 10 minutter. Ha i aspargesbønnene mot slutten.'],
    ['Ha i fisken', 'Legg torsken oppi og la den trekke i ca. 3 minutter, uten å koke hardt.'],
    ['Ha i rekene', 'Ha i rekene og la dem bli varme. Smak til med salt og limesaft.'],
    ['Server', 'Server suppen med grovhakket koriander, og ris eller nudler.'],
  ],
  'Thaisuppe pose': [
    ['Stek kyllingen', 'Skjær kyllingfileten i biter og stek den gjennom i en panne.'],
    ['Lag suppen', 'Følg anvisningen på thaisuppeposen: kok opp vann og rør inn posens innhold.'],
    ['Ha i kyllingen', 'Ha kyllingen i suppen og la den småkoke noen minutter.'],
    ['Server', 'Server suppen varm.'],
  ],
  'Tikka masala med lam': [
    ['Skjær kjøttet', 'Skjær lammekjøttet i terninger og marinér det gjerne i yoghurt og tikka masala-krydder en stund.'],
    ['Brun lammet', 'Brun kjøttet i en varm gryte til det har fått farge, og ta det ut.'],
    ['Lag sausen', 'Stek løk, hvitløk og ingefær myke og tilsett krydder. Hell i hermetiske tomater og la det koke inn en stund.'],
    ['La det småkoke', 'Legg lammet tilbake og la det småkoke under lokk til kjøttet er mørt, ca. 1–1,5 time. Rør inn fløte mot slutten.'],
    ['Server', 'Server med ris og naanbrød.'],
  ],
  'Tinas kyllingpanne': [
    ['Kok pasta', 'Kok pastaen etter anvisningen på pakken og sil av.'],
    ['Skjær opp', 'Skjær kyllingfileten i biter. Skjær rødløk, sopp og grønn paprika i biter og finhakk hvitløken.'],
    ['Stek kyllingen', 'Stek kyllingen i en stor panne til den er gylden. Krydre med salt, pepper og litt karri.'],
    ['Ha i grønnsakene', 'Ha i løk, sopp, paprika og hvitløk og stek dem myke.'],
    ['Lag sausen', 'Rør inn tomatpuré og crème fraîche, og la det småkoke noen minutter til kyllingen er gjennomstekt.'],
    ['Server', 'Server kyllingpannen over pasta.'],
  ],
  'Tom kha gai-suppe': [
    ['Kok ris', 'Kok risen etter anvisningen på pakken.'],
    ['Gjør klart', 'Tørk kyllingfileten og skjær den i mindre biter eller strimler. Finhakk ingefær, hvitløk og sitrongress.'],
    ['Lag buljongen', 'Kok opp kyllingkraften og la ingefær, hvitløk og sitrongress småkoke i 3 minutter.'],
    ['Ha i kokosmelk og kylling', 'Tilsett kokosmelk, fiskesaus og kyllingbitene. Kok opp og la det småkoke i ca. 5 minutter til kyllingen er gjennomkokt.'],
    ['Smak til', 'Rør inn skall og saft av lime og litt chiliflak. Ha i hakket koriander like før servering.'],
    ['Server', 'Server suppen over ris.'],
  ],
  Tomatsuppe: [
    ['Lag suppen', 'Lag tomatsuppen etter anvisningen på posen, eller kok hermetiske tomater med litt vann, buljong og litt salt og pepper, og kjør den glatt med stavmikser.'],
    ['Kok makaroni', 'Kok makaroni i en egen kjele etter anvisningen og sil av.'],
    ['Varm baguettene', 'Stek hvitløksbaguettene etter anvisningen på pakken.'],
    ['Server', 'Ha makaroni i tallerkenene, hell suppen over og server med hvitløksbaguett.'],
  ],
  'Torsk med grønn gugge': [
    ['Kok grønnsakene', 'Del brokkolien i buketter og kok den 2–3 minutter sammen med ertene i lettsaltet vann. Sil av.'],
    ['Stek baconet', 'Skjær baconet i biter og stek det sprøtt i en panne.'],
    ['Stek torsken', 'Krydre torsken med salt og pepper og stek den i smør, ca. 3–4 minutter på hver side, til den er gjennomstekt og har litt farge.'],
    ['Lag guggen', 'Mos brokkoli og erter grovt med en gaffel eller stavmikser, og smak til med salt, pepper og litt smør.'],
    ['Server', 'Server torsken med grønn gugge og bacon.'],
  ],
  'Torsk/kveite med hvit saus og poteter': [
    ['Kok potetene', 'Skrell potetene og sett dem på koking i lettsaltet vann, til de er møre.'],
    ['Lag hvit saus', 'Smelt smør, rør inn mel og spe med melk litt om gangen til sausen er glatt og tykner. Smak til med salt og pepper.'],
    ['Kok fisken', 'Legg fisken i lettsaltet, lettkokende vann og la den trekke i 5–8 minutter, avhengig av tykkelsen, til den er hvit og gjennomkokt.'],
    ['Server', 'Legg fisken på tallerkenen med poteter og hell hvit saus over.'],
  ],
  Vegetarburger: [
    ['Stek burgerne', 'Stek vegetarburgerne etter anvisningen på pakken, i panne eller ovn, til de er gjennomvarme.'],
    ['Skjær tilbehør', 'Skjær tomat i skiver og vask salaten.'],
    ['Varm brødene', 'Halver hamburgerbrødene og varm dem kort i ovnen eller i en tørr panne.'],
    ['Sett sammen', 'Smør hvitløksdressing på brødene og legg på salat, tomat, burger og cheddar.'],
  ],
}

export default steps
