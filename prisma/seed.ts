import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const pharmacies = [
  {
    id: "pharmacy-cbd",
    name: "Demo CBD Chemist",
    address: "Moi Avenue, Starehe, Nairobi",
    latitude: -1.2820393,
    longitude: 36.8213899,
    openingHours: { mondayToSaturday: "08:00-21:00", sunday: "09:00-17:00" },
  },
  {
    id: "pharmacy-westlands",
    name: "Demo Westlands Chemist",
    address: "Waiyaki Way, Westlands, Nairobi",
    latitude: -1.2676,
    longitude: 36.8108,
    openingHours: { mondayToSaturday: "08:00-21:00", sunday: "09:00-18:00" },
  },
  {
    id: "pharmacy-kilimani",
    name: "Demo Kilimani Chemist",
    address: "Argwings Kodhek Road, Kilimani, Nairobi",
    latitude: -1.2921,
    longitude: 36.7875,
    openingHours: { mondayToSaturday: "08:00-20:00", sunday: "10:00-16:00" },
  },
  {
    id: "pharmacy-kasarani",
    name: "Demo Kasarani Chemist",
    address: "Kasarani / Mwiki Road, Nairobi",
    latitude: -1.2124598,
    longitude: 36.8829731,
    openingHours: { mondayToSaturday: "08:00-20:00", sunday: "09:00-16:00" },
  },
  {
    id: "pharmacy-karen",
    name: "Demo Karen Pharmacy",
    address: "Karen Road, Lang'ata, Nairobi",
    latitude: -1.3283746,
    longitude: 36.7049676,
    openingHours: { mondayToSaturday: "08:30-19:00", sunday: "10:00-16:00" },
  },
  {
    id: "pharmacy-utawala",
    name: "Demo Utawala Chemist",
    address: "Utawala, Embakasi East, Nairobi",
    latitude: -1.2781,
    longitude: 36.9754,
    openingHours: { mondayToSaturday: "08:00-20:00", sunday: "09:00-15:00" },
  },
  {
    id: "pharmacy-south-c",
    name: "Demo South C Pharmacy",
    address: "South C, Lang'ata, Nairobi",
    latitude: -1.3216,
    longitude: 36.8275,
    openingHours: { mondayToSaturday: "08:00-21:00", sunday: "09:00-17:00" },
  },
  {
    id: "pharmacy-parklands",
    name: "Demo Parklands Chemist",
    address: "Parklands Road, Westlands, Nairobi",
    latitude: -1.263,
    longitude: 36.8174,
    openingHours: { mondayToSaturday: "08:00-20:00", sunday: "10:00-16:00" },
  },
  {
    id: "pharmacy-embakasi-east",
    name: "Demo Embakasi East Chemist",
    address: "Embakasi, Nairobi",
    latitude: -1.306,
    longitude: 36.913,
    openingHours: { mondayToSaturday: "08:00-20:00", sunday: "09:00-16:00" },
  },
  {
    id: "pharmacy-ngara",
    name: "Demo Ngara Chemist",
    address: "Ngara Road, Starehe, Nairobi",
    latitude: -1.2751,
    longitude: 36.8242,
    openingHours: { mondayToSaturday: "07:30-21:00", sunday: "09:00-17:00" },
  },
];

const medicines = [
  {
    id: "medicine-paracetamol-500-tablets",
    genericName: "Paracetamol",
    brandName: null,
    strength: "500 mg",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "OTC",
    basePrice: 75,
  },
  {
    id: "medicine-panadol-500-tablets",
    genericName: "Paracetamol",
    brandName: "Panadol Advance",
    strength: "500 mg",
    dosageForm: "tablets",
    packSize: "12 tablets",
    category: "OTC",
    basePrice: 145,
  },
  {
    id: "medicine-mara-moja",
    genericName: "Paracetamol + aspirin + caffeine",
    brandName: "Mara Moja",
    strength: "Combination",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "OTC",
    basePrice: 55,
  },
  {
    id: "medicine-nurofen-200",
    genericName: "Ibuprofen",
    brandName: "Nurofen",
    strength: "200 mg",
    dosageForm: "tablets",
    packSize: "12 tablets",
    category: "OTC",
    basePrice: 190,
  },
  {
    id: "medicine-cetirizine-10",
    genericName: "Cetirizine",
    brandName: null,
    strength: "10 mg",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "Respiratory/Allergy",
    basePrice: 70,
  },
  {
    id: "medicine-flugone-10",
    genericName: "Cold and flu combination",
    brandName: "Flugone",
    strength: "Combination",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "Respiratory/Allergy",
    basePrice: 120,
  },
  {
    id: "medicine-panadol-cold-flu",
    genericName: "Cold and flu combination",
    brandName: "Panadol Cold & Flu",
    strength: "Combination",
    dosageForm: "tablets",
    packSize: "12 tablets",
    category: "Respiratory/Allergy",
    basePrice: 220,
  },
  {
    id: "medicine-loratadine-10",
    genericName: "Loratadine",
    brandName: "Clarityne",
    strength: "10 mg",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "Respiratory/Allergy",
    basePrice: 140,
  },
  {
    id: "medicine-chlorpheniramine-4",
    genericName: "Chlorpheniramine",
    brandName: null,
    strength: "4 mg",
    dosageForm: "tablets",
    packSize: "20 tablets",
    category: "Respiratory/Allergy",
    basePrice: 60,
  },
  {
    id: "medicine-amoxicillin-500-capsules",
    genericName: "Amoxicillin",
    brandName: null,
    strength: "500 mg",
    dosageForm: "capsules",
    packSize: "15 capsules",
    category: "Antibiotics",
    basePrice: 280,
  },
  {
    id: "medicine-augmentin-625",
    genericName: "Amoxicillin / clavulanic acid",
    brandName: "Augmentin",
    strength: "625 mg",
    dosageForm: "tablets",
    packSize: "14 tablets",
    category: "Antibiotics",
    basePrice: 850,
  },
  {
    id: "medicine-cipro-denk-500",
    genericName: "Ciprofloxacin",
    brandName: "Cipro Denk",
    strength: "500 mg",
    dosageForm: "tablets",
    packSize: "10 tablets",
    category: "Antibiotics",
    basePrice: 320,
  },
  {
    id: "medicine-azithromycin-500",
    genericName: "Azithromycin",
    brandName: null,
    strength: "500 mg",
    dosageForm: "tablets",
    packSize: "3 tablets",
    category: "Antibiotics",
    basePrice: 420,
  },
  {
    id: "medicine-metronidazole-400",
    genericName: "Metronidazole",
    brandName: null,
    strength: "400 mg",
    dosageForm: "tablets",
    packSize: "21 tablets",
    category: "Antibiotics",
    basePrice: 130,
  },
  {
    id: "medicine-coartem-20-120",
    genericName: "Artemether / lumefantrine",
    brandName: "Coartem",
    strength: "20 mg / 120 mg",
    dosageForm: "tablets",
    packSize: "24 tablets",
    category: "Malaria",
    basePrice: 480,
  },
  {
    id: "medicine-omeprazole-20",
    genericName: "Omeprazole",
    brandName: null,
    strength: "20 mg",
    dosageForm: "capsules",
    packSize: "14 capsules",
    category: "Digestive",
    basePrice: 120,
  },
  {
    id: "medicine-ors-zinc-copack",
    genericName: "Oral rehydration salts + zinc",
    brandName: null,
    strength: "Co-pack",
    dosageForm: "sachets and tablets",
    packSize: "1 co-pack",
    category: "Digestive",
    basePrice: 180,
  },
  {
    id: "medicine-gaviscon-suspension",
    genericName: "Alginate antacid",
    brandName: "Gaviscon",
    strength: "Suspension",
    dosageForm: "oral suspension",
    packSize: "150 mL bottle",
    category: "Digestive",
    basePrice: 520,
  },
  {
    id: "medicine-loperamide-2",
    genericName: "Loperamide",
    brandName: "Imodium",
    strength: "2 mg",
    dosageForm: "capsules",
    packSize: "10 capsules",
    category: "Digestive",
    basePrice: 160,
  },
  {
    id: "medicine-ors-sachets",
    genericName: "Oral rehydration salts",
    brandName: null,
    strength: "Standard sachet",
    dosageForm: "oral powder",
    packSize: "10 sachets",
    category: "Digestive",
    basePrice: 120,
  },
  {
    id: "medicine-salbutamol-inhaler",
    genericName: "Salbutamol",
    brandName: null,
    strength: "100 mcg per actuation",
    dosageForm: "metered-dose inhaler",
    packSize: "1 inhaler",
    category: "Respiratory/Allergy",
    basePrice: 480,
  },
  {
    id: "medicine-guaifenesin-syrup",
    genericName: "Guaifenesin",
    brandName: null,
    strength: "100 mg / 5 mL",
    dosageForm: "syrup",
    packSize: "100 mL bottle",
    category: "Respiratory/Allergy",
    basePrice: 230,
  },
  {
    id: "medicine-amlodipine-5",
    genericName: "Amlodipine",
    brandName: null,
    strength: "5 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Chronic Care",
    basePrice: 130,
  },
  {
    id: "medicine-losartan-50",
    genericName: "Losartan",
    brandName: null,
    strength: "50 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Chronic Care",
    basePrice: 260,
  },
  {
    id: "medicine-metformin-500",
    genericName: "Metformin",
    brandName: null,
    strength: "500 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Chronic Care",
    basePrice: 150,
  },
  {
    id: "medicine-atorvastatin-20",
    genericName: "Atorvastatin",
    brandName: "Lipitor",
    strength: "20 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Chronic Care",
    basePrice: 440,
  },
  {
    id: "medicine-enalapril-10",
    genericName: "Enalapril",
    brandName: null,
    strength: "10 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Chronic Care",
    basePrice: 180,
  },
  {
    id: "medicine-clotrimazole-1-cream",
    genericName: "Clotrimazole",
    brandName: null,
    strength: "1%",
    dosageForm: "cream",
    packSize: "20 g tube",
    category: "Skin/Antifungal",
    basePrice: 100,
  },
  {
    id: "medicine-vitamin-c-zinc",
    genericName: "Vitamin C + zinc",
    brandName: null,
    strength: "500 mg + 10 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Supplements",
    basePrice: 260,
  },
  {
    id: "medicine-fluconazole-150",
    genericName: "Fluconazole",
    brandName: "Diflucan",
    strength: "150 mg",
    dosageForm: "capsule",
    packSize: "1 capsule",
    category: "Antifungal",
    basePrice: 160,
  },
  {
    id: "medicine-diclofenac-50",
    genericName: "Diclofenac",
    brandName: "Voltaren",
    strength: "50 mg",
    dosageForm: "tablets",
    packSize: "20 tablets",
    category: "OTC",
    basePrice: 210,
  },
  {
    id: "medicine-hydrocortisone-1-cream",
    genericName: "Hydrocortisone",
    brandName: null,
    strength: "1%",
    dosageForm: "cream",
    packSize: "15 g tube",
    category: "Skin/Antifungal",
    basePrice: 120,
  },
  {
    id: "medicine-ferrous-sulfate-200",
    genericName: "Ferrous sulfate",
    brandName: null,
    strength: "200 mg",
    dosageForm: "tablets",
    packSize: "30 tablets",
    category: "Supplements",
    basePrice: 120,
  },
];

const pharmacyPriceFactors = [0.98, 1.03, 1.01, 1.06, 1.08, 0.99, 1.04, 0.97, 1.05, 1.0];

async function main() {
  for (const pharmacy of pharmacies) {
    await prisma.$executeRaw`
      INSERT INTO "Pharmacy"
        ("id", "name", "address", "phone", "openingHours", "location", "createdAt", "updatedAt")
      VALUES (
        ${pharmacy.id},
        ${pharmacy.name},
        ${pharmacy.address},
        NULL,
        ${JSON.stringify(pharmacy.openingHours)}::jsonb,
        ST_SetSRID(ST_MakePoint(${pharmacy.longitude}, ${pharmacy.latitude}), 4326)::geography,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "address" = EXCLUDED."address",
        "phone" = NULL,
        "openingHours" = EXCLUDED."openingHours",
        "location" = EXCLUDED."location",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  for (const medicine of medicines) {
    const { id, basePrice, ...data } = medicine;
    await prisma.medicine.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  for (const [medicineIndex, medicine] of medicines.entries()) {
    for (const [pharmacyIndex, pharmacy] of pharmacies.entries()) {
      const variation = ((medicineIndex * 3 + pharmacyIndex * 5) % 7 - 3) / 100;
      const price = (
        medicine.basePrice
        * (pharmacyPriceFactors[pharmacyIndex] + variation)
      ).toFixed(2);
      const isOutOfStock = (medicineIndex + pharmacyIndex * 2) % 7 === 0;
      const quantityOnHand = isOutOfStock
        ? 0
        : 4 + ((medicineIndex * 11 + pharmacyIndex * 7) % 29);

      await prisma.inventoryPrice.upsert({
        where: {
          pharmacyId_medicineId: {
            pharmacyId: pharmacy.id,
            medicineId: medicine.id,
          },
        },
        update: {
          price,
          quantityOnHand,
          lastUpdated: new Date(),
        },
        create: {
          pharmacyId: pharmacy.id,
          medicineId: medicine.id,
          price,
          quantityOnHand,
        },
      });
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed the database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
