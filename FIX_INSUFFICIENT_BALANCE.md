# Fix: DeepSeek Insufficient Balance Error

## ❌ Error

```
Error getting response from DeepSeek: Error code: 402 -
{'error': {'message': 'Insufficient Balance', 'type': 'unknown_error',
'param': None, 'code': 'invalid_request_error'}}
```

**Cause:** Your DeepSeek API account has run out of credits/balance.

---

## ✅ Solutions

### Option 1: Add Credits to DeepSeek (Recommended - Cheapest)

DeepSeek is **much cheaper** than OpenAI:
- **DeepSeek:** ~$0.14 per 1M tokens ($0.00014 per 1K tokens)
- **OpenAI GPT-3.5:** ~$0.50 per 1M tokens (3.5x more expensive)
- **OpenAI GPT-4:** ~$30 per 1M tokens (200x more expensive!)

**Steps:**

1. **Go to DeepSeek Platform:**
   ```
   https://platform.deepseek.com/
   ```

2. **Login** with your account

3. **Add Credits:**
   - Click on **Billing** or **Balance** section
   - Click **Add Credits** or **Top Up**
   - Add $5-10 (will last for thousands of requests)
   - Pay via card/payment method

4. **Verify Balance:**
   - Check balance is now > $0
   - You're ready to use!

5. **No code changes needed** - Just restart your app:
   ```bash
   # App will automatically use DeepSeek now that it has balance
   uvicorn app:app --host 0.0.0.0 --port 8080 --reload
   ```

---

### Option 2: Switch to OpenAI (If you already have OpenAI credits)

If you have OpenAI API credits, you can switch temporarily:

**Step 1: Get OpenAI API Key**

1. Go to: https://platform.openai.com/api-keys
2. Login to your OpenAI account
3. Click **Create new secret key**
4. Copy the API key (starts with `sk-...`)

**Step 2: Update `.env` file**

Add these lines to your `.env`:

```bash
# Switch to OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4 (more expensive)
```

**Step 3: Restart the app**

```bash
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

You'll see in the logs:
```
🤖 Using OpenAI API (Model: gpt-3.5-turbo)
```

---

### Option 3: Get Free Credits

**DeepSeek:**
- New signups usually get free trial credits
- Check if you have any unused trial credits

**OpenAI:**
- New signups get $5-18 free credits (expires in 3 months)
- Go to: https://platform.openai.com/signup

---

## 📝 Environment Configuration

### Using DeepSeek (Default - Cheaper):

```bash
# .env file
DEEPSEEK_API_KEY=sk-e4d46cc7308c49e994edc0d5b8f9ed37
# LLM_PROVIDER not set or set to "deepseek"
```

### Using OpenAI (Fallback):

```bash
# .env file
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4
```

---

## 🧪 Testing

### Test DeepSeek:
```bash
# Make sure .env has DEEPSEEK_API_KEY
# Remove or comment out LLM_PROVIDER line
curl -X POST "http://localhost:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"240611","message":"hello","context":{}}'
```

### Test OpenAI:
```bash
# Make sure .env has:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
curl -X POST "http://localhost:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"240611","message":"hello","context":{}}'
```

---

## 💰 Cost Comparison

For **1,000 typical chat requests** (average ~500 tokens each):

| Provider | Model | Cost | Notes |
|----------|-------|------|-------|
| DeepSeek | deepseek-chat | **$0.07** | ⭐ Cheapest |
| OpenAI | gpt-3.5-turbo | $0.25 | 3.5x more |
| OpenAI | gpt-4 | $15.00 | 200x more |

**Recommendation:** Use DeepSeek for most queries (way cheaper!)

Only use OpenAI GPT-4 if you need:
- Complex reasoning
- Very accurate responses
- Advanced capabilities

---

## 🔍 Check Balance

### DeepSeek Balance:
1. Go to: https://platform.deepseek.com/
2. Check **Balance** section
3. See remaining credits

### OpenAI Balance:
1. Go to: https://platform.openai.com/usage
2. Check current usage and limits
3. See remaining credits

---

## ⚠️ Troubleshooting

### Issue: "Insufficient Balance" even after adding credits
**Solution:**
1. Wait 1-2 minutes for credits to reflect
2. Restart your app
3. Check DeepSeek dashboard to confirm credits added

### Issue: OpenAI also shows insufficient balance
**Solution:**
1. Check https://platform.openai.com/usage
2. Add more credits if needed
3. Note: Free trial credits expire after 3 months

### Issue: Both APIs failing
**Solution:**
1. Check your API keys are correct
2. Check your internet connection
3. Check if services are down:
   - DeepSeek: https://status.deepseek.com/
   - OpenAI: https://status.openai.com/

---

## 📊 Monitoring Usage

### Set Up Alerts:

**DeepSeek:**
1. Go to account settings
2. Set up email alerts for low balance
3. Get notified before running out

**OpenAI:**
1. Go to https://platform.openai.com/account/limits
2. Set up usage alerts
3. Set monthly spending limits

---

## 🚀 Quick Fix Summary

**Fastest Solution:**

```bash
# 1. Add $5-10 to DeepSeek account
#    https://platform.deepseek.com/

# 2. Restart app
uvicorn app:app --host 0.0.0.0 --port 8080 --reload

# 3. Test
curl -X POST "http://localhost:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"240611","message":"hello","context":{}}'

# ✅ Done!
```

---

## 💡 Best Practices

1. **Monitor Balance:** Check balance regularly
2. **Set Alerts:** Get notified before running out
3. **Use Cheapest Model:** DeepSeek for simple queries
4. **Add Auto-Reload:** Set up automatic credit reloading
5. **Test Before Production:** Always test with small amounts first

---

## 📞 Support

**DeepSeek Support:**
- Email: support@deepseek.com
- Docs: https://platform.deepseek.com/docs

**OpenAI Support:**
- Help: https://help.openai.com/
- Docs: https://platform.openai.com/docs

---

**Summary:**
```
❌ Problem: Insufficient Balance
✅ Solution: Add $5-10 to DeepSeek (cheapest)
⚡ Fallback: Switch to OpenAI (more expensive)
```

**Cost:** DeepSeek is 3-200x cheaper than OpenAI - Use DeepSeek! 💰
