/**
 * Migration: Add organizationId column to organizations table
 *
 * This migration adds the organizationId column to organizations table
 * which is needed because Venue model (using organizations table) needs
 * to reference parent Organization (stored in venues table).
 *
 * Run: npx sequelize-cli db:migrate
 * Or: node migrations/20241111000001-add-organizationId-to-organizations.js
 */

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log(
        "🔄 Starting migration: Add organizationId to organizations table...\n"
      );

      // Step 1: Add organizationId column
      console.log("Step 1: Adding organizationId column...");
      await queryInterface.addColumn(
        "organizations",
        "organizationId",
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Allow null initially for existing records
          references: {
            model: "venues", // References venues table (used by Organization model)
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        { transaction }
      );
      console.log("✅ organizationId column added\n");

      // Step 2: Create index for better query performance
      console.log("Step 2: Creating index...");
      await queryInterface.addIndex("organizations", ["organizationId"], {
        name: "idx_organizations_organizationId",
        transaction,
      });
      console.log("✅ Index created\n");

      await transaction.commit();
      console.log("✅ Migration completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration failed:", error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("🔄 Rolling back migration...\n");

      // Remove index
      console.log("Step 1: Removing index...");
      await queryInterface.removeIndex(
        "organizations",
        "idx_organizations_organizationId",
        { transaction }
      );
      console.log("✅ Index removed\n");

      // Remove column (this will also remove the foreign key constraint)
      console.log("Step 2: Removing organizationId column...");
      await queryInterface.removeColumn("organizations", "organizationId", {
        transaction,
      });
      console.log("✅ Column removed\n");

      await transaction.commit();
      console.log("✅ Rollback completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Rollback failed:", error.message);
      throw error;
    }
  },
};
