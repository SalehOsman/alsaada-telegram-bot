import { Database } from '../../src/modules/database/index.js'

export async function seedEquipment() {
  console.log('🔧 Seeding equipment data...')

  try {
    // الحصول على أنواع المعدات الموجودة
    const equipmentTypes = await Database.prisma.equipmentType.findMany({
      take: 10,
      orderBy: { id: 'asc' },
    })

    if (equipmentTypes.length === 0) {
      console.log('⚠️ No equipment types found. Please seed equipment types first.')
      return
    }

    // بيانات تجريبية للمعدات
    const equipmentData = [
      // سيارات
      {
        equipmentTypeId: equipmentTypes[0].id,
        code: 'VEH-001',
        nameAr: 'سيارة نقل تويوتا هايلوكس',
        nameEn: 'Toyota Hilux Pickup',
        plateNumber: 'أ ب ج ١٢٣٤',
        serialNumber: 'SN-VEH-001-2024',
        manufacturer: 'Toyota',
        model: 'Hilux 2023',
        yearOfManufacture: 2023,
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        condition: 'GOOD',
        currentLocation: 'المخزن الرئيسي',
        color: 'أبيض',
      },
      {
        equipmentTypeId: equipmentTypes[0].id,
        code: 'VEH-002',
        nameAr: 'سيارة نقل نيسان نافارا',
        nameEn: 'Nissan Navara',
        plateNumber: 'د هـ و ٥٦٧٨',
        serialNumber: 'SN-VEH-002-2024',
        manufacturer: 'Nissan',
        model: 'Navara 2022',
        yearOfManufacture: 2022,
        fuelType: 'DIESEL',
        status: 'IN_USE',
        condition: 'GOOD',
        currentLocation: 'موقع المشروع A',
        color: 'فضي',
      },

      // لودرات
      {
        equipmentTypeId: equipmentTypes.length > 1 ? equipmentTypes[1].id : equipmentTypes[0].id,
        code: 'LDR-001',
        nameAr: 'لودر كاتربيلر 950',
        nameEn: 'Caterpillar 950 Loader',
        serialNumber: 'SN-LDR-001-2024',
        manufacturer: 'Caterpillar',
        model: '950H',
        yearOfManufacture: 2020,
        capacity: '3.5 متر مكعب',
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        condition: 'GOOD',
        currentLocation: 'المخزن الرئيسي',
        totalWorkingHours: 1250,
      },
      {
        equipmentTypeId: equipmentTypes.length > 1 ? equipmentTypes[1].id : equipmentTypes[0].id,
        code: 'LDR-002',
        nameAr: 'لودر فولفو L90',
        nameEn: 'Volvo L90 Loader',
        serialNumber: 'SN-LDR-002-2024',
        manufacturer: 'Volvo',
        model: 'L90H',
        yearOfManufacture: 2019,
        capacity: '3.0 متر مكعب',
        fuelType: 'DIESEL',
        status: 'MAINTENANCE',
        condition: 'FAIR',
        currentLocation: 'ورشة الصيانة',
        totalWorkingHours: 2840,
      },

      // بلدوزرات
      {
        equipmentTypeId: equipmentTypes.length > 2 ? equipmentTypes[2].id : equipmentTypes[0].id,
        code: 'BLD-001',
        nameAr: 'بلدوزر كاتربيلر D6',
        nameEn: 'Caterpillar D6 Bulldozer',
        serialNumber: 'SN-BLD-001-2024',
        manufacturer: 'Caterpillar',
        model: 'D6T',
        yearOfManufacture: 2021,
        fuelType: 'DIESEL',
        status: 'IN_USE',
        condition: 'EXCELLENT',
        currentLocation: 'موقع المشروع B',
        totalWorkingHours: 980,
      },

      // حفارات
      {
        equipmentTypeId: equipmentTypes.length > 3 ? equipmentTypes[3].id : equipmentTypes[0].id,
        code: 'EXC-001',
        nameAr: 'حفار كوماتسو PC200',
        nameEn: 'Komatsu PC200 Excavator',
        serialNumber: 'SN-EXC-001-2024',
        manufacturer: 'Komatsu',
        model: 'PC200-8',
        yearOfManufacture: 2022,
        capacity: '20 طن',
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        condition: 'GOOD',
        currentLocation: 'المخزن الرئيسي',
        totalWorkingHours: 650,
      },
      {
        equipmentTypeId: equipmentTypes.length > 3 ? equipmentTypes[3].id : equipmentTypes[0].id,
        code: 'EXC-002',
        nameAr: 'حفار هيونداي R210',
        nameEn: 'Hyundai R210 Excavator',
        serialNumber: 'SN-EXC-002-2024',
        manufacturer: 'Hyundai',
        model: 'R210LC-9',
        yearOfManufacture: 2021,
        capacity: '21 طن',
        fuelType: 'DIESEL',
        status: 'IN_USE',
        condition: 'GOOD',
        currentLocation: 'موقع المشروع C',
        totalWorkingHours: 1520,
      },

      // رافعات
      {
        equipmentTypeId: equipmentTypes.length > 4 ? equipmentTypes[4].id : equipmentTypes[0].id,
        code: 'CRN-001',
        nameAr: 'رافعة برجية ليبهر',
        nameEn: 'Liebherr Tower Crane',
        serialNumber: 'SN-CRN-001-2024',
        manufacturer: 'Liebherr',
        model: '110 EC-B 6',
        yearOfManufacture: 2020,
        capacity: '6 طن',
        status: 'IN_USE',
        condition: 'EXCELLENT',
        currentLocation: 'موقع المشروع D',
        totalWorkingHours: 3200,
      },

      // قلابات
      {
        equipmentTypeId: equipmentTypes.length > 5 ? equipmentTypes[5].id : equipmentTypes[0].id,
        code: 'DMP-001',
        nameAr: 'قلاب مرسيدس أكتروس',
        nameEn: 'Mercedes Actros Dump Truck',
        plateNumber: 'ز ح ط ٩٠١٢',
        serialNumber: 'SN-DMP-001-2024',
        manufacturer: 'Mercedes-Benz',
        model: 'Actros 3340',
        yearOfManufacture: 2022,
        capacity: '20 متر مكعب',
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        condition: 'GOOD',
        currentLocation: 'المخزن الرئيسي',
        currentMileage: 45000,
        color: 'أصفر',
      },
      {
        equipmentTypeId: equipmentTypes.length > 5 ? equipmentTypes[5].id : equipmentTypes[0].id,
        code: 'DMP-002',
        nameAr: 'قلاب فولفو FM',
        nameEn: 'Volvo FM Dump Truck',
        plateNumber: 'ي ك ل ٣٤٥٦',
        serialNumber: 'SN-DMP-002-2024',
        manufacturer: 'Volvo',
        model: 'FM 440',
        yearOfManufacture: 2021,
        capacity: '18 متر مكعب',
        fuelType: 'DIESEL',
        status: 'IN_USE',
        condition: 'GOOD',
        currentLocation: 'موقع المشروع A',
        currentMileage: 62000,
        color: 'أزرق',
      },

      // مولدات كهرباء
      {
        equipmentTypeId: equipmentTypes.length > 6 ? equipmentTypes[6].id : equipmentTypes[0].id,
        code: 'GEN-001',
        nameAr: 'مولد كهرباء كامينز 500 كيلو',
        nameEn: 'Cummins 500KVA Generator',
        serialNumber: 'SN-GEN-001-2024',
        manufacturer: 'Cummins',
        model: 'C500 D5',
        yearOfManufacture: 2023,
        capacity: '500 KVA',
        fuelType: 'DIESEL',
        status: 'AVAILABLE',
        condition: 'EXCELLENT',
        currentLocation: 'المخزن الرئيسي',
        totalWorkingHours: 320,
      },

      // كمبروسرات
      {
        equipmentTypeId: equipmentTypes.length > 7 ? equipmentTypes[7].id : equipmentTypes[0].id,
        code: 'CMP-001',
        nameAr: 'كمبروسر أطلس كوبكو',
        nameEn: 'Atlas Copco Air Compressor',
        serialNumber: 'SN-CMP-001-2024',
        manufacturer: 'Atlas Copco',
        model: 'XATS 750',
        yearOfManufacture: 2022,
        capacity: '750 CFM',
        fuelType: 'DIESEL',
        status: 'IN_USE',
        condition: 'GOOD',
        currentLocation: 'موقع المشروع B',
        totalWorkingHours: 890,
      },
    ]

    // إضافة المعدات
    for (const equipment of equipmentData) {
      await Database.prisma.equipment.upsert({
        where: { code: equipment.code },
        update: equipment as any,
        create: equipment as any,
      })
      console.log(`✅ Added equipment: ${equipment.nameAr}`)
    }

    console.log(`✅ Successfully seeded ${equipmentData.length} equipment items`)
  }
  catch (error) {
    console.error('❌ Error seeding equipment:', error)
    throw error
  }
}

// تشغيل مباشر
async function main() {
  await Database.connect()
  await seedEquipment()
}

main()
  .then(() => {
    console.log('✅ Equipment seeding completed')
    Database.disconnect()
  })
  .catch((error) => {
    console.error('❌ Equipment seeding failed:', error)
    Database.disconnect()
    process.exit(1)
  })
