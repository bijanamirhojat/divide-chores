// Biometric authentication (Face ID / Touch ID) via WebAuthn
// Uses platform authenticator as a local device unlock, with PIN stored for auto-login

const STORAGE_KEYS = {
  credentialId: 'biometric_credential_id',
  userPin: 'biometric_user_pin',
  userId: 'biometric_user_id',
  userName: 'biometric_user_name',
  dismissed: 'biometric_setup_dismissed',
}

// Simple obfuscation for PIN storage (not encryption, but prevents casual reading)
const OBFUSCATION_KEY = 0x5A

function obfuscate(str) {
  return btoa(
    str
      .split('')
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY))
      .join('')
  )
}

function deobfuscate(str) {
  return atob(str)
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY))
    .join('')
}

// Convert ArrayBuffer to base64url string
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const byte of bytes) {
    str += String.fromCharCode(byte)
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert base64url string to ArrayBuffer
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Check if biometric authentication (Face ID / Touch ID) is available on this device
 */
export async function isBiometricAvailable() {
  try {
    // Dev bypass: always show biometric UI for testing
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BIOMETRIC === 'true') {
      return true
    }

    if (
      !window.PublicKeyCredential ||
      !navigator.credentials?.create ||
      !navigator.credentials?.get
    ) {
      return false
    }
    // Check for platform authenticator (Face ID, Touch ID, fingerprint)
    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch {
    return false
  }
}

/**
 * Check if biometric login has been set up on this device
 */
export function hasBiometricSetup() {
  return !!(
    localStorage.getItem(STORAGE_KEYS.credentialId) &&
    localStorage.getItem(STORAGE_KEYS.userPin) &&
    localStorage.getItem(STORAGE_KEYS.userId)
  )
}

/**
 * Check if user has dismissed the biometric setup prompt
 */
export function isBiometricSetupDismissed() {
  return localStorage.getItem(STORAGE_KEYS.dismissed) === 'true'
}

/**
 * Mark the biometric setup prompt as dismissed
 */
export function dismissBiometricSetup() {
  localStorage.setItem(STORAGE_KEYS.dismissed, 'true')
}

/**
 * Register biometric authentication for a user
 * Creates a WebAuthn credential using the platform authenticator (Face ID / Touch ID)
 * and stores the user's PIN for auto-login
 */
export async function registerBiometric(userId, userName, pin) {
  // Generate a random challenge (not verified server-side, just needed for the API)
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  // Use a consistent user ID for WebAuthn (based on Supabase user ID)
  const userIdBytes = new TextEncoder().encode(userId)

  const createOptions = {
    publicKey: {
      rp: {
        name: 'Divide/Chores',
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: userName,
        displayName: userName,
      },
      challenge: challenge,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Force Face ID / Touch ID (not USB keys)
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60000,
      attestation: 'none', // We don't need attestation for local-only use
    },
  }

  const credential = await navigator.credentials.create(createOptions)

  // Store credential ID and user info
  const credentialId = bufferToBase64url(credential.rawId)
  localStorage.setItem(STORAGE_KEYS.credentialId, credentialId)
  localStorage.setItem(STORAGE_KEYS.userPin, obfuscate(pin))
  localStorage.setItem(STORAGE_KEYS.userId, userId)
  localStorage.setItem(STORAGE_KEYS.userName, userName)
  // Clear any previous dismissal
  localStorage.removeItem(STORAGE_KEYS.dismissed)

  return true
}

/**
 * Authenticate using biometric (Face ID / Touch ID)
 * Returns { pin, userId, userName } on success, null on failure
 */
export async function authenticateWithBiometric() {
  const credentialId = localStorage.getItem(STORAGE_KEYS.credentialId)
  const storedPin = localStorage.getItem(STORAGE_KEYS.userPin)
  const userId = localStorage.getItem(STORAGE_KEYS.userId)
  const userName = localStorage.getItem(STORAGE_KEYS.userName)

  if (!credentialId || !storedPin || !userId) {
    return null
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    const getOptions = {
      publicKey: {
        challenge: challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64urlToBuffer(credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    }

    // This triggers the Face ID / Touch ID prompt
    await navigator.credentials.get(getOptions)

    // If we get here, biometric verification succeeded
    return {
      pin: deobfuscate(storedPin),
      userId,
      userName,
    }
  } catch {
    // User cancelled or biometric failed
    return null
  }
}

/**
 * Remove biometric authentication setup
 */
export function removeBiometric() {
  localStorage.removeItem(STORAGE_KEYS.credentialId)
  localStorage.removeItem(STORAGE_KEYS.userPin)
  localStorage.removeItem(STORAGE_KEYS.userId)
  localStorage.removeItem(STORAGE_KEYS.userName)
  localStorage.removeItem(STORAGE_KEYS.dismissed)
}
