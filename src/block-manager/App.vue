<template>
  <el-container>
    <el-header ref="top" class="header">
      <el-row>
        <el-col :span="8">
          <div class="header_title">{{ 'appname' | lang }}</div>
        </el-col>
        <el-col :offset="10" :span="6" class="support">
          <el-link type="info" href="https://akawa.ink/donate" icon="el-icon-thumb" target="_blank">{{ 'donate' | lang }}</el-link>
          <el-link type="info" href="https://github.com/ety001/bookmark-extension" icon="el-icon-position" target="_blank">{{ 'source_code' | lang }}</el-link>
          <el-link type="info" href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324#comments" icon="el-icon-bangzhu" target="_blank">{{
            'support' | lang
          }}</el-link>
        </el-col>
      </el-row>
    </el-header>
    <el-container v-loading="loading">
      <el-main :style="{ height: height + 'px' }">
        <el-row>
          <el-col v-if="blockList.length !== 0" :span="20" :offset="2" style="margin-bottom: 10px; text-align: right;">
            <el-button type="danger" round size="mini" @click="clearBlockList">{{ 'clear_block_list' | lang }}</el-button>
          </el-col>
          <el-col :span="20" :offset="2">
            <el-table
              :show-header="false"
              :empty-text="'no_block_list' | lang"
              ref="table1"
              :data="blockList.filter(data => !search || data.title.includes(search))"
              style="width: 100%"
            >
              <el-table-column property="title">
                <template slot-scope="scope">
                  <el-row>
                    <el-col :span="24" style="cursor: pointer;">
                      <div @click="visit(scope.row.url)" class="bm_title">
                        <i class="el-icon-collection-tag"></i>
                        {{ scope.row.title }}
                      </div>
                      <div @click="visit(scope.row.url)" class="bm_url">{{ scope.row.url }}</div>
                    </el-col>
                  </el-row>
                </template>
              </el-table-column>
              <el-table-column width="160">
                <template slot-scope="scope">
                  <el-button type="danger" @click="remove(scope.row)" icon="el-icon-delete" circle plain size="mini"></el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
export default {
  data() {
    return {
      port: null,
      blockList: [],
      height: 0,
      search: null,
      loading: false,
    };
  },
  methods: {
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
    getBlockList() {
      this.port.postMessage({ ctype: 'get_block_list', cdata: null });
    },
    remove(bookmark) {
      this.port.postMessage({ ctype: 'remove_block_bookmark', cdata: bookmark });
    },
    visit(url) {
      window.open(url);
    },
    clearBlockList() {
      this.port.postMessage({ ctype: 'clear_block_list', cdata: null });
    },
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  watch: {},
  created() {
    const successMsg = chrome.i18n.getMessage('success');
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'get_block_list':
          this.blockList = msg.cdata;
          break;
        case 'remove_block_bookmark':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBlockList();
          break;
        case 'clear_block_list':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBlockList();
          break;
      }
    });
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
    // 获取block列表
    this.getBlockList();
  },
  updated() {
    // 设置高度
    const totalHeight = document.body.offsetHeight;
    const topHeight = this.$refs.top.$vnode.elm.offsetHeight;
    this.height = totalHeight - topHeight;
  },
};
</script>

<style lang="scss" scoped>
.header {
  background-color: #53a8ff;
  color: #fff;
  padding-top: 8px;
}
.header_title {
  font-size: 22px;
  font-weight: 800;
  padding-top: 8px;
  padding-left: 40px;
}
.support {
  text-align: right;
  padding-top: 10px;
}
.support a,
.support a:hover {
  color: #fff;
  text-decoration: none;
}
</style>
