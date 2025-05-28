// Firebase Firestore imports
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
        alert("Không thể tải danh sách bộ thẻ từ cơ sở dữ liệu. Vui lòng thử lại.");
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
        alert("Đã xảy ra lỗi khi tạo bộ thẻ. Vui lòng thử lại.");
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
        await updateDoc(deckRef, { name: newName.trim() });
        console.log("FirestoreService: Deck name updated for ID:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating deck name:", error);
        alert("Đã xảy ra lỗi khi cập nhật tên bộ thẻ. Vui lòng thử lại.");
        return false;
    }
}

// --- Card Operations ---
export async function loadUserCardsFromFirestore(userId, deckId) {
    if (!userId || !dbInstance || (deckId !== null && !deckId)) {
        console.error("FirestoreService: Missing data for loadUserCardsFromDeck (userId or dbInstance missing, or invalid deckId if not null)");
        return [];
    }

    let cardsCollectionRef;
    if (deckId === null) {
        console.warn("FirestoreService: loadUserCardsFromFirestore called with deckId=null. This implies loading unassigned cards.");
        return [];
    } else {
        console.log(`FirestoreService: Loading cards for deck ID: ${deckId} for user ID: ${userId}`);
        cardsCollectionRef = collection(dbInstance, 'users', userId, 'decks', deckId, 'cards');
    }

    // Không còn orderBy theo các trường SRS nữa, có thể orderBy theo createdAt hoặc term (word/phrase)
    const qCards = query(cardsCollectionRef, orderBy('createdAt', 'asc')); // hoặc orderBy theo term nếu muốn
    try {
        const querySnapshot = await getDocs(qCards);
        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // Loại bỏ các trường SRS và isFavorite khi tải thẻ
            const {
                // status, // Loại bỏ
                // lastReviewed, // Loại bỏ
                // reviewCount, // Loại bỏ
                // nextReviewDate, // Loại bỏ
                // interval, // Loại bỏ
                // easeFactor, // Loại bỏ
                // repetitions, // Loại bỏ
                // isSuspended, // Loại bỏ
                // isFavorite, // Loại bỏ
                ...restOfData // Giữ lại các trường còn lại
            } = data;
            return {
                id: docSnap.id,
                ...restOfData,
                isUserCard: true,
                // Chuyển đổi Timestamp nếu có
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || null),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt || null)
            };
        });
    } catch (error) {
        console.error(`FirestoreService: Error loading cards for deck ${deckId}:`, error);
        alert("Không thể tải danh sách thẻ. Vui lòng thử lại.");
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

    // Loại bỏ các trường SRS và isFavorite trước khi lưu
    const {
        // status, // Loại bỏ
        // lastReviewed, // Loại bỏ
        // reviewCount, // Loại bỏ
        // nextReviewDate, // Loại bỏ
        // interval, // Loại bỏ
        // easeFactor, // Loại bỏ
        // repetitions, // Loại bỏ
        // isSuspended, // Loại bỏ
        // isFavorite, // Loại bỏ
        ...dataToSave // Giữ lại các trường còn lại
    } = cardData;


    try {
        if (cardId) { // Update existing card
            dataToSave.updatedAt = serverTimestamp();
            const cardRef = doc(collectionRefPath, cardId);
            await updateDoc(cardRef, dataToSave);
            console.log("FirestoreService: Card updated with ID:", cardId, "in deck:", deckId);
            return cardId;
        } else { // Add new card
            dataToSave.createdAt = serverTimestamp();
            dataToSave.updatedAt = serverTimestamp();
            const docRef = await addDoc(collectionRefPath, dataToSave);
            console.log("FirestoreService: Card added with ID:", docRef.id, "to deck:", deckId);
            return docRef.id;
        }
    } catch (error) {
        console.error("FirestoreService: Error saving card:", error, "Data attempted:", dataToSave);
        alert("Đã xảy ra lỗi khi lưu thẻ. Vui lòng thử lại.");
        return null;
    }
}

export async function deleteCardFromFirestore(userId, deckId, cardId) {
    if (!userId || !dbInstance || !deckId || !cardId) {
        console.error("FirestoreService: Missing data for deleteCardFromFirestore (userId, dbInstance, deckId, or cardId)");
        return false;
    }
    try {
        const cardRef = doc(dbInstance, 'users', userId, 'decks', deckId, 'cards', cardId);
        await deleteDoc(cardRef);
        console.log("FirestoreService: Card deleted:", cardId, "from deck:", deckId);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error deleting card:", error);
        alert("Đã xảy ra lỗi khi xóa thẻ. Vui lòng thử lại.");
        return false;
    }
}

// --- Web Card Status Operations ---
// Chức năng này không còn ý nghĩa nhiều khi bỏ SRS và Favorite cho web card.
// Có thể giữ lại để lưu các thông tin khác nếu cần, hoặc loại bỏ hoàn toàn.
// Hiện tại, tôi sẽ comment out phần lớn để đơn giản hóa.
export async function getWebCardStatusFromFirestore(userId, webCardGlobalId) {
    if (!userId || !dbInstance || !webCardGlobalId) {
        return null; // Không còn trả về { isFavorite: false } vì isFavorite đã bị loại bỏ
    }
    const statusRef = doc(dbInstance, 'users', userId, 'webCardStatuses', webCardGlobalId);
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Loại bỏ các trường SRS và isFavorite
            const {
                // status, // Loại bỏ
                // lastReviewed, // Loại bỏ
                // reviewCount, // Loại bỏ
                // nextReviewDate, // Loại bỏ
                // interval, // Loại bỏ
                // easeFactor, // Loại bỏ
                // repetitions, // Loại bỏ
                // isSuspended, // Loại bỏ
                // isFavorite, // Loại bỏ
                ...restOfData
            } = data;
            return {
                ...restOfData
                // Chuyển đổi Timestamp nếu có cho các trường còn lại (nếu có)
            };
        }
        return null; // Trả về null nếu document không tồn tại
    } catch (error) {
        console.error("FirestoreService: Error fetching web card status for", webCardGlobalId, error);
        return null;
    }
}

export async function updateWebCardStatusInFirestore(userId, webCardGlobalId, cardData, srsDataToUpdate) {
    // Vì SRS và Favorite đã bị loại bỏ, hàm này có thể không cần thiết nữa
    // hoặc chỉ lưu các thông tin rất cơ bản nếu người dùng tương tác với thẻ web.
    console.warn("FirestoreService: updateWebCardStatusInFirestore called, but SRS and Favorite functionalities are removed. Review if this function is still needed.");
    if (!userId || !dbInstance || !webCardGlobalId || !cardData /*|| !srsDataToUpdate - srsDataToUpdate giờ không còn nhiều ý nghĩa*/) {
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
        console.error("[FirestoreService] CRITICAL: originalTerm is undefined. cardData received:", cardData);
        return false;
    }

    // Dữ liệu lưu lại cho web card status giờ rất hạn chế
    const dataToSet = {
        originalCategory: cardData.category,
        originalWordOrPhrase: originalTerm,
        // ...srsDataToUpdate, // Loại bỏ các trường SRS
        updatedAt: serverTimestamp() // Có thể vẫn muốn lưu thời điểm cập nhật cuối
    };

    // Không còn trường isFavorite để xử lý ở đây

    console.log("[FirestoreService] updateWebCardStatusInFirestore - Data to set in Firestore (minimal due to SRS/Fav removal):", JSON.parse(JSON.stringify(dataToSet)));

    try {
        await setDoc(statusRef, dataToSet, { merge: true });
        console.log(`FirestoreService: Web card status (minimal) updated for ${webCardGlobalId}:`, dataToSet);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error updating web card status (minimal) in setDoc:", error, "Data attempted:", dataToSet);
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
            // Cần đảm bảo không load các trường SRS/Favorite từ appState cũ nếu có
            const appState = docSnap.data();
            if (appState.categoryStates) {
                for (const key in appState.categoryStates) {
                    // delete appState.categoryStates[key].filterMarked; // filterMarked giờ sẽ khác
                    // Các trường khác của categoryStates như baseVerb, tag, currentIndex vẫn giữ
                }
            }
            // delete appState.userPreferences.exampleSpeechRate; // Giữ lại nếu vẫn dùng
            return appState;
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
    
    // Tạo một bản sao của appStateData để không thay đổi đối tượng gốc
    const cleanedAppState = JSON.parse(JSON.stringify(appStateData));

    // Dọn dẹp các trường SRS/Favorite không còn dùng trong categoryStates
    if (cleanedAppState.categoryStates) {
        for (const key in cleanedAppState.categoryStates) {
            // delete cleanedAppState.categoryStates[key].filterMarked; // filterMarked sẽ được quản lý lại
            // Các trường SRS khác nếu có trong state cũ cũng nên được xóa
            delete cleanedAppState.categoryStates[key].status; // Ví dụ
        }
    }
    // Xóa các userPreferences không còn liên quan nếu có
    // if (cleanedAppState.userPreferences) {
        // delete cleanedAppState.userPreferences.someSrsPreference;
    // }

    try {
        await setDoc(appStateRef, cleanedAppState);
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
