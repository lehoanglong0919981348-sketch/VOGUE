
export type JobType = 'fashion_photo';
export type ActiveTab = 'generator' | 'tracker';
export type JobStatus = 'Pending' | 'Processing' | 'Generating' | 'Completed' | 'Failed';

export interface ImagePrompt {
  image_number: number;
  image_title: string;
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
  imageCount: number; // Replaces sceneCount
  
  // Fashion Specifics
  fashionStyle: string; // e.g., Streetwear, Haute Couture
  modelDemographic: string; // e.g., Female 20s
  setting: string; // e.g., Studio
  cameraMood: string; // e.g., Cinematic Lighting
  
  // New Advanced Options
  quality: string; // e.g., 2K, 4K
  faceStrength: number; // 0-100%
  shotAngle: string; // e.g., Full Body, Close Up
  aspectRatio: string; // e.g., 9:16, 16:9
  
  fashionImages: (UploadedImage | null)[]; // Max 10 (Model, Outfit, Setting, Acc1...Acc7)
  
  temperature: number;
}

export interface ImageJob {
    id: string;
    prompt: string;
    imagePath: string; // Ref Image 1 (Model)
    imagePath2: string; // Ref Image 2 (Outfit)
    imagePath3: string; // Ref Image 3 (Setting)
    imagePath4?: string; // Ref Image 4 (Accessory 1)
    imagePath5?: string; // Ref Image 5 (Accessory 2)
    imagePath6?: string; // Ref Image 6 (Accessory 3)
    imagePath7?: string; // Ref Image 7 (Accessory 4)
    imagePath8?: string; // Ref Image 8 (Accessory 5)
    imagePath9?: string; // Ref Image 9 (Accessory 6)
    imagePath10?: string; // Ref Image 10 (Accessory 7)
    status: JobStatus;
    fileName: string; // Desired output filename
    typeJob: string; // IN2IMG
    generatedFilePath?: string; // Result image path
  }
  
export interface TrackedFile {
  name: string;
  jobs: ImageJob[];
  path?: string;
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