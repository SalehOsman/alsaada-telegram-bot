-- Migration: Add minRole to DepartmentConfig and SubFeatureConfig
-- This allows flexible permission control at department and sub-feature levels

-- Add minRole to DepartmentConfig
ALTER TABLE DepartmentConfig ADD COLUMN minRole TEXT DEFAULT 'ADMIN';

-- Add minRole to SubFeatureConfig  
ALTER TABLE SubFeatureConfig ADD COLUMN minRole TEXT DEFAULT NULL;

-- Add comment explaining the fields
-- minRole can be: 'SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'
-- NULL in SubFeatureConfig means inherit from parent department
-- superAdminOnly is deprecated but kept for backward compatibility
