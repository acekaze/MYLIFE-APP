/**
 * Firebase 설정
 * 
 * 사용 전 아래 값을 본인의 Firebase 프로젝트 설정으로 교체하세요.
 * Firebase Console → 프로젝트 설정 → 일반 → 내 앱 → Firebase SDK snippet
 */

const firebaseConfig = {
  apiKey: "AIzaSyBQiKMsLR4UJJ3ykZmirONPzD7xTsMgnLA",
  authDomain: "mylife-company-9af06.firebaseapp.com",
  databaseURL: "https://mylife-company-9af06-default-rtdb.firebaseio.com",
  projectId: "mylife-company-9af06",
  storageBucket: "mylife-company-9af06.firebasestorage.app",
  messagingSenderId: "83663207506",
  appId: "1:83663207506:web:28555fef422ce84d48338b"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
