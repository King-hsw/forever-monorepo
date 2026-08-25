<template>
  <div>
    <!-- 全屏胶片噪点：固定层、不拦截事件，叠在内容上营造纸面颗粒感（仿参考站 bg-noise） -->
    <div class="bg-noise" aria-hidden="true" />
    <NuxtRouteAnnouncer />
    <NuxtPwaAssets />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style scoped>
/* 参考站同款：256px 噪点贴图平铺，2% 透明度，z-1 盖在普通内容之上（弹层 z 更高不受影响） */
.bg-noise {
  position: fixed;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  background-image: url('~/assets/img/noise.png');
  opacity: 0.02;
  pointer-events: none;
}
</style>
