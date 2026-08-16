/**
 * Languages supported by the Google Cloud Translation API (v2 general model).
 *
 * `code` is the BCP-47 code Google expects, `name` is the English label and
 * `nativeName` is what we show in the dropdown so a Hindi speaker sees हिन्दी.
 */

export interface Language {
    code: string
    name: string
    nativeName: string
    rtl?: boolean
}

export const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
    { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
    { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
    { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru' },
    { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili' },
    { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan' },
    { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
    { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
    { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
    { code: 'ca', name: 'Catalan', nativeName: 'Català' },
    { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
    { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
    { code: 'co', name: 'Corsican', nativeName: 'Corsu' },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި', rtl: true },
    { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
    { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
    { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe' },
    { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'fy', name: 'Frisian', nativeName: 'Frysk' },
    { code: 'gl', name: 'Galician', nativeName: 'Galego' },
    { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'gn', name: 'Guarani', nativeName: 'Avañeʼẽ' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen' },
    { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
    { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
    { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
    { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo' },
    { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі' },
    { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
    { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
    { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'kri', name: 'Krio', nativeName: 'Krio' },
    { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurmancî' },
    { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردیی ناوەندی', rtl: true },
    { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
    { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
    { code: 'la', name: 'Latin', nativeName: 'Latina' },
    { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
    { code: 'ln', name: 'Lingala', nativeName: 'Lingála' },
    { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
    { code: 'lg', name: 'Luganda', nativeName: 'Luganda' },
    { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
    { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
    { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
    { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
    { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'mni-Mtei', name: 'Meiteilon (Manipuri)', nativeName: 'ꯃꯤꯇꯩ ꯂꯣꯟ' },
    { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng' },
    { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
    { code: 'my', name: 'Myanmar (Burmese)', nativeName: 'မြန်မာ' },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'or', name: 'Odia (Oriya)', nativeName: 'ଓଡ଼ିଆ' },
    { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo' },
    { code: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa' },
    { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
    { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig' },
    { code: 'nso', name: 'Sepedi', nativeName: 'Sesotho sa Leboa' },
    { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
    { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
    { code: 'sn', name: 'Shona', nativeName: 'ChiShona' },
    { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', rtl: true },
    { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
    { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
    { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'tt', name: 'Tatar', nativeName: 'Татарча' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
    { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen' },
    { code: 'ak', name: 'Twi', nativeName: 'Twi' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
    { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', rtl: true },
    { code: 'uz', name: 'Uzbek', nativeName: "O'zbek" },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
    { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
    { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', rtl: true },
    { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
    { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' }
]

export const DEFAULT_LANGUAGE = 'en'

const languageIndex = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]))

export function isSupportedLanguage(code: string): boolean {
    return languageIndex.has(code.toLowerCase())
}

export function getLanguage(code: string): Language | undefined {
    return languageIndex.get(code.toLowerCase())
}

export function getLanguageName(code: string): string {
    return getLanguage(code)?.name ?? code
}

export function isRTL(code: string): boolean {
    return getLanguage(code)?.rtl === true
}

/** Case-insensitive search over English and native names for the dropdown. */
export function searchLanguages(term: string): Language[] {
    const needle = term.trim().toLowerCase()

    if (!needle) {
        return LANGUAGES
    }

    return LANGUAGES.filter(
        (language) =>
            language.name.toLowerCase().includes(needle) ||
            language.nativeName.toLowerCase().includes(needle) ||
            language.code.toLowerCase().includes(needle)
    )
}
