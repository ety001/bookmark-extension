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
      const h = this.$createElement;
      this.$notify({
        title: '标题名称',
        message: h('i', { style: 'color: teal' }, '这是提示文案这是提示'),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
p {
  font-size: 20px;
}
</style>
