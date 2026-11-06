import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function questionPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (char: string) => {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
        default:
          password += char;
          break;
      }
    };

    stdin.on('data', onData);
  });
}

async function createAdmin() {
  try {
    console.log("=== KinderManager Admin Account Creation ===\n");

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log("An ADMIN account already exists:");
      console.log(`  Name: ${existingAdmin.name}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log("\nTo create another admin, please use the database directly.");
      rl.close();
      process.exit(0);
    }

    console.log("No ADMIN account found. Creating the first administrator.\n");

    const name = await question("Enter admin name: ");
    const email = await question("Enter admin email: ");
    const password = await questionPassword("Enter admin password: ");

    if (!name || !email || !password) {
      console.error("Error: All fields are required.");
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("Error: Password must be at least 6 characters.");
      rl.close();
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error("Error: A user with this email already exists.");
      rl.close();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log("\n✓ ADMIN account created successfully!");
    console.log(`  ID: ${admin.id}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log("\nYou can now log in at /login");

    rl.close();
  } catch (error) {
    console.error("Error creating admin:", error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
