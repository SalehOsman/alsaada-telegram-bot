# **🗄️ تصميم قاعدة البيانات \- نظام المخازن (V2)**

الإصدار: 2.0 (يشمل التكلفة والموردين)  
التاريخ: 8 نوفمبر 2025

## **1\. مخطط العلاقات (ERD \- Mermaid)**

erDiagram  
    Warehouse {  
        int id PK  
        string name  
        WarehouseType type  
    }

    ItemCategory {  
        int id PK  
        string name  
        WarehouseType warehouseType  
    }

    Item {  
        int id PK  
        string name  
        string sku UK "Barcode"  
        string unit  
        int categoryId FK  
        int lowStockThreshold  
    }

    Supplier {  
        int id PK  
        string name  
        string contactPerson  
        string phone  
        string taxNumber  
    }

    Stock {  
        int id PK  
        int warehouseId FK  
        int itemId FK  
        float quantity  
        float averageCost "WAC"  
    }

    PurchaseOrder {  
        int id PK  
        int supplierId FK  
        datetime orderDate  
        string invoiceNumber  
        float totalAmount  
    }

    StockTransaction {  
        int id PK  
        int stockId FK  
        TransactionType type  
        float quantity  
        datetime date  
        float unitPrice "Cost at time of TX"  
        int purchaseOrderId FK  
    }

    TransactionLink {  
        int id PK  
        int stockTransactionId FK  
        int employeeId FK "HR Employee"  
        int equipmentId FK "Equipment"  
        int projectId FK "Project"  
    }

    EmployeeCustody {  
        int id PK  
        int employeeId FK "HR Employee"  
        int itemId FK  
        float quantity  
        datetime dateIssued  
        datetime dateReturned  
        int stockTransactionId FK  
    }

    ItemCategory ||--|{ Item : "تصنف"  
    Warehouse ||--|{ Stock : "تحتوي على"  
    Item ||--|{ Stock : "له رصيد"  
    Item ||--|{ EmployeeCustody : "عهدة"  
    Stock ||--|{ StockTransaction : "تحدث بـ"  
    Supplier ||--|{ PurchaseOrder : "تصدر"  
    PurchaseOrder ||--o{ StockTransaction : "ترتبط بـ"  
    StockTransaction ||--|{ TransactionLink : "تُربط بـ"

## **2\. تفاصيل الجداول**

### **المجموعة 1: كيانات المخزن (The Setup)**

#### **1\. Warehouse (المخزن)**

يُعرف المخازن الفعلية أو الافتراضية.

* id (PK)  
* name (String): "مخزن قطع الغيار الرئيسي"، "مخزن زيوت الموقع A"، "تانك السولار المتنقل".  
* type (Enum: WarehouseType): نوع المخزن (SPARE\_PARTS, FUEL, OILS\_GREASE, TOOLS).

#### **2\. ItemCategory (فئة الصنف)**

لتصنيف الأصناف داخل الكتالوج.

* id (PK)  
* name (String): "فلاتر"، "زيوت محركات"، "أدوات يدوية".  
* warehouseType (Enum: WarehouseType): لربط الفئة بنوع المخزن لتسهيل الفلترة.

#### **3\. Item (الصنف \- الكتالوج الرئيسي)**

كتالوج موحد لجميع الأصناف التي تتعامل معها الشركة.

* id (PK)  
* name (String): "فلتر زيت CAT 1R-0739".  
* sku (String, @unique): **(الباركود)** رقم الصنف الفريد.  
* unit (String): "قطعة"، "لتر"، "جالون"، "متر".  
* categoryId (FK \-\> ItemCategory.id).  
* lowStockThreshold (Int): حد إعادة الطلب (مثال: 5).

#### **4\. Supplier (المورد)**

سجل الموردين الذين يتم الشراء منهم.

* id (PK)  
* name (String): "شركة الأمل للتجارة".  
* contactPerson (String, nullable).  
* phone (String, nullable).  
* taxNumber (String, nullable): الرقم الضريبي (مهم للحسابات).  
* address (String, nullable).

### **المجموعة 2: الرصيد والتكلفة (The Balance & Costing)**

#### **5\. Stock (الرصيد)**

الجدول الحيوي الذي يوضح الرصيد الحالي والتكلفة الحالية.

* id (PK)  
* warehouseId (FK \-\> Warehouse.id).  
* itemId (FK \-\> Item.id).  
* quantity (Float): الكمية المتاحة حالياً.  
* averageCost (Float): **(التكلفة)** متوسط التكلفة المرجح (WAC) للقطعة الواحدة.  
* @@unique(\[warehouseId, itemId\]) (لا يمكن تكرار الصنف في نفس المخزن).

### **المجموعة 3: الحركات (The Movements)**

#### **6\. PurchaseOrder (أمر الشراء)**

لتجميع حركات الشراء وربطها بفاتورة ومورد.

* id (PK)  
* supplierId (FK \-\> Supplier.id).  
* orderDate (DateTime): تاريخ الفاتورة.  
* invoiceNumber (String, nullable): رقم فاتورة المورد.  
* totalAmount (Float, nullable): القيمة الإجمالية للفاتورة (للمراجعة المحاسبية).

#### **7\. StockTransaction (حركة المخزون)**

سجل аудиت (Audit Log) لجميع الحركات التي أثرت على الأرصدة.

* id (PK)  
* stockId (FK \-\> Stock.id): يحدد الصنف والمخزن.  
* type (Enum: TransactionType): PURCHASE\_IN, CONSUMPTION\_OUT, CUSTODY\_OUT, RETURN\_IN.  
* quantity (Float): الكمية (موجبة للإضافة، سالبة للصرف).  
* date (DateTime): تاريخ الحركة.  
* unitPrice (Float, nullable): **(التكلفة)** سعر الوحدة.  
  * عند PURCHASE\_IN: هو سعر الشراء.  
  * عند CONSUMPTION\_OUT / CUSTODY\_OUT: هو averageCost من جدول Stock وقت الصرف.  
* purchaseOrderId (Int, nullable, FK \-\> PurchaseOrder.id): لربط حركة الشراء بالفاتورة.  
* notes (String, nullable).

#### **8\. TransactionLink (بيان ربط الحركة)**

**"عقل" النظام.** يوضح سبب كل حركة صرف.

* id (PK)  
* stockTransactionId (FK \-\> StockTransaction.id).  
* employeeId (Int, FK \-\> Employee.id): الموظف المستلم (الربط مع HR \[cite: Documentation\_Pro/HR-Management/03\_DATABASE\_SCHEMA.md\]).  
* equipmentId (Int, nullable, FK \-\> Equipment.id): المعدة المستهلكة (جدول مستقبلي).  
* projectId (Int, nullable, FK \-\> Project.id): المشروع الموجه له التكلفة (جدول موجود \[cite: prisma/schema.prisma\]).

### **المجموعة 4: العهدة (The Custody)**

#### **9\. EmployeeCustody (عهدة الموظف)**

يتتبع الأصناف غير المستهلكة الموجودة مع الموظفين.

* id (PK)  
* employeeId (Int, FK \-\> Employee.id): الموظف (الربط مع HR \[cite: Documentation\_Pro/HR-Management/03\_DATABASE\_SCHEMA.md\]).  
* itemId (FK \-\> Item.id): الصنف الذي في عهدته (مثل "صندوق أدوات").  
* quantity (Float): الكمية.  
* dateIssued (DateTime): تاريخ استلام العهدة.  
* dateReturned (DateTime, nullable): تاريخ الإرجاع (يبقى null طالما العهدة معه).  
* stockTransactionId (FK \-\> StockTransaction.id): رقم حركة الصرف الأصلية.