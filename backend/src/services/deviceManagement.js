const { User } = require('../models/User');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const crypto = require('crypto');

class DeviceManagementService {
  constructor() {
    this.trustDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  // Register a new device
  async registerDevice(userId, req) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const deviceInfo = this.getDeviceInfo(req);
    const deviceId = this.generateDeviceId(deviceInfo);

    // Check if device already exists
    const existingDevice = user.devices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastUsed = new Date();
      existingDevice.ipAddress = deviceInfo.ipAddress;
      await user.save();
      return existingDevice;
    }

    // Add new device
    const newDevice = {
      deviceId,
      name: deviceInfo.name,
      type: deviceInfo.type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      trusted: false,
      firstSeen: new Date(),
      lastUsed: new Date()
    };

    user.devices.push(newDevice);
    await user.save();

    return newDevice;
  }

  // Get device information from request
  getDeviceInfo(req) {
    const ua = UAParser(req.headers['user-agent']);
    const ip = req.ip;
    const geo = geoip.lookup(ip);

    return {
      name: `${ua.browser.name} on ${ua.os.name}`,
      type: this.getDeviceType(ua),
      browser: {
        name: ua.browser.name,
        version: ua.browser.version
      },
      os: {
        name: ua.os.name,
        version: ua.os.version
      },
      ipAddress: ip,
      location: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      } : null
    };
  }

  // Generate unique device ID
  generateDeviceId(deviceInfo) {
    const data = JSON.stringify({
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      type: deviceInfo.type
    });

    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  // Get device type
  getDeviceType(ua) {
    if (ua.device.type) return ua.device.type;
    if (ua.os.name.includes('Android') || ua.os.name.includes('iOS')) return 'mobile';
    return 'desktop';
  }

  // Trust a device
  async trustDevice(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const device = user.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    device.trusted = true;
    device.trustExpires = new Date(Date.now() + this.trustDuration);
    await user.save();

    return device;
  }

  // Remove device
  async removeDevice(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      throw new Error('Device not found');
    }

    user.devices.splice(deviceIndex, 1);
    await user.save();

    return { success: true };
  }

  // Check if device is trusted
  async isDeviceTrusted(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const device = user.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      return false;
    }

    if (!device.trusted) {
      return false;
    }

    // Check if trust has expired
    if (device.trustExpires && new Date() > device.trustExpires) {
      device.trusted = false;
      await user.save();
      return false;
    }

    return true;
  }

  // Get user's devices
  async getUserDevices(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user.devices.map(device => ({
      ...device.toObject(),
      isCurrent: false // This will be set by the caller
    }));
  }

  // Detect suspicious device activity
  async detectSuspiciousActivity(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const device = user.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      return { suspicious: true, reason: 'Unknown device' };
    }

    const suspiciousFactors = [];

    // Check for location change
    const lastLocation = device.location;
    const currentLocation = geoip.lookup(device.ipAddress);
    if (lastLocation && currentLocation && 
        (lastLocation.country !== currentLocation.country || 
         lastLocation.region !== currentLocation.region)) {
      suspiciousFactors.push('Location change detected');
    }

    // Check for multiple devices in short time
    const recentDevices = user.devices.filter(d => 
      Date.now() - d.lastUsed.getTime() < 24 * 60 * 60 * 1000
    );
    if (recentDevices.length > 3) {
      suspiciousFactors.push('Multiple devices used recently');
    }

    return {
      suspicious: suspiciousFactors.length > 0,
      factors: suspiciousFactors
    };
  }
}

module.exports = new DeviceManagementService(); 