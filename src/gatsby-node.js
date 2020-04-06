/**
 * Makes sure to create localized paths for each file in the /pages folder.
 * For example, pages/404.js will be converted to /en/404.js and /el/404.js and
 * it will be accessible from https:// .../en/404/ and https:// .../el/404/
 */
import { DEFAULT_OPTIONS } from './constants';

export const onCreatePage = async (
  { page, actions: { createPage, deletePage, createRedirect } },
  pluginOptions
) => {
  const {
    supportedLanguages,
    defaultLanguage,
    notFoundPage,
    excludedPages,
    deleteOriginalPages,
  } = {
    ...DEFAULT_OPTIONS,
    ...pluginOptions,
  };

  const isEnvDevelopment = process.env.NODE_ENV === 'development';
  const originalPath = page.path;
  const is404 = originalPath.includes(notFoundPage);

  if (page.context.qlang) return;
  // return early if page is exluded
  if (excludedPages.includes(originalPath)) {
    return;
  }

  // Delete the original page (since we are gonna create localized versions of it) and add a
  // redirect header
  if (deleteOriginalPages) {
    await deletePage(page);
  }

  await Promise.all(
    supportedLanguages.map(async (lang) => {
      const localizedPath = `/${lang}${page.path}`;
      const qlang = lang.includes('zh') ? 'zh' : lang; // create a redirect based on the accept-language header
      // create a redirect based on the accept-language header
      createRedirect({
        fromPath: originalPath,
        toPath: localizedPath,
        Language: lang,
        isPermanent: false,
        redirectInBrowser: isEnvDevelopment,
        statusCode: is404 ? 404 : 301,
      });

      await createPage({
        ...page,
        path: localizedPath,
        context: {
          ...page.context,
          localizedPath,
          originalPath,
          lang,
          qlang,
        },
      });
    })
  );

  // Create a fallback redirect if the language is not supported or the
  // Accept-Language header is missing for some reason
  createRedirect({
    fromPath: originalPath,
    toPath: `/${defaultLanguage}${page.path}`,
    isPermanent: false,
    redirectInBrowser: isEnvDevelopment,
    statusCode: is404 ? 404 : 301,
  });
};

export const onPreBuild = ({ actions: { createRedirect } }, pluginOptions) => {
  const isEnvDevelopment = process.env.NODE_ENV === 'development';
  const { notFoundPage } = { ...DEFAULT_OPTIONS, ...pluginOptions };

  // we add a generic redirect to the "not found path" for every path that's not present in the app.
  // This rule needs to be the last one (so that it only kicks in if nothing else matched before),
  // thus it's added after all the page-related hooks have finished (hence "onPreBuild")

  if (notFoundPage) {
    createRedirect({
      fromPath: '/*',
      toPath: notFoundPage,
      isPermanent: false,
      redirectInBrowser: isEnvDevelopment,
      statusCode: 302,
    });
  }
};
