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

      // Special products inventory
      const specialInventory = {
        'special-1': { available: 300, total: 300, name: 'Special 1' },
        'special-2': { available: 250, total: 250, name: 'Special 2' },
        'special-3': { available: 150, total: 150, name: 'Special 3' },
        'special-4': { available: 120, total: 120, name: 'Special 4' },
        'special-5': { available: 100, total: 100, name: 'Special 5' },
        'special-6': { available: 90, total: 90, name: 'Special 6' },
        'special-7': { available: 70, total: 70, name: 'Special 7' },
        'special-8': { available: 40, total: 40, name: 'Special 8' },
        'special-9': { available: 15, total: 15, name: 'Special 9' },
        'special-10': { available: 3, total: 3, name: 'Special 10' }
      };

      // Premium products inventory
      const premiumInventory = {
        'premium-1': { available: 200, total: 200, name: 'Premium 1' },
        'premium-2': { available: 170, total: 170, name: 'Premium 2' },
        'premium-3': { available: 150, total: 150, name: 'Premium 3' },
        'premium-4': { available: 120, total: 120, name: 'Premium 4' },
        'premium-5': { available: 100, total: 100, name: 'Premium 5' },
        'premium-6': { available: 80, total: 80, name: 'Premium 6' },
        'premium-7': { available: 50, total: 50, name: 'Premium 7' },
        'premium-8': { available: 30, total: 30, name: 'Premium 8' },
        'premium-9': { available: 4, total: 4, name: 'Premium 9' }
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
  static async getInventory(productType: 'special' | 'premium'): Promise<Record<string, { available: number; total: number; name: string }>> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get inventory');
      return {};
    }
    try {
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (inventoryDoc.exists()) {
        return inventoryDoc.data() as Record<string, { available: number; total: number; name: string }>;
      }
      return {};
    } catch (error) {
      console.error('Error getting inventory:', error);
      return {};
    }
  }

  // Update product availability (decrease when purchased)
  static async decreaseAvailability(productId: string, productType: 'special' | 'premium'): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot update availability');
      return false;
    }
    try {
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (!inventoryDoc.exists()) return false;

      const inventory = inventoryDoc.data() as Record<string, { available: number; total: number; name: string }>;
      if (!inventory[productId] || inventory[productId].available <= 0) return false;

      inventory[productId].available -= 1;
      await setDoc(doc(db, this.COLLECTION, productType), inventory);
      return true;
    } catch (error) {
      console.error('Error decreasing availability:', error);
      return false;
    }
  }

  // Restore inventory for a specific product type
  static async restoreInventory(productType: 'special' | 'premium'): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot restore inventory');
      return;
    }
    try {
      const inventoryDoc = await getDoc(doc(db, this.COLLECTION, productType));
      if (!inventoryDoc.exists()) return;

      const inventory = inventoryDoc.data() as Record<string, { available: number; total: number; name: string }>;
      
      // Restore all products to their original total
      Object.keys(inventory).forEach(productId => {
        inventory[productId].available = inventory[productId].total;
      });

      await setDoc(doc(db, this.COLLECTION, productType), inventory);
    } catch (error) {
      console.error('Error restoring inventory:', error);
    }
  }

  // Check if a product is available
  static async isProductAvailable(productId: string, productType: 'special' | 'premium'): Promise<boolean> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot check availability');
      return false;
    }
    try {
      const inventory = await this.getInventory(productType);
      return inventory[productId]?.available > 0 || false;
    } catch (error) {
      console.error('Error checking product availability:', error);
      return false;
    }
  }

  // Get available count for a specific product
  static async getProductAvailability(productId: string, productType: 'special' | 'premium'): Promise<{ available: number; total: number }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get product availability');
      return { available: 0, total: 0 };
    }
    try {
      const inventory = await this.getInventory(productType);
      const product = inventory[productId];
      return product ? { available: product.available, total: product.total } : { available: 0, total: 0 };
    } catch (error) {
      console.error('Error getting product availability:', error);
      return { available: 0, total: 0 };
    }
  }
}
