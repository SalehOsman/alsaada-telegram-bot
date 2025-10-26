# Employee Filtering & Excel Export Feature

## 🎯 Overview

Added comprehensive employee filtering and Excel export functionality to the HR Management system.

---

## ✨ Features Implemented

### 1. **Advanced Employee Filtering**
Filter employees by:
- 🏢 **Department** - View employees by department with statistics
- 📍 **Governorate** - View employees by location
- 💼 **Position** - View employees by job title
- 📊 **Employment Status** - Filter by ACTIVE, ON_LEAVE, SUSPENDED, etc.
- 👥 **All** - View all employees without filter

### 2. **Smart Statistics**
Each filter view shows:
- Total employee count
- Active employees count
- Distribution by departments
- Status-based breakdowns

### 3. **Excel Export**
- 📥 Export filtered results to Excel
- 📥 Export all employees
- Professionally formatted Excel files
- RTL support for Arabic
- Includes:
  - Employee Code
  - Full Name
  - Department
  - Position
  - Governorate
  - Contact information
  - Employment status
  - Hire date
  - Address

---

## 📂 Files Created

1. **`employee-filters.handler.ts`** - Main filter selection menu
2. **`employee-filter-results.handler.ts`** - Display filtered results
3. **`employee-export.handler.ts`** - Excel export functionality

---

## 🔧 Installation

### **Step 1: Install ExcelJS Library**

```bash
npm install exceljs
npm install --save-dev @types/exceljs
```

### **Step 2: Restart the Bot**

The handlers are already registered. Just restart:

```bash
npm run dev
```

---

## 🎯 Usage Flow

```
📋 قوائم العاملين
  ↓
🔍 تصفية القوائم
  ↓
  ├─ 🏢 حسب القسم
  │   ↓
  │   Select Department
  │   ↓
  │   View Results + Statistics
  │   ↓
  │   📥 Export to Excel
  │
  ├─ 📍 حسب المحافظة
  │   ↓
  │   Select Governorate
  │   ↓
  │   View Results + Statistics
  │   ↓
  │   📥 Export to Excel
  │
  ├─ 💼 حسب الوظيفة
  │   ↓
  │   Select Position
  │   ↓
  │   View Results + Statistics
  │   ↓
  │   📥 Export to Excel
  │
  ├─ 📊 حسب حالة العمل
  │   ↓
  │   Select Status (ACTIVE, ON_LEAVE, etc.)
  │   ↓
  │   View Results + Statistics
  │   ↓
  │   📥 Export to Excel
  │
  └─ 👥 الكل (بدون تصفية)
      ↓
      View All Employees + Statistics
      ↓
      📥 Export All to Excel
```

---

## 📊 Excel File Format

### **Header:**
- Title: "عاملي قسم [Department Name]" (or filter type)
- Date: Current date in Arabic format

### **Columns:**
1. # (Number)
2. الاسم الكامل (Full Name)
3. الكود (Employee Code)
4. القسم (Department)
5. الوظيفة (Position)
6. المحافظة (Governorate)
7. الموبايل (Mobile)
8. الهاتف (Phone)
9. البريد الإلكتروني (Email)
10. الحالة (Status)
11. تاريخ التعيين (Hire Date)
12. العنوان (Address)

### **Formatting:**
- ✅ RTL (Right-to-Left) for Arabic
- ✅ Professional styling with colors
- ✅ Alternate row colors for readability
- ✅ Borders and proper alignment
- ✅ Auto-sized columns
- ✅ Summary row with total count

---

## 🎨 Features

### **Filter Menu:**
```
🔍 تصفية قوائم العاملين

اختر نوع التصفية المطلوب:

• حسب القسم - عرض العاملين حسب القسم
• حسب المحافظة - عرض العاملين حسب المحافظة
• حسب الوظيفة - عرض العاملين حسب الوظيفة
• حسب حالة العمل - نشط، في إجازة، إلخ
• الكل - عرض جميع العاملين

📥 يمكنك أيضاً تصدير القائمة إلى Excel
```

### **Example: Department Filter Result:**
```
🏢 القسم: الإدارة الهندسية

📊 الإحصائيات:
• إجمالي العاملين: 15
• نشطين: 12
• في إجازة: 3

👥 قائمة العاملين (15):

1. ✅ أحمد محمد علي
   💼 مهندس مساحة
   📍 القاهرة
   📱 01234567890

2. ✅ محمد حسن إبراهيم
   💼 مساح
   📍 الجيزة
   📱 01098765432

...
```

---

## 🔒 Permissions

- **SUPER_ADMIN:** ✅ Full access to all filters and export
- **ADMIN:** ✅ Full access to all filters and export
- **USER:** ❌ Cannot access HR section (as per your requirement)

---

## 📝 Session Data

The system stores the last applied filter in the session for easy re-export:

```typescript
ctx.session.lastFilter = {
  type: 'department',  // or 'governorate', 'position', 'status', 'all'
  value: 5,           // ID of the selected item
  name: 'الإدارة الهندسية'  // Display name
}
```

---

## ✅ Testing Checklist

- [ ] View filters menu
- [ ] Filter by department → See results
- [ ] Filter by governorate → See results
- [ ] Filter by position → See results  
- [ ] Filter by status → See results
- [ ] View all employees
- [ ] Export department to Excel
- [ ] Export governorate to Excel
- [ ] Export position to Excel
- [ ] Export status to Excel
- [ ] Export all to Excel
- [ ] Verify Excel file formatting
- [ ] Verify Arabic text displays correctly in Excel
- [ ] Verify statistics are accurate

---

## 🚀 Next Steps

1. Install ExcelJS: `npm install exceljs`
2. Restart bot: `npm run dev`
3. Test the new filtering features
4. Export some data to Excel and verify formatting

---

**Date:** 2025-10-25  
**Status:** ✅ Ready for Testing (pending ExcelJS installation)
