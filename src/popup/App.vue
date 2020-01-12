<template>
  <div>
    <el-row class="config-box">
      <el-col :span="24">
        <el-form ref="form1" :model="formData" label-position="left" label-width="140px" @submit.native.prevent>
          <el-form-item label="Switch">
            <el-switch v-model="formData.status"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true" label="Mini Model">
            <el-switch v-model="formData.mini"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true" label="Random Reminder">
            <el-switch v-model="formData.random"></el-switch>
          </el-form-item>
          <el-form-item v-if="formData.status === true && formData.mini === true" label="Frequency">
            <el-input v-model="formData.frequency"></el-input>
          </el-form-item>
          <el-form-item v-if="formData.status === true && formData.mini === true" label="Notify Position">
            <el-select v-model="formData.currentNotifyLocation" placeholder="请选择活动区域">
              <el-option v-for="(item, idx) in notifyLocation" :label="item.name" :value="item.val"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        status: true,
        mini: true,
        random: true,
        frequency: 15,
        currentNotifyLocation: 'top-right',
      },
      notifyLocation: [
        {
          name: 'Top Right',
          val: 'top-right',
        },
        {
          name: 'Top Left',
          val: 'top-left',
        },
        {
          name: 'Bottom Right',
          val: 'bottom-right',
        },
        {
          name: 'Bottom Left',
          val: 'bottom-left',
        },
      ],
    };
  },
};
</script>

<style lang="scss" scoped>
.config-box {
  padding: 20px;
  width: 320px;
}
</style>
