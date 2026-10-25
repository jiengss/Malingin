import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const fetchUser = async (authToken) => {
        try {
            const config = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {};
            const response = await api.get('/user', config);
            setUser(response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUser(token);
        } else {
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const response = await api.post('/login', { email, password });
        const { access_token, user: loggedUser } = response.data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        if (loggedUser) {
            setUser(loggedUser);
        } else {
            await fetchUser(access_token);
        }
        return response.data;
    };

    const register = async (name, email, password, passwordConfirmation) => {
        const response = await api.post('/register', {
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,
        });
        const { access_token, user: newUser } = response.data;
        if (access_token) {
            localStorage.setItem('token', access_token);
            setToken(access_token);
            if (newUser) {
                setUser(newUser);
            } else {
                await fetchUser(access_token);
            }
        }
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    const isAdmin = Boolean(user && user.role === 'admin');

    return (
        <AuthContext.Provider value={{ user, token, loading, isAdmin, login, register, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);