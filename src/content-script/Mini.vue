<template>
  <div>
    <el-row class="review-bookmark-mt">
      <el-col :span="24">
        <div class="review-bookmark-content">
          <div class="review-bookmark-url">
            <el-link :underline="false" type="info" :href="bookmark.url" target="_blank" icon="el-icon-connection">{{ bookmark.url }}</el-link>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row class="review-bookmark-mt">
      <el-col :span="24">
        <el-button type="warning" @click="close" icon="el-icon-close" circle size="small"></el-button>
        <el-button type="info" @click="block" icon="el-icon-close-notification" circle size="small"></el-button>
        <el-button type="primary" @click="edit" icon="el-icon-edit" circle size="small"></el-button>
        <el-button type="danger" @click="remove" icon="el-icon-delete" circle size="small"></el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  props: ['bookmark', 'closeCb', 'port'],
  data() {
    return {};
  },
  methods: {
    remove() {
      console.log('remove:', this.bookmark);
      const confirmInfoMsg = chrome.i18n.getMessage('confirm_remove_info');
      const confirmTitleMsg = chrome.i18n.getMessage('notification');
      const confirmBtnMsg = chrome.i18n.getMessage('confirm_btn');
      const cancelBtnMsg = chrome.i18n.getMessage('cancel_btn');
      this.$confirm(confirmInfoMsg, confirmTitleMsg, {
        confirmButtonText: confirmBtnMsg,
        cancelButtonText: cancelBtnMsg,
        type: 'warning',
      })
        .then(() => {
          this.port.postMessage({ ctype: 'remove_bookmark', cdata: this.bookmark });
        })
        .catch(() => {
          // cancel
        });
    },
    block() {
      const confirmInfoMsg = chrome.i18n.getMessage('confirm_block_info');
      const confirmTitleMsg = chrome.i18n.getMessage('notification');
      const confirmBtnMsg = chrome.i18n.getMessage('confirm_btn');
      const cancelBtnMsg = chrome.i18n.getMessage('cancel_btn');
      this.$confirm(confirmInfoMsg, confirmTitleMsg, {
        confirmButtonText: confirmBtnMsg,
        cancelButtonText: cancelBtnMsg,
        type: 'warning',
      })
        .then(() => {
          this.port.postMessage({ ctype: 'block', cdata: this.bookmark });
        })
        .catch(() => {
          // cancel
        });
    },
    edit() {
      console.log('click edit:', this.bookmark);
      const url = `chrome://bookmarks/?id=${this.bookmark.parentId}`;
      window.open(url);
    },
    close() {
      this.closeCb();
    },
  },
  created() {},
};
</script>

<style lang="scss">
.review-bookmark-url {
  line-height: 14px;
  word-break: break-all;
}
.review-bookmark-mt {
  margin-top: 14px;
}
</style>
