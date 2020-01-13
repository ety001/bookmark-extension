<template>
  <div></div>
</template>

<script>
import MiniComponent from './Mini';

export default {
  data() {
    return {
      notifyObj: null,
      port: null,
    };
  },
  methods: {
    show(bookmark, position = 'top-right') {
      const el = this.$createElement(MiniComponent, {
        props: {
          bookmark,
          closeCb: () => {
            this.notifyObj.close();
            this.notifyObj = null;
          },
          port: this.port,
        },
      });
      this.notifyObj = this.$notify({
        title: bookmark.title,
        message: el,
        duration: 0,
        showClose: false,
        position,
      });
    },
  },
  created() {
    const successMsg = chrome.i18n.getMessage('success');
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'getbookmark_from_mini':
          if (msg.cdata === null) return;
          this.show(msg.cdata.bookmark, msg.cdata.config.currentNotifyLocation);
          break;
        case 'remove_bookmark':
          this.notifyObj.close();
          this.notifyObj = null;
          this.$message({
            type: 'success',
            message: successMsg,
          });
          break;
        case 'block':
          this.notifyObj.close();
          this.notifyObj = null;
          this.$message({
            type: 'success',
            message: successMsg,
          });
          break;
      }
    });
    // 获取书签
    this.port.postMessage({ ctype: 'getbookmark_from_mini', cdata: false });
  },
};
</script>

<style lang="scss" scoped></style>
