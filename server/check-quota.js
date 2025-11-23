#!/usr/bin/env node

/**
 * Google Cloud Speech-to-Text 配额检查脚本
 * 运行: cd server && node check-quota.js
 */

const speech = require('@google-cloud/speech');
require('dotenv').config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

if (!projectId) {
  console.error('❌ GOOGLE_CLOUD_PROJECT_ID 未设置');
  console.log('请在 server/.env 文件中设置 GOOGLE_CLOUD_PROJECT_ID');
  process.exit(1);
}

console.log('🔍 检查 Google Cloud Speech-to-Text API 配额状态...\n');
console.log(`项目 ID: ${projectId}\n`);

const speechClient = new speech.SpeechClient({
  projectId: projectId,
});

// 创建一个最小的测试请求
const testAudio = Buffer.from('test').toString('base64');

const request = {
  audio: {
    content: testAudio,
  },
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  },
};

speechClient.recognize(request)
  .then(([response]) => {
    console.log('✅ Google Cloud Speech-to-Text API 正常工作');
    console.log('   配额状态: 正常');
    console.log('\n💡 如果仍然遇到配额问题，请检查:');
    console.log('   1. Google Cloud Console > IAM & Admin > Quotas');
    console.log('   2. 查看 "Speech-to-Text API" 相关配额');
    console.log('   3. 检查是否有配额使用率警报');
  })
  .catch((error) => {
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    console.log('❌ API 调用失败\n');
    
    // 检查配额相关错误
    if (
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('QUOTA_EXCEEDED') ||
      errorCode === 8 || // gRPC RESOURCE_EXHAUSTED
      error.status === 429
    ) {
      console.log('⚠️  检测到配额超限错误！\n');
      console.log('错误信息:', errorMessage);
      console.log('\n📋 解决方案:');
      console.log('1. 访问 Google Cloud Console: https://console.cloud.google.com/');
      console.log('2. 导航到: IAM & Admin > Quotas');
      console.log('3. 搜索 "Speech-to-Text API"');
      console.log('4. 点击配额名称 > EDIT QUOTAS 申请增加配额');
      console.log('\n或者查看详细指南: ../GOOGLE_CLOUD_QUOTA_FIX.md');
    } else if (errorMessage.includes('PERMISSION_DENIED') || errorCode === 7) {
      console.log('⚠️  权限错误');
      console.log('错误信息:', errorMessage);
      console.log('\n解决方案:');
      console.log('1. 检查 Google Cloud 认证');
      console.log('2. 运行: gcloud auth application-default login');
      console.log('3. 确保项目 ID 正确');
    } else if (errorMessage.includes('API not enabled')) {
      console.log('⚠️  API 未启用');
      console.log('错误信息:', errorMessage);
      console.log('\n解决方案:');
      console.log('1. 访问 Google Cloud Console');
      console.log('2. 启用 Speech-to-Text API');
    } else {
      console.log('⚠️  其他错误');
      console.log('错误代码:', errorCode);
      console.log('错误信息:', errorMessage);
      console.log('\n完整错误:');
      console.error(error);
    }
    
    process.exit(1);
  });
