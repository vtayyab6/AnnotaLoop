export interface StoredFile {
    id: string;
    file: Blob;
    timestamp: number;
}

const DB_NAME = 'AnotaLoopDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

/**
 * Open IndexedDB connection
 */
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

/**
 * Save a file to IndexedDB
 * @param file The file to save
 * @returns The unique ID of the saved file
 */
export const saveFileToStorage = async (file: File): Promise<string> => {
    const db = await openDB();
    const id = crypto.randomUUID();
    const storedFile: StoredFile = {
        id,
        file: file, // File inherits from Blob, so this is valid. IndexedDB can store Blobs.
        timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(storedFile);

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Save raw bytes to IndexedDB with a specific ID (for imported files)
 * @param data The file data as Uint8Array
 * @param id The storage ID to use
 * @param filename The original filename (for MIME type detection)
 */
export const saveBytesToStorage = async (data: Uint8Array, id: string, filename: string): Promise<void> => {
    const db = await openDB();

    // Determine MIME type from filename
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.md': 'text/markdown'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Create a Blob from the data - copy to regular Uint8Array to avoid SharedArrayBuffer issues
    const blob = new Blob([new Uint8Array(data)], { type: mimeType });

    const storedFile: StoredFile = {
        id,
        file: blob,
        timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(storedFile);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Retrieve a file from IndexedDB
 * @param id The ID of the file to retrieve
 */
export const getFileFromStorage = async (id: string): Promise<File | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const result = request.result as StoredFile | undefined;
            if (result && result.file) {
                // Reconstruct File object to ensure it has name/lastModified if needed, 
                // though IDB generally stores the File object intact with metadata in modern browsers.
                // If getting a raw Blob, we might lose the name, but StoredFile.file is saved as File.
                // Let's cast it back to File.
                resolve(result.file as File);
            } else {
                resolve(undefined);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * Delete a file from IndexedDB
 */
export const deleteFileFromStorage = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
