-- Seed initial allowance types
-- البدلات الأساسية الأربعة

INSERT INTO HR_AllowanceType (code, nameAr, nameEn, isActive, orderIndex, createdAt, updatedAt)
VALUES 
  ('TRANSPORT', 'بدل مواصلات', 'Transport Allowance', 1, 1, datetime('now'), datetime('now')),
  ('VACATION', 'بدل إجازات', 'Vacation Allowance', 1, 2, datetime('now'), datetime('now')),
  ('OVERTIME', 'بدل إضافي', 'Overtime Allowance', 1, 3, datetime('now'), datetime('now')),
  ('OTHER', 'بدلات أخرى', 'Other Allowances', 1, 4, datetime('now'), datetime('now'))
ON CONFLICT(code) DO NOTHING;