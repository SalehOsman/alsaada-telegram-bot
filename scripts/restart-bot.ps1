# سكريبت لإعادة تشغيل البوت بدون cache
Write-Host "🛑 إيقاف البوت..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

Write-Host "🗑️ حذف الـ build..." -ForegroundColor Yellow
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

Write-Host "🔨 إعادة التجميع..." -ForegroundColor Cyan
npm run build

Write-Host "✅ التجميع تم بنجاح" -ForegroundColor Green
Write-Host "▶️ تشغيل البوت..." -ForegroundColor Green
npm run dev
