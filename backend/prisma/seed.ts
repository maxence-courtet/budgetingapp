import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.budgetTransactionDefinition.deleteMany();
  await prisma.month.deleteMany();
  await prisma.budgetTemplate.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create default user
  const user = await prisma.user.create({
    data: {
      auth0Id: 'auth0|seed-user',
      email: 'demo@budget.app',
      name: 'Demo User',
    },
  });

  const userId = user.id;

  // Create Accounts
  const checking = await prisma.account.create({
    data: { name: 'Main Checking', type: 'checking', notes: 'Primary bank account', userId },
  });
  const savings = await prisma.account.create({
    data: { name: 'Savings', type: 'savings', notes: 'Emergency fund and goals', userId },
  });
  const creditCard = await prisma.account.create({
    data: { name: 'Credit Card', type: 'credit card', notes: 'Visa rewards card', userId },
  });

  // Create Categories
  const salary = await prisma.category.create({ data: { name: 'Salary', userId } });
  const rent = await prisma.category.create({ data: { name: 'Rent', userId } });
  const groceries = await prisma.category.create({ data: { name: 'Groceries', userId } });
  const utilities = await prisma.category.create({ data: { name: 'Utilities', userId } });
  const car = await prisma.category.create({ data: { name: 'Car', userId } });
  const house = await prisma.category.create({ data: { name: 'House Savings', userId } });
  const investing = await prisma.category.create({ data: { name: 'Investing', userId } });
  const entertainment = await prisma.category.create({ data: { name: 'Entertainment', userId } });
  const dining = await prisma.category.create({ data: { name: 'Dining Out', userId } });
  await prisma.category.create({ data: { name: 'Transportation', userId } });

  // Create Budget Template
  const standardBudget = await prisma.budgetTemplate.create({
    data: { name: 'Standard Monthly Budget', userId },
  });

  // Budget Transaction Definitions
  await prisma.budgetTransactionDefinition.createMany({
    data: [
      { budgetTemplateId: standardBudget.id, type: 'INCOME', amount: 3000, description: 'Monthly salary', categoryId: salary.id, toAccountId: checking.id, userId },
      { budgetTemplateId: standardBudget.id, type: 'SPENDING', amount: 1000, description: 'Monthly rent', categoryId: rent.id, fromAccountId: checking.id, userId },
      { budgetTemplateId: standardBudget.id, type: 'SPENDING', amount: 300, description: 'Groceries budget', categoryId: groceries.id, fromAccountId: checking.id, userId },
      { budgetTemplateId: standardBudget.id, type: 'SPENDING', amount: 150, description: 'Utilities', categoryId: utilities.id, fromAccountId: checking.id, userId },
      { budgetTemplateId: standardBudget.id, type: 'TRANSFER', amount: 500, description: 'Car savings transfer', categoryId: car.id, fromAccountId: checking.id, toAccountId: savings.id, toCategoryId: car.id, userId },
      { budgetTemplateId: standardBudget.id, type: 'TRANSFER', amount: 300, description: 'House savings transfer', categoryId: house.id, fromAccountId: checking.id, toAccountId: savings.id, toCategoryId: house.id, userId },
    ],
  });

  // Create January 2024
  const jan2024 = await prisma.month.create({
    data: { month: 1, year: 2024, budgetTemplateId: standardBudget.id, userId },
  });

  // Create paid transactions for January
  await prisma.transaction.createMany({
    data: [
      { type: 'INCOME', date: new Date('2024-01-05'), amount: 3000, description: 'Monthly salary', status: 'PAID', categoryId: salary.id, monthId: jan2024.id, toAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-01-01'), amount: 1000, description: 'Monthly rent', status: 'PAID', categoryId: rent.id, monthId: jan2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-01-10'), amount: 280, description: 'Groceries', status: 'PAID', categoryId: groceries.id, monthId: jan2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-01-15'), amount: 145, description: 'Electric + Water', status: 'PAID', categoryId: utilities.id, monthId: jan2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-01-20'), amount: 60, description: 'Movie night', status: 'PAID', categoryId: entertainment.id, monthId: jan2024.id, fromAccountId: checking.id, userId },
      { type: 'TRANSFER', date: new Date('2024-01-06'), amount: 500, description: 'Car savings', status: 'PAID', categoryId: car.id, toCategoryId: car.id, monthId: jan2024.id, fromAccountId: checking.id, toAccountId: savings.id, userId },
      { type: 'TRANSFER', date: new Date('2024-01-06'), amount: 300, description: 'House savings', status: 'PAID', categoryId: house.id, toCategoryId: house.id, monthId: jan2024.id, fromAccountId: checking.id, toAccountId: savings.id, userId },
    ],
  });

  // Create February 2024 with some planned transactions
  const feb2024 = await prisma.month.create({
    data: { month: 2, year: 2024, budgetTemplateId: standardBudget.id, userId },
  });

  await prisma.transaction.createMany({
    data: [
      { type: 'INCOME', date: new Date('2024-02-05'), amount: 3000, description: 'Monthly salary', status: 'PAID', categoryId: salary.id, monthId: feb2024.id, toAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-02-01'), amount: 1000, description: 'Monthly rent', status: 'PAID', categoryId: rent.id, monthId: feb2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-02-01'), amount: 300, description: 'Groceries budget', status: 'PLANNED', categoryId: groceries.id, monthId: feb2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-02-01'), amount: 150, description: 'Utilities', status: 'PLANNED', categoryId: utilities.id, monthId: feb2024.id, fromAccountId: checking.id, userId },
      { type: 'SPENDING', date: new Date('2024-02-14'), amount: 85, description: 'Valentine dinner', status: 'PENDING', categoryId: dining.id, monthId: feb2024.id, fromAccountId: creditCard.id, userId },
      { type: 'TRANSFER', date: new Date('2024-02-06'), amount: 500, description: 'Car savings', status: 'PLANNED', categoryId: car.id, toCategoryId: car.id, monthId: feb2024.id, fromAccountId: checking.id, toAccountId: savings.id, userId },
      { type: 'TRANSFER', date: new Date('2024-02-06'), amount: 300, description: 'House savings', status: 'PLANNED', categoryId: house.id, toCategoryId: house.id, monthId: feb2024.id, fromAccountId: checking.id, toAccountId: savings.id, userId },
    ],
  });

  // Create March 2024 (empty)
  await prisma.month.create({ data: { month: 3, year: 2024, userId } });

  console.log('Database seeded successfully!');
  console.log(`  Default user: demo@budget.app (auth0|seed-user)`);
  console.log(`  Accounts: ${await prisma.account.count()}`);
  console.log(`  Categories: ${await prisma.category.count()}`);
  console.log(`  Budget Templates: ${await prisma.budgetTemplate.count()}`);
  console.log(`  Months: ${await prisma.month.count()}`);
  console.log(`  Transactions: ${await prisma.transaction.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
