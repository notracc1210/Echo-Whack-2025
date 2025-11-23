# Google Cloud 配额超限解决方案

## 📊 当前状态

根据你提供的信息：
- **Current usage > 90%** - 当前使用率超过 90%
- **7 day peak usage > 90%** - 7 天峰值使用率超过 90%
- **All quotas & system limits: 870** - 总共有 870 个配额限制

## 🎯 需要检查的具体配额

### Speech-to-Text API 相关配额：

1. **Characters per minute (每分钟字符数)**
   - 这是最可能超限的配额
   - 每次语音识别都会消耗字符数
   - 如果使用频繁，很容易达到限制

2. **Requests per minute (每分钟请求数)**
   - 每分钟可以发送的请求数量
   - 如果快速连续使用，可能触发限制

3. **Concurrent requests (并发请求数)**
   - 同时处理的请求数量
   - 如果有多个用户同时使用，可能超限

## 🔍 如何查看具体配额

### 方法 1: Google Cloud Console（推荐）

1. 访问配额页面：
   ```
   https://console.cloud.google.com/iam-admin/quotas
   ```

2. 在搜索框中输入：`Speech-to-Text`

3. 查看以下配额的使用率：
   - **Speech-to-Text API - Characters per minute**
   - **Speech-to-Text API - Requests per minute**
   - **Speech-to-Text API - Concurrent requests**

4. 点击配额名称查看详细信息：
   - 当前使用量
   - 配额限制
   - 使用率百分比

### 方法 2: 使用 gcloud CLI

```bash
# 列出所有 Speech-to-Text 配额
gcloud compute project-info describe --project=YOUR_PROJECT_ID

# 或者通过 API
gcloud services list --enabled --project=YOUR_PROJECT_ID
```

## 🔧 解决方案

### 方案 1: 申请增加配额（推荐）

1. **在配额页面**：
   - 找到使用率 > 90% 的配额
   - 点击配额名称
   - 点击 **EDIT QUOTAS** (编辑配额)

2. **填写申请表单**：
   - 说明你的使用场景
   - 请求的新配额值（例如：从 1000 增加到 5000）
   - 提交申请

3. **等待批准**：
   - 通常 24-48 小时内批准
   - 会收到邮件通知

### 方案 2: 启用计费账户

如果使用免费层，配额限制较严格：
1. 在 Google Cloud Console 启用计费账户
2. 设置预算和警报
3. 配额会自动增加

### 方案 3: 优化使用（临时方案）

在配额增加之前：

1. **添加请求延迟**：
   ```javascript
   // 在 server/index.js 中添加延迟
   await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
   ```

2. **实现请求队列**：
   - 避免同时发送多个请求
   - 排队处理请求

3. **减少音频长度**：
   - 分段处理长音频
   - 只发送必要的音频部分

### 方案 4: 切换到其他服务（备选）

如果急需使用，可以考虑：
- **Azure Speech Services**
- **AWS Transcribe**
- **Deepgram**
- **AssemblyAI**

## 📝 快速检查步骤

1. **访问配额页面**：
   ```
   https://console.cloud.google.com/iam-admin/quotas?project=project-3c80610d-1863-4127-b39
   ```

2. **搜索 "Speech-to-Text"**

3. **查看使用率 > 90% 的配额**

4. **点击配额名称查看详细信息**

5. **申请增加配额或优化使用**

## 🚨 紧急处理

如果配额已经超限，立即可以做的：

1. **等待几分钟**：某些配额是按分钟计算的，等待后可能恢复

2. **减少使用频率**：暂时减少语音识别的使用

3. **检查是否有其他配额**：可能不是 Speech-to-Text，而是其他 API

## 💡 预防措施

1. **设置配额警报**：
   - 在配额页面设置使用率警报
   - 当使用率达到 80% 时收到通知

2. **监控使用情况**：
   - 定期检查配额使用率
   - 设置预算警报

3. **优化代码**：
   - 添加请求重试逻辑（带退避）
   - 实现请求队列
   - 缓存常见请求结果

## 📞 需要帮助？

如果配额申请被拒绝或需要更多帮助：
1. 查看 Google Cloud 支持文档
2. 联系 Google Cloud 支持
3. 检查是否有其他限制（如组织策略）

