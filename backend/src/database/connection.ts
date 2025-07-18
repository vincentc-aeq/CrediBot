import knex from "knex";
import config from "../../knexfile";

const environment = process.env.NODE_ENV || "development";
const knexConfig = config[environment];

if (!knexConfig) {
  throw new Error(
    `No database configuration found for environment: ${environment}`
  );
}

const db = knex(knexConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await db.raw("SELECT 1");
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

export default db;
