# 📊 خرائط تدفق البيانات والمنطق
## Data Flow Diagrams & Flowcharts

> **الغرض:** توضيح سير عمل نظام الرواتب بصرياً  
> **الجمهور:** جميع المستويات التقنية

---

## 📋 الفهرس

1. [نظرة عامة على النظام](#نظرة-عامة-على-النظام)
2. [تدفق حساب الرواتب](#تدفق-حساب-الرواتب)
3. [تدفق المسحوبات العينية](#تدفق-المسحوبات-العينية)
4. [تدفق البيانات في قاعدة البيانات](#تدفق-البيانات-في-قاعدة-البيانات)
5. [سيناريوهات الاستخدام](#سيناريوهات-الاستخدام)

---

## نظرة عامة على النظام

### البنية الأساسية

```mermaid
graph TB
    User[👤 المستخدم] -->|يطلب حساب راتب| Bot[🤖 Telegram Bot]
    Bot -->|يستدعي| Handler[📝 payroll-calculate.handler]
    
    Handler -->|يقرأ من| DB[(🗄️ قاعدة البيانات)]
    DB -->|Employee| Handler
    DB -->|Transactions| Handler
    DB -->|Entitlements| Handler
    DB -->|Allowances| Handler
    
    Handler -->|يحسب| Calculator[🧮 حاسبة الرواتب]
    Calculator -->|البدلات| Allowances[💵 البدلات]
    Calculator -->|الخصومات| Deductions[💸 الخصومات]
    Calculator -->|الصافي| NetSalary[💰 الراتب الصافي]
    
    NetSalary -->|يحفظ في| DB
    NetSalary -->|يعرض على| Bot
    Bot -->|يرسل التقرير| User
    
    style User fill:#e1f5ff
    style Bot fill:#fff4e1
    style Handler fill:#ffe1e1
    style DB fill:#e1ffe1
    style Calculator fill:#f0e1ff
    style NetSalary fill:#ffe1f0
```

---

## تدفق حساب الرواتب

### المخطط الشامل

```mermaid
flowchart TD
    Start([بدء حساب الراتب]) --> GetEmployee[جلب بيانات الموظف]
    GetEmployee --> ValidateEmployee{الموظف موجود؟}
    
    ValidateEmployee -->|لا| ErrorEmployee[❌ خطأ: موظف غير موجود]
    ValidateEmployee -->|نعم| CalculatePeriod[حساب فترة الراتب]
    
    CalculatePeriod --> GetWorkDays[حساب أيام العمل الفعلية]
    GetWorkDays --> CalculateBasic[حساب الراتب الأساسي]
    
    CalculateBasic --> CalculateAllowances[حساب البدلات]
    
    CalculateAllowances --> PositionAllowance[بدل المنصب]
    CalculateAllowances --> EmployeeAllowance[بدل الموظف]
    CalculateAllowances --> MaterialAllowance[بدل المسحوبات]
    CalculateAllowances --> OtherAllowance[بدلات أخرى]
    
    PositionAllowance --> SumAllowances[جمع البدلات]
    EmployeeAllowance --> SumAllowances
    MaterialAllowance --> SumAllowances
    OtherAllowance --> SumAllowances
    
    SumAllowances --> CalculateBonuses[حساب المكافآت]
    
    CalculateBonuses --> CalculateDeductions[حساب الخصومات]
    
    CalculateDeductions --> CashAdvances[السلف النقدية]
    CalculateDeductions --> MaterialDeductions[خصم المسحوبات الزائدة]
    CalculateDeductions --> Debts[الديون السابقة]
    CalculateDeductions --> OtherDeductions[خصومات أخرى]
    
    CashAdvances --> SumDeductions[جمع الخصومات]
    MaterialDeductions --> SumDeductions
    Debts --> SumDeductions
    OtherDeductions --> SumDeductions
    
    SumDeductions --> CalculateNet[حساب الصافي]
    
    CalculateNet --> BuildReport[بناء التقرير]
    BuildReport --> SaveRecord[حفظ السجل]
    SaveRecord --> DisplayReport[عرض التقرير]
    
    DisplayReport --> SettlementOptions{خيارات التسوية}
    
    SettlementOptions -->|استلام كامل| NormalSettlement[✅ تسوية عادية]
    SettlementOptions -->|استلام جزئي| PartialSettlement[⚠️ تسوية جزئية]
    SettlementOptions -->|إلغاء| Cancel[❌ إلغاء]
    
    NormalSettlement --> SaveFinal[حفظ نهائي]
    PartialSettlement --> SaveFinal
    
    SaveFinal --> End([انتهى])
    Cancel --> End
    ErrorEmployee --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1ffe1
    style ErrorEmployee fill:#ffe1e1
    style CalculateNet fill:#ffe1f0
    style SaveFinal fill:#e1ffe1
```

---

## تدفق المسحوبات العينية

### التدفق الحالي (المشكلة)

```mermaid
flowchart TD
    Start([بدء حساب المسحوبات]) --> FetchWithdrawals[جلب المسحوبات من DB]
    FetchWithdrawals --> FetchEntitlements[جلب الاستحقاقات]
    
    FetchEntitlements --> GroupByItem[تجميع حسب الصنف]
    
    GroupByItem --> LoopItems{لكل صنف}
    
    LoopItems -->|صنف| GetWithdrawn[المسحوب = X]
    GetWithdrawn --> GetEntitled[الاستحقاق = Y]
    
    GetEntitled --> CalcAllowance[البدل = min X Y × السعر]
    
    CalcAllowance --> CheckExcess{المسحوب > الاستحقاق؟}
    
    CheckExcess -->|نعم| ShowWarning[⚠️ عرض تحذير]
    CheckExcess -->|لا| AddAllowance[إضافة للبدلات]
    
    ShowWarning --> ProblemHere[❌ المشكلة: لا يوجد خصم!]
    ProblemHere --> AddAllowance
    
    AddAllowance --> MoreItems{يوجد المزيد؟}
    
    MoreItems -->|نعم| LoopItems
    MoreItems -->|لا| Return[إرجاع البدلات فقط]
    
    Return --> End([انتهى])
    
    style Start fill:#e1f5ff
    style ProblemHere fill:#ffe1e1
    style ShowWarning fill:#fff4e1
    style End fill:#ffe1e1
```

### التدفق المصحح (الحل)

```mermaid
flowchart TD
    Start([بدء حساب المسحوبات]) --> FetchWithdrawals[جلب المسحوبات من DB]
    FetchWithdrawals --> FetchEntitlements[جلب الاستحقاقات]
    
    FetchEntitlements --> GroupByItem[تجميع حسب الصنف]
    
    GroupByItem --> LoopItems{لكل صنف}
    
    LoopItems -->|صنف| GetWithdrawn[المسحوب = X]
    GetWithdrawn --> GetEntitled[الاستحقاق = Y]
    
    GetEntitled --> CheckExcess{المسحوب > الاستحقاق؟}
    
    CheckExcess -->|لا| CalcAllowanceOnly[البدل = X × السعر]
    CalcAllowanceOnly --> AddAllowance[إضافة للبدلات]
    
    CheckExcess -->|نعم| CalcAllowancePart[البدل = Y × السعر]
    CalcAllowancePart --> CalcDeduction[✅ الخصم = X - Y × السعر]
    
    CalcDeduction --> AddAllowance
    CalcDeduction --> AddDeduction[✅ إضافة للخصومات]
    
    AddAllowance --> AddWarning[⚠️ إضافة تحذير]
    AddDeduction --> AddWarning
    
    AddWarning --> MoreItems{يوجد المزيد؟}
    
    MoreItems -->|نعم| LoopItems
    MoreItems -->|لا| Return[إرجاع البدلات + الخصومات]
    
    Return --> End([انتهى ✅])
    
    style Start fill:#e1f5ff
    style CalcDeduction fill:#e1ffe1
    style AddDeduction fill:#e1ffe1
    style End fill:#e1ffe1
```

---

## تدفق البيانات في قاعدة البيانات

### علاقات الجداول

```mermaid
erDiagram
    Employee ||--o{ HR_PayrollRecord : "has"
    Employee ||--o{ HR_Transaction : "makes"
    Employee ||--o{ HR_EmployeeAllowance : "has"
    Employee ||--o{ HR_Bonus : "receives"
    
    HR_PayrollRecord {
        int id PK
        int employeeId FK
        int month
        int year
        decimal basicSalary
        decimal totalAllowances
        decimal totalDeductions
        decimal netSalary
        datetime createdAt
    }
    
    HR_Transaction {
        int id PK
        int employeeId FK
        string transactionType
        decimal amount
        int quantity
        int itemId FK
        string status
        datetime createdAt
    }
    
    HR_EmployeeAllowance {
        int id PK
        int employeeId FK
        int allowanceTypeId FK
        decimal amount
        boolean isActive
    }
    
    HR_MaterialEntitlement {
        int id PK
        string targetType
        int targetId
        int itemId FK
        decimal dailyQuantity
        decimal quantity
        boolean isActive
    }
    
    Item ||--o{ HR_Transaction : "used in"
    Item ||--o{ HR_MaterialEntitlement : "defines"
    
    Item {
        int id PK
        string nameAr
        decimal price
        string unit
    }
```

### مسار البيانات من DB إلى التقرير

```mermaid
sequenceDiagram
    participant Handler as payroll-calculate.handler
    participant DB as Database
    participant Calc as Calculator
    participant Report as Report Builder
    
    Handler->>DB: جلب بيانات الموظف
    DB-->>Handler: Employee
    
    Handler->>DB: جلب المعاملات (Transactions)
    DB-->>Handler: List<Transaction>
    
    Handler->>DB: جلب الاستحقاقات (Entitlements)
    DB-->>Handler: List<Entitlement>
    
    Handler->>DB: جلب البدلات (Allowances)
    DB-->>Handler: List<Allowance>
    
    Handler->>Calc: حساب الراتب الأساسي
    Calc-->>Handler: basicSalary
    
    Handler->>Calc: حساب البدلات
    Calc-->>Handler: totalAllowances
    
    Handler->>Calc: حساب الخصومات
    Calc-->>Handler: totalDeductions
    
    Handler->>Calc: حساب الصافي
    Calc-->>Handler: netSalary
    
    Handler->>Report: بناء التقرير
    Report-->>Handler: reportText
    
    Handler->>DB: حفظ السجل (PayrollRecord)
    DB-->>Handler: saved
    
    Handler->>User: عرض التقرير
```

---

## سيناريوهات الاستخدام

### السيناريو 1: راتب عادي (بدون مشاكل)

```mermaid
flowchart LR
    Input[المدخلات] --> Process[المعالجة] --> Output[المخرجات]
    
    subgraph Input
        E1[الموظف: أحمد]
        E2[الراتب الأساسي: 5000]
        E3[أيام العمل: 30]
        E4[بدل منصب: 500]
        E5[بدل موظف: 200]
        E6[مسحوبات: 1 علبة]
        E7[استحقاق: 1 علبة]
    end
    
    subgraph Process
        P1[الأساسي = 5000]
        P2[البدلات = 500 + 200 + 55]
        P3[الخصومات = 0]
        P4[الصافي = 5000 + 755]
    end
    
    subgraph Output
        O1[الراتب الصافي: 5755 ج]
        O2[✅ لا توجد مشاكل]
    end
    
    style Input fill:#e1f5ff
    style Process fill:#fff4e1
    style Output fill:#e1ffe1
```

### السيناريو 2: راتب مع زيادة في المسحوبات

```mermaid
flowchart LR
    Input[المدخلات] --> Process[المعالجة] --> Output[المخرجات]
    
    subgraph Input
        E1[الموظف: صالح]
        E2[الراتب الأساسي: 4000]
        E3[أيام العمل: 30]
        E4[بدل منصب: 0]
        E5[بدل موظف: 0]
        E6[مسحوبات: 5 علبات]
        E7[استحقاق: 1 علبة]
    end
    
    subgraph Process
        P1[الأساسي = 4000]
        P2[البدلات = 0 + 0 + 55]
        P3[الخصومات = 220]
        P4[الصافي = 4000 + 55 - 220]
    end
    
    subgraph Output
        O1[الراتب الصافي: 3835 ج]
        O2[⚠️ تحذير: زيادة 4 علبات]
    end
    
    style Input fill:#e1f5ff
    style Process fill:#fff4e1
    style Output fill:#ffe1f0
```

### السيناريو 3: راتب مع سلفة

```mermaid
flowchart LR
    Input[المدخلات] --> Process[المعالجة] --> Output[المخرجات]
    
    subgraph Input
        E1[الموظف: محمد]
        E2[الراتب الأساسي: 6000]
        E3[أيام العمل: 30]
        E4[بدل منصب: 800]
        E5[سلفة نقدية: 2000]
    end
    
    subgraph Process
        P1[الأساسي = 6000]
        P2[البدلات = 800]
        P3[الخصومات = 2000]
        P4[الصافي = 6000 + 800 - 2000]
    end
    
    subgraph Output
        O1[الراتب الصافي: 4800 ج]
        O2[ℹ️ تم خصم السلفة]
    end
    
    style Input fill:#e1f5ff
    style Process fill:#fff4e1
    style Output fill:#e1ffe1
```

### السيناريو 4: تسوية جزئية (دين)

```mermaid
flowchart TD
    Start([بدء]) --> Calculate[حساب الراتب]
    
    Calculate --> NetSalary[الصافي = 5000 ج]
    
    NetSalary --> SettlementChoice{خيار الموظف}
    
    SettlementChoice -->|استلام كامل| FullPay[استلام 5000 ج]
    SettlementChoice -->|استلام جزئي| PartialPay[استلام 3000 ج]
    
    FullPay --> SaveNormal[حفظ كسجل عادي]
    
    PartialPay --> CreateDebt[إنشاء دين = 2000 ج]
    CreateDebt --> SavePartial[حفظ السجل + الدين]
    
    SavePartial --> FutureMonth[الشهر القادم]
    FutureMonth --> AutoDeduct[خصم تلقائي للدين]
    
    SaveNormal --> End([انتهى])
    AutoDeduct --> End
    
    style Start fill:#e1f5ff
    style PartialPay fill:#fff4e1
    style CreateDebt fill:#ffe1e1
    style End fill:#e1ffe1
```

---

## الحالات الخاصة

### معالجة الأخطاء

```mermaid
flowchart TD
    Start([بدء]) --> CheckEmployee{موظف موجود؟}
    
    CheckEmployee -->|لا| Error1[❌ خطأ: موظف غير موجود]
    CheckEmployee -->|نعم| CheckActive{موظف نشط؟}
    
    CheckActive -->|لا| Error2[❌ خطأ: موظف غير نشط]
    CheckActive -->|نعم| CheckSalary{راتب محدد؟}
    
    CheckSalary -->|لا| Error3[❌ خطأ: راتب غير محدد]
    CheckSalary -->|نعم| CheckDuplicate{سجل موجود؟}
    
    CheckDuplicate -->|نعم| Warning[⚠️ تحذير: سيتم التحديث]
    CheckDuplicate -->|لا| Process[✅ متابعة الحساب]
    
    Warning --> Confirm{تأكيد؟}
    Confirm -->|نعم| Process
    Confirm -->|لا| Cancel[❌ إلغاء]
    
    Process --> Success[✅ نجح]
    
    Error1 --> End([انتهى])
    Error2 --> End
    Error3 --> End
    Cancel --> End
    Success --> End
    
    style Error1 fill:#ffe1e1
    style Error2 fill:#ffe1e1
    style Error3 fill:#ffe1e1
    style Warning fill:#fff4e1
    style Success fill:#e1ffe1
```

---

## المقارنة: قبل وبعد الإصلاح

### قبل الإصلاح

```mermaid
flowchart LR
    subgraph Before["❌ قبل الإصلاح"]
        B1[المسحوب: 5 علبات]
        B2[الاستحقاق: 1 علبة]
        B3[البدل: 275 ج]
        B4[الخصم: 0 ج]
        B5[الصافي: أساسي + 275]
        
        B1 --> B3
        B2 --> B3
        B3 --> B5
        B4 --> B5
        
        style B4 fill:#ffe1e1
        style B5 fill:#ffe1e1
    end
```

### بعد الإصلاح

```mermaid
flowchart LR
    subgraph After["✅ بعد الإصلاح"]
        A1[المسحوب: 5 علبات]
        A2[الاستحقاق: 1 علبة]
        A3[البدل: 55 ج]
        A4[الخصم: 220 ج]
        A5[الصافي: أساسي - 165]
        
        A1 --> A3
        A2 --> A3
        A1 --> A4
        A2 --> A4
        A3 --> A5
        A4 --> A5
        
        style A3 fill:#e1ffe1
        style A4 fill:#e1ffe1
        style A5 fill:#e1ffe1
    end
```

---

## خريطة التدفق الزمني

```mermaid
gantt
    title خط زمني لمعالجة الراتب
    dateFormat X
    axisFormat %s
    
    section جلب البيانات
    بيانات الموظف         :0, 100
    المعاملات              :100, 200
    الاستحقاقات            :200, 150
    
    section الحسابات
    الراتب الأساسي         :350, 50
    البدلات                :400, 100
    المسحوبات العينية      :500, 150
    الخصومات               :650, 100
    
    section النتيجة
    حساب الصافي            :750, 50
    بناء التقرير           :800, 100
    حفظ السجل              :900, 100
    عرض النتيجة            :1000, 50
```

---

## الملخص

### النقاط الرئيسية:

```
✅ التدفق العام:
   جلب البيانات → الحساب → الحفظ → العرض

✅ المكونات الأساسية:
   الراتب الأساسي + البدلات - الخصومات = الصافي

⚠️ المشكلة المكتشفة:
   المسحوبات الزائدة لا تُخصم

✅ الحل:
   إضافة منطق الخصم للزيادة
```

---

**روابط ذات صلة:**
- [03_DATABASE_ANALYSIS.md](./03_DATABASE_ANALYSIS.md) - تحليل قاعدة البيانات
- [04_FILES_ANALYSIS.md](./04_FILES_ANALYSIS.md) - تحليل الملفات
- [05_BUSINESS_LOGIC_ANALYSIS.md](./05_BUSINESS_LOGIC_ANALYSIS.md) - تحليل المنطق

