import { ref } from 'vue';

/**
 * 文章编辑器的「全屏专注模式」开关。
 *
 * 用模块级单例而非组件内 state：布局需要据此隐藏侧边栏与顶栏，
 * 跨越了组件树，放在这里两边直接 import 即可，不必绕 pinia。
 * 编辑页卸载时应重置为 false，避免把状态带到其它后台页面。
 */
export const editorFullscreen = ref(false);
