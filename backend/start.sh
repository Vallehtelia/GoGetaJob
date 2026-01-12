#!/bin/bash
export GGJ_NODE_ENV=development
export GGJ_PORT=3000
export GGJ_HOST=0.0.0.0
export GGJ_DB_NAME=gogetajob
export GGJ_DB_USER=ggj_user
export GGJ_DB_PASSWORD=dev_password_change_in_prod
export GGJ_DB_HOST=localhost
export GGJ_DB_PORT=5432
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
export GGJ_JWT_ACCESS_SECRET="dev_access_secret_min_32_chars_long_change_me_in_production"
export GGJ_JWT_REFRESH_SECRET="dev_refresh_secret_min_32_chars_long_change_me_in_production"
export GGJ_JWT_ACCESS_EXPIRES_IN=15m
export GGJ_JWT_REFRESH_EXPIRES_IN=7d
export GGJ_BCRYPT_ROUNDS=12
export GGJ_RATE_LIMIT_MAX=5
export GGJ_RATE_LIMIT_WINDOW=60000
export GGJ_CORS_ORIGINS="http://localhost:3001,http://localhost:3000,http://localhost:5173"
npm run dev
