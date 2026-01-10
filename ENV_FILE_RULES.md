# Environment File (.env) Protection Rules

## ⚠️ CRITICAL RULE: Never Overwrite .env Files

This project has a strict rule: **NEVER overwrite or delete existing `.env` files**.

## Why This Rule Exists

- `.env` files contain sensitive API keys and configuration
- Overwriting them can cause loss of important credentials
- Users may have spent time configuring their environment

## Safe Practices

### ✅ DO:
1. **Read existing .env files first** before making any changes
2. **Append new variables** that don't already exist
3. **Update specific lines** using targeted replacements
4. **Create .env.example** as a template (this is safe to overwrite)
5. **Provide instructions** for manual editing when needed

### ❌ DON'T:
1. **Never use `cat > .env`** or similar commands that overwrite files
2. **Never delete .env files**
3. **Never replace entire .env file contents**
4. **Never assume .env is empty or doesn't exist**

## How to Safely Add/Update Environment Variables

### Option 1: Manual Instructions
Provide clear instructions for the user to edit manually:
```bash
# Add this line to your .env file:
NEW_VARIABLE=value
```

### Option 2: Targeted Replacement
If a variable already exists, update only that line:
```javascript
// Use search_replace to update specific line
search_replace('.env', 'OLD_VALUE=old', 'OLD_VALUE=new')
```

### Option 3: Append New Variables
If adding a new variable, append it:
```bash
# Check if variable exists first
if ! grep -q "NEW_VARIABLE" .env; then
  echo "NEW_VARIABLE=value" >> .env
fi
```

## Current .env Structure

The project uses `.env` files in:
- `server/.env` - Backend API keys and configuration
- `.env` (root) - Frontend configuration (if needed)

Both are in `.gitignore` and should never be committed.

## Recovery

If a `.env` file is accidentally overwritten:
1. Check git history (if it was ever committed - unlikely)
2. Check browser history for API key confirmation pages
3. Check password manager for saved credentials
4. Re-generate API keys from respective services if needed

## Template Files

- `.env.example` files are safe to create/update
- These serve as templates for new users
- Never contain actual API keys










