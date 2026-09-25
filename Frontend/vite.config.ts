import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

import siteConfiguration from './.figma/make/site.json' with { type: 'json' }


// Vite config — https://vitejs.dev/config/
//
// Проект изначально сгенерирован в Figma Make, от его рантайм-плагинов избавились.
// Остался только figmaSiteConfiguration — он подставляет title/lang/description
// из .figma/make/site.json в index.html и генерирует robots.txt.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    siteConfigurationPlugin(siteConfiguration),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Go-бэкенд (следующая задача) слушает :8080 и отдаёт JSON API на /api.
    // В dev фронт проксирует /api на него, чтобы не было CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})

type SiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
}

/** Подставляет значения из .figma/make/site.json в HTML-оболочку и robots.txt. */
function siteConfigurationPlugin(config: SiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? 'Монтаж 360'
  const description = config.description ?? ''
  const language = sanitizeHtmlValue(config.language) || 'ru'
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        // Остальные figma-слоты не используются — убираем их из разметки.
        result = replaceHtmlCommentSlot(result, 'figma:head-start', '')
        result = replaceHtmlCommentSlot(result, 'figma:head-end', '')
        result = replaceHtmlCommentSlot(result, 'figma:body-start', '')
        result = replaceHtmlCommentSlot(result, 'figma:body-end', '')

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }

        return { html: result, tags }
      },
    },
  }
}
