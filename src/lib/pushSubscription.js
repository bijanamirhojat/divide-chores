import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

/**
 * Get the current push subscription status
 * Returns: 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'
 */
export async function getSubscriptionStatus() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription ? 'subscribed' : 'unsubscribed'
  } catch {
    return 'unsupported'
  }
}

/**
 * Subscribe the user to push notifications.
 * Requests permission, creates a push subscription, and saves it to Supabase.
 */
export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    throw new Error('Push notificaties worden niet ondersteund op dit apparaat')
  }

  // Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notificatie-toestemming is geweigerd')
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    const subJson = subscription.toJSON()
    
    // Upsert to Supabase (unique on endpoint)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      }, { 
        onConflict: 'endpoint' 
      })

    if (error) {
      console.error('Failed to save push subscription:', error)
      throw new Error('Kon abonnement niet opslaan')
    }

    return subscription
  } catch (err) {
    // If the error is ours (from above), rethrow
    if (err.message === 'Kon abonnement niet opslaan') throw err
    console.error('Push subscription failed:', err)
    throw new Error('Kon niet abonneren op notificaties')
  }
}

/**
 * Unsubscribe from push notifications.
 * Removes the subscription from the browser and Supabase.
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      
      // Remove from Supabase
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
    }
  } catch (err) {
    console.error('Failed to unsubscribe:', err)
  }
}

/**
 * Silently re-subscribe if the user previously had a subscription.
 * Called on app load after login. Only re-subscribes if permission is already granted
 * and there's an active browser subscription that might need syncing.
 */
export async function resubscribeIfNeeded(userId) {
  if (!isPushSupported()) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      // Sync to Supabase in case the record was lost
      const subJson = subscription.toJSON()
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        }, { 
          onConflict: 'endpoint' 
        })
    }
  } catch (err) {
    console.error('Re-subscribe check failed:', err)
  }
}
