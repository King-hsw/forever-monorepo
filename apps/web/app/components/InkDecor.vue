<template>
  <!-- 全站水墨装饰层：左侧五爪神龙，右侧竖排毛笔字（陋室铭），纯装饰不参与交互 -->
  <div class="ink-decor" aria-hidden="true">
    <div class="ink-decor__text">
      <span>斯是陋室 惟吾德馨</span>
      <span>山不在高 有仙则名</span>
      <span>水不在深 有龙则灵</span>
    </div>
    <img class="ink-decor__dragon ink-decor__dragon--light" src="~/assets/img/ink-dragon-light.svg" alt="">
    <img class="ink-decor__dragon ink-decor__dragon--dark" src="~/assets/img/ink-dragon-dark.svg" alt="">
  </div>
</template>

<style scoped>
.ink-decor {
  position: fixed;
  inset: 0;
  z-index: -1; /* 压在页面背景之上、正文之下，纯水印 */
  overflow: clip;
  pointer-events: none;
}

/* 右侧竖排毛笔字：writing-mode 竖排，三列自右向左排开，像卷轴题跋 */
.ink-decor__text {
  position: absolute;
  top: 96px;
  right: clamp(12px, 3vw, 48px);
  display: flex;
  flex-direction: row-reverse; /* 竖排古文从右往左读 */
  gap: clamp(14px, 2vw, 30px);
}

.ink-decor__text span {
  writing-mode: vertical-rl;
  font-family: 'Ma Shan Zheng', 'Xingkai SC', 'STXingkai', cursive;
  font-size: clamp(20px, 2.4vw, 30px);
  letter-spacing: 0.28em;
  color: var(--c-text);
  opacity: 0.09;
}

/* 左侧水墨神龙 */
.ink-decor__dragon {
  position: absolute;
  left: max(-40px, -4vw);
  bottom: 4vh;
  width: min(38vw, 460px);
  height: auto;
}

.ink-decor__dragon--dark {
  display: none;
}

html.dark .ink-decor__dragon--light {
  display: none;
}

html.dark .ink-decor__dragon--dark {
  display: block;
}

@media (max-width: 900px) {
  /* 窄屏：龙缩小贴左下，书法只留一列，避免压正文 */
  .ink-decor__dragon {
    bottom: 0;
    width: 52vw;
  }

  .ink-decor__text span:not(:first-child) {
    display: none;
  }
}
</style>
