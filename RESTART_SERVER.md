# 重启服务器以应用更新

## ⚠️ 重要：需要重启服务器

你看到的错误消息 "API quota exceeded for this model. The system will try a different model on the next request. Please check your Google Cloud billing and quotas." 是**旧的 Gemini 错误消息**。

代码已经更新，但服务器还在运行旧代码，需要重启才能看到新的错误消息。

## 如何重启服务器

### 方法 1: 如果服务器在终端运行
1. 找到运行服务器的终端窗口
2. 按 `Ctrl + C` 停止服务器
3. 重新启动：
   ```bash
   cd server
   npm start
   ```

### 方法 2: 如果服务器在后台运行
```bash
# 查找 Node.js 进程
ps aux | grep "node.*index.js"

# 停止进程（替换 PID 为实际进程 ID）
kill <PID>

# 或者强制停止所有 node 进程（谨慎使用）
pkill -f "node.*index.js"

# 然后重新启动
cd server
npm start
```

### 方法 3: 使用开发模式（自动重启）
```bash
cd server
npm run dev
```

## 验证更新是否生效

重启后，如果遇到配额错误，你应该看到新的错误消息：

**旧消息（错误）:**
```
API quota exceeded for this model. The system will try a different model on the next request. Please check your Google Cloud billing and quotas.
```

**新消息（正确）:**
```
OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage. You may need to add credits or upgrade your plan.
```

## 检查 OpenAI 配额

访问以下链接检查你的 OpenAI 配额：
- **使用情况**: https://platform.openai.com/usage
- **账户设置**: https://platform.openai.com/account/billing
- **API 密钥**: https://platform.openai.com/api-keys

## 如果配额确实超限

1. **检查账户余额**: 确保账户有足够的余额
2. **查看使用限制**: 检查是否有速率限制或配额限制
3. **升级计划**: 如果需要更高的配额，考虑升级到付费计划
4. **等待重置**: 某些配额可能会定期重置（如每分钟请求数）

