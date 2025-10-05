import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode, JwtPayload } from 'jwt-decode';

// ================== API ENDPOINT CONSTANTS ==================
const COGNITO_API_BASE_URL = process.env.EXPO_PUBLIC_COGNITO_API_BASE_URL;
const SIGNUP_URL = `${COGNITO_API_BASE_URL}/signup`;
const LOGIN_URL = `${COGNITO_API_BASE_URL}/login`;
const PREFERENCES_URL = process.env.EXPO_PUBLIC_PREFERENCES_API_URL;
const REFRESH_SESSION_URL = `${COGNITO_API_BASE_URL}/refresh`;
const UPDATE_USER_ATTRIBUTES_URL = `${COGNITO_API_BASE_URL}/update`;
// ================== INTERFACES ==================
interface StructuredAddress {
  formatted: string;
}

interface CustomJwtPayload extends JwtPayload {
  'custom:role': 'shelter' | 'adopter';
  sub: string;
  email: string;
  name: string;
  phone_number: string;
  address: string | StructuredAddress;
  'custom:postcode': string;
  'custom:iconURL'?: string;
}

export interface UserAttributes {
  sub: string;
  email: string;
  name: string;
  phone_number: string;
  address: StructuredAddress;
  'custom:postcode': string;
  'custom:iconURL': string;
  'custom:role': 'shelter' | 'adopter' | '';
}

// ================== UTILITIES ==================
const safeJsonParse = (value: string): any => {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return safeJsonParse(parsed);
    }
    return parsed;
  } catch {
    return value;
  }
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    return decoded.exp !== undefined && decoded.exp < now;
  } catch {
    return true;
  }
};

// ================== AUTH FUNCTIONS ==================
export const getCurrentUserAttributes = async (): Promise<UserAttributes | null> => {
  try {
    let idToken = await AsyncStorage.getItem('idToken');
    let accessToken = await AsyncStorage.getItem('accessToken');

    if (!idToken || !accessToken) {
      const refreshedTokens = await refreshSession();
      if (refreshedTokens) {
        idToken = refreshedTokens.idToken;
        accessToken = refreshedTokens.accessToken;
      } else {
        return null;
      }
    }

    const decodedToken = jwtDecode<CustomJwtPayload>(idToken);
    let parsedAddress: StructuredAddress = { formatted: '' };

    if (typeof decodedToken.address === 'object' && decodedToken.address !== null) {
      if (typeof decodedToken.address.formatted === 'string') {
        const parsedFormatted = safeJsonParse(decodedToken.address.formatted);
        parsedAddress.formatted = parsedFormatted.formatted || parsedFormatted;
      } else {
        parsedAddress = decodedToken.address;
      }
    } else if (typeof decodedToken.address === 'string') {
      const parsedFormatted = safeJsonParse(decodedToken.address);
      parsedAddress.formatted = parsedFormatted.formatted || parsedFormatted;
    }

    return {
      sub: decodedToken.sub || '',
      email: decodedToken.email || '',
      name: decodedToken.name || '',
      phone_number: decodedToken.phone_number || '',
      address: parsedAddress,
      'custom:postcode': decodedToken['custom:postcode'] || '',
      'custom:iconURL': decodedToken['custom:iconURL'] || '',
      'custom:role': decodedToken['custom:role'] || '',
    };
  } catch {
    return null;
  }
};

export const getIdToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem('idToken');
  if (!token || isTokenExpired(token)) {
    const refreshedTokens = await refreshSession();
    return refreshedTokens ? refreshedTokens.idToken : null;
  }
  return token;
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token || isTokenExpired(token)) {
    const refreshedTokens = await refreshSession();
    return refreshedTokens ? refreshedTokens.accessToken : null;
  }
  return token;
};

export const signOut = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('idToken');
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
  } catch {}
};

export async function signUp(params: {
  email: string;
  password: string;
  name: string;
  dob: string;
  gender: string;
  address: string;
  postcode: string;
  phoneNo: string;
  role: string;
  experience?: string;
  shelterName?: string;
  latitude?: string;
  longitude?: string;
}): Promise<{ idToken?: string; accessToken?: string; refreshToken?: string }> {
  try {
    const response = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const { idToken, accessToken, refreshToken } = data;
    if (idToken) await AsyncStorage.setItem('idToken', idToken);
    if (accessToken) await AsyncStorage.setItem('accessToken', accessToken);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);

    return { idToken, accessToken, refreshToken };
  } catch (error) {
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<{ idToken: string; accessToken: string; refreshToken?: string }> {
  try {
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed.');

    const { idToken, accessToken, refreshToken } = data;
    await AsyncStorage.setItem('idToken', idToken);
    await AsyncStorage.setItem('accessToken', accessToken);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);

    const decodedToken: CustomJwtPayload = jwtDecode(idToken);
    if (decodedToken['custom:role'] === 'adopter') {
      const getResponse = await fetch(PREFERENCES_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });

      if (getResponse.ok) {
        const preferencesData = await getResponse.json();
        if (!preferencesData || Object.keys(preferencesData).length === 0) {
          await createAdopterPreferences(accessToken);
        }
      } else {
        throw new Error(`Failed to fetch adopter preferences`);
      }
    }

    return { idToken, accessToken, refreshToken };
  } catch (error) {
    throw error;
  }
}

export async function refreshSession(): Promise<{ idToken: string; accessToken: string } | null> {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(REFRESH_SESSION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (!response.ok) {
      await signOut();
      return null;
    }

    const { idToken, accessToken } = data;
    await AsyncStorage.setItem('idToken', idToken);
    await AsyncStorage.setItem('accessToken', accessToken);
    return { idToken, accessToken };
  } catch {
    await signOut();
    return null;
  }
}

export async function updateUserAttributes(attributes: Record<string, string>): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please log in.');

  const response = await fetch(UPDATE_USER_ATTRIBUTES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(attributes),
  });

  if (!response.ok) {
    throw new Error(`Failed to update user attributes: ${await response.text()}`);
  }
  await refreshSession();
}

export async function createAdopterPreferences(token: string): Promise<void> {
  const defaultPreferences = {
    minAge: null,
    maxAge: null,
    size: ['Any'],
    color: ['Any'],
    preferredBreeds: ['Any'],
  };

  const response = await fetch(PREFERENCES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(defaultPreferences),
  });

  if (!response.ok) {
    throw new Error(`Failed to create adopter preferences: ${await response.text()}`);
  }
}