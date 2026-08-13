'use strict';

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

let client = null;
let db = null;
let studentsCollection = null;

// Initialize the database connection
async function initDB() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(); // Uses the default database from the URI
      studentsCollection = db.collection('students');
      console.log('[DB] Connected to MongoDB Atlas successfully.');
    } catch (err) {
      console.error('[DB] Failed to connect to MongoDB Atlas:', err);
      // Fallback to local file if connection fails
      client = null;
      studentsCollection = null;
    }
  } else {
    console.log('[DB] No MONGODB_URI found. Falling back to local file storage.');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Ensure connection is ready before querying
async function ensureConnection() {
  if (process.env.MONGODB_URI && !studentsCollection) {
    await initDB();
  }
}

// Load all students
async function loadStudents() {
  await ensureConnection();
  if (studentsCollection) {
    const docs = await studentsCollection.find({}).toArray();
    return docs;
  } else {
    // Local fallback
    if (!fs.existsSync(STUDENTS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8')); }
    catch { return []; }
  }
}

// Add a single student
async function addStudent(studentData) {
  await ensureConnection();
  if (studentsCollection) {
    await studentsCollection.insertOne(studentData);
  } else {
    // Local fallback
    const list = await loadStudents();
    list.push(studentData);
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  }
}

// Clear all students
async function clearStudents() {
  await ensureConnection();
  if (studentsCollection) {
    await studentsCollection.deleteMany({});
  } else {
    // Local fallback
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

module.exports = {
  initDB,
  loadStudents,
  addStudent,
  clearStudents
};
