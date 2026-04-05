// Delete order from GitHub
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    const { id } = JSON.parse(event.body);

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Order deleted (GitHub not configured)' })
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

    // Filter out the deleted order
    const updatedOrders = orders.filter(o => o.id !== id && o.id !== parseInt(id));

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
          message: `Delete order ${id}`,
          content: Buffer.from(JSON.stringify(updatedOrders, null, 2)).toString('base64'),
          sha: sha
        })
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Order deleted successfully' })
    };

  } catch (error) {
    console.error('Error deleting order:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
