# 🔧 配额问题修复指南

## 🚨 如果仍然遇到配额错误

### 已实施的修复：

1. **添加了速率限制保护**
   - 请求之间最少间隔 1 秒
   - 防止触发每分钟请求数限制

2. **改进了错误检测**
   - 区分速率限制和配额超限
   - 提供更准确的错误消息

### 检查步骤：

#### 1. 检查 OpenAI 账户状态

访问以下链接检查：

**使用情况和配额**:
```
https://platform.openai.com/usage
```

**账户余额**:
```
https://platform.openai.com/account/billing
```

**查看速率限制**:
- Free tier: 通常 3 RPM (每分钟请求数), 40K TPM (每分钟令牌数)
- Paid tier: 更高的限制

#### 2. 检查实际错误

查看服务器日志，找到具体的错误信息：
```bash
# 在运行服务器的终端中查看
# 查找包含 "quota" 或 "429" 的错误
```

#### 3. 测试速率限制

运行测试脚本：
```bash
cd server
node detailed-diagnosis.js
```

### 解决方案：

#### 方案 1: 增加请求延迟（已实施）

代码已添加 1 秒延迟，如果仍然超限，可以增加：

在 `server/index.js` 中修改：
```javascript
const MIN_REQUEST_INTERVAL = 2000; // 改为 2 秒
```

#### 方案 2: 检查 OpenAI 账户限制

1. **免费账户限制**:
   - RPM (Requests Per Minute): 通常 3-5
   - TPM (Tokens Per Minute): 通常 40,000
   - 如果超过这些限制，会触发 429 错误

2. **付费账户**:
   - 更高的速率限制
   - 需要添加付款方式

#### 方案 3: 实现请求队列

如果需要处理多个并发请求，可以实现队列系统。

#### 方案 4: 升级 OpenAI 计划

如果经常遇到配额问题：
1. 访问: https://platform.openai.com/account/billing
2. 添加付款方式
3. 升级到付费计划
4. 获得更高的速率限制

### 常见错误类型：

#### 1. Rate Limit Error (速率限制)
```
Error: Rate limit exceeded
Status: 429
Type: rate_limit_error
```
**解决方案**: 增加请求延迟或升级计划

#### 2. Insufficient Quota (配额不足)
```
Error: Insufficient quota
Status: 429
Type: insufficient_quota
```
**解决方案**: 添加账户余额或升级计划

#### 3. Quota Exceeded (配额超限)
```
Error: Quota exceeded
Status: 429
```
**解决方案**: 检查使用情况，等待重置或升级计划

### 调试命令：

```bash
# 测试 OpenAI API
cd server
node -e "
const OpenAI = require('openai');
require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'test' }],
  max_completion_tokens: 10
}).then(r => console.log('✅ OK'))
.catch(e => {
  console.log('❌ Error:', e.status, e.message);
  if (e.error) console.log('Details:', JSON.stringify(e.error, null, 2));
});
"
```

### 下一步：

1. **检查服务器日志** - 找到具体错误
2. **查看 OpenAI 使用情况** - 确认是否超限
3. **增加延迟** - 如果速率限制，增加 MIN_REQUEST_INTERVAL
4. **升级计划** - 如果需要更高的限制

