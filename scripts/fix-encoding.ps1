# Fix Arabic encoding in employee-filter-results.handler.ts
$filePath = "f:\_Alsaada_Telegram_Bot\telegram-bot-template-main\src\bot\features\hr-management\handlers\employee-filter-results.handler.ts"

# Read file content with UTF-8 encoding
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Common replacements for corrupted Arabic text
$replacements = @{
    '???' = 'نشط'
    '?? ?????' = 'في إجازة'
    '?????' = 'موقوف'
    '??????' = 'مستقيل'
    '?????' = 'مفصول'
    '??????' = 'متقاعد'
    '?? ???????' = 'في مأمورية'
    '????' = 'مصفى'
}

# Apply each replacement
foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

# Write back with UTF-8 encoding (no BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host "Encoding fixed successfully!"
