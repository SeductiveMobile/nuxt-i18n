import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)


export default async ({ app, route, store, req }) => {
  // Options
  const lazy = <%= options.lazy %>
  const vuex = <%= JSON.stringify(options.vuex) %>

  // Helpers
  const LOCALE_CODE_KEY = '<%= options.LOCALE_CODE_KEY %>'
  const LOCALE_DOMAIN_KEY = '<%= options.LOCALE_DOMAIN_KEY %>'
  const getLocaleCodes = <%= options.getLocaleCodes %>
  const getLocaleFromRoute = <%= options.getLocaleFromRoute %>
  const getHostname = <%= options.getHostname %>
  const getForwarded = <%= options.getForwarded %>
  const getLocaleDomain = <%= options.getLocaleDomain %>
  const syncVuex = <%= options.syncVuex %>

  <% if (options.vuex) { %>
  // Register Vuex module
  if (store) {
    store.registerModule(vuex.moduleName, {
      namespaced: true,
      state: () => ({
        locale: '',
        messages: {}
      }),
      actions: {
        setLocale ({ commit }, locale) {
          commit(vuex.mutations.setLocale, locale)
        },
        setMessages ({ commit }, messages) {
          commit(vuex.mutations.setMessages, messages)
        }
      },
      mutations: {
        [vuex.mutations.setLocale] (state, locale) {
          state.locale = locale
        },
        [vuex.mutations.setMessages] (state, messages) {
          state.messages = messages
        }
      }
    })
  }
  <% } %>

  // Load locale Settings form server side
  const locales = await store.dispatch("locales/loadLocales")
  const localeCodes = store.getters['locales/i18nLocales']
  const defaultLocaleCode = store.getters['locales/defaultLocaleCode']
  const messages = {}

  const translationsPromises = locales.map(async l => {
    return {
      "locale_code": l.locale_code,
      "messages": await store.dispatch("locales/loadLocaleJSONFile", l.localization_file.file)
    }
  })
  const translates = await Promise.all(translationsPromises)
  translates.forEach(t => {
    messages[t.locale_code] = t.messages
  })

  const vueI18n = {
    fallbackLocale: defaultLocaleCode,
    messages: messages
  }

  // Set instance options
  app.i18n = new VueI18n(vueI18n)
  app.i18n.locales = localeCodes
  app.i18n.defaultLocale = defaultLocaleCode
  app.i18n.differentDomains = <%= options.differentDomains %>
  app.i18n.forwardedHost = <%= options.forwardedHost %>
  app.i18n.routesNameSeparator = '<%= options.routesNameSeparator %>'
  app.i18n.beforeLanguageSwitch = <%= options.beforeLanguageSwitch %>
  app.i18n.onLanguageSwitched = <%= options.onLanguageSwitched %>

  if (store && store.state.localeDomains) {
    app.i18n.locales.forEach(locale => {
      locale.domain = store.state.localeDomains[locale.code];
    })
  }

  let locale = app.i18n.defaultLocale || null

  if (app.i18n.differentDomains) {
    const domainLocale = getLocaleDomain()
    locale = domainLocale ? domainLocale : locale
  } else {
    const routeLocale = getLocaleFromRoute(route, app.i18n.routesNameSeparator, app.i18n.locales)
    locale = routeLocale ? routeLocale : locale
  }

  app.i18n.locale = locale

  // Lazy-load translations
  if (lazy) {
    const { loadLanguageAsync } = require('./utils')
    const messages = await loadLanguageAsync(app.i18n, app.i18n.locale)
    syncVuex(locale, messages)
    return messages
  } else {
    // Sync Vuex
    syncVuex(locale, app.i18n.getLocaleMessage(locale))
  }
}
