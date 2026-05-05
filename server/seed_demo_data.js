const { sequelize, User, Transaction } = require('./src/models/index.js');
const bcrypt = require('bcryptjs');

async function seedData() {
  try {
    await sequelize.sync();
    
    const name = 'sharma';
    const password = 'sharma123';
    
    // Check if user exists, if so delete to recreate cleanly
    let user = await User.findOne({ where: { name } });
    if (user) {
      await Transaction.destroy({ where: { userId: user.id } });
      await user.destroy();
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = await User.create({
      name,
      password: hashedPassword,
      businessType: 'mixed',
      businessName: 'Sharma Provisions',
      preferredLanguage: 'en'
    });
    
    console.log(`Created User: ${user.name} with ID: ${user.id}`);
    
    const transactions = [];
    const today = new Date();
    
    // Generate data over the last 14 days
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Daily Sales (Income) - Increased for profitability
      const salesCount = Math.floor(Math.random() * 4) + 4; // 4-7 sales a day
      for (let j = 0; j < salesCount; j++) {
        transactions.push({
          userId: user.id,
          amount: Math.floor(Math.random() * 5000) + 3000, // 3000 to 8000
          type: 'income',
          category: 'Sales',
          description: `Daily customer sales ${j+1}`,
          paymentMethod: Math.random() > 0.4 ? 'upi' : 'cash',
          date: new Date(date.getTime() + Math.random() * 10 * 3600 * 1000), // Random time
          isPinned: Math.random() > 0.9
        });
      }
      
      // Occasional large orders (Income) - Increased
      if (Math.random() > 0.6) {
        transactions.push({
          userId: user.id,
          amount: Math.floor(Math.random() * 20000) + 20000, // 20000 to 40000
          type: 'income',
          category: 'Wholesale',
          description: 'Bulk order supply to local cafe',
          paymentMethod: 'bank',
          date: date,
          isPinned: true
        });
      }
      
      // Expenses - Balanced
      if (i % 4 === 0) {
        transactions.push({
          userId: user.id,
          amount: Math.floor(Math.random() * 5000) + 4000, // 4000 to 9000
          type: 'expense',
          category: 'Inventory',
          description: 'Restocked grain and rice',
          paymentMethod: 'bank',
          date: date
        });
      }
      
      if (i === 1) { // 1 day ago
        transactions.push({
          userId: user.id,
          amount: 2200,
          type: 'expense',
          category: 'Utilities',
          description: 'Electricity Bill',
          paymentMethod: 'upi',
          date: date,
          isPinned: true
        });
      }
      
      if (i === 7) { // 7 days ago
        transactions.push({
          userId: user.id,
          amount: 12000,
          type: 'expense',
          category: 'Salary',
          description: 'Staff Salary (Ramesh)',
          paymentMethod: 'cash',
          date: date
        });
        
        transactions.push({
          userId: user.id,
          amount: 8000,
          type: 'expense',
          category: 'Rent',
          description: 'Shop Rent',
          paymentMethod: 'bank',
          date: date,
          isPinned: true
        });
      }
    }
    
    // Add one machinery expense - Reduced
    transactions.push({
      userId: user.id,
      amount: 12000,
      type: 'expense',
      category: 'Equipment',
      description: 'New Display Rack',
      paymentMethod: 'bank',
      date: new Date(today.getTime() - 5 * 24 * 3600 * 1000),
      isPinned: true
    });
    
    await Transaction.bulkCreate(transactions);
    console.log(`Successfully seeded ${transactions.length} transactions for user ${user.name}`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedData();
