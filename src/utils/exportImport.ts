/**
 * Export/Import Service
 * Handles export and import of projects, documents, labels, and rules
 * Supports ZIP packaging and optional password encryption
 */

import JSZip from 'jszip';
import type { Project, Document, Label, Rule } from '../context/types';
import { loadTauriFile, saveTauriFile, getFileExtension } from './tauriFileStorage';
import { encryptWithPassword, decryptWithPassword } from './encryption';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile as tauriWriteFile, readFile as tauriReadFile } from '@tauri-apps/plugin-fs';

/**
 * Generate unique name by adding suffix if duplicate exists
 * Uses Windows-style "(1)" suffix before the file extension
 * @param baseName - Original name
 * @param existingNames - Array of existing names to check against
 * @returns Unique name with suffix if needed (e.g., "file (1).pdf")
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
    if (!existingNames.includes(baseName)) {
        return baseName;
    }

    // Split into name and extension
    const lastDotIndex = baseName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0 && lastDotIndex < baseName.length - 1;

    const nameWithoutExt = hasExtension ? baseName.substring(0, lastDotIndex) : baseName;
    const extension = hasExtension ? baseName.substring(lastDotIndex) : '';

    let counter = 1;
    let newName = `${nameWithoutExt} (${counter})${extension}`;

    while (existingNames.includes(newName)) {
        counter++;
        newName = `${nameWithoutExt} (${counter})${extension}`;
    }

    return newName;
}

/**
 * Export project as .alproj file
 * @param project - Project to export
 * @param documents - All documents in the project
 * @param password - Optional password for encryption
 * @returns True if export successful
 */
export async function exportProject(
    project: Project,
    documents: Document[],
    password?: string
): Promise<boolean> {
    try {
        const zip = new JSZip();

        // Add project metadata
        zip.file('project.json', JSON.stringify(project, null, 2));

        // Add documents metadata
        const projectDocs = documents.filter(d => d.projectId === project.id);
        zip.file('documents.json', JSON.stringify(projectDocs, null, 2));

        // Add original and annotated files
        const filesFolder = zip.folder('files');
        if (!filesFolder) throw new Error('Failed to create files folder');

        // Import getFileFromStorage to read from IndexedDB where files are stored on upload
        const { getFileFromStorage } = await import('./fileStorage');

        for (const doc of projectDocs) {
            if (doc.storageId && doc.name) {
                const ext = getFileExtension(doc.name);

                try {
                    // Try IndexedDB first (where files are stored on upload)
                    const fileFromIDB = await getFileFromStorage(doc.storageId);
                    if (fileFromIDB) {
                        const arrayBuffer = await fileFromIDB.arrayBuffer();
                        filesFolder.file(`${doc.storageId}_original${ext}`, new Uint8Array(arrayBuffer));
                        console.log(`[Export] Added file from IndexedDB: ${doc.name}`);
                    } else {
                        // Fallback to Tauri storage (for imported files)
                        try {
                            const originalData = await loadTauriFile(doc.storageId, ext, false);
                            filesFolder.file(`${doc.storageId}_original${ext}`, originalData);
                            console.log(`[Export] Added file from Tauri storage: ${doc.name}`);
                        } catch (e) {
                            console.warn(`[Export] File not found in any storage: ${doc.name}`);
                        }
                    }

                    // Add annotated file if it exists (always from Tauri storage)
                    if (doc.status === 'Annotated' || doc.status === 'Review' || doc.status === 'Processed') {
                        try {
                            const annotatedData = await loadTauriFile(doc.storageId, ext, true);
                            filesFolder.file(`${doc.storageId}_annotated${ext}`, annotatedData);
                        } catch (e) {
                            console.log(`[Export] No annotated file for ${doc.name}`);
                        }
                    }
                } catch (error) {
                    console.error(`[Export] Failed to load file for document ${doc.name}:`, error);
                }
            }
        }

        // Generate ZIP
        let zipBlob = await zip.generateAsync({ type: 'blob' });

        // Encrypt if password provided
        if (password) {
            const zipArrayBuffer = await zipBlob.arrayBuffer();
            const zipData = new Uint8Array(zipArrayBuffer);
            const encrypted = await encryptWithPassword(Array.from(zipData), password);
            zipBlob = new Blob([encrypted], { type: 'application/octet-stream' });
        }

        // Save file dialog
        const filePath = await save({
            defaultPath: `${project.name}.alproj`,
            filters: [{
                name: 'AnnotaLoop Project',
                extensions: ['alproj']
            }]
        });

        if (!filePath) return false; // User cancelled

        // Convert blob to Uint8Array and write
        const arrayBuffer = await zipBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await tauriWriteFile(filePath, uint8Array);

        console.log(`[Export] Project exported successfully: ${filePath}`);
        return true;
    } catch (error) {
        console.error('[Export] Failed to export project:', error);
        throw error;
    }
}

/**
 * Export single document as .aldoc file
 * @param document - Document to export
 * @param labels - Document-level labels (or project labels)
 * @param rules - Document-level rules (or project rules)
 * @param password - Optional password for encryption
 * @returns True if export successful
 */
export async function exportDocument(
    document: Document,
    labels: Label[],
    rules: Rule[],
    password?: string
): Promise<boolean> {
    try {
        const zip = new JSZip();

        // Add document metadata
        zip.file('document.json', JSON.stringify(document, null, 2));

        // Add labels and rules
        zip.file('labels.json', JSON.stringify(labels, null, 2));
        zip.file('rules.json', JSON.stringify(rules, null, 2));

        // Add files
        if (document.storageId && document.name) {
            const ext = getFileExtension(document.name);

            try {
                // Add original file
                const originalData = await loadTauriFile(document.storageId, ext, false);
                zip.file(`original${ext}`, originalData);

                // Add annotated file if exists
                if (document.status === 'Annotated' || document.status === 'Review' || document.status === 'Processed') {
                    try {
                        const annotatedData = await loadTauriFile(document.storageId, ext, true);
                        zip.file(`annotated${ext}`, annotatedData);
                    } catch (e) {
                        console.log('[Export] No annotated file for document');
                    }
                }
            } catch (error) {
                console.error('[Export] Failed to load document file:', error);
            }
        }

        // Generate ZIP
        let zipBlob = await zip.generateAsync({ type: 'blob' });

        // Encrypt if password provided
        if (password) {
            const zipArrayBuffer = await zipBlob.arrayBuffer();
            const zipData = new Uint8Array(zipArrayBuffer);
            const encrypted = await encryptWithPassword(Array.from(zipData), password);
            zipBlob = new Blob([encrypted], { type: 'application/octet-stream' });
        }

        // Save file dialog
        const filePath = await save({
            defaultPath: `${document.name.replace(/\.[^/.]+$/, '')}.aldoc`,
            filters: [{
                name: 'AnnotaLoop Document',
                extensions: ['aldoc']
            }]
        });

        if (!filePath) return false; // User cancelled

        // Write file
        const arrayBuffer = await zipBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await tauriWriteFile(filePath, uint8Array);

        console.log(`[Export] Document exported successfully: ${filePath}`);
        return true;
    } catch (error) {
        console.error('[Export] Failed to export document:', error);
        throw error;
    }
}

/**
 * Export labels as .allabels file
 * @param labels - Labels to export
 * @param filename - Suggested filename
 * @returns True if export successful
 */
export async function exportLabels(labels: Label[], filename: string): Promise<boolean> {
    try {
        const jsonString = JSON.stringify(labels, null, 2);

        const filePath = await save({
            defaultPath: `${filename}.allabels`,
            filters: [{
                name: 'AnnotaLoop Labels',
                extensions: ['allabels']
            }]
        });

        if (!filePath) return false;

        const encoder = new TextEncoder();
        await tauriWriteFile(filePath, encoder.encode(jsonString));

        console.log('[Export] Labels exported successfully');
        return true;
    } catch (error) {
        console.error('[Export] Failed to export labels:', error);
        throw error;
    }
}

/**
 * Export rules as .alrules file
 * @param rules - Rules to export
 * @param filename - Suggested filename
 * @returns True if export successful
 */
export async function exportRules(rules: Rule[], filename: string): Promise<boolean> {
    try {
        const jsonString = JSON.stringify(rules, null, 2);

        const filePath = await save({
            defaultPath: `${filename}.alrules`,
            filters: [{
                name: 'AnnotaLoop Rules',
                extensions: ['alrules']
            }]
        });

        if (!filePath) return false;

        const encoder = new TextEncoder();
        await tauriWriteFile(filePath, encoder.encode(jsonString));

        console.log('[Export] Rules exported successfully');
        return true;
    } catch (error) {
        console.error('[Export] Failed to export rules:', error);
        throw error;
    }
}

/**
 * Export multiple documents as a project (batch export)
 * @param documents - Documents to export
 * @param projectName - Name for the exported project
 * @param password - Optional password
 * @returns True if export successful
 */
export async function exportBatchDocuments(
    documents: Document[],
    projectName: string,
    password?: string
): Promise<boolean> {
    try {
        const zip = new JSZip();

        // Create a minimal project structure
        const project: Partial<Project> = {
            name: projectName,
            desc: 'Batch exported documents',
            labels: [], // Empty - documents have their own labels
            rules: []   // Empty - documents have their own rules
        };

        zip.file('project.json', JSON.stringify(project, null, 2));
        zip.file('documents.json', JSON.stringify(documents, null, 2));

        // Add files
        const filesFolder = zip.folder('files');
        if (!filesFolder) throw new Error('Failed to create files folder');

        for (const doc of documents) {
            if (doc.storageId && doc.name) {
                const ext = getFileExtension(doc.name);

                try {
                    const originalData = await loadTauriFile(doc.storageId, ext, false);
                    filesFolder.file(`${doc.storageId}_original${ext}`, originalData);

                    if (doc.status === 'Annotated' || doc.status === 'Review' || doc.status === 'Processed') {
                        try {
                            const annotatedData = await loadTauriFile(doc.storageId, ext, true);
                            filesFolder.file(`${doc.storageId}_annotated${ext}`, annotatedData);
                        } catch (e) {
                            console.log(`[Export] No annotated file for ${doc.name}`);
                        }
                    }
                } catch (error) {
                    console.error(`[Export] Failed to load file for ${doc.name}:`, error);
                }
            }
        }

        // Generate and save
        let zipBlob = await zip.generateAsync({ type: 'blob' });

        if (password) {
            const zipArrayBuffer = await zipBlob.arrayBuffer();
            const zipData = new Uint8Array(zipArrayBuffer);
            const encrypted = await encryptWithPassword(Array.from(zipData), password);
            zipBlob = new Blob([encrypted], { type: 'application/octet-stream' });
        }

        const filePath = await save({
            defaultPath: `${projectName}.alproj`,
            filters: [{
                name: 'AnnotaLoop Project',
                extensions: ['alproj']
            }]
        });

        if (!filePath) return false;

        const arrayBuffer = await zipBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await tauriWriteFile(filePath, uint8Array);

        console.log('[Export] Batch documents exported successfully');
        return true;
    } catch (error) {
        console.error('[Export] Failed to export batch documents:', error);
        throw error;
    }
}

// Import functions will be implemented next
export interface ImportResult {
    success: boolean;
    type: 'project' | 'document' | 'labels' | 'rules' | 'batch';
    data?: any;
    error?: string;
}

/**
 * Import project from .alproj file
 * @param filePath - Path to .alproj file
 * @param password - Optional password for decryption
 * @param nextProjectId - Next available project ID
 * @param nextDocumentId - Next available document ID
 * @returns Import result with project and documents data
 */
export async function importProject(
    filePath: string,
    password: string | undefined,
    nextProjectId: number,
    nextDocumentId: number,
    existingProjectNames: string[] = [],
    existingDocNames: string[] = []
): Promise<ImportResult> {
    try {
        // Read file
        const fileData = await tauriReadFile(filePath);
        let zipData: Uint8Array = fileData;

        // Check if file is a valid ZIP (starts with PK magic bytes)
        const isZip = fileData[0] === 0x50 && fileData[1] === 0x4B;

        if (!isZip) {
            // File is likely encrypted (base64 encoded)
            if (!password) {
                return {
                    success: false,
                    type: 'project',
                    error: 'This file is encrypted. Please provide the password.'
                };
            }

            try {
                const decoder = new TextDecoder();
                const encryptedString = decoder.decode(fileData);
                const decryptedArray = await decryptWithPassword(encryptedString, password);
                zipData = new Uint8Array(decryptedArray);
            } catch (error) {
                return {
                    success: false,
                    type: 'project',
                    error: 'Incorrect password or corrupted file'
                };
            }
        }

        // Extract ZIP
        const zip = await JSZip.loadAsync(zipData);

        // Read project and documents metadata
        const projectFile = zip.file('project.json');
        const documentsFile = zip.file('documents.json');

        if (!projectFile || !documentsFile) {
            return {
                success: false,
                type: 'project',
                error: 'Invalid project file format'
            };
        }

        const projectJson = await projectFile.async('text');
        const documentsJson = await documentsFile.async('text');

        const project: Project = JSON.parse(projectJson);
        const documents: Document[] = JSON.parse(documentsJson);

        // Assign new IDs and generate unique project name
        project.id = nextProjectId;
        project.name = generateUniqueName(project.name, existingProjectNames);
        project.date = new Date().toISOString();

        const docIdMap = new Map<number, number>();
        let currentDocId = nextDocumentId;
        const usedDocNames = [...existingDocNames]; // Track used names

        for (const doc of documents) {
            docIdMap.set(doc.id, currentDocId);
            doc.id = currentDocId;
            doc.projectId = nextProjectId;

            // CRITICAL: Get file extension from ORIGINAL name BEFORE uniquifying
            // Otherwise "sample_1.pdf" → "sample_1.pdf_1" and getFileExtension returns ".pdf_1" instead of ".pdf"
            const originalExt = getFileExtension(doc.name);

            doc.name = generateUniqueName(doc.name, usedDocNames);
            usedDocNames.push(doc.name); // Add to used names
            currentDocId++;

            // Restore files
            if (doc.storageId && doc.name) {
                const ext = originalExt; // Use the extension from the original name
                console.log(`[Import] Processing document: ${doc.name}, storageId: ${doc.storageId}, ext: ${ext}`);

                // Generate new storage ID
                const newStorageId = crypto.randomUUID();
                const oldStorageId = doc.storageId;
                doc.storageId = newStorageId;
                console.log(`[Import] Old storage ID: ${oldStorageId}, New storage ID: ${newStorageId}`);

                // Restore original file
                const originalFileName = `${oldStorageId}_original${ext}`;
                console.log(`[Import] Looking for file in ZIP: files/${originalFileName}`);

                // List all files in ZIP for debugging
                const filesInZip = Object.keys(zip.files).filter(f => f.startsWith('files/'));
                console.log(`[Import] Files in ZIP 'files/' folder:`, filesInZip);

                const originalFile = zip.file(`files/${originalFileName}`);
                console.log(`[Import] originalFile found:`, !!originalFile);

                if (originalFile) {
                    try {
                        const originalData = await originalFile.async('uint8array');
                        console.log(`[Import] Original file data size: ${originalData.length} bytes`);

                        // Save to both Tauri storage AND IndexedDB for consistency
                        await saveTauriFile(originalData, newStorageId, ext, false);
                        console.log(`[Import] Saved to Tauri storage: ${newStorageId}${ext}`);

                        // Also save to IndexedDB so ExportPage/other components can load it
                        try {
                            const { saveBytesToStorage } = await import('./fileStorage');
                            await saveBytesToStorage(originalData, newStorageId, doc.name);
                            console.log(`[Import] Saved file to IndexedDB: ${doc.name}`);
                        } catch (e) {
                            console.warn(`[Import] Could not save to IndexedDB, will use Tauri storage:`, e);
                        }
                    } catch (saveError) {
                        console.error(`[Import] Failed to save original file:`, saveError);
                    }
                } else {
                    console.warn(`[Import] Original file NOT FOUND in ZIP: files/${originalFileName}`);
                }

                // Restore annotated file if exists
                const annotatedFileName = `${oldStorageId}_annotated${ext}`;
                const annotatedFile = zip.file(`files/${annotatedFileName}`);
                if (annotatedFile) {
                    try {
                        const annotatedData = await annotatedFile.async('uint8array');
                        await saveTauriFile(annotatedData, newStorageId, ext, true);
                        console.log(`[Import] Saved annotated file to Tauri storage`);
                    } catch (saveError) {
                        console.error(`[Import] Failed to save annotated file:`, saveError);
                    }
                }
            }
        }

        console.log('[Import] Project imported successfully');
        return {
            success: true,
            type: 'project',
            data: { project, documents }
        };
    } catch (error) {
        console.error('[Import] Failed to import project:', error);
        return {
            success: false,
            type: 'project',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Import document from .aldoc file
 * @param filePath - Path to .aldoc file
 * @param password - Optional password
 * @param targetProjectId - Project ID to import into
 * @param nextDocumentId - Next available document ID
 * @returns Import result with document, labels, and rules
 */
export async function importDocument(
    filePath: string,
    password: string | undefined,
    targetProjectId: number,
    nextDocumentId: number,
    existingNames: string[] = []
): Promise<ImportResult> {
    try {
        // Read file
        const fileData = await tauriReadFile(filePath);
        let zipData = fileData;

        // Decrypt if password provided
        if (password) {
            try {
                const decoder = new TextDecoder();
                const encryptedString = decoder.decode(fileData);
                const decryptedArray = await decryptWithPassword(encryptedString, password);
                zipData = new Uint8Array(decryptedArray);
            } catch (error) {
                return {
                    success: false,
                    type: 'document',
                    error: 'Incorrect password or corrupted file'
                };
            }
        }

        // Extract ZIP
        const zip = await JSZip.loadAsync(zipData);

        // Read metadata
        const documentFile = zip.file('document.json');
        const labelsFile = zip.file('labels.json');
        const rulesFile = zip.file('rules.json');

        if (!documentFile) {
            return {
                success: false,
                type: 'document',
                error: 'Invalid document file format'
            };
        }

        const documentJson = await documentFile.async('text');
        const document: Document = JSON.parse(documentJson);

        const labels: Label[] = labelsFile ? JSON.parse(await labelsFile.async('text')) : [];
        const rules: Rule[] = rulesFile ? JSON.parse(await rulesFile.async('text')) : [];

        // Assign new IDs
        document.id = nextDocumentId;
        document.projectId = targetProjectId;
        document.projectId = targetProjectId;
        document.date = new Date().toISOString();

        // Handle duplicate names
        if (document.name) {
            document.name = generateUniqueName(document.name, existingNames);
        }

        // Restore files
        if (document.name) {
            const ext = getFileExtension(document.name);
            const newStorageId = crypto.randomUUID();
            document.storageId = newStorageId;

            // Restore original file
            const originalFile = zip.file(`original${ext}`);
            if (originalFile) {
                const originalData = await originalFile.async('uint8array');
                await saveTauriFile(originalData, newStorageId, ext, false);
            }

            // Restore annotated file if exists
            const annotatedFile = zip.file(`annotated${ext}`);
            if (annotatedFile) {
                const annotatedData = await annotatedFile.async('uint8array');
                await saveTauriFile(annotatedData, newStorageId, ext, true);
            }
        }

        console.log('[Import] Document imported successfully');
        return {
            success: true,
            type: 'document',
            data: { document, labels, rules }
        };
    } catch (error) {
        console.error('[Import] Failed to import document:', error);
        return {
            success: false,
            type: 'document',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Import labels from .allabels file
 * @param filePath - Path to .allabels file
 * @returns Import result with labels
 */
export async function importLabels(filePath: string): Promise<ImportResult> {
    try {
        const fileData = await tauriReadFile(filePath);
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(fileData);
        const labels: Label[] = JSON.parse(jsonString);

        console.log('[Import] Labels imported successfully');
        return {
            success: true,
            type: 'labels',
            data: labels
        };
    } catch (error) {
        console.error('[Import] Failed to import labels:', error);
        return {
            success: false,
            type: 'labels',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Import rules from .alrules file
 * @param filePath - Path to .alrules file
 * @returns Import result with rules
 */
export async function importRules(filePath: string): Promise<ImportResult> {
    try {
        const fileData = await tauriReadFile(filePath);
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(fileData);
        const rules: Rule[] = JSON.parse(jsonString);

        console.log('[Import] Rules imported successfully');
        return {
            success: true,
            type: 'rules',
            data: rules
        };
    } catch (error) {
        console.error('[Import] Failed to import rules:', error);
        return {
            success: false,
            type: 'rules',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

