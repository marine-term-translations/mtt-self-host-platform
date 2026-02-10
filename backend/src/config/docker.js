// Docker configuration and constants

// Docker socket path
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';

// Main LDES consumer container name
const MAIN_LDES_CONSUMER_CONTAINER = process.env.LDES_CONSUMER_CONTAINER || 'marine_ldes_consumer';

/**
 * Get the container name for an LDES consumer for a specific source
 * @param {number} sourceId - Source ID
 * @returns {string} Container name
 */
function getLdesConsumerContainerName(sourceId) {
  return `ldes-consumer-source_${sourceId}`;
}

module.exports = {
  DOCKER_SOCKET_PATH,
  MAIN_LDES_CONSUMER_CONTAINER,
  getLdesConsumerContainerName
};
