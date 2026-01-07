/**
 * Core type definitions for AnnotaLoop
 */

// --- Label and Rule Types ---

export interface Label {
    id: string;
    name: string;
    color: string;
    desc?: string;
}

export interface Rule {
    id: string;
    name: string;
    logic: string;
}

// --- Annotation Types ---

export interface AnnotationCoord {
    pageIndex: number;
    boundingRect: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        width: number;
        height: number;
    };
}

export interface AnnotationColor {
    rgb: [number, number, number];
    hex: string;
    soft: string;
}

export interface Annotation {
    id: string;
    text: string;
    labelId: string;
    rationale: string;
    confidence?: number;
    status: 'pending' | 'accepted' | 'rejected';
    coords?: AnnotationCoord[];
    color?: AnnotationColor;
}

export interface RuleEvaluation {
    ruleId: string;
    pass: boolean;
    rationale: string;
    citations: string[];
    confidence?: number;
}

export interface ReviewData {
    annotations: Annotation[];
    ruleEvaluations?: RuleEvaluation[];
    modelUsed?: string;
    processedAt?: string;
    inputTokens?: number;
    outputTokens?: number;
}

// --- Project and Document Types ---

export interface Project {
    id: number;
    name: string;
    desc?: string;
    date: string;
    docCount: number;
    labels: Label[];
    rules: Rule[];
}

export interface Document {
    id: number;
    name: string;
    status: 'Ready' | 'Annotated' | 'Review' | 'Processed' | 'In Progress' | 'Error';
    size: string;
    tokens?: string;
    tokenCount?: number;
    date: string;
    projectId: number;
    fileUrl?: string;
    storageId?: string;
    extractedText?: string;
    processingCompleted?: boolean;
    lastProcessedAt?: string;
    reviewData?: ReviewData;
    labels?: Label[];
    rules?: Rule[];
}

// --- UI State Types ---

export type ViewType = 'grid' | 'table';
export type DeleteType = 'document' | 'project' | 'batch' | null;

export interface SecurityState {
    enabled: boolean;
    pin: string;
    secret: string;
    locked: boolean;
}

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    models: string[];
    defaultModel?: string;
}

export interface SettingsState {
    defaultProvider: string;
    defaultModel: string;
    providers: {
        mistral: ProviderConfig;
        openai: ProviderConfig;
        anthropic: ProviderConfig;
        gemini: ProviderConfig;
        openrouter: ProviderConfig;
        ollama: ProviderConfig;
        lmstudio: ProviderConfig;
        [key: string]: ProviderConfig;
    };
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
    show: boolean;
    type: ToastType;
    title: string;
    message: string;
}

export interface BatchProcessingState {
    isActive: boolean;
    isMinimized: boolean;
    documentIds: number[];
    completed: number;
    failed: number;
    total: number;
    currentDocName: string;
    status: 'idle' | 'processing' | 'completed' | 'finished' | 'error';
}

// --- App State ---

export interface AppState {
    projects: Project[];
    documents: Document[];
    currentProject: Project | null;
    annotatingDocId: number | null;
    selectedDocs: Set<number>;
    view: ViewType;
    deleteType: DeleteType;
    deleteTarget: number | null;
    security: SecurityState;
    settings: SettingsState;
    editingLabelIndex: number | null;
    editingRuleIndex: number | null;
    documentFilter: string;
    documentSearchQuery: string;
    toast: ToastState;
    batchState: BatchProcessingState;
}

// Force FS update
