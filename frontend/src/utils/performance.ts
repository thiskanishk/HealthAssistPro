import { ReportHandler } from 'web-vitals';
import { logInfo } from './logger';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export const initializePerformanceMonitoring = () => {
  reportWebVitals((metric) => {
    logInfo('Performance metric', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      navigationType: metric.navigationType
    });
  });
}; 