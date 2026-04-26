// Quick test to see what's happening with login
const testLogin = async () => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const data = await response.json();
  console.log('Login response:', data);
  if (data.token) {
    console.log('Token received:', data.token.substring(0, 50) + '...');
    // Test the stations endpoint
    const stationsResponse = await fetch('http://localhost:3000/api/users/me/stations', {
      headers: { 'Authorization': `Bearer ${data.token}` }
    });
    const stationsData = await stationsResponse.json();
    console.log('Stations response status:', stationsResponse.status);
    console.log('Stations response:', stationsData);
  }
};
testLogin();
