#!/bin/bash

# Safe Environment Variable Addition Script
# This script safely adds new environment variables to .env files
# without overwriting existing values

ENV_FILE="${1:-server/.env}"
VAR_NAME="$2"
VAR_VALUE="$3"

if [ -z "$VAR_NAME" ] || [ -z "$VAR_VALUE" ]; then
    echo "Usage: $0 [env_file] VARIABLE_NAME value"
    echo "Example: $0 server/.env OPENAI_API_KEY sk-xxxxx"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file: $ENV_FILE"
    touch "$ENV_FILE"
fi

# Check if variable already exists
if grep -q "^${VAR_NAME}=" "$ENV_FILE"; then
    echo "⚠️  Variable $VAR_NAME already exists in $ENV_FILE"
    echo "Current value: $(grep "^${VAR_NAME}=" "$ENV_FILE")"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${VAR_NAME}=.*|${VAR_NAME}=${VAR_VALUE}|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${VAR_VALUE}|" "$ENV_FILE"
        fi
        echo "✅ Updated $VAR_NAME in $ENV_FILE"
    else
        echo "❌ Skipped updating $VAR_NAME"
    fi
else
    # Add new variable
    echo "${VAR_NAME}=${VAR_VALUE}" >> "$ENV_FILE"
    echo "✅ Added $VAR_NAME to $ENV_FILE"
fi










