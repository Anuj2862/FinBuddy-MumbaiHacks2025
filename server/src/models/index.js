const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false
});

// --- User Model ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING },
  businessType: { type: DataTypes.ENUM('goods', 'services', 'mixed'), allowNull: false },
  preferredLanguage: { type: DataTypes.STRING, defaultValue: 'hi' },
  gstNumber: { type: DataTypes.STRING },
  businessName: { type: DataTypes.STRING }
});

// --- Transaction Model ---
const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  paymentMethod: { type: DataTypes.ENUM('cash', 'upi', 'bank'), defaultValue: 'cash' },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isGST: { type: DataTypes.BOOLEAN, defaultValue: false },
  gstAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  metadata: { 
    type: DataTypes.TEXT, 
    get() {
      const rawValue = this.getDataValue('metadata');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('metadata', JSON.stringify(value));
    }
  }
});

// --- GST Status Model ---
const GSTStatus = sequelize.define('GSTStatus', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  annualTurnover: { type: DataTypes.FLOAT, defaultValue: 0 },
  thresholdLimit: { type: DataTypes.FLOAT, defaultValue: 2000000 },
  isRegistered: { type: DataTypes.BOOLEAN, defaultValue: false },
  alerts: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('alerts');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('alerts', JSON.stringify(value));
    }
  }
});

// Relationships
User.hasMany(Transaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(GSTStatus, { foreignKey: 'userId', onDelete: 'CASCADE' });
GSTStatus.belongsTo(User, { foreignKey: 'userId' });

// toJSON overrides for frontend compatibility (_id)
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values._id = values.id;
  return values;
};

Transaction.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values._id = values.id;
  return values;
};

module.exports = { sequelize, User, Transaction, GSTStatus };
