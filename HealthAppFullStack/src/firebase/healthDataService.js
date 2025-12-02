import { doc, setDoc, getDoc, collection, writeBatch, query, getDocs, deleteDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const BATCH_SIZE = 100;
const MAX_DOCUMENT_SIZE = 900000;

const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

export const saveUserHealthData = async (userId, healthData) => {
    try {
        console.log('💾 Saving health data for user:', userId);
        
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Save metadata first
        const metadataRef = doc(db, 'userHealthData', `${userId}_metadata`);
        const metadata = {
            userId,
            lastUpdated: new Date(),
            uploadCount: 1,
            totalHeartRates: healthData.heartRates?.length || 0,
            totalEnergyData: healthData.energyData?.length || 0,
            totalWorkouts: healthData.workouts?.length || 0
        };
        
        await setDoc(metadataRef, metadata, { merge: true });
        console.log('✅ Metadata saved');

        // Save heart rates in batches
        if (healthData.heartRates && healthData.heartRates.length > 0) {
            const heartRateChunks = chunkArray(healthData.heartRates, BATCH_SIZE);
            
            for (let i = 0; i < heartRateChunks.length; i++) {
                const batch = writeBatch(db);
                const chunkRef = doc(db, 'userHealthData', `${userId}_heartRates_${i}`);
                batch.set(chunkRef, { 
                    data: heartRateChunks[i], 
                    chunkIndex: i,
                    userId 
                });
                await batch.commit();
                console.log(`✅ Heart rate chunk ${i + 1}/${heartRateChunks.length} saved`);
            }
        }

        // Save energy data in batches
        if (healthData.energyData && healthData.energyData.length > 0) {
            const energyChunks = chunkArray(healthData.energyData, BATCH_SIZE);
            
            for (let i = 0; i < energyChunks.length; i++) {
                const batch = writeBatch(db);
                const chunkRef = doc(db, 'userHealthData', `${userId}_energyData_${i}`);
                batch.set(chunkRef, { 
                    data: energyChunks[i], 
                    chunkIndex: i,
                    userId 
                });
                await batch.commit();
                console.log(`✅ Energy chunk ${i + 1}/${energyChunks.length} saved`);
            }
        }

        // Save workouts in batches
        if (healthData.workouts && healthData.workouts.length > 0) {
            const workoutChunks = chunkArray(healthData.workouts, BATCH_SIZE);
            
            for (let i = 0; i < workoutChunks.length; i++) {
                const batch = writeBatch(db);
                const chunkRef = doc(db, 'userHealthData', `${userId}_workouts_${i}`);
                batch.set(chunkRef, { 
                    data: workoutChunks[i], 
                    chunkIndex: i,
                    userId 
                });
                await batch.commit();
                console.log(`✅ Workout chunk ${i + 1}/${workoutChunks.length} saved`);
            }
        }

        console.log('✅ All health data saved successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Error saving health data:', error);
        
        
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied. Please check Firestore security rules.');
        } else if (error.code === 'unauthenticated') {
            throw new Error('You must be logged in to save data.');
        }
        
        throw error;
    }
};

export const getUserHealthData = async (userId) => {
    try {
        console.log('📖 Getting health data for user:', userId);
        
        if (!userId) {
            throw new Error('User ID is required');
        }

        
        const metadataRef = doc(db, 'userHealthData', `${userId}_metadata`);
        const metadataSnap = await getDoc(metadataRef);
        
        if (!metadataSnap.exists()) {
            console.log('ℹ️ No health data found for user');
            return null;
        }

        const metadata = metadataSnap.data();
        
        // Get all data chunks for this user
        const userDataQuery = query(
            collection(db, 'userHealthData'),
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(userDataQuery);
        
        const heartRates = [];
        const energyData = [];
        const workouts = [];
        
        querySnapshot.forEach((doc) => {
            const docId = doc.id;
            const data = doc.data();
            
            if (docId.includes('_heartRates_')) {
                heartRates.push(...(data.data || []));
            } else if (docId.includes('_energyData_')) {
                energyData.push(...(data.data || []));
            } else if (docId.includes('_workouts_')) {
                workouts.push(...(data.data || []));
            }
        });

        // Sort arrays by date/time if available
        heartRates.sort((a, b) => new Date(a.date) - new Date(b.date));
        energyData.sort((a, b) => new Date(a.date) - new Date(b.date));
        workouts.sort((a, b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date));

        console.log('✅ Health data retrieved successfully');
        return {
            ...metadata,
            heartRates,
            energyData,
            workouts
        };
        
    } catch (error) {
        console.error('❌ Error getting health data:', error);
        throw error;
    }
};

export const updateUserHealthData = async (userId, newHealthData) => {
    try {
        console.log('🔄 Updating health data for user:', userId);
        
        // Delete existing data chunks first
        await deleteUserHealthData(userId);
        
        // Save new data
        return await saveUserHealthData(userId, newHealthData);
        
    } catch (error) {
        console.error('❌ Error updating health data:', error);
        throw error;
    }
};

// Helper function to delete all user data
const deleteUserHealthData = async (userId) => {
    try {
        const userDataQuery = query(
            collection(db, 'userHealthData'),
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(userDataQuery);
        
        const batch = writeBatch(db);
        let batchSize = 0;
        
        querySnapshot.forEach((doc) => {
            if (doc.id !== `${userId}_metadata`) { // Keep metadata
                batch.delete(doc.ref);
                batchSize++;
            }
        });
        
        if (batchSize > 0) {
            await batch.commit();
            console.log('🗑️ Previous user data deleted');
        }
        
    } catch (error) {
        console.error('Error deleting previous data:', error);
        
    }
};