-- ينشئ قاعدة البيانات وحساب دخول مخصصاً للتطبيق بصلاحيات مقصورة على هذه القاعدة وحدها (db_owner لها
-- فقط، لازم لتطبيق الهجرات عند الإقلاع) بدل ربط التطبيق بحساب sa الذي يملك الخادم كله.
-- يُشغَّل مرة واحدة بحساب sa، ثم لا يُستخدم sa في التطبيق:
--   docker compose exec db /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$DB_SA_PASSWORD" \
--     -v AppUser="$DB_APP_USER" AppPassword="$DB_APP_PASSWORD" -i /dev/stdin < deploy/internal/create-app-login.sql

IF DB_ID(N'MhdLegal') IS NULL
    CREATE DATABASE [MhdLegal];
GO

IF SUSER_ID(N'$(AppUser)') IS NULL
    CREATE LOGIN [$(AppUser)] WITH PASSWORD = N'$(AppPassword)', CHECK_POLICY = ON, DEFAULT_DATABASE = [MhdLegal];
GO

USE [MhdLegal];
GO

IF USER_ID(N'$(AppUser)') IS NULL
    CREATE USER [$(AppUser)] FOR LOGIN [$(AppUser)];
GO

ALTER ROLE db_owner ADD MEMBER [$(AppUser)];
GO
