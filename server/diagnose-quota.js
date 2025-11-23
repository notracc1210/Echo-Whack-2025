const speech = require('@google-cloud/speech');
const OpenAI = require('openai');
require('dotenv').config();

console.log('🔍 诊断配额问题...\n');
console.log('='.repeat(60));
console.log('');

const results = {
  googleCloud: { status: 'not_tested', error: null },
  openai: { status: 'not_tested', error: null },
  elevenlabs: { status: 'not_tested', error: null }
};

async function testGoogleCloud() {
  console.log('1️⃣  测试 Google Cloud Speech-to-Text API...');
  try {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID === 'your-project-id') {
      results.googleCloud.status = 'not_configured';
      console.log('   ⚠️  未配置 Project ID\n');
      return;
    }
    const speechClient = new speech.SpeechClient({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID });
    const testAudio = Buffer.from('test').toString('base64');
    await speechClient.recognize({
      audio: { content: testAudio },
      config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
    });
    results.googleCloud.status = 'ok';
    console.log('   ✅ Google Cloud Speech-to-Text: 正常\n');
  } catch (error) {
    const errorMsg = error.message || '';
    if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota') || error.code === 8) {
      results.googleCloud.status = 'quota_exceeded';
      results.googleCloud.error = errorMsg;
      console.log('   ❌ Google Cloud Speech-to-Text: 配额超限');
      console.log(`   错误: ${errorMsg.substring(0, 100)}\n`);
    } else {
      results.googleCloud.status = 'error';
      console.log(`   ⚠️  错误: ${errorMsg.substring(0, 100)}\n`);
    }
  }
}

async function testOpenAI() {
  console.log('2️⃣  测试 OpenAI ChatGPT API...');
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      results.openai.status = 'not_configured';
      console.log('   ⚠️  未配置 API Key\n');
      return;
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o';
    console.log(`   使用模型: ${modelName}`);
    await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Say "test"' }],
      max_completion_tokens: 10,
    });
    results.openai.status = 'ok';
    console.log('   ✅ OpenAI ChatGPT: 正常\n');
  } catch (error) {
    const errorMsg = error.message || '';
    const errorStatus = error.status || '';
    if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate_limit') || errorStatus === 429) {
      results.openai.status = 'quota_exceeded';
      results.openai.error = errorMsg;
      console.log('   ❌ OpenAI ChatGPT: 配额超限');
      console.log(`   错误: ${errorMsg.substring(0, 150)}\n`);
    } else {
      results.openai.status = 'error';
      console.log(`   ⚠️  错误: ${errorMsg.substring(0, 100)}\n`);
    }
  }
}

async function testElevenLabs() {
  console.log('3️⃣  测试 ElevenLabs API...');
  try {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      results.elevenlabs.status = 'not_configured';
      console.log('   ⚠️  未配置 API Key\n');
      return;
    }
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    });
    if (response.status === 429) {
      results.elevenlabs.status = 'quota_exceeded';
      console.log('   ❌ ElevenLabs: 配额超限 (429)\n');
    } else if (response.ok) {
      const data = await response.json();
      results.elevenlabs.status = 'ok';
      console.log(`   ✅ ElevenLabs: 正常 (${data.voices?.length || 0} 个语音)\n`);
    } else {
      console.log(`   ⚠️  错误 (${response.status})\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  错误: ${error.message.substring(0, 100)}\n`);
  }
}

(async () => {
  await testGoogleCloud();
  await testOpenAI();
  await testElevenLabs();
  console.log('='.repeat(60));
  console.log('📊 总结:\n');
  const issues = [];
  if (results.googleCloud.status === 'quota_exceeded') issues.push('Google Cloud Speech-to-Text');
  if (results.openai.status === 'quota_exceeded') issues.push('OpenAI ChatGPT');
  if (results.elevenlabs.status === 'quota_exceeded') issues.push('ElevenLabs');
  if (issues.length > 0) {
    console.log('❌ 配额超限:', issues.join(', '));
  } else {
    console.log('✅ 未检测到配额问题');
  }
})();
