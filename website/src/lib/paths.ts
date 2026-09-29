import { langs } from '../i18n';

export const langPaths = () => langs.map((lang) => ({ params: { lang }, props: { lang } }));
