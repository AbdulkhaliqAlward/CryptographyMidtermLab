# Cryptography Midterm Practical Lab

An automated, anti-AI hardened cryptographic investigation laboratory generator designed for Level-3 Computer Science / Cybersecurity students.

## Features
- **Deterministic Chained Ciphers:** 5 sequential cipher challenges (Caesar, Multiplicative, Affine, Vigenère, Autokey) uniquely generated per student.
- **LSB Steganography:** Student verification token concealed inside an image artifact.
- **Anti-AI Transport Obfuscation:** Block scrambling, numerical and binary stream formats, and personal Operation Codes.
- **Admin Dashboard:** Answer keys, real-time student registration tracking, and CSV data export.

## Deployment

### Quick Cloud Deployment (e.g. Render / Railway / Koyeb)
1. **Build Command:** `npm install`
2. **Start Command:** `node server.js`
3. **Environment Variables:**
   - `ADMIN_PASSWORD`: Your secret admin password.
   - `PORT`: 3000 (or platform default).

### Local Run
```bash
npm install
node server.js
```
- Student Portal: `http://localhost:3000/`
- Admin Dashboard: `http://localhost:3000/admin`
