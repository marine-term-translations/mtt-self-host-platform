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
 * Get container by name or ID
 * @param {string} nameOrId - Container name or ID
 * @returns {Promise<Object|null>} Container object or null if not found
 */
async function getContainer(nameOrId) {
  try {
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
    const containerInfo = await getContainer(containerName);
    
    if (!containerInfo) {
      throw new Error(`Container ${containerName} not found`);
    }
    
    const container = docker.getContainer(containerInfo.id);
    
    // Default options for logs
    const logOptions = {
      follow: false,
      stdout: true,
      stderr: true,
      tail: options.tail || 100, // Default to last 100 lines
      timestamps: options.timestamps !== false, // Default to true
      ...options
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
