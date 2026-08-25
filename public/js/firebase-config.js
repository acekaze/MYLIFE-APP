/**
 * Firebase 설정
 * 
 * 사용 전 아래 값을 본인의 Firebase 프로젝트 설정으로 교체하세요.
 * Firebase Console → 프로젝트 설정 → 일반 → 내 앱 → Firebase SDK snippet
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
