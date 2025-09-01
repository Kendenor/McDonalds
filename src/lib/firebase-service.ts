import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

export interface BankAccount {
  id?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt?: any;
}

export interface AppSettings {
  telegramLink: string;
  whatsappLink: string;
  infoItems: Array<{ text: string }>;
  bankAccounts: BankAccount[];
  minDeposit?: number;
  maxDeposit?: number;
  minWithdrawal?: number;
  popupContent?: {
    welcomeMessage?: string;
    notificationTitle?: string;
    depositSuccessMessage?: string;
    withdrawalSuccessMessage?: string;
    referralBonusMessage?: string;
    dailyLoginMessage?: string;
  };
  // Add notification banner settings
  notificationBanner?: {
    enabled: boolean;
    message: string;
    backgroundColor?: string;
    textColor?: string;
    showOnAllPages?: boolean;
  };
  // Add popup notification settings
  popupNotification?: {
    enabled: boolean;
    title: string;
    message: string;
    showOnHomePage: boolean;
    backgroundColor?: string;
    textColor?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  updatedAt?: any;
}

// Settings Service
export class SettingsService {
  private static SETTINGS_DOC = 'app_settings';

  // Get settings
  static async getSettings(): Promise<AppSettings> {
    try {
      const settingsDoc = doc(db, 'settings', this.SETTINGS_DOC);
      const settingsSnap = await getDoc(settingsDoc);
      
      if (settingsSnap.exists()) {
        return settingsSnap.data() as AppSettings;
      } else {
        // Return default settings if none exist
        return {
          telegramLink: '',
          whatsappLink: '',
          infoItems: [
            { text: "Profit drops every 24 hours" },
            { text: "Level 1 - 24% Level 2 - 3% Level 3 - 2%" },
            { text: "Withdrawal: 10am - 6pm daily" },
            { text: "Deposit: 24/7" },
            { text: "Daily Login bonus: ₦50" },
            { text: "Welcome bonus: ₦550" },
            { text: "Minimum deposit: ₦3,000" },
            { text: "Withdrawal charge: 15%" },
            { text: "Minimum withdrawal: ₦1,000" },
          ],
          bankAccounts: [],
          minDeposit: 3000,
          maxDeposit: 500000,
          minWithdrawal: 1000,
          popupContent: {
            welcomeMessage: 'Welcome to McDonald Investment! Your ₦300 welcome bonus has been added to your account.',
            notificationTitle: 'Notifications',
            depositSuccessMessage: 'Deposit successful! Your funds have been added to your account.',
            withdrawalSuccessMessage: 'Withdrawal request submitted successfully!',
            referralBonusMessage: 'Referral bonus received! Your earnings have been updated.',
            dailyLoginMessage: 'Daily login bonus of ₦50 has been added to your account!'
          },
          notificationBanner: {
            enabled: false,
            message: 'Welcome to McDonald Investment!',
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
            showOnAllPages: true
          },
          popupNotification: {
            enabled: false,
            title: 'Welcome!',
            message: 'Thank you for visiting McDonald Investment!',
            showOnHomePage: true,
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
            buttonText: 'Get Started',
            buttonLink: '/dashboard'
          }
        };
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  // Save settings
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const settingsDoc = doc(db, 'settings', this.SETTINGS_DOC);
      await setDoc(settingsDoc, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Add bank account to settings
  static async addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt'>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newAccount: BankAccount = {
        ...account,
        id: Date.now().toString(), // Simple ID generation
        createdAt: new Date()
      };
      
      const updatedBankAccounts = [...currentSettings.bankAccounts, newAccount];
      await this.saveSettings({
        ...currentSettings,
        bankAccounts: updatedBankAccounts
      });
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  }

  // Update bank account in settings
  static async updateBankAccount(accountId: string, updates: Partial<BankAccount>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedBankAccounts = currentSettings.bankAccounts.map(account => 
        account.id === accountId ? { ...account, ...updates } : account
      );
      
      await this.saveSettings({
        ...currentSettings,
        bankAccounts: updatedBankAccounts
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  }

  // Delete bank account from settings
  static async deleteBankAccount(accountId: string): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedBankAccounts = currentSettings.bankAccounts.filter(account => account.id !== accountId);
      
      await this.saveSettings({
        ...currentSettings,
        bankAccounts: updatedBankAccounts
      });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  }

  // Listen to settings changes
  static onSettingsChange(callback: (settings: AppSettings) => void) {
    const settingsDoc = doc(db, 'settings', this.SETTINGS_DOC);
    return onSnapshot(settingsDoc, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as AppSettings);
      } else {
        // Return default settings if none exist
        callback({
          telegramLink: '',
          whatsappLink: '',
          infoItems: [
            { text: "Profit drops every 24 hours" },
            { text: "Level 1 - 24% Level 2 - 3% Level 3 - 2%" },
            { text: "Withdrawal: 10am - 6pm daily" },
            { text: "Deposit: 24/7" },
            { text: "Daily Login bonus: ₦50" },
            { text: "Welcome bonus: ₦550" },
            { text: "Minimum deposit: ₦3,000" },
            { text: "Withdrawal charge: 15%" },
            { text: "Minimum withdrawal: ₦1,000" },
          ],
          bankAccounts: [],
          minDeposit: 3000,
          maxDeposit: 500000,
          minWithdrawal: 1000,
          popupContent: {
            welcomeMessage: 'Welcome to McDonald Investment! Your ₦300 welcome bonus has been added to your account.',
            notificationTitle: 'Notifications',
            depositSuccessMessage: 'Deposit successful! Your funds have been added to your account.',
            withdrawalSuccessMessage: 'Withdrawal request submitted successfully!',
            referralBonusMessage: 'Referral bonus received! Your earnings have been updated.',
            dailyLoginMessage: 'Daily login bonus of ₦50 has been added to your account!'
          },
          notificationBanner: {
            enabled: false,
            message: 'Welcome to McDonald Investment!',
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
            showOnAllPages: true
          },
          popupNotification: {
            enabled: false,
            title: 'Welcome!',
            message: 'Thank you for visiting McDonald Investment!',
            showOnHomePage: true,
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
            buttonText: 'Get Started',
            buttonLink: '/dashboard'
          }
        });
      }
    });
  }
}

// Bank Accounts Service
export class BankAccountService {
  private static COLLECTION = 'bank_accounts';

  // Get all bank accounts
  static async getBankAccounts(): Promise<BankAccount[]> {
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BankAccount[];
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      return [];
    }
  }

  // Add bank account
  static async addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...account,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  }

  // Update bank account
  static async updateBankAccount(id: string, account: Partial<BankAccount>): Promise<void> {
    try {
      const accountDoc = doc(db, this.COLLECTION, id);
      await updateDoc(accountDoc, {
        ...account,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  }

  // Delete bank account
  static async deleteBankAccount(id: string): Promise<void> {
    try {
      const accountDoc = doc(db, this.COLLECTION, id);
      await deleteDoc(accountDoc);
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  }

  // Listen to bank accounts changes
  static onBankAccountsChange(callback: (accounts: BankAccount[]) => void) {
    const q = query(collection(db, this.COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BankAccount[];
      callback(accounts);
    });
  }
}

// Legacy localStorage fallback for backward compatibility
export class LegacyService {
  static getSettingsFromLocalStorage(): AppSettings {
    try {
      const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
      return {
        telegramLink: settings.telegramLink || '',
        whatsappLink: settings.whatsappLink || '',
        infoItems: settings.infoItems || [
          { text: "Profit drops every 24 hours" },
          { text: "Level 1 - 24% Level 2 - 3% Level 3 - 2%" },
          { text: "Withdrawal: 10am - 6pm daily" },
          { text: "Deposit: 24/7" },
          { text: "Daily Login bonus: ₦50" },
          { text: "Welcome bonus: ₦550" },
          { text: "Minimum deposit: ₦3,000" },
          { text: "Withdrawal charge: 15%" },
          { text: "Minimum withdrawal: ₦1,000" },
        ],
        bankAccounts: settings.bankAccounts || []
      };
    } catch (error) {
      console.error('Error parsing localStorage settings:', error);
      return {
        telegramLink: '',
        whatsappLink: '',
        infoItems: [],
        bankAccounts: []
      };
    }
  }

  static saveSettingsToLocalStorage(settings: AppSettings): void {
    try {
      localStorage.setItem('globalSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
} 