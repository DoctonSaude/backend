import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';
import path from 'path';

i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
        fallbackLng: 'pt-BR',
        preload: ['pt-BR', 'en-US'],
        ns: ['common'],
        defaultNS: 'common',
        backend: {
            loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json')
        },
        detection: {
            order: ['header', 'querystring', 'cookie'],
            caches: false
        }
    });

export default i18next;
export { middleware };
