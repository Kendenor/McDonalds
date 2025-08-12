import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';

// Helper function to check if we're on client side
function isClientSide() {
  return typeof window !== 'undefined';
}

// Product Inventory Service
export class ProductInventoryService {
  private static COLLECTION = 'product_inventory';

  // Initialize default inventory for Special and Premium products
  static async initializeInventory(): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot initialize inventory');
      return;
    }
    try {
      console.log('[DEBUG] Starting inventory initialization...');
      
      // Check if inventory already exists
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, 'initialized'));
      if (inventoryDoc.exists()) {
        console.log('[DEBUG] Inventory already initialized, skipping...');
        return; // Already initialized
      }

      console.log('[DEBUG] Creating new inventory...');

      // Special products inventory - Track purchased count (starts at 0)
      const specialInventory = {
        'special-1': { purchased: 0, total: 300, name: 'Special 1' },
        'special-2': { purchased: 0, total: 250, name: 'Special 2' },
        'special-3': { purchased: 0, total: 150, name: 'Special 3' },
        'special-4': { purchased: 0, total: 120, name: 'Special 4' },
        'special-5': { purchased: 0, total: 100, name: 'Special 5' },
        'special-6': { purchased: 0, total: 90, name: 'Special 6' },
        'special-7': { purchased: 0, total: 70, name: 'Special 7' },
        'special-8': { purchased: 0, total: 40, name: 'Special 8' },
        'special-9': { purchased: 0, total: 15, name: 'Special 9' },
        'special-10': { purchased: 0, total: 3, name: 'Special 10' }
      };

      // Premium products inventory - Track purchased count (starts at 0)
      const premiumInventory = {
        'premium-1': { purchased: 0, total: 200, name: 'Premium 1' },
        'premium-2': { purchased: 0, total: 170, name: 'Premium 2' },
        'premium-3': { purchased: 0, total: 150, name: 'Premium 3' },
        'premium-4': { purchased: 0, total: 120, name: 'Premium 4' },
        'premium-5': { purchased: 0, total: 100, name: 'Premium 5' },
        'premium-6': { purchased: 0, total: 80, name: 'Premium 6' },
        'premium-7': { purchased: 0, total: 50, name: 'Premium 7' },
        'premium-8': { purchased: 0, total: 30, name: 'Premium 8' },
        'premium-9': { purchased: 0, total: 4, name: 'Premium 9' }
      };

      // Save inventory to Firestore
      console.log('[DEBUG] Saving special inventory...');
      await setDoc(doc(db, this.COLLECTION, 'special'), specialInventory);
      console.log('[DEBUG] Saving premium inventory...');
      await setDoc(doc(db, this.COLLECTION, 'premium'), premiumInventory);
      console.log('[DEBUG] Saving initialization marker...');
      await setDoc(doc(db, this.COLLECTION, 'initialized'), {
        initialized: true,
        date: serverTimestamp()
      });

      console.log('[DEBUG] Inventory initialization completed successfully');

    } catch (error) {
      console.error('[ERROR] Error initializing inventory:', error);
      throw error; // Re-throw to let calling code handle it
    }
  }

  // Force reset inventory (for debugging/admin use)
  static async forceResetInventory(): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot reset inventory');
      return;
    }
    try {
      console.log('[DEBUG] Force resetting inventory...');
      
      // Delete the initialization marker
      await setDoc(doc(db, this.COLLECTION, 'initialized'), {
        initialized: false,
        date: serverTimestamp()
      });
      
      // Re-initialize
      await this.initializeInventory();
      console.log('[DEBUG] Inventory force reset completed');
    } catch (error) {
      console.error('[ERROR] Error force resetting inventory:', error);
      throw error;
    }
  }

  // Get inventory for a specific product type
  static async getInventory(productType: 'special' | 'premium'): Promise<Record<string, { purchased: number; total: number; name: string }>> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get inventory');
      return {};
    }
    try {
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (inventoryDoc.exists()) {
        return inventoryDoc.data() as Record<string, { purchased: number; total: number; name: string }>;
      }
      return {};
    } catch (error) {
      console.error('Error getting inventory:', error);
      return {};
    }
  }

  // Update product availability (increase purchased count when purchased)
  static async increasePurchasedCount(productId: string, productType: 'special' | 'premium'): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update availability');
      return false;
    }
    try {
      console.log(`[DEBUG] Attempting to increase purchased count for ${productId} (${productType})`);
      
      // First, ensure inventory is initialized
      console.log(`[DEBUG] Initializing inventory...`);
      await this.initializeInventory();
      console.log(`[DEBUG] Inventory initialization completed`);
      
      // Get the inventory document
      const inventoryRef = doc(db, this.COLLECTION, productType);
      const inventoryDoc = await getDoc(inventoryRef);
      console.log(`[DEBUG] Inventory document exists: ${inventoryDoc.exists()}`);
      
      if (!inventoryDoc.exists()) {
        console.error(`[ERROR] Inventory document for ${productType} does not exist after initialization`);
        return false;
      }

      const inventory = inventoryDoc.data() as Record<string, { purchased: number; total: number; name: string }>;
      console.log(`[DEBUG] Current inventory for ${productType}:`, inventory);
      console.log(`[DEBUG] Looking for product: ${productId}`);
      console.log(`[DEBUG] Available products:`, Object.keys(inventory));
      
      if (!inventory[productId]) {
        console.error(`[ERROR] Product ${productId} not found in ${productType} inventory`);
        console.error(`[ERROR] Available products:`, Object.keys(inventory));
        return false;
      }
      
      console.log(`[DEBUG] Product ${productId} found. Current: ${inventory[productId].purchased}/${inventory[productId].total}`);
      
      if (inventory[productId].purchased >= inventory[productId].total) {
        console.error(`[ERROR] Product ${productId} is already sold out (purchased: ${inventory[productId].purchased}/${inventory[productId].total})`);
        return false;
      }

      const oldPurchased = inventory[productId].purchased;
      const newPurchased = oldPurchased + 1;
      
      console.log(`[DEBUG] Increasing ${productId} purchased count from ${oldPurchased} to ${newPurchased}`);
      
      // Use updateDoc to update only the specific product field
      const updateData = {
        [`${productId}.purchased`]: newPurchased
      };
      
      console.log(`[DEBUG] Update data:`, updateData);
      await updateDoc(inventoryRef, updateData);
      console.log(`[DEBUG] Successfully updated inventory for ${productId}`);
      
      return true;
    } catch (error) {
      console.error(`[ERROR] Error increasing purchased count for ${productId}:`, error);
      console.error(`[ERROR] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        productId,
        productType
      });
      return false;
    }
  }

  // Restore inventory for a specific product type (reset purchased count to 0)
  static async restoreInventory(productType: 'special' | 'premium'): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot restore inventory');
      return;
    }
    try {
      const inventoryRef = doc(db, this.COLLECTION, productType);
      const inventoryDoc = await getDoc(inventoryRef);
      if (!inventoryDoc.exists()) return;

      const inventory = inventoryDoc.data() as Record<string, { purchased: number; total: number; name: string }>;
      
      // Reset all products purchased count to 0
      const updateData: any = {};
      Object.keys(inventory).forEach(productId => {
        updateData[`${productId}.purchased`] = 0;
      });

      await updateDoc(inventoryRef, updateData);
      console.log(`[DEBUG] Successfully restored ${productType} inventory`);
    } catch (error) {
      console.error('Error restoring inventory:', error);
      throw error;
    }
  }

  // Check if a product is available (purchased < total)
  static async isProductAvailable(productId: string, productType: 'special' | 'premium'): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check availability');
      return false;
    }
    try {
      // Ensure inventory is initialized first
      await this.initializeInventory();
      
      const inventory = await this.getInventory(productType);
      const product = inventory[productId];
      return product ? product.purchased < product.total : false;
    } catch (error) {
      console.error('Error checking product availability:', error);
      return false;
    }
  }

  // Get purchased count and total for a specific product
  static async getProductAvailability(productId: string, productType: 'special' | 'premium'): Promise<{ purchased: number; total: number }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get product availability');
      return { purchased: 0, total: 0 };
    }
    try {
      // Ensure inventory is initialized first
      await this.initializeInventory();
      
      const inventory = await this.getInventory(productType);
      const product = inventory[productId];
      return product ? { purchased: product.purchased, total: product.total } : { purchased: 0, total: 0 };
    } catch (error) {
      console.error('Error getting product availability:', error);
      return { purchased: 0, total: 0 };
    }
  }
}
