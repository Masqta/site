// Update order status in GitHub
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    const { id, status } = JSON.parse(event.body);

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Status updated (GitHub not configured)' })
      };
    }

    // Fetch existing orders
    const ordersResponse = await fetch(
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

    if (ordersResponse.ok) {
      const fileData = await ordersResponse.json();
      orders = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      sha = fileData.sha;
    }

    // Update order status
    const orderIndex = orders.findIndex(o => o.id === id || o.id === parseInt(id));
    if (orderIndex >= 0) {
      orders[orderIndex].status = status;
      orders[orderIndex].updatedAt = new Date().toISOString();
    }

    // Save back to GitHub
    await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update order ${id} status to ${status}`,
          content: Buffer.from(JSON.stringify(orders, null, 2)).toString('base64'),
          sha: sha
        })
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Status updated' })
    };

  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
