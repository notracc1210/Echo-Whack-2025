const speech = require('@google-cloud/speech');
const OpenAI = require('openai');
require('dotenv').config();

console.log('🔍 详细诊断报告\n');
console.log('='.repeat(70));
console.log('');

// 配置信息
console.log('📋 配置信息:');
console.log(`   Google Cloud Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || '未设置'}`);
console.log(`   OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4o (默认)'}`);
console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '已设置 (' + process.env.OPENAI_API_KEY.substring(0, 10) + '...)' : '未设置'}`);
console.log(`   ElevenLabs API Key: ${process.env.ELEVENLABS_API_KEY ? '已设置' : '未设置'}`);
console.log(`   ElevenLabs Voice ID: ${process.env.ELEVENLABS_VOICE_ID || '使用默认'}`);
console.log('');

const results = {
  googleCloud: { status: 'not_tested', error: null, details: {} },
  openai: { status: 'not_tested', error: null, details: {} },
  elevenlabs: { status: 'not_tested', error: null, details: {} }
};

// Test Google Cloud
async function testGoogleCloud() {
  console.log('1️⃣  Google Cloud Speech-to-Text API');
  console.log('   ' + '-'.repeat(50));
  try {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID === 'your-project-id') {
      results.googleCloud.status = 'not_configured';
      console.log('   ⚠️  状态: 未配置 Project ID');
      return;
    }
    const speechClient = new speech.SpeechClient({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID });
    const startTime = Date.now();
    await speechClient.recognize({
      audio: { content: Buffer.from('test').toString('base64') },
      config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
    });
    const duration = Date.now() - startTime;
    results.googleCloud.status = 'ok';
    results.googleCloud.details = { responseTime: duration + 'ms' };
    console.log('   ✅ 状态: 正常');
    console.log(`   ⏱️  响应时间: ${duration}ms`);
    console.log('   💡 建议: 配额使用正常，可以继续使用');
  } catch (error) {
    const errorMsg = error.message || '';
    const errorCode = error.code || '';
    if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota') || errorCode === 8) {
      results.googleCloud.status = 'quota_exceeded';
      results.googleCloud.error = errorMsg;
      console.log('   ❌ 状态: 配额超限');
      console.log(`   🔴 错误代码: ${errorCode || 'N/A'}`);
      console.log(`   📝 错误信息: ${errorMsg.substring(0, 150)}`);
      console.log('   💡 解决方案:');
      console.log('      - 访问 Google Cloud Console 申请增加配额');
      console.log('      - 或等待配额重置（通常是每分钟）');
    } else {
      results.googleCloud.status = 'error';
      results.googleCloud.error = errorMsg;
      console.log('   ⚠️  状态: 其他错误');
      console.log(`   📝 错误信息: ${errorMsg.substring(0, 150)}`);
    }
  }
  console.log('');
}

// Test OpenAI
async function testOpenAI() {
  console.log('2️⃣  OpenAI ChatGPT API');
  console.log('   ' + '-'.repeat(50));
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      results.openai.status = 'not_configured';
      console.log('   ⚠️  状态: 未配置 API Key');
      return;
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o';
    console.log(`   🤖 使用模型: ${modelName}`);
    const startTime = Date.now();
    const result = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_completion_tokens: 10,
    });
    const duration = Date.now() - startTime;
    const responseText = result.choices[0]?.message?.content || '';
    results.openai.status = 'ok';
    results.openai.details = { 
      responseTime: duration + 'ms',
      response: responseText,
      model: modelName
    };
    console.log('   ✅ 状态: 正常');
    console.log(`   ⏱️  响应时间: ${duration}ms`);
    console.log(`   📝 响应内容: "${responseText}"`);
    console.log('   💡 建议: API 工作正常，可以继续使用');
    console.log('   🔗 查看使用情况: https://platform.openai.com/usage');
  } catch (error) {
    const errorMsg = error.message || '';
    const errorStatus = error.status || '';
    const errorType = error.error?.type || '';
    if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate_limit') || errorStatus === 429 || errorType === 'rate_limit_error' || errorType === 'insufficient_quota') {
      results.openai.status = 'quota_exceeded';
      results.openai.error = errorMsg;
      console.log('   ❌ 状态: 配额超限');
      console.log(`   🔴 HTTP 状态码: ${errorStatus || 'N/A'}`);
      console.log(`   🔴 错误类型: ${errorType || 'N/A'}`);
      console.log(`   📝 错误信息: ${errorMsg.substring(0, 150)}`);
      console.log('   💡 解决方案:');
      console.log('      - 检查账户余额: https://platform.openai.com/account/billing');
      console.log('      - 查看使用情况: https://platform.openai.com/usage');
      console.log('      - 检查速率限制 (RPM/TPM)');
      console.log('      - 考虑升级计划或添加余额');
    } else if (errorMsg.includes('model') && errorMsg.includes('not found')) {
      results.openai.status = 'model_not_found';
      results.openai.error = errorMsg;
      console.log('   ⚠️  状态: 模型不存在');
      console.log(`   📝 错误信息: ${errorMsg}`);
      console.log('   💡 解决方案: 检查 OPENAI_MODEL 环境变量，使用有效模型');
    } else {
      results.openai.status = 'error';
      results.openai.error = errorMsg;
      console.log('   ⚠️  状态: 其他错误');
      console.log(`   📝 错误信息: ${errorMsg.substring(0, 150)}`);
    }
  }
  console.log('');
}

// Test ElevenLabs
async function testElevenLabs() {
  console.log('3️⃣  ElevenLabs Text-to-Speech API');
  console.log('   ' + '-'.repeat(50));
  try {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      results.elevenlabs.status = 'not_configured';
      console.log('   ⚠️  状态: 未配置 API Key');
      return;
    }
    const startTime = Date.now();
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    });
    const duration = Date.now() - startTime;
    if (response.status === 429) {
      results.elevenlabs.status = 'quota_exceeded';
      console.log('   ❌ 状态: 配额超限 (429)');
      console.log('   💡 解决方案:');
      console.log('      - 检查使用情况: https://elevenlabs.io/app');
      console.log('      - 免费层限制: 10,000 字符/月');
      console.log('      - 考虑升级计划或等待配额重置');
    } else if (response.ok) {
      const data = await response.json();
      results.elevenlabs.status = 'ok';
      results.elevenlabs.details = { 
        responseTime: duration + 'ms',
        voiceCount: data.voices?.length || 0
      };
      console.log('   ✅ 状态: 正常');
      console.log(`   ⏱️  响应时间: ${duration}ms`);
      console.log(`   🎤 可用语音数: ${data.voices?.length || 0}`);
      console.log(`   🎵 当前 Voice ID: ${process.env.ELEVENLABS_VOICE_ID || 'g6xIsTj2HwM6VR4iXFCw (默认)'}`);
      console.log('   💡 建议: API 工作正常，可以继续使用');
      console.log('   🔗 查看使用情况: https://elevenlabs.io/app');
    } else {
      results.elevenlabs.status = 'error';
      console.log(`   ⚠️  状态: HTTP ${response.status}`);
      console.log(`   📝 响应: ${response.statusText}`);
    }
  } catch (error) {
    results.elevenlabs.status = 'error';
    results.elevenlabs.error = error.message;
    console.log(`   ⚠️  状态: 错误`);
    console.log(`   📝 错误信息: ${error.message.substring(0, 150)}`);
  }
  console.log('');
}

// Run all tests
(async () => {
  await testGoogleCloud();
  await testOpenAI();
  await testElevenLabs();
  
  console.log('='.repeat(70));
  console.log('📊 诊断总结\n');
  
  const quotaIssues = [];
  const otherIssues = [];
  
  if (results.googleCloud.status === 'quota_exceeded') quotaIssues.push('Google Cloud Speech-to-Text');
  if (results.openai.status === 'quota_exceeded') quotaIssues.push('OpenAI ChatGPT');
  if (results.elevenlabs.status === 'quota_exceeded') quotaIssues.push('ElevenLabs');
  
  if (results.googleCloud.status === 'error') otherIssues.push('Google Cloud');
  if (results.openai.status === 'error') otherIssues.push('OpenAI');
  if (results.elevenlabs.status === 'error') otherIssues.push('ElevenLabs');
  
  if (quotaIssues.length > 0) {
    console.log('❌ 配额超限的服务:');
    quotaIssues.forEach(service => console.log(`   - ${service}`));
    console.log('');
  }
  
  if (otherIssues.length > 0) {
    console.log('⚠️  其他问题的服务:');
    otherIssues.forEach(service => console.log(`   - ${service}`));
    console.log('');
  }
  
  if (quotaIssues.length === 0 && otherIssues.length === 0) {
    console.log('✅ 所有 API 测试通过！');
    console.log('');
    console.log('💡 如果仍然遇到配额错误，可能是:');
    console.log('   1. 速率限制（每分钟请求数）');
    console.log('   2. 特定操作的配额限制');
    console.log('   3. 检查服务器日志获取详细错误信息');
  }
  
  console.log('='.repeat(70));
})();
