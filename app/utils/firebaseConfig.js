
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, push, ref, set } from "firebase/database";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAkmPcECEHT4TN06hCxJMc51G4TYn6Hsbs",
  authDomain: "dash-b26cb.firebaseapp.com",
  projectId: "dash-b26cb",
  storageBucket: "dash-b26cb.appspot.com",
  messagingSenderId: "684408724522",
  appId: "1:684408724522:web:f137155fef779d0bb47753",
  measurementId: "G-3XMMJBN996"
};
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const database = getDatabase(app);

// Helper function to create a new task in the database
async function createTask(clientId, code) {
  const tasksRef = ref(database, 'tasks');
  const newTaskRef = push(tasksRef);
  await set(newTaskRef, {
    clientId,
    code,
    status: 'pending',
    output: null,
    timestamp: new Date().toISOString(),
  });
  return newTaskRef.key;
}

export { createTask };