/**
 * Data Encryption Service
 * Handles AES-256-GCM encryption for user data when PIN lock is enabled
 */

/**
 * Derive encryption key from PIN using PBKDF2
 * @param pin - User PIN
 * @param salt - Salt for key derivation (should be stored with encrypted data)
 * @returns Crypto key for encryption/decryption
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);

    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000, // High iteration count for security
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data with PIN-derived key
 * @param data - Data to encrypt (will be JSON stringified)
 * @param pin - User PIN
 * @returns Encrypted data package containing IV, salt, and ciphertext
 */
export async function encryptData(data: any, pin: string): Promise<string> {
    try {
        // Generate salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM

        // Derive key from PIN
        const key = await deriveKeyFromPin(pin, salt);

        // Convert data to bytes
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(JSON.stringify(data));

        // Encrypt
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            dataBytes
        );

        // Package everything together
        const package_data = {
            salt: Array.from(salt),
            iv: Array.from(iv),
            ciphertext: Array.from(new Uint8Array(ciphertext))
        };

        return JSON.stringify(package_data);
    } catch (error) {
        console.error('[Encryption] Failed to encrypt data:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt data with PIN-derived key
 * @param encryptedPackage - Encrypted data package as JSON string
 * @param pin - User PIN
 * @returns Decrypted data
 */
export async function decryptData(encryptedPackage: string, pin: string): Promise<any> {
    try {
        // Parse package
        const package_data = JSON.parse(encryptedPackage);
        const salt = new Uint8Array(package_data.salt);
        const iv = new Uint8Array(package_data.iv);
        const ciphertext = new Uint8Array(package_data.ciphertext);

        // Derive key from PIN
        const key = await deriveKeyFromPin(pin, salt);

        // Decrypt
        const decryptedBytes = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            ciphertext
        );

        // Convert bytes back to data
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedBytes);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('[Encryption] Failed to decrypt data:', error);
        throw new Error('Decryption failed - incorrect PIN or corrupted data');
    }
}

/**
 * Encrypt localStorage data when PIN lock is enabled
 * @param pin - User PIN
 */
export async function encryptLocalStorage(pin: string): Promise<void> {
    try {
        const keysToEncrypt = ['projects', 'documents'];
        const encryptedData: Record<string, string> = {};

        for (const key of keysToEncrypt) {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                const encrypted = await encryptData(parsed, pin);
                encryptedData[key] = encrypted;
            }
        }

        // Save encrypted data
        for (const [key, value] of Object.entries(encryptedData)) {
            localStorage.setItem(`${key}_encrypted`, value);
            localStorage.removeItem(key); // Remove plain text
        }

        console.log('[Encryption] Encrypted localStorage data');
    } catch (error) {
        console.error('[Encryption] Failed to encrypt localStorage:', error);
        throw error;
    }
}

/**
 * Decrypt localStorage data when unlocking app
 * @param pin - User PIN
 * @returns True if decryption successful
 */
export async function decryptLocalStorage(pin: string): Promise<boolean> {
    try {
        const keysToDecrypt = ['projects', 'documents'];
        const decryptedData: Record<string, any> = {};

        for (const key of keysToDecrypt) {
            const encrypted = localStorage.getItem(`${key}_encrypted`);
            if (encrypted) {
                const decrypted = await decryptData(encrypted, pin);
                decryptedData[key] = decrypted;
            }
        }

        // Save decrypted data
        for (const [key, value] of Object.entries(decryptedData)) {
            localStorage.setItem(key, JSON.stringify(value));
        }

        console.log('[Encryption] Decrypted localStorage data');
        return true;
    } catch (error) {
        console.error('[Encryption] Failed to decrypt localStorage:', error);
        return false;
    }
}

/**
 * Check if localStorage data is encrypted
 * @returns True if data is currently encrypted
 */
export function isLocalStorageEncrypted(): boolean {
    return localStorage.getItem('projects_encrypted') !== null ||
        localStorage.getItem('documents_encrypted') !== null;
}

/**
 * Clear encrypted data on lock
 * Removes decrypted versions but keeps encrypted versions
 */
export function clearDecryptedData(): void {
    const keysToRemove = ['projects', 'documents'];

    for (const key of keysToRemove) {
        // Only remove if encrypted version exists
        if (localStorage.getItem(`${key}_encrypted`)) {
            localStorage.removeItem(key);
        }
    }

    console.log('[Encryption] Cleared decrypted data from memory');
}

/**
 * Generate random recovery key
 * @returns Recovery key in format XXXX-XXXX-XXXX
 */
export function generateRecoveryKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous characters
    const segments = 3;
    const segmentLength = 4;

    const key = [];
    for (let i = 0; i < segments; i++) {
        let segment = '';
        for (let j = 0; j < segmentLength; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        key.push(segment);
    }

    return key.join('-');
}

/**
 * Encrypt data with password (for export files)
 * @param data - Data to encrypt
 * @param password - User password
 * @returns Encrypted package as base64 string
 */
export async function encryptWithPassword(data: any, password: string): Promise<string> {
    const encrypted = await encryptData(data, password);
    // Convert to base64 for file storage
    return btoa(encrypted);
}

/**
 * Decrypt data with password (for import files)
 * @param encryptedBase64 - Encrypted data as base64 string
 * @param password - User password
 * @returns Decrypted data
 */
export async function decryptWithPassword(encryptedBase64: string, password: string): Promise<any> {
    const encrypted = atob(encryptedBase64);
    return await decryptData(encrypted, password);
}
