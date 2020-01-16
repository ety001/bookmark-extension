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
                      <div class="bm_title">
                        <el-link icon="el-icon-folder">{{ scope.row.title }}</el-link>
                      </div>
                    </el-col>
                  </el-row>
                  <el-row v-else>
                    <el-col :span="24">
                      <div class="bm_title">
                        <i class="el-icon-collection-tag"></i>
                        {{ scope.row.title }}
                      </div>
                      <div class="bm_url">{{ scope.row.url }}</div>
                    </el-col>
                  </el-row>
                </template>
              </el-table-column>
              <el-table-column width="160">
                <template slot-scope="scope">
                  <el-button type="success" @click="visit(scope.row)" icon="el-icon-view" circle plain size="mini"></el-button>
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
      pid: null,
      bid: null,
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
      this.getBookmarkChildren(node.id);
    },
    getBookmarkMenu() {
      this.port.postMessage({ ctype: 'getbookmark_menu', cdata: false });
    },
    getBookmarkChildren(id) {
      this.port.postMessage({ ctype: 'getbookmark_children', cdata: id });
    },
    visit(data) {
      if (data.url) {
        window.open(data.url);
      } else {
      }
    },
    edit(data) {},
    remove(data) {},
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  created() {
    const query = this.$route.query;
    this.pid = query.pid === 'undefined' ? null : query.pid;
    this.bid = query.bid === 'undefined' ? null : query.bid;
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'getbookmark_menu':
          console.log('menu:', msg.cdata);
          this.loading = false;
          this.menu = msg.cdata;
          if (this.pid !== null) {
            this.$refs.menuTree.setCurrentKey(this.pid);
          } else {
            this.$refs.menuTree.setCurrentKey(1);
          }
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
          console.log('tmp', tmp);
          console.log('getbookmark_children', msg.cdata);
          break;
      }
    });
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
    // 获取书签目录
    this.loading = true;
    this.getBookmarkMenu();
    this.getBookmarkChildren(this.pid);
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
