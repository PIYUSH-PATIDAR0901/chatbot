import { initDatabase } from '../db/initDb';
import { getPool, closePool } from '../db/connection';
import { userRepository } from '../repositories/userRepository';

async function seed() {
  console.log('--- Seeding Database ---');

  // Ensure DB and tables exist
  await initDatabase();

  const demoUsers = [
    { id: 'user_alice', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 'user_bob', name: 'Bob Smith', email: 'bob@example.com' },
    { id: 'user_charlie', name: 'Charlie Brown', email: 'charlie@example.com' },
    { id: 'user_dave', name: 'Dave Wilson', email: 'dave@example.com' },
  ];

  for (const u of demoUsers) {
    const existing = await userRepository.findById(u.id);
    if (!existing) {
      await userRepository.create(u);
      console.log(`Created demo user: ${u.name} (ID: ${u.id})`);
    } else {
      console.log(`User already exists: ${u.name} (ID: ${u.id})`);
    }
  }

  console.log('--- Seeding Completed Successfully ---');
}

seed()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Seeding error:', err);
    await closePool();
    process.exit(1);
  });
