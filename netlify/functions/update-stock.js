// Update stock (decrease or increase)
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
    const { productId, quantity, action } = body; // action: 'decrease' or 'increase'

    // First, get current stock
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/stock.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let stock = { airpods_pro_3: 23, lastUpdated: new Date().toISOString() };
    let sha = null;

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      stock = JSON.parse(content);
      sha = fileData.sha;
    }

    // Update stock
    const currentStock = stock[productId] || 0;
    let newStock;

    if (action === 'decrease') {
      newStock = Math.max(0, currentStock - quantity);
    } else if (action === 'increase') {
      newStock = currentStock + quantity;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid action' })
      };
    }

    stock[productId] = newStock;
    stock.lastUpdated = new Date().toISOString();

    // Save back to GitHub
    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/stock.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update stock: ${productId} ${action} by ${quantity}`,
          content: Buffer.from(JSON.stringify(stock, null, 2)).toString('base64'),
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
        stock: stock,
        productStock: newStock
      })
    };

  } catch (error) {
    console.error('Error updating stock:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
