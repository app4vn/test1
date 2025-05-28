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
        // Consider a more user-friendly error display or logging mechanism
        // alert("Không thể tải danh sách bộ thẻ từ cơ sở dữ liệu. Vui lòng thử lại.");
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
        // Return client-side timestamp for createdAt for immediate use, Firestore will have serverTimestamp
        return { id: docRef.id, ...newDeckData, createdAt: Date.now() };
    } catch (error) {
        console.error("FirestoreService: Error creating deck:", error);
        // alert("Đã xảy ra lỗi khi tạo bộ thẻ. Vui lòng thử lại.");
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
        await updateDoc(deckRef, { name: newName.trim(), updatedAt: serverTimestamp() }); // Add updatedAt
        console.log("FirestoreService: Deck name updated for ID:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating deck name:", error);
        // alert("Đã xảy ra lỗi khi cập nhật tên bộ thẻ. Vui lòng thử lại.");
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
        // This case for unassigned cards is generally handled by filtering all cards client-side.
        // If you had a specific collection for unassigned, this would be different.
        // For now, this function is best suited for loading from a specific deck.
        console.warn("FirestoreService: loadUserCardsFromFirestore called with deckId=null. This is usually handled by client-side filtering.");
        return [];
    } else {
        console.log(`FirestoreService: Loading cards for deck ID: ${deckId} for user ID: ${userId}`);
        cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    }

    // Order by createdAt or another relevant field if needed
    const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc'));
    try {
        const querySnapshot = await getDocs(qCards);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // Remove SRS fields from the returned card object
            const {
                status, lastReviewed, reviewCount, nextReviewDate, interval, easeFactor, repetitions, isSuspended,
                ...cardWithoutSrs
            } = data;
            return {
                id: docSnap.id,
                ...cardWithoutSrs, // Spread the rest of the card data
                isUserCard: true,
                isFavorite: data.isFavorite || false,
                // Convert Timestamps to milliseconds for client-side usage if they exist
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || null),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt || null)
            };
        });
    } catch (error) {
        console.error(`FirestoreService: Error loading cards for deck ${deckId}:`, error);
        // alert("Không thể tải danh sách thẻ. Vui lòng thử lại.");
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

    // Ensure only non-SRS fields are prepared for saving
    const {
        status, lastReviewed, reviewCount, nextReviewDate, interval, easeFactor, repetitions, isSuspended, // Fields to exclude
        ...dataToSaveClean // The rest of the fields
    } = cardData;

    // Ensure isFavorite is explicitly boolean
    dataToSaveClean.isFavorite = !!dataToSaveClean.isFavorite;


    try {
        if (cardId) { // Update existing card
            dataToSaveClean.updatedAt = serverTimestamp();
            const cardRef = doc(collectionRefPath, cardId);
            await updateDoc(cardRef, dataToSaveClean);
            console.log("FirestoreService: Card updated with ID:", cardId, "in deck:", deckId);
            return cardId;
        } else { // Add new card
            dataToSaveClean.createdAt = serverTimestamp();
            dataToSaveClean.updatedAt = serverTimestamp();
            const docRef = await addDoc(collectionRefPath, dataToSaveClean);
            console.log("FirestoreService: Card added with ID:", docRef.id, "to deck:", deckId);
            return docRef.id;
        }
    } catch (error) {
        console.error("FirestoreService: Error saving card:", error, "Data attempted:", dataToSaveClean);
        // alert("Đã xảy ra lỗi khi lưu thẻ. Vui lòng thử lại.");
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
        // alert("Đã xảy ra lỗi khi xóa thẻ. Vui lòng thử lại.");
        return false;
    }
}

// --- Web Card Status Operations ---
// This function now primarily handles 'isFavorite' and 'videoUrl' for web cards.
export async function getWebCardStatusFromFirestore(userId, webCardGlobalId) {
    if (!userId || !dbInstance || !webCardGlobalId) {
        return null; // Or { isFavorite: false, videoUrl: null } as a default
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Only return relevant non-SRS fields
            return {
                isFavorite: data.isFavorite || false,
                videoUrl: data.videoUrl || null, // User-specific video URL for a web card
                // originalCategory: data.originalCategory, // Kept for reference if needed
                // originalWordOrPhrase: data.originalWordOrPhrase, // Kept for reference
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : null
            };
        }
        return { isFavorite: false, videoUrl: null }; // Default if no status document exists
    } catch (error) {
        console.error("FirestoreService: Error fetching web card status for", webCardGlobalId, error);
        return { isFavorite: false, videoUrl: null };
    }
}

// This function now primarily updates 'isFavorite' and 'videoUrl' for web cards.
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

    // Prepare data to set, focusing on non-SRS fields.
    // statusDataToUpdate might come with 'isFavorite' or 'videoUrl'.
    const dataToSet = {
        originalCategory: cardData.category,
        originalWordOrPhrase: originalTerm,
        updatedAt: serverTimestamp()
    };

    if (statusDataToUpdate.hasOwnProperty('isFavorite')) {
        dataToSet.isFavorite = !!statusDataToUpdate.isFavorite; // Ensure boolean
    }
    if (statusDataToUpdate.hasOwnProperty('videoUrl')) {
        dataToSet.videoUrl = statusDataToUpdate.videoUrl || null; // Allow clearing videoUrl
    }
    // Any other SRS fields in statusDataToUpdate will be ignored here.

    console.log("[FirestoreService] updateWebCardStatusInFirestore (no SRS) - Data to set:", JSON.parse(JSON.stringify(dataToSet)));

    try {
        // Use merge: true to only update specified fields and not overwrite other potential user settings for this web card.
        await setDoc(statusRef, dataToSet, { merge: true });
        console.log(`FirestoreService: Web card status updated for ${webCardGlobalId}:`, dataToSet);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating web card status in setDoc:", error, "Data attempted:", dataToSet);
        return false;
    }
}


// --- AppState Operations ---
export async function loadAppStateFromFirestore(userId) { // SRS fields within appState will be ignored by script.js
    if (!userId || !dbInstance) {
        console.error("FirestoreService: Missing userId or dbInstance for loadAppStateFromFirestore");
        return null;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        const docSnap = await getDoc(appStateRef);
        if (docSnap.exists()) {
            console.log("FirestoreService: AppState loaded from Firestore.");
            return docSnap.data(); // script.js will handle filtering out SRS fields
        }
        console.log("FirestoreService: No AppState in Firestore for this user.");
        return null;
    } catch (error) {
        console.error("FirestoreService: Error loading appState from Firestore:", error);
        return null;
    }
}

export async function saveAppStateToFirestoreService(userId, appStateData) { // appStateData from script.js will no longer contain SRS fields
    if (!userId || !dbInstance || !appStateData) {
        console.error("FirestoreService: Missing data for saveAppStateToFirestoreService");
        return false;
    }
    const appStateRef = doc(dbInstance, 'users', userId, 'userSettings', 'appStateDoc');
    try {
        // appStateData is already cleaned of SRS fields by script.js before calling this
        await setDoc(appStateRef, appStateData);
        console.log("FirestoreService: AppState saved to Firestore for user (no SRS fields expected):", userId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error saving appState to Firestore:", error);
        return false;
    }
}

// --- Lecture Content Operations --- (Remains the same)
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
