import { format } from 'date-fns';

export class MedicationReminderService {
    private static instance: MedicationReminderService;
    private worker: ServiceWorker | null = null;

    private constructor() {
        this.initializeServiceWorker();
    }

    public static getInstance(): MedicationReminderService {
        if (!MedicationReminderService.instance) {
            MedicationReminderService.instance = new MedicationReminderService();
        }
        return MedicationReminderService.instance;
    }

    private async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/medication-reminder-worker.js');
                this.worker = registration.active;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    public async scheduleMedicationReminder(medication: {
        name: string;
        dosage: string;
        time: Date;
        instructions?: string;
    }) {
        if (!this.worker) {
            console.error('Service Worker not initialized');
            return;
        }

        const scheduledTime = new Date(medication.time).getTime();
        
        // Schedule local notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const timeDiff = scheduledTime - Date.now();
            if (timeDiff > 0) {
                setTimeout(() => {
                    new Notification('Medication Reminder', {
                        body: `Time to take ${medication.name} (${medication.dosage})`,
                        icon: '/icons/medication.png',
                        badge: '/icons/badge.png',
                        data: {
                            medicationId: medication.id,
                            instructions: medication.instructions
                        }
                    });
                }, timeDiff);
            }
        }

        // Send to service worker for background processing
        this.worker.postMessage({
            type: 'SCHEDULE_MEDICATION',
            payload: medication
        });
    }

    public async cancelReminder(medicationId: string) {
        if (this.worker) {
            this.worker.postMessage({
                type: 'CANCEL_MEDICATION',
                payload: { medicationId }
            });
        }
    }
} 