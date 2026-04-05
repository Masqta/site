// Get all orders from GitHub
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    
    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          orders: [],
          demo: true
        })
      };
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          orders: []
        })
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    const orders = JSON.parse(content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orders: orders
      })
    };

  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orders: []
      })
    };
  }
};
