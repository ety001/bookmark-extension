<template>
  <div></div>
</template>

<script>
import MiniComponent from './Mini';

export default {
  data() {
    return {
      notifyObj: null,
    };
  },
  methods: {
    show(bookmark) {
      const el = this.$createElement(MiniComponent, {
        props: {
          bookmark,
          successCb: () => {
            this.notifyObj.close();
            this.notifyObj = null;
          },
        },
      });
      this.notifyObj = this.$notify({
        title: bookmark.title,
        message: el,
        duration: 0,
      });
    },
  },
  created() {
    this.show({ id: 12, title: '鲁大学生网鲁大学生网', url: 'https://www.ldustu.com/' });
  },
};
</script>

<style lang="scss" scoped></style>
