const ADMIN_DEVICE_STORAGE_KEY = 'nativeglow_admin_device_id';

function generateAdminDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `admin-${crypto.randomUUID()}`;
  }

  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAdminDeviceId() {
  const storedDeviceId = localStorage.getItem(ADMIN_DEVICE_STORAGE_KEY);
  if (storedDeviceId) {
    return storedDeviceId;
  }

  const adminInfoRaw = localStorage.getItem('admin_info');
  if (adminInfoRaw) {
    try {
      const adminInfo = JSON.parse(adminInfoRaw);
      if (adminInfo?.device_id) {
        localStorage.setItem(ADMIN_DEVICE_STORAGE_KEY, adminInfo.device_id);
        return adminInfo.device_id;
      }
    } catch {
      // Fall through to a generated id.
    }
  }

  const deviceId = generateAdminDeviceId();
  localStorage.setItem(ADMIN_DEVICE_STORAGE_KEY, deviceId);
  return deviceId;
}