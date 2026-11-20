---
name: smartprint-guardrails
description: Enforces zero-retention privacy standards, client-side AES-256 encryption, 100-second TTL purge lifecycle, and zero-disk print spooling for SmartPrint.
---

# SmartPrint Privacy & Engineering Guardrails

This skill enforces strict security and architectural compliance for the SmartPrint zero-knowledge printing protocol, aligning with the Digital Personal Data Protection (DPDP) Act 2023.

## Core Security & Architecture Rules

### 1. Zero-Disk Storage Principle
- Never write unencrypted document buffers or plaintext customer files to the server or terminal hard drive.
- Spooling in the Electron desktop terminal must stream directly from volatile RAM to the native OS printer queue.
- Temporary files in `%TEMP%` or `/tmp` are strictly forbidden for user documents.

### 2. Client-Side Cryptography (Web Crypto API)
- All user files must be encrypted in the client browser using AES-256-GCM before dispatching across the network.
- Decryption keys are strictly ephemeral and must only be transferred during active in-person counter pairing (QR code or 6-digit terminal PIN).
- Never persist decryption keys in databases or server logs.

### 3. Strict 100-Second Ephemeral Lifecycle (TTL)
- Every print job payload must have an explicit expiration timestamp (maximum 100 seconds from creation).
- Memory buffers and database records must automatically cascade delete upon job completion or upon timer expiration.
- Run continuous background eviction to purge expired or orphaned tokens.

### 4. Anti-Shoulder Surfing (Counter Shield)
- The desktop terminal must maintain an active screen-blur protection overlay when documents are loaded, shielding sensitive records from other customers waiting in line.

### 5. Privacy-Preserving AI Guardrails
- AI analysis (Gemini Flash) must only be invoked for on-the-fly client-side PII detection (e.g. masking Aadhaar/PAN digits) and print parameter optimization (B&W/Color cost reduction).
- AI prompts must instruct models never to retain, log, or cache document contents.

