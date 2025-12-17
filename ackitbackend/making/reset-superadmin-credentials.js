require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");
const SuperAdmin = require("../models/Roleaccess/superadmin");

(async () => {
  const email = "talhaabid400@gmail.com";
  const password = "superadmin123";

  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    let sa = await SuperAdmin.findOne({ where: { email } });

    const hash = await bcrypt.hash(password, 12);

    if (sa) {
      // Update existing
      await sa.update({ password: hash });
      console.log("✅ Updated superadmin credentials:");
    } else {
      // Create new
      sa = await SuperAdmin.create({
        name: "IoTify Super Admin",
        email: email,
        password: hash,
        role: "superadmin",
        isActive: true,
      });
      console.log("✅ Created superadmin with credentials:");
    }

    console.log("- email:", email);
    console.log("- password:", password);
    console.log("- ID:", sa.id);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log("🔌 DB closed");
  }
})();
