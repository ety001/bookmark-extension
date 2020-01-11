<template>
  <div>
    <el-row class="review-bookmark-mt">
      <el-col :span="24">
        <div class="review-bookmark-content">
          <div class="review-bookmark-url">
            <span class="el-icon-connection"></span>
            <el-link type="info" :href="bookmark.url" target="_blank">{{ bookmark.url }}</el-link>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row class="review-bookmark-mt">
      <el-col :span="24">
        <el-button type="danger" @click="remove(bookmark.id)" icon="el-icon-delete" circle size="small"></el-button>
        <el-button type="primary" @click="edit(bookmark.id)" icon="el-icon-edit" circle size="small"></el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  props: ['bookmark', 'successCb'],
  data() {
    return {};
  },
  methods: {
    remove(id) {
      console.log('remove:', id);
      const confirmInfoMsg = chrome.i18n.getMessage('confirm_info');
      const confirmTitleMsg = chrome.i18n.getMessage('notification');
      const confirmBtnMsg = chrome.i18n.getMessage('confirm_btn');
      const cancelBtnMsg = chrome.i18n.getMessage('cancel_btn');
      const successMsg = chrome.i18n.getMessage('success');
      const cancelSuccessMsg = chrome.i18n.getMessage('cancel_success');
      this.$confirm(confirmInfoMsg, confirmTitleMsg, {
        confirmButtonText: confirmBtnMsg,
        cancelButtonText: cancelBtnMsg,
        type: 'warning',
      })
        .then(() => {
          this.successCb();
          this.$message({
            type: 'success',
            message: successMsg,
          });
        })
        .catch(() => {});
    },
    edit(id) {
      console.log('click edit:', id);
    },
  },
  created() {},
};
</script>

<style lang="scss">
.review-bookmark-url {
  line-height: 14px;
}
.review-bookmark-mt {
  margin-top: 14px;
}
</style>
