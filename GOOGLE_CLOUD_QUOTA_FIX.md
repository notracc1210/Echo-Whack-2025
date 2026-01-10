# Google Cloud 配额超限解决方案

## 🔍 如何检查配额状态

### 方法 1: Google Cloud Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择你的项目
3. 导航到 **IAM & Admin** > **Quotas** (配额)
4. 搜索 "Speech-to-Text API"
5. 查看以下配额：
   - **Characters per minute** (每分钟字符数)
   - **Requests per minute** (每分钟请求数)
   - **Concurrent requests** (并发请求数)

### 方法 2: 使用 gcloud 命令行

```bash
# 列出所有 Speech-to-Text 配额
gcloud compute project-info describe --project=YOUR_PROJECT_ID

# 查看特定配额
gcloud services list --enabled --project=YOUR_PROJECT_ID
```

## ⚠️ 常见配额限制

### Speech-to-Text API 免费层限制：
- **每月前 60 分钟音频免费**
- **之后按分钟计费**

### 付费层默认配额：
- **每分钟字符数**: 通常很高（数百万）
- **每分钟请求数**: 通常很高（数千）
- **并发请求**: 通常 100-1000

## 🔧 解决方案

### 方案 1: 申请增加配额（推荐）

1. 在 Google Cloud Console 中：
   - 进入 **IAM & Admin** > **Quotas**
   - 找到 "Speech-to-Text API" 相关配额
   - 点击配额名称
   - 点击 **EDIT QUOTAS** (编辑配额)
   - 填写申请表单，说明你的使用场景
   - 提交申请（通常 24-48 小时内批准）

### 方案 2: 启用计费账户

如果配额超限是因为免费层限制：
1. 在 Google Cloud Console 中启用计费账户
2. 设置预算和警报
3. 配额会自动增加

### 方案 3: 优化使用（临时方案）

在配额恢复之前，可以：
1. **减少请求频率** - 添加请求间隔
2. **缓存结果** - 避免重复识别相同音频
3. **使用更短的音频** - 分段处理长音频

### 方案 4: 切换到其他服务（备选）

如果急需使用，可以考虑：
- **Azure Speech Services**
- **AWS Transcribe**
- **Deepgram**
- **AssemblyAI**

## 📊 检查当前使用情况

### 查看 API 使用统计：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 导航到 **APIs & Services** > **Dashboard**
3. 选择 **Speech-to-Text API**
4. 查看 **Usage** (使用情况) 标签页
5. 可以看到：
   - 每日/每月请求数
   - 字符数使用情况
   - 错误率

## 🚨 配额超限错误信息

如果遇到以下错误，说明配额超限：

```
RESOURCE_EXHAUSTED
Quota exceeded
429 Too Many Requests
Rate limit exceeded
```

## 💡 预防措施

1. **设置配额警报**：
   - 在 Google Cloud Console 中设置配额使用率警报
   - 当使用率达到 80% 时收到通知

2. **监控使用情况**：
   - 定期检查 API 使用统计
   - 设置预算警报

3. **优化代码**：
   - 添加请求重试逻辑（带退避）
   - 实现请求队列
   - 缓存常见请求结果

## 📝 快速检查脚本

运行以下命令检查当前配额状态：

```bash
cd server
node -e "
const speech = require('@google-cloud/speech');
require('dotenv').config();
const speechClient = new speech.SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});
// 测试请求
speechClient.recognize({
  audio: { content: Buffer.from('test').toString('base64') },
  config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' }
}).then(() => console.log('✅ API 正常'))
.catch(e => {
  if (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('429')) {
    console.log('❌ 配额超限:', e.message);
  } else {
    console.log('❌ 其他错误:', e.message);
  }
});
"
```

## 🔗 相关链接

- [Google Cloud Speech-to-Text 配额文档](https://cloud.google.com/speech-to-text/quotas)
- [申请增加配额](https://console.cloud.google.com/iam-admin/quotas)
- [计费信息](https://cloud.google.com/speech-to-text/pricing)










