import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
} from 'firebase/auth'

import { auth } from '../firebase/firebaseConfig'

const userAuthContext = createContext()

export default function UserAuthContextProvider({ children }) {
    const [user, setUser] = useState(null)

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        return signOut(auth)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
        })

        return () => {
            unsubscribe()
        }
    }, [])

    return (
        <userAuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </userAuthContext.Provider>
    )
}

export function useUserAuth() {
    return useContext(userAuthContext)
}