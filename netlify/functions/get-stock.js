// Get current stock from GitHub
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    
    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      // Return default stock if env vars not set
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          stock: {
            airpods_pro_3: 23,
            lastUpdated: new Date().toISOString()
          }
        })
      };
    }

    // Try to fetch stock from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/stock.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      // File doesn't exist, return default
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          stock: {
            airpods_pro_3: 23,
            lastUpdated: new Date().toISOString()
          }
        })
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    const stock = JSON.parse(content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stock: stock,
        sha: fileData.sha
      })
    };

  } catch (error) {
    console.error('Error fetching stock:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stock: {
          airpods_pro_3: 23,
          lastUpdated: new Date().toISOString()
        }
      })
    };
  }
};
