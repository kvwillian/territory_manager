import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDH9umyNQ5ZycYH9tzFVcfcwWsSTayqFMg',
  authDomain: 'territory-manager-f3eef.firebaseapp.com',
  projectId: 'territory-manager-f3eef',
  storageBucket: 'territory-manager-f3eef.firebasestorage.app',
  messagingSenderId: '4310722241',
  appId: '1:4310722241:web:1cd50e1fee72f542e21640',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
