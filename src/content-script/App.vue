<template>
  <div></div>
</template>

<script>
import MiniComponent from './Mini';

export default {
  data() {
    return {};
  },
  methods: {
    show(bookmark) {
      const el = this.$createElement(MiniComponent, {
        props: {
          bookmark,
        },
      });
      this.$notify({
        title: '标题名称',
        message: el,
        duration: 0,
      });
    },
  },
  created() {
    this.show({ name: 'test name', url: 'test url' });
  },
};
</script>

<style lang="scss" scoped></style>
