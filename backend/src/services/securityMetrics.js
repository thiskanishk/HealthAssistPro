/**
 * Calculate the overall security score based on various metrics
 * @param {Object} params
 * @param {number} params.twoFactorAdoption - Percentage of users with 2FA enabled
 * @param {Object} params.vulnerabilities - Count of vulnerabilities by severity
 * @param {number} params.failedLogins - Number of failed login attempts
 * @param {number} params.blockedIPs - Number of blocked IP addresses
 * @returns {number} Security score between 0 and 100
 */
const calculateSecurityScore = ({
  twoFactorAdoption,
  vulnerabilities,
  failedLogins,
  blockedIPs
}) => {
  // Weights for different components
  const weights = {
    twoFactor: 0.4,
    vulnerabilities: 0.3,
    failedLogins: 0.2,
    blockedIPs: 0.1
  };

  // Calculate 2FA score (40% of total)
  const twoFactorScore = Math.min(100, twoFactorAdoption);

  // Calculate vulnerability score (30% of total)
  const maxVulnerabilities = {
    high: 5,
    medium: 10,
    low: 20
  };

  const vulnerabilityScore = 100 - (
    (vulnerabilities.high / maxVulnerabilities.high * 50) +
    (vulnerabilities.medium / maxVulnerabilities.medium * 30) +
    (vulnerabilities.low / maxVulnerabilities.low * 20)
  );

  // Calculate failed login score (20% of total)
  const maxFailedLogins = 100;
  const failedLoginScore = 100 - Math.min(100, (failedLogins / maxFailedLogins) * 100);

  // Calculate blocked IP score (10% of total)
  const maxBlockedIPs = 50;
  const blockedIPScore = 100 - Math.min(100, (blockedIPs / maxBlockedIPs) * 100);

  // Calculate weighted average
  const totalScore = (
    twoFactorScore * weights.twoFactor +
    vulnerabilityScore * weights.vulnerabilities +
    failedLoginScore * weights.failedLogins +
    blockedIPScore * weights.blockedIPs
  );

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(totalScore)));
};

/**
 * Get security recommendations based on metrics
 * @param {Object} metrics - Security metrics
 * @returns {Array<Object>} Array of recommendations
 */
const getSecurityRecommendations = (metrics) => {
  const recommendations = [];

  if (metrics.twoFactorEnabled / metrics.activeUsers < 0.8) {
    recommendations.push({
      priority: 'high',
      category: 'authentication',
      message: 'Increase 2FA adoption to improve account security',
      action: 'Enable mandatory 2FA for all users or implement incentives for 2FA adoption'
    });
  }

  if (metrics.vulnerabilities.high > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'system',
      message: `Address ${metrics.vulnerabilities.high} high-severity vulnerabilities`,
      action: 'Review and patch high-severity system vulnerabilities immediately'
    });
  }

  if (metrics.failedLogins > 50) {
    recommendations.push({
      priority: 'medium',
      category: 'authentication',
      message: 'High number of failed login attempts detected',
      action: 'Review authentication logs and implement additional brute force protection'
    });
  }

  return recommendations;
};

module.exports = {
  calculateSecurityScore,
  getSecurityRecommendations
}; 