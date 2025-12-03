
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
import { Scene, FormData, ActiveTab, VideoJob, JobStatus, TrackedFile, ApiKey, AppConfig, Preset } from './types';
import { fashionSystemPrompt } from './constants';
import { LoaderIcon, KeyIcon, ChartIcon, ShieldIcon } from './components/Icons';

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
    sceneCount: 5, // Default number of prompts
    fashionStyle: 'High Fashion / Editorial',
    modelDemographic: 'Female Model',
    setting: 'Studio / Minimalist',
    cameraMood: 'Dynamic / Fast Paced',
    fashionImages: [], // Array of up to 3 images
    temperature: 0.4,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'info', message: string } | null>(null);
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
  
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [machineId, setMachineId] = useState<string>('');
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activeApiKey, setActiveApiKey] = useState<ApiKey | null>(null);
  const [isManagingKeys, setIsManagingKeys] = useState(false);

  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  const [activeTrackerFileIndex, setActiveTrackerFileIndex] = useState<number>(0);

  const [ffmpegFound, setFfmpegFound] = useState<boolean | null>(null);
  const [isCombiningVideo, setIsCombiningVideo] = useState(false);
  const [isCombiningAll, setIsCombiningAll] = useState(false);
  const [lastCombinedVideoPath, setLastCombinedVideoPath] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const [alertModal, setAlertModal] = useState<{title: string, message: string, type: 'completion' | 'update', onConfirm?: () => void} | null>(null);
  
  // --- Admin & Stats State ---
  const [showStats, setShowStats] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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

  const parseExcelData = (data: Uint8Array): VideoJob[] => {
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
            status: status,
            videoName: get('VIDEO_NAME') || '',
            typeVideo: get('TYPE_VIDEO') || '',
            videoPath: get('VIDEO_PATH') || undefined,
        };
    }).filter(job => job.id && String(job.id).trim());
  };

  useEffect(() => {
      if (!ipcRenderer) return;
      const handleFileUpdate = (_event: any, { path, content }: { path: string, content: Uint8Array }) => {
          const newJobs = parseExcelData(content);
          setTrackedFiles(prevFiles => prevFiles.map(file => file.path === path ? { ...file, jobs: newJobs } : file));
      };
      const handleCombineAllProgress = (_event: any, { message }: { message: string }) => { setFeedback({ type: 'info', message }); };
      const handleShowAlertModal = (_event: any, data: { title: string, message: string, type: 'completion' | 'update', onConfirm?: () => void }) => {
        if (data.type === 'update') {
            setAlertModal({ ...data, onConfirm: () => ipcRenderer.send('restart_app') });
        } else {
            setAlertModal(data);
        }
      };
      ipcRenderer.on('file-content-updated', handleFileUpdate);
      ipcRenderer.on('combine-all-progress', handleCombineAllProgress);
      ipcRenderer.on('show-alert-modal', handleShowAlertModal);
      return () => {
          ipcRenderer.removeListener('file-content-updated', handleFileUpdate);
          ipcRenderer.removeListener('combine-all-progress', handleCombineAllProgress);
          ipcRenderer.removeListener('show-alert-modal', handleShowAlertModal);
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
    setLastCombinedVideoPath(null);
    const currentFile = trackedFiles.length > 0 ? trackedFiles[activeTrackerFileIndex] : null;
    if (isElectron && ipcRenderer && currentFile?.path) {
        const hasIncompleteJobs = currentFile.jobs.some(j => j.status === 'Completed' && !j.videoPath);
        const discoveryKey = `${currentFile.path}-${currentFile.jobs.map(j => j.status).join(',')}`;
        if (hasIncompleteJobs && !fileDiscoveryRef.current.has(discoveryKey)) {
            const filePath = currentFile.path;
            ipcRenderer.invoke('find-videos-for-jobs', { jobs: currentFile.jobs, excelFilePath: filePath })
                .then((result: { success: boolean; jobs: VideoJob[]; error?: string; }) => {
                    if (result.success) {
                        setTrackedFiles(prevFiles => prevFiles.map(file => file.path === filePath ? { ...file, jobs: result.jobs } : file));
                        fileDiscoveryRef.current.add(discoveryKey);
                    }
                });
        }
    }
  }, [trackedFiles, activeTrackerFileIndex]);

  useEffect(() => {
    if (activeTab === 'tracker' && isElectron && ipcRenderer) {
      setFfmpegFound(null);
      ipcRenderer.invoke('check-ffmpeg').then((result: { found: boolean }) => { setFfmpegFound(result.found); });
    }
  }, [activeTab]);

  // Handle Input Logic
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else if (name === 'temperature') {
        setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
      } else if (name === 'sceneCount') {
         let val = parseInt(value);
         if (isNaN(val) || val < 1) val = 1;
         if (val > 50) val = 50; // Max reasonable limit
         setFormData(prev => ({ ...prev, sceneCount: val }));
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
                  // Assign by specific index (0=Model, 1=Outfit, 2=Setting)
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
          newImages.splice(index, 1);
          return { ...prev, fashionImages: newImages };
      });
  };

  // --- Generate Logic (FASHION ONLY) ---
  const generatePrompts = async () => {
    if (!activeApiKey) { setFeedback({ type: 'error', message: 'Yêu cầu API Key.' }); setIsManagingKeys(true); return; }
    setIsLoading(true); setFeedback(null); setGeneratedScenes([]);

    // Conflict Resolution Logic
    // If Image 1 (Model) exists, ignore the Model Dropdown text
    const hasModelImage = !!formData.fashionImages[0];
    const modelDescription = hasModelImage ? "USE UPLOADED IMAGE 1 AS MODEL REFERENCE" : formData.modelDemographic;

    // If Image 3 (Setting) exists, ignore the Setting Dropdown text
    const hasSettingImage = !!formData.fashionImages[2];
    const settingDescription = hasSettingImage ? "USE UPLOADED IMAGE 3 AS SETTING REFERENCE" : formData.setting;

    let userPrompt = `Create a Fashion Video Script (Ingredients Mode).`;
    userPrompt += `\n**Creative Idea / Theme:** "${formData.idea.trim() || 'Showcase the collection'}"`;
    userPrompt += `\n**Specs:**`;
    userPrompt += `\n- Fashion Style: ${formData.fashionStyle}`;
    userPrompt += `\n- Model Type: ${modelDescription}`;
    userPrompt += `\n- Setting/Environment: ${settingDescription}`;
    userPrompt += `\n- Camera Mood: ${formData.cameraMood}`;
    userPrompt += `\n- Total Scenes: ${formData.sceneCount}`;
    userPrompt += `\n- Images Provided: ${formData.fashionImages.filter(i => i).length}`;
    
    formData.fashionImages.forEach((_img, idx) => {
        if (!_img) return;
        let role = "Reference";
        if (idx === 0) role = "MODEL (Img 1) - STRICT REFERENCE";
        if (idx === 1) role = "OUTFIT (Img 2) - STRICT REFERENCE";
        if (idx === 2) role = "SETTING (Img 3) - STRICT REFERENCE";
        userPrompt += `\n- Image Slot ${idx+1}: ${role}`;
    });

    const parts: any[] = [{ text: userPrompt }];
    
    // Attach Images for Analysis
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
                    scene_number: { type: Type.INTEGER },
                    scene_title: { type: Type.STRING },
                    prompt_text: { type: Type.STRING },
                  },
                  required: ['scene_number', 'scene_title', 'prompt_text'],
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
        setGeneratedScenes(parsedData.prompts);
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
    if (generatedScenes.length === 0) { setFeedback({ type: 'error', message: 'Không có kịch bản.' }); return; }
    setFeedback(null);
    try {
      const safeProjectName = (formData.projectName.trim() || 'Fashion_Runway').replace(/[^a-zA-Z0-9_]/g, '_');
      const safeFileName = safeProjectName.toLowerCase();
      const fullFileName = `${safeFileName}.xlsx`;
      
      const img1 = formData.fashionImages[0] ? (formData.fashionImages[0].file as any).path : '';
      const img2 = formData.fashionImages[1] ? (formData.fashionImages[1].file as any).path : '';
      const img3 = formData.fashionImages[2] ? (formData.fashionImages[2].file as any).path : '';

      // Determine TYPE_VIDEO based on image uploads
      // If ANY image slot has a file, we treat it as I2V logic
      const hasImages = !!img1 || !!img2 || !!img3;
      const typeVideoValue = hasImages ? 'I2V' : '';

      const dataForTracker: VideoJob[] = generatedScenes.map((p, index) => ({
          id: `Job_${index + 1}`,
          prompt: p.prompt_text,
          imagePath: img1, 
          imagePath2: img2, 
          imagePath3: img3,
          status: 'Pending',
          videoName: `${safeProjectName}_${index + 1}`,
          typeVideo: typeVideoValue,
      }));

      const dataForExcel = dataForTracker.map(job => ({ ...job, status: '' }));
      const headers = [['JOB_ID', 'PROMPT', 'IMAGE_PATH', 'IMAGE_PATH_2', 'IMAGE_PATH_3', 'STATUS', 'VIDEO_NAME', 'TYPE_VIDEO']];
      
      const worksheet = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.sheet_add_json(worksheet, dataForExcel, { header: ['id', 'prompt', 'imagePath', 'imagePath2', 'imagePath3', 'status', 'videoName', 'typeVideo'], skipHeader: true, origin: 'A2' });
      worksheet['!cols'] = [{ wch: 15 }, { wch: 150 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts');
      
      let filePath: string | undefined;
      if (isElectron && ipcRenderer) {
        const fileContent = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const result = await ipcRenderer.invoke('save-file-dialog', { defaultPath: fullFileName, fileContent: fileContent });
        if (result.success) { setFeedback({ type: 'success', message: `Đã lưu: ${result.filePath}` }); filePath = result.filePath; }
        else if (result.error && result.error !== 'Save dialog canceled') throw new Error(`${result.error}`);
      } else { XLSX.writeFile(workbook, fullFileName); setFeedback({ type: 'success', message: 'Đang tải file Excel.' }); }

      // Note: We no longer track duration in seconds, defaulting to 0 as it's not critical for generation
      const newTrackedFile: TrackedFile = { name: fullFileName, jobs: dataForTracker, path: filePath, targetDurationSeconds: 0 };
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
    const result = await ipcRenderer.invoke('open-video-file-dialog');
    if (result.success && result.path) {
        setTrackedFiles(prevFiles => {
            const newFiles = [...prevFiles];
            const fileToUpdate = { ...newFiles[fileIndex] };
            fileToUpdate.jobs = fileToUpdate.jobs.map(job => job.id === jobId ? { ...job, videoPath: result.path } : job);
            newFiles[fileIndex] = fileToUpdate;
            return newFiles;
        });
    }
  };
  
  const executeCombineForFile = async (file: TrackedFile, mode: 'normal' | 'timed') => {
      if (!ipcRenderer || !ffmpegFound) return false;
      const completedJobs = file.jobs.filter(j => j.status === 'Completed' && j.videoPath);
      if (completedJobs.length < 1) { setFeedback({ type: 'error', message: `File "${file.name}" không có video hoàn thành.` }); return false; }
      if (mode === 'timed' && (!file.targetDurationSeconds || file.targetDurationSeconds <= 0)) { setFeedback({ type: 'error', message: `File "${file.name}" thiếu thời lượng.` }); return false; }
      try {
          const result = await ipcRenderer.invoke('execute-ffmpeg-combine', { jobs: completedJobs, targetDuration: file.targetDurationSeconds, mode: mode, excelFileName: file.name });
          if (result.success) { setLastCombinedVideoPath(result.filePath); return true; }
          else if (result.error && result.error !== 'Save dialog canceled') throw new Error(String(result.error));
          else return false;
      } catch (err: any) { throw err; }
  };
  
  const handleExecuteCombine = async (mode: 'normal' | 'timed') => {
      const currentFile = trackedFiles[activeTrackerFileIndex];
      if (!currentFile) return;
      setIsCombiningVideo(true); setLastCombinedVideoPath(null); setFeedback({ type: 'info', message: `Đang ghép "${currentFile.name}"...` });
      try {
          const success = await executeCombineForFile(currentFile, mode);
          if (success) setFeedback({ type: 'success', message: `Ghép Thành Công!` });
          else setFeedback(null);
      } catch (err: any) { setFeedback({ type: 'error', message: `Lỗi Ghép: ${(err as any).message}` }); } finally { setIsCombiningVideo(false); }
  };

  const handleCombineAllFiles = async () => {
    if (trackedFiles.length === 0 || !ipcRenderer || !ffmpegFound) return;
    setIsCombiningAll(true); setLastCombinedVideoPath(null); setFeedback({ type: 'info', message: 'Đang ghép hàng loạt...' });
    const filesToProcess = trackedFiles.map(file => ({ name: file.name, jobs: file.jobs.filter(j => j.status === 'Completed' && j.videoPath) })).filter(file => file.jobs.length > 0);
    if (filesToProcess.length === 0) { setFeedback({ type: 'error', message: 'Không có video để ghép.' }); setIsCombiningAll(false); return; }
    try {
      const result = await ipcRenderer.invoke('execute-ffmpeg-combine-all', filesToProcess);
      if (result.canceled) setFeedback({ type: 'info', message: 'Đã hủy.' });
      else {
        const { successes, failures } = result;
        const finalMessage = `Xong. Thành công: ${successes.length}. Lỗi: ${failures.length}.`;
        setFeedback({ type: failures.length > 0 && successes.length === 0 ? 'error' : failures.length > 0 ? 'info' : 'success', message: finalMessage });
      }
    } catch (err: any) { setFeedback({ type: 'error', message: `Lỗi Hàng Loạt: ${err.message}` }); } finally { setIsCombiningAll(false); }
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
  const handlePlayVideo = (videoPath: string | undefined) => { if (ipcRenderer && videoPath) ipcRenderer.send('open-video-path', videoPath); };
  const handleShowInFolder = (videoPath: string | undefined) => { if (ipcRenderer && videoPath) ipcRenderer.send('show-video-in-folder', videoPath); };
  const handleDeleteVideo = async (jobId: string, videoPath: string | undefined) => {
      if (!ipcRenderer || !videoPath) return;
      const result = await ipcRenderer.invoke('delete-video-file', videoPath);
      if (result.success) {
          setTrackedFiles(prevFiles => {
              const newFiles = [...prevFiles];
              if (newFiles[activeTrackerFileIndex]) {
                  const fileToUpdate = { ...newFiles[activeTrackerFileIndex] };
                  fileToUpdate.jobs = fileToUpdate.jobs.map(job => job.id === jobId ? { ...job, videoPath: undefined } : job);
                  newFiles[activeTrackerFileIndex] = fileToUpdate;
              }
              return newFiles;
          });
          setFeedback({ type: 'success', message: 'Đã xóa Video.' });
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
    setFeedback({ type: 'info', message: `Đang quét video...` });
    const filePath = currentFile.path;
    try {
        const result: { success: boolean; jobs: VideoJob[]; error?: string; } = await ipcRenderer.invoke('find-videos-for-jobs', { jobs: currentFile.jobs, excelFilePath: filePath });
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
      const { model, fashionStyle, modelDemographic, setting, cameraMood, temperature, sceneCount } = formData;
      const settingsToSave: Partial<FormData> = { model, fashionStyle, modelDemographic, setting, cameraMood, temperature, sceneCount };
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
                <h1 className="text-2xl font-serif font-bold tracking-tighter">PROMPT PRO <span className="text-gray-400 font-sans text-xs tracking-widest ml-2">BESC EDITION</span></h1>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-none">
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'generator' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Tạo Kịch Bản
                </button>
                <button 
                    onClick={() => setActiveTab('tracker')}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'tracker' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Theo Dõi
                </button>
            </div>

            <div className="flex items-center gap-6">
                 {/* Stats Button */}
                 <button onClick={() => setShowStats(true)} className="text-gray-400 hover:text-black transition">
                    <ChartIcon className="w-5 h-5" />
                 </button>
                 {/* Key Manager Button */}
                 <button onClick={() => setIsManagingKeys(true)} className="text-gray-400 hover:text-black transition">
                    <KeyIcon className="w-5 h-5" />
                 </button>
                 {/* Admin Button */}
                 <button onClick={() => setShowAdminLogin(true)} className="text-gray-400 hover:text-black transition">
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
                    generatedScenes={generatedScenes}
                    startProcess={startProcess}
                    feedback={feedback}
                    lastCombinedVideoPath={lastCombinedVideoPath}
                    handlePlayVideo={handlePlayVideo}
                />
             </div>
             
             <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'tracker' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <TrackerTab 
                    feedback={feedback}
                    lastCombinedVideoPath={lastCombinedVideoPath}
                    handlePlayVideo={handlePlayVideo}
                    trackedFiles={trackedFiles}
                    handleOpenNewFile={handleOpenNewFile}
                    activeTrackerFileIndex={activeTrackerFileIndex}
                    setActiveTrackerFileIndex={setActiveTrackerFileIndex}
                    handleCloseTrackerTab={handleCloseTrackerTab}
                    stats={trackerStats}
                    currentFile={trackedFiles[activeTrackerFileIndex] || null}
                    formatDuration={(s) => s ? `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` : '0:00'}
                    handleReloadVideos={handleReloadVideos}
                    handleRetryStuckJobs={handleRetryStuckJobs}
                    handleOpenToolFlows={handleOpenToolFlows}
                    handleSetToolFlowsPath={handleSetToolFlowsPath}
                    handleOpenFolder={handleOpenFolder}
                    handleCopyPath={handleCopyPath}
                    getFolderPath={getFolderPath}
                    ffmpegFound={ffmpegFound}
                    handleCombineAllFiles={handleCombineAllFiles}
                    isCombiningAll={isCombiningAll}
                    isCombiningVideo={isCombiningVideo}
                    handleExecuteCombine={handleExecuteCombine}
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
