# NutriGenie — Testing Guide

## Local Testing

### Option 1 — OpenAI GPT (Recommended)
Free $5 credit, no daily limits, best JSON quality.

```bash
# Get API key from platform.openai.com
export OPENAI_API_KEY=your-key-here
python3 test_local.py
```

### Option 3 — Regression tests only (no LLM needed)

```bash
python3 test_regression.py
```

## Production Deployment (IOM AWS account)

1. Add payment method to AWS account
2. `sam build && sam deploy --guided`
3. Upload patients: `aws s3 cp patients/ s3://nutrigenie-data-{account-id}/patients/ --recursive`
4. Model: `LLM_MODEL_ID=us.amazon.nova-micro-v1:0`

## Cost (IOM production)

- Nova Micro: $0.000217 per generation (~₹0.018)
- 1000 generations/month: ~₹18
- Free tier: 1M tokens/month = ~593 free generations
