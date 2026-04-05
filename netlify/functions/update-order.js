// Update order status
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    
    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'GitHub credentials not configured',
          demo: true 
        })
      };
    }

    const body = JSON.parse(event.body);
    const { orderId, status } = body;

    // Get current orders
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let orders = [];
    let sha = null;

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      orders = JSON.parse(content);
      sha = fileData.sha;
    }

    // Update order
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex >= 0) {
      orders[orderIndex].status = status;
      orders[orderIndex].updatedAt = new Date().toISOString();
    }

    // Save back to GitHub
    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update order ${orderId} status to ${status}`,
          content: Buffer.from(JSON.stringify(orders, null, 2)).toString('base64'),
          sha: sha
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`GitHub update failed: ${errorData.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: orders[orderIndex]
      })
    };

  } catch (error) {
    console.error('Error updating order:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
