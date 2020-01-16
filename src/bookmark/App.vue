<template>
  <el-container>
    <el-header ref="top" class="header">
      <el-row>
        <el-col :span="8">
          <div class="header_title">{{ 'appname' | lang }}</div>
        </el-col>
        <el-col :span="8" :offset="8">
          <!--<el-input placeholder="请输入内容" v-model="searchKey" class="input-with-select">
            <el-button slot="append" icon="el-icon-search"></el-button>
          </el-input>-->
        </el-col>
      </el-row>
    </el-header>
    <el-container v-loading="loading">
      <el-aside width="300px" ref="menu" :style="{ height: height + 'px' }">
        <el-tree
          :empty-text="'no_bookmark' | lang"
          ref="menuTree"
          :data="menu"
          node-key="id"
          :default-expand-all="true"
          :expand-on-click-node="false"
          :highlight-current="true"
          :indent="8"
          @node-click="nodeClick"
          :draggable="false"
          :accordion="false"
        >
        </el-tree>
      </el-aside>
      <el-main :style="{ height: height + 'px' }">
        <el-row>
          <el-col :span="20" :offset="2">
            <el-table v-if="bookmarks" :show-header="false" :empty-text="'no_bookmark' | lang" ref="table1" :data="bookmarks" style="width: 100%">
              <el-table-column property="title">
                <template slot-scope="scope">
                  <el-row v-if="scope.row.url === null">
                    <el-col :span="24">
                      <div class="bm_title" @click="visit(scope.row)">
                        <i class="el-icon-collection-tag"></i>
                        {{ scope.row.title }}
                      </div>
                    </el-col>
                  </el-row>
                  <el-row v-else>
                    <el-col :span="24">
                      <div class="bm_title" @click="visit(scope.row)">
                        <i class="el-icon-collection-tag"></i>
                        {{ scope.row.title }}
                      </div>
                      <div class="bm_url" @click="visit(scope.row)">{{ scope.row.url }}</div>
                    </el-col>
                  </el-row>
                </template>
              </el-table-column>
              <el-table-column width="160">
                <template slot-scope="scope">
                  <el-button type="primary" @click="edit(scope.row)" icon="el-icon-edit" circle plain size="mini"></el-button>
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
      menu: [],
      defaultProps: {
        children: 'children',
        label: 'label',
      },
      loading: false,
      height: 0,
      pid: '0',
      bid: '0',
      bookmarks: null,
      searchKey: null,
    };
  },
  methods: {
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
    nodeClick(node) {
      this.visit(node);
    },
    getBookmarkMenu() {
      this.port.postMessage({ ctype: 'getbookmark_menu', cdata: false });
    },
    getBookmarkChildren(id) {
      if (id === null) id = 0;
      this.port.postMessage({ ctype: 'getbookmark_children', cdata: id });
    },
    visit(data) {
      if (data.url) {
        window.open(data.url);
      } else {
        this.$router.push({ name: 'index', query: { pid: data.id } }).catch(e => console.log('router error:', e));
      }
    },
    edit(data) {},
    remove(data) {
      console.log('remove:', data);
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
          this.port.postMessage({ ctype: 'remove_bookmark', cdata: data });
        })
        .catch(() => {
          // cancel
        });
    },
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  watch: {
    $route(to, from) {
      const query = to.query;
      this.pid = query.pid === undefined ? '0' : query.pid;
      this.bid = query.bid === undefined ? '0' : query.bid;
      this.$refs.menuTree.setCurrentKey(this.pid);
      this.getBookmarkChildren(this.pid);
    },
  },
  created() {
    const successMsg = chrome.i18n.getMessage('success');
    const query = this.$route.query;
    this.pid = query.pid === undefined ? '0' : query.pid;
    this.bid = query.bid === undefined ? '0' : query.bid;
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'getbookmark_menu':
          this.loading = false;
          this.menu = msg.cdata;
          this.$refs.menuTree.setCurrentKey(this.pid);
          this.getBookmarkChildren(this.pid);
          break;
        case 'getbookmark_children':
          const tmp = [];
          for (let i in msg.cdata) {
            tmp.push({
              id: msg.cdata[i].id,
              title: msg.cdata[i].title,
              url: msg.cdata[i].url === undefined ? null : msg.cdata[i].url,
            });
          }
          this.bookmarks = tmp;
          break;
        case 'remove_bookmark':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmarkChildren(this.pid);
          break;
      }
    });
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
    // 获取书签目录
    this.loading = true;
    this.getBookmarkMenu();
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
aside {
  overflow: scroll;
  height: 100%;
  padding-top: 8px;
}
.header {
  background-color: #53a8ff;
  color: #fff;
  padding-top: 10px;
}
.header_title {
  font-size: 22px;
  font-weight: 800;
  padding-top: 8px;
  padding-left: 40px;
}
.bm_title {
  font-size: 14px;
  font-weight: 600;
}
.bm_url {
  font-size: 12px;
  font-weight: 200;
}
</style>
