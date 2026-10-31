/** Link to the article template in the visitor's language (client-safe). */
export const templateHref = (locale: string) =>
  `/shablon/maqola-shabloni.docx${locale === "ru" || locale === "en" ? `?til=${locale}` : ""}`;
