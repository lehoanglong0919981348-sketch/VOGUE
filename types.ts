
export type VideoType = 'fashion';
export type ActiveTab = 'generator' | 'tracker';
export type JobStatus = 'Pending' | 'Processing' | 'Generating' | 'Completed' | 'Failed';

export interface Scene {
  scene_number: number;
  scene_title: string;
  prompt_text: string;
}

export interface UploadedImage {
  file: File; // Needed to get the path for Excel
  base64: string;
  mimeType: string;
  preview: string;
}

export interface FormData {
  idea: string;
  projectName: string;
  model: string; // AI Model
  sceneCount: number; // Replaces songMinutes/songSeconds
  
  // Fashion Specifics
  fashionStyle: string; // e.g., Streetwear, Haute Couture, Minimalist
  modelDemographic: string; // e.g., Female 20s, Male 30s
  setting: string; // e.g., Runway, Urban Street, Studio
  cameraMood: string; // e.g., Dynamic, Slow Motion, Glitch
  
  fashionImages: UploadedImage[]; // Max 3
  
  temperature: number;
}

export interface VideoJob {
    id: string;
    prompt: string;
    imagePath: string;
    imagePath2: string;
    imagePath3: string;
    status: JobStatus;
    videoName: string;
    typeVideo: string;
    videoPath?: string;
  }
  
export interface TrackedFile {
  name: string;
  jobs: VideoJob[];
  path?: string;
  targetDurationSeconds?: number;
}

export interface ApiKey {
  id: string;
  name: string;
  value: string;
}

export interface Preset {
    id: string;
    name: string;
    settings: Partial<FormData>;
}

export interface AppConfig {
  machineId?: string;
  licenseKey?: string;
  apiKeysEncrypted?: string;
  activeApiKeyId?: string;
  presets?: Preset[];
  toolFlowPath?: string;
}

export interface DailyStats {
    date: string;
    count: number;
}

export interface StatsData {
    machineId: string;
    history: DailyStats[];
    total: number;
    promptCount: number;
    totalCredits: number;
}
