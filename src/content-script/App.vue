<template>
  <div>
    <el-button plain @click="open1">
      可自动关闭
    </el-button>
  </div>
</template>

<script>
export default {
  data() {
    return {};
  },
  methods: {
    open1() {
      console.log(chrome.runtime.getURL('fonts'));
      const h = this.$createElement;
      this.$notify({
        title: '标题名称',
        dangerouslyUseHTMLString: true,
        message: '<i style="color: red;">这是提示文案这是提示</i>',
      });
    },
  },
};
</script>

<style lang="scss" scoped></style>
