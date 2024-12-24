const { Sequelize } = require('sequelize');

// Create a new Sequelize instance with correct credentials
const sequelize = new Sequelize('password_manager_db', 'passwordmanageruser', 'password', {
    host: 'localhost',
    dialect: 'mysql',
});

// Test the connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully!');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// Export the Sequelize instance and connect function
module.exports = { sequelize, connectDB };
