/**
 * dsh-theme-studio —— 客户端半部。
 *
 * 侧栏一个图标 → 主面板一屏配色卡 → 点一下给整个工作台换色。
 * 换色走 ctx.theme.overrideTokens(源码名, {token: {light, dark}}) 叠一层 alias
 * token，不动内置 light/dark 偏好，也不碰别人的主题注册。
 */

window.__ModuleLoader__.load({
  id: 'dsh-theme-studio',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement
    const { useState, useEffect } = React

    const PLUGIN_ID = 'dsh-theme-studio'
    const SLOT_ID = 'theme-studio'
    const STORAGE_KEY = 'dsh-theme-studio:preset'
    const PREV_KEY = 'dsh-theme-studio:prev-preference'
    const CUSTOM_KEY = 'dsh-theme-studio:custom'
    const CUSTOM_ID = 'custom'

    /* ------------------------------------------------------------------ *
     * 颜色小工具
     * ------------------------------------------------------------------ */

    function rgbOf(hex) {
      const raw = String(hex).replace('#', '')
      const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
      return [
        parseInt(full.slice(0, 2), 16) || 0,
        parseInt(full.slice(2, 4), 16) || 0,
        parseInt(full.slice(4, 6), 16) || 0,
      ]
    }

    function hexOf(rgb) {
      return (
        '#' +
        rgb
          .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
          .join('')
      )
    }

    /** a 与 b 之间按百分比混合，t=0 取 a。 */
    function mix(a, b, pct) {
      const A = rgbOf(a)
      const B = rgbOf(b)
      const t = Math.max(0, Math.min(100, pct)) / 100
      return hexOf([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])
    }

    function rgba(hex, alpha) {
      const c = rgbOf(hex)
      return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
    }

    /** 相对亮度，用来判断深底浅底和文字够不够清楚。 */
    function luminance(hex) {
      const channels = rgbOf(hex).map((value) => {
        const s = value / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }

    function contrast(a, b) {
      const la = luminance(a)
      const lb = luminance(b)
      const hi = Math.max(la, lb)
      const lo = Math.min(la, lb)
      return (hi + 0.05) / (lo + 0.05)
    }

    /** 对比度不够就把颜色往黑或白那头挪，一步 12%，最多十四步。 */
    function readable(color, background, target) {
      let out = color
      const towards = luminance(background) > 0.32 ? '#000000' : '#FFFFFF'
      for (let i = 0; i < 14 && contrast(out, background) < target; i++) {
        out = mix(out, towards, 12)
      }
      return out
    }

    /* ------------------------------------------------------------------ *
     * 配色方案
     * ------------------------------------------------------------------ */

    const PRESETS = [
      {
        id: 'beige',
        name: '米黄护眼',
        desc: '暖米色纸面，看久了不刺眼',
        scheme: 'light',
        base: '#F6F0E1',
        layer1: '#FBF7EC',
        layer2: '#FFFDF6',
        sidebar: '#EFE6D2',
        ink: '#3B3428',
        sub: '#6C6152',
        line: '#E3D7BF',
        accent: '#A9743A',
      },
      {
        id: 'paper',
        name: '纸白',
        desc: '接近默认的米白，更柔和',
        scheme: 'light',
        base: '#F7F6F3',
        layer1: '#FCFBF9',
        layer2: '#FFFFFF',
        sidebar: '#F1F0EB',
        ink: '#2B2A26',
        sub: '#6A6963',
        line: '#E2E1DB',
        accent: '#4A7C9B',
      },
      {
        id: 'mint',
        name: '薄荷',
        desc: '清透的绿，让视线松下来',
        scheme: 'light',
        base: '#EDF5EF',
        layer1: '#F6FBF7',
        layer2: '#FFFFFF',
        sidebar: '#E1EEE5',
        ink: '#223027',
        sub: '#5C7064',
        line: '#D0E3D6',
        accent: '#2F8B64',
      },
      {
        id: 'sakura',
        name: '樱粉',
        desc: '淡淡的粉，温柔不腻',
        scheme: 'light',
        base: '#FBF0F3',
        layer1: '#FEF7F9',
        layer2: '#FFFFFF',
        sidebar: '#F6E2E8',
        ink: '#3A2830',
        sub: '#7A5F68',
        line: '#EFD7DE',
        accent: '#C06280',
      },
      {
        id: 'ocean',
        name: '雾蓝',
        desc: '冷一点的蓝灰，像阴天的海',
        scheme: 'light',
        base: '#ECF1F8',
        layer1: '#F5F8FC',
        layer2: '#FFFFFF',
        sidebar: '#E0E8F3',
        ink: '#22303D',
        sub: '#5A6B7C',
        line: '#D2DDEB',
        accent: '#3A6D9E',
      },
      {
        id: 'coffee',
        name: '咖啡',
        desc: '深一点的暖棕，夜里也好用',
        scheme: 'light',
        base: '#F2E8DD',
        layer1: '#F8F1E8',
        layer2: '#FFFCF6',
        sidebar: '#E8DAC8',
        ink: '#352A20',
        sub: '#6A5745',
        line: '#DDCDB8',
        accent: '#87582F',
      },
      {
        id: 'forest',
        name: '森野',
        desc: '苔绿配土色，安静',
        scheme: 'light',
        base: '#EEF2EA',
        layer1: '#F6F8F2',
        layer2: '#FFFFFF',
        sidebar: '#E3E9DC',
        ink: '#2A3227',
        sub: '#5E6A57',
        line: '#D8E0CF',
        accent: '#4E7A46',
      },
      {
        id: 'ink',
        name: '深空墨',
        desc: '深夜用的蓝调墨色',
        scheme: 'dark',
        base: '#15171C',
        layer1: '#1C1F26',
        layer2: '#24282F',
        sidebar: '#101216',
        ink: '#E9ECF1',
        sub: '#9BA3AE',
        line: '#2F353E',
        accent: '#6AA6FF',
      },
    ]

    /* ------------------------------------------------------------------ *
     * 自定义配色：用户只挑四个颜色，其余按深浅自己推
     * ------------------------------------------------------------------ */

    const SWATCHES = [
      { key: 'base', label: '纸色' },
      { key: 'sidebar', label: '侧栏' },
      { key: 'ink', label: '文字' },
      { key: 'accent', label: '强调' },
    ]

    function isHex(value) {
      return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    }

    function readCustom() {
      try {
        const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || 'null')
        if (!raw) return null
        const out = {}
        for (const item of SWATCHES) {
          if (!isHex(raw[item.key])) return null
          out[item.key] = raw[item.key]
        }
        return out
      } catch {
        return null
      }
    }

    let customColors = readCustom()

    function writeCustom(next) {
      customColors = next
      try {
        if (next) localStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
        else localStorage.removeItem(CUSTOM_KEY)
      } catch {
        /* 隐私模式之类 */
      }
    }

    /** 还没自定义过时，从当前这套配色起步，点一下就复制过来，不用从零挑。 */
    function seedCustom() {
      const current =
        runtime.active && runtime.active !== CUSTOM_ID
          ? PRESETS.find((preset) => preset.id === runtime.active)
          : null
      const from = current || PRESETS[0]
      return {
        base: from.base,
        sidebar: from.sidebar,
        ink: from.ink,
        accent: from.accent,
      }
    }

    function derivePreset(colors) {
      const base = colors.base
      const dark = luminance(base) < 0.34
      const layer1 = dark ? mix(base, '#FFFFFF', 5) : mix(base, '#FFFFFF', 62)
      const layer2 = dark ? mix(base, '#FFFFFF', 10) : mix(base, '#FFFFFF', 82)
      const sidebar = colors.sidebar

      let ink = colors.ink
      for (const surface of [base, layer1, sidebar]) ink = readable(ink, surface, 6.4)
      const sub = readable(mix(ink, base, 40), base, 4.2)
      const accent = readable(colors.accent, base, 3.1)

      return {
        id: CUSTOM_ID,
        name: '自定义',
        desc: '',
        scheme: dark ? 'dark' : 'light',
        base,
        layer1,
        layer2,
        sidebar,
        ink,
        sub,
        line: mix(base, ink, dark ? 24 : 18),
        accent,
      }
    }

    function customPreset() {
      return derivePreset(customColors || seedCustom())
    }

    function resolvePreset(id) {
      if (id === CUSTOM_ID) return customPreset()
      return PRESETS.find((preset) => preset.id === id) || null
    }

    /** 一套配色 → overrideTokens 需要的 { token: {light, dark} }。 */
    function tokensFor(p) {
      const dark = p.scheme === 'dark'
      const out = {}
      const set = (name, value) => {
        if (value) out[name] = { light: value, dark: value }
      }

      set('--dsw-alias-bg-base', p.base)
      set('--dsw-alias-bg-layer-1', p.layer1)
      set('--dsw-alias-bg-layer-2', p.layer2)
      set('--dsw-alias-bg-layer-3', mix(p.layer2, p.ink, dark ? 8 : 2))
      set('--dsw-alias-bg-overlay', p.layer2)
      set('--dsw-alias-bg-module-platform', mix(p.layer1, p.layer2, 60))
      set('--dsw-alias-bg-mask-1', rgba(p.ink, 0.08))
      set('--dsw-specific-sidebar-fill', p.sidebar)
      set('--dsw-specific-bubble', mix(p.layer1, p.accent, dark ? 16 : 9))

      set('--dsw-alias-border-l1', mix(p.base, p.line, 45))
      set('--dsw-alias-border-l2', p.line)
      set('--dsw-alias-border-l3', mix(p.line, p.ink, 14))
      set('--dsw-alias-border-l4', mix(p.line, p.ink, 26))

      set('--dsw-alias-label-primary', p.ink)
      set('--dsw-alias-label-secondary', p.sub)
      set('--dsw-alias-label-tertiary', mix(p.sub, p.base, 34))
      set('--dsw-alias-label-dimmed', mix(p.sub, p.base, 56))
      set('--dsw-alias-label-primary-foreground', dark ? '#0E1014' : '#FFFFFF')

      set('--dsw-alias-brand-primary', p.accent)
      set('--dsw-alias-state-business-primary', p.accent)
      set('--dsw-alias-link', p.accent)
      set('--dsw-alias-button-primary-fill', p.accent)

      set('--dsw-alias-interactive-bg-hover', rgba(p.ink, dark ? 0.07 : 0.05))
      set('--dsw-alias-interactive-bg-active', rgba(p.ink, dark ? 0.11 : 0.09))

      set('--dsw-alias-state-error-primary', dark ? '#F2806F' : '#C8513F')
      set('--dsw-alias-state-success-primary', dark ? '#63C08B' : '#3E8D60')
      set('--dsw-alias-state-warn-primary', dark ? '#E2B25E' : '#BE8629')
      set('--dsw-alias-state-idle-primary', mix(p.sub, p.base, 40))

      set('--dsw-alias-tooltip-bg', mix(p.layer2, p.ink, dark ? 6 : 0))
      set('--dsw-alias-markdown-code-block', mix(p.layer1, p.ink, dark ? 6 : 4))
      set('--dsw-alias-scrollbar-bg-l1', rgba(p.ink, dark ? 0.22 : 0.16))
      set('--dsw-alias-scrollbar-hover-l1', rgba(p.ink, dark ? 0.34 : 0.26))
      set('--dsw-focus-ring-color', p.accent)
      set('--dsw-shadow-lv1', dark ? '0 2px 4px 0 rgba(0,0,0,.35)' : '0 2px 4px 0 rgba(0,0,0,.06)')
      return out
    }

    /* ------------------------------------------------------------------ *
     * 运行时状态：当前选中的方案 + 主题图层
     * ------------------------------------------------------------------ */

    const runtime = { ctx: null, dispose: null, active: null }
    const listeners = new Set()

    function notify() {
      for (const fn of [...listeners]) {
        try {
          fn()
        } catch (error) {
          console.warn('[dsh-theme-studio] listener failed', error)
        }
      }
    }

    function themeService(ctx) {
      try {
        const service = ctx && typeof ctx.get === 'function' ? ctx.get('theme') : null
        return service && typeof service.overrideTokens === 'function' ? service : null
      } catch {
        return null
      }
    }

    function activate(id, ctx) {
      if (ctx) runtime.ctx = ctx
      const theme = themeService(runtime.ctx)
      if (!theme) return
      if (runtime.dispose) {
        try {
          runtime.dispose()
        } catch {
          /* 图层已经不在，忽略 */
        }
        runtime.dispose = null
      }

      if (!id) {
        runtime.active = null
        try {
          const prev = localStorage.getItem(PREV_KEY)
          if (prev) theme.setTheme(prev)
          localStorage.removeItem(PREV_KEY)
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* 隐私模式之类 */
        }
        notify()
        return
      }

      const preset = resolvePreset(id)
      if (!preset) return

      const scheme = preset.scheme === 'dark' ? 'dark' : 'light'
      try {
        if (!localStorage.getItem(PREV_KEY)) {
          localStorage.setItem(PREV_KEY, theme.getTheme().preference)
        }
      } catch {
        /* 隐私模式之类 */
      }
      try {
        // 未覆盖的 token 沿用内置浅色/深色盘，否则深色盘里的按钮底会留在浅色主题上
        if (theme.getTheme().preference !== scheme) theme.setTheme(scheme)
      } catch {
        /* 设置写不进去也不影响换色 */
      }
      runtime.dispose = theme.overrideTokens(PLUGIN_ID, tokensFor(preset))
      runtime.active = id
      try {
        localStorage.setItem(STORAGE_KEY, id)
      } catch {
        /* 隐私模式之类 */
      }
      notify()
    }

    function activateCustom(ctx) {
      if (!customColors) writeCustom(seedCustom())
      activate(CUSTOM_ID, ctx)
    }

    /** 自定义配色改一个色块时只重铺图层，不动已记住的偏好。 */
    function refreshLayer() {
      const theme = themeService(runtime.ctx)
      if (!theme) return
      const preset = customPreset()
      const scheme = preset.scheme === 'dark' ? 'dark' : 'light'
      try {
        if (theme.getTheme().preference !== scheme) theme.setTheme(scheme)
      } catch {
        /* 设置写不进去也不影响换色 */
      }
      if (runtime.dispose) {
        try {
          runtime.dispose()
        } catch {
          /* 图层已经不在，忽略 */
        }
      }
      runtime.dispose = theme.overrideTokens(PLUGIN_ID, tokensFor(preset))
    }

    function setCustomColor(key, value) {
      if (!isHex(value)) return
      const next = Object.assign({}, customColors || seedCustom())
      next[key] = value
      writeCustom(next)
      if (runtime.active === CUSTOM_ID) refreshLayer()
      notify()
    }

    function useActive() {
      const [, force] = useState(0)
      useEffect(() => {
        const fn = () => force((v) => v + 1)
        listeners.add(fn)
        return () => {
          listeners.delete(fn)
        }
      }, [])
      return runtime.active
    }

    /* ------------------------------------------------------------------ *
     * 组件
     * ------------------------------------------------------------------ */

    function SidebarIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M12 3.4a8.6 8.6 0 1 0 0 17.2c1.4 0 2.1-.8 2.1-1.9 0-1.5 1-2.3 2.4-2.3h1a3.1 3.1 0 0 0 3.1-3.1A8.6 8.6 0 0 0 12 3.4Z',
        }),
        h('circle', { cx: 8.5, cy: 9.7, r: 1.05, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 12, cy: 7.5, r: 1.05, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 15.5, cy: 9.7, r: 1.05, fill: 'currentColor', stroke: 'none' }),
      )
    }

    function PresetCard(props) {
      const p = props.preset
      const active = props.active
      return h(
        'button',
        {
          type: 'button',
          className: 'ts-card' + (active ? ' is-active' : ''),
          'aria-pressed': active,
          onClick: () => activate(p.id, runtime.ctx),
          style: {
            '--c-base': p.base,
            '--c-side': p.sidebar,
            '--c-ink': p.ink,
            '--c-line': p.line,
            '--c-accent': p.accent,
          },
        },
        h(
          'span',
          { className: 'ts-preview' },
          h('span', { className: 'ts-preview-side' }),
          h(
            'span',
            { className: 'ts-preview-main' },
            h('span', { className: 'ts-line ts-w70' }),
            h('span', { className: 'ts-line ts-w45' }),
            h('span', { className: 'ts-dot' }),
          ),
        ),
        h(
          'span',
          { className: 'ts-card-text' },
          h('span', { className: 'ts-name' }, p.name),
          h('span', { className: 'ts-desc' }, p.desc),
        ),
        active ? h('span', { className: 'ts-tick' }, '\u2713') : null,
      )
    }

    function CustomCell(props) {
      const active = props.active
      const preset = customPreset()
      const empty = !customColors
      const colors = customColors || seedCustom()
      return h(
        'div',
        { className: 'ts-cell' + (active ? ' is-active' : '') },
        h(
          'button',
          {
            type: 'button',
            className: 'ts-card ts-card-custom' + (active ? ' is-active' : ''),
            'aria-pressed': active,
            onClick: () => activateCustom(runtime.ctx),
            style: {
              '--c-base': preset.base,
              '--c-side': preset.sidebar,
              '--c-ink': preset.ink,
              '--c-line': preset.line,
              '--c-accent': preset.accent,
            },
          },
          h(
            'span',
            { className: 'ts-preview' },
            h('span', { className: 'ts-preview-side' }),
            h(
              'span',
              { className: 'ts-preview-main' },
              h('span', { className: 'ts-line ts-w70' }),
              h('span', { className: 'ts-line ts-w45' }),
              h('span', { className: 'ts-dot' }),
            ),
          ),
          h(
            'span',
            { className: 'ts-card-text' },
            h('span', { className: 'ts-name' }, '自定义'),
            h(
              'span',
              { className: 'ts-desc' },
              empty ? '四个颜色，其余自动配' : '点色块继续微调',
            ),
          ),
          active ? h('span', { className: 'ts-tick' }, '\u2713') : null,
        ),
        h(
          'div',
          { className: 'ts-swatches' + (empty ? ' is-empty' : '') },
          SWATCHES.map((item) =>
            h('input', {
              key: item.key,
              type: 'color',
              className: 'ts-swatch',
              title: item.label,
              'aria-label': item.label,
              value: empty ? '#FFFFFF' : colors[item.key],
              onChange: (event) => setCustomColor(item.key, event.target.value),
              onInput: (event) => setCustomColor(item.key, event.target.value),
              onClick: (event) => event.stopPropagation(),
            }),
          ),
        ),
      )
    }

    function Panel() {
      const active = useActive()
      return h(
        'div',
        { className: 'ts-root' },
        h(
          'div',
          { className: 'ts-inner' },
          h(
            'header',
            { className: 'ts-head' },
            h('h1', { className: 'ts-title' }, '主题'),
            h('p', { className: 'ts-sub' }, '挑一个配色，整个工作台立刻换色，选择会记住。'),
          ),
          h(
            'div',
            { className: 'ts-grid' },
            PRESETS.map((preset) => h(PresetCard, { key: preset.id, preset, active: active === preset.id })),
            h(CustomCell, { key: CUSTOM_ID, active: active === CUSTOM_ID }),
          ),
          h(
            'div',
            { className: 'ts-foot' },
            h(
              'button',
              {
                type: 'button',
                className: 'ts-reset' + (active === null ? ' is-on' : ''),
                onClick: () => activate(null, runtime.ctx),
              },
              active === null ? '正在使用默认外观' : '恢复默认外观',
            ),
            h('span', { className: 'ts-hint' }, '默认外观会跟随设置里的浅色 / 深色 / 系统'),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * 样式
     * ------------------------------------------------------------------ */

    const CSS = `
.ts-root{height:100%;overflow:auto;box-sizing:border-box;padding:40px 36px 72px}
.ts-inner{max-width:880px;margin:0 auto}
.ts-head{margin-bottom:26px}
.ts-title{margin:0 0 8px;font-size:24px;line-height:32px;font-weight:600;color:var(--dsw-alias-label-primary)}
.ts-sub{margin:0;font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary)}
.ts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(224px,1fr));gap:14px}
.ts-card{position:relative;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;padding:12px;font:inherit;text-align:left;cursor:pointer;border-radius:16px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);transition:transform .18s var(--ds-ease-in-out),border-color .18s var(--ds-ease-in-out),background-color .18s var(--ds-ease-in-out),box-shadow .18s var(--ds-ease-in-out)}
.ts-card:hover{transform:translateY(-1px);box-shadow:var(--dsw-shadow-lv1)}
.ts-card:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:2px}
.ts-card.is-active{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.ts-cell{position:relative;display:flex}
.ts-cell .ts-card{flex:1}
.ts-card-custom .ts-desc{padding-right:78px}
.ts-swatches{position:absolute;right:14px;bottom:14px;z-index:2;display:flex;gap:6px}
.ts-swatch{width:16px;height:16px;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;appearance:none;-webkit-appearance:none;transition:transform .16s var(--ds-ease-in-out),opacity .16s var(--ds-ease-in-out)}
.ts-swatch::-webkit-color-swatch-wrapper{padding:0}
.ts-swatch::-webkit-color-swatch{border:1px solid rgba(0,0,0,.18);border-radius:50%}
.ts-swatch:hover{transform:scale(1.16)}
.ts-swatch:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:2px}
.ts-swatches.is-empty .ts-swatch{opacity:.85}
.ts-swatches.is-empty .ts-swatch::-webkit-color-swatch{background:transparent;border-style:dashed;border-color:var(--dsw-alias-border-l4)}
.ts-preview{display:flex;gap:6px;height:64px;box-sizing:border-box;padding:7px;border-radius:11px;background:var(--c-base);border:1px solid var(--c-line)}
.ts-preview-side{width:20%;border-radius:6px;background:var(--c-side)}
.ts-preview-main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:6px}
.ts-line{height:5px;border-radius:3px;background:var(--c-ink);opacity:.5}
.ts-w70{width:70%}
.ts-w45{width:45%}
.ts-dot{width:16px;height:5px;border-radius:3px;background:var(--c-accent)}
.ts-card-text{display:flex;flex-direction:column;gap:3px;padding:0 2px}
.ts-name{font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
.ts-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.ts-tick{position:absolute;top:10px;right:10px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:11px;line-height:1;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}
.ts-foot{margin-top:26px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ts-reset{font:inherit;font-size:13px;line-height:20px;cursor:pointer;padding:7px 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);transition:background-color .18s var(--ds-ease-in-out),color .18s var(--ds-ease-in-out),border-color .18s var(--ds-ease-in-out)}
.ts-reset:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ts-reset.is-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.ts-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
body{transition:background-color .28s var(--ds-ease-in-out),color .28s var(--ds-ease-in-out)}
`

    /* ------------------------------------------------------------------ *
     * 挂载
     * ------------------------------------------------------------------ */

    function apply(ctx) {
      runtime.ctx = ctx


      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = PLUGIN_ID
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => {
          tag.remove()
        }
      }, 'dsh-theme-studio: styles')

      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: SLOT_ID }, Panel),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: SLOT_ID, order: 30, label: () => '主题' },
          SidebarIcon,
        ),
      )

      // 图层只活在内存里，重启后按上次的选择重新叠一层。
      // theme 服务可能比本插件晚就绪，所以小小地重试几次，别把上次的选择丢了。
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          let tries = 0
          const tick = () => {
            if (runtime.active) return
            const theme = themeService(ctx)
            if (theme) {
              activate(saved, ctx)
              return
            }
            if (++tries < 40) setTimeout(tick, 120)
          }
          tick()
        }
      } catch {
        /* 没有 localStorage 就保持默认外观 */
      }
    }

    exports.name = PLUGIN_ID
    exports.inject = ['slots', 'theme']
    exports.apply = apply
    return module.exports
  },
})
