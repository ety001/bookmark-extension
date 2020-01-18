<template>
  <div>
    <el-form ref="form1" :model="bookmark" label-width="80px">
      <el-form-item :label="'name' | lang">
        <el-input v-model="bookmark.name"></el-input>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  props: ['port', 'saving', 'bookmark'],
  data() {
    return {
      menu: [],
      test: this.saving,
    };
  },
  methods: {
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  filters: {
    lang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
  },
  watch: {
    test(val) {
      console.log('saving', val);
    },
  },
  created() {
    console.log(this.saving);
    const successMsg = chrome.i18n.getMessage('success');
  },
  updated() {},
};
</script>

<style lang="scss" scoped></style>
