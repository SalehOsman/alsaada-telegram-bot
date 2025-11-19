# PowerShell script to apply migrations and regenerate Prisma Client

Write-Host "🔄 Applying Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate dev --name add_all_missing_fields

Write-Host "`n✅ Migrations applied successfully!" -ForegroundColor Green

Write-Host "`n🔄 Regenerating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "`n✅ Prisma Client regenerated!" -ForegroundColor Green

Write-Host "`n🎉 All done! You can now run 'npm run dev' to start the bot." -ForegroundColor Yellow

