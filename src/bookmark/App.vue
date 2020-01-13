<template>
  <div>
    <el-row>
      <el-col :span="8">
        <el-tree
          :data="data"
          node-key="id"
          default-expand-all
          @node-drag-start="handleDragStart"
          @node-drag-enter="handleDragEnter"
          @node-drag-leave="handleDragLeave"
          @node-drag-over="handleDragOver"
          @node-drag-end="handleDragEnd"
          @node-drop="handleDrop"
          draggable
          :allow-drop="allowDrop"
          :allow-drag="allowDrag"
        >
        </el-tree>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      port: null,
      data: [
        {
          id: 1,
          label: '一级 1',
          children: [
            {
              id: 4,
              label: '二级 1-1',
              children: [
                {
                  id: 9,
                  label: '三级 1-1-1',
                },
                {
                  id: 10,
                  label: '三级 1-1-2',
                },
              ],
            },
          ],
        },
        {
          id: 2,
          label: '一级 2',
          children: [
            {
              id: 5,
              label: '二级 2-1',
            },
            {
              id: 6,
              label: '二级 2-2',
            },
          ],
        },
        {
          id: 3,
          label: '一级 3',
          children: [
            {
              id: 7,
              label: '二级 3-1',
            },
            {
              id: 8,
              label: '二级 3-2',
              children: [
                {
                  id: 11,
                  label: '三级 3-2-1',
                },
                {
                  id: 12,
                  label: '三级 3-2-2',
                },
                {
                  id: 13,
                  label: '三级 3-2-3',
                },
              ],
            },
          ],
        },
      ],
      defaultProps: {
        children: 'children',
        label: 'label',
      },
    };
  },
  methods: {
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },

    handleDragStart(node, ev) {
      console.log('drag start', node);
    },
    handleDragEnter(draggingNode, dropNode, ev) {
      console.log('tree drag enter: ', dropNode.label);
    },
    handleDragLeave(draggingNode, dropNode, ev) {
      console.log('tree drag leave: ', dropNode.label);
    },
    handleDragOver(draggingNode, dropNode, ev) {
      console.log('tree drag over: ', dropNode.label);
    },
    handleDragEnd(draggingNode, dropNode, dropType, ev) {
      console.log('tree drag end: ', dropNode && dropNode.label, dropType);
    },
    handleDrop(draggingNode, dropNode, dropType, ev) {
      console.log('tree drop: ', dropNode.label, dropType);
    },
    allowDrop(draggingNode, dropNode, type) {
      if (dropNode.data.label === '二级 3-1') {
        return type !== 'inner';
      } else {
        return true;
      }
    },
    allowDrag(draggingNode) {
      return draggingNode.data.label.indexOf('三级 3-2-2') === -1;
    },
    getBookmarks() {
      this.port.postMessage({ ctype: 'getbookmark_tree', cdata: false });
    },
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  created() {
    // 与 background.js 通信
    this.port = chrome.runtime.connect({ name: 'bookmark_manager_ety001' });
    this.port.onMessage.addListener(msg => {
      switch (msg.ctype) {
        case 'getbookmark_tree':
          console.log('bms:', msg.cdata);
          break;
      }
    });
    // 设置网页标题
    document.title = chrome.i18n.getMessage('appname');
    this.getBookmarks();
  },
};
</script>

<style lang="scss" scoped></style>
