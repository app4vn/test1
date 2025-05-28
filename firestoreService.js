// Firebase Firestore imports
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let dbInstance; // Sẽ được truyền vào từ script.js

export function initializeFirestoreService(firestoreInstance) {
    dbInstance = firestoreInstance;
}

// --- Deck Operations ---
export async function loadUserDecksFromFirestore(userId) {
    if (!userId || !dbInstance) {
        console.error("FirestoreService: Missing userId or dbInstance for loadUserDecks");
        return [];
    }
    console.log("FirestoreService: Loading decks for user ID:", userId);
    const decksCollectionRef = collection(dbInstance, 'users', userId, 'decks');
    const q = query(decksCollectionRef, orderBy('name', 'asc'));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error("FirestoreService: Error loading decks:", error);
        return [];
    }
}

export async function createDeckInFirestore(userId, deckName) {
    if (!userId || !dbInstance || !deckName || !deckName.trim()) {
        console.error("FirestoreService: Missing data for createDeck");
        return null;
    }
    const newDeckData = {
        name: deckName.trim(),
        createdAt: serverTimestamp(),
        owner: userId
    };
    try {
        const decksCollectionRef = collection(dbInstance, 'users', userId, 'decks');
        const docRef = await addDoc(decksCollectionRef, newDeckData);
        console.log("FirestoreService: Deck created with ID:", docRef.id);
        return { id: docRef.id, ...newDeckData, createdAt: Date.now() };
    } catch (error) {
        console.error("FirestoreService: Error creating deck:", error);
        return null;
    }
}

export async function updateDeckNameInFirestore(userId, deckId, newName) {
    if (!userId || !dbInstance || !deckId || !newName || !newName.trim()) {
        console.error("FirestoreService: Missing data for updateDeckName");
        return false;
    }
    const deckRef = doc(dbInstance, 'users', userId, 'decks', deckId);
    try {
        await updateDoc(deckRef, { name: newName.trim(), updatedAt: serverTimestamp() });
        console.log("FirestoreService: Deck name updated for ID:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating deck name:", error);
        return false;
    }
}

// --- Card Operations ---
export async function loadUserCardsFromFirestore(userId, deckId) {
    if (!userId || !dbInstance || (deckId !== null && !deckId)) {
        console.error("FirestoreService: Missing data for loadUserCardsFromDeck");
        return [];
    }

    let cardsCollectionRef;
    if (deckId === null) {
        console.warn("FirestoreService: loadUserCardsFromFirestore called with deckId=null. This is usually handled by client-side filtering.");
        return [];
    } else {
        console.log(`FirestoreService: Loading cards for deck ID: ${deckId} for user ID: ${userId}`);
        cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    }

    const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc'));
    try {
        const querySnapshot = await getDocs(qCards);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const {
                status, lastReviewed, reviewCount, nextReviewDate, interval, easeFactor, repetitions, isSuspended,
                isFavorite, // Explicitly remove if it exists from old data
                ...cardWithoutSrsAndFavorite // Spread the rest of the card data
            } = data;
            return {
                id: docSnap.id,
                ...cardWithoutSrsAndFavorite,
                isUserCard: true,
                isLearned: data.isLearned || false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || null),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt || null)
            };
        });
    } catch (error) {
        console.error(`FirestoreService: Error loading cards for deck ${deckId}:`, error);
        return [];
    }
}

export async function saveCardToFirestore(userId, deckId, cardData, cardId = null) {
    if (!userId || !dbInstance || !cardData) {
        console.error("FirestoreService: Missing userId, dbInstance, or cardData for saveCardToFirestore");
        return null;
    }
    if (!deckId) {
        console.error("FirestoreService: deckId is required to save a user card.");
        return null;
    }

    let collectionRefPath = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');

    const {
        status, lastReviewed, reviewCount, nextReviewDate, interval, easeFactor, repetitions, isSuspended,
        isFavorite, 
        ...dataToSaveClean
    } = cardData;

    if (dataToSaveClean.hasOwnProperty('isLearned')) {
        dataToSaveClean.isLearned = !!dataToSaveClean.isLearned;
    } else if (!cardId) { 
        dataToSaveClean.isLearned = false;
    }

    try {
        if (cardId) { 
            if (!dataToSaveClean.hasOwnProperty('updatedAt')) { 
                 dataToSaveClean.updatedAt = serverTimestamp();
            }
            const cardRef = doc(collectionRefPath, cardId);
            await updateDoc(cardRef, dataToSaveClean); 
            console.log("FirestoreService: Card updated with ID:", cardId, "in deck:", deckId, "Data:", dataToSaveClean);
            return cardId;
        } else { 
            dataToSaveClean.createdAt = serverTimestamp();
            dataToSaveClean.updatedAt = serverTimestamp();
            const docRef = await addDoc(collectionRefPath, dataToSaveClean);
            console.log("FirestoreService: Card added with ID:", docRef.id, "to deck:", deckId, "Data:", dataToSaveClean);
            return docRef.id;
        }
    } catch (error) {
        console.error("FirestoreService: Error saving card:", error, "Data attempted:", dataToSaveClean);
        return null;
    }
}

export async function deleteCardFromFirestore(userId, deckId, cardId) {
    if (!userId || !dbInstance || !deckId || !cardId) {
        console.error("FirestoreService: Missing data for deleteCardFromFirestore");
        return false;
    }
    try {
        const cardRef = doc(dbInstance, 'users', userId, 'decks', deckId, 'cards', cardId);
        await deleteDoc(cardRef);
        console.log("FirestoreService: Card deleted:", cardId, "from deck:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error deleting card:", error);
        return false;
    }
}

// --- Web Card Status Operations ---
export async function getWebCardStatusFromFirestore(userId, webCardGlobalId) {
    if (!userId || !dbInstance || !webCardGlobalId) {
        return null;
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                isLearned: data.isLearned || false,
                videoUrl: data.videoUrl || null,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : null
            };
        }
        return { isLearned: false, videoUrl: null }; 
    } catch (error) {
        console.error("FirestoreService: Error fetching web card status for", webCardGlobalId, error);
        return { isLearned: false, videoUrl: null };
    }
}

export async function updateWebCardStatusInFirestore(userId, webCardGlobalId, cardData, statusDataToUpdate) {
    if (!userId || !dbInstance || !webCardGlobalId || !cardData || !statusDataToUpdate) {
        console.error("FirestoreService: Missing data for updateWebCardStatusInFirestore. Aborting.");
        return false;
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);

    let originalTerm;
    if (cardData.category === 'phrasalVerbs') originalTerm = cardData.phrasalVerb;
    else if (cardData.category === 'collocations') originalTerm = cardData.collocation;
    else if (cardData.category === 'idioms') originalTerm = cardData.idiom;
    else originalTerm = cardData.word;

    if (originalTerm === undefined) {
        console.error("[FirestoreService] CRITICAL: originalTerm is undefined for web card. cardData received:", cardData);
        return false;
    }

    const dataToSet = {
        originalCategory: cardData.category,
        originalWordOrPhrase: originalTerm,
        updatedAt: serverTimestamp()
    };

    if (statusDataToUpdate.hasOwnProperty('isLearned')) {
        dataToSet.isLearned = !!statusDataToUpdate.isLearned; 
    }
    if (statusDataToUpdate.hasOwnProperty('videoUrl')) {
        dataToSet.videoUrl = statusDataToUpdate.videoUrl || null;
    }

    console.log("[FirestoreService] updateWebCardStatusInFirestore (with isLearned) - Data to set:", JSON.parse(JSON.stringify(dataToSet)));

    try {
        await setDoc(statusRef, dataToSet, { merge: true });
        console.log(`FirestoreService: Web card status updated for ${webCardGlobalId}:`, dataToSet);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating web card status in setDoc:", error, "Data attempted:", dataToSet);
        return false;
    }
}


// --- AppState Operations ---
export async function loadAppStateFromFirestore(userId) {
    if (!userId || !dbInstance) {
        console.error("FirestoreService: Missing userId or dbInstance for loadAppStateFromFirestore");
        return null;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        const docSnap = await getDoc(appStateRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: AppState loaded from Firestore.");
            return docSnap.data();
        }
        console.log("FirestoreService: No AppState in Firestore for this user.");
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading appState from Firestore:", error);
        return null;
    }
}

export async function saveAppStateToFirestoreService(userId, appStateData) {
    if (!userId || !dbInstance || !appStateData) {
        console.error("FirestoreService: Missing data for saveAppStateToFirestoreService");
        return false;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        await setDoc(appStateRef, appStateData); 
        console.log("FirestoreService: AppState saved to Firestore for user:", userId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving appState to Firestore:", error);
        return false;
    }
}

// --- Lecture Content Operations ---
export async function getLectureContent(lectureId) {
    if (!dbInstance || !lectureId) {
        console.error("FirestoreService: Missing dbInstance or lectureId for getLectureContent");
        return null;
    }
    const lectureRef = doc(dbInstance, 'lectures', lectureId);
    try {
        const docSnap = await getDoc(lectureRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: Lecture content loaded for ID:", lectureId);
            return docSnap.data();
        }
        console.log("FirestoreService: No lecture content found for ID:", lectureId);
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading lecture content:", error);
        return null;
    }
}

export async function saveLectureContent(lectureId, title, contentHTML) {
    if (!dbInstance || !lectureId || typeof title !== 'string' || typeof contentHTML !== 'string') {
        console.error("FirestoreService: Missing data or invalid type for saveLectureContent");
        return false;
    }
    const lectureRef = doc(dbInstance, 'lectures', lectureId);
    const dataToSave = {
        title: title,
        contentHTML: contentHTML,
        lastUpdatedAt: serverTimestamp()
    };
    try {
        await setDoc(lectureRef, dataToSave, { merge: true });
        console.log("FirestoreService: Lecture content saved for ID:", lectureId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving lecture content:", error);
        return false;
    }
}

// --- Custom Exercise Operations ---
const CUSTOM_EXERCISES_COLLECTION = 'customExercises';

export async function getCustomExercise(exerciseId) {
    if (!dbInstance || !exerciseId) {
        console.error("FirestoreService: Missing dbInstance or exerciseId for getCustomExercise");
        return null;
    }
    const exerciseRef = doc(dbInstance, CUSTOM_EXERCISES_COLLECTION, exerciseId);
    try {
        const docSnap = await getDoc(exerciseRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: Custom exercise loaded for ID:", exerciseId);
            return docSnap.data();
        }
        console.log("FirestoreService: No custom exercise found for ID:", exerciseId);
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading custom exercise:", error);
        return null;
    }
}

export async function saveCustomExercise(exerciseId, title, exerciseHTML) {
    if (!dbInstance || !exerciseId || typeof title !== 'string' || typeof exerciseHTML !== 'string') {
        console.error("FirestoreService: Missing data or invalid type for saveCustomExercise");
        return false;
    }
    const exerciseRef = doc(dbInstance, CUSTOM_EXERCISES_COLLECTION, exerciseId);
    const dataToSave = {
        title: title,
        exerciseHTML: exerciseHTML, // Lưu HTML của bài tập
        lastUpdatedAt: serverTimestamp()
    };
    try {
        await setDoc(exerciseRef, dataToSave, { merge: true });
        console.log("FirestoreService: Custom exercise saved for ID:", exerciseId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving custom exercise:", error);
        return false;
    }
}
