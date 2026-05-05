const { User, Transaction, GSTStatus } = require('./src/models');

async function debug() {
    try {
        const users = await User.findAll();
        console.log('--- Users ---');
        console.log(users.map(u => ({ id: u.id, name: u.name })));

        const txns = await Transaction.findAll();
        console.log('\n--- Transactions ---');
        console.log(txns.map(t => ({ id: t.id, userId: t.userId, amount: t.amount, category: t.category })));

    } catch (err) {
        console.error('Debug failed:', err);
    }
}

debug();
