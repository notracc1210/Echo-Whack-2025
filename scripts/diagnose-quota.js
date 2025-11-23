#!/usr/bin/env node

/**
 * 诊断哪个 API 触发了配额限制
 * 运行: cd server && node ../scripts/diagnose-quota.js
 */

const path = require('path');
const serverPath = path.join(__dirname, '..', 'server');
process.chdir(serverPath);

// Load modules after changing directory
const speech = require('@google-cloud/speech');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(serverPath, '.env') });

console.log('🔍 诊断配额问题...\n');
console.log('=' .repeat(60));
console.log('');

const results = {
  googleCloud: { status: 'not_tested', error: null },
  openai: { status: 'not_tested', error: null },
  elevenlabs: { status: 'not_tested', error: null }
};

// Test 1: Google Cloud Speech-to-Text
async function testGoogleCloud() {
  console.log('1️⃣  测试 Google Cloud Speech-to-Text API...');
  try {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID === 'your-project-id') {
      results.googleCloud.status = 'not_configured';
      console.log('   ⚠️  未配置 Project ID\n');
      return;
    }

    const speechClient = new speech.SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const testAudio = Buffer.from('test').toString('base64');
    const request = {
      audio: { content: testAudio },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    await speechClient.recognize(request);
    results.googleCloud.status = 'ok';
    console.log('   ✅ Google Cloud Speech-to-Text: 正常\n');
  } catch (error) {
    const errorMsg = error.message || '';
    const errorCode = error.code || '';
    
    if (
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('429') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('QUOTA_EXCEEDED') ||
      errorCode === 8
    ) {
      results.googleCloud.status = 'quota_exceeded';
      results.googleCloud.error = errorMsg;
      console.log('   ❌ Google Cloud Speech-to-Text: 配额超限');
      console.log(`   错误: ${errorMsg.substring(0, 100)}\n`);
    } else {
      results.googleCloud.status = 'error';
      results.googleCloud.error = errorMsg;
      console.log('   ⚠️  Google Cloud Speech-to-Text: 其他错误');
      console.log(`   错误: ${errorMsg.substring(0, 100)}\n`);
    }
  }
}

// Test 2: OpenAI ChatGPT
async function testOpenAI() {
  console.log('2️⃣  测试 OpenAI ChatGPT API...');
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      results.openai.status = 'not_configured';
      console.log('   ⚠️  未配置 API Key\n');
      return;
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o';
    console.log(`   使用模型: ${modelName}`);

    const result = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_completion_tokens: 10,
    });

    results.openai.status = 'ok';
    console.log('   ✅ OpenAI ChatGPT: 正常');
    console.log(`   响应: ${result.choices[0]?.message?.content || 'N/A'}\n`);
  } catch (error) {
    const errorMsg = error.message || '';
    const errorStatus = error.status || '';
    const errorType = error.error?.type || '';
    
    if (
      errorMsg.includes('QUOTA_EXCEEDED') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('429') ||
      errorMsg.includes('rate_limit') ||
      errorMsg.includes('insufficient_quota') ||
      errorStatus === 429 ||
      errorType === 'rate_limit_error' ||
      errorType === 'insufficient_quota'
    ) {
      results.openai.status = 'quota_exceeded';
      results.openai.error = errorMsg;
      console.log('   ❌ OpenAI ChatGPT: 配额超限');
      console.log(`   错误: ${errorMsg.substring(0, 150)}`);
      console.log(`   状态码: ${errorStatus || 'N/A'}`);
      console.log(`   错误类型: ${errorType || 'N/A'}\n`);
    } else if (errorMsg.includes('model') && errorMsg.includes('not found')) {
      results.openai.status = 'model_not_found';
      results.openai.error = errorMsg;
      console.log('   ⚠️  OpenAI: 模型不存在');
      console.log(`   错误: ${errorMsg.substring(0, 100)}\n`);
    } else {
      results.openai.status = 'error';
      results.openai.error = errorMsg;
      console.log('   ⚠️  OpenAI: 其他错误');
      console.log(`   错误: ${errorMsg.substring(0, 100)}\n`);
    }
  }
}

// Test 3: ElevenLabs
async function testElevenLabs() {
  console.log('3️⃣  测试 ElevenLabs API...');
  try {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      results.elevenlabs.status = 'not_configured';
      console.log('   ⚠️  未配置 API Key\n');
      return;
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    if (response.status === 429) {
      results.elevenlabs.status = 'quota_exceeded';
      results.elevenlabs.error = '429 Too Many Requests';
      console.log('   ❌ ElevenLabs: 配额超限 (429)\n');
    } else if (response.ok) {
      const data = await response.json();
      results.elevenlabs.status = 'ok';
      console.log('   ✅ ElevenLabs: 正常');
      console.log(`   可用语音数: ${data.voices?.length || 0}\n`);
    } else {
      results.elevenlabs.status = 'error';
      results.elevenlabs.error = `Status ${response.status}`;
      console.log(`   ⚠️  ElevenLabs: 错误 (${response.status})\n`);
    }
  } catch (error) {
    results.elevenlabs.status = 'error';
    results.elevenlabs.error = error.message;
    console.log(`   ⚠️  ElevenLabs: 错误`);
    console.log(`   错误: ${error.message.substring(0, 100)}\n`);
  }
}

// Run all tests
async function runDiagnostics() {
  await testGoogleCloud();
  await testOpenAI();
  await testElevenLabs();

  // Summary
  console.log('=' .repeat(60));
  console.log('📊 诊断结果总结\n');

  const quotaIssues = [];
  const otherIssues = [];

  if (results.googleCloud.status === 'quota_exceeded') {
    quotaIssues.push('Google Cloud Speech-to-Text');
  }
  if (results.openai.status === 'quota_exceeded') {
    quotaIssues.push('OpenAI ChatGPT');
  }
  if (results.elevenlabs.status === 'quota_exceeded') {
    quotaIssues.push('ElevenLabs');
  }

  if (quotaIssues.length > 0) {
    console.log('❌ 配额超限的服务:');
    quotaIssues.forEach(service => {
      console.log(`   - ${service}`);
    });
    console.log('');
  } else {
    console.log('✅ 没有检测到配额超限问题\n');
  }

  if (results.googleCloud.status === 'error' || results.openai.status === 'error' || results.elevenlabs.status === 'error') {
    console.log('⚠️  其他错误:');
    if (results.googleCloud.status === 'error') {
      console.log(`   - Google Cloud: ${results.googleCloud.error?.substring(0, 50)}`);
    }
    if (results.openai.status === 'error') {
      console.log(`   - OpenAI: ${results.openai.error?.substring(0, 50)}`);
    }
    if (results.elevenlabs.status === 'error') {
      console.log(`   - ElevenLabs: ${results.elevenlabs.error?.substring(0, 50)}`);
    }
    console.log('');
  }

  // Recommendations
  console.log('💡 建议:');
  if (quotaIssues.includes('OpenAI ChatGPT')) {
    console.log('   1. 检查 OpenAI 账户: https://platform.openai.com/usage');
    console.log('   2. 查看账户余额和配额限制');
    console.log('   3. 考虑升级计划或添加余额');
  }
  if (quotaIssues.includes('Google Cloud Speech-to-Text')) {
    console.log('   1. 检查 Google Cloud Console: https://console.cloud.google.com/');
    console.log('   2. 导航到 IAM & Admin > Quotas');
    console.log('   3. 搜索 "Speech-to-Text API" 并申请增加配额');
    console.log('   4. 查看 GOOGLE_CLOUD_QUOTA_FIX.md 获取详细指南');
  }
  if (quotaIssues.includes('ElevenLabs')) {
    console.log('   1. 检查 ElevenLabs 使用情况: https://elevenlabs.io/app');
    console.log('   2. 免费层限制: 10,000 字符/月');
    console.log('   3. 考虑升级计划或等待配额重置');
  }
  if (quotaIssues.length === 0) {
    console.log('   所有 API 测试通过，如果仍遇到配额问题，可能是:');
    console.log('   - 速率限制（每分钟请求数）');
    console.log('   - 特定操作的配额限制');
    console.log('   - 检查服务器日志获取更详细的错误信息');
  }
}

runDiagnostics().catch(console.error);

