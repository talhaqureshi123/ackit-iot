/**
 * Migration: Add recurring event fields to events table
 * 
 * This migration adds fields to support recurring/repeating events:
 * - isRecurring: boolean flag
 * - recurringType: enum ('weekly')
 * - daysOfWeek: JSONB array of days [0-6]
 * - recurringStartDate: DATEONLY
 * - recurringEndDate: DATEONLY
 * - timeStart: TIME
 * - timeEnd: TIME
 * - parentRecurringEventId: reference to parent recurring event
 * 
 * Run: node migrations/20241112000001-add-recurring-fields-to-events.js
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting migration: Add recurring fields to events table...\n');
      
      // Step 1: Create enum type for recurringType
      console.log('Step 1: Creating recurringType enum...');
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_events_recurringType" AS ENUM('weekly');`,
        { transaction }
      );
      console.log('✅ recurringType enum created\n');
      
      // Step 2: Add isRecurring column
      console.log('Step 2: Adding isRecurring column...');
      await queryInterface.addColumn(
        'events',
        'isRecurring',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );
      console.log('✅ isRecurring column added\n');
      
      // Step 3: Add recurringType column
      console.log('Step 3: Adding recurringType column...');
      await queryInterface.addColumn(
        'events',
        'recurringType',
        {
          type: Sequelize.ENUM('weekly'),
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ recurringType column added\n');
      
      // Step 4: Add daysOfWeek column (JSONB)
      console.log('Step 4: Adding daysOfWeek column...');
      await queryInterface.addColumn(
        'events',
        'daysOfWeek',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ daysOfWeek column added\n');
      
      // Step 5: Add recurringStartDate column
      console.log('Step 5: Adding recurringStartDate column...');
      await queryInterface.addColumn(
        'events',
        'recurringStartDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ recurringStartDate column added\n');
      
      // Step 6: Add recurringEndDate column
      console.log('Step 6: Adding recurringEndDate column...');
      await queryInterface.addColumn(
        'events',
        'recurringEndDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ recurringEndDate column added\n');
      
      // Step 7: Add timeStart column
      console.log('Step 7: Adding timeStart column...');
      await queryInterface.addColumn(
        'events',
        'timeStart',
        {
          type: Sequelize.TIME,
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ timeStart column added\n');
      
      // Step 8: Add timeEnd column
      console.log('Step 8: Adding timeEnd column...');
      await queryInterface.addColumn(
        'events',
        'timeEnd',
        {
          type: Sequelize.TIME,
          allowNull: true,
        },
        { transaction }
      );
      console.log('✅ timeEnd column added\n');
      
      // Step 9: Add parentRecurringEventId column
      console.log('Step 9: Adding parentRecurringEventId column...');
      await queryInterface.addColumn(
        'events',
        'parentRecurringEventId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'events',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction }
      );
      console.log('✅ parentRecurringEventId column added\n');
      
      // Step 10: Create indexes
      console.log('Step 10: Creating indexes...');
      await queryInterface.addIndex(
        'events',
        ['isRecurring'],
        {
          name: 'idx_events_isRecurring',
          transaction
        }
      );
      await queryInterface.addIndex(
        'events',
        ['parentRecurringEventId'],
        {
          name: 'idx_events_parentRecurringEventId',
          transaction
        }
      );
      await queryInterface.addIndex(
        'events',
        ['recurringStartDate', 'recurringEndDate'],
        {
          name: 'idx_events_recurringDates',
          transaction
        }
      );
      console.log('✅ Indexes created\n');
      
      await transaction.commit();
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rolling back migration...\n');
      
      // Remove indexes
      console.log('Step 1: Removing indexes...');
      await queryInterface.removeIndex(
        'events',
        'idx_events_recurringDates',
        { transaction }
      );
      await queryInterface.removeIndex(
        'events',
        'idx_events_parentRecurringEventId',
        { transaction }
      );
      await queryInterface.removeIndex(
        'events',
        'idx_events_isRecurring',
        { transaction }
      );
      console.log('✅ Indexes removed\n');
      
      // Remove columns
      console.log('Step 2: Removing columns...');
      await queryInterface.removeColumn('events', 'parentRecurringEventId', { transaction });
      await queryInterface.removeColumn('events', 'timeEnd', { transaction });
      await queryInterface.removeColumn('events', 'timeStart', { transaction });
      await queryInterface.removeColumn('events', 'recurringEndDate', { transaction });
      await queryInterface.removeColumn('events', 'recurringStartDate', { transaction });
      await queryInterface.removeColumn('events', 'daysOfWeek', { transaction });
      await queryInterface.removeColumn('events', 'recurringType', { transaction });
      await queryInterface.removeColumn('events', 'isRecurring', { transaction });
      console.log('✅ Columns removed\n');
      
      // Remove enum type
      console.log('Step 3: Removing recurringType enum...');
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_events_recurringType";`,
        { transaction }
      );
      console.log('✅ Enum type removed\n');
      
      await transaction.commit();
      console.log('✅ Rollback completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

