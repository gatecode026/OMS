async function test() {
  try {
    const res = await fetch('https://oms-xdcz.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Body snippet:', text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}

test();
