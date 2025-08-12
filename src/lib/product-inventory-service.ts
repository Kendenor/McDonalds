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
      // Check if inventory already exists
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, 'initialized'));
      if (inventoryDoc.exists()) {
        return; // Already initialized
      }

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
      await setDoc(doc(db, this.COLLECTION, 'special'), specialInventory);
      await setDoc(doc(db, this.COLLECTION, 'premium'), premiumInventory);
      await setDoc(doc(db, this.COLLECTION, 'initialized'), {
        initialized: true,
        date: serverTimestamp()
      });

    } catch (error) {
      console.error('Error initializing inventory:', error);
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
      console.log(`Attempting to increase purchased count for ${productId} (${productType})`);
      
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (!inventoryDoc.exists()) {
        console.error(`Inventory document for ${productType} does not exist`);
        return false;
      }

      const inventory = inventoryDoc.data() as Record<string, { purchased: number; total: number; name: string }>;
      console.log(`Current inventory for ${productType}:`, inventory);
      
      if (!inventory[productId]) {
        console.error(`Product ${productId} not found in ${productType} inventory`);
        return false;
      }
      
      if (inventory[productId].purchased >= inventory[productId].total) {
        console.error(`Product ${productId} is already sold out (purchased: ${inventory[productId].purchased}/${inventory[productId].total})`);
        return false;
      }

      const oldPurchased = inventory[productId].purchased;
      inventory[productId].purchased += 1;
      
      console.log(`Increasing ${productId} purchased count from ${oldPurchased} to ${inventory[productId].purchased}`);
      
      await setDoc(doc(db, this.COLLECTION, productType), inventory);
      console.log(`Successfully updated inventory for ${productId}`);
      
      return true;
    } catch (error) {
      console.error(`Error increasing purchased count for ${productId}:`, error);
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
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (!inventoryDoc.exists()) return;

      const inventory = inventoryDoc.data() as Record<string, { purchased: number; total: number; name: string }>;
      
      // Reset all products purchased count to 0
      Object.keys(inventory).forEach(productId => {
        inventory[productId].purchased = 0;
      });

      await setDoc(doc(db, this.COLLECTION, productType), inventory);
    } catch (error) {
      console.error('Error restoring inventory:', error);
    }
  }

  // Check if a product is available (purchased < total)
  static async isProductAvailable(productId: string, productType: 'special' | 'premium'): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check availability');
      return false;
    }
    try {
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
      const inventory = await this.getInventory(productType);
      const product = inventory[productId];
      return product ? { purchased: product.purchased, total: product.total } : { purchased: 0, total: 0 };
    } catch (error) {
      console.error('Error getting product availability:', error);
      return { purchased: 0, total: 0 };
    }
  }
}
