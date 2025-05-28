// import { Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Các biến phụ thuộc sẽ không còn được sử dụng nhiều
// let fsService;
// let authGetCurrentUserId;
// let utilGetWebCardGlobalId;
// let uiUpdateStatusButtons;
// let uiUpdateFlashcard;
// let uiNextBtn;
// let dataGetCurrentCard;
// let dataGetCurrentDataArray;
// let dataGetCurrentIndex;
// let uiShowToast;

export function initializeSrsModule(dependencies) {
    // fsService = dependencies.firestoreServiceModule;
    // authGetCurrentUserId = dependencies.authGetCurrentUserIdFunc;
    // utilGetWebCardGlobalId = dependencies.utilGetWebCardGlobalIdFunc;
    // uiUpdateStatusButtons = dependencies.uiUpdateStatusButtonsFunc;
    // uiUpdateFlashcard = dependencies.uiUpdateFlashcardFunc;
    // uiNextBtn = dependencies.uiNextBtnElement;
    // dataGetCurrentCard = dependencies.dataGetCurrentCardFunc;
    // dataGetCurrentDataArray = dependencies.dataGetWindowCurrentDataFunc;
    // dataGetCurrentIndex = dependencies.dataGetCurrentIndexFunc;
    // uiShowToast = dependencies.uiShowToastFunc;
    console.log("SRS Module initialized, but SRS functionality is disabled.");
}

// Hàm này không còn tính toán SRS nữa
// function calculateSrsParameters(card, ratingQuality) {
    // ... (Toàn bộ logic tính toán SRS cũ được loại bỏ) ...
    // return {
    //     newInterval: 1, // Giá trị mặc định, không còn ý nghĩa SRS
    //     newEaseFactor: 2.5, // Giá trị mặc định
    //     newRepetitions: (card.repetitions || 0) + 1, // Có thể vẫn muốn đếm số lần review
    //     nextReviewDate: Timestamp.fromDate(new Date()) // Ngày hiện tại, không còn ý nghĩa SRS
    // };
// }

// Hàm này không còn cập nhật dữ liệu SRS lên Firestore nữa
// async function updateCardSrsDataInternal(cardItem, ratingQuality) {
    // if (!cardItem) {
    //     console.error("SRS Module (updateCardSrsDataInternal): cardItem is undefined. Aborting.");
    //     if (uiShowToast) uiShowToast("Lỗi: Không có thông tin thẻ để cập nhật SRS.", 3000, 'error');
    //     return;
    // }
    // console.log("SRS functionality is disabled. No update will be performed for card:", cardItem);
    // if(uiUpdateStatusButtons) uiUpdateStatusButtons(); // Có thể vẫn gọi để ẩn nút SRS
// }

export async function processSrsRatingWrapper(ratingString) {
    // const currentDataArray = dataGetCurrentDataArray ? dataGetCurrentDataArray() : [];
    // const currentIndex = dataGetCurrentIndex ? dataGetCurrentIndex() : 0;

    // if (!currentDataArray || currentDataArray.length === 0) {
    //     console.warn("SRS Module (processSrsRatingWrapper): currentDataArray is empty or not available.");
    //     return;
    // }
    // const cardItem = currentDataArray[currentIndex];

    // if (!cardItem) {
    //     console.error("SRS Module (processSrsRatingWrapper): cardItem is undefined at currentIndex:", currentIndex, ". Aborting.");
    //     if (uiShowToast) uiShowToast("Lỗi: Không tìm thấy thông tin thẻ hiện tại để xử lý.", 3000, 'error');
    //     return;
    // }
    
    console.log(`SRS Module: Rating selected: ${ratingString}. SRS functionality is disabled. No action taken.`);

    // Không còn gọi updateCardSrsDataInternal nữa

    // setTimeout(() => {
    //     if (uiNextBtn && typeof uiNextBtn.click === 'function' && currentIndex < currentDataArray.length - 1) {
    //         uiNextBtn.click();
    //     } else if (uiUpdateFlashcard) {
    //         // console.log("SRS Module: All cards in the current list have been reviewed or no next button.");
    //         uiUpdateFlashcard(); // Cập nhật lại thẻ hiện tại hoặc trạng thái cuối cùng
    //     }
    // }, 100); // Giảm delay vì không còn toast SRS
}
