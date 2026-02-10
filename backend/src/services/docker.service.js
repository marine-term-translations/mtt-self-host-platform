// Docker service - manages Docker container operations via the Docker socket
const Docker = require('dockerode');
const { DOCKER_SOCKET_PATH, getLdesConsumerContainerName } = require('../config/docker');

// Initialize Docker client with socket connection
// The Docker socket is mounted via docker-compose.yml
const docker = new Docker({ socketPath: DOCKER_SOCKET_PATH });

/**
 * List all containers (both running and stopped)
 * @param {Object} options - Options for filtering
 * @returns {Promise<Array>} Array of container information
 */
async function listContainers(options = {}) {
  try {
    const containers = await docker.listContainers({ 
      all: true, // Include stopped containers
      ...options 
    });
    return containers;
  } catch (error) {
    console.error('Error listing containers:', error);
    throw new Error(`Failed to list containers: ${error.message}`);
  }
}

/**
 * Validate container name format
 * @param {string} name - Container name to validate
 * @returns {boolean} True if valid
 */
function isValidContainerName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  // Container names can only contain alphanumeric, underscore, hyphen, and dot
  return /^[a-zA-Z0-9_\-\.]+$/.test(name);
}

/**
 * Get container by name or ID
 * @param {string} nameOrId - Container name or ID
 * @returns {Promise<Object|null>} Container object or null if not found
 */
async function getContainer(nameOrId) {
  try {
    // Validate input
    if (!isValidContainerName(nameOrId)) {
      throw new Error('Invalid container name format');
    }
    
    const containers = await listContainers();
    
    // Find container by name or ID
    const containerInfo = containers.find(c => 
      c.Id === nameOrId || 
      c.Names.some(name => name === `/${nameOrId}` || name === nameOrId)
    );
    
    if (!containerInfo) {
      return null;
    }
    
    // Get detailed container information
    const container = docker.getContainer(containerInfo.Id);
    const inspectData = await container.inspect();
    
    return {
      id: inspectData.Id,
      name: inspectData.Name.replace(/^\//, ''), // Remove leading slash
      image: inspectData.Config.Image,
      state: inspectData.State,
      created: inspectData.Created,
      status: containerInfo.Status,
      ports: inspectData.NetworkSettings.Ports
    };
  } catch (error) {
    console.error(`Error getting container ${nameOrId}:`, error);
    throw new Error(`Failed to get container: ${error.message}`);
  }
}

/**
 * Check if a container exists and get its status
 * @param {string} containerName - Container name
 * @returns {Promise<Object|null>} Container status or null if not found
 */
async function getContainerStatus(containerName) {
  try {
    const containerInfo = await getContainer(containerName);
    
    if (!containerInfo) {
      return null;
    }
    
    return {
      exists: true,
      running: containerInfo.state.Running,
      status: containerInfo.status,
      state: containerInfo.state,
      created: containerInfo.created
    };
  } catch (error) {
    // If container doesn't exist, return null instead of throwing
    if (error.message.includes('No such container')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get container logs
 * @param {string} containerName - Container name
 * @param {Object} options - Log options
 * @returns {Promise<string>} Container logs
 */
async function getContainerLogs(containerName, options = {}) {
  try {
    // Validate input
    if (!isValidContainerName(containerName)) {
      throw new Error('Invalid container name format');
    }
    
    const containerInfo = await getContainer(containerName);
    
    if (!containerInfo) {
      throw new Error(`Container ${containerName} not found`);
    }
    
    const container = docker.getContainer(containerInfo.id);
    
    // Validate and sanitize tail option
    let tail = 100; // default
    if (options.tail !== undefined) {
      const parsedTail = parseInt(options.tail, 10);
      if (isNaN(parsedTail) || parsedTail < 1 || parsedTail > 10000) {
        tail = 100; // fallback to default if invalid
      } else {
        tail = parsedTail;
      }
    }
    
    // Default options for logs
    const logOptions = {
      follow: false,
      stdout: true,
      stderr: true,
      tail: tail,
      timestamps: options.timestamps !== false, // Default to true
    };
    
    const stream = await container.logs(logOptions);
    
    // Convert stream to string
    return stream.toString('utf-8');
  } catch (error) {
    console.error(`Error getting logs for container ${containerName}:`, error);
    throw new Error(`Failed to get container logs: ${error.message}`);
  }
}

/**
 * Restart a container
 * @param {string} containerName - Container name
 * @returns {Promise<Object>} Result of restart operation
 */
async function restartContainer(containerName) {
  try {
    // Validate input
    if (!isValidContainerName(containerName)) {
      throw new Error('Invalid container name format');
    }
    
    const containerInfo = await getContainer(containerName);
    
    if (!containerInfo) {
      throw new Error(`Container ${containerName} not found`);
    }
    
    const container = docker.getContainer(containerInfo.id);
    await container.restart();
    
    return {
      success: true,
      message: `Container ${containerName} restarted successfully`,
      container: containerInfo.name
    };
  } catch (error) {
    console.error(`Error restarting container ${containerName}:`, error);
    throw new Error(`Failed to restart container: ${error.message}`);
  }
}

/**
 * Check if LDES consumer container exists for a source
 * @param {number} sourceId - Source ID
 * @returns {Promise<Object|null>} Container status or null if not found
 */
async function getLdesConsumerContainer(sourceId) {
  const containerName = getLdesConsumerContainerName(sourceId);
  return await getContainerStatus(containerName);
}

/**
 * Restart LDES consumer container for a source
 * @param {number} sourceId - Source ID
 * @returns {Promise<Object>} Result of restart operation
 */
async function restartLdesConsumerContainer(sourceId) {
  const containerName = getLdesConsumerContainerName(sourceId);
  return await restartContainer(containerName);
}

module.exports = {
  listContainers,
  getContainer,
  getContainerStatus,
  getContainerLogs,
  restartContainer,
  getLdesConsumerContainer,
  restartLdesConsumerContainer
};
