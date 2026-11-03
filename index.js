/**
 * dsh-theme —— 纯客户端插件。
 *
 * 这个包的全部逻辑都在 client.js 里（侧栏入口 + 主面板 + 主题图层）。
 * Host 侧只需要一个空壳，让 bundle patch 能在配置树里占一行。
 */

export const name = 'dsh-theme'

export function apply() {
  // 无 Host 行为：主题切换走客户端的 ctx.theme.overrideTokens。
}
