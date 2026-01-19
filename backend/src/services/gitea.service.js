// Gitea service - handles all Gitea API calls

const axios = require("axios");
const config = require("../config");
const datetime = require("../utils/datetime");

/**
 * Create a new organization in Gitea
 * @returns {Promise<Object>} Created organization data
 */
async function createOrganization() {
  const apiUrl = `${config.gitea.url}/api/v1/admin/users/admin/orgs`;
  const token = config.gitea.adminToken;

  const orgData = {
    username: config.gitea.org.name,
    full_name: config.gitea.org.fullName,
    description: config.gitea.org.description,
    email: config.gitea.org.email,
    location: config.gitea.org.location,
    repo_admin_change_team_access: true,
    visibility: config.gitea.org.visibility,
    website: config.gitea.org.website,
  };

  console.log("Creating organization with the following data:");
  console.log("API URL:", apiUrl);
  console.log(
    "Authorization Token:",
    token ? token.substring(0, 6) + "..." : "undefined"
  );
  console.log("Organization Data:", orgData);

  try {
    const response = await axios.post(apiUrl, orgData, {
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Organization created:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating organization:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else {
      console.error("Message:", error.message);
    }
    throw error;
  }
}

/**
 * Login to Gitea and create an access token
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Token and user data
 */
async function loginUser(username, password) {
  const response = await axios.post(
    `${config.gitea.url}/api/v1/users/${username}/tokens`,
    {
      name: `token-${datetime.unix()}`,
      scopes: ["all"],
    },
    {
      auth: {
        username: username,
        password: password,
      },
    }
  );

  return {
    token: response.data.sha1,
    user: {
      username: username,
      id: response.data.id,
    },
  };
}

/**
 * Check if a user is an admin
 * @param {string} token - User's access token
 * @returns {Promise<Object>} Admin status and username
 */
async function checkAdminStatus(token) {
  const response = await axios.get(`${config.gitea.url}/api/v1/user`, {
    headers: { Authorization: `token ${token}` },
  });

  const { is_admin, login } = response.data;
  return { isAdmin: Boolean(is_admin), username: login };
}

/**
 * Create a new user in Gitea
 * @param {Object} userData - User data (username, email, password, full_name)
 * @returns {Promise<Object>} Created user data
 */
async function createUser(userData) {
  const response = await axios.post(
    `${config.gitea.url}/api/v1/admin/users`,
    {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      full_name: userData.name,
      must_change_password: false,
      send_notify: true,
    },
    {
      headers: { Authorization: `token ${config.gitea.adminToken}` },
    }
  );

  return response.data;
}

/**
 * Get all teams in an organization
 * @param {string} org - Organization name
 * @returns {Promise<Array>} List of teams
 */
async function getOrgTeams(org) {
  const response = await axios.get(
    `${config.gitea.url}/api/v1/orgs/${org}/teams`,
    {
      headers: { Authorization: `token ${config.gitea.adminToken}` },
    }
  );

  return response.data;
}

/**
 * Create a new team in an organization
 * @param {string} org - Organization name
 * @param {string} teamName - Team name
 * @param {string} description - Team description
 * @returns {Promise<Object>} Created team data
 */
async function createTeam(org, teamName, description) {
  const response = await axios.post(
    `${config.gitea.url}/api/v1/orgs/${org}/teams`,
    {
      name: teamName,
      description: description,
      permission: "write",
      units: [
        "repo.code",
        "repo.issues",
        "repo.pulls",
        "repo.releases",
        "repo.wiki",
      ],
      can_create_org_repo: false,
    },
    {
      headers: { Authorization: `token ${config.gitea.adminToken}` },
    }
  );

  return response.data;
}

/**
 * Add a user to a team
 * @param {number} teamId - Team ID
 * @param {string} username - Username to add
 * @returns {Promise<void>}
 */
async function addUserToTeam(teamId, username) {
  await axios.put(
    `${config.gitea.url}/api/v1/teams/${teamId}/members/${username}`,
    {},
    {
      headers: { Authorization: `token ${config.gitea.adminToken}` },
    }
  );
}

/**
 * Check if a user is a member of a team
 * @param {number} teamId - Team ID
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if user is a member
 */
async function isUserInTeam(teamId, username) {
  try {
    await axios.get(
      `${config.gitea.url}/api/v1/teams/${teamId}/members/${username}`,
      {
        headers: { Authorization: `token ${config.gitea.adminToken}` },
      }
    );
    return true;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return false;
    }
    throw err;
  }
}

module.exports = {
  createOrganization,
  loginUser,
  checkAdminStatus,
  createUser,
  getOrgTeams,
  createTeam,
  addUserToTeam,
  isUserInTeam,
};
