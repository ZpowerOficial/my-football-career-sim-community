import type { Continent } from "../types";
import { NATIONALITIES } from "./general";
import { FIRST_NAMES, FIRST_NAMES_FEMALE, LAST_NAMES } from "./player";

export const selectWeightedNationality = (continent: Continent): string => {
  const nationalitiesInContinent = NATIONALITIES.filter(
    (n) => n.continent === continent,
  );
  if (nationalitiesInContinent.length === 0) return "England"; // fallback

  // Weight by talentPool (higher talentPool = higher chance)
  const totalWeight = nationalitiesInContinent.reduce(
    (sum, n) => sum + n.talentPool,
    0,
  );
  let random = Math.random() * totalWeight;

  for (const nat of nationalitiesInContinent) {
    random -= nat.talentPool;
    if (random <= 0) return nat.name;
  }

  return nationalitiesInContinent[0].name; // fallback
};

export const getNameByNationality = (
  nationality: string,
  gender: "male" | "female" = "male",
): string => {
  // Map nationality to name key
  const nameKeyMap: { [key: string]: string } = {
    // Europe - Western
    England: "english",
    Spain: "spanish",
    Germany: "german",
    France: "french",
    Italy: "italian",
    Portugal: "portuguese",
    Netherlands: "dutch",
    Belgium: "french",
    Switzerland: "german",
    Austria: "german",
    Scotland: "english",
    Wales: "english",
    Ireland: "english",
    Luxembourg: "french",
    Liechtenstein: "german",
    Monaco: "french",
    Andorra: "spanish",
    "San Marino": "italian",

    // Europe - Nordic
    Denmark: "scandinavian",
    Sweden: "scandinavian",
    Norway: "scandinavian",
    Finland: "scandinavian",
    Iceland: "scandinavian",
    "Faroe Islands": "scandinavian",

    // Europe - Eastern
    Croatia: "eastern_european",
    Poland: "eastern_european",
    Serbia: "eastern_european",
    Ukraine: "eastern_european",
    Turkey: "turkish",
    "Czech Republic": "eastern_european",
    Czechia: "eastern_european",
    Romania: "eastern_european",
    Greece: "greek",
    Russia: "eastern_european",
    Hungary: "eastern_european",
    Slovakia: "eastern_european",
    Slovenia: "eastern_european",
    Bulgaria: "eastern_european",
    Bosnia: "eastern_european",
    "Bosnia and Herzegovina": "eastern_european",
    Montenegro: "eastern_european",
    "North Macedonia": "eastern_european",
    Macedonia: "eastern_european",
    Albania: "eastern_european",
    Kosovo: "eastern_european",
    Moldova: "eastern_european",
    Belarus: "eastern_european",
    Lithuania: "eastern_european",
    Latvia: "eastern_european",
    Estonia: "eastern_european",
    Georgia: "eastern_european",
    Armenia: "eastern_european",
    Azerbaijan: "eastern_european",
    Cyprus: "greek",
    Malta: "italian",

    // South America
    Brazil: "brazilian",
    Argentina: "argentinian",
    Uruguay: "argentinian",
    Colombia: "spanish",
    Chile: "spanish",
    Ecuador: "spanish",
    Paraguay: "spanish",
    Peru: "spanish",
    Venezuela: "spanish",
    Bolivia: "spanish",

    // North & Central America
    USA: "english",
    Mexico: "spanish",
    Canada: "english",
    "Costa Rica": "spanish",
    Jamaica: "english",
    Panama: "spanish",
    Honduras: "spanish",
    Guatemala: "spanish",
    "El Salvador": "spanish",
    Nicaragua: "spanish",
    Cuba: "spanish",
    "Dominican Republic": "spanish",
    Haiti: "french",
    "Trinidad and Tobago": "english",
    Curacao: "dutch",
    Suriname: "dutch",

    // Africa - Lusophone (Portuguese-speaking)
    "Guinea-Bissau": "lusophone_african",
    Angola: "lusophone_african",
    Mozambique: "lusophone_african",
    "Cape Verde": "lusophone_african",
    "Sao Tome and Principe": "lusophone_african",

    // Africa - Francophone & West African
    Senegal: "african",
    Nigeria: "african",
    Cameroon: "african",
    Ghana: "african",
    "Ivory Coast": "african",
    Mali: "african",
    "Burkina Faso": "african",
    Guinea: "african",
    Benin: "african",
    Togo: "african",
    Niger: "african",
    Gabon: "african",
    Congo: "african",
    "DR Congo": "african",
    "Democratic Republic of the Congo": "african",
    "Central African Republic": "african",
    Chad: "african",
    Mauritania: "african",
    Gambia: "african",
    "Sierra Leone": "african",
    Liberia: "african",
    Rwanda: "african",
    Burundi: "african",
    Madagascar: "african",
    Comoros: "african",
    "Equatorial Guinea": "spanish",

    // Africa - North African (Arabic)
    Morocco: "arabic",
    Egypt: "arabic",
    Algeria: "arabic",
    Tunisia: "arabic",
    Libya: "arabic",
    Sudan: "arabic",

    // Africa - East & South
    "South Africa": "african",
    Zimbabwe: "african",
    Zambia: "african",
    Kenya: "african",
    Tanzania: "african",
    Uganda: "african",
    Ethiopia: "african",
    Eritrea: "african",
    Namibia: "african",
    Botswana: "african",
    Malawi: "african",
    Lesotho: "african",
    Eswatini: "african",

    // Asia - East
    Japan: "japanese",
    "South Korea": "korean",
    China: "chinese",
    "North Korea": "korean",
    Taiwan: "chinese",
    "Hong Kong": "chinese",

    // Asia - Middle East
    Iran: "arabic",
    "Saudi Arabia": "arabic",
    Qatar: "arabic",
    Iraq: "arabic",
    UAE: "arabic",
    "United Arab Emirates": "arabic",
    Kuwait: "arabic",
    Bahrain: "arabic",
    Oman: "arabic",
    Yemen: "arabic",
    Jordan: "arabic",
    Lebanon: "arabic",
    Syria: "arabic",
    Palestine: "arabic",
    Israel: "israeli",

    // Asia - Central & South
    Uzbekistan: "eastern_european",
    Kazakhstan: "eastern_european",
    Tajikistan: "eastern_european",
    Turkmenistan: "eastern_european",
    Kyrgyzstan: "eastern_european",
    Afghanistan: "arabic",
    Pakistan: "indian",
    India: "indian",
    Bangladesh: "indian",
    Nepal: "indian",
    "Sri Lanka": "indian",

    // Asia - Southeast
    Thailand: "southeast_asian",
    Vietnam: "southeast_asian",
    Indonesia: "southeast_asian",
    Malaysia: "southeast_asian",
    Philippines: "southeast_asian",
    Singapore: "southeast_asian",
    Myanmar: "southeast_asian",
    Cambodia: "southeast_asian",
    Laos: "southeast_asian",
    Brunei: "southeast_asian",
    "Timor-Leste": "southeast_asian",

    // Oceania
    Australia: "english",
    "New Zealand": "english",
    Fiji: "fijian",
    "Papua New Guinea": "pacific",
    Samoa: "pacific",
    Tonga: "pacific",
    "Solomon Islands": "pacific",
    Vanuatu: "pacific",
    "New Caledonia": "pacific",
    Tahiti: "pacific",
    Guam: "pacific",
  };

  const nameKey = nameKeyMap[nationality] || "global";

  // Seleciona lista de nomes baseado no gênero
  const firstNamesList = gender === "female" ? FIRST_NAMES_FEMALE : FIRST_NAMES;
  const firstNames =
    firstNamesList[nameKey as keyof typeof firstNamesList] || firstNamesList.global;
  const lastNames =
    LAST_NAMES[nameKey as keyof typeof LAST_NAMES] || LAST_NAMES.global;

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
};
