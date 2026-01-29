
import React, {
  useState,
  useCallback,
  ChangeEvent,
  useEffect,
  useRef,
} from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import * as XLSX from 'xlsx';
import CryptoJS from 'crypto-js';
import { ImagePrompt, FormData, ActiveTab, ImageJob, JobStatus, TrackedFile, ApiKey, AppConfig, Preset } from './types';
import { fashionSystemPrompt } from './constants';
import { LoaderIcon, KeyIcon, ChartIcon, ShieldIcon, UpdateIcon } from './components/Icons';

// Components
import Activation from './components/Activation';
import ApiKeyManager from './components/ApiKeyManager';
import StatsModal from './components/StatsModal';
import AdminLoginModal from './components/AdminLoginModal';
import AlertModal from './components/AlertModal';
import GeneratorTab from './components/GeneratorTab';
import TrackerTab from './components/TrackerTab';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const ipcRenderer = isElectron && (window as any).require ? (window as any).require('electron').ipcRenderer : null;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  
  // FASHION FORM DATA
  const [formData, setFormData] = useState<FormData>({
    idea: '',
    projectName: '',
    model: 'gemini-2.5-flash',
    imageCount: 5, // Default number of prompts
    fashionStyle: 'High Fashion / Editorial',
    modelDemographic: 'Female Model',
    setting: 'Studio / Minimalist',
    cameraMood: 'Natural / Soft',
    
    // New Defaults
    quality: '4K',
    faceStrength: 100,
    shotAngle: 'Full Body',
    aspectRatio: '9:16',

    // Initialize with 10 null slots to maintain fixed positions
    fashionImages: Array(10).fill(null), 
    temperature: 0.4,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'info', message: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<ImagePrompt[]>([]);
  
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [machineId, setMachineId] = useState<string>('');
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activeApiKey, setActiveApiKey] = useState<ApiKey | null>(null);
  const [isManagingKeys, setIsManagingKeys] = useState(false);

  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  const [activeTrackerFileIndex, setActiveTrackerFileIndex] = useState<number>(0);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const [alertModal, setAlertModal] = useState<{title: string, message: string, type: 'completion' | 'update', onConfirm?: () => void} | null>(null);
  
  // --- Admin & Stats State ---
  const [showStats, setShowStats] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // --- Update State ---
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const fileDiscoveryRef = useRef<Set<string>>(new Set());
  const SECRET_KEY = 'your-super-secret-key-for-mv-prompt-generator-pro-2024';

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => { setFeedback(null); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // ... [Encryption & Activation Logic - Kept Same] ...
  const getEncryptionKey = useCallback((mid: string) => CryptoJS.SHA256(mid + SECRET_KEY).toString(), []);
  const encrypt = useCallback((text: string) => {
    if (!machineId) return '';
    return CryptoJS.AES.encrypt(text, getEncryptionKey(machineId)).toString();
  }, [machineId, getEncryptionKey]);

  const validateLicenseKey = useCallback(async (key: string): Promise<boolean> => {
    if (!machineId) return false;
    try {
      const parts = key.trim().split('.');
      if (parts.length !== 2) return false;
      const [receivedMachineId, receivedSignature] = parts;
      if (receivedMachineId !== machineId) return false;
      const expectedSignature = CryptoJS.HmacSHA256(machineId, SECRET_KEY).toString(CryptoJS.enc.Hex);
      return receivedSignature === expectedSignature;
    } catch (e) { return false; }
  }, [machineId]);

  const handleActivate = useCallback(async (key: string): Promise<boolean> => {
      const isValid = await validateLicenseKey(key);
      if (isValid) {
          if (isElectron && ipcRenderer) {
              await ipcRenderer.invoke('save-app-config', { licenseKey: key, machineId: machineId });
          }
          setIsActivated(true);
          return true;
      }
      return false;
  }, [validateLicenseKey, machineId]);
  
  const handleKeyAdd = (newKey: ApiKey) => {
    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    if (isElectron && ipcRenderer) {
        ipcRenderer.invoke('save-app-config', { apiKeysEncrypted: encrypt(JSON.stringify(updatedKeys)) });
    }
  };

  const handleKeyDelete = (keyId: string) => {
    const updatedKeys = apiKeys.filter(k => k.id !== keyId);
    setApiKeys(updatedKeys);
    const configUpdate: { apiKeysEncrypted: string, activeApiKeyId?: string | null } = {
        apiKeysEncrypted: encrypt(JSON.stringify(updatedKeys))
    };
    if(activeApiKey?.id === keyId) {
      setActiveApiKey(null);
      configUpdate.activeApiKeyId = null;
    }
    if (isElectron && ipcRenderer) ipcRenderer.invoke('save-app-config', configUpdate);
  };

  const handleKeySelect = (key: ApiKey) => {
    setActiveApiKey(key);
    if (isElectron && ipcRenderer) ipcRenderer.invoke('save-app-config', { activeApiKeyId: key.id });
    setIsManagingKeys(false);
  };

  useEffect(() => {
    if (isElectron && ipcRenderer) {
      ipcRenderer.invoke('get-app-config').then(async (config: AppConfig) => {
        let currentMachineId = config.machineId || '';
        let finalConfig = { ...config };
        let isActivatedResult = false;
        
        const localValidateLicenseKey = (key: string, mid: string): boolean => {
          if (!key || !mid) return false;
          try {
            const parts = key.trim().split('.');
            if (parts.length !== 2) return false;
            const [receivedMachineId, receivedSignature] = parts;
            if (receivedMachineId !== mid) return false;
            const expectedSignature = CryptoJS.HmacSHA256(mid, SECRET_KEY).toString(CryptoJS.enc.Hex);
            return receivedSignature === expectedSignature;
          } catch (e) { return false; }
        };
  
        if (finalConfig.licenseKey && currentMachineId && localValidateLicenseKey(finalConfig.licenseKey, currentMachineId)) {
          isActivatedResult = true;
        } 
        
        setMachineId(currentMachineId);
        setIsActivated(isActivatedResult);
  
        const decryptLocal = (ciphertext: string, mid: string) => {
          if (!mid || !ciphertext) return '';
          try {
            const getEncryptionKeyLocal = () => CryptoJS.SHA256(mid + SECRET_KEY).toString();
            const bytes = CryptoJS.AES.decrypt(ciphertext, getEncryptionKeyLocal());
            return bytes.toString(CryptoJS.enc.Utf8);
          } catch { return ''; }
        };
  
        const decryptedKeysStr = decryptLocal(finalConfig.apiKeysEncrypted || '', currentMachineId);
        let loadedKeys: ApiKey[] = [];
        if (decryptedKeysStr) {
          try { loadedKeys = JSON.parse(decryptedKeysStr); } catch { }
        }
        setApiKeys(loadedKeys);
  
        const activeKeyId = finalConfig.activeApiKeyId;
        if (activeKeyId) {
          const keyToActivate = loadedKeys.find(k => k.id === activeKeyId);
          if (keyToActivate) setActiveApiKey(keyToActivate);
        }
        
        if (finalConfig.presets) setPresets(finalConfig.presets);
        setConfigLoaded(true);
      });
    } else {
      setIsActivated(true);
      setConfigLoaded(true);
    }
  }, []);

  const parseExcelData = (data: Uint8Array): ImageJob[] => {
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dataAsArrays: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    if (dataAsArrays.length < 2) return [];

    const headers: string[] = dataAsArrays[0].map(h => String(h).trim());
    const headerMap: { [key: string]: number } = {};
    headers.forEach((h, i) => { headerMap[h] = i; });
    
    const dataRows = dataAsArrays.slice(1);
    const validStatuses: JobStatus[] = ['Pending', 'Processing', 'Generating', 'Completed', 'Failed'];

    return dataRows.map((rowArray, index) => {
        const get = (headerName: string) => rowArray[headerMap[headerName]] || '';
        let statusStr = String(get('STATUS')).trim();
        let status: JobStatus = 'Pending';
        if (statusStr && validStatuses.includes(statusStr as JobStatus)) {
            status = statusStr as JobStatus;
        }

        return {
            id: get('JOB_ID') || `job_${index + 1}`,
            prompt: get('PROMPT') || '',
            imagePath: get('IMAGE_PATH') || '',
            imagePath2: get('IMAGE_PATH_2') || '',
            imagePath3: get('IMAGE_PATH_3') || '',
            imagePath4: get('IMAGE_PATH_4') || '',
            imagePath5: get('IMAGE_PATH_5') || '',
            imagePath6: get('IMAGE_PATH_6') || '',
            imagePath7: get('IMAGE_PATH_7') || '',
            imagePath8: get('IMAGE_PATH_8') || '',
            imagePath9: get('IMAGE_PATH_9') || '',
            imagePath10: get('IMAGE_PATH_10') || '',
            status: status,
            fileName: get('IMAGE_NAME') || '',
            typeJob: get('TYPE_JOB') || '',
            generatedFilePath: get('GENERATED_PATH') || undefined,
        };
    }).filter(job => job.id && String(job.id).trim());
  };

  useEffect(() => {
      if (!ipcRenderer) return;
      const handleFileUpdate = (_event: any, { path, content }: { path: string, content: Uint8Array }) => {
          const newJobs = parseExcelData(content);
          setTrackedFiles(prevFiles => prevFiles.map(file => file.path === path ? { ...file, jobs: newJobs } : file));
      };
      const handleShowAlertModal = (_event: any, data: { title: string, message: string, type: 'completion' | 'update', onConfirm?: () => void }) => {
        if (data.type === 'update') {
            setAlertModal({ ...data, onConfirm: () => ipcRenderer.send('restart_app') });
        } else {
            setAlertModal(data);
        }
      };
      // Handle update status from Main process
      const handleUpdateStatus = (_event: any, data: { status: string, message: string }) => {
          setCheckingUpdate(data.status === 'checking' || data.status === 'downloading');
          setFeedback({ type: 'info', message: data.message });
      };

      ipcRenderer.on('file-content-updated', handleFileUpdate);
      ipcRenderer.on('show-alert-modal', handleShowAlertModal);
      ipcRenderer.on('update-status', handleUpdateStatus);
      return () => {
          ipcRenderer.removeListener('file-content-updated', handleFileUpdate);
          ipcRenderer.removeListener('show-alert-modal', handleShowAlertModal);
          ipcRenderer.removeListener('update-status', handleUpdateStatus);
      };
  }, []);

  useEffect(() => {
      if (!ipcRenderer) return;
      const watchedPaths = new Set(trackedFiles.map(f => f.path).filter((path): path is string => !!path));
      const previousWatchedPaths = new Set<string>(JSON.parse(sessionStorage.getItem('watchedPaths') || '[]') as string[]);
      watchedPaths.forEach(path => { if (!previousWatchedPaths.has(path)) ipcRenderer.send('start-watching-file', path); });
      previousWatchedPaths.forEach(path => { if (!watchedPaths.has(path)) ipcRenderer.send('stop-watching-file', path); });
      sessionStorage.setItem('watchedPaths', JSON.stringify(Array.from(watchedPaths)));
  }, [trackedFiles]);

  useEffect(() => {
        if (!ipcRenderer || activeTab !== 'tracker' || trackedFiles.length === 0) return;
        const intervalId = setInterval(async () => {
            let hasChanges = false;
            const updatedFilesPromises = trackedFiles.map(async (file) => {
                if (!file.path) return file;
                try {
                    const result = await ipcRenderer.invoke('find-videos-for-jobs', { jobs: file.jobs, excelFilePath: file.path });
                    if (result.success && JSON.stringify(result.jobs) !== JSON.stringify(file.jobs)) {
                        hasChanges = true;
                        return { ...file, jobs: result.jobs };
                    }
                    return file;
                } catch (e) { return file; }
            });
            const resolvedFiles = await Promise.all(updatedFilesPromises);
            if (hasChanges) setTrackedFiles(resolvedFiles);
        }, 10000); 
        return () => clearInterval(intervalId);
    }, [activeTab, trackedFiles]);

  const getFolderPath = (filePath: string | undefined): string => {
    if (!filePath) return '';
    const isWindows = navigator.userAgent.includes("Windows");
    const separator = isWindows ? '\\' : '/';
    return filePath.substring(0, filePath.lastIndexOf(separator));
  };
  
  useEffect(() => {
    const currentFile = trackedFiles.length > 0 ? trackedFiles[activeTrackerFileIndex] : null;
    if (isElectron && ipcRenderer && currentFile?.path) {
        const hasIncompleteJobs = currentFile.jobs.some(j => j.status === 'Completed' && !j.generatedFilePath);
        const discoveryKey = `${currentFile.path}-${currentFile.jobs.map(j => j.status).join(',')}`;
        if (hasIncompleteJobs && !fileDiscoveryRef.current.has(discoveryKey)) {
            const filePath = currentFile.path;
            ipcRenderer.invoke('find-videos-for-jobs', { jobs: currentFile.jobs, excelFilePath: filePath })
                .then((result: { success: boolean; jobs: ImageJob[]; error?: string; }) => {
                    if (result.success) {
                        setTrackedFiles(prevFiles => prevFiles.map(file => file.path === filePath ? { ...file, jobs: result.jobs } : file));
                        fileDiscoveryRef.current.add(discoveryKey);
                    }
                });
        }
    }
  }, [trackedFiles, activeTrackerFileIndex]);


  // Handle Input Logic
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else if (name === 'temperature') {
        setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
      } else if (name === 'faceStrength') {
        setFormData((prev) => ({ ...prev, [name]: parseInt(value) }));
      } else if (name === 'imageCount') {
         let val = parseInt(value);
         if (isNaN(val) || val < 1) val = 1;
         if (val > 50) val = 50; // Max reasonable limit
         setFormData(prev => ({ ...prev, imageCount: val }));
      } else { setFormData((prev) => ({ ...prev, [name]: value })); }
    },[],
  );

  const handleFashionImagesUpload = useCallback((e: ChangeEvent<HTMLInputElement>, index: number) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
              const base64 = reader.result.split(',')[1];
              const mimeType = file.type;
              
              setFormData(prev => {
                  const newImages = [...prev.fashionImages];
                  // Assign by specific index (0=Model, 1=Outfit, 2=Setting, 3-9=Acc)
                  newImages[index] = { file, base64, mimeType, preview: reader.result as string };
                  return { ...prev, fashionImages: newImages };
              });
          }
      };
      reader.readAsDataURL(file);
  }, []);

  const handleRemoveFashionImage = (index: number) => {
      setFormData(prev => {
          const newImages = [...prev.fashionImages];
          // Do not splice, just nullify to keep the slot empty and prevent shifting
          newImages[index] = null;
          return { ...prev, fashionImages: newImages };
      });
  };

  // --- Generate Logic (FASHION PHOTO) ---
  const generatePrompts = async () => {
    if (!activeApiKey) { setFeedback({ type: 'error', message: 'Yêu cầu API Key.' }); setIsManagingKeys(true); return; }
    setIsLoading(true); setFeedback(null); setGeneratedImages([]);

    let userPrompt = `TASK: Generate exactly ${formData.imageCount} professional commercial fashion photography prompts.`;
    userPrompt += `\n**Campaign Concept:** "${formData.idea.trim() || 'High-End Product Launch'}"`;
    userPrompt += `\n**Base Specs:** Style: ${formData.fashionStyle}, Mood: ${formData.cameraMood}`;
    
    // Add New Specs
    userPrompt += `\n**TECHNICAL REQUIREMENTS:**`;
    userPrompt += `\n- **Aspect Ratio:** ${formData.aspectRatio}`;
    
    // Logic for Mixed Angle
    if (formData.shotAngle === 'Mixed') {
        userPrompt += `\n- **Shot Angle:** MIXED/RANDOM. You must vary the angle for each prompt (e.g., Wide, Full Body, Close Up, Low Angle).`;
    } else {
        userPrompt += `\n- **Shot Angle:** ${formData.shotAngle}`;
    }
    
    userPrompt += `\n- **Quality:** ${formData.quality}`;
    userPrompt += `\n- **Face Fidelity:** Preserve ${formData.faceStrength}% of the Model's facial features from Image 1.`;

    // Explicitly map inputs to the strict roles
    const img1 = formData.fashionImages[0];
    const img2 = formData.fashionImages[1];
    const img3 = formData.fashionImages[2];
    const img4 = formData.fashionImages[3]; // Accessory 1
    const img5 = formData.fashionImages[4]; // Accessory 2
    const img6 = formData.fashionImages[5]; // Accessory 3
    const img7 = formData.fashionImages[6]; // Accessory 4
    const img8 = formData.fashionImages[7]; // Accessory 5
    const img9 = formData.fashionImages[8]; // Accessory 6
    const img10 = formData.fashionImages[9]; // Accessory 7

    userPrompt += `\n\n**VISUAL ANALYSIS INSTRUCTIONS:**`;

    if (img1) userPrompt += `\n- **INGREDIENT 1 (MODEL):** Analyze and preserve the model's exact features (hair, face, body). Apply Face Fidelity: ${formData.faceStrength}%.`;
    else userPrompt += `\n- Ingredient 1: Not provided. (Cast a ${formData.modelDemographic})`;

    if (img2) userPrompt += `\n- **INGREDIENT 2 (THE OUTFIT - HERO PRODUCT):** Analyze and describe the outfit in extreme detail. The prompt MUST depict the model wearing this exact outfit.`;
    else userPrompt += `\n- Ingredient 2: Not provided. (Design: ${formData.fashionStyle})`;

    if (img3) userPrompt += `\n- **INGREDIENT 3 (SETTING):** Analyze the environment. The final image must take place here.`;
    else userPrompt += `\n- Ingredient 3: Not provided. (Location: ${formData.setting})`;

    if (img4) userPrompt += `\n- **INGREDIENT 4 (ACCESSORY 1):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img5) userPrompt += `\n- **INGREDIENT 5 (ACCESSORY 2):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img6) userPrompt += `\n- **INGREDIENT 6 (ACCESSORY 3):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img7) userPrompt += `\n- **INGREDIENT 7 (ACCESSORY 4):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img8) userPrompt += `\n- **INGREDIENT 8 (ACCESSORY 5):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img9) userPrompt += `\n- **INGREDIENT 9 (ACCESSORY 6):** Analyze this accessory. The model MUST be wearing/holding it.`;
    if (img10) userPrompt += `\n- **INGREDIENT 10 (ACCESSORY 7):** Analyze this accessory. The model MUST be wearing/holding it.`;

    userPrompt += `\n\n**OUTPUT REQUIREMENT:** Create ${formData.imageCount} distinct, naturally phrased, photorealistic image prompts. Ensure the model is wearing the outfit naturally within the setting. Focus on commercial appeal, sharp focus, and high-quality textures.`;

    const parts: any[] = [{ text: userPrompt }];
    
    // Attach Images for Analysis in order 0 to 9
    formData.fashionImages.forEach(img => {
        if (img) {
             parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        }
    });

    try {
      const ai = new GoogleGenAI({ apiKey: activeApiKey.value });
      const response = await ai.models.generateContent({
        model: formData.model,
        contents: { parts: parts },
        config: {
          systemInstruction: fashionSystemPrompt,
          temperature: formData.temperature,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    image_number: { type: Type.INTEGER },
                    image_title: { type: Type.STRING },
                    prompt_text: { type: Type.STRING },
                  },
                  required: ['image_number', 'image_title', 'prompt_text'],
                },
              },
            },
            required: ['prompts'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error('AI response was empty.');
      const parsedData = JSON.parse(responseText);
      if (parsedData.prompts && Array.isArray(parsedData.prompts)) {
        setGeneratedImages(parsedData.prompts);
        if (ipcRenderer) ipcRenderer.invoke('increment-prompt-count').catch(console.error);
      } else { throw new Error('AI response did not contain a valid "prompts" array.'); }
    } catch (err: any) {
      console.error('Error generating prompts:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: `Lỗi: ${errorMessage}` });
    } finally { setIsLoading(false); }
  };
  
  // --- Export Logic (Excel) ---
  const startProcess = async () => {
    if (generatedImages.length === 0) { setFeedback({ type: 'error', message: 'Không có prompt.' }); return; }
    setFeedback(null);
    try {
      const safeProjectName = (formData.projectName.trim() || 'Fashion_Shoot').replace(/[^a-zA-Z0-9_]/g, '_');
      const safeFileName = safeProjectName.toLowerCase();
      const fullFileName = `${safeFileName}.xlsx`;
      
      const img1 = formData.fashionImages[0] ? (formData.fashionImages[0].file as any).path : '';
      const img2 = formData.fashionImages[1] ? (formData.fashionImages[1].file as any).path : '';
      const img3 = formData.fashionImages[2] ? (formData.fashionImages[2].file as any).path : '';
      const img4 = formData.fashionImages[3] ? (formData.fashionImages[3].file as any).path : '';
      const img5 = formData.fashionImages[4] ? (formData.fashionImages[4].file as any).path : '';
      const img6 = formData.fashionImages[5] ? (formData.fashionImages[5].file as any).path : '';
      const img7 = formData.fashionImages[6] ? (formData.fashionImages[6].file as any).path : '';
      const img8 = formData.fashionImages[7] ? (formData.fashionImages[7].file as any).path : '';
      const img9 = formData.fashionImages[8] ? (formData.fashionImages[8].file as any).path : '';
      const img10 = formData.fashionImages[9] ? (formData.fashionImages[9].file as any).path : '';

      // Determine TYPE_JOB based on image uploads
      const hasImages = !!img1 || !!img2 || !!img3 || !!img4 || !!img5 || !!img6 || !!img7 || !!img8 || !!img9 || !!img10;
      const typeJobValue = hasImages ? 'IN2IMG' : 'TXT2IMG';

      const dataForTracker: ImageJob[] = generatedImages.map((p, index) => ({
          id: `Job_${index + 1}`,
          prompt: p.prompt_text,
          imagePath: img1, 
          imagePath2: img2, 
          imagePath3: img3,
          imagePath4: img4,
          imagePath5: img5,
          imagePath6: img6,
          imagePath7: img7,
          imagePath8: img8,
          imagePath9: img9,
          imagePath10: img10,
          status: 'Pending',
          fileName: `${safeProjectName}_${index + 1}.png`,
          typeJob: typeJobValue,
      }));

      const dataForExcel = dataForTracker.map(job => ({ ...job, status: '' }));
      const headers = [['JOB_ID', 'PROMPT', 'IMAGE_PATH', 'IMAGE_PATH_2', 'IMAGE_PATH_3', 'IMAGE_PATH_4', 'IMAGE_PATH_5', 'IMAGE_PATH_6', 'IMAGE_PATH_7', 'IMAGE_PATH_8', 'IMAGE_PATH_9', 'IMAGE_PATH_10', 'STATUS', 'IMAGE_NAME', 'TYPE_JOB', 'GENERATED_PATH']];
      
      const worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.sheet_add_json(worksheet, dataForExcel, { header: ['id', 'prompt', 'imagePath', 'imagePath2', 'imagePath3', 'imagePath4', 'imagePath5', 'imagePath6', 'imagePath7', 'imagePath8', 'imagePath9', 'imagePath10', 'status', 'fileName', 'typeJob', 'generatedFilePath'], skipHeader: true, origin: 'A2' });
      worksheet['!cols'] = [{ wch: 15 }, { wch: 150 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 40 }];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts');
      
      let filePath: string | undefined;
      if (isElectron && ipcRenderer) {
        const fileContent = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const result = await ipcRenderer.invoke('save-file-dialog', { defaultPath: fullFileName, fileContent: fileContent });
        if (result.success) { setFeedback({ type: 'success', message: `Đã lưu: ${result.filePath}` }); filePath = result.filePath; }
        else if (result.error && result.error !== 'Save dialog canceled') throw new Error(`${result.error}`);
      } else { XLSX.writeFile(workbook, fullFileName); setFeedback({ type: 'success', message: 'Đang tải file Excel.' }); }

      const newTrackedFile: TrackedFile = { name: fullFileName, jobs: dataForTracker, path: filePath };
      setTrackedFiles(prevFiles => [...prevFiles, newTrackedFile]);
      setActiveTrackerFileIndex(trackedFiles.length);
      setActiveTab('tracker');

    } catch (err: any) { console.error('Error exporting file:', err); setFeedback({ type: 'error', message: 'Xuất file thất bại.' }); }
  };

  // ... [Tracked Files Logic - mostly same, cleaned up] ...
  const handleOpenNewFile = async () => {
    if (!ipcRenderer) return;
    setFeedback(null);
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (result.success && result.files.length > 0) {
        try {
            const newFiles: TrackedFile[] = [];
            for (const file of result.files) {
                const loadedJobs = parseExcelData(file.content);
                newFiles.push({ name: file.name, jobs: loadedJobs, path: file.path });
            }
            setTrackedFiles(prev => [...prev, ...newFiles]);
            setActiveTrackerFileIndex(trackedFiles.length + newFiles.length - 1);
        } catch (error) { setFeedback({ type: 'error', message: 'Lỗi Đọc File.' }); }
    } else if (result.error) { setFeedback({ type: 'error', message: `Lỗi Mở File: ${result.error}` }); }
  };

  const handleCloseTrackerTab = (indexToClose: number) => {
    setTrackedFiles(prev => prev.filter((_, index) => index !== indexToClose));
    if (activeTrackerFileIndex >= indexToClose) { setActiveTrackerFileIndex(prevIndex => Math.max(0, prevIndex - 1)); }
  };
  
  const handleLinkVideo = async (jobId: string, fileIndex: number) => {
    if (!ipcRenderer) return;
    const result = await ipcRenderer.invoke('open-video-file-dialog'); // This now looks for images
    if (result.success && result.path) {
        setTrackedFiles(prevFiles => {
            const newFiles = [...prevFiles];
            const fileToUpdate = { ...newFiles[fileIndex] };
            fileToUpdate.jobs = fileToUpdate.jobs.map(job => job.id === jobId ? { ...job, generatedFilePath: result.path } : job);
            newFiles[fileIndex] = fileToUpdate;
            return newFiles;
        });
    }
  };
  
  const handleCopyPath = async (path: string | undefined) => {
    if (!path) return;
    try { await navigator.clipboard.writeText(path); setFeedback({ type: 'info', message: 'Đã sao chép đường dẫn!' }); } catch (err) { setFeedback({ type: 'error', message: 'Sao chép thất bại.' }); }
  };
  
  const handleOpenFolder = (filePath: string | undefined) => { if (ipcRenderer && filePath) ipcRenderer.send('open-folder', getFolderPath(filePath)); };
  const handleOpenToolFlows = async () => {
    if (!ipcRenderer) { setFeedback({ type: 'error', message: 'Chỉ dành cho Desktop App.' }); return; }
    setFeedback({ type: 'info', message: 'Đang mở ToolFlows...' });
    const result = await ipcRenderer.invoke('open-tool-flow');
    if (!result.success && result.error !== 'User canceled selection.') setFeedback({ type: 'error', message: `Lỗi: ${result.error}` }); else setFeedback(null);
  };
  const handleSetToolFlowsPath = async () => {
    if (!ipcRenderer) { setFeedback({ type: 'error', message: 'Chỉ dành cho Desktop App.' }); return; }
    setFeedback({ type: 'info', message: 'Chọn ToolFlows.exe...' });
    const result = await ipcRenderer.invoke('set-tool-flow-path');
    if (result.success) setFeedback({ type: 'success', message: `Đã cập nhật: ${result.path}` }); else if (result.error && result.error !== 'User canceled selection.') setFeedback({ type: 'error', message: `Lỗi: ${result.error}` }); else setFeedback(null);
  };
  const handleShowInFolder = (videoPath: string | undefined) => { if (ipcRenderer && videoPath) ipcRenderer.send('show-video-in-folder', videoPath); };
  const handleDeleteVideo = async (jobId: string, videoPath: string | undefined) => {
      if (!ipcRenderer || !videoPath) return;
      const result = await ipcRenderer.invoke('delete-video-file', videoPath);
      if (result.success) {
          setTrackedFiles(prevFiles => {
              const newFiles = [...prevFiles];
              if (newFiles[activeTrackerFileIndex]) {
                  const fileToUpdate = { ...newFiles[activeTrackerFileIndex] };
                  fileToUpdate.jobs = fileToUpdate.jobs.map(job => job.id === jobId ? { ...job, generatedFilePath: undefined } : job);
                  newFiles[activeTrackerFileIndex] = fileToUpdate;
              }
              return newFiles;
          });
          setFeedback({ type: 'success', message: 'Đã xóa File.' });
      } else if (result.error && result.error !== 'User canceled deletion.') setFeedback({ type: 'error', message: `Lỗi: ${result.error}` });
  };
  const handleRetryJob = async (jobId: string) => {
    const currentFile = trackedFiles[activeTrackerFileIndex];
    if (!ipcRenderer || !currentFile?.path) return;
    setFeedback({ type: 'info', message: `Reset job: ${jobId}...` });
    const result = await ipcRenderer.invoke('retry-job', { filePath: currentFile.path, jobId: jobId });
    if (result.success) setFeedback({ type: 'success', message: `Đã reset Job ${jobId}.` }); else setFeedback({ type: 'error', message: `Lỗi: ${result.error}` });
  };
  const handleRetryStuckJobs = async () => {
    const currentFile = trackedFiles[activeTrackerFileIndex];
    if (!ipcRenderer || !currentFile?.path) return;
    setFeedback({ type: 'info', message: `Reset jobs bị kẹt...` });
    const result = await ipcRenderer.invoke('retry-stuck-jobs', { filePath: currentFile.path });
    if (result.success) setFeedback({ type: 'success', message: `Đã reset các job bị kẹt.` }); else setFeedback({ type: 'error', message: `Lỗi: ${result.error}` });
  };
  const handleReloadVideos = async () => {
    const currentFile = trackedFiles[activeTrackerFileIndex];
    if (!ipcRenderer || !currentFile?.path) return;
    setFeedback({ type: 'info', message: `Đang quét file...` });
    const filePath = currentFile.path;
    try {
        const result: { success: boolean; jobs: ImageJob[]; error?: string; } = await ipcRenderer.invoke('find-videos-for-jobs', { jobs: currentFile.jobs, excelFilePath: filePath });
        if (result.success) {
            setTrackedFiles(prevFiles => prevFiles.map(file => file.path === filePath ? { ...file, jobs: result.jobs } : file));
            const discoveryKey = `${filePath}-${result.jobs.map(j => j.status).join(',')}`;
            fileDiscoveryRef.current.delete(discoveryKey);
            setFeedback({ type: 'success', message: 'Đã cập nhật.' });
        } else throw new Error(result.error || 'Unknown error.');
    } catch (err: any) { setFeedback({ type: 'error', message: `Lỗi Reload: ${err.message}` }); }
  };
  const handleSavePreset = () => {
      if (!newPresetName.trim()) { setFeedback({ type: 'error', message: 'Nhập tên cài đặt.' }); return; }
      const { model, fashionStyle, modelDemographic, setting, cameraMood, temperature, imageCount, quality, faceStrength, shotAngle, aspectRatio } = formData;
      const settingsToSave: Partial<FormData> = { model, fashionStyle, modelDemographic, setting, cameraMood, temperature, imageCount, quality, faceStrength, shotAngle, aspectRatio };
      const newPreset: Preset = { id: crypto.randomUUID(), name: newPresetName.trim(), settings: settingsToSave };
      const updatedPresets = [...presets, newPreset];
      setPresets(updatedPresets); setNewPresetName('');
      if (isElectron && ipcRenderer) ipcRenderer.invoke('save-app-config', { presets: updatedPresets });
      setFeedback({ type: 'success', message: 'Đã lưu cài đặt!' });
  };
  const handlePresetSelect = (presetId: string) => {
      setSelectedPresetId(presetId); if (!presetId) return;
      const presetToLoad = presets.find(p => p.id === presetId);
      if (presetToLoad) { setFormData(prev => ({ ...prev, ...presetToLoad.settings })); setFeedback({ type: 'info', message: `Đã tải "${presetToLoad.name}".` }); }
  };
  const handleDeletePreset = () => {
      if (!selectedPresetId) return;
      const updatedPresets = presets.filter(p => p.id !== selectedPresetId);
      setPresets(updatedPresets);
      setSelectedPresetId('');
      if (isElectron && ipcRenderer) ipcRenderer.invoke('save-app-config', { presets: updatedPresets });
      setFeedback({ type: 'info', message: 'Đã xóa cài đặt.' });
  };
  
  const handleCheckUpdate = async () => {
      if (!ipcRenderer) return;
      setFeedback({ type: 'info', message: 'Đang kiểm tra cập nhật...' });
      const result = await ipcRenderer.invoke('check-for-updates');
      if (!result.success) {
          setFeedback({ type: 'error', message: result.message });
      }
      // If success, logic is handled by 'update-status' event listener
  };

  const currentFile = trackedFiles[activeTrackerFileIndex];
  const trackerStats = currentFile ? {
      completed: currentFile.jobs.filter(j => j.status === 'Completed').length,
      inProgress: currentFile.jobs.filter(j => j.status === 'Processing' || j.status === 'Generating').length,
      failed: currentFile.jobs.filter(j => j.status === 'Failed').length,
      total: currentFile.jobs.length
  } : null;

  if (!configLoaded) return <div className="h-screen flex items-center justify-center bg-white text-black"><LoaderIcon /></div>;

  if (!isActivated) {
    return <Activation machineId={machineId} onActivate={handleActivate} />;
  }

  if (activeApiKey === null || isManagingKeys) {
    return (
        <ApiKeyManager 
            apiKeys={apiKeys}
            onKeySelect={handleKeySelect}
            onKeyAdd={handleKeyAdd}
            onKeyDelete={handleKeyDelete}
        />
    );
  }

  return (
    <div className="dashboard-container font-sans text-black">
        {/* Header */}
        <header className="flex-none h-20 border-b border-gray-200 bg-white flex items-center justify-between px-8 z-50">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-serif font-bold tracking-tighter">V-FASHION</h1>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                >
                    Tạo Prompt Ảnh
                </button>
                <button 
                    onClick={() => setActiveTab('tracker')}
                    className={`px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'tracker' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                >
                    Theo Dõi
                </button>
            </div>

            <div className="flex items-center gap-6">
                 {/* Update Button */}
                 <button onClick={handleCheckUpdate} disabled={checkingUpdate} className={`text-gray-400 hover:text-black transition transform hover:scale-110 ${checkingUpdate ? 'animate-spin' : ''}`} title="Kiểm tra cập nhật">
                    <UpdateIcon className="w-5 h-5" />
                 </button>
                 {/* Stats Button */}
                 <button onClick={() => setShowStats(true)} className="text-gray-400 hover:text-black transition transform hover:scale-110">
                    <ChartIcon className="w-5 h-5" />
                 </button>
                 {/* Key Manager Button */}
                 <button onClick={() => setIsManagingKeys(true)} className="text-gray-400 hover:text-black transition transform hover:scale-110">
                    <KeyIcon className="w-5 h-5" />
                 </button>
                 {/* Admin Button */}
                 <button onClick={() => setShowAdminLogin(true)} className="text-gray-400 hover:text-black transition transform hover:scale-110">
                    <ShieldIcon className="w-5 h-5" />
                 </button>
            </div>
        </header>

        {/* Content */}
        <div className="content-area bg-white relative">
             <div className={`absolute inset-0 overflow-y-auto custom-scrollbar p-8 md:p-12 transition-opacity duration-300 ${activeTab === 'generator' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <GeneratorTab 
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    handleFashionImagesUpload={handleFashionImagesUpload}
                    handleRemoveFashionImage={handleRemoveFashionImage}
                    
                    presets={presets}
                    handlePresetSelect={handlePresetSelect}
                    handleDeletePreset={handleDeletePreset}
                    handleSavePreset={handleSavePreset}
                    newPresetName={newPresetName}
                    setNewPresetName={setNewPresetName}
                    selectedPresetId={selectedPresetId}
                    setSelectedPresetId={setSelectedPresetId}

                    generatePrompts={generatePrompts}
                    isLoading={isLoading}
                    generatedImages={generatedImages}
                    startProcess={startProcess}
                    feedback={feedback}
                    handleOpenImage={handleShowInFolder}
                />
             </div>
             
             <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'tracker' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <TrackerTab 
                    feedback={feedback}
                    trackedFiles={trackedFiles}
                    handleOpenNewFile={handleOpenNewFile}
                    activeTrackerFileIndex={activeTrackerFileIndex}
                    setActiveTrackerFileIndex={setActiveTrackerFileIndex}
                    handleCloseTrackerTab={handleCloseTrackerTab}
                    stats={trackerStats}
                    currentFile={trackedFiles[activeTrackerFileIndex] || null}
                    handleReloadVideos={handleReloadVideos}
                    handleRetryStuckJobs={handleRetryStuckJobs}
                    handleOpenToolFlows={handleOpenToolFlows}
                    handleSetToolFlowsPath={handleSetToolFlowsPath}
                    handleOpenFolder={handleOpenFolder}
                    handleCopyPath={handleCopyPath}
                    getFolderPath={getFolderPath}
                    handleLinkVideo={handleLinkVideo}
                    handleShowInFolder={handleShowInFolder}
                    handleDeleteVideo={handleDeleteVideo}
                    handleRetryJob={handleRetryJob}
                />
             </div>
        </div>

        {/* Modals */}
        {showStats && (
            <StatsModal 
                onClose={() => setShowStats(false)} 
                isAdmin={isAdminLoggedIn} 
                onDeleteHistory={async (date) => { if (isElectron && ipcRenderer) await ipcRenderer.invoke('delete-stat-date', date); }}
                onDeleteAll={async () => { if (isElectron && ipcRenderer) await ipcRenderer.invoke('delete-all-stats'); }}
            />
        )}

        {showAdminLogin && (
            <AdminLoginModal 
                onClose={() => setShowAdminLogin(false)}
                onLoginSuccess={() => { setIsAdminLoggedIn(true); setShowAdminLogin(false); setShowStats(true); }}
            />
        )}

        {alertModal && (
            <AlertModal 
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal(null)}
                onConfirm={alertModal.onConfirm}
            />
        )}
    </div>
  );
};

export default App;