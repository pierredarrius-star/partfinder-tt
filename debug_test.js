async function testVoice() {
  try {
    const response = await fetch('http://localhost:3000/api/test/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+18684949514' })
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testVoice();
