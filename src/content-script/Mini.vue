<template>
  <div>hello</div>
</template>

<script>
export default {
  props: ['bookmark'],
  data() {
    return {};
  },
  methods: {},
  created() {
    console.log(this.bookmark);
  },
};
</script>

<style lang="scss" scoped></style>
