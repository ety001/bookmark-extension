<template>
  <div>
    <el-row class="config-box" v-if="formData !== null">
      <el-col :span="24">
        <el-form ref="form1" :rules="rules" :model="formData" label-position="left" label-width="140px" @submit.native.prevent>
          <el-form-item :label="'switch' | lang" prop="status">
            <el-switch v-model="formData.status"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true" :label="'mini_mode' | lang" prop="mini">
            <el-switch v-model="formData.mini"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true" :label="'random_reminder' | lang" prop="random">
            <el-switch v-model="formData.random"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true && formData.mini === true" :label="'frequency' | lang" prop="frequency">
            <el-input v-model.number="formData.frequency"></el-input>
          </el-form-item>
          <el-form-item v-if="formData.status === true && formData.mini === true" :label="'notify_position' | lang" prop="currentNotifyLocation">
            <el-select v-model="formData.currentNotifyLocation">
              <el-option v-for="(item, idx) in notifyLocation" :key="idx" :label="item.name" :value="item.val"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="save('form1')">{{ 'save' | lang }}</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  data() {
    const validateNotifyPosition = (rule, value, callback) => {
      const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
      if (positions.indexOf(value) === -1) {
        callback(new Error('valid_item'));
      } else {
        callback();
      }
    };
    return {
      formData: null,
      notifyLocation: [
        {
          name: this.getLang('top_right'),
          val: 'top-right',
        },
        {
          name: this.getLang('top_left'),
          val: 'top-left',
        },
        {
          name: this.getLang('bottom_right'),
          val: 'bottom-right',
        },
        {
          name: this.getLang('bottom_left'),
          val: 'bottom-left',
        },
      ],
      rules: {
        status: [{ type: 'boolean', message: 'need boolean', trigger: 'change' }],
        mini: [{ type: 'boolean', message: 'need boolean', trigger: 'change' }],
        random: [{ type: 'boolean', message: 'need boolean', trigger: 'change' }],
        frequency: [{ type: 'integer', message: this.getLang('need_integer'), trigger: 'blur' }],
        currentNotifyLocation: [{ validator: validateNotifyPosition, trigger: 'change' }],
      },
      port: null,
    };
  },
  methods: {
    getLang(val) {
      if (!val) return '';
      return chrome.i18n.getMessage(val);
    },
    save(formName) {
      this.$refs[formName].validate(valid => {
        if (!valid) {
          this.$message({
            message: this.getLang('save_failed'),
            type: 'warning',
          });
          return false;
        }
        this.port.postMessage({ ctype: 'save_config', cdata: this.formData });
      });
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
        case 'save_config':
          this.$message({
            type: 'success',
            message: this.getLang('save_success'),
          });
          break;
        case 'get_config':
          this.formData = {
            status: msg.cdata.status,
            mini: msg.cdata.mini,
            random: msg.cdata.random,
            frequency: msg.cdata.frequency,
            currentNotifyLocation: msg.cdata.currentNotifyLocation,
          };
          break;
      }
    });
    this.port.postMessage({ ctype: 'get_config', cdata: true });
  },
};
</script>

<style lang="scss" scoped>
.config-box {
  padding: 20px;
  width: 400px;
}
</style>
