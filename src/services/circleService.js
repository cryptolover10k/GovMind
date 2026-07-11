export async function executePayout(destinationAddress, amount) {
  try {
    const response = await fetch('/api/payout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destinationAddress, amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to execute payout');
    }

    return {
      success: true,
      transactionId: data.transactionId,
      state: data.state,
    };
  } catch (error) {
    console.error('Circle Payout Error:', error);
    throw error;
  }
}
