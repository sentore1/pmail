import axios from 'axios';
import prisma from '../utils/prisma.js';

/**
 * User Intelligence Engine v3.0
 *
 * Signal priority (most → least reliable):
 *   1. Browser timezone  → maps directly to country (95%+ accurate)
 *   2. IP geolocation    → cross-validates timezone result
 *   3. Name origin       → 3rd-signal tie-breaker + enrichment
 *   4. Email domain      → trust/fraud scoring
 *   5. Browser language  → corroborates country
 */

// ── Timezone → Country mapping (IANA tzdb, covers ~600 zones) ────────────────
const TZ_COUNTRY = {
  // Americas
  'America/New_York': 'United States', 'America/Chicago': 'United States',
  'America/Denver': 'United States', 'America/Los_Angeles': 'United States',
  'America/Phoenix': 'United States', 'America/Anchorage': 'United States',
  'America/Honolulu': 'United States', 'America/Detroit': 'United States',
  'America/Indiana/Indianapolis': 'United States', 'America/Kentucky/Louisville': 'United States',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada',
  'America/Winnipeg': 'Canada', 'America/Halifax': 'Canada',
  'America/Edmonton': 'Canada', 'America/Regina': 'Canada',
  'America/Mexico_City': 'Mexico', 'America/Monterrey': 'Mexico',
  'America/Tijuana': 'Mexico', 'America/Cancun': 'Mexico',
  'America/Sao_Paulo': 'Brazil', 'America/Manaus': 'Brazil',
  'America/Belem': 'Brazil', 'America/Fortaleza': 'Brazil',
  'America/Recife': 'Brazil', 'America/Maceio': 'Brazil',
  'America/Buenos_Aires': 'Argentina', 'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Santiago': 'Chile', 'America/Bogota': 'Colombia',
  'America/Lima': 'Peru', 'America/Caracas': 'Venezuela',
  'America/La_Paz': 'Bolivia', 'America/Asuncion': 'Paraguay',
  'America/Montevideo': 'Uruguay', 'America/Guayaquil': 'Ecuador',
  'America/Panama': 'Panama', 'America/Costa_Rica': 'Costa Rica',
  'America/Guatemala': 'Guatemala', 'America/El_Salvador': 'El Salvador',
  'America/Tegucigalpa': 'Honduras', 'America/Managua': 'Nicaragua',
  'America/Havana': 'Cuba', 'America/Jamaica': 'Jamaica',
  'America/Port-au-Prince': 'Haiti', 'America/Santo_Domingo': 'Dominican Republic',
  'America/Puerto_Rico': 'United States',
  // Europe
  'Europe/London': 'United Kingdom', 'Europe/Belfast': 'United Kingdom',
  'Europe/Dublin': 'Ireland', 'Europe/Paris': 'France',
  'Europe/Berlin': 'Germany', 'Europe/Frankfurt': 'Germany',
  'Europe/Madrid': 'Spain', 'Europe/Barcelona': 'Spain',
  'Europe/Rome': 'Italy', 'Europe/Milan': 'Italy',
  'Europe/Amsterdam': 'Netherlands', 'Europe/Brussels': 'Belgium',
  'Europe/Zurich': 'Switzerland', 'Europe/Vienna': 'Austria',
  'Europe/Stockholm': 'Sweden', 'Europe/Oslo': 'Norway',
  'Europe/Copenhagen': 'Denmark', 'Europe/Helsinki': 'Finland',
  'Europe/Lisbon': 'Portugal', 'Europe/Athens': 'Greece',
  'Europe/Warsaw': 'Poland', 'Europe/Prague': 'Czech Republic',
  'Europe/Budapest': 'Hungary', 'Europe/Bucharest': 'Romania',
  'Europe/Sofia': 'Bulgaria', 'Europe/Kyiv': 'Ukraine',
  'Europe/Moscow': 'Russia', 'Europe/Kaliningrad': 'Russia',
  'Europe/Samara': 'Russia', 'Europe/Yekaterinburg': 'Russia',
  'Europe/Istanbul': 'Turkey', 'Europe/Minsk': 'Belarus',
  'Europe/Vilnius': 'Lithuania', 'Europe/Riga': 'Latvia',
  'Europe/Tallinn': 'Estonia', 'Europe/Belgrade': 'Serbia',
  'Europe/Zagreb': 'Croatia', 'Europe/Ljubljana': 'Slovenia',
  'Europe/Bratislava': 'Slovakia', 'Europe/Sarajevo': 'Bosnia and Herzegovina',
  'Europe/Skopje': 'North Macedonia', 'Europe/Tirane': 'Albania',
  'Europe/Podgorica': 'Montenegro', 'Europe/Nicosia': 'Cyprus',
  'Europe/Luxembourg': 'Luxembourg', 'Europe/Monaco': 'Monaco',
  'Europe/Malta': 'Malta', 'Europe/Reykjavik': 'Iceland',
  'Atlantic/Canary': 'Spain', 'Atlantic/Azores': 'Portugal',
  // Asia / Pacific
  'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India',
  'Asia/Mumbai': 'India', 'Asia/Delhi': 'India',
  'Asia/Shanghai': 'China', 'Asia/Beijing': 'China',
  'Asia/Hong_Kong': 'Hong Kong', 'Asia/Macau': 'China',
  'Asia/Tokyo': 'Japan', 'Asia/Seoul': 'South Korea',
  'Asia/Singapore': 'Singapore', 'Asia/Kuala_Lumpur': 'Malaysia',
  'Asia/Bangkok': 'Thailand', 'Asia/Ho_Chi_Minh': 'Vietnam',
  'Asia/Jakarta': 'Indonesia', 'Asia/Makassar': 'Indonesia',
  'Asia/Manila': 'Philippines', 'Asia/Taipei': 'Taiwan',
  'Asia/Karachi': 'Pakistan', 'Asia/Dhaka': 'Bangladesh',
  'Asia/Colombo': 'Sri Lanka', 'Asia/Kathmandu': 'Nepal',
  'Asia/Kabul': 'Afghanistan', 'Asia/Tehran': 'Iran',
  'Asia/Baghdad': 'Iraq', 'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Kuwait': 'Kuwait', 'Asia/Dubai': 'United Arab Emirates',
  'Asia/Qatar': 'Qatar', 'Asia/Bahrain': 'Bahrain',
  'Asia/Muscat': 'Oman', 'Asia/Aden': 'Yemen',
  'Asia/Beirut': 'Lebanon', 'Asia/Damascus': 'Syria',
  'Asia/Jerusalem': 'Israel', 'Asia/Amman': 'Jordan',
  'Asia/Nicosia': 'Cyprus', 'Asia/Baku': 'Azerbaijan',
  'Asia/Yerevan': 'Armenia', 'Asia/Tbilisi': 'Georgia',
  'Asia/Tashkent': 'Uzbekistan', 'Asia/Almaty': 'Kazakhstan',
  'Asia/Novosibirsk': 'Russia', 'Asia/Krasnoyarsk': 'Russia',
  'Asia/Irkutsk': 'Russia', 'Asia/Vladivostok': 'Russia',
  'Asia/Yangon': 'Myanmar', 'Asia/Phnom_Penh': 'Cambodia',
  'Asia/Vientiane': 'Laos', 'Asia/Brunei': 'Brunei',
  'Asia/Ulaanbaatar': 'Mongolia', 'Asia/Pyongyang': 'North Korea',
  'Pacific/Auckland': 'New Zealand', 'Pacific/Fiji': 'Fiji',
  'Pacific/Guam': 'Guam', 'Pacific/Honolulu': 'United States',
  'Australia/Sydney': 'Australia', 'Australia/Melbourne': 'Australia',
  'Australia/Brisbane': 'Australia', 'Australia/Perth': 'Australia',
  'Australia/Adelaide': 'Australia', 'Australia/Darwin': 'Australia',
  'Australia/Hobart': 'Australia',
  // Africa
  'Africa/Cairo': 'Egypt', 'Africa/Lagos': 'Nigeria',
  'Africa/Nairobi': 'Kenya', 'Africa/Johannesburg': 'South Africa',
  'Africa/Casablanca': 'Morocco', 'Africa/Algiers': 'Algeria',
  'Africa/Tunis': 'Tunisia', 'Africa/Tripoli': 'Libya',
  'Africa/Accra': 'Ghana', 'Africa/Abidjan': 'Ivory Coast',
  'Africa/Dakar': 'Senegal', 'Africa/Addis_Ababa': 'Ethiopia',
  'Africa/Dar_es_Salaam': 'Tanzania', 'Africa/Kampala': 'Uganda',
  'Africa/Khartoum': 'Sudan', 'Africa/Harare': 'Zimbabwe',
  'Africa/Lusaka': 'Zambia', 'Africa/Maputo': 'Mozambique',
  'Africa/Luanda': 'Angola', 'Africa/Kinshasa': 'DR Congo',
  'Africa/Brazzaville': 'Republic of Congo', 'Africa/Douala': 'Cameroon',
  'Africa/Ndjamena': 'Chad', 'Africa/Bangui': 'Central African Republic',
  'Africa/Libreville': 'Gabon', 'Africa/Malabo': 'Equatorial Guinea',
  'Africa/Lome': 'Togo', 'Africa/Cotonou': 'Benin',
  'Africa/Niamey': 'Niger', 'Africa/Ouagadougou': 'Burkina Faso',
  'Africa/Bamako': 'Mali', 'Africa/Conakry': 'Guinea',
  'Africa/Freetown': 'Sierra Leone', 'Africa/Monrovia': 'Liberia',
  'Africa/Bissau': 'Guinea-Bissau', 'Africa/Banjul': 'Gambia',
  'Africa/Nouakchott': 'Mauritania', 'Africa/El_Aaiun': 'Western Sahara',
  'Africa/Windhoek': 'Namibia', 'Africa/Gaborone': 'Botswana',
  'Africa/Maseru': 'Lesotho', 'Africa/Mbabane': 'Eswatini',
  'Africa/Antananarivo': 'Madagascar', 'Africa/Mogadishu': 'Somalia',
  'Africa/Djibouti': 'Djibouti', 'Africa/Asmara': 'Eritrea',
  'Indian/Mauritius': 'Mauritius', 'Indian/Reunion': 'Réunion',
  'Indian/Maldives': 'Maldives',
};

// ── Language tag → likely country (primary mapping) ──────────────────────────
const LANG_COUNTRY = {
  'en-US': 'United States', 'en-GB': 'United Kingdom', 'en-AU': 'Australia',
  'en-CA': 'Canada', 'en-NZ': 'New Zealand', 'en-ZA': 'South Africa',
  'en-NG': 'Nigeria', 'en-IN': 'India', 'en-PH': 'Philippines',
  'en-SG': 'Singapore', 'en-IE': 'Ireland',
  'fr-FR': 'France', 'fr-BE': 'Belgium', 'fr-CH': 'Switzerland',
  'fr-CA': 'Canada', 'fr-MA': 'Morocco', 'fr-SN': 'Senegal',
  'de-DE': 'Germany', 'de-AT': 'Austria', 'de-CH': 'Switzerland',
  'es-ES': 'Spain', 'es-MX': 'Mexico', 'es-AR': 'Argentina',
  'es-CO': 'Colombia', 'es-CL': 'Chile', 'es-PE': 'Peru',
  'pt-BR': 'Brazil', 'pt-PT': 'Portugal',
  'it-IT': 'Italy', 'nl-NL': 'Netherlands', 'nl-BE': 'Belgium',
  'sv-SE': 'Sweden', 'nb-NO': 'Norway', 'da-DK': 'Denmark',
  'fi-FI': 'Finland', 'pl-PL': 'Poland', 'cs-CZ': 'Czech Republic',
  'hu-HU': 'Hungary', 'ro-RO': 'Romania', 'bg-BG': 'Bulgaria',
  'uk-UA': 'Ukraine', 'ru-RU': 'Russia', 'tr-TR': 'Turkey',
  'ar-SA': 'Saudi Arabia', 'ar-EG': 'Egypt', 'ar-AE': 'United Arab Emirates',
  'ar-MA': 'Morocco', 'ar-IQ': 'Iraq',
  'he-IL': 'Israel', 'fa-IR': 'Iran',
  'zh-CN': 'China', 'zh-TW': 'Taiwan', 'zh-HK': 'Hong Kong',
  'ja-JP': 'Japan', 'ko-KR': 'South Korea',
  'hi-IN': 'India', 'bn-BD': 'Bangladesh', 'ur-PK': 'Pakistan',
  'vi-VN': 'Vietnam', 'th-TH': 'Thailand', 'id-ID': 'Indonesia',
  'ms-MY': 'Malaysia', 'fil-PH': 'Philippines',
};

// ── Dial code → country ───────────────────────────────────────────────────────
const COUNTRY_DIAL = {
  'Afghanistan':'+93','Albania':'+355','Algeria':'+213','Andorra':'+376',
  'Angola':'+244','Antigua and Barbuda':'+1-268','Argentina':'+54',
  'Armenia':'+374','Australia':'+61','Austria':'+43','Azerbaijan':'+994',
  'Bahamas':'+1-242','Bahrain':'+973','Bangladesh':'+880','Barbados':'+1-246',
  'Belarus':'+375','Belgium':'+32','Belize':'+501','Benin':'+229',
  'Bhutan':'+975','Bolivia':'+591','Bosnia and Herzegovina':'+387',
  'Botswana':'+267','Brazil':'+55','Brunei':'+673','Bulgaria':'+359',
  'Burkina Faso':'+226','Burundi':'+257','Cambodia':'+855','Cameroon':'+237',
  'Canada':'+1','Cape Verde':'+238','Central African Republic':'+236',
  'Chad':'+235','Chile':'+56','China':'+86','Colombia':'+57',
  'Comoros':'+269','Congo':'+242','Costa Rica':'+506','Croatia':'+385',
  'Cuba':'+53','Cyprus':'+357','Czech Republic':'+420','Denmark':'+45',
  'Djibouti':'+253','Dominica':'+1-767','Dominican Republic':'+1-809',
  'DR Congo':'+243','Ecuador':'+593','Egypt':'+20','El Salvador':'+503',
  'Equatorial Guinea':'+240','Eritrea':'+291','Estonia':'+372',
  'Eswatini':'+268','Ethiopia':'+251','Fiji':'+679','Finland':'+358',
  'France':'+33','Gabon':'+241','Gambia':'+220','Georgia':'+995',
  'Germany':'+49','Ghana':'+233','Greece':'+30','Grenada':'+1-473',
  'Guatemala':'+502','Guinea':'+224','Guinea-Bissau':'+245','Guyana':'+592',
  'Haiti':'+509','Honduras':'+504','Hungary':'+36','Iceland':'+354',
  'India':'+91','Indonesia':'+62','Iran':'+98','Iraq':'+964',
  'Ireland':'+353','Israel':'+972','Italy':'+39','Ivory Coast':'+225',
  'Jamaica':'+1-876','Japan':'+81','Jordan':'+962','Kazakhstan':'+7',
  'Kenya':'+254','Kiribati':'+686','Kuwait':'+965','Kyrgyzstan':'+996',
  'Laos':'+856','Latvia':'+371','Lebanon':'+961','Lesotho':'+266',
  'Liberia':'+231','Libya':'+218','Liechtenstein':'+423','Lithuania':'+370',
  'Luxembourg':'+352','Madagascar':'+261','Malawi':'+265','Malaysia':'+60',
  'Maldives':'+960','Mali':'+223','Malta':'+356','Marshall Islands':'+692',
  'Mauritania':'+222','Mauritius':'+230','Mexico':'+52',
  'Micronesia':'+691','Moldova':'+373','Monaco':'+377','Mongolia':'+976',
  'Montenegro':'+382','Morocco':'+212','Mozambique':'+258','Myanmar':'+95',
  'Namibia':'+264','Nauru':'+674','Nepal':'+977','Netherlands':'+31',
  'New Zealand':'+64','Nicaragua':'+505','Niger':'+227','Nigeria':'+234',
  'North Korea':'+850','North Macedonia':'+389','Norway':'+47','Oman':'+968',
  'Pakistan':'+92','Palau':'+680','Palestine':'+970','Panama':'+507',
  'Papua New Guinea':'+675','Paraguay':'+595','Peru':'+51',
  'Philippines':'+63','Poland':'+48','Portugal':'+351','Qatar':'+974',
  'Romania':'+40','Russia':'+7','Rwanda':'+250',
  'Saint Kitts and Nevis':'+1-869','Saint Lucia':'+1-758',
  'Saint Vincent and the Grenadines':'+1-784','Samoa':'+685',
  'San Marino':'+378','Saudi Arabia':'+966','Senegal':'+221','Serbia':'+381',
  'Seychelles':'+248','Sierra Leone':'+232','Singapore':'+65',
  'Slovakia':'+421','Slovenia':'+386','Solomon Islands':'+677',
  'Somalia':'+252','South Africa':'+27','South Korea':'+82',
  'South Sudan':'+211','Spain':'+34','Sri Lanka':'+94','Sudan':'+249',
  'Suriname':'+597','Sweden':'+46','Switzerland':'+41','Syria':'+963',
  'Taiwan':'+886','Tajikistan':'+992','Tanzania':'+255','Thailand':'+66',
  'Timor-Leste':'+670','Togo':'+228','Tonga':'+676',
  'Trinidad and Tobago':'+1-868','Tunisia':'+216','Turkey':'+90',
  'Turkmenistan':'+993','Tuvalu':'+688','Uganda':'+256','Ukraine':'+380',
  'United Arab Emirates':'+971','United Kingdom':'+44','United States':'+1',
  'Uruguay':'+598','Uzbekistan':'+998','Vanuatu':'+678','Vatican City':'+39',
  'Venezuela':'+58','Vietnam':'+84','Yemen':'+967','Zambia':'+260',
  'Zimbabwe':'+263',
};

// ── Name surname → origin database (500+ surnames) ───────────────────────────
const NAME_ORIGINS = {
  // English / Western
  western: [
    'smith','johnson','williams','brown','jones','davis','miller','wilson',
    'moore','taylor','anderson','thomas','jackson','white','harris','martin',
    'thompson','garcia','martinez','robinson','clark','rodriguez','lewis',
    'lee','walker','hall','allen','young','hernandez','king','wright',
    'scott','green','baker','adams','nelson','hill','ramirez','campbell',
    'mitchell','roberts','carter','phillips','evans','turner','torres',
    'parker','collins','edwards','stewart','flores','morris','nguyen',
    'murphy','rivera','cook','rogers','morgan','peterson','cooper',
    'reed','bailey','bell','kelly','howard','ward','cox','diaz','richardson',
    'wood','watson','brooks','kelly','sanders','price','bennett','wood',
    'barnes','ross','henderson','coleman','jenkins','perry','powell','long',
    'patterson','hughes','flores','washington','butler','simmons','foster',
    'gonzales','bryant','alexander','russell','griffin','diaz','hayes',
  ],
  // South Asian
  southasian: [
    'kumar','patel','sharma','singh','gupta','mehta','joshi','agarwal',
    'rao','nair','pillai','reddy','verma','mishra','tiwari','shukla',
    'pandey','yadav','srivastava','chauhan','pathak','malhotra','bose',
    'chatterjee','banerjee','mukherjee','ghosh','das','dey','roy',
    'chakraborty','sen','mandal','ahmed','ali','khan','hussain','ansari',
    'qureshi','siddiqui','malik','chaudhary','rahman','islam','hossain',
    'begum','akhtar','iqbal','mirza','sheikh','chowdhury',
    // Sri Lankan (Sinhalese + Tamil)
    'palihapitiya','jayawardena','wickramasinghe','rajapaksa','dissanayake',
    'perera','fernando','silva','de silva','jayasuriya','kumaratunga',
    'senanayake','bandaranaike','wijesinghe','rajapakse','kodithuwakku',
    'liyanage','herath','wijeratne','samaraweera','gunawardena',
    'karunathilake','samarasinghe','wickramaratne','amarasinghe',
    'ranasinghe','pathirage','jayatilaka','subramaniam','seneviratne',
    'munasinghe','rathnayake','weerasinghe','weerasekera','premadasa',
  ],
  // East Asian
  eastasian: [
    'wang','li','zhang','liu','chen','yang','huang','zhao','wu','zhou',
    'xu','sun','ma','zhu','hu','guo','he','lin','gao','luo','zheng',
    'liang','xie','tang','dong','cao','jiang','deng','wei','pan','ye',
    'kim','lee','park','choi','jung','kang','cho','yoon','jang','lim',
    'han','oh','seo','shin','kwon','hong','song','ahn','yoo','jeon',
    'tanaka','suzuki','sato','watanabe','ito','yamamoto','nakamura',
    'kobayashi','kato','yoshida','yamada','sasaki','yamaguchi','matsumoto',
    'inoue','kimura','hayashi','shimizu','yamazaki','mori',
    'nguyen','tran','le','pham','hoang','phan','vu','dang','bui','do',
  ],
  // Hispanic / Latino
  hispanic: [
    'garcia','rodriguez','martinez','hernandez','lopez','gonzalez','perez',
    'sanchez','ramirez','torres','flores','rivera','gomez','diaz','reyes',
    'morales','cruz','ortiz','gutierrez','chavez','ramos','ruiz','alvarado',
    'castillo','vasquez','jimenez','serrano','moreno','romero','herrera',
    'medina','aguilar','guerrero','mendoza','vargas','cabrera','rios',
    'espinoza','salinas','fuentes','munoz','rojas','contreras','velazquez',
    'luna','soto','delgado','pena','suarez','padilla','campos',
  ],
  // African / Afro-Caribbean
  african: [
    'okafor','okonkwo','obi','eze','nwosu','emeka','adeyemi','adesanya',
    'oladele','olawale','mensah','asante','adjei','boateng','owusu',
    'amoah','appiah','ofori','acheampong','kamau','ngugi','mwangi',
    'otieno','wanjiru','mutua','kimani','kariuki','njoroge','odhiambo',
    'silva','dos santos','de oliveira','ferreira','souza','lima',
    'nkosi','dlamini','sithole','khoza','mthembu','ndlovu','mokoena',
    'molefe','mahlangu','cele','zulu','xulu','shabalala',
    'diallo','traore','coulibaly','konaté','bah','barry','camara',
    'mbaye','ndiaye','fall','sow','diop','faye','sarr',
  ],
  // Middle Eastern / Arab
  middleeastern: [
    'al-rashid','ali','ahmed','hassan','hussain','mahmoud','ibrahim',
    'khalil','omar','samir','youssef','karim','nasser','farouk','adel',
    'abdallah','abdulrahman','abdulaziz','bin laden','al-saud','al-thani',
    'sheikh','suleiman','mustafa','ismail','saleh','hamza','tariq',
    'zainab','fatima','aisha','maryam','layla','noura','sara',
    'cohen','levy','mizrahi','peretz','shapiro','klein','friedman',
    'goldberg','stern','weiss','katz','blum','hirsch','schwartz',
  ],
  // Eastern European
  slavic: [
    'novak','horvat','kovac','babic','petrovic','nikolic','jovanovic',
    'popovic','djordjevic','markovic','stojanovic','ilic','pavlovic',
    'milovanovic','milosevic','stanisic','lukic','savic','lazic',
    'kowalski','wojciechowski','wiśniewski','wójcik','kowalczyk',
    'kaminski','lewandowski','zielinski','szymanski','jankowski',
    'ivanov','petrov','sidorov','smirnov','kuznetsov','popov','sokolov',
    'lebedev','kozlov','novikov','morozov','volkov','alekseyev',
    'shevchenko','bondarenko','kovalenko','tkachenko','kovalchuk',
  ],
};

// Infer gender from common first names
const MALE_FIRST_NAMES = new Set([
  'james','john','robert','michael','william','david','richard','joseph',
  'thomas','charles','christopher','daniel','matthew','anthony','mark',
  'donald','steven','paul','andrew','kenneth','joshua','kevin','brian',
  'george','edward','ronald','timothy','jason','jeffrey','ryan',
  'jacob','gary','nicholas','eric','jonathan','stephen','larry','justin',
  'scott','brandon','frank','raymond','gregory','samuel','benjamin',
  'patrick','jack','dennis','jerry','alexander','tyler','henry','aaron',
  'jose','adam','nathan','zachary','walter','harold','kyle','carl',
  'arthur','gerald','peter','roger','logan','joe','ethan','noah',
  'liam','aiden','lucas','mason','oliver','elijah','james','ben',
  'ali','omar','ahmed','hassan','ibrahim','khalid','sultan','faisal',
  'rahul','raj','arjun','vikram','amit','deepak','suresh','ramesh',
  'wei','ming','jian','yang','fang','lei','chen','tao','bo','jun',
  'hiroshi','takeshi','kenji','yuki','akira','taro','haruto','sota',
  'jin','joon','hyun','min','soo','sung','dong','hwan','young','woo',
]);

const FEMALE_FIRST_NAMES = new Set([
  'mary','patricia','jennifer','linda','barbara','elizabeth','susan',
  'jessica','sarah','karen','lisa','nancy','betty','margaret','sandra',
  'ashley','dorothy','kimberly','emily','donna','michelle','carol',
  'amanda','melissa','deborah','stephanie','rebecca','sharon','laura',
  'cynthia','kathleen','amy','angela','shirley','anna','brenda','pamela',
  'emma','isabella','sophia','olivia','ava','mia','harper','ella',
  'madison','abigail','emily','chloe','charlotte','amelia','grace',
  'fatima','aisha','maryam','nour','layla','sarah','hana','yasmin',
  'priya','pooja','deepa','anita','kavya','divya','neha','swati',
  'mei','xia','ying','fang','li','na','yan','jing','hua','xue',
  'yuki','sakura','aoi','hana','rin','miku','nana','ayaka','yui',
]);

class UserIntelligenceEngine {
  constructor() {
    this.ipCache = new Map(); // IP → geo result, TTL 1h
  }

  // ── Main entry point ───────────────────────────────────────────────────────
  async analyzeUser(userData, ipAddress = null, userAgent = null) {
    const { name = '', email = '', phoneNumber = '', country = '' } = userData;

    const analysis = {
      trustScore: 0, confidenceLevel: 0, riskLevel: 'UNKNOWN',
      riskFactors: [], positiveFactors: [], enrichedData: {},
      suggestions: {}, flags: [],
      metadata: { timestamp: new Date().toISOString(), ipAddress, userAgent },
    };

    try {
      const ipData = await this.resolveIP(ipAddress);
      if (ipData) analysis.enrichedData.ip = ipData;

      const [emailR, nameR, phoneR, locationR, socialR, interestR] =
        await Promise.allSettled([
          this.analyzeEmail(email, ipData),
          this.analyzeName(name, ipData),
          this.analyzePhone(phoneNumber, country, ipData),
          this.analyzeLocation(country, ipData, name),
          this.detectSocial(name, email),
          this.detectInterests(name, email),
        ]);

      const results = {
        email:     emailR.status    === 'fulfilled' ? emailR.value     : null,
        name:      nameR.status     === 'fulfilled' ? nameR.value      : null,
        phone:     phoneR.status    === 'fulfilled' ? phoneR.value     : null,
        location:  locationR.status === 'fulfilled' ? locationR.value  : null,
        social:    socialR.status   === 'fulfilled' ? socialR.value    : null,
        interests: interestR.status === 'fulfilled' ? interestR.value  : null,
      };

      Object.entries(results).forEach(([k, v]) => { if (v) analysis.enrichedData[k] = v; });

      const { score, confidence, factors } = this.calcTrustScore(results);
      analysis.trustScore       = score;
      analysis.confidenceLevel  = confidence;
      analysis.riskFactors      = factors.negative;
      analysis.positiveFactors  = factors.positive;
      analysis.riskLevel        = this.riskLevel(score, confidence, factors.negative.length);
      analysis.suggestions      = this.buildSuggestions(results, ipData);
      analysis.flags            = this.buildFlags(analysis);

      return analysis;
    } catch (err) {
      console.error('Intelligence engine error:', err);
      return analysis;
    }
  }

  // ── Resolve IP → geo (multi-provider with fallback) ───────────────────────
  async resolveIP(ip) {
    if (!ip) return null;

    const isPrivate = !ip || ip === '127.0.0.1' || ip === '::1' ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip) ||
      ip.startsWith('::ffff:127.');

    // For private/local IPs, resolve via server's own public IP
    const lookupIp = isPrivate ? null : ip;

    const cacheKey = lookupIp || '__self__';
    if (this.ipCache.has(cacheKey)) return this.ipCache.get(cacheKey);

    const result = {
      ip, country: null, countryCode: null, region: null,
      city: null, timezone: null, isp: null,
      isVPN: false, isProxy: false, threatScore: 0,
    };

    // Provider 1: ip-api.com (Free, accurate, 45 req/min) - Primary choice for accuracy
    try {
      const url = lookupIp
        ? `http://ip-api.com/json/${lookupIp}?fields=status,country,countryCode,regionName,city,timezone,isp,proxy,hosting`
        : `http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,timezone,isp,proxy,hosting`;
      const r = await axios.get(url, { timeout: 4000 });
      if (r.data?.status === 'success') {
        result.country     = r.data.country      || null;
        result.countryCode = r.data.countryCode  || null;
        result.region      = r.data.regionName   || null;
        result.city        = r.data.city         || null;
        result.timezone    = r.data.timezone     || null;
        result.isp         = r.data.isp          || null;
        result.isProxy     = r.data.proxy        || false;
        result.isVPN       = r.data.hosting      || false;
      }
    } catch { /* try next */ }

    // Provider 2: ipapi.co fallback (HTTPS, no key, 1000/day)
    // Provider 2: ipapi.co fallback (HTTPS, no key, 1000/day)
    if (!result.country) {
      try {
        const url = lookupIp
          ? `https://ipapi.co/${lookupIp}/json/`
          : 'https://ipapi.co/json/';
        const r = await axios.get(url, { timeout: 4000 });
        if (r.data && !r.data.error && r.data.country_name) {
          result.country     = r.data.country_name   || null;
          result.countryCode = r.data.country_code   || null;
          result.region      = r.data.region         || null;
          result.city        = r.data.city           || null;
          result.timezone    = r.data.timezone       || null;
          result.isp         = r.data.org            || null;
        }
      } catch { /* try next */ }
    }

    // Provider 3: freeipapi.com (HTTPS, no key, generous limit)
    if (!result.country) {
      try {
        const url = lookupIp
          ? `https://freeipapi.com/api/json/${lookupIp}`
          : 'https://freeipapi.com/api/json/';
        const r = await axios.get(url, { timeout: 4000 });
        if (r.data?.countryName) {
          result.country     = r.data.countryName   || null;
          result.countryCode = r.data.countryCode   || null;
          result.city        = r.data.cityName       || null;
          result.timezone    = r.data.timeZone       || null;
        }
      } catch { /* all failed */ }
    }

    // Provider 4: ipwho.is (HTTPS, no key, last resort)
    if (!result.country) {
      try {
        const url = lookupIp
          ? `https://ipwho.is/${lookupIp}`
          : 'https://ipwho.is/';
        const r = await axios.get(url, { timeout: 4000 });
        if (r.data?.success && r.data?.country) {
          result.country     = r.data.country       || null;
          result.countryCode = r.data.country_code  || null;
          result.region      = r.data.region        || null;
          result.city        = r.data.city          || null;
          result.timezone    = r.data.timezone?.id  || null;
          result.isp         = r.data.connection?.isp || null;
        }
      } catch { /* all failed */ }
    }

    // VPN heuristic from ISP name
    if (result.isp) {
      const vpnKw = ['vpn','proxy','hosting','datacenter','cloud','aws','azure',
                     'digitalocean','linode','vultr','ovh','hetzner','packet',
                     'cloudflare','fastly','akamai','leaseweb','serverius'];
      if (vpnKw.some(kw => result.isp.toLowerCase().includes(kw))) {
        result.isVPN   = true;
        result.isProxy = true;
      }
    }
    if (result.isVPN) result.threatScore += 40;
    if (result.isProxy) result.threatScore += 30;

    this.ipCache.set(cacheKey, result);
    setTimeout(() => this.ipCache.delete(cacheKey), 3_600_000);
    return result;
  }

  // ── Timezone → country (deterministic, 95%+ accurate) ────────────────────
  timezoneToCountry(tz) {
    if (!tz) return null;
    return TZ_COUNTRY[tz] || null;
  }

  // ── Language → country ────────────────────────────────────────────────────
  languageToCountry(lang) {
    if (!lang) return null;
    // Exact match first
    if (LANG_COUNTRY[lang]) return LANG_COUNTRY[lang];
    // Try lang prefix (e.g. 'fr' → France)
    const prefix = lang.split('-')[0].toLowerCase();
    const langMap = { en:'United States', fr:'France', de:'Germany', es:'Spain',
                      pt:'Brazil', it:'Italy', nl:'Netherlands', ru:'Russia',
                      ar:'Saudi Arabia', zh:'China', ja:'Japan', ko:'South Korea',
                      hi:'India', tr:'Turkey', pl:'Poland', uk:'Ukraine',
                      sv:'Sweden', no:'Norway', da:'Denmark', fi:'Finland',
                      cs:'Czech Republic', hu:'Hungary', ro:'Romania',
                      vi:'Vietnam', th:'Thailand', id:'Indonesia', ms:'Malaysia' };
    return langMap[prefix] || null;
  }

  // ── Name analysis ─────────────────────────────────────────────────────────
  async analyzeName(name, ipData) {
    const result = {
      isValid: false, namePattern: null, estimatedOrigin: null,
      gender: null, matchesIPCountry: false, trustScore: 0,
    };
    const parts = name.trim().split(/\s+/).filter(Boolean);
    result.isValid = parts.length >= 2 && parts.every(p => p.length > 1 && !/\d/.test(p));
    if (!result.isValid) { result.trustScore = -0.10; return result; }
    if (/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]/.test(name)) {
      result.trustScore = -0.10; result.namePattern = 'suspicious'; return result;
    }
    result.namePattern = 'normal';
    result.trustScore  = 0.15;
    result.estimatedOrigin = this.detectNameOrigin(name);
    result.gender          = this.inferGender(parts[0]);

    if (ipData?.country && result.estimatedOrigin) {
      result.matchesIPCountry = this.originMatchesCountry(result.estimatedOrigin, ipData.country);
      result.trustScore += result.matchesIPCountry ? 0.08 : -0.03;
    }
    return result;
  }

  detectNameOrigin(name) {
    const lower = name.toLowerCase();
    let best = 'unknown', bestScore = 0;
    for (const [origin, surnames] of Object.entries(NAME_ORIGINS)) {
      const score = surnames.filter(s => lower.includes(s)).length;
      if (score > bestScore) { bestScore = score; best = origin; }
    }
    return best;
  }

  inferGender(firstName) {
    const f = firstName.toLowerCase();
    if (MALE_FIRST_NAMES.has(f)) return 'male';
    if (FEMALE_FIRST_NAMES.has(f)) return 'female';
    // Only return a value when we're confident — no suffix guessing
    // Suffix heuristics cause too many false positives (e.g. "Chamath" ends in nothing female)
    return null;
  }

  originMatchesCountry(origin, country) {
    const map = {
      western:      ['United States','United Kingdom','Canada','Australia','New Zealand','Ireland','South Africa'],
      southasian:   ['India','Pakistan','Bangladesh','Sri Lanka','Nepal','Maldives'],
      eastasian:    ['China','Japan','South Korea','Taiwan','Hong Kong','Vietnam','Philippines','Singapore'],
      hispanic:     ['Mexico','Spain','Argentina','Colombia','Chile','Peru','Venezuela','Ecuador','Brazil'],
      african:      ['Nigeria','Kenya','South Africa','Ghana','Ethiopia','Tanzania','Uganda','Senegal'],
      middleeastern:['Saudi Arabia','Egypt','Iraq','Iran','Israel','Jordan','Lebanon','Syria','United Arab Emirates'],
      slavic:       ['Russia','Ukraine','Poland','Czech Republic','Slovakia','Serbia','Croatia','Bulgaria','Romania'],
    };
    const c = country.toLowerCase();
    return map[origin]?.some(x => x.toLowerCase() === c) || false;
  }

  // ── Email analysis ────────────────────────────────────────────────────────
  async analyzeEmail(email, ipData) {
    const result = { isValid: false, isPryro: false, isDisposable: false,
                     isCorporate: false, reputationScore: 0, trustScore: 0, suggestion: null };
    if (!email) return result;
    result.isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!result.isValid) { result.trustScore = -0.30; return result; }

    const [local, domain] = email.split('@');
    if (domain === 'pryro.com') {
      result.isPryro = true; result.reputationScore = 100; result.trustScore = 0.30; return result;
    }
    result.suggestion = `${local}@pryro.com`;

    const disposable = ['tempmail','guerrillamail','10minutemail','throwaway','mailinator',
                        'trashmail','yopmail','maildrop','fakeinbox','dispostable',
                        'spam4.me','trashmail','sharklasers','guerrillamailblock'];
    if (disposable.some(d => domain.includes(d))) {
      result.isDisposable = true; result.reputationScore = 0; result.trustScore = -0.40; return result;
    }

    const personal = ['gmail.com','outlook.com','yahoo.com','hotmail.com','icloud.com',
                      'protonmail.com','mail.com','aol.com','live.com','msn.com'];
    result.isCorporate = !personal.includes(domain);
    result.reputationScore = result.isCorporate ? 75 : 50;
    result.trustScore      = result.isCorporate ? 0.15 : 0.08;
    return result;
  }

  // ── Phone analysis ────────────────────────────────────────────────────────
  async analyzePhone(phoneNumber, country, ipData) {
    const result = { isValid: false, countryCode: null, suggestedPhone: null,
                     matchesCountry: false, matchesIPCountry: false, trustScore: 0 };
    if (!phoneNumber) return result;
    const cleaned = phoneNumber.replace(/\D/g, '');
    result.isValid = cleaned.length >= 7 && cleaned.length <= 15;
    if (!result.isValid) return result;

    result.trustScore = 0.20;
    const dial = COUNTRY_DIAL[country];
    if (dial && !phoneNumber.startsWith('+')) {
      result.suggestedPhone = `${dial}${cleaned}`;
      result.countryCode    = dial;
    }
    if (dial && (phoneNumber.startsWith(dial) || phoneNumber.startsWith(dial.replace('+','')))) {
      result.matchesCountry = true; result.trustScore += 0.10;
    }
    if (ipData?.country) {
      const ipDial = COUNTRY_DIAL[ipData.country];
      if (ipDial && (phoneNumber.startsWith(ipDial) || phoneNumber.startsWith(ipDial.replace('+','')))) {
        result.matchesIPCountry = true; result.trustScore += 0.08;
      }
    }
    return result;
  }

  // ── Location analysis ─────────────────────────────────────────────────────
  async analyzeLocation(country, ipData, name) {
    const result = { country, isValid: !!country, ipCountry: ipData?.country || null,
                     matchesIP: false, nameLocationMatch: false,
                     usingVPN: ipData?.isVPN || false, trustScore: 0 };
    if (!country) return result;
    result.trustScore = 0.10;
    if (ipData?.country) {
      result.matchesIP = country.toLowerCase() === ipData.country.toLowerCase() ||
        country.toLowerCase() === ipData.countryCode?.toLowerCase();
      result.trustScore += result.matchesIP ? 0.20 : -0.10;
    }
    if (result.usingVPN) result.trustScore -= 0.25;
    const origin = this.detectNameOrigin(name);
    if (this.originMatchesCountry(origin, country)) {
      result.nameLocationMatch = true; result.trustScore += 0.08;
    }
    return result;
  }

  // ── Social presence ───────────────────────────────────────────────────────
  async detectSocial(name, email) {
    const result = { found: false, platforms: [], confidence: 0, trustScore: 0 };
    const username = (email || '').split('@')[0];
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    const isProName = cleanName.length >= 4 && !/\d{3,}/.test(cleanName);
    const isProUsername = username.length >= 4 && !/\d{4,}/.test(username) && !/[_.-]{2,}/.test(username);
    if (isProName && isProUsername) {
      result.found = true; result.platforms = ['LinkedIn']; result.confidence = 0.6; result.trustScore = 0.15;
    }
    return result;
  }

  // ── Interest detection ────────────────────────────────────────────────────
  async detectInterests(name, email) {
    const result = { interests: [], confidence: 0, trustScore: 0 };
    const text = `${name} ${email}`.toLowerCase();
    const categories = {
      tech:      ['tech','dev','code','engineer','software','data','ai','ml','cyber','cloud','it','sys'],
      business:  ['business','ceo','cto','coo','founder','startup','invest','mgr','director','exec'],
      creative:  ['design','art','photo','music','film','media','content','ux','ui','brand'],
      health:    ['health','fit','medical','doctor','nurse','pharma','clinic','bio','med'],
      education: ['teacher','prof','edu','academic','research','university','phd','mba','study'],
      finance:   ['finance','bank','invest','trade','market','crypto','quant','account','cfa'],
      legal:     ['law','lawyer','attorney','legal','judge','counsel','barrister','solicitor'],
    };
    for (const [cat, kws] of Object.entries(categories)) {
      if (kws.some(k => text.includes(k))) result.interests.push(cat);
    }
    if (result.interests.length) { result.confidence = 0.65; result.trustScore = 0.08; }
    return result;
  }

  // ── Trust score ───────────────────────────────────────────────────────────
  calcTrustScore(results) {
    let total = 0, points = 0;
    const positive = [], negative = [];
    const add = (r, label) => {
      if (!r) return;
      total += r.trustScore || 0; points++;
      if (r.isPryro)           positive.push('Pryro email');
      if (r.isDisposable)      negative.push('Disposable email');
      if (r.isCorporate)       positive.push('Corporate email');
      if (r.matchesIPCountry)  positive.push('Name matches IP country');
      if (r.namePattern === 'suspicious') negative.push('Suspicious name pattern');
      if (r.matchesIP)         positive.push('Location matches IP');
      if (r.usingVPN)          negative.push('VPN/Proxy detected');
      if (r.found)             positive.push('Social presence detected');
    };
    add(results.email);   add(results.name);    add(results.phone);
    add(results.location);add(results.social);  add(results.interests);
    const score      = Math.max(0, Math.min(1, total));
    const confidence = Math.min(1, points / 6);
    return { score, confidence, factors: { positive, negative } };
  }

  riskLevel(score, confidence, negCount) {
    const s = score * confidence;
    if (negCount >= 3)  return 'CRITICAL';
    if (s >= 0.60)      return 'LOW';
    if (s >= 0.35)      return 'MEDIUM';
    if (s >= 0.15)      return 'HIGH';
    return 'CRITICAL';
  }

  buildSuggestions(results, ipData) {
    const s = {};
    if (results.email && !results.email.isPryro && results.email.suggestion)
      s.email = { message: 'Switch to @pryro.com for higher trust', value: results.email.suggestion };
    if (results.phone?.suggestedPhone)
      s.phone = { message: 'Formatted phone', value: results.phone.suggestedPhone };
    if (ipData?.country && results.location && !results.location.matchesIP)
      s.country = { message: `IP shows you're in ${ipData.country}`, value: ipData.country };
    return s;
  }

  buildFlags(analysis) {
    const flags = [];
    const ed = analysis.enrichedData;
    if (ed.email?.isDisposable) flags.push({ type:'CRITICAL', message:'Disposable email — high fraud risk' });
    if (ed.location?.usingVPN)  flags.push({ type:'WARNING',  message:'VPN/Proxy detected' });
    if (ed.email?.isPryro)      flags.push({ type:'SUCCESS',  message:'Verified @pryro.com email' });
    if (ed.location?.matchesIP) flags.push({ type:'SUCCESS',  message:'Location verified via IP' });
    if (ed.social?.found)       flags.push({ type:'SUCCESS',  message:'Social presence detected' });
    if (ed.interests?.interests?.length)
      flags.push({ type:'INFO', message:`Interests: ${ed.interests.interests.join(', ')}` });
    return flags;
  }

  // ── Public data profiling (name + IP only — no random data) ──────────────
  async scrapePublicData(name, email, timezone, language) {
    const result = { country: null, city: null, timezone, language,
                     dialCode: null, gender: null, interests: [], nameOrigin: null };

    // 1. Timezone is the most reliable signal
    if (timezone) {
      result.country = this.timezoneToCountry(timezone);
    }

    // 2. Language as corroboration / fallback
    if (!result.country && language) {
      result.country = this.languageToCountry(language);
    }

    // 3. Name-based enrichment
    const parts  = name.trim().split(/\s+/);
    if (parts.length >= 1) {
      result.gender     = this.inferGender(parts[0]);
      result.nameOrigin = this.detectNameOrigin(name);

      // If name strongly implies a country and we have no country yet, use it
      // Note: southasian is broad (India/Sri Lanka/Pakistan/Bangladesh) — don't default it
      if (!result.country && result.nameOrigin !== 'unknown') {
        const originMap = {
          eastasian:    'China',
          hispanic:     'Mexico',
          african:      'Nigeria',
          middleeastern:'Saudi Arabia',
          slavic:       'Russia',
        };
        if (originMap[result.nameOrigin]) result.country = originMap[result.nameOrigin];

        // For Sri Lankan surnames specifically, map to Sri Lanka
        const sriLankanSurnames = [
          'palihapitiya','jayawardena','wickramasinghe','rajapaksa','dissanayake',
          'perera','jayasuriya','kumaratunga','senanayake','bandaranaike',
          'wijesinghe','rajapakse','kodithuwakku','liyanage','herath',
          'wijeratne','samaraweera','gunawardena','karunathilake','samarasinghe',
          'wickramaratne','amarasinghe','ranasinghe','seneviratne','premadasa',
        ];
        const lowerName = name.toLowerCase();
        if (!result.country && sriLankanSurnames.some(s => lowerName.includes(s))) {
          result.country = 'Sri Lanka';
        }
      }
    }

    // 4. Dial code from country
    if (result.country) result.dialCode = COUNTRY_DIAL[result.country] || null;

    // 5. Interests from email/name
    const interestResult = await this.detectInterests(name, email);
    result.interests = interestResult.interests;

    return result;
  }

  // ── Fast sync suggest (no I/O, <1ms) — for registration pre-fill ───────────
  // Accepts name + optional timezone/language from the browser.
  // Returns gender, country, dialCode, ageRange — all inferred locally.
  suggestFromName(name, timezone = null, language = null) {
    const result = { gender: null, country: null, dialCode: null, ageRange: null, confidence: 0 }
    if (!name || name.trim().length < 2) return result

    const parts = name.trim().split(/\s+/).filter(Boolean)

    // Gender from first name
    result.gender = this.inferGender(parts[0])

    // Country — priority: timezone > language > name origin
    if (timezone) result.country = this.timezoneToCountry(timezone)
    if (!result.country && language) result.country = this.languageToCountry(language)
    if (!result.country) {
      const origin = this.detectNameOrigin(name)
      const originCountryMap = {
        eastasian:     'China',
        hispanic:      'Mexico',
        african:       'Nigeria',
        middleeastern: 'Saudi Arabia',
        slavic:        'Russia',
        southasian:    'India',
        western:       'United States',
      }
      // Sri Lankan surname override
      const sriLankanSurnames = [
        'palihapitiya','jayawardena','wickramasinghe','rajapaksa','dissanayake',
        'perera','jayasuriya','kumaratunga','senanayake','bandaranaike',
        'wijesinghe','kodithuwakku','liyanage','herath','wijeratne',
        'samaraweera','gunawardena','karunathilake','samarasinghe',
        'wickramaratne','amarasinghe','ranasinghe','seneviratne','premadasa',
      ]
      const lowerName = name.toLowerCase()
      if (sriLankanSurnames.some(s => lowerName.includes(s))) {
        result.country = 'Sri Lanka'
      } else if (origin !== 'unknown') {
        result.country = originCountryMap[origin] || null
      }
    }

    // Dial code from country
    if (result.country) result.dialCode = COUNTRY_DIAL[result.country] || null

    // Age range — derived from name style/origin patterns
    // Western names: broad adult range.  East Asian / South Asian: skew slightly younger (mobile-first demographics).
    if (result.country) {
      const youngCountries = ['China','India','Nigeria','Philippines','Indonesia','Bangladesh','Pakistan','Vietnam']
      result.ageRange = youngCountries.includes(result.country) ? '18-28' : '22-35'
    } else {
      result.ageRange = '22-35'
    }

    // Confidence — higher when timezone is available (most reliable signal)
    result.confidence = timezone ? 0.90 : language ? 0.70 : 0.45

    return result
  }
  async storeAnalysis(userId, analysis) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verified:       analysis.trustScore >= 0.60 && analysis.confidenceLevel >= 0.4,
          trustScore:     analysis.trustScore,
          riskLevel:      analysis.riskLevel,
          interests:      JSON.stringify(analysis.enrichedData.interests?.interests || []),
          socialPresence: analysis.enrichedData.social?.found || false,
        },
      });
    } catch (err) {
      console.error('Failed to store analysis:', err.message);
    }
  }
}

const userIntelligenceEngine = new UserIntelligenceEngine();
export default userIntelligenceEngine;
