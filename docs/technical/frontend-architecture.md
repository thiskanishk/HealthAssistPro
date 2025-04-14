# Frontend Architecture Documentation

## 1. Component Architecture

### Core Components Structure
```typescript
// src/components/core/types.ts
interface BaseComponentProps {
  className?: string;
  testId?: string;
  children?: React.ReactNode;
}

interface AIComponentProps extends BaseComponentProps {
  modelConfig?: AIModelConfig;
  onAnalysisComplete?: (result: AIAnalysisResult) => void;
  confidenceThreshold?: number;
}

// Example AI-Enhanced Component
interface SymptomAnalyzerProps extends AIComponentProps {
  patientId: string;
  initialSymptoms?: string[];
  onDiagnosisGenerated: (diagnosis: Diagnosis) => void;
}

// src/components/SymptomAnalyzer/SymptomAnalyzer.tsx
export const SymptomAnalyzer: React.FC<SymptomAnalyzerProps> = ({
  patientId,
  initialSymptoms = [],
  onDiagnosisGenerated,
  modelConfig,
  confidenceThreshold = 0.7
}) => {
  const [symptoms, setSymptoms] = useState<string[]>(initialSymptoms);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const { analyze, loading, error } = useAIAnalysis(modelConfig);

  const handleAnalysis = async () => {
    const result = await analyze({
      symptoms,
      patientId,
      confidenceThreshold
    });

    setAnalysis(result);
    if (result.confidence >= confidenceThreshold) {
      onDiagnosisGenerated(result.diagnosis);
    }
  };

  return (
    <AIContainer>
      <SymptomSelector
        selected={symptoms}
        onChange={setSymptoms}
      />
      <ConfidenceIndicator value={analysis?.confidence} />
      <DiagnosisDisplay data={analysis?.diagnosis} />
    </AIContainer>
  );
};
```

## 2. State Management

### Redux Store Configuration
```typescript
// src/store/types.ts
interface RootState {
  ai: AIState;
  patient: PatientState;
  diagnosis: DiagnosisState;
  auth: AuthState;
}

interface AIState {
  models: {
    [key: string]: AIModel;
  };
  analysis: {
    [key: string]: AIAnalysisResult;
  };
  loading: boolean;
  error: string | null;
}

// src/store/slices/aiSlice.ts
const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    models: {},
    analysis: {},
    loading: false,
    error: null
  } as AIState,
  reducers: {
    startAnalysis: (state) => {
      state.loading = true;
      state.error = null;
    },
    analysisSuccess: (state, action: PayloadAction<AIAnalysisResult>) => {
      state.loading = false;
      state.analysis[action.payload.id] = action.payload;
    },
    analysisError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAIModels.fulfilled, (state, action) => {
      state.models = action.payload;
    });
  }
});
```

## 3. Custom Hooks

### AI Integration Hooks
```typescript
// src/hooks/useAIAnalysis.ts
interface UseAIAnalysisOptions {
  modelConfig?: AIModelConfig;
  autoAnalyze?: boolean;
  onSuccess?: (result: AIAnalysisResult) => void;
  onError?: (error: Error) => void;
}

export const useAIAnalysis = (options: UseAIAnalysisOptions = {}) => {
  const dispatch = useAppDispatch();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);

  const analyze = async (data: AIAnalysisInput) => {
    try {
      setLocalLoading(true);
      dispatch(startAnalysis());

      const result = await aiService.analyze({
        ...data,
        modelConfig: options.modelConfig
      });

      dispatch(analysisSuccess(result));
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      dispatch(analysisError(errorMessage));
      setLocalError(error as Error);
      options.onError?.(error as Error);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  };

  return {
    analyze,
    loading: localLoading,
    error: localError
  };
};

// src/hooks/usePatientMonitoring.ts
export const usePatientMonitoring = (patientId: string) => {
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const { analyze } = useAIAnalysis();

  useEffect(() => {
    const subscription = patientService
      .subscribeToVitals(patientId)
      .subscribe(async (newVitals) => {
        setVitals(prev => [...prev, newVitals]);
        
        // Analyze new vitals with AI
        const aiAnalysis = await analyze({
          type: 'vitals',
          data: newVitals,
          context: {
            patientId,
            historicalData: vitals
          }
        });

        setAnalysis(aiAnalysis);
      });

    return () => subscription.unsubscribe();
  }, [patientId]);

  return { vitals, analysis };
};
```

## 4. API Integration

### API Client Configuration
```typescript
// src/services/api/config.ts
interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

const apiConfig: APIConfig = {
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': process.env.REACT_APP_VERSION
  }
};

// src/services/api/client.ts
export class APIClient {
  private axios: AxiosInstance;
  private retryDelay = 1000;

  constructor(config: APIConfig) {
    this.axios = axios.create(config);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axios.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry >= apiConfig.retries) {
          return Promise.reject(error);
        }

        config.retry += 1;
        const delay = this.retryDelay * Math.pow(2, config.retry - 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.axios(config);
      }
    );
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axios.request<T>(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
}
```

## 5. Performance Optimization

### React Performance Hooks
```typescript
// src/hooks/usePerformanceOptimization.ts
interface PerformanceOptions {
  debounceMs?: number;
  cacheKey?: string;
  cacheDuration?: number;
}

export const usePerformanceOptimization = <T>(
  callback: (...args: any[]) => Promise<T>,
  options: PerformanceOptions = {}
) => {
  const {
    debounceMs = 300,
    cacheKey,
    cacheDuration = 5 * 60 * 1000 // 5 minutes
  } = options;

  const cache = useMemo(() => new Map<string, { data: T; timestamp: number }>(), []);
  const debouncedCallback = useCallback(
    debounce(callback, debounceMs),
    [callback, debounceMs]
  );

  const execute = async (...args: any[]) => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < cacheDuration) {
        return cached.data;
      }
    }

    const result = await debouncedCallback(...args);

    if (cacheKey) {
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  };

  return { execute };
};
```

## 6. AI Component Optimization

### Smart Rendering System
```typescript
// src/components/smart/AIComponentWrapper.tsx
interface AIComponentWrapperProps {
  priority: 'high' | 'medium' | 'low';
  prefetch?: boolean;
  cacheResults?: boolean;
  loadingStrategy?: 'eager' | 'lazy';
}

const AIComponentWrapper: React.FC<AIComponentWrapperProps> = ({
  children,
  priority,
  prefetch = false,
  cacheResults = true,
  loadingStrategy = 'eager'
}) => {
  const [isVisible, setIsVisible] = useState(loadingStrategy === 'eager');
  const componentRef = useRef<HTMLDivElement>(null);
  const cache = useAICache();

  useEffect(() => {
    if (loadingStrategy === 'lazy') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '100px'
        }
      );

      if (componentRef.current) {
        observer.observe(componentRef.current);
      }

      return () => observer.disconnect();
    }
  }, [loadingStrategy]);

  useEffect(() => {
    if (prefetch && !isVisible) {
      // Prefetch AI model data
      void cache.prefetch(priority);
    }
  }, [prefetch, priority, isVisible]);

  return (
    <div ref={componentRef}>
      {isVisible && (
        <AIContext.Provider value={{ priority, cacheResults }}>
          {children}
        </AIContext.Provider>
      )}
    </div>
  );
};
```

### AI Result Caching
```typescript
// src/cache/AIResultCache.ts
interface CacheConfig {
  maxSize: number;
  ttl: number;
  priorityLevels: {
    high: number;
    medium: number;
    low: number;
  };
}

class AIResultCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  async get<T>(key: string, priority: keyof typeof config.priorityLevels): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    // Update entry priority based on access
    entry.priority = Math.min(
      entry.priority + this.config.priorityLevels[priority],
      100
    );

    return entry.data as T;
  }

  async set(key: string, data: any, priority: keyof typeof config.priorityLevels): Promise<void> {
    if (this.cache.size >= this.config.maxSize) {
      this.evictLowPriorityEntries();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      priority: this.config.priorityLevels[priority]
    });
  }

  private evictLowPriorityEntries(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.priority - b.priority);

    // Remove lowest priority entries
    for (const [key] of entries.slice(0, Math.ceil(this.config.maxSize * 0.2))) {
      this.cache.delete(key);
    }
  }
}
```

## 7. Accessibility Enhancements

### AI-Powered Accessibility Features
```typescript
// src/components/accessibility/AIAccessibilityProvider.tsx
interface AIAccessibilityConfig {
  autoAdjust: boolean;
  preferredMode: 'visual' | 'audio' | 'hybrid';
  voiceControl: boolean;
  adaptiveUI: boolean;
}

const AIAccessibilityProvider: React.FC = ({ children }) => {
  const [config, setConfig] = useState<AIAccessibilityConfig>({
    autoAdjust: true,
    preferredMode: 'hybrid',
    voiceControl: false,
    adaptiveUI: true
  });

  const voiceRecognition = useVoiceRecognition();
  const uiAdapter = useUIAdapter();

  useEffect(() => {
    if (config.autoAdjust) {
      // AI-powered accessibility adjustments
      void analyzeUserInteractions().then(preferences => {
        setConfig(prev => ({
          ...prev,
          ...preferences
        }));
      });
    }
  }, [config.autoAdjust]);

  const handleVoiceCommand = async (command: string) => {
    if (!config.voiceControl) return;

    const action = await processVoiceCommand(command);
    if (action) {
      await executeAccessibilityAction(action);
    }
  };

  return (
    <AccessibilityContext.Provider value={{ config, setConfig }}>
      <VoiceCommandListener onCommand={handleVoiceCommand}>
        <AdaptiveUIContainer adapter={uiAdapter}>
          {children}
        </AdaptiveUIContainer>
      </VoiceCommandListener>
    </AccessibilityContext.Provider>
  );
};
```

## 8. Real-time Features

### WebSocket Integration
```typescript
// src/services/realtime/WebSocketManager.ts
interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private config: WebSocketConfig) {
    this.initialize();
  }

  private initialize() {
    this.socket = new WebSocket(this.config.url);
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onclose = () => {
      this.handleDisconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect();
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'AI_UPDATE':
        this.handleAIUpdate(data);
        break;
      case 'VITAL_SIGNS':
        this.handleVitalSigns(data);
        break;
      case 'ALERT':
        this.handleAlert(data);
        break;
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
      }
    }, this.config.heartbeatInterval);
  }
}
```

### Real-time Updates Hook
```typescript
// src/hooks/useRealTimeUpdates.ts
interface RealTimeConfig {
  channel: string;
  bufferSize?: number;
  throttleMs?: number;
}

export const useRealTimeUpdates = <T>(
  config: RealTimeConfig
): {
  data: T[];
  latestUpdate: T | null;
  error: Error | null;
} => {
  const [data, setData] = useState<T[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const bufferRef = useRef<T[]>([]);
  const throttledUpdate = useThrottle(
    (updates: T[]) => {
      setData(prev => [...prev, ...updates]);
      setLatestUpdate(updates[updates.length - 1]);
    },
    config.throttleMs || 1000
  );

  useEffect(() => {
    const handleUpdate = (update: T) => {
      bufferRef.current.push(update);
      
      if (bufferRef.current.length >= (config.bufferSize || 10)) {
        throttledUpdate(bufferRef.current);
        bufferRef.current = [];
      }
    };

    const subscription = realTimeService.subscribe(
      config.channel,
      handleUpdate,
      setError
    );

    return () => subscription.unsubscribe();
  }, [config.channel]);

  return { data, latestUpdate, error };
};
```

[Continue with more documentation? Let me know if you want me to proceed with additional sections and details.] 