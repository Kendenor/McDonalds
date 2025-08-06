import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export class FirebaseInit {
  static async testConnection() {
    try {
      console.log('🔍 Testing Firebase connection...');
      
      // Test write
      const testDoc = doc(db, 'system', 'connection_test');
      await setDoc(testDoc, { 
        test: true, 
        timestamp: new Date().toISOString(),
        message: 'Firebase connection test'
      });
      console.log('✅ Firebase write test passed');
      
      // Test read
      const testRead = await getDoc(testDoc);
      if (testRead.exists()) {
        console.log('✅ Firebase read test passed:', testRead.data());
      } else {
        throw new Error('Document not found after write');
      }
      
      // Test delete
      await deleteDoc(testDoc);
      console.log('✅ Firebase delete test passed');
      
      return { success: true, message: 'Firebase connection working perfectly' };
    } catch (error: any) {
      console.error('❌ Firebase connection test failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }

  static async initializeDefaultData() {
    try {
      console.log('🚀 Initializing default Firebase data...');
      
      // Check if already initialized
      const initDoc = doc(db, 'system', 'initialized');
      const initCheck = await getDoc(initDoc);
      
      if (initCheck.exists()) {
        console.log('✅ Firebase already initialized');
        return { success: true, message: 'Already initialized' };
      }
      
      // Create default settings
      const defaultSettings = {
        telegramLink: 'https://t.me/mcdonaldsgroup',
        whatsappLink: 'https://whatsapp.com/channel/mcdonalds',
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
        bankAccounts: [
          {
            id: 'default-1',
            bankName: 'Access Bank',
            accountNumber: '1234567890',
            accountName: 'McDonald Investment Ltd'
          }
        ]
      };
      
      // Save default settings
      await setDoc(doc(db, 'settings', 'app_settings'), {
        ...defaultSettings,
        createdAt: new Date().toISOString()
      });
      
      // Mark as initialized
      await setDoc(initDoc, {
        initialized: true,
        date: new Date().toISOString()
      });
      
      console.log('✅ Firebase initialized with default data');
      return { success: true, message: 'Firebase initialized successfully' };
      
    } catch (error: any) {
      console.error('❌ Firebase initialization failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
} 