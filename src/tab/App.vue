<template>
  <div>
    <div v-if="bookmark">
      <el-row ref="top" class="top">
        <el-col :span="4" class="capital">
          <span>{{ 'appname' | lang }}</span>
        </el-col>
        <el-col :span="16">
          <el-row>
            <el-col :span="24">
              <div class="title">{{ bookmark.title }}</div>
              <el-link class="url" type="info" :href="bookmark.url" target="_blank" icon="el-icon-connection">{{ bookmark.url }}</el-link>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <el-button type="success" @click="nextBM" icon="el-icon-right" circle plain size="small"></el-button>
              <el-button type="info" @click="block" icon="el-icon-close-notification" circle plain size="small"></el-button>
              <el-button type="primary" @click="edit" icon="el-icon-edit" circle plain size="small"></el-button>
              <el-button type="danger" @click="remove" icon="el-icon-delete" circle plain size="small"></el-button>
            </el-col>
          </el-row>
        </el-col>
        <el-col :span="4" style="padding-right: 40px; text-align: right;">
          <a href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324?utm_source=vote" target="_blank"
            ><img src="https://creatorsdaily.com/api/9999e88d-0b00-46dc-8ff1-e1d311695324/vote.svg?theme=dark"/></a
          ><br /><br />
          <el-link type="info" href="https://akawa.ink/donate" icon="el-icon-thumb" target="_blank">{{ 'donate' | lang }}</el-link>
          <el-link type="info" href="https://github.com/ety001/bookmark-extension" icon="el-icon-position" target="_blank">{{ 'source_code' | lang }}</el-link>
          <el-link type="info" href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324#comments" icon="el-icon-bangzhu" target="_blank">{{
            'support' | lang
          }}</el-link>
        </el-col>
      </el-row>
      <el-row ref="box" class="box" @click="visit" v-loading="loading">
        <el-col :span="24">
          <iframe ref="iframe1" :src="baseUrl + src" sandbox="" :style="{ height: iframeHeight + 'px' }"></iframe>
        </el-col>
      </el-row>
    </div>
    <div v-else>
      <el-row style="margin: 20px;">
        <el-col :span="8">
          <el-alert :closable="false" :title="'no_bookmark' | lang" type="error"></el-alert>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      port: null,
      bookmark: null,
      config: null,
      src: null,
      baseUrl: '',
      iframeHeight: 0,
      loading: false,
    };
  },
  methods: {
    nextBM() {
      this.getBookmark();
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
    visit() {
      window.open(this.src);
    },
    edit() {},
    remove() {
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
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
    getBookmark() {
      // 获取书签
      this.loading = true;
      this.port.postMessage({ ctype: 'getbookmark_from_full', cdata: false });
    },
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  created() {
    const successMsg = chrome.i18n.getMessage('success');
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'getbookmark_from_full':
          if (msg.cdata === null) return;
          this.bookmark = msg.cdata;
          this.src = this.bookmark.url;
          break;
        case 'remove_bookmark':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmark();
          break;
        case 'block':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmark();
          break;
      }
    });
    // 获取书签
    this.getBookmark();
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
  },
  updated() {
    // 设置iframe高度
    const totalHeight = document.body.offsetHeight;
    const topHeight = this.$refs.top.$vnode.elm.offsetHeight;
    this.iframeHeight = totalHeight - topHeight;
    // 设置iframe加载事件
    if (this.$refs.iframe1.onload === null) {
      this.$refs.iframe1.onload = () => {
        this.loading = false;
      };
    }
  },
};
</script>

<style lang="scss" scoped>
.top {
  background-color: #eee;
  color: #444;
  padding: 20px 0;
  border-bottom: 2px solid #ccc;
}
.top .capital {
  font-size: 24px;
  font-weight: 800;
  line-height: 20px;
  padding: 30px 0;
  text-align: center;
}
.top .title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}
.top .url {
  margin-bottom: 8px;
}
.box {
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
}
iframe {
  border: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
</style>
