<template>
  <el-container>
    <el-header ref="top" class="header">
      <el-row>
        <el-col :span="8">
          <div class="header_title">{{ 'appname' | lang }}</div>
        </el-col>
        <el-col :span="8">
          <!--<el-input placeholder="请输入内容" v-model="searchKey" class="input-with-select">
            <el-button slot="append" icon="el-icon-search"></el-button>
          </el-input>-->
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
          <el-col :span="20" :offset="2" v-if="breadcrumb !== []" style="margin-bottom: 10px;">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">{{ 'all_bookmarks' | lang }}</el-breadcrumb-item>
              <el-breadcrumb-item v-for="(bc, idx) in breadcrumb" :key="idx" :to="{ path: '/', query: { pid: bc.id } }">{{ bc.title }}</el-breadcrumb-item>
            </el-breadcrumb>
          </el-col>
          <el-col :span="20" :offset="2" style="margin-bottom: 10px; text-align: right;">
            <el-button type="primary" round size="mini" @click="openCreateFolder">{{ 'add_folder' | lang }}</el-button>
          </el-col>
          <el-col :span="20" :offset="2" v-if="search !== null">
            <span style="font-weight: 600;">{{ 'filter' | lang }}:</span>
            <el-tag closable type="info" @close="tagClose"> ID: {{ search }} </el-tag>
          </el-col>
          <el-col :span="20" :offset="2">
            <el-table
              v-if="bookmarks"
              :show-header="false"
              :empty-text="'no_bookmark' | lang"
              ref="table1"
              :data="bookmarks.filter(data => !search || data.id.includes(search))"
              style="width: 100%"
            >
              <el-table-column property="title">
                <template slot-scope="scope">
                  <el-row v-if="scope.row.url === null">
                    <el-col :span="24" style="cursor: pointer;">
                      <div class="bm_title" @click="visit(scope.row)">
                        <i class="el-icon-folder"></i>
                        {{ scope.row.title }}
                      </div>
                    </el-col>
                  </el-row>
                  <el-row v-else>
                    <el-col :span="24" style="cursor: pointer;">
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
    <el-dialog :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false" :title="'edit_bookmark' | lang" :visible.sync="dialogFormVisible">
      <el-form ref="form1" :model="bookmarkData" v-loading="saving">
        <el-form-item :label="'title' | lang">
          <el-input v-model="bookmarkData.title"></el-input>
        </el-form-item>
        <el-form-item :label="'url' | lang">
          <el-input v-model="bookmarkData.url"></el-input>
        </el-form-item>
        <el-form-item :label="'save_at' | lang">
          <div class="menu-selector-path" v-if="menuSelector !== null">
            <el-tag>{{ menuSelector.label }}</el-tag>
          </div>
          <div class="menu-selector">
            <el-tree ref="menuTreeSelector" :data="menu" @node-click="formNodeClick" node-key="id"></el-tree>
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="cancelDialog">{{ 'cancel_btn' | lang }}</el-button>
        <el-button type="primary" @click="confirmDialog">{{ 'confirm_btn' | lang }}</el-button>
      </div>
    </el-dialog>
    <el-dialog :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false" :title="'add_folder' | lang" :visible.sync="dialogAddFolderFormVisible">
      <el-form :model="bookmarkFolder">
        <el-form-item label="目录名">
          <el-input v-model="bookmarkFolder.title"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="createFolder">创建</el-button>
      </div>
    </el-dialog>
  </el-container>
</template>

<script>
export default {
  data() {
    return {
      port: null,
      menu: [],
      loading: false,
      height: 0,
      pid: '0',
      bid: '0',
      bookmarks: null,
      searchKey: null,
      search: null,
      breadcrumb: [],
      saving: false,
      dialogFormVisible: false,
      bookmarkData: {
        id: null,
        title: null,
        url: null,
      },
      menuSelector: null,
      dialogAddFolderFormVisible: false,
      bookmarkFolder: {
        parentId: null,
        title: null,
        url: null,
      },
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
    formNodeClick(data, node, current) {
      this.menuSelector = data;
    },
    getBookmarkMenu() {
      this.loading = true;
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
        this.$router.push({ path: '/', query: { pid: data.id } }).catch(e => console.log('router error:', e));
      }
    },
    edit(data) {
      this.port.postMessage({ ctype: 'getbookmark_byid', cdata: { id: data.id, action: 'edit_open' } });
    },
    editOpen(bookmark) {
      this.bookmarkData = bookmark;
      this.dialogFormVisible = true;
      this.menuSelector = {
        id: bookmark.parent.id,
        label: bookmark.parent.title,
      };
    },
    cancelDialog() {
      if (this.saving === true) return;
      this.dialogFormVisible = false;
      this.bookmarkData = {
        id: null,
        title: null,
        url: null,
      };
      this.menuSelector = null;
    },
    confirmDialog() {
      // if (this.menuSelector === null) {
      //   return this.$message({
      //     showClose: true,
      //     message: this.getLang('there_is_no_menu_selector'),
      //     type: 'error'
      //   });
      // }
      // if (this.bookmarkData.url === '' || this.bookmarkData.url === undefined) {
      //   return this.$message({
      //     showClose: true,
      //     message: this.getLang('there_is_no_url'),
      //     type: 'error',
      //   });
      // }

      this.port.postMessage({
        ctype: 'update_bookmark',
        cdata: {
          id: this.bookmarkData.id,
          title: this.bookmarkData.title,
          url: this.bookmarkData.url,
          parentId: this.menuSelector === null ? null : this.menuSelector.id,
          index: 0,
        },
      });
      this.saving = true;
    },
    remove(data) {
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
    tagClose() {
      this.search = null;
    },
    getBreadcrumb(id) {
      this.port.postMessage({ ctype: 'getbookmark_breadcrumb', cdata: id });
    },
    openCreateFolder() {
      this.dialogAddFolderFormVisible = true;
      this.bookmarkFolder.parentId = this.pid;
    },
    createFolder() {
      this.port.postMessage({ ctype: 'create_bookmark_folder', cdata: this.bookmarkFolder });
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
    bid(val) {
      if (val === '0') {
        this.search = null;
      }
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
          if (this.bid !== '0') {
            this.search = this.bid;
          }
          this.getBreadcrumb(this.pid);
          break;
        case 'remove_bookmark':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmarkChildren(this.pid);
          break;
        case 'getbookmark_breadcrumb':
          this.breadcrumb = msg.cdata;
          break;
        case 'update_bookmark':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmarkMenu();
          this.menuSelector = null;
          this.saving = false;
          this.dialogFormVisible = false;
          break;
        case 'getbookmark_byid':
          switch (msg.cdata.action) {
            case 'edit_open':
              this.editOpen(msg.cdata.bookmark);
              break;
          }
          break;
        case 'create_bookmark_folder':
          this.$message({
            type: 'success',
            message: successMsg,
          });
          this.getBookmarkMenu();
          this.saving = false;
          this.dialogAddFolderFormVisible = false;
          this.bookmarkFolder = {
            parentId: null,
            title: null,
            url: null,
          };
          break;
      }
    });
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
    // 获取书签目录
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
  padding-top: 8px;
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
.support {
  text-align: right;
  padding-top: 10px;
}
.support a,
.support a:hover {
  color: #fff;
  text-decoration: none;
}
.menu-selector {
  clear: both;
  height: 200px;
  overflow-x: hidden;
  overflow-y: scroll;
}
.menu-selector-path {
  clear: both;
  margin-bottom: 14px;
}
</style>
