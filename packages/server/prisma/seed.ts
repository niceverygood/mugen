import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('Mugen2024!', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '관리자',
      role: 'ADMIN',
    },
  });

  // Create staff user for testing
  const staffPassword = await bcrypt.hash('Staff2024!', 10);
  await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      password: staffPassword,
      name: '担当者',
      role: 'STAFF',
    },
  });

  // Create default presets
  const presets = [
    { name: '거래처 A 기본', clientName: '거래처 A', studSpacing: 455, wallType: 'LGS', maxSpan: 4550, notes: '軽量鉄骨造' },
    { name: '거래처 B 기본', clientName: '거래처 B', studSpacing: 303, wallType: 'Wood', maxSpan: 5460, notes: '木造軸組' },
    { name: '거래처 C 기본', clientName: '거래처 C', studSpacing: 910, wallType: 'RC', maxSpan: 8000, notes: 'RC造' },
  ];

  for (const p of presets) {
    const existing = await prisma.preset.findFirst({ where: { clientName: p.clientName } });
    if (!existing) {
      await prisma.preset.create({ data: p });
    }
  }

  console.log('Seed completed: admin user + 3 presets');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
